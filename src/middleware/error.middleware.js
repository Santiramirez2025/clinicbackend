// ============================================================================
// src/middleware/error.middleware.js - MIDDLEWARE DE ERRORES
// ============================================================================
const { AppError } = require('../utils/errors');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log del error
  console.error(`Error ${err.statusCode || 500}: ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Errores de Prisma
  if (err.code === 'P2002') {
    const message = 'Valor duplicado, ya existe un registro con esos datos';
    error = new AppError(message, 400);
  }

  if (err.code === 'P2025') {
    const message = 'Registro no encontrado';
    error = new AppError(message, 404);
  }

  // Errores de validación de Prisma
  if (err.code === 'P2014') {
    const message = 'Los datos proporcionados violan una restricción de relación';
    error = new AppError(message, 400);
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    const message = 'Token inválido';
    error = new AppError(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expirado';
    error = new AppError(message, 401);
  }

  // Error de validación
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new AppError(message, 400);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
      ...(error.details && { details: error.details })
    }
  });
};

const notFound = (req, res, next) => {
  const error = new AppError(`No encontrado - ${req.originalUrl}`, 404);
  next(error);
};

module.exports = { errorHandler, notFound };