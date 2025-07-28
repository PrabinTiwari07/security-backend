
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
    isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);
