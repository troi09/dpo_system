require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Request = require('../models/Request');

(async () => {
  try {
    await connectDB();
    const archiveTimestamp = new Date();

    const filter = {
      $or: [
        { isArchived: false },
        { isArchived: { $exists: false } },
      ],
    };

    const result = await Request.updateMany(filter, {
      $set: {
        isArchived: true,
        archivedAt: archiveTimestamp,
      },
    });

    console.log(`[runArchive] Archive timestamp: ${archiveTimestamp.toISOString()}`);
    console.log(`[runArchive] Matched ${result.matchedCount || 0} requests.`);
    console.log(`[runArchive] Archived ${result.modifiedCount || 0} requests.`);
    process.exitCode = 0;
  } catch (err) {
    console.error('[runArchive] Error:', err);
    process.exitCode = 1;
  } finally {
    try {
      await mongoose.connection.close();
    } catch (e) {
      // ignore
    }
    process.exit();
  }
})();
