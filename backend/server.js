import express from 'express';
import cors from 'cors';
import FormData from 'form-data';
import fs from 'fs';
import axios from 'axios';
import multer from 'multer';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5002;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5000/api';

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// In-Memory Database (No MongoDB required)
let documentsDB = [];
let chatSessionsDB = {};
let evaluationsDB = [];
let feedbackDB = [];

// --- Document Routes ---
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // Proxy to Python service
    const form = new FormData();
    form.append('file', fs.createReadStream(req.file.path), req.file.originalname);
    
    const pyRes = await axios.post(`${PYTHON_API_URL}/upload`, form, {
      headers: form.getHeaders()
    });

    // Save metadata in memory
    const doc = {
      _id: crypto.randomUUID(),
      filename: pyRes.data.data.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      totalChunks: pyRes.data.data.totalChunks,
      wordCount: pyRes.data.data.wordCount,
      uploadedAt: new Date()
    };
    documentsDB.push(doc);

    // Clean up local file
    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

    res.json(pyRes.data);
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to process document. Is the Python AI service running?' });
  }
});

app.get('/api/documents', async (req, res) => {
  try {
    const pyRes = await axios.get(`${PYTHON_API_URL}/documents`);
    res.json(pyRes.data);
  } catch (error) {
    // Fallback to in-memory if Python service is down
    const sortedDocs = [...documentsDB].sort((a, b) => b.uploadedAt - a.uploadedAt);
    res.json({ success: true, data: sortedDocs });
  }
});

app.delete('/api/documents/:filename', async (req, res) => {
  try {
    const pyRes = await axios.delete(`${PYTHON_API_URL}/documents/${encodeURIComponent(req.params.filename)}`);
    // Also remove from in-memory cache
    documentsDB = documentsDB.filter(d => d.filename !== req.params.filename);
    res.json(pyRes.data);
  } catch (error) {
    // Fallback: only remove from memory
    documentsDB = documentsDB.filter(d => d.filename !== req.params.filename);
    res.json({ success: true });
  }
});


// --- Chat Routes ---
app.post('/api/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    // Save user message
    if (!chatSessionsDB[sessionId]) {
      chatSessionsDB[sessionId] = { sessionId, createdAt: new Date(), updatedAt: new Date(), messages: [] };
    }
    chatSessionsDB[sessionId].messages.push({ role: 'user', content: message, timestamp: new Date() });

    // Proxy to Python service
    const pyRes = await axios.post(`${PYTHON_API_URL}/chat`, {
      sessionId,
      message,
      history: chatSessionsDB[sessionId].messages.slice(-10)
    });

    const { answer, retrievedChunks, adaptive, evaluation } = pyRes.data;

    // Save assistant message
    chatSessionsDB[sessionId].messages.push({
      role: 'assistant',
      content: answer,
      retrievedChunks,
      timestamp: new Date()
    });
    chatSessionsDB[sessionId].updatedAt = new Date();

    // Save Evaluation metrics if returned
    if (evaluation) {
      evaluationsDB.push({
        _id: crypto.randomUUID(),
        sessionId,
        query: message,
        metrics: evaluation,
        timestamp: new Date()
      });
    }

    res.json({ success: true, answer, retrievedChunks, adaptive, evaluation });
  } catch (error) {
    console.error('Chat error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate answer. Is the Python AI service running?' });
  }
});

// --- Memory Routes ---
app.get('/api/memory/sessions', (req, res) => {
  const sessions = Object.values(chatSessionsDB).sort((a, b) => b.updatedAt - a.updatedAt);
  res.json({ data: sessions.map(s => ({ sessionId: s.sessionId, createdAt: s.createdAt, updatedAt: s.updatedAt })) });
});

app.get('/api/memory/:sessionId', (req, res) => {
  const session = chatSessionsDB[req.params.sessionId];
  res.json({ sessionId: req.params.sessionId, messages: session ? session.messages : [] });
});

app.delete('/api/memory/:sessionId', (req, res) => {
  delete chatSessionsDB[req.params.sessionId];
  evaluationsDB = evaluationsDB.filter(e => e.sessionId !== req.params.sessionId);
  res.json({ success: true });
});

// --- Evaluation & Feedback Routes ---
app.get('/api/evaluation/metrics', (req, res) => {
  const sortedEvals = [...evaluationsDB].sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
  res.json({ success: true, data: sortedEvals });
});

app.post('/api/feedback', (req, res) => {
  feedbackDB.push({ ...req.body, timestamp: new Date() });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`[Server] IN-MEMORY Node.js API Gateway running on http://127.0.0.1:${PORT}`);
  console.log(`[Server] MongoDB Dependency Removed. Your data will reset when the server restarts.`);
});
