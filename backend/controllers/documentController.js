import fs from 'fs/promises';
import path from 'path';
import { uploadsDir } from '../middleware/uploadMiddleware.js';
import { extractText } from '../services/extractor.js';
import { splitText } from '../services/chunker.js';
import { embedDocuments, getEmbeddingProviderName } from '../services/embeddings.js';
import { getCollection } from '../chroma/client.js';

const normalizeText = (text) => String(text || '').replace(/\u0000/g, '').trim();

const toApiDocument = (document) => ({
  _id: document._id || document.filename,
  filename: document.filename,
  originalName: document.originalName || document.filename,
  fileType: document.fileType || document.mimetype || 'application/octet-stream',
  fileSize: document.fileSize || document.size || 0,
  uploadedAt: document.uploadedAt || document.createdAt || new Date().toISOString(),
  wordCount: document.wordCount || 0,
  totalChunks: document.totalChunks || 0
});

const buildDocumentListFromChroma = async () => {
  const collection = await getCollection();
  const response = await collection.get({ include: ['metadatas'] });
  const metadatas = response.metadatas || [];
  const documentsByFilename = new Map();

  for (const metadata of metadatas) {
    if (!metadata?.source) continue;

    const existing = documentsByFilename.get(metadata.source);
    const chunkCount = Math.max(
      Number(existing?.totalChunks || 0),
      Number(metadata.totalChunks || 0),
      Number(metadata.index || 0) + 1
    );
    const next = {
      _id: metadata.source,
      filename: metadata.source,
      originalName: metadata.originalName || metadata.source,
      fileType: metadata.fileType || 'application/octet-stream',
      fileSize: Number(metadata.fileSize || 0),
      totalChunks: chunkCount,
      wordCount: Number(metadata.wordCount || 0),
      uploadedAt: metadata.uploadedAt || metadata.timestamp || new Date().toISOString()
    };

    if (!existing || new Date(next.uploadedAt) >= new Date(existing.uploadedAt)) {
      documentsByFilename.set(metadata.source, next);
    } else {
      existing.totalChunks = chunkCount;
    }
  }

  return Array.from(documentsByFilename.values())
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
};

export const uploadDocument = async (req, res, next) => {
  try {
    console.log('[Documents] Upload request received');

    if (!req.file) {
      throw Object.assign(new Error('No file uploaded. Make sure the multipart field name is "file".'), { status: 400 });
    }

    console.log('[Documents] Uploaded file:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    if (!req.file.size) {
      throw Object.assign(new Error('Empty file uploaded.'), { status: 400 });
    }

    const buffer = await fs.readFile(req.file.path);
    const extractedText = normalizeText(await extractText(buffer, req.file.mimetype, req.file.originalname));
    if (!extractedText) {
      throw Object.assign(new Error('No readable text found in the uploaded document.'), { status: 400 });
    }

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;
    const chunks = await splitText(extractedText, req.file.filename);
    if (chunks.length === 0) {
      throw Object.assign(new Error('No searchable chunks were created from the uploaded document.'), { status: 400 });
    }

    console.log(`[Documents] Generated ${chunks.length} chunks for ${req.file.filename}`);

    const collection = await getCollection();
    try {
      await collection.delete({ where: { source: req.file.filename } });
    } catch (error) {
      console.warn(`[Documents] Existing vector cleanup skipped for ${req.file.filename}: ${error.message}`);
    }

    console.log(`[Documents] Generating embeddings with ${getEmbeddingProviderName()}...`);
    const chunkTexts = chunks.map((chunk) => chunk.text);
    const embeddings = await embedDocuments(chunkTexts);
    const uploadedAt = new Date().toISOString();

    await collection.add({
      ids: chunks.map((_, index) => `${req.file.filename}_chunk_${index}`),
      embeddings,
      metadatas: chunks.map((chunk) => ({
        source: req.file.filename,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        totalChunks: chunks.length,
        wordCount,
        uploadedAt,
        index: chunk.index,
        timestamp: chunk.timestamp
      })),
      documents: chunkTexts
    });

    const storedDocument = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      wordCount,
      totalChunks: chunks.length,
      uploadedAt
    };

    return res.status(200).json({
      success: true,
      message: 'File uploaded, indexed, and stored successfully.',
      filename: req.file.filename,
      extractedText,
      data: {
        ...toApiDocument(storedDocument),
        documentId: req.file.filename
      }
    });
  } catch (error) {
    if (req.file?.path) {
      console.error('[Documents] Processing failed for file:', req.file.path);
    }
    next(error);
  }
};

export const listDocuments = async (req, res, next) => {
  try {
    const documents = await buildDocumentListFromChroma();
    return res.status(200).json({
      success: true,
      data: documents.map(toApiDocument)
    });
  } catch (error) {
    next(error);
  }
};

export const listDocumentChunks = async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      throw Object.assign(new Error('Document filename is required.'), { status: 400 });
    }

    const collection = await getCollection();
    const response = await collection.get({
      where: { source: filename }
    });

    const chunks = (response.ids || []).map((id, index) => ({
      id,
      text: response.documents?.[index] || '',
      source: response.metadatas?.[index]?.source || filename,
      index: response.metadatas?.[index]?.index ?? index,
      metadata: response.metadatas?.[index] || {}
    })).sort((a, b) => Number(a.index) - Number(b.index));

    return res.status(200).json({
      success: true,
      filename,
      totalChunks: chunks.length,
      chunks
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      throw Object.assign(new Error('Document filename is required.'), { status: 400 });
    }

    const filePath = path.join(uploadsDir, filename);
    await fs.unlink(filePath).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });

    const collection = await getCollection();
    await collection.delete({ where: { source: filename } }).catch((error) => {
      console.warn(`[Documents] Could not delete vectors for ${filename}: ${error.message}`);
    });

    return res.status(200).json({
      success: true,
      message: `Deleted document ${filename}`
    });
  } catch (error) {
    next(error);
  }
};
