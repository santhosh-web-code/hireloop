import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'hr', 'tpo'],
    required: true,
  },
  collegeName: {
    type: String,
    default: null,
  },
  companyName: {
    type: String,
    default: null,
  },
  branch: {
    type: String,
    default: null,
  },
  cgpa: {
    type: Number,
    default: null,
  },
  backlogs: {
    type: Number,
    default: 0,
  },
  studentId: {
    type: String,
    default: null,
  },
  passedOutYear: {
    type: Number,
    default: null,
  },
  tenthPercent: {
    type: Number,
    default: null,
  },
  twelfthPercent: {
    type: Number,
    default: null,
  },
  degreeCGPA: {
    type: Number,
    default: null,
  },
  profilePicUrl: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    default: null,
  },
  skills: {
    type: [String],
    default: [],
  },
  resumeText: {
    type: String,
    default: null,
  },
  resumeBase64: {
    type: String,
    default: null,
  },
  resumeFileName: {
    type: String,
    default: null,
  },
  resumeFileType: {
    type: String,
    default: null,
  },
  isApproved: {
    type: Boolean,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
    default: null,
  },
  otpExpiry: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);
export default User;
