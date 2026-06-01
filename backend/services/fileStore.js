import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(__dirname, '..', 'data');
const documentsPath = path.join(dataDir, 'documents.json');
const historyPath = path.join(dataDir, 'chat-history.json');

const ensureDataDir = async () => {
  await fs.mkdir(dataDir, { recursive: true });
};

const readJson = async (filePath, fallback) => {
  try {
    await ensureDataDir();
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
};

const writeJson = async (filePath, value) => {
  await ensureDataDir();
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
};

export const listDocuments = async () => {
  const documents = await readJson(documentsPath, []);
  return documents.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
};

export const upsertDocument = async (document) => {
  const documents = await readJson(documentsPath, []);
  const now = new Date().toISOString();
  const nextDocument = {
    _id: document._id || crypto.createHash('sha1').update(document.filename).digest('hex'),
    ...document,
    uploadedAt: document.uploadedAt || now
  };

  const existingIndex = documents.findIndex((item) => item.filename === nextDocument.filename);
  if (existingIndex >= 0) {
    documents[existingIndex] = { ...documents[existingIndex], ...nextDocument };
  } else {
    documents.push(nextDocument);
  }

  await writeJson(documentsPath, documents);
  return nextDocument;
};

export const deleteDocument = async (filename) => {
  const documents = await readJson(documentsPath, []);
  await writeJson(documentsPath, documents.filter((item) => item.filename !== filename));
};

export const findChatSession = async (sessionId) => {
  const sessions = await readJson(historyPath, []);
  return sessions.find((session) => session.sessionId === sessionId) || null;
};

export const listChatSessions = async () => {
  const sessions = await readJson(historyPath, []);
  return sessions
    .map(({ sessionId, createdAt, updatedAt }) => ({ sessionId, createdAt, updatedAt }))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
};

export const saveChatSession = async (session) => {
  const sessions = await readJson(historyPath, []);
  const now = new Date().toISOString();
  const nextSession = {
    ...session,
    createdAt: session.createdAt || now,
    updatedAt: now
  };

  const existingIndex = sessions.findIndex((item) => item.sessionId === nextSession.sessionId);
  if (existingIndex >= 0) {
    sessions[existingIndex] = nextSession;
  } else {
    sessions.push(nextSession);
  }

  await writeJson(historyPath, sessions);
  return nextSession;
};

export const deleteChatSession = async (sessionId) => {
  const sessions = await readJson(historyPath, []);
  await writeJson(historyPath, sessions.filter((session) => session.sessionId !== sessionId));
};
