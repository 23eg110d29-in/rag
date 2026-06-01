import express from 'express';
import { generateAnswer } from '../services/qaService.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { sessionId, message, retrievalOptions } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ success: false, error: 'sessionId is required.' });
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'message content is required.' });
    }

    const result = await generateAnswer(sessionId, message.trim(), retrievalOptions || {});

    res.status(200).json({
      success: true,
      answer: result.answer,
      retrievedChunks: result.retrievedChunks,
      retrievalConfig: result.retrievalConfig,
      adaptive: result.adaptive
    });
  } catch (error) {
    next(error);
  }
});

export default router;
