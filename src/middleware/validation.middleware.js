// ============================================================================
// src/middleware/validation.middleware.js - Input Validation Middleware
// ============================================================================
const { body, param, query, validationResult } = require('express-validator');

// ============================================================================
// VALIDATION ERROR HANDLER
// ============================================================================
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    console.log('❌ Validation errors:', formattedErrors);
    
    return res.status(400).json({
      success: false,
      error: {
        message: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        details: formattedErrors
      }
    });
  }
  
  next();
};

// ============================================================================
// VALIDATORS PARA PARÁMETROS DE RUTA
// ============================================================================

// Validador de ID genérico (UUID o slug)
const validateId = (fieldName = 'id') => [
  param(fieldName)
    .notEmpty()
    .withMessage(`${fieldName} es requerido`)
    .isLength({ min: 1, max: 100 })
    .withMessage(`${fieldName} debe tener entre 1 y 100 caracteres`)
    .custom((value) => {
      // Verificar si es UUID válido
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      // Verificar si es slug válido
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      // Verificar si es ID numérico
      const numericRegex = /^\d+$/;
      
      if (!uuidRegex.test(value) && !slugRegex.test(value) && !numericRegex.test(value)) {
        throw new Error(`${fieldName} debe ser un UUID, slug válido o ID numérico`);
      }
      
      return true;
    }),
  handleValidationErrors
];

// Validadores específicos
const validateClinicId = validateId('clinicId');
const validateUserId = validateId('userId');
const validateProfessionalId = validateId('professionalId');
const validateAppointmentId = validateId('appointmentId');
const validateTreatmentId = validateId('treatmentId');

// ============================================================================
// VALIDATORS PARA QUERY PARAMETERS
// ============================================================================
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page debe ser un número entre 1 y 1000')
    .toInt(),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit debe ser un número entre 1 y 100')
    .toInt(),
  
  query('sortBy')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('SortBy debe tener entre 1 y 50 caracteres')
    .matches(/^[a-zA-Z][a-zA-Z0-9_]*$/)
    .withMessage('SortBy debe ser un nombre de campo válido'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('SortOrder debe ser "asc" o "desc"'),
  
  handleValidationErrors
];

const validateSearch = [
  query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search debe tener entre 1 y 100 caracteres')
    .trim()
    .escape(),
  
  query('city')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('City debe tener entre 1 y 100 caracteres')
    .trim(),
  
  query('category')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category debe tener entre 1 y 50 caracteres'),
  
  handleValidationErrors
];

// ============================================================================
// VALIDATORS PARA AUTH
// ============================================================================
const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Email debe ser válido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email no debe exceder 255 caracteres'),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password debe tener entre 6 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password debe contener al menos una minúscula, una mayúscula y un número'),
  
  body('userType')
    .optional()
    .isIn(['patient', 'professional', 'admin'])
    .withMessage('UserType debe ser patient, professional o admin'),
  
  handleValidationErrors
];

const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Email debe ser válido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email no debe exceder 255 caracteres'),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password debe tener entre 6 y 128 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password debe contener al menos una minúscula, una mayúscula y un número'),
  
  body('firstName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Nombre debe tener entre 1 y 100 caracteres')
    .trim()
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Nombre solo puede contener letras y espacios'),
  
  body('lastName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Apellido debe tener entre 1 y 100 caracteres')
    .trim()
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('Apellido solo puede contener letras y espacios'),
  
  body('phone')
    .optional()
    .isMobilePhone('es-ES')
    .withMessage('Teléfono debe ser un número válido español'),
  
  body('clinicId')
    .optional()
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      
      if (!uuidRegex.test(value) && !slugRegex.test(value)) {
        throw new Error('ClinicId debe ser un UUID o slug válido');
      }
      return true;
    }),
  
  handleValidationErrors
];

// ============================================================================
// VALIDATORS PARA APPOINTMENTS
// ============================================================================
const validateCreateAppointment = [
  body('treatmentId')
    .notEmpty()
    .withMessage('TreatmentId es requerido')
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('TreatmentId debe ser un UUID válido');
      }
      return true;
    }),
  
  body('professionalId')
    .notEmpty()
    .withMessage('ProfessionalId es requerido')
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('ProfessionalId debe ser un UUID válido');
      }
      return true;
    }),
  
  body('clinicId')
    .notEmpty()
    .withMessage('ClinicId es requerido')
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      
      if (!uuidRegex.test(value) && !slugRegex.test(value)) {
        throw new Error('ClinicId debe ser un UUID o slug válido');
      }
      return true;
    }),
  
  body('date')
    .isISO8601()
    .withMessage('Date debe ser una fecha ISO válida')
    .custom((value) => {
      const appointmentDate = new Date(value);
      const now = new Date();
      
      if (appointmentDate <= now) {
        throw new Error('La fecha de la cita debe ser futura');
      }
      
      // No permitir citas más allá de 6 meses
      const sixMonthsFromNow = new Date();
      sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
      
      if (appointmentDate > sixMonthsFromNow) {
        throw new Error('No se pueden agendar citas con más de 6 meses de anticipación');
      }
      
      return true;
    }),
  
  body('time')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time debe tener formato HH:MM (24h)'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes no debe exceder 500 caracteres')
    .trim(),
  
  handleValidationErrors
];

const validateUpdateAppointment = [
  body('status')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Status debe ser PENDING, CONFIRMED, COMPLETED, CANCELLED o NO_SHOW'),
  
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date debe ser una fecha ISO válida')
    .custom((value) => {
      if (value) {
        const appointmentDate = new Date(value);
        const now = new Date();
        
        if (appointmentDate <= now) {
          throw new Error('La fecha de la cita debe ser futura');
        }
      }
      return true;
    }),
  
  body('time')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Time debe tener formato HH:MM (24h)'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes no debe exceder 500 caracteres')
    .trim(),
  
  handleValidationErrors
];

// ============================================================================
// VALIDATORS PARA TREATMENTS
// ============================================================================
const validateCreateTreatment = [
  body('name')
    .isLength({ min: 1, max: 200 })
    .withMessage('Name debe tener entre 1 y 200 caracteres')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description no debe exceder 1000 caracteres')
    .trim(),
  
  body('category')
    .isLength({ min: 1, max: 100 })
    .withMessage('Category debe tener entre 1 y 100 caracteres')
    .trim(),
  
  body('price')
    .isFloat({ min: 0, max: 10000 })
    .withMessage('Price debe ser un número entre 0 y 10000')
    .toFloat(),
  
  body('duration')
    .isInt({ min: 15, max: 480 })
    .withMessage('Duration debe ser un número entre 15 y 480 minutos')
    .toInt(),
  
  body('clinicId')
    .notEmpty()
    .withMessage('ClinicId es requerido')
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      
      if (!uuidRegex.test(value) && !slugRegex.test(value)) {
        throw new Error('ClinicId debe ser un UUID o slug válido');
      }
      return true;
    }),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('IsActive debe ser un boolean')
    .toBoolean(),
  
  body('requiresConsultation')
    .optional()
    .isBoolean()
    .withMessage('RequiresConsultation debe ser un boolean')
    .toBoolean(),
  
  body('isVipOnly')
    .optional()
    .isBoolean()
    .withMessage('IsVipOnly debe ser un boolean')
    .toBoolean(),
  
  handleValidationErrors
];

// ============================================================================
// VALIDATORS PARA PROFESSIONALS
// ============================================================================
const validateCreateProfessional = [
  body('email')
    .isEmail()
    .withMessage('Email debe ser válido')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email no debe exceder 255 caracteres'),
  
  body('firstName')
    .isLength({ min: 1, max: 100 })
    .withMessage('FirstName debe tener entre 1 y 100 caracteres')
    .trim()
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('FirstName solo puede contener letras y espacios'),
  
  body('lastName')
    .isLength({ min: 1, max: 100 })
    .withMessage('LastName debe tener entre 1 y 100 caracteres')
    .trim()
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('LastName solo puede contener letras y espacios'),
  
  body('phone')
    .optional()
    .isMobilePhone('es-ES')
    .withMessage('Phone debe ser un número válido español'),
  
  body('licenseNumber')
    .isLength({ min: 1, max: 50 })
    .withMessage('LicenseNumber debe tener entre 1 y 50 caracteres')
    .trim(),
  
  body('specialties')
    .optional()
    .isArray()
    .withMessage('Specialties debe ser un array')
    .custom((value) => {
      if (value && value.length > 10) {
        throw new Error('No se pueden especificar más de 10 especialidades');
      }
      
      if (value) {
        for (const specialty of value) {
          if (typeof specialty !== 'string' || specialty.length > 100) {
            throw new Error('Cada especialidad debe ser un string de máximo 100 caracteres');
          }
        }
      }
      
      return true;
    }),
  
  body('experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Experience debe ser un número entre 0 y 50 años')
    .toInt(),
  
  body('clinicId')
    .notEmpty()
    .withMessage('ClinicId es requerido')
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      
      if (!uuidRegex.test(value) && !slugRegex.test(value)) {
        throw new Error('ClinicId debe ser un UUID o slug válido');
      }
      return true;
    }),
  
  body('role')
    .optional()
    .isIn(['PROFESSIONAL', 'DOCTOR', 'SPECIALIST', 'COORDINATOR'])
    .withMessage('Role debe ser PROFESSIONAL, DOCTOR, SPECIALIST o COORDINATOR'),
  
  handleValidationErrors
];

// ============================================================================
// VALIDATORS PARA USER PROFILE
// ============================================================================
const validateUpdateProfile = [
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('FirstName debe tener entre 1 y 100 caracteres')
    .trim()
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('FirstName solo puede contener letras y espacios'),
  
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('LastName debe tener entre 1 y 100 caracteres')
    .trim()
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('LastName solo puede contener letras y espacios'),
  
  body('phone')
    .optional()
    .isMobilePhone('es-ES')
    .withMessage('Phone debe ser un número válido español'),
  
  body('birthDate')
    .optional()
    .isDate()
    .withMessage('BirthDate debe ser una fecha válida')
    .custom((value) => {
      if (value) {
        const birthDate = new Date(value);
        const now = new Date();
        const age = (now - birthDate) / (365.25 * 24 * 60 * 60 * 1000);
        
        if (age < 16 || age > 120) {
          throw new Error('La edad debe estar entre 16 y 120 años');
        }
      }
      return true;
    }),
  
  body('avatarUrl')
    .optional()
    .isURL()
    .withMessage('AvatarUrl debe ser una URL válida')
    .isLength({ max: 500 })
    .withMessage('AvatarUrl no debe exceder 500 caracteres'),
  
  body('emergencyContact')
    .optional()
    .isObject()
    .withMessage('EmergencyContact debe ser un objeto')
    .custom((value) => {
      if (value) {
        if (value.name && (typeof value.name !== 'string' || value.name.length > 200)) {
          throw new Error('EmergencyContact.name debe ser un string de máximo 200 caracteres');
        }
        if (value.phone && !/^[+]?[\d\s\-()]+$/.test(value.phone)) {
          throw new Error('EmergencyContact.phone debe ser un teléfono válido');
        }
        if (value.relationship && (typeof value.relationship !== 'string' || value.relationship.length > 100)) {
          throw new Error('EmergencyContact.relationship debe ser un string de máximo 100 caracteres');
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

// ============================================================================
// VALIDATORS PARA QUERIES AVANZADAS
// ============================================================================
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('StartDate debe ser una fecha ISO válida')
    .custom((value, { req }) => {
      if (value && req.query.endDate) {
        const start = new Date(value);
        const end = new Date(req.query.endDate);
        
        if (start >= end) {
          throw new Error('StartDate debe ser anterior a EndDate');
        }
      }
      return true;
    }),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('EndDate debe ser una fecha ISO válida')
    .custom((value) => {
      if (value) {
        const endDate = new Date(value);
        const now = new Date();
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        if (endDate > oneYearFromNow) {
          throw new Error('EndDate no puede ser más de un año en el futuro');
        }
      }
      return true;
    }),
  
  handleValidationErrors
];

const validateAppointmentFilters = [
  query('status')
    .optional()
    .isIn(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'])
    .withMessage('Status debe ser PENDING, CONFIRMED, COMPLETED, CANCELLED o NO_SHOW'),
  
  query('professionalId')
    .optional()
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('ProfessionalId debe ser un UUID válido');
      }
      return true;
    }),
  
  query('treatmentId')
    .optional()
    .custom((value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(value)) {
        throw new Error('TreatmentId debe ser un UUID válido');
      }
      return true;
    }),
  
  ...validateDateRange
];

// ============================================================================
// SANITIZACIÓN DE DATOS - ✅ NEW
// ============================================================================
const sanitizeUserInput = (req, res, next) => {
  // Sanitizar strings en el body
  if (req.body && typeof req.body === 'object') {
    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          // Remover caracteres peligrosos
          obj[key] = obj[key]
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframes
            .replace(/javascript:/gi, '') // Remove javascript: URLs
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .trim();
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };
    
    sanitizeObject(req.body);
  }
  
  next();
};

// ============================================================================
// MIDDLEWARE PARA VALIDAR JSON
// ============================================================================
const validateJSON = (req, res, next) => {
  if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
    if (req.body && Object.keys(req.body).length === 0 && req.method !== 'GET') {
      return res.status(400).json({
        success: false,
        error: { message: 'JSON body requerido', code: 'EMPTY_JSON_BODY' }
      });
    }
  }
  next();
};

// ============================================================================
// MIDDLEWARE PARA VALIDAR ARCHIVOS
// ============================================================================
const validateFileUpload = (maxSize = 5 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'image/webp']) => {
  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }
    
    const files = req.files || [req.file];
    
    for (const file of files) {
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          error: { 
            message: `Archivo muy grande. Máximo ${maxSize / (1024 * 1024)}MB permitido`,
            code: 'FILE_TOO_LARGE'
          }
        });
      }
      
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: { 
            message: `Tipo de archivo no permitido. Tipos válidos: ${allowedTypes.join(', ')}`,
            code: 'INVALID_FILE_TYPE'
          }
        });
      }
    }
    
    next();
  };
};

// ============================================================================
// EXPORTACIONES PRINCIPALES
// ============================================================================
module.exports = {
  // Error handler
  handleValidationErrors,
  
  // Parameter validators
  validateId,
  validateClinicId,
  validateUserId,
  validateProfessionalId,
  validateAppointmentId,
  validateTreatmentId,
  
  // Query validators
  validatePagination,
  validateSearch,
  validateDateRange,
  validateAppointmentFilters,
  
  // Auth validators
  validateLogin,
  validateRegister,
  
  // Entity validators
  validateCreateAppointment,
  validateUpdateAppointment,
  validateCreateTreatment,
  validateCreateProfessional,
  validateUpdateProfile,
  
  // Utility middleware
  sanitizeUserInput,
  validateJSON,
  validateFileUpload
};