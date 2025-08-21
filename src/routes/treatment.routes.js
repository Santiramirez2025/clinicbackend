// ============================================================================
// src/routes/treatment.routes.js - RUTAS DE TRATAMIENTOS CON COMPLIANCE LEGAL ✅
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
    query('riskLevel').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('riskLevel debe ser LOW, MEDIUM o HIGH'),
    query('requiresConsultation').optional().isBoolean().withMessage('requiresConsultation debe ser true o false'),
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
    query('riskLevel').optional().isIn(['LOW', 'MEDIUM', 'HIGH']),
    query('isVipExclusive').optional().isBoolean()
  ],
  validateRequest,
  TreatmentController.getTreatmentsByClinic
);

// ============================================================================
// ✅ NUEVAS RUTAS PARA COMPLIANCE LEGAL - CORREGIDAS
// ============================================================================

// POST /api/treatments/validate-eligibility - Validar elegibilidad para tratamiento
router.post('/validate-eligibility',
  [
    body('treatmentId').notEmpty().withMessage('treatmentId es requerido'),
    body('userAge').optional().isInt({ min: 16, max: 100 }).withMessage('userAge debe estar entre 16 y 100'),
    body('medicalConditions').optional().isArray().withMessage('medicalConditions debe ser un array'),
    // ✅ CORREGIDO: Usar los campos correctos del schema de Prisma
    body('hasAllergies').optional().isBoolean().withMessage('hasAllergies debe ser true o false'),
    body('allergyDetails').optional().isString().withMessage('allergyDetails debe ser un string JSON'),
    body('takingMedications').optional().isBoolean().withMessage('takingMedications debe ser true o false'),
    body('medicationDetails').optional().isString().withMessage('medicationDetails debe ser un string JSON')
  ],
  validateRequest,
  TreatmentController.validateTreatmentEligibility
);

// GET /api/treatments/:id/legal-info - Obtener información legal específica
router.get('/:id/legal-info',
  [
    param('id').notEmpty().withMessage('ID del tratamiento es requerido')
  ],
  validateRequest,
  TreatmentController.getLegalInfo
);

// GET /api/treatments/:id - Obtener detalles de un tratamiento específico
router.get('/:id',
  [
    param('id').notEmpty().withMessage('ID del tratamiento debe ser válido')
  ],
  validateRequest,
  TreatmentController.getTreatmentDetails
);

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación) - FUTURAS
// ============================================================================
// NOTA: Estas rutas se implementarán cuando se necesite gestión avanzada
// de tratamientos por parte de profesionales o administradores

/*
// Middleware de autenticación (para implementar en el futuro)
const authenticateToken = (req, res, next) => {
  // TODO: Implementar validación de JWT
  next();
};

// POST /api/treatments - Crear nuevo tratamiento (solo profesionales)
router.post('/',
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Nombre es requerido'),
    body('description').notEmpty().withMessage('Descripción es requerida'),
    body('category').notEmpty().withMessage('Categoría es requerida'),
    body('durationMinutes').isInt({ min: 15 }).withMessage('Duración debe ser al menos 15 minutos'),
    body('price').isFloat({ min: 0 }).withMessage('Precio debe ser positivo'),
    body('riskLevel').isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Nivel de riesgo inválido')
  ],
  validateRequest,
  TreatmentController.createTreatment
);

// PUT /api/treatments/:id - Actualizar tratamiento
router.put('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('ID debe ser un UUID válido'),
    body('name').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Precio debe ser positivo')
  ],
  validateRequest,
  TreatmentController.updateTreatment
);

// DELETE /api/treatments/:id - Eliminar tratamiento (soft delete)
router.delete('/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('ID debe ser un UUID válido')
  ],
  validateRequest,
  TreatmentController.deleteTreatment
);
*/

// ============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ============================================================================

router.use((error, req, res, next) => {
  console.error('❌ Treatment route error:', error);
  
  // Errores específicos de tratamientos
  if (error.message.includes('Tratamiento no encontrado')) {
    return res.status(404).json({
      success: false,
      error: { 
        message: 'El tratamiento solicitado no existe o no está disponible',
        code: 'TREATMENT_NOT_FOUND'
      }
    });
  }
  
  if (error.message.includes('Contraindicación')) {
    return res.status(400).json({
      success: false,
      error: { 
        message: 'Existen contraindicaciones médicas para este tratamiento',
        code: 'MEDICAL_CONTRAINDICATION'
      }
    });
  }
  
  if (error.message.includes('Edad mínima')) {
    return res.status(400).json({
      success: false,
      error: { 
        message: 'No cumples con la edad mínima requerida para este tratamiento',
        code: 'AGE_RESTRICTION'
      }
    });
  }
  
  if (error.message.includes('Consulta médica requerida')) {
    return res.status(400).json({
      success: false,
      error: { 
        message: 'Este tratamiento requiere consulta médica previa obligatoria',
        code: 'MEDICAL_CONSULTATION_REQUIRED'
      }
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    error: { 
      message: 'Error interno en el sistema de tratamientos',
      code: 'TREATMENT_SYSTEM_ERROR'
    }
  });
});

module.exports = router;