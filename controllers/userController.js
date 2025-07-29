const User = require('../model/user');
const bcrypt = require('bcrypt');
const sendOtpEmail = require('../utils/sendOtpEmail');
const jwt = require('jsonwebtoken');
const Profile = require('../model/profile'); // add this import
const { createSession, invalidateSession, invalidateAllUserSessions, getUserActiveSessions } = require('../utils/sessionManager');
const { sanitizeString, sanitizeObject } = require('../middleware/xssProtection');
const { logActivity, logSecurityEvent } = require('../middleware/activityLogger');
const axios = require('axios'); // Add at the top


exports.registerUser = async (req, res) => {
    try {
        console.log('registerUser called', req.body);

        const { fullName, address, phone, email, password, confirmPassword, captchaToken } = req.body;

        // Verify CAPTCHA
        if (!captchaToken) {
            return res.status(400).json({ message: "CAPTCHA is required." });
        }
        // Use the secret key that matches your frontend site key!
        const secretKey = "6LfKjpMrAAAAAORZufSH_hIilnUFfJBtA2PowNES";
        const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captchaToken}`;
        try {
            console.log('About to verify captcha with token length:', captchaToken?.length);
            const captchaRes = await axios.post(verifyUrl);
            console.log('reCAPTCHA response:', captchaRes.data);

            if (!captchaRes.data.success) {
                console.log('CAPTCHA verification failed with reason:', captchaRes.data['error-codes']);
                return res.status(400).json({ message: "CAPTCHA verification failed." });
            }
        } catch (err) {
            console.error('Error verifying reCAPTCHA:', err.response ? err.response.data : err.message);
            return res.status(500).json({ message: "Error verifying CAPTCHA" });
        }

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const phoneRegex = /^[9][678][0-9]{8}$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Invalid email format." });
        }

        if (!fullName || !address || !phone || !email || !password || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }

        if (!phoneRegex.test(phone)) {
            return res.status(400).json({ message: "Invalid phone number format." });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists." });
        }

        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // OTP expires in 2 minutes
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            fullName,
            address,
            phone,
            email,
            password: hashedPassword,
            role: "user",
            otpCode,
            otpExpiresAt,
            isVerified: false,
            lastPasswordChange: new Date(),
            passwordExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            passwordHistory: [{ password: hashedPassword, createdAt: new Date() }]
        });

        await newUser.save();

        await sendOtpEmail({ email, name: fullName, otp: otpCode });

        // Log successful registration
        await logActivity(
            newUser._id,
            newUser.username || newUser.email,
            'REGISTER',
            'User successfully registered',
            req,
            'MEDIUM',
            { registrationTime: new Date() }
        );

        res.status(201).json({ message: "Registration successful, OTP sent to your email." });
    } catch (error) {
        // Log failed registration
        await logSecurityEvent(
            'REGISTER',
            `Failed registration attempt: ${req.body.email}`,
            req,
            'MEDIUM',
            { email: req.body.email, error: error.message }
        );

        console.error('Registration error:', error);
        res.status(500).json({ error: error.message });
    }
};


exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });

        if (user.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: "OTP has expired. Please request a new one." });
        }

        if (user.otpCode !== otp) {
            return res.status(400).json({ message: "Invalid OTP provided." });
        }

        user.isVerified = true;
        user.otpCode = null;
        user.otpExpiresAt = null;
        await user.save();

        res.status(200).json({ message: "Account verified successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.resendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });

        if (user.isVerified) {
            return res.status(400).json({ message: "User already verified." });
        }

        const newOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

        user.otpCode = newOtp;
        user.otpExpiresAt = otpExpiresAt;
        await user.save();

        await sendOtpEmail({ email, name: user.fullName, otp: newOtp, type: "resend" });

        res.status(200).json({ message: "OTP resent to your email." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.verifyResetOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required." });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });

        if (user.otpExpiresAt < new Date()) {
            return res.status(400).json({ message: "OTP has expired." });
        }

        if (user.otpCode !== otp) {
            return res.status(400).json({ message: "Invalid OTP." });
        }

        res.status(200).json({ message: "OTP verified successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) return res.status(400).json({ message: "Email is required." });

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });

        const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
        const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 min

        user.otpCode = otpCode;
        user.otpExpiresAt = otpExpiresAt;
        await user.save();

        await sendOtpEmail({
            email,
            name: user.fullName,
            otp: otpCode,
            type: "reset"
        });

        res.status(200).json({ message: "OTP sent to your email for password reset." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword, confirmPassword } = req.body;

        if (!email || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }

        // Check if password was used recently (password reuse prevention)
        if (user.isPasswordReused(newPassword, bcrypt)) {
            return res.status(400).json({ message: "You cannot reuse your current password. Please choose a different password." });
        }

        // Add current password to history before updating
        user.addPasswordToHistory(user.password);

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.otpCode = null;
        user.otpExpiresAt = null;
        user.lastPasswordChange = new Date();
        user.passwordExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        user.mustChangePassword = false; // Reset flag if it was set

        await user.save();

        res.status(200).json({
            message: "Password reset successful. You can now log in. Your password will expire in 30 days.",
            passwordExpiresAt: user.passwordExpiresAt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const user = await User.findById(req.user._id);

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Current password is incorrect." });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New passwords do not match." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }

        // Check if new password is same as current password
        const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
        if (isSameAsCurrent) {
            return res.status(400).json({ message: "New password cannot be the same as current password." });
        }

        // Check if password was used recently (password reuse prevention)
        if (user.isPasswordReused(newPassword, bcrypt)) {
            return res.status(400).json({ message: "You cannot reuse your current password. Please choose a different password." });
        }

        // Add current password to history before updating
        user.addPasswordToHistory(user.password);

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        user.lastPasswordChange = new Date();
        user.passwordExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        user.mustChangePassword = false; // Reset flag if it was set

        await user.save();

        // Log password change activity
        await logActivity(
            user._id,
            user.username || user.email,
            'PASSWORD_CHANGE', // changed from 'CHANGE_PASSWORD'
            'User changed password',
            req,
            'MEDIUM',
            { changeTime: new Date() }
        );

        res.status(200).json({
            message: "Password changed successfully. Your password will expire in 30 days.",
            passwordExpiresAt: user.passwordExpiresAt
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get password status for current user
exports.getPasswordStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        const now = new Date();
        const daysUntilExpiry = Math.ceil((user.passwordExpiresAt - now) / (1000 * 60 * 60 * 24));
        const isExpired = user.isPasswordExpired();

        res.status(200).json({
            passwordExpiresAt: user.passwordExpiresAt,
            lastPasswordChange: user.lastPasswordChange,
            daysUntilExpiry: Math.max(0, daysUntilExpiry),
            isExpired,
            mustChangePassword: user.mustChangePassword,
            showWarning: daysUntilExpiry <= 7 && daysUntilExpiry > 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Logout user from current session
exports.logoutUser = async (req, res) => {
    try {
        const sessionId = req.sessionData.sessionId;
        const userId = req.user._id;

        // Invalidate current session
        await invalidateSession(sessionId, userId);

        // Clear cookies
        res.clearCookie('authToken');
        res.clearCookie('sessionInfo');

        // Log logout activity
        await logActivity(
            req.user._id,
            req.user.username || req.user.email,
            'LOGOUT',
            'User logged out',
            req,
            'LOW',
            { logoutTime: new Date() }
        );

        res.status(200).json({
            message: "Logged out successfully",
            sessionEnded: true
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Logout user from all sessions
exports.logoutAllSessions = async (req, res) => {
    try {
        const userId = req.user._id;

        // Invalidate all user sessions
        await invalidateAllUserSessions(userId);

        // Clear cookies
        res.clearCookie('authToken');
        res.clearCookie('sessionInfo');

        res.status(200).json({
            message: "Logged out from all devices successfully",
            allSessionsEnded: true
        });
    } catch (error) {
        console.error('Logout all sessions error:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get user's active sessions
exports.getActiveSessions = async (req, res) => {
    try {
        const userId = req.user._id;
        const currentSessionId = req.sessionData.sessionId;

        const sessions = await getUserActiveSessions(userId);

        const sessionData = sessions.map(session => ({
            sessionId: session.sessionId,
            isCurrent: session.sessionId === currentSessionId,
            deviceInfo: session.deviceInfo,
            ipAddress: session.ipAddress,
            lastActivity: session.lastActivity,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt
        }));

        res.status(200).json({
            activeSessions: sessionData,
            totalSessions: sessionData.length
        });
    } catch (error) {
        console.error('Get active sessions error:', error);
        res.status(500).json({ error: error.message });
    }
};

// End specific session
exports.endSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user._id;
        const currentSessionId = req.sessionData.sessionId;

        // Prevent user from ending their current session (use logout instead)
        if (sessionId === currentSessionId) {
            return res.status(400).json({
                message: "Cannot end current session. Use logout instead."
            });
        }

        const success = await invalidateSession(sessionId, userId);

        if (success) {
            res.status(200).json({
                message: "Session ended successfully",
                sessionId
            });
        } else {
            res.status(404).json({
                message: "Session not found or already ended"
            });
        }
    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password, rememberMe = false } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            await logSecurityEvent(
                'FAILED_LOGIN',
                `Failed login attempt - user not found: ${email}`,
                req,
                'HIGH',
                { email, reason: 'User not found' }
            );
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            await logSecurityEvent(
                'FAILED_LOGIN',
                `Failed login attempt - invalid password: ${email}`,
                req,
                'HIGH',
                { email, reason: 'Invalid password' }
            );
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate token and successful login
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Log successful login
        await logActivity(
            user._id,
            user.username || user.email,
            'LOGIN',
            'User successfully logged in',
            req,
            'MEDIUM',
            { loginTime: new Date(), userAgent: req.get('User-Agent') }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            token
        });

    } catch (error) {
        await logSecurityEvent(
            'FAILED_LOGIN',
            `Failed login attempt for email: ${req.body.email}`,
            req,
            'HIGH',
            { email: req.body.email }
        );

        console.error('Login error:', error);
        res.status(500).json({ error: error.message });
    }
};
