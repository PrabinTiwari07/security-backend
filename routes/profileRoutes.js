
const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, updateLicenseStatus, getAllProfiles, getLicenseStats } = require('../controllers/profileController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploads');
const {
    validationRules,
    handleValidationErrors
} = require('../middleware/xssProtection');

router.get('/', protect, getProfile);

router.put('/', protect, upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 }
]),
    validationRules.profileUpdate,
    handleValidationErrors,
    updateProfile
);

router.get('/all', protect, adminOnly, getAllProfiles);
router.put('/license-status/:userId', protect, adminOnly, updateLicenseStatus);
router.get('/stats', protect, adminOnly, getLicenseStats);

module.exports = router;