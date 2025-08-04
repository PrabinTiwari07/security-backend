const xss = require('xss');
const hpp = require('hpp');
const { body, validationResult } = require('express-validator');

const xssOptions = {
    whiteList: {
        'b': [],
        'i': [],
        'em': [],
        'strong': [],
        'p': [],
        'br': []
    },
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
    onIgnoreTag: function (tag, html, options) {
        console.warn(`XSS attempt blocked: ${tag} tag in ${html}`);
        return '';
    },
    onIgnoreTagAttr: function (tag, name, value, isWhiteAttr) {
        const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'];
        if (dangerousAttrs.includes(name.toLowerCase())) {
            console.warn(`XSS attempt blocked: ${name}="${value}" in ${tag}`);
            return '';
        }
    }
};

const sanitizeString = (input) => {
    if (typeof input !== 'string') return input;
    return xss(input, xssOptions);
};

const sanitizeObject = (obj) => {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
    }

    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleanKey = sanitizeString(key);
            sanitized[cleanKey] = sanitizeObject(value);
        }
        return sanitized;
    }

    return obj;
};

const xssProtection = (req, res, next) => {
    try {
        if (req.body) {
            req.body = sanitizeObject(req.body);
        }

        if (req.query) {
            req.query = sanitizeObject(req.query);
        }

        if (req.params) {
            req.params = sanitizeObject(req.params);
        }

        next();
    } catch (error) {
        console.error('XSS Protection Error:', error);
        next();
    }
};

const mongoProtection = (req, res, next) => {
    try {
        const removeMongoOperators = (obj) => {
            if (obj && typeof obj === 'object') {
                for (const key in obj) {
                    if (key.startsWith('$') || key.includes('.')) {
                        console.warn(`MongoDB injection attempt blocked: ${key}`);
                        delete obj[key];
                    } else if (typeof obj[key] === 'object') {
                        removeMongoOperators(obj[key]);
                    }
                }
            }
            return obj;
        };

        if (req.body) {
            req.body = removeMongoOperators(req.body);
        }

        if (req.query) {
            req.query = removeMongoOperators(req.query);
        }

        if (req.params) {
            req.params = removeMongoOperators(req.params);
        }

        next();
    } catch (error) {
        console.error('MongoDB Protection Error:', error);
        next();
    }
};

const hppProtection = hpp({
    whitelist: ['tags', 'fields']
});

const validationRules = {
    userRegistration: [
        body('fullName')
            .isLength({ min: 2, max: 50 })
            .withMessage('Full name must be between 2 and 50 characters')
            .matches(/^[a-zA-Z\s]+$/)
            .withMessage('Full name can only contain letters and spaces'),

        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),

        body('password')
            .isLength({ min: 6, max: 128 })
            .withMessage('Password must be between 6 and 128 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

        body('phone')
            .matches(/^[9][678][0-9]{8}$/)
            .withMessage('Please provide a valid phone number'),

        body('address')
            .isLength({ min: 5, max: 200 })
            .withMessage('Address must be between 5 and 200 characters')
    ],

    userLogin: [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Please provide a valid email address'),

        body('password')
            .isLength({ min: 1, max: 128 })
            .withMessage('Password is required')
    ],

    profileUpdate: [
        body('bio')
            .optional()
            .isLength({ max: 500 })
            .withMessage('Bio cannot exceed 500 characters'),

        body('gender')
            .optional()
            .isIn(['Male', 'Female', 'Other'])
            .withMessage('Gender must be Male, Female, or Other'),

        body('socialLinks.facebook')
            .optional()
            .isURL()
            .withMessage('Facebook link must be a valid URL'),

        body('socialLinks.instagram')
            .optional()
            .isURL()
            .withMessage('Instagram link must be a valid URL'),

        body('socialLinks.linkedin')
            .optional()
            .isURL()
            .withMessage('LinkedIn link must be a valid URL')
    ],

    passwordReset: [
        body('newPassword')
            .isLength({ min: 6, max: 128 })
            .withMessage('Password must be between 6 and 128 characters')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

        body('confirmPassword')
            .custom((value, { req }) => {
                if (value !== req.body.newPassword) {
                    throw new Error('Password confirmation does not match password');
                }
                return true;
            })
    ]
};

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));

        return res.status(400).json({
            error: 'Validation failed',
            details: formattedErrors
        });
    }
    next();
};

const cspMiddleware = (req, res, next) => {
    res.setHeader('Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; " +
        "font-src 'self' data:; " +
        "connect-src 'self'; " +
        "frame-src 'none'; " +
        "object-src 'none'; " +
        "base-uri 'self';"
    );

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
};

const xssDetector = (req, res, next) => {
    try {
        const suspicious = [];

        const xssPatterns = [
            /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
            /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
            /javascript:/gi,
            /vbscript:/gi,
            /onload\s*=/gi,
            /onclick\s*=/gi,
            /onerror\s*=/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi
        ];

        const checkForXSS = (obj, path = '') => {
            if (typeof obj === 'string') {
                xssPatterns.forEach((pattern, index) => {
                    if (pattern.test(obj)) {
                        suspicious.push({
                            pattern: pattern.toString(),
                            location: path,
                            value: obj.substring(0, 100) + (obj.length > 100 ? '...' : '')
                        });
                    }
                });
            } else if (typeof obj === 'object' && obj !== null) {
                try {
                    Object.keys(obj).forEach(key => {
                        checkForXSS(obj[key], path ? `${path}.${key}` : key);
                    });
                } catch (error) {
                    console.warn('XSS detection error for object:', error.message);
                }
            }
        };

        if (req.body) checkForXSS(req.body, 'body');
        if (req.query) checkForXSS(req.query, 'query');
        if (req.params) checkForXSS(req.params, 'params');

        if (suspicious.length > 0) {
            console.warn('Potential XSS attack detected:', {
                ip: req.ip || 'unknown',
                userAgent: req.get('User-Agent') || 'unknown',
                url: req.originalUrl,
                method: req.method,
                suspicious: suspicious,
                timestamp: new Date().toISOString()
            });
        }

        next();
    } catch (error) {
        console.error('XSS Detector Error:', error.message);
        next();
    }
};

module.exports = {
    xssProtection,
    mongoProtection,
    hppProtection,
    validationRules,
    handleValidationErrors,
    cspMiddleware,
    xssDetector,
    sanitizeString,
    sanitizeObject
};
