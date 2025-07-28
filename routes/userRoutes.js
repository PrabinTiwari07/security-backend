const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { changePassword } = require('../controllers/userController');
const { registerUser, verifyOtp, resendOtp, loginUser, forgotPassword, resetPassword } = require('../controllers/userController');
const { verifyResetOtp } = require('../controllers/userController');

router.post('/register', registerUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/change-password', protect, changePassword);

router.post('/verify-reset-otp', verifyResetOtp);

module.exports = router;
