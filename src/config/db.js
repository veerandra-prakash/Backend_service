const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.warn(`[Database] MongoDB Unavailable (${error.message}). Disabling Mongoose query buffering for graceful operation.`);
    mongoose.set('bufferCommands', false);
  }
};

module.exports = connectDB;
