const Activity = require('../model/Activity');

const activityLogger = (action, description, severity = 'LOW') => {
    return async (req, res, next) => {
        const startTime = Date.now();

        const originalSend = res.send;

        res.send = function (data) {
            const responseTime = Date.now() - startTime;

            setImmediate(async () => {
                try {
                    if (req.user) {
                        await Activity.create({
                            userId: req.user._id,
                            username: req.user.username || req.user.email,
                            action: action,
                            description: description,
                            ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
                            userAgent: req.get('User-Agent') || 'Unknown',
                            method: req.method,
                            endpoint: req.originalUrl,
                            statusCode: res.statusCode,
                            responseTime: responseTime,
                            additionalData: {
                                body: action.includes('PASSWORD') ? '[REDACTED]' : req.body,
                                params: req.params,
                                query: req.query
                            },
                            severity: severity
                        });
                    }
                } catch (error) {
                    console.error('Activity logging error:', error);
                }
            });

            return originalSend.call(this, data);
        };

        next();
    };
};

const logActivity = async (userId, username, action, description, req, severity = 'LOW', additionalData = {}) => {
    try {
        await Activity.create({
            userId: userId,
            username: username,
            action: action,
            description: description,
            ipAddress: req?.ip || req?.connection?.remoteAddress || 'System',
            userAgent: req?.get('User-Agent') || 'System',
            method: req?.method || 'SYSTEM',
            endpoint: req?.originalUrl || '/system',
            statusCode: 200,
            responseTime: 0,
            additionalData: additionalData,
            severity: severity
        });
    } catch (error) {
        console.error('Manual activity logging error:', error);
    }
};

const logSecurityEvent = async (action, description, req, severity = 'HIGH', additionalData = {}) => {
    try {
        await Activity.create({
            userId: null,
            username: 'Anonymous',
            action: action,
            description: description,
            ipAddress: req?.ip || req?.connection?.remoteAddress || 'Unknown',
            userAgent: req?.get('User-Agent') || 'Unknown',
            method: req?.method || 'UNKNOWN',
            endpoint: req?.originalUrl || '/unknown',
            statusCode: 401,
            responseTime: 0,
            additionalData: additionalData,
            severity: severity
        });
    } catch (error) {
        console.error('Security event logging error:', error);
    }
};

module.exports = {
    activityLogger,
    logActivity,
    logSecurityEvent
};
