const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const paymentRoutes = require('./routes/paymentRoutes');
const session = require('express-session');
const mfaRoutes = require('./routes/mfaRoutes');

const {
    xssProtection,
    mongoProtection,
    hppProtection,
    cspMiddleware,
    xssDetector
} = require('./middleware/xssProtection');

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { protect } = require('./middleware/authMiddleware');
const profileRoutes = require('./routes/profileRoutes');
const { checkPasswordExpiry } = require('./utils/passwordExpiry');
const { cleanExpiredSessions } = require('./utils/sessionManager');
const serviceRoutes = require('./routes/serviceRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const activityRoutes = require('./routes/activityRoutes');
const { activityLogger, logSecurityEvent } = require('./middleware/activityLogger');

dotenv.config();
const app = express();
connectDB();

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(xssDetector);
app.use(mongoProtection);
app.use(xssProtection);
app.use(hppProtection);
app.use(cspMiddleware);

app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-new-token'],
    exposedHeaders: ['x-new-token']
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 30 * 60 * 1000
    }
}));

app.use('/api/', async (req, res, next) => {
    if (req.user && !req.path.includes('/activities')) {
        try {
            const Activity = require('./model/Activity');
            setImmediate(async () => {
                try {
                    await Activity.create({
                        userId: req.user._id,
                        username: req.user.username || req.user.email,
                        action: 'SYSTEM_ACCESS',
                        description: `${req.method} ${req.originalUrl}`,
                        ipAddress: req.ip || 'Unknown',
                        userAgent: req.get('User-Agent') || 'Unknown',
                        method: req.method,
                        endpoint: req.originalUrl,
                        statusCode: 200,
                        responseTime: 0,
                        additionalData: {},
                        severity: 'LOW'
                    });
                } catch (err) {
                    console.log('Activity log error:', err.message);
                }
            });
        } catch (err) {
        }
    }
    next();
});

app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/mfa', mfaRoutes);

if (process.env.NODE_ENV === 'development') {
    const { runAllTests } = require('./utils/xssTests');
    app.get('/api/test-xss', (req, res) => {
        try {
            const results = runAllTests();
            res.json({
                message: 'XSS Protection Test Complete',
                results: results,
                recommendation: results.overall ?
                    'XSS protection is working correctly!' :
                    'WARNING: XSS vulnerabilities detected!'
            });
        } catch (error) {
            res.status(500).json({
                error: 'Test failed',
                details: error.message
            });
        }
    });
}

app.use('/uploads', express.static('public/uploads'));

console.log('Running initial password expiry check...');
checkPasswordExpiry();

console.log('Running initial session cleanup...');
cleanExpiredSessions();

cron.schedule('0 9 * * *', () => {
    console.log('Running daily password expiry check...');
    checkPasswordExpiry();
});

cron.schedule('0 * * * *', () => {
    console.log('Running hourly session cleanup...');
    cleanExpiredSessions();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});