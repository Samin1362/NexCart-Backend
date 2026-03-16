import mongoose from 'mongoose';
import app from './app';
import config from './config';

const startServer = async () => {
  try {
    if (!config.database_url) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    await mongoose.connect(config.database_url);
    console.log('MongoDB connected successfully');

    app.listen(config.port, () => {
      console.log(`NexCart server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
