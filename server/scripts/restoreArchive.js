require('dotenv').config();
const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Request = require('../models/Request');

(async () => {
  await connectDB();
  const result = await Request.updateMany(
    { isArchived: true },
    { $set: { isArchived: false }, $unset: { archivedAt: '' } }
  );
  console.log(`Restored: ${result.modifiedCount} request(s).`);
  await mongoose.connection.close();
})();
