import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String, // Storing as YYYY-MM-DD
      required: true,
    },
    type: {
      type: String,
      enum: ['offline', 'online'],
      required: true,
    },
    desk: {
      type: String,
      // Principal, AO, HOD, Harshitha...
    },
    course: {
      type: String,
    },
    token: {
      type: String,
      required: true,
      unique: true,
    },
    queueNumber: {
      type: Number,
    },
    virtualLink: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
