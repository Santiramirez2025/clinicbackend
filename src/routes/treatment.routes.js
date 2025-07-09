// ============================================================================
// src/routes/treatment.routes.js - RUTAS DE TRATAMIENTOS
// ============================================================================
const express = require('express');
const { body, query, param } = require('express-validator');
const TreatmentController = require('../controllers/treatment.controller');

// Middleware de validación simple
const validateRequest = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { 
        message: 'Datos de entrada inválidos',
        details: errors.array()
      }
    });
  }
  next();
};

const router = express.Router();

// ============================================================================
// RUTAS PÚBLICAS (no requieren autenticación)
// ============================================================================

// GET /api/treatments - Obtener todos los tratamientos con filtros
router.get('/',
  [
    query('clinicId').optional().isUUID().withMessage('clinicId debe ser un UUID válido'),
    query('category').optional().isString().trim(),
    query('isVipExclusive').optional().isBoolean(),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice debe ser un número positivo'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice debe ser un número positivo'),
    query('search').optional().isLength({ min: 2 }).withMessage('search debe tener al menos 2 caracteres'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit debe estar entre 1 y 50'),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset debe ser mayor o igual a 0')
  ],
  validateRequest,
  TreatmentController.getAllTreatments
);

// GET /api/treatments/featured - Obtener tratamientos destacados para dashboard
router.get('/featured',
  [
    query('clinicId').optional().isUUID().withMessage('clinicId debe ser un UUID válido'),
    query('userId').optional().isString(), // Puede ser UUID o 'demo-user-123'
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('limit debe estar entre 1 y 20')
  ],
  validateRequest,
  TreatmentController.getFeaturedTreatments
);

// GET /api/treatments/categories - Obtener categorías disponibles
router.get('/categories',
  [
    query('clinicId').optional().isUUID().withMessage('clinicId debe ser un UUID válido')
  ],
  validateRequest,
  TreatmentController.getCategories
);

// GET /api/treatments/search - Buscar tratamientos
router.get('/search',
  [
    query('q').notEmpty().isLength({ min: 2 }).withMessage('La búsqueda debe tener al menos 2 caracteres'),
    query('clinicId').optional().isUUID().withMessage('clinicId debe ser un UUID válido'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('limit debe estar entre 1 y 20')
  ],
  validateRequest,
  TreatmentController.searchTreatments
);

// GET /api/treatments/clinic/:clinicId - Obtener tratamientos por clínica
router.get('/clinic/:clinicId',
  [
    param('clinicId').isUUID().withMessage('clinicId debe ser un UUID válido'),
    query('category').optional().isString().trim(),
    query('isVipExclusive').optional().isBoolean()
  ],
  validateRequest,
  TreatmentController.getTreatmentsByClinic
);

// GET /api/treatments/:id - Obtener detalles de un tratamiento específico
router.get('/:id',
  [
    param('id').isUUID().withMessage('ID del tratamiento debe ser un UUID válido')
  ],
  validateRequest,
  TreatmentController.getTreatmentDetails
);

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================================================
// NOTA: Las rutas protegidas se implementarán cuando se necesite autenticación.
// Por ahora, todas las rutas de tratamientos son públicas para facilitar el desarrollo.

module.exports = router;