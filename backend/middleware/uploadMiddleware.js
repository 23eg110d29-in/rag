import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const uploadsDir = path.resolve(__dirname, '..', 'uploads');

const allowedTypes = new Map([
  ['.pdf', 'application/pdf'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['.txt', 'text/plain'],
  ['.csv', 'text/csv'],
  ['.json', 'application/json']
]);

export const ensureUploadsFolder = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`[Upload] Created uploads folder: ${uploadsDir}`);
  }
};

const sanitizeFileName = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const base = path
    .basename(filename, ext)
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return `${base || 'document'}-${Date.now()}${ext}`;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      ensureUploadsFolder();
      cb(null, uploadsDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, sanitizeFileName(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const expectedMime = allowedTypes.get(ext);
  const acceptedMimeTypes = [
    expectedMime,
    'application/octet-stream',
    'text/plain',
    'application/vnd.ms-excel'
  ].filter(Boolean);

  if (!expectedMime) {
    return cb(Object.assign(new Error('Unsupported file type. Upload PDF, DOCX, TXT, CSV, or JSON files only.'), { status: 400 }));
  }

  if (!acceptedMimeTypes.includes(file.mimetype)) {
    return cb(Object.assign(new Error(`Invalid MIME type "${file.mimetype}" for ${ext} file.`), { status: 400 }));
  }

  cb(null, true);
};

export const uploadDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024)
  }
});

export const handleMulterError = (err, req, res, next) => {
  if (!err) return next();

  console.error('[Upload] Multer error:', err.message);
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? `File is too large. Maximum allowed size is ${Math.round(Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024) / 1024 / 1024)}MB.`
      : err.message;
    return res.status(400).json({
      success: false,
      error: message,
      code: err.code
    });
  }

  return res.status(err.status || 400).json({
    success: false,
    error: err.message || 'File upload failed.'
  });
};
