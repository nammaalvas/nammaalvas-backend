import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`🚀 MongoDB Connected Safely: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Database Connection Failure: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

export default connectDB;
