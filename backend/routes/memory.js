import express from 'express';
import { deleteChatSession, findChatSession, listChatSessions } from '../services/fileStore.js';

const router = express.Router();

// GET all sessions list (useful for session picker)
router.get('/sessions', async (req, res) => {
  try {
    const sessions = await listChatSessions();
    return res.status(200).json({ data: sessions });
  } catch (error) {
    console.error('Fetch sessions error:', error);
    return res.status(500).json({ error: 'Failed to retrieve sessions list.' });
  }
});

// GET conversation history for a specific session
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const history = await findChatSession(sessionId);
    
    return res.status(200).json({
      sessionId,
      messages: history ? history.messages : []
    });
  } catch (error) {
    console.error('Fetch memory error:', error);
    return res.status(500).json({ error: 'Failed to retrieve conversation memory.' });
  }
});

// DELETE history for a session
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await deleteChatSession(sessionId);
    
    return res.status(200).json({
      message: `Successfully cleared chat history for session: ${sessionId}`,
      sessionId
    });
  } catch (error) {
    console.error('Delete memory error:', error);
    return res.status(500).json({ error: 'Failed to clear conversation memory.' });
  }
});

export default router;
