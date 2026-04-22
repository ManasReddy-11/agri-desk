import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MongoDB Connection Setup
 * Connects to MongoDB Atlas using Mongoose
 */

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    console.log('🔄 Connecting to MongoDB Atlas...');

    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority',
    });

    console.log(`
╔════════════════════════════════════════╗
║    ✓ MongoDB Connected Successfully    ║
╚════════════════════════════════════════╝
Host: ${conn.connection.host}
Database: ${conn.connection.name}
State: ${conn.connection.readyState === 1 ? 'Connected' : 'Connecting'}
Time: ${new Date().toISOString()}
    `);

    return conn;
  } catch (error) {
    console.error(`
╔════════════════════════════════════════╗
║    ✗ MongoDB Connection Failed         ║
╚════════════════════════════════════════╝
Error: ${error.message}
Time: ${new Date().toISOString()}
    `);

    // Exit process with failure code
    process.exit(1);
  }
};

/**
 * Mongoose Connection Event Listeners
 */

mongoose.connection.on('connected', () => {
  console.log('[Mongoose] Connected to MongoDB');
});

mongoose.connection.on('disconnected', () => {
  console.log('[Mongoose] Disconnected from MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error(`[Mongoose] Connection error: ${err.message}`);
});

mongoose.connection.on('reconnected', () => {
  console.log('[Mongoose] Reconnected to MongoDB');
});

/**
 * Graceful Shutdown Handler
 */

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('✓ MongoDB Disconnected');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error disconnecting from MongoDB:', error.message);
    process.exit(1);
  }
};

// Handle process termination
process.on('SIGINT', disconnectDB);
process.on('SIGTERM', disconnectDB);

export { connectDB, disconnectDB };
export default connectDB;
