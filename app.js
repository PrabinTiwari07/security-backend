const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const userRoutes = require('./routes/userRoutes');
// const adminRoutes = require('./routes/adminRoutes');
const { protect } = require('./middleware/authMiddleware');
const profileRoutes = require('./routes/profileRoutes');

dotenv.config();
const app = express();
connectDB();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
}));

app.use(express.json());

app.use('/api/users', userRoutes);
// app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);


app.use('/uploads', express.static('public/uploads'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
