import express from 'express';
import { deleteChatSession, findChatSession, listChatSessions } from '../services/fileStore.js';

const router = express.Router();

router.get('/sessions', async (req, res, next) => {
  try {
    const sessions = await listChatSessions();
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    next(error);
  }
});

router.get('/:sessionId', async (req, res, next) => {
  try {
    const session = await findChatSession(req.params.sessionId);
    res.status(200).json({
      success: true,
      sessionId: req.params.sessionId,
      messages: session?.messages || []
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/:sessionId', async (req, res, next) => {
  try {
    await deleteChatSession(req.params.sessionId);
    res.status(200).json({
      success: true,
      message: `Successfully cleared chat history for session: ${req.params.sessionId}`,
      sessionId: req.params.sessionId
    });
  } catch (error) {
    next(error);
  }
});

export default router;
