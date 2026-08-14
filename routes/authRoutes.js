const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { syncUser, getCurrentUser } = require('../controllers/authController');

// POST /api/auth/sync — Sync Firebase user to MongoDB (register or return existing)
router.post('/sync', protect, syncUser);

// GET /api/auth/me — Get the currently authenticated user's profile
router.get('/me', protect, getCurrentUser);

module.exports = router;
