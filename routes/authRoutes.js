const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { syncUser, getCurrentUser, updateProfile } = require('../controllers/authController');

// POST /api/auth/sync — Sync Firebase user to MongoDB (register or return existing)
router.post('/sync', protect, syncUser);

// GET /api/auth/me — Get the currently authenticated user's profile
router.get('/me', protect, getCurrentUser);

// PUT /api/auth/profile - Update the authenticated user's profile (e.g., complete profile)
router.put('/profile', protect, updateProfile);

module.exports = router;
