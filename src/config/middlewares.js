// ============================================================================
// src/config/middlewares.js - CONFIGURACIÓN DE MIDDLEWARES ✅
// ============================================================================
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const express = require('express');

const configureMiddlewares = (app) => {
  // ============================================================================
  // SEGURIDAD ✅
  // ============================================================================
  app.use(helmet());
  
  // ============================================================================
  // CORS ✅
  // ============================================================================
  app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:19006',
      'exp://192.168.1.174:8081'
    ],
    credentials: true
  }));

  // ============================================================================
  // RATE LIMITING ✅
  // ============================================================================
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // límite cada ventana
    message: { 
      success: false, 
      error: { message: 'Demasiadas solicitudes' } 
    }
  });
  app.use('/api/', limiter);

  // ============================================================================
  // PARSING ✅
  // ============================================================================
  // Stripe webhook necesita raw body
  app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
  
  // JSON parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ============================================================================
  // COMPRESIÓN ✅
  // ============================================================================
  app.use(compression());

  // ============================================================================
  // LOGGING ✅
  // ============================================================================
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  console.log('✅ Middlewares configured successfully');
};

module.exports = configureMiddlewares;