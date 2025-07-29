const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Public routes
router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceById);

// Vehicle Booking Routes (Protected - User must be logged in)
router.post('/vehicle-booking', protect, serviceController.createVehicleBooking);
router.get('/user/vehicle-bookings', protect, serviceController.getUserVehicleBookings);
router.get('/vehicle-booking/:id', protect, serviceController.getVehicleBookingById);
router.put('/vehicle-booking/:id', protect, serviceController.updateVehicleBooking);
router.patch('/vehicle-booking/:id/cancel', protect, serviceController.cancelVehicleBooking);

// Admin routes
router.post('/', protect, adminOnly, serviceController.createService);
router.put('/:id', protect, adminOnly, serviceController.updateService);
router.delete('/:id', protect, adminOnly, serviceController.deleteService);

// Admin Vehicle Booking Routes
router.get('/admin/vehicle-bookings', protect, adminOnly, serviceController.getAllVehicleBookings);
router.put('/admin/vehicle-booking/:id', protect, adminOnly, serviceController.adminUpdateVehicleBooking);
router.delete('/admin/vehicle-booking/:id', protect, adminOnly, serviceController.deleteVehicleBooking);

module.exports = router;