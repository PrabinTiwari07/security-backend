const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    image: { type: String },
    description: { type: String, required: true },
    seats: { type: Number },
    luggage: { type: String },
    doors: { type: Number },
    transmission: { type: String },
    fuelType: { type: String },
    airConditioning: { type: Boolean, default: false },
    price: { type: Number, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
