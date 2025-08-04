const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { changePassword } = require('../controllers/userController');
const {
    validationRules,
    handleValidationErrors
} = require('../middleware/xssProtection');
const {
    registerUser, verifyOtp, resendOtp, loginUser, forgotPassword, resetPassword, getPasswordStatus, logoutUser,
    logoutAllSessions, getActiveSessions, endSession
} = require('../controllers/userController');
const { verifyResetOtp } = require('../controllers/userController');
const { activityLogger } = require('../middleware/activityLogger');

router.post('/register',
    activityLogger('REGISTER', 'User registration', 'MEDIUM'),
    validationRules.userRegistration,
    handleValidationErrors,
    registerUser
);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login',
    activityLogger('LOGIN', 'User login attempt', 'MEDIUM'),
    validationRules.userLogin,
    handleValidationErrors,
    loginUser
);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',
    validationRules.passwordReset,
    handleValidationErrors,
    resetPassword
);
router.post('/verify-reset-otp', verifyResetOtp);

router.put('/change-password',
    protect,
    activityLogger('PASSWORD_CHANGE', 'User changed password', 'HIGH'),
    changePassword
);
router.get('/password-status', protect, getPasswordStatus);
router.post('/logout', protect, logoutUser);
router.post('/logout-all', protect, logoutAllSessions);
router.get('/sessions', protect, getActiveSessions);
router.delete('/sessions/:sessionId', protect, endSession);

module.exports = router;
