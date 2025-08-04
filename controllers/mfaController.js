const User = require('../model/user');
const mfaService = require('../utils/mfaService');
const { logActivity, logSecurityEvent } = require('../middleware/activityLogger');

exports.setupMFA = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const secretData = mfaService.generateSecret(user.email);
        const qrCode = await mfaService.generateQRCode(secretData.otpauth_url);
        req.session.mfaSecret = secretData.base32;

        res.json({ qrCode, manualCode: secretData.base32, email: user.email });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.verifyAndEnableMFA = async (req, res) => {
    try {
        const { token } = req.body;
        const secret = req.session.mfaSecret;
        if (!secret) return res.status(400).json({ message: 'MFA not initiated' });

        const isValid = mfaService.verifyToken(token, secret);
        if (!isValid) return res.status(400).json({ message: 'Invalid token' });

        const user = await User.findById(req.user._id);
        user.mfaSecret = secret;
        user.mfaEnabled = true;
        await user.save();

        delete req.session.mfaSecret;
        console.log('SESSION DEBUG:', req.session);


        await logActivity(user._id, user.email, 'MFA_ENABLED', 'MFA setup completed', req, 'HIGH');
        res.json({ message: 'MFA enabled successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.disableMFA = async (req, res) => {
    try {
        const { token } = req.body;
        const user = await User.findById(req.user._id).select('+mfaSecret');
        if (!user || !user.mfaEnabled) return res.status(400).json({ message: 'MFA not enabled' });

        const isValid = mfaService.verifyToken(token, user.mfaSecret);
        if (!isValid) return res.status(400).json({ message: 'Invalid token' });

        user.mfaEnabled = false;
        user.mfaSecret = undefined;
        await user.save();

        await logActivity(user._id, user.email, 'MFA_DISABLED', 'MFA disabled', req, 'HIGH');
        res.json({ message: 'MFA disabled' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.getMFAStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json({ mfaEnabled: user.mfaEnabled });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

exports.verifyMFAToken = async (req, res) => {
    try {
        const { token } = req.body;
        const sessionUser = req.session.pendingMfaUser;

        if (!sessionUser || !sessionUser.user?.email) {
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }

        const user = await User.findOne({ email: sessionUser.user.email }).select('+mfaSecret');
        if (!user || !user.mfaEnabled || !user.mfaSecret) {
            return res.status(400).json({ message: 'MFA not enabled' });
        }

        const isValid = mfaService.verifyToken(token, user.mfaSecret);
        if (!isValid) {
            await logSecurityEvent('MFA_FAILED', `Invalid MFA for ${user.email}`, req, 'HIGH', { token });
            return res.status(401).json({ message: 'Invalid token' });
        }

        await logActivity(user._id, user.email, 'MFA_VERIFIED', 'User completed MFA login', req, 'MEDIUM');

        delete req.session.pendingMfaUser;
        res.status(200).json(sessionUser);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};
