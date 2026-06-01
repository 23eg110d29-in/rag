/**
 * Express error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  console.error('[API Error]', {
    method: req.method,
    url: req.originalUrl,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });

  const status = err.status || 500;

  return res.status(status).json({
    success: false,
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'production' ? undefined : {
      status,
      path: req.originalUrl,
      method: req.method
    }
  });
};
