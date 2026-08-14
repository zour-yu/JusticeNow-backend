const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const path = require('path');

const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount),
});

console.log('Firebase Admin SDK initialized successfully');

const auth = getAuth();

module.exports = { auth };
