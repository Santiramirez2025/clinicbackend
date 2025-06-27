const jwt = require('jsonwebtoken');
const { AppError } = require('./errors');

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
  } catch (error) {
    throw new AppError('Refresh token inválido', 401);
  }
};

module.exports = {
  generateTokens,
  verifyRefreshToken
};