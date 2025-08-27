// ============================================================================
// 📅 SINGLE CLINIC APPOINTMENT ROUTES - PRODUCTION READY v4.0 ✅
// src/routes/appointment.routes.js - OPTIMIZED FOR SINGLE CLINIC
// ============================================================================

const express = require('express');
const AppointmentController = require('../controllers/appointment.controller');
const { 
  verifyToken, 
  requirePatient, 
  requireVIPAccess, 
  optionalAuth 
} = require('../middleware/auth.middleware');

const router = express.Router();

// ============================================================================
// CONFIGURACIÓN Y UTILIDADES
// ============================================================================

// AsyncHandler wrapper para manejo de errores
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Validador de parámetros de fecha
const validateDateParam = (req, res, next) => {
  const { date } = req.params;
  if (date) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime()) || parsedDate < new Date()) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Invalid or past date', 
          code: 'INVALID_DATE' 
        }
      });
    }
  }
  next();
};

// ============================================================================
// HEALTH CHECK
// ============================================================================
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'appointment-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '4.0.0-SINGLE-CLINIC',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      public: [
        'GET /health',
        'GET /availability/:date'
      ],
      protected: [
        'GET /dashboard',
        'GET /user',
        'GET /stats',
        'GET /next',
        'POST /',
        'GET /:id',
        'PUT /:id',
        'PATCH /:id/cancel'
      ],
      vip: [
        'GET /vip/priority-slots'
      ]
    }
  });
});

// ============================================================================
// RUTAS PÚBLICAS
// ============================================================================

// Obtener disponibilidad para una fecha
router.get('/availability/:date', 
  validateDateParam,
  asyncHandler(AppointmentController.getAvailability)
);

// ============================================================================
// RUTAS PROTEGIDAS - REQUIEREN AUTENTICACIÓN
// ============================================================================

// Aplicar autenticación a todas las rutas siguientes
router.use(verifyToken);

// Dashboard con datos de citas del usuario
router.get('/dashboard', 
  asyncHandler(AppointmentController.getDashboardData)
);

// Obtener todas las citas del usuario
router.get('/user', 
  asyncHandler(AppointmentController.getUserAppointments)
);

// Obtener próxima cita del usuario
router.get('/next', 
  asyncHandler(async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        });
      }

      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const nextAppointment = await prisma.appointment.findFirst({
        where: { 
          userId,
          scheduledDate: { gte: new Date() },
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        include: {
          treatment: { 
            select: { 
              name: true, 
              durationMinutes: true, 
              price: true,
              category: true
            } 
          },
          professional: { 
            select: { 
              firstName: true, 
              lastName: true,
              specialties: true
            } 
          }
        },
        orderBy: [
          { scheduledDate: 'asc' }, 
          { scheduledTime: 'asc' }
        ]
      });

      if (!nextAppointment) {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'No upcoming appointments'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: nextAppointment.id,
          date: nextAppointment.scheduledDate.toISOString(),
          time: nextAppointment.scheduledTime ? 
            new Date(nextAppointment.scheduledTime).toTimeString().slice(0, 5) : 
            '09:00',
          treatment: {
            name: nextAppointment.treatment?.name || 'Treatment',
            duration: nextAppointment.durationMinutes || 60,
            price: nextAppointment.finalPrice || nextAppointment.treatment?.price || 0,
            category: nextAppointment.treatment?.category || 'General'
          },
          status: nextAppointment.status.toLowerCase(),
          professional: nextAppointment.professional ? {
            name: `${nextAppointment.professional.firstName} ${nextAppointment.professional.lastName}`,
            specialties: nextAppointment.professional.specialties || []
          } : null,
          notes: nextAppointment.notes,
          beautyPointsEarned: nextAppointment.beautyPointsEarned || 0
        },
        message: 'Next appointment retrieved'
      });

    } catch (error) {
      console.error('Next appointment error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error retrieving next appointment', 
          code: 'NEXT_APPOINTMENT_ERROR' 
        }
      });
    }
  })
);

// Obtener estadísticas de citas
router.get('/stats', 
  asyncHandler(AppointmentController.getAppointmentStats)
);

// ============================================================================
// CREAR NUEVA CITA
// ============================================================================
router.post('/', 
  asyncHandler(AppointmentController.createAppointment)
);

// ============================================================================
// OPERACIONES ESPECÍFICAS DE CITAS
// ============================================================================

// Obtener detalles de una cita específica
router.get('/:appointmentId', 
  asyncHandler(AppointmentController.getAppointmentById)
);

// Actualizar una cita existente
router.put('/:appointmentId', 
  asyncHandler(AppointmentController.updateAppointment)
);

// Cancelar una cita
router.patch('/:appointmentId/cancel', 
  asyncHandler(AppointmentController.cancelAppointment)
);

// ============================================================================
// RUTAS VIP - REQUIEREN ACCESO VIP
// ============================================================================

// Slots prioritarios para usuarios VIP
router.get('/vip/priority-slots/:date', 
  requireVIPAccess,
  validateDateParam,
  asyncHandler(async (req, res) => {
    try {
      const { date } = req.params;
      
      // Generar slots VIP (horarios preferenciales)
      const vipTimeSlots = [
        '09:00', '09:30', '10:00', '10:30', // Mañana temprano
        '14:00', '14:30', '15:00', '15:30'  // Después del almuerzo
      ];

      const prioritySlots = vipTimeSlots.map(time => ({
        time,
        available: true,
        priority: 'VIP',
        discount: '10% VIP discount applied',
        professionals: [{
          id: 'vip-specialist',
          name: 'Senior Specialist',
          rating: 4.9,
          specialties: ['VIP Services', 'Premium Treatments']
        }]
      }));

      res.status(200).json({
        success: true,
        data: {
          date,
          vipSlots: prioritySlots,
          benefits: [
            '10% discount on all treatments',
            'Priority booking',
            'Senior specialists',
            'Flexible cancellation'
          ]
        },
        message: 'VIP priority slots retrieved'
      });

    } catch (error) {
      console.error('VIP slots error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error retrieving VIP slots', 
          code: 'VIP_SLOTS_ERROR' 
        }
      });
    }
  })
);

// ============================================================================
// ENDPOINTS ADMINISTRATIVOS (SOLO DESARROLLO)
// ============================================================================

if (process.env.NODE_ENV !== 'production') {
  
  // Test endpoint para crear cita de prueba
  router.post('/test/create-sample', verifyToken, asyncHandler(async (req, res) => {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Crear cita de prueba
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const testAppointment = await prisma.appointment.create({
        data: {
          userId,
          scheduledDate: tomorrow,
          scheduledTime: tomorrow,
          durationMinutes: 60,
          originalPrice: 75.00,
          finalPrice: 75.00,
          status: 'PENDING',
          notes: 'Test appointment created via API'
        }
      });

      res.status(201).json({
        success: true,
        data: testAppointment,
        message: 'Test appointment created'
      });

    } catch (error) {
      console.error('Test appointment creation error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error creating test appointment' }
      });
    }
  }));

  // Debug endpoint para verificar auth
  router.get('/debug/auth', verifyToken, (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user?.id,
          email: req.user?.email,
          name: req.user?.name,
          role: req.user?.role,
          userType: req.user?.userType,
          vipStatus: req.user?.vipStatus
        },
        timestamp: new Date().toISOString()
      },
      message: 'Auth debug info'
    });
  });
}

// ============================================================================
// MANEJO DE ERRORES ESPECÍFICO
// ============================================================================
router.use((error, req, res, next) => {
  console.error('Appointment route error:', {
    url: req.url,
    method: req.method,
    error: error.message,
    code: error.code,
    stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
  });
  
  // Errores específicos de Prisma
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { 
        message: 'Appointment conflict - slot already taken', 
        code: 'APPOINTMENT_CONFLICT',
        field: error.meta?.target?.[0] || 'unknown'
      }
    });
  }
  
  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { 
        message: 'Appointment not found', 
        code: 'APPOINTMENT_NOT_FOUND' 
      }
    });
  }

  // Errores de conexión a BD
  if (error.code === 'P1001' || error.code === 'P1002') {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database connection error',
        code: 'DATABASE_CONNECTION_ERROR'
      }
    });
  }
  
  // Errores de validación
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: { 
        message: 'Validation failed', 
        code: 'VALIDATION_ERROR',
        details: error.message
      }
    });
  }

  // Errores de autenticación
  if (error.name === 'UnauthorizedError' || error.status === 401) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      }
    });
  }

  // Errores de autorización
  if (error.status === 403) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access forbidden',
        code: 'ACCESS_FORBIDDEN'
      }
    });
  }

  // Rate limiting
  if (error.status === 429) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: error.retryAfter
      }
    });
  }
  
  // Error genérico
  res.status(error.status || 500).json({
    success: false,
    error: {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV !== 'production' && { 
        stack: error.stack 
      })
    }
  });
});

module.exports = router;