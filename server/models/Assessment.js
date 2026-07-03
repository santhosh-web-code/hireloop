import mongoose from 'mongoose';

const assessmentSchema = new mongoose.Schema({
  jobDescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobDescription',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  questions: [{
    questionText: {
      type: String,
      required: true,
    },
    options: [{
      type: String,
    }],
    correctAnswer: {
      type: Number,
      required: true,
    },
    marks: {
      type: Number,
      default: 1,
    },
  }],
  totalMarks: {
    type: Number,
    required: true,
  },
  passingScore: {
    type: Number,
    default: null,
  },
  timeLimit: {
    type: Number,
    default: 30, // in minutes
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

const Assessment = mongoose.model('Assessment', assessmentSchema);
export default Assessment;
