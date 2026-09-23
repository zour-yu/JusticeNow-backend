/**
 * JusticeNow — CaseStatus Migration Script (Node.js)
 * ==================================================
 * Run this ONCE against your MongoDB database BEFORE restarting the backend.
 *
 * Usage:
 *   node migrate-case-status.js
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// 1. Get MongoDB URI from environment or .env file
let uri = process.env.MONGODB_URI;
const envPath = path.join(__dirname, '.env');

if (!uri && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/^MONGODB_URI=(.+)$/m);
  if (match) {
    uri = match[1].trim().replace(/^["']|["']$/g, '');
  }
}

if (!uri) {
  console.error('Error: MONGODB_URI not found in environment or .env file.');
  process.exit(1);
}

async function runMigration() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected successfully.\n');

    const db = mongoose.connection.db;
    const casesCollection = db.collection('cases');

    // Step 1: ASSIGNED → PENDING
    const assignedResult = await casesCollection.updateMany(
      { status: 'ASSIGNED' },
      { $set: { status: 'PENDING' } }
    );
    console.log(`ASSIGNED -> PENDING:              ${assignedResult.modifiedCount} documents`);

    const timelineAssigned = await casesCollection.updateMany(
      { 'statusTimeline.status': 'ASSIGNED' },
      { $set: { 'statusTimeline.$[elem].status': 'PENDING' } },
      { arrayFilters: [{ 'elem.status': 'ASSIGNED' }] }
    );
    console.log(`Timeline ASSIGNED -> PENDING:     ${timelineAssigned.modifiedCount} documents`);

    // Step 2: EVIDENCE_COLLECTION → UNDER_INVESTIGATION
    const evidenceResult = await casesCollection.updateMany(
      { status: 'EVIDENCE_COLLECTION' },
      { $set: { status: 'UNDER_INVESTIGATION' } }
    );
    console.log(`EVIDENCE_COLLECTION -> UNDER_INVESTIGATION: ${evidenceResult.modifiedCount} documents`);

    const timelineEvidence = await casesCollection.updateMany(
      { 'statusTimeline.status': 'EVIDENCE_COLLECTION' },
      { $set: { 'statusTimeline.$[elem].status': 'UNDER_INVESTIGATION' } },
      { arrayFilters: [{ 'elem.status': 'EVIDENCE_COLLECTION' }] }
    );
    console.log(`Timeline EVIDENCE_COLLECTION -> UNDER_INVESTIGATION: ${timelineEvidence.modifiedCount} documents`);

    // Step 3: REPORT_SUBMITTED → UNDER_INVESTIGATION
    const reportResult = await casesCollection.updateMany(
      { status: 'REPORT_SUBMITTED' },
      { $set: { status: 'UNDER_INVESTIGATION' } }
    );
    console.log(`REPORT_SUBMITTED -> UNDER_INVESTIGATION:    ${reportResult.modifiedCount} documents`);

    const timelineReport = await casesCollection.updateMany(
      { 'statusTimeline.status': 'REPORT_SUBMITTED' },
      { $set: { 'statusTimeline.$[elem].status': 'UNDER_INVESTIGATION' } },
      { arrayFilters: [{ 'elem.status': 'REPORT_SUBMITTED' }] }
    );
    console.log(`Timeline REPORT_SUBMITTED -> UNDER_INVESTIGATION: ${timelineReport.modifiedCount} documents`);

    // Final verification
    console.log('\n--- Post-migration Status Distribution ---');
    const distribution = await casesCollection.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    distribution.forEach(c => console.log(`  ${c._id}: ${c.count}`));

    const remaining = await casesCollection.countDocuments({
      status: { $in: ['ASSIGNED', 'EVIDENCE_COLLECTION', 'REPORT_SUBMITTED'] }
    });

    if (remaining === 0) {
      console.log('\nMigration complete. No old status values remain.');
    } else {
      console.log(`\nWARNING: ${remaining} documents still have old status values!`);
    }

  } catch (err) {
    console.error('Migration failed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

runMigration();
