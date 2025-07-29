const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    name: String,
    image: String,
    description: String,
    seats: Number,
    luggage: Number,
    doors: Number,
    transmission: String,
    fuel: String,
    airConditioning: Boolean,
    price: Number,
    isBooked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);