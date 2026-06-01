import express from 'express';
import {
  deleteDocument,
  listDocumentChunks,
  listDocuments,
  uploadDocument as uploadDocumentController
} from '../controllers/documentController.js';
import { handleMulterError, uploadDocument } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', listDocuments);
router.get('/:filename/chunks', listDocumentChunks);
router.delete('/:filename', deleteDocument);

router.post(
  '/',
  uploadDocument.single('file'),
  handleMulterError,
  uploadDocumentController
);

router.post(
  '/upload',
  uploadDocument.single('file'),
  handleMulterError,
  uploadDocumentController
);

export default router;
