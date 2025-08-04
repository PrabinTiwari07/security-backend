
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

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.post('/add', upload.single('image'), addVehicle);
router.get('/available', getAvailableVehicles);
router.get('/all', getAllVehicles);
router.get('/:id', getVehicleById);
router.delete('/:id', deleteVehicle);
router.patch('/:id/book', toggleBookedStatus);
router.put('/:id', upload.single('image'), updateVehicle);

module.exports = router;
