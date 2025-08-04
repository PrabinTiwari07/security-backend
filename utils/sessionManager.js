const Session = require('../model/session');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SESSION_CONFIG = {
    maxAge: 24 * 60 * 60 * 1000,
    inactivityTimeout: 30 * 60 * 1000,
    maxConcurrentSessions: 5,
    refreshThreshold: 15 * 60 * 1000
};

const generateSessionId = () => {
    return crypto.randomBytes(32).toString('hex');
};

const parseUserAgent = (userAgent) => {
    const browser = userAgent.includes('Chrome') ? 'Chrome' :
        userAgent.includes('Firefox') ? 'Firefox' :
            userAgent.includes('Safari') ? 'Safari' : 'Unknown';

    const os = userAgent.includes('Windows') ? 'Windows' :
        userAgent.includes('Mac') ? 'macOS' :
            userAgent.includes('Linux') ? 'Linux' :
                userAgent.includes('Android') ? 'Android' :
                    userAgent.includes('iOS') ? 'iOS' : 'Unknown';

    const device = userAgent.includes('Mobile') ? 'Mobile' : 'Desktop';

    return { browser, os, device };
};

const createSession = async (userId, req, rememberMe = false) => {
    try {
        const sessionId = generateSessionId();
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        const deviceInfo = parseUserAgent(userAgent);

        const existingSessions = await Session.find({
            userId,
            isActive: true
        }).sort({ createdAt: -1 });

        if (existingSessions.length >= SESSION_CONFIG.maxConcurrentSessions) {
            const sessionsToRemove = existingSessions.slice(SESSION_CONFIG.maxConcurrentSessions - 1);
            await Session.updateMany(
                { _id: { $in: sessionsToRemove.map(s => s._id) } },
                { isActive: false }
            );
        }

        const sessionDuration = rememberMe ? 30 * 24 * 60 * 60 * 1000 : SESSION_CONFIG.maxAge;

        const session = new Session({
            userId,
            sessionId,
            ipAddress,
            userAgent,
            deviceInfo,
            rememberMe,
            expiresAt: new Date(Date.now() + sessionDuration)
        });

        await session.save();

        const tokenExpiry = rememberMe ? '30d' : '24h';
        const token = jwt.sign(
            {
                userId,
                sessionId,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.JWT_SECRET,
            { expiresIn: tokenExpiry }
        );

        console.log(`Created ${rememberMe ? 'extended' : 'standard'} session for user ${userId}`);
        return { token, sessionId, session };
    } catch (error) {
        throw new Error('Failed to create session: ' + error.message);
    }
};

const validateSession = async (sessionId, userId) => {
    try {
        const session = await Session.findOne({
            sessionId,
            userId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return { valid: false, session: null };
        }

        const inactivityLimit = new Date(Date.now() - SESSION_CONFIG.inactivityTimeout);
        if (session.lastActivity < inactivityLimit) {
            await Session.updateOne(
                { _id: session._id },
                { isActive: false }
            );
            return { valid: false, session: null };
        }

        session.lastActivity = new Date();
        await session.save();

        return { valid: true, session };
    } catch (error) {
        return { valid: false, session: null };
    }
};

const refreshSessionIfNeeded = async (session) => {
    const timeUntilExpiry = session.expiresAt.getTime() - Date.now();

    if (timeUntilExpiry < SESSION_CONFIG.refreshThreshold) {
        session.expiresAt = new Date(Date.now() + SESSION_CONFIG.maxAge);
        await session.save();

        const newToken = jwt.sign(
            {
                userId: session.userId,
                sessionId: session.sessionId,
                iat: Math.floor(Date.now() / 1000)
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        return { refreshed: true, newToken };
    }

    return { refreshed: false, newToken: null };
};

const invalidateSession = async (sessionId, userId) => {
    try {
        await Session.updateOne(
            { sessionId, userId },
            { isActive: false }
        );
        return true;
    } catch (error) {
        return false;
    }
};

const invalidateAllUserSessions = async (userId) => {
    try {
        await Session.updateMany(
            { userId },
            { isActive: false }
        );
        return true;
    } catch (error) {
        return false;
    }
};

const getUserActiveSessions = async (userId) => {
    try {
        const sessions = await Session.find({
            userId,
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).sort({ lastActivity: -1 });

        return sessions;
    } catch (error) {
        return [];
    }
};

const cleanExpiredSessions = async () => {
    try {
        const result = await Session.deleteMany({
            $or: [
                { expiresAt: { $lt: new Date() } },
                {
                    isActive: true,
                    lastActivity: { $lt: new Date(Date.now() - SESSION_CONFIG.inactivityTimeout) }
                }
            ]
        });

        console.log(`Cleaned ${result.deletedCount} expired/inactive sessions`);
        return result.deletedCount;
    } catch (error) {
        console.error('Failed to clean expired sessions:', error);
        return 0;
    }
};

module.exports = {
    SESSION_CONFIG,
    createSession,
    validateSession,
    refreshSessionIfNeeded,
    invalidateSession,
    invalidateAllUserSessions,
    getUserActiveSessions,
    cleanExpiredSessions
};
