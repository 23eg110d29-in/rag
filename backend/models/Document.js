import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  fileType: String,
  fileSize: Number,
  totalChunks: Number,
  wordCount: Number,
  uploadedAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.model('Document', documentSchema);
