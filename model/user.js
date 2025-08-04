const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    address: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    otpExpiresAt: { type: Date },
    otpCode: { type: String },
    isVerified: { type: Boolean, default: false },

    passwordExpiresAt: {
        type: Date,
        default: function () {
            return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
    },
    passwordHistory: [{
        password: { type: String, required: true },
        createdAt: { type: Date, default: Date.now }
    }],
    lastPasswordChange: { type: Date, default: Date.now },
    mustChangePassword: { type: Boolean, default: false },

    mfaEnabled: {
        type: Boolean,
        default: false
    },
    mfaSecret: {
        type: String,
        select: false
    }
});

userSchema.methods.isPasswordExpired = function () {
    return new Date() > this.passwordExpiresAt;
};

userSchema.methods.isPasswordReused = function (newPassword, bcrypt) {
    return bcrypt.compareSync(newPassword, this.password);
};

userSchema.methods.addPasswordToHistory = function (hashedPassword) {
    this.passwordHistory.push({
        password: hashedPassword,
        createdAt: new Date()
    });

    if (this.passwordHistory.length > 3) {
        this.passwordHistory = this.passwordHistory.slice(-3);
    }
};

module.exports = mongoose.model('User', userSchema);
