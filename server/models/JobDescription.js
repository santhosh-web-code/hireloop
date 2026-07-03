import mongoose from 'mongoose';

const jobDescriptionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  companyName: {
    type: String,
    required: true,
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  requiredSkills: {
    type: [String],
    required: true,
  },
  minCGPA: {
    type: Number,
    required: true,
    default: 0,
  },
  allowedBranches: {
    type: [String],
    required: true,
  },
  maxBacklogs: {
    type: Number,
    default: 0,
  },
  package: {
    type: String,
  },
  location: {
    type: String,
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
    default: null,
  },
  customQuestions: {
    type: [{
      questionText: { type: String, required: true },
      placeholder: { type: String, default: '' },
      isRequired: { type: Boolean, default: true }
    }],
    default: []
  },
  documentUrl: {
    type: String,
    default: null,
  },
  documentName: {
    type: String,
    default: null,
  },
  documentBase64: {
    type: String,
    default: null,
  },
  documentFileType: {
    type: String,
    default: null,
  },
  assessmentEnabled: {
    type: Boolean,
    default: false,
  },
  assessmentCutoffScore: {
    type: Number,
    default: null,
  },
  assessmentMaxAttempts: {
    type: Number,
    default: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const JobDescription = mongoose.model('JobDescription', jobDescriptionSchema);
export default JobDescription;
