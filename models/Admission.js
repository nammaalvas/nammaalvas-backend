import mongoose from 'mongoose';

const admissionSchema = new mongoose.Schema(
  {
    tokenNumber: {
      type: String,
      trim: true,
      index: true,
    },
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
    course: {
      type: String,
      required: true,
      trim: true,
    },
    branch: {
      type: String,
      trim: true,
    },
    department: {
      type: String,
      default: 'Engineering & Technology',
    },
    appointmentType: {
      type: String,
      default: 'Online Seat Booking',
    },
    mode: {
      type: String,
      default: 'Online Seat Booking',
    },
    seatSlot: {
      type: String,
      default: 'Provisionally Reserved',
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'In-Review', 'Cancelled'],
      default: 'Pending',
    },
    remarks: {
      type: String,
      default: 'Online Seat Booking Submission',
    },
    category: {
      type: String,
      enum: ['UG', 'PG'],
      default: 'UG',
      index: true,
    },
    admissionDate: {
      type: String,
    },
    admissionTime: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    browser: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index to quickly query email, phone, and course
admissionSchema.index({ email: 1, phone: 1, course: 1 });

const Admission = mongoose.model('Admission', admissionSchema);

export default Admission;