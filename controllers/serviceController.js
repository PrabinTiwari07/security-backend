const mongoose = require('mongoose');
const Service = require('../model/service');


exports.createService = async (req, res) => {
    try {
        const service = new Service(req.body);
        await service.save();
        res.status(201).json({ success: true, service });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.updateService = async (req, res) => {
    try {
        const {
            name,
            description,
            category,
            image,
            seats,
            luggage,
            doors,
            transmission,
            fuelType,
            airConditioning,
            price
        } = req.body;

        const updatedService = await Service.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                category,
                image,
                seats,
                luggage,
                doors,
                transmission,
                fuelType,
                airConditioning,
                price
            },
            { new: true, runValidators: true }
        );

        if (!updatedService) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json({ success: true, service: updatedService });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.deleteService = async (req, res) => {
    try {
        const deletedService = await Service.findByIdAndDelete(req.params.id);
        if (!deletedService) {
            return res.status(404).json({ message: 'Service not found' });
        }

        res.json({ success: true, message: 'Service deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getAllServices = async (req, res) => {
    try {
        const services = await Service.find();
        res.json({ success: true, services });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getServiceById = async (req, res) => {
    try {
        const service = await Service.findById(req.params.id);
        if (!service) return res.status(404).json({ message: 'Service not found' });
        res.json({ success: true, service });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const vehicleBookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    vehicleName: { type: String, required: true },
    pickupLocation: { type: String, required: true },
    dropoffLocation: { type: String, required: true },
    pickupCoords: { lat: Number, lng: Number },
    dropoffCoords: { lat: Number, lng: Number },
    pickupDate: { type: String, required: true },
    dropoffDate: { type: String, required: true },
    pickupTime: { type: String, required: true },
    dropoffTime: { type: String, required: true },
    totalDays: { type: Number, required: true },
    includeDriver: { type: Boolean, default: false },
    rentalType: { type: String, enum: ['self-drive', 'with-driver'], required: true },
    totalPrice: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['khalti', 'cash', 'online'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    paymentInfo: {
        pidx: String,
        transactionId: String,
        amount: Number,
        status: String,
        paidAt: Date
    },
    status: { type: String, enum: ['pending', 'confirmed', 'ongoing', 'completed', 'cancelled'], default: 'pending' },
    bookingDate: { type: Date, default: Date.now },
    notes: String
}, { timestamps: true });

const VehicleBooking = mongoose.model('VehicleBooking', vehicleBookingSchema);

exports.createVehicleBooking = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const {
            vehicle,
            vehicleName,
            pickupLocation,
            dropoffLocation,
            pickupCoords,
            dropoffCoords,
            pickupDate,
            dropoffDate,
            pickupTime,
            dropoffTime,
            totalDays,
            includeDriver,
            rentalType,
            totalPrice,
            paymentMethod,
            paymentStatus,
            paymentInfo,
            status,
            notes
        } = req.body;

        console.log('Creating vehicle booking for user:', userId);
        console.log('Booking data:', req.body);

        if (!vehicle || !vehicleName || !pickupLocation || !dropoffLocation ||
            !pickupDate || !dropoffDate || !pickupTime || !dropoffTime ||
            !totalDays || !totalPrice || !paymentMethod || !rentalType) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        const booking = new VehicleBooking({
            user: userId,
            vehicle,
            vehicleName,
            pickupLocation,
            dropoffLocation,
            pickupCoords: pickupCoords || { lat: 0, lng: 0 },
            dropoffCoords: dropoffCoords || { lat: 0, lng: 0 },
            pickupDate,
            dropoffDate,
            pickupTime,
            dropoffTime,
            totalDays,
            includeDriver: includeDriver || false,
            rentalType,
            totalPrice,
            paymentMethod,
            paymentStatus: paymentStatus || 'pending',
            paymentInfo: paymentInfo || null,
            status: status || 'pending',
            notes: notes || ''
        });

        await booking.save();
        console.log('Vehicle booking created successfully:', booking._id);

        res.status(201).json({
            success: true,
            message: 'Vehicle booking created successfully',
            booking
        });

    } catch (error) {
        console.error('Error creating vehicle booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create booking',
            error: error.message
        });
    }
};

exports.getUserVehicleBookings = async (req, res) => {
    try {
        const userId = req.user.id || req.user._id;

        const bookings = await VehicleBooking.find({ user: userId })
            .populate('vehicle', 'name category image price seats doors transmission fuelType')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });

    } catch (error) {
        console.error('Error fetching user vehicle bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
};

exports.getVehicleBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id || req.user._id;

        const booking = await VehicleBooking.findOne({ _id: id, user: userId })
            .populate('vehicle', 'name category image price seats doors transmission fuelType')
            .populate('user', 'firstName lastName email phone');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            booking
        });

    } catch (error) {
        console.error('Error fetching vehicle booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch booking',
            error: error.message
        });
    }
};

exports.updateVehicleBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id || req.user._id;
        const { status, paymentStatus, paymentInfo, notes } = req.body;

        const booking = await VehicleBooking.findOne({ _id: id, user: userId });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (status) booking.status = status;
        if (paymentStatus) booking.paymentStatus = paymentStatus;
        if (paymentInfo) booking.paymentInfo = { ...booking.paymentInfo, ...paymentInfo };
        if (notes) booking.notes = notes;

        await booking.save();

        res.status(200).json({
            success: true,
            message: 'Booking updated successfully',
            booking
        });

    } catch (error) {
        console.error('Error updating vehicle booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking',
            error: error.message
        });
    }
};

exports.cancelVehicleBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id || req.user._id;

        const booking = await VehicleBooking.findOne({ _id: id, user: userId });
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        if (booking.status === 'cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Booking is already cancelled'
            });
        }

        booking.status = 'cancelled';
        await booking.save();

        res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            booking
        });

    } catch (error) {
        console.error('Error cancelling vehicle booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel booking',
            error: error.message
        });
    }
};

exports.getAllVehicleBookings = async (req, res) => {
    try {
        const { status, paymentStatus, page = 1, limit = 10 } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        const skip = (page - 1) * limit;

        const bookings = await VehicleBooking.find(filter)
            .populate('vehicle', 'name category image price seats doors transmission fuelType')
            .populate('user', 'firstName lastName email phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await VehicleBooking.countDocuments(filter);

        res.status(200).json({
            success: true,
            count: bookings.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            bookings
        });

    } catch (error) {
        console.error('Error fetching all vehicle bookings:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings',
            error: error.message
        });
    }
};

exports.adminUpdateVehicleBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const booking = await VehicleBooking.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('vehicle', 'name category image price')
            .populate('user', 'firstName lastName email phone');

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Booking updated successfully',
            booking
        });

    } catch (error) {
        console.error('Error updating vehicle booking (admin):', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update booking',
            error: error.message
        });
    }
};

exports.deleteVehicleBooking = async (req, res) => {
    try {
        const { id } = req.params;

        const booking = await VehicleBooking.findByIdAndDelete(id);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Booking deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting vehicle booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete booking',
            error: error.message
        });
    }
};
