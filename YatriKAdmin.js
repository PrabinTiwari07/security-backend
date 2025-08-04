const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./model/user');
require('dotenv').config();

const createYatriKAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const existingAdmin = await User.findOne({ email: 'admin@yatrik.com' });
        if (existingAdmin) {
            console.log("Super admin already exists.");
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('Admin@123', 10);

        const admin = new User({
            fullName: 'Super Admin',
            email: 'yatrik49@gmail.com',
            password: hashedPassword,
            address: 'Jorpati, Kathmandu',
            phone: '9869028215',
            isVerified: true,
            role: 'admin'
        });

        await admin.save();
        console.log("Super Admin created.");
        process.exit(0);
    } catch (error) {
        console.error("Failed to create admin:", error.message);
        process.exit(1);
    }
};

createYatriKAdmin();
