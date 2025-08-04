const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { activityLogger } = require('../middleware/activityLogger');

router.get('/', serviceController.getAllServices);
router.get('/:id', serviceController.getServiceById);

router.post('/vehicle-booking', protect, serviceController.createVehicleBooking);
router.get('/user/vehicle-bookings', protect, serviceController.getUserVehicleBookings);
router.get('/vehicle-booking/:id', protect, serviceController.getVehicleBookingById);
router.put('/vehicle-booking/:id', protect, serviceController.updateVehicleBooking);
router.patch('/vehicle-booking/:id/cancel', protect, serviceController.cancelVehicleBooking);

router.post('/',
    protect,
    adminOnly,
    activityLogger('SERVICE_CREATE', 'User created service', 'MEDIUM'),
    serviceController.createService
);
router.put('/:id',
    protect,
    adminOnly,
    activityLogger('SERVICE_UPDATE', 'User updated service', 'MEDIUM'),
    serviceController.updateService
);
router.delete('/:id',
    protect,
    adminOnly,
    activityLogger('SERVICE_DELETE', 'User deleted service', 'HIGH'),
    serviceController.deleteService
);

router.get('/admin/vehicle-bookings', protect, adminOnly, serviceController.getAllVehicleBookings);
router.put('/admin/vehicle-booking/:id', protect, adminOnly, serviceController.adminUpdateVehicleBooking);
router.delete('/admin/vehicle-booking/:id', protect, adminOnly, serviceController.deleteVehicleBooking);

module.exports = router;