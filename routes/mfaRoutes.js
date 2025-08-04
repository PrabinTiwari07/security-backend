
const express = require('express');
const router = express.Router();
const {
    setupMFA,
    verifyAndEnableMFA,
    disableMFA,
    verifyMFAToken,
    getMFAStatus
} = require('../controllers/mfaController');

const { protect } = require('../middleware/authMiddleware');

router.post('/verify-token', verifyMFAToken);

router.use(protect);
router.get('/setup', setupMFA);
router.post('/verify-setup', verifyAndEnableMFA);
router.post('/disable', disableMFA);
router.get('/status', getMFAStatus);

module.exports = router;
