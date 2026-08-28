export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  // If the status code is 200 but there's an error, default to 500
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  res.status(statusCode).json({
    success: false,
    message: err.message,
    // Provide stack trace only in development
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
  });
};
