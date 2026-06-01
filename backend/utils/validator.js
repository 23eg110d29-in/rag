/**
 * Validates file properties before processing
 * @param {Express.Multer.File} file 
 * @returns {{isValid: boolean, error?: string}}
 */
export const validateFile = (file) => {
  const allowedExtensions = ['pdf', 'docx', 'txt', 'csv', 'json'];
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
    'application/json'
  ];

  if (!file) {
    return { isValid: false, error: 'No file uploaded.' };
  }

  const extension = file.originalname.split('.').pop().toLowerCase();

  // Explicitly reject scripts and executables
  const rejectedExtensions = ['exe', 'bat', 'cmd', 'sh', 'js', 'vbs', 'msi', 'com', 'scr'];
  if (rejectedExtensions.includes(extension)) {
    return { isValid: false, error: 'Executable files are not allowed.' };
  }

  // Reject empty files
  if (file.size === 0) {
    return { isValid: false, error: 'Empty files are not allowed.' };
  }

  const isExtensionAllowed = allowedExtensions.includes(extension);
  const isMimeAllowed = allowedMimeTypes.includes(file.mimetype) || file.mimetype === 'application/octet-stream';

  if (!isExtensionAllowed || !isMimeAllowed) {
    return { 
      isValid: false, 
      error: `Unsupported file type: .${extension}. Please upload a valid PDF, DOCX, TXT, CSV, or JSON file.` 
    };
  }

  return { isValid: true };
};
