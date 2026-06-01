import express from 'express';
import { evaluateAdaptiveRag } from '../services/evaluation/evaluationService.js';

const router = express.Router();

router.post('/adaptive-rag', async (req, res, next) => {
  try {
    const { cases } = req.body || {};
    if (!Array.isArray(cases)) {
      return res.status(400).json({ success: false, error: 'cases must be an array.' });
    }

    const report = await evaluateAdaptiveRag(cases);
    return res.status(200).json({ success: true, report });
  } catch (error) {
    return next(error);
  }
});

export default router;
