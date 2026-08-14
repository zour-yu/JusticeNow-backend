const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const ApiResponse = require('./utils/ApiResponse');
const ApiError = require('./utils/ApiError');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health-check route
app.get('/api/health', (req, res) => {
  res.status(200).json(new ApiResponse(200, { message: 'JusticeNow API Running...' }, 'Server is healthy'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // If the error isn't an instance of ApiError, wrap it
  if (!(err instanceof ApiError)) {
    err = new ApiError(500, err.message || 'Something went wrong!');
  }

  res.status(err.statusCode).json({
    success: err.success,
    message: err.message,
    errors: err.errors
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
