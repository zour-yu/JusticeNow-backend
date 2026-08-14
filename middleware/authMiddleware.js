const { auth } = require('../config/firebaseAdmin');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const protect = async (req, res, next) => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Access denied. No token provided.');
    }

    // Extract the token
    const token = authHeader.split(' ')[1];

    // Verify the token with Firebase Admin SDK
    const decodedToken = await auth.verifyIdToken(token);

    // Find the user in MongoDB by their Firebase UID
    const user = await User.findOne({ firebaseUid: decodedToken.uid });

    if (!user) {
      throw new ApiError(404, 'User not found. Please complete registration.');
    }

    // Check if user is suspended
    if (user.status === 'SUSPENDED') {
      throw new ApiError(403, 'Your account has been suspended. Contact support.');
    }

    // Check if user is inactive
    if (user.status === 'INACTIVE') {
      throw new ApiError(403, 'Your account is inactive.');
    }

    // Attach user and decoded token to request object
    req.user = user;
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    // If it's already an ApiError, pass it through
    if (error instanceof ApiError) {
      return next(error);
    }

    // Handle Firebase-specific token errors
    if (error.code === 'auth/id-token-expired') {
      return next(new ApiError(401, 'Token has expired. Please log in again.'));
    }
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-revoked') {
      return next(new ApiError(401, 'Invalid token. Please log in again.'));
    }

    return next(new ApiError(401, 'Authentication failed.'));
  }
};

module.exports = { protect };
