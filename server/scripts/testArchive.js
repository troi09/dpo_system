require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Request = require('../models/Request');

(async () => {
  await connectDB();
  const hours = 8;
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * hours);
  const result = await Request.updateMany(
    { $or: [{ isArchived: false }, { isArchived: { $exists: false } }], createdAt: { $lte: cutoff } },
    { $set: { isArchived: true, archivedAt: new Date() } }
  );
  console.log(`Archived: ${result.modifiedCount} request(s) older than ${hours} hours.`);
  await mongoose.connection.close();
})();
