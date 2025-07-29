const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// OTP routes
// router.post('/send-otp', protect, paymentController.sendOTP);
// router.post('/verify-otp', protect, paymentController.verifyOTP);

// 🚀 KPG-2 Khalti Routes
// Add this new route
router.post('/khalti/initiate', protect, paymentController.initiateKhaltiPayment);
router.post('/verify', protect, paymentController.verifyKhaltiPayment);
router.get('/status/:pidx', protect, paymentController.getPaymentStatus);

module.exports = router;