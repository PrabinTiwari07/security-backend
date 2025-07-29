const Vehicle = require('../model/vehicle');

// ✅ Add vehicle
exports.addVehicle = async (req, res) => {
    try {
        const {
            name,
            description,
            seats,
            luggage,
            doors,
            transmission,
            fuel,
            airConditioning,
            price
        } = req.body;

        const vehicle = new Vehicle({
            name,
            description,
            seats,
            luggage,
            doors,
            transmission,
            fuel,
            airConditioning: airConditioning === 'true',
            price,
            image: req.file?.filename
        });

        await vehicle.save();
        res.status(201).json(vehicle);
    } catch (error) {
        console.error('Add vehicle error:', error);
        res.status(500).json({ message: 'Failed to add vehicle' });
    }
};

// ✅ Get available vehicles for users
exports.getAvailableVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ isBooked: false });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch available vehicles' });
    }
};

// ✅ Get all vehicles for admin
exports.getAllVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find();
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch all vehicles' });
    }
};

// ✅ Delete a vehicle
exports.deleteVehicle = async (req, res) => {
    try {
        await Vehicle.findByIdAndDelete(req.params.id);
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete vehicle' });
    }
};

// ✅ Toggle vehicle booked status
exports.toggleBookedStatus = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        vehicle.isBooked = !vehicle.isBooked;
        await vehicle.save();
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update booking status' });
    }
};

// ✅ Update vehicle
exports.updateVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        const {
            name,
            seats,
            luggage,
            doors,
            transmission,
            fuel,
            airConditioning,
            price
        } = req.body;

        vehicle.name = name || vehicle.name;
        vehicle.seats = seats || vehicle.seats;
        vehicle.luggage = luggage || vehicle.luggage;
        vehicle.doors = doors || vehicle.doors;
        vehicle.transmission = transmission || vehicle.transmission;
        vehicle.fuel = fuel || vehicle.fuel;
        vehicle.airConditioning = airConditioning === 'true' || false;
        vehicle.price = price || vehicle.price;

        if (req.file) {
            vehicle.image = req.file.filename;
        }

        await vehicle.save();
        res.json(vehicle);
    } catch (error) {
        console.error('Update vehicle error:', error);
        res.status(500).json({ message: 'Failed to update vehicle' });
    }
};

// ✅ Get vehicle by ID
exports.getVehicleById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        res.json(vehicle);
    } catch (error) {
        console.error('Get vehicle by ID error:', error);
        res.status(500).json({ message: 'Failed to fetch vehicle' });
    }
};
