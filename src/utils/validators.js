// ============================================================================
// src/utils/validators.js - VALIDADORES PERSONALIZADOS
// ============================================================================
const { body, param, query } = require('express-validator');

// Validaciones comunes
const emailValidation = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Email inválido');

const passwordValidation = body('password')
  .isLength({ min: 6, max: 100 })
  .withMessage('Contraseña debe tener entre 6 y 100 caracteres')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Contraseña debe contener al menos una minúscula, una mayúscula y un número');

const phoneValidation = body('phone')
  .optional()
  .isMobilePhone('es-AR')
  .withMessage('Número de teléfono inválido');

const uuidValidation = (field) => 
  body(field)
    .isUUID()
    .withMessage(`${field} debe ser un UUID válido`);

const dateValidation = (field) =>
  body(field)
    .isISO8601()
    .withMessage(`${field} debe ser una fecha válida`);

const paginationValidation = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit debe ser un número entre 1 y 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset debe ser un número mayor o igual a 0')
];

module.exports = {
  emailValidation,
  passwordValidation,
  phoneValidation,
  uuidValidation,
  dateValidation,
  paginationValidation
};
