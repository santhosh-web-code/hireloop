import mongoose from 'mongoose';

const placementHistorySchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
  changedBy: {
    type: String,
    enum: ['system', 'tpo', 'student'],
    default: 'system',
  },
  remarks: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const PlacementHistory = mongoose.model('PlacementHistory', placementHistorySchema);
export default PlacementHistory;
