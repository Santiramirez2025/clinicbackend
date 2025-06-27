// ============================================================================
// src/routes/appointment.routes.js - RUTAS DE CITAS (ACTUALIZADO)
// ============================================================================
const express = require('express');
const { body, query } = require('express-validator');
const AppointmentController = require('../controllers/appointment.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// ============================================================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================================================

// GET /api/appointments/treatments - Listar tratamientos disponibles
router.get('/treatments', asyncHandler(async (req, res) => {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    const treatments = await prisma.treatment.findMany({
      where: { isActive: true },
      include: { clinic: true },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: {
        treatments: treatments.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description,
          duration: t.durationMinutes,
          price: t.price,
          category: t.category,
          iconName: t.iconName,
          isVipExclusive: t.isVipExclusive,
          clinic: t.clinic.name
        }))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Error obteniendo tratamientos' }
    });
  } finally {
    await prisma.$disconnect();
  }
}));

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================================================

// Aplicar autenticación a las rutas siguientes
router.use(verifyToken);

// Validaciones
const createAppointmentValidation = [
  body('treatmentId')
    .notEmpty()
    .isUUID()
    .withMessage('ID de tratamiento inválido'),
  body('date')
    .isISO8601()
    .withMessage('Fecha inválida'),
  body('time')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora inválida (formato HH:MM)'),
  body('professionalId')
    .optional()
    .isUUID()
    .withMessage('ID de profesional inválido'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notas no pueden exceder 500 caracteres')
];

const availabilityValidation = [
  query('treatmentId')
    .notEmpty()
    .isUUID()
    .withMessage('ID de tratamiento requerido'),
  query('date')
    .isISO8601()
    .withMessage('Fecha requerida y válida')
];

// Rutas protegidas
router.get('/availability', availabilityValidation, asyncHandler(AppointmentController.getAvailability));
router.get('/', asyncHandler(AppointmentController.getUserAppointments));
router.post('/', createAppointmentValidation, asyncHandler(AppointmentController.createAppointment));
router.put('/:id', asyncHandler(AppointmentController.updateAppointment));
router.delete('/:id', asyncHandler(AppointmentController.cancelAppointment));

module.exports = router;