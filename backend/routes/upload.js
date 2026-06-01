import express from 'express';
import multer from 'multer';
import { extractText } from '../services/extractor.js';
import { splitText } from '../services/chunker.js';
import { getCollection } from '../chroma/client.js';
import { trace } from '../langsmith/tracer.js';
import { validateFile } from '../utils/validator.js';
import { embedDocuments, getEmbeddingProviderName } from '../services/embeddings.js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// Multer memory storage setup
const upload = multer({
  storage: multer.memoryStorage()
});

const buildDocumentListFromCollection = async () => {
  const collection = await getCollection();
  const response = await collection.get({
    include: ['metadatas']
  });

  const documentsByFilename = new Map();
  for (const metadata of response.metadatas || []) {
    if (!metadata?.source) continue;

    const existing = documentsByFilename.get(metadata.source);
    const next = {
      _id: metadata.source,
      filename: metadata.source,
      originalName: metadata.originalName || metadata.source,
      fileType: metadata.fileType || 'application/octet-stream',
      fileSize: Number(metadata.fileSize || 0),
      totalChunks: Number(metadata.totalChunks || 0),
      wordCount: Number(metadata.wordCount || 0),
      uploadedAt: metadata.uploadedAt || metadata.timestamp
    };

    if (!existing || new Date(next.uploadedAt) > new Date(existing.uploadedAt)) {
      documentsByFilename.set(metadata.source, next);
    }
  }

  return Array.from(documentsByFilename.values())
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
};

/**
 * Core upload process logic (wrapped in LangSmith tracing)
 */
const rawProcessUpload = async (file) => {
  const originalName = file.originalname;
  const buffer = file.buffer;
  const mimetype = file.mimetype;
  
  // 1. Text Extraction
  console.log(`Extracting text from ${originalName}...`);
  const text = await extractText(buffer, mimetype, originalName);
  
  if (!text || text.trim().length === 0) {
    throw new Error('Document is empty or text could not be extracted.');
  }
  
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  console.log(`Extracted ${wordCount} words from ${originalName}`);

  // 2. Chunking
  console.log(`Chunking ${originalName}...`);
  const chunks = await splitText(text, originalName);
  console.log(`Generated ${chunks.length} chunks`);

  // 3. ChromaDB collection setup
  const collection = await getCollection();
  
  // Remove existing vectors for this file name to support updating/overwriting
  try {
    await collection.delete({
      where: { source: originalName }
    });
    console.log(`Deleted existing chunks in Chroma for: ${originalName}`);
  } catch (error) {
    console.warn(`No existing chunks to delete for: ${originalName}`, error.message);
  }

  // 4. Generate embeddings
  console.log(`Generating embeddings for ${chunks.length} chunks with ${getEmbeddingProviderName()}...`);
  const chunkTexts = chunks.map(c => c.text);
  const embeddings = await embedDocuments(chunkTexts);

  // 5. Store chunks in ChromaDB
  const ids = chunks.map((_, index) => `${originalName}_chunk_${index}`);
  const uploadedAt = new Date().toISOString();
  const metadatas = chunks.map(c => ({
    source: c.source,
    originalName,
    fileType: mimetype,
    fileSize: file.size,
    totalChunks: chunks.length,
    wordCount,
    uploadedAt,
    index: c.index,
    timestamp: c.timestamp
  }));

  console.log(`Storing chunks in ChromaDB...`);
  await collection.add({
    ids,
    embeddings,
    metadatas,
    documents: chunkTexts
  });

  return {
    documentId: originalName,
    filename: originalName,
    totalChunks: chunks.length,
    wordCount
  };
};

// Wrapped with LangSmith for uploads pipeline tracing
const processUploadTraceable = trace(rawProcessUpload, 'ProcessUploadPipeline');

// Route definition
router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    // Run validation utilities
    const validation = validateFile(req.file);
    if (!validation.isValid) {
      console.warn(`Upload validation failed for ${req.file.originalname}: ${validation.error}`);
      return res.status(400).json({ success: false, error: validation.error });
    }

    const result = await processUploadTraceable(req.file);
    return res.status(200).json({
      success: true,
      message: 'File processed and stored successfully.',
      data: result
    });
  } catch (error) {
    console.error('Upload route error:', error);
    // Format error response matching { success: false, error: "..." }
    return res.status(400).json({ 
      success: false, 
      error: error.message || 'File upload processing failed.' 
    });
  }
});

// GET list of uploaded documents
router.get('/', async (req, res, next) => {
  try {
    const documents = await buildDocumentListFromCollection();
    return res.status(200).json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
});

// DELETE a document and its vectors
router.delete('/:filename', async (req, res, next) => {
  try {
    const { filename } = req.params;

    // Delete from ChromaDB
    const collection = await getCollection();
    await collection.delete({
      where: { source: filename }
    });
    
    return res.status(200).json({ success: true, message: `Successfully deleted document ${filename}` });
  } catch (error) {
    next(error);
  }
});

export default router;
