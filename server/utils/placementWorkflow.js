import User from '../models/User.js';
import PlacementHistory from '../models/PlacementHistory.js';
import Notification from '../models/Notification.js';

/**
 * Transitions a student's placement status methodically, logging history and sending notifications.
 */
export const updateStudentPlacementStatus = async (studentId, newStatus, changedBy = 'system', remarks = '') => {
  try {
    const student = await User.findOne({ _id: studentId, role: 'student' });
    if (!student) return null;

    const oldStatus = student.placementStatus || 'Registered';
    if (oldStatus === newStatus) return student;

    student.placementStatus = newStatus;
    student.updatedAt = Date.now();
    await student.save();

    // Store transition log in history
    const history = new PlacementHistory({
      student: studentId,
      oldStatus,
      newStatus,
      changedBy,
      remarks: remarks || `Status transitioned from ${oldStatus} to ${newStatus}`
    });
    await history.save();

    // Create system notification for TPO
    const notif = new Notification({
      recipient: 'tpo',
      type: 'status_change',
      studentId,
      studentName: student.name,
      rollNumber: student.studentId,
      message: `Student ${student.name} (${student.studentId || 'N/A'}) placement status updated to "${newStatus}"`,
      changedFields: ['placementStatus'],
      details: [{
        field: 'placementStatus',
        oldValue: oldStatus,
        newValue: newStatus
      }]
    });
    await notif.save();

    return student;
  } catch (error) {
    console.error('Error inside updateStudentPlacementStatus helper:', error);
    return null;
  }
};
