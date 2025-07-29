// const express = require('express');
// const multer = require('multer');
// const {
//     addVehicle,
//     getAvailableVehicles,
//     getAllVehicles,
//     getVehicleById,
//     deleteVehicle,
//     toggleBookedStatus,
//     updateVehicle
// } = require('../controllers/vehicleController');
// const { activityLogger } = require('../middleware/activityLogger');
// const { protect } = require('../middleware/authMiddleware');

// const router = express.Router();

// // Multer for image upload
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => cb(null, 'public/uploads'),
//     filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
// });
// const upload = multer({ storage });

// // Routes
// router.post('/add', upload.single('image'), protect, activityLogger('VEHICLE_CREATE', 'User created vehicle', 'MEDIUM'), addVehicle);
// router.get('/available', protect, activityLogger('VEHICLE_VIEW', 'User viewed vehicles', 'LOW'), getAvailableVehicles);
// router.get('/all', protect, activityLogger('VEHICLE_VIEW', 'User viewed vehicles', 'LOW'), getAllVehicles);
// router.get('/:id', protect, activityLogger('VEHICLE_VIEW', 'User viewed vehicle details', 'LOW'), getVehicleById);
// router.delete('/:id', protect, activityLogger('VEHICLE_DELETE', 'User deleted vehicle', 'HIGH'), deleteVehicle);
// router.patch('/:id/book', protect, toggleBookedStatus);
// router.put('/:id', upload.single('image'), protect, activityLogger('VEHICLE_UPDATE', 'User updated vehicle', 'MEDIUM'), updateVehicle);

// module.exports = router;


const express = require('express');
const multer = require('multer');
const {
    addVehicle,
    getAvailableVehicles,
    getAllVehicles,
    getVehicleById,
    deleteVehicle,
    toggleBookedStatus,
    updateVehicle
} = require('../controllers/vehicleController');
// const { activityLogger } = require('../middleware/activityLogger');
// const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Multer for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Routes
router.post('/add', upload.single('image'), addVehicle);
router.get('/available', getAvailableVehicles);
router.get('/all', getAllVehicles);
router.get('/:id', getVehicleById);
router.delete('/:id', deleteVehicle);
router.patch('/:id/book', toggleBookedStatus);
router.put('/:id', upload.single('image'), updateVehicle);

module.exports = router;
