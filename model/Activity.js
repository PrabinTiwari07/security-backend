const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'LOGIN',
            'LOGOUT',
            'REGISTER',
            'PASSWORD_CHANGE',
            'PROFILE_UPDATE',
            'PROFILE_VIEW',
            'VEHICLE_CREATE',
            'VEHICLE_UPDATE',
            'VEHICLE_DELETE',
            'VEHICLE_VIEW',
            'SERVICE_CREATE',
            'SERVICE_UPDATE',
            'SERVICE_DELETE',
            'SERVICE_VIEW',
            'ADMIN_ACCESS',
            'USER_VIEW',
            'USER_UPDATE',
            'USER_DELETE',
            'SYSTEM_ACCESS',
            'FILE_UPLOAD',
            'PASSWORD_RESET_REQUEST',
            'PASSWORD_RESET_COMPLETE',
            'FAILED_LOGIN',
            'ACCOUNT_LOCKED',
            'ACCOUNT_UNLOCKED'
        ]
    },
    description: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    userAgent: {
        type: String,
        required: true
    },
    method: {
        type: String,
        required: true
    },
    endpoint: {
        type: String,
        required: true
    },
    statusCode: {
        type: Number,
        required: true
    },
    responseTime: {
        type: Number,
        required: true
    },
    additionalData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    severity: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'LOW'
    }
}, {
    timestamps: true
});

activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });
activitySchema.index({ createdAt: -1 });
activitySchema.index({ severity: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
