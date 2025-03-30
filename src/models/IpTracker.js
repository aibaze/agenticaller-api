import mongoose from 'mongoose';

const ipTrackerSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    index: true
  },
  count: {
    type: Number,
    required: true,
    default: 1
  },
  resetTime: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Add index for faster queries
ipTrackerSchema.index({ resetTime: 1 });

const IpTracker = mongoose.model('IpTracker', ipTrackerSchema);

export default IpTracker; 