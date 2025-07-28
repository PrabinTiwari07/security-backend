const User = require('../model/user');
const bcrypt = require('bcrypt');
const sendOtpEmail = require('../utils/sendOtpEmail');
const jwt = require('jsonwebtoken');
const Profile = require('../model/profile'); // add this import


exports.registerUser = async (req, res) => {
    try {
        const { fullName, address, phone, email, password, confirmPassword } = req.body;

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
        const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
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
            isVerified: false
        });

        await newUser.save();

        await sendOtpEmail({ email, name: fullName, otp: otpCode });

        res.status(201).json({ message: "Registration successful, OTP sent to your email." });
    } catch (error) {
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


// exports.loginUser = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required." });
//     }

//     const user = await User.findOne({ email });
//     if (!user) return res.status(404).json({ message: "User not found." });

//     if (!user.isVerified) {
//       return res.status(401).json({ message: "Please verify your account first." });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) return res.status(401).json({ message: "Invalid password." });

//     const token = jwt.sign(
//       { userId: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
//     );

//     res.status(200).json({
//       message: "Login successful.",
//       token,
//       user: {
//         id: user._id,
//         fullName: user.fullName,
//         email: user.email,
//         role: user.role
//       }
//     });

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

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

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.otpCode = null;
        user.otpExpiresAt = null;

        await user.save();

        res.status(200).json({ message: "Password reset successful. You can now log in." });
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

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedNewPassword;
        await user.save();

        res.status(200).json({ message: "Password changed successfully." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found." });

        if (!user.isVerified) {
            return res.status(401).json({ message: "Please verify your account first." });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid password." });

        // ✅ Create Profile if not already created
        let profile = await Profile.findOne({ user: user._id });
        if (!profile) {
            profile = new Profile({ user: user._id });
            await profile.save();
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
