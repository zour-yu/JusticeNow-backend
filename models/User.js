const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['CITIZEN', 'INVESTIGATOR', 'ADMIN'],
      default: 'CITIZEN',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
    },
    isProfileComplete: {
      type: Boolean,
      default: false, // false until the user completes their profile
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
