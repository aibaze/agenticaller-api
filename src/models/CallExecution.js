import mongoose from 'mongoose';
import { CALL_EXECUTION_STATUS } from '../utils/constants.js';

const callExecutionSchema = new mongoose.Schema({
  reminderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CallReminder',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: Object.values(CALL_EXECUTION_STATUS),
    default: CALL_EXECUTION_STATUS.PENDING,
    required: true
  },
  error: {
    type: Boolean,
    default: false
  },
  errorMessage: {
    type: String,
    default: null
  },
  callId: {
    type: String,
    default: null
  },
  reminderData: {
    type: Object,
    default: null,
    description: 'Snapshot of the reminder data at the time of execution'
  },
  callTaken: {
    type: Boolean,
    default: false
  },
  callSummary: {
    type: String,
    default: null
  },
  callDuration: {
    type: Number,
    default: null
  },
  callCost: {
    type: Number,
    default: null
  },
  endedReason: {
    type: String,
    default: null
  },
}, {
  timestamps: true
});

// Add indexes for faster queries
callExecutionSchema.index({ reminderId: 1, date: -1 });
callExecutionSchema.index({ userId: 1, date: -1 });
callExecutionSchema.index({ status: 1 });
callExecutionSchema.index({ date: 1 });

const CallExecution = mongoose.model('CallExecution', callExecutionSchema);

export default CallExecution; 