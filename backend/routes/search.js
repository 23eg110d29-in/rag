import express from 'express';
import { hybridSearch } from '../services/hybridSearch.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { query, limit } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required.' });
    }

    const topK = limit ? parseInt(limit, 10) : 5;
    
    console.log(`Running isolated hybrid search debug for: "${query}" (limit: ${topK})`);
    const results = await hybridSearch(query, topK);
    
    return res.status(200).json({
      query,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Search route error:', error);
    return res.status(500).json({ error: error.message || 'Hybrid search failed.' });
  }
});

export default router;
