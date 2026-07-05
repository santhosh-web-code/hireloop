import mongoose from 'mongoose';

const eligibilityHistorySchema = new mongoose.Schema({
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
  oldStatus: {
    type: String,
    required: true,
  },
  newStatus: {
    type: String,
    required: true,
  },
  reason: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const EligibilityHistory = mongoose.model('EligibilityHistory', eligibilityHistorySchema);
export default EligibilityHistory;
