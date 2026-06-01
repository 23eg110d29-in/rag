import express from 'express';
import { generateAnswer } from '../services/qaService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }
    if (!message) {
      return res.status(400).json({ error: 'message content is required.' });
    }

    console.log(`Processing chat query for session ${sessionId}...`);
    const result = await generateAnswer(sessionId, message);
    
    return res.status(200).json({
      answer: result.answer,
      retrievedChunks: result.retrievedChunks
    });
  } catch (error) {
    console.error('Chat route error:', error);
    return res.status(500).json({ error: error.message || 'Chat query failed.' });
  }
});

export default router;
