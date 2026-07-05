import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: String,
    enum: ['tpo'],
    default: 'tpo',
  },
  type: {
    type: String,
    enum: ['profile_update', 'new_application', 'status_change'],
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentName: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  rollNumber: {
    type: String,
    default: null,
  },
  changedFields: {
    type: [String],
    default: [],
  },
  details: [{
    field: { type: String },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed }
  }],
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
