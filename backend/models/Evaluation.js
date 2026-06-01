import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema({
  sessionId: String,
  query: String,
  metrics: {
    precision: Number,
    recall: Number,
    hitRate: Number,
    mrr: Number,
    faithfulness: Number,
    contextPrecision: Number,
    relevance: Number,
    hallucinationRate: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Evaluation', evaluationSchema);
