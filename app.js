const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// XSS Protection imports
const {
    xssProtection,
    mongoProtection,
    hppProtection,
    cspMiddleware,
    xssDetector
} = require('./middleware/xssProtection');

const userRoutes = require('./routes/userRoutes');
// const adminRoutes = require('./routes/adminRoutes');
const { protect } = require('./middleware/authMiddleware');
const profileRoutes = require('./routes/profileRoutes');
const { checkPasswordExpiry } = require('./utils/passwordExpiry');
const { cleanExpiredSessions } = require('./utils/sessionManager');

dotenv.config();
const app = express();
connectDB();

// Security middleware
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

// XSS Detection and Logging (before sanitization)
app.use(xssDetector);

// MongoDB Injection Protection (before XSS protection)
app.use(mongoProtection);

// XSS Protection Middleware (after mongo protection)
app.use(xssProtection);

// HTTP Parameter Pollution Protection
app.use(hppProtection);

// Content Security Policy Headers
app.use(cspMiddleware);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'x-new-token'
    ],
    exposedHeaders: ['x-new-token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.use('/api/users', userRoutes);
// app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);
const vehicleRoutes = require('./routes/vehicleRoutes');
app.use('/api/vehicles', vehicleRoutes);

// XSS Testing Route (Development Only)
if (process.env.NODE_ENV === 'development') {
    const { runAllTests } = require('./utils/xssTests');
    app.get('/api/test-xss', (req, res) => {
        try {
            const results = runAllTests();
            res.json({
                message: 'XSS Protection Test Complete',
                results: results,
                recommendation: results.overall ?
                    'Your XSS protection is working correctly!' :
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

// Schedule password expiry check to run daily at 9:00 AM
cron.schedule('0 9 * * *', () => {
    console.log('Running daily password expiry check...');
    checkPasswordExpiry();
});

// Schedule session cleanup to run every hour
cron.schedule('0 * * * *', () => {
    console.log('Running hourly session cleanup...');
    cleanExpiredSessions();
});

// Run password expiry check on server start (for testing)
console.log('Running initial password expiry check...');
checkPasswordExpiry();

// Run session cleanup on server start
console.log('Running initial session cleanup...');
cleanExpiredSessions();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
