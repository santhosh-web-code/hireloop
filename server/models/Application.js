import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  jobDescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobDescription',
    required: true,
  },
  status: {
    type: String,
    enum: [
      'Applied',
      'Eligible',
      'Not Eligible',
      'Shortlisted',
      'Interview Scheduled',
      'Selected',
      'Rejected',
    ],
    default: 'Applied',
  },
  mockInterviewScore: {
    type: Number,
    default: null,
  },
  mockInterviewFeedback: {
    type: String,
    default: null,
  },
  strengths: {
    type: [String],
    default: [],
  },
  improvements: {
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
  customAnswers: {
    type: [{
      questionText: { type: String },
      answer: { type: String }
    }],
    default: []
  },
  assessmentScore: {
    type: Number,
    default: null,
  },
  assessmentAttempted: {
    type: Boolean,
    default: false,
  },
  assessmentCompletedAt: {
    type: Date,
    default: null,
  },
  mockInterviewAttempts: {
    type: Number,
    default: 0,
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique index on student and jobDescription
applicationSchema.index({ student: 1, jobDescription: 1 }, { unique: true });

const Application = mongoose.model('Application', applicationSchema);
export default Application;
