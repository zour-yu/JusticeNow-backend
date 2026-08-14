const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// Sync user from Firebase to MongoDB (called after frontend login/register)
const syncUser = async (req, res, next) => {
  try {
    const { uid, email } = req.firebaseUser;
    const { firstName, lastName, phone } = req.body;

    // Check if user already exists in MongoDB
    let user = await User.findOne({ firebaseUid: uid });

    if (user) {
      // User exists — return existing profile
      return res.status(200).json(new ApiResponse(200, user, 'User already synced'));
    }

    // Validate required fields for new user registration
    if (!firstName || !lastName) {
      throw new ApiError(400, 'First name and last name are required for registration.');
    }

    // Create new user in MongoDB
    user = await User.create({
      firebaseUid: uid,
      firstName,
      lastName,
      email: email || '',
      phone: phone || '',
    });

    return res.status(201).json(new ApiResponse(201, user, 'User registered successfully'));
  } catch (error) {
    next(error);
  }
};

// Get the currently authenticated user's profile
const getCurrentUser = async (req, res, next) => {
  try {
    return res.status(200).json(new ApiResponse(200, req.user, 'User profile retrieved'));
  } catch (error) {
    next(error);
  }
};

module.exports = { syncUser, getCurrentUser };
