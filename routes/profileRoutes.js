
const express = require('express');
const router = express.Router();
const { getProfile, updateProfile, updateLicenseStatus, getAllProfiles, getLicenseStats } = require('../controllers/profileController'); // ✅ Added getLicenseStats
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploads');

// User routes
router.get('/', protect, getProfile);

// Handle multiple file uploads (profileImage and licenseImage)
router.put('/', protect, upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'licenseImage', maxCount: 1 }
]), updateProfile);

// Admin routes
router.get('/all', protect, adminOnly, getAllProfiles);
router.put('/license-status/:userId', protect, adminOnly, updateLicenseStatus);
router.get('/stats', protect, adminOnly, getLicenseStats); // ✅ This will now work

module.exports = router;