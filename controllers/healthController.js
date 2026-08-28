import mongoose from 'mongoose';

/**
 * @desc    Check system health
 * @route   GET /api/health
 * @access  Public
 */
export const checkHealth = (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  
  if (!isDbConnected) {
    return res.status(503).json({
      success: false,
      message: 'Backend is running, but database connection is lost',
    });
  }

  res.status(200).json({
    success: true,
    message: 'Backend is running successfully',
    timestamp: new Date().toISOString(),
  });
};
