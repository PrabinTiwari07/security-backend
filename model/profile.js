const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    bio: {
        type: String,
        default: ''
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        default: 'Other'
    },
    dob: {
        type: Date
    },
    profileImage: {
        type: String,
        default: ''
    },

    license: {
        licenseNumber: {
            type: String,
            default: ''
        },
        fullName: {
            type: String,
            default: ''
        },
        expiryDate: {
            type: Date
        },
        licenseImage: {
            type: String,
            default: ''
        },
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
        },
        uploadedAt: {
            type: Date
        },
        verifiedAt: {
            type: Date
        }
    },

    socialLinks: {
        facebook: { type: String },
        instagram: { type: String },
        linkedin: { type: String },
    }
}, { timestamps: true });

module.exports = mongoose.model('Profile', profileSchema);