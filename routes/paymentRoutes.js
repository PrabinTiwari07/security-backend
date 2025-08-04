const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/khalti/initiate', protect, paymentController.initiateKhaltiPayment);
router.post('/verify', protect, paymentController.verifyKhaltiPayment);
router.get('/status/:pidx', protect, paymentController.getPaymentStatus);

module.exports = router;