const User = require('../model/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    const admin = await User.findOne({ email });

    if (!admin || admin.role !== 'admin') {
        return res.status(401).json({ message: "Unauthorized. Not an admin." });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
        { userId: admin._id, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.status(200).json({
        message: "Admin login successful",
        token
    });
};


exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' }).select('-password');
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { fullName, phone, address } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { fullName, phone, address },
            { new: true }
        );
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
};
