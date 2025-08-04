const express = require('express');
const router = express.Router();
const { loginAdmin, getAllUsers, deleteUser, updateUser } = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/users', protect, adminOnly, getAllUsers);
router.delete('/users/:id', protect, adminOnly, deleteUser);
router.put('/users/:id', protect, adminOnly, updateUser);

router.post('/login', loginAdmin);
module.exports = router;
