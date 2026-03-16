import mongoose from 'mongoose';
import config from './config';
import User from './models/user.model';

const seedUsers = async () => {
  try {
    if (!config.database_url) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(config.database_url);
    console.log('MongoDB connected for seeding');

    const adminExists = await User.findOne({ email: 'admin@nexcart.com' });
    if (!adminExists) {
      await User.create({
        name: 'Admin',
        email: 'admin@nexcart.com',
        password: '123456',
        role: 'ADMIN',
      });
      console.log('Admin user created: admin@nexcart.com / 123456');
    } else {
      console.log('Admin user already exists');
    }

    const userExists = await User.findOne({ email: 'user@nexcart.com' });
    if (!userExists) {
      await User.create({
        name: 'User',
        email: 'user@nexcart.com',
        password: '123456',
        role: 'USER',
      });
      console.log('Demo user created: user@nexcart.com / 123456');
    } else {
      console.log('Demo user already exists');
    }

    console.log('Seeding complete');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seedUsers();
