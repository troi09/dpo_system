require('dotenv').config();
const connectDB = require('../config/db');

(async () => {
  try {
    await connectDB();

    const fiveYearsAgo = new Date();
    fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

    const Request = require('../models/Request');

    const result = await Request.updateMany(
      {
        isArchived: false,
        status: { $in: ['nda_approved', 'agr_approved'] },
        createdAt: { $lte: fiveYearsAgo },
      },
      { $set: { isArchived: true, archivedAt: new Date() } }
    );

    console.log(`[runArchive] Archived ${result.modifiedCount} requests.`);
  } catch (err) {
    console.error('[runArchive] Error:', err);
  } finally {
    // Close mongoose connection if open
    try {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
    } catch (e) {
      // ignore
    }
    process.exit(0);
  }
})();
