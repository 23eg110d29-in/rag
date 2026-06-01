import express from 'express';
import { getAdaptiveRagConfig } from '../config/adaptiveRag.js';
import { classifyQuery } from '../services/adaptive/queryClassifier.js';
import { decideRetrieval } from '../services/adaptive/retrievalDecisionEngine.js';
import { selectTopK } from '../services/adaptive/dynamicRetrieval.js';
import { rewriteQuery } from '../services/adaptive/queryRewriter.js';

const router = express.Router();

router.get('/config', (req, res) => {
  const config = getAdaptiveRagConfig();
  res.status(200).json({
    success: true,
    config: {
      ...config,
      retrievers: {
        ...config.retrievers,
        databaseApiKey: config.retrievers.databaseApiKey ? 'configured' : '',
        webApiKey: config.retrievers.webApiKey ? 'configured' : ''
      }
    }
  });
});

router.post('/classify', async (req, res, next) => {
  try {
    const { query, retrievalOptions } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, error: 'query is required.' });
    }

    const classification = await classifyQuery(query.trim());
    const decision = decideRetrieval(classification, retrievalOptions || {});
    const retrievalPlan = selectTopK(query.trim(), retrievalOptions || {});
    const rewrittenQuery = await rewriteQuery(query.trim(), classification);

    return res.status(200).json({
      success: true,
      classification,
      decision,
      retrievalPlan,
      rewrittenQuery
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
