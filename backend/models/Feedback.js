import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  sessionId: String,
  messageId: String,
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  comment: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Feedback', feedbackSchema);
