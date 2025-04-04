import mongoose from 'mongoose';

const callReminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  internalLabel: {
    type: String,
    trim: true
  },
  callPurpose: {
    type: String,
    trim: true
  },
  calleeName: {
    type: String,
    required: true,
    trim: true
  },
  callPurposeSummary: {
    type: String,
    trim: true
  },
  recurrence: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  time: {
    type: Date,
    required: true
  },
  hour: {
    type: String,
    required: true
  },
  minutes: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastExecuted: {
    type: Date,
    default: null
  },
  timesExecuted: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add indexes for faster queries
callReminderSchema.index({ time: 1 });
callReminderSchema.index({ phoneNumber: 1 });
callReminderSchema.index({ hour: 1, minutes: 1 });
callReminderSchema.index({ userId: 1 });

const CallReminder = mongoose.model('CallReminder', callReminderSchema);

export default CallReminder; 