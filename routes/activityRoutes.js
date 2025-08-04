const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
    getAllActivities,
    getActivityStats,
    getUserActivities,
    cleanupActivities,
    exportActivities
} = require('../controllers/activityController');

router.use(protect);
router.use(adminOnly);

router.get('/', getAllActivities);

router.get('/stats', getActivityStats);

router.get('/user/:userId', getUserActivities);

router.get('/export', exportActivities);

router.delete('/cleanup', cleanupActivities);

module.exports = router;
