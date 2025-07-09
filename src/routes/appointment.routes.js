// ============================================================================
// src/routes/appointment.routes.js - COMPLETO Y CORREGIDO ✅
// ============================================================================
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const AppointmentController = require('../controllers/appointment.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN SIMPLE ✅
// ============================================================================
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: { message: 'Token requerido' }
    });
  }

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    // Usuario demo
    if (decoded.userId === 'demo-user-123') {
      req.user = { 
        id: decoded.userId, 
        userId: decoded.userId,
        email: 'demo@bellezaestetica.com', 
        isDemo: true,
        vipStatus: true
      };
      return next();
    }
    
    // Usuario real
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return res.status(403).json({ 
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
    }
    
    req.user = { 
      id: user.id,
      userId: user.id, 
      email: user.email, 
      isDemo: false,
      vipStatus: user.vipStatus || false
    };
    next();
  } catch (err) {
    return res.status(403).json({ 
      success: false,
      error: { message: 'Token inválido' }
    });
  }
};

// ============================================================================
// RUTAS PÚBLICAS ✅
// ============================================================================

// GET /api/appointments/treatments
router.get('/treatments', asyncHandler(AppointmentController.getTreatments));

// GET /api/appointments/availability
router.get('/availability', asyncHandler(AppointmentController.getAvailability));

// ============================================================================
// RUTAS PROTEGIDAS ✅
// ============================================================================

// Aplicar autenticación a todas las rutas siguientes
router.use(verifyToken);

// GET /api/appointments - Obtener mis citas
router.get('/', asyncHandler(AppointmentController.getUserAppointments));

// ⭐ NUEVA RUTA: GET /api/appointments/:id - Detalles de cita específica
router.get('/:id', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    console.log('🔍 Getting appointment details:', id, 'for user:', userId);

    // Para usuario demo
    if (userId === 'demo-user-123') {
      const demoAppointments = {
        'cmcvq0ez600010jrfzqmynsy2': {
          id: 'cmcvq0ez600010jrfzqmynsy2',
          treatment: { 
            name: 'Drenaje Relajante', 
            duration: 90, 
            price: 3500,
            description: 'Masaje de drenaje linfático corporal',
            iconName: 'waves'
          },
          date: '2025-07-15',
          time: '14:30',
          professional: 'Carmen Rodríguez',
          clinic: 'Belleza Estética Premium',
          status: 'CONFIRMED',
          beautyPointsEarned: 70,
          notes: 'Solicita música relajante',
          createdAt: new Date().toISOString()
        }
      };

      const demoAppointment = demoAppointments[id];
      
      if (!demoAppointment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Cita no encontrada' }
        });
      }

      return res.json({
        success: true,
        data: { appointment: demoAppointment }
      });
    }

    // Para usuarios reales
    const appointment = await prisma.appointment.findFirst({
      where: {
        id,
        userId
      },
      include: {
        treatment: true,
        professional: true,
        clinic: true
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cita no encontrada' }
      });
    }

    console.log('✅ Appointment found:', appointment.treatment.name);

    res.json({
      success: true,
      data: {
        appointment: {
          id: appointment.id,
          treatment: {
            name: appointment.treatment.name,
            duration: appointment.treatment.durationMinutes,
            price: appointment.treatment.price,
            description: appointment.treatment.description,
            iconName: appointment.treatment.iconName
          },
          date: appointment.scheduledDate.toISOString().split('T')[0],
          time: appointment.scheduledTime.toTimeString().slice(0, 5),
          professional: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
          clinic: appointment.clinic.name,
          status: appointment.status,
          beautyPointsEarned: appointment.beautyPointsEarned,
          notes: appointment.notes,
          createdAt: appointment.createdAt.toISOString()
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting appointment details:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
}));

// POST /api/appointments - Crear nueva cita
router.post('/', asyncHandler(AppointmentController.createAppointment));

// PUT /api/appointments/:id - Actualizar cita
router.put('/:id', asyncHandler(AppointmentController.updateAppointment));

// DELETE /api/appointments/:id - Cancelar cita
router.delete('/:id', asyncHandler(AppointmentController.cancelAppointment));

// ⭐ NUEVA RUTA: GET /api/appointments/:id/details - Detalles extendidos (alternativa)
router.get('/:id/details', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    console.log('📋 Getting extended appointment details:', id);

    if (userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: {
          appointment: {
            id: id,
            treatment: { 
              name: 'Drenaje Relajante', 
              duration: 90, 
              price: 3500,
              description: 'Masaje especializado de drenaje linfático para mejorar la circulación'
            },
            date: '2025-07-15',
            time: '14:30',
            professional: {
              name: 'Carmen Rodríguez',
              specialty: 'Masajes terapéuticos',
              rating: 4.8
            },
            clinic: {
              name: 'Belleza Estética Premium',
              address: 'Av. Corrientes 1234, CABA',
              phone: '+54 11 1234-5678'
            },
            status: 'CONFIRMED',
            notes: 'Solicita música relajante',
            instructions: 'Llegar 10 minutos antes. Evitar comidas pesadas 2 horas antes.',
            cancellationPolicy: 'Cancelación gratuita hasta 24hs antes'
          }
        }
      });
    }

    // Lógica para usuarios reales (extendida)
    const appointment = await prisma.appointment.findFirst({
      where: { id, userId },
      include: {
        treatment: true,
        professional: true,
        clinic: true
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cita no encontrada' }
      });
    }

    res.json({
      success: true,
      data: {
        appointment: {
          id: appointment.id,
          treatment: {
            name: appointment.treatment.name,
            duration: appointment.treatment.durationMinutes,
            price: appointment.treatment.price,
            description: appointment.treatment.description
          },
          date: appointment.scheduledDate.toISOString().split('T')[0],
          time: appointment.scheduledTime.toTimeString().slice(0, 5),
          professional: {
            name: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
            specialty: appointment.professional.specialties || 'Especialista',
            rating: appointment.professional.rating || 4.5
          },
          clinic: {
            name: appointment.clinic.name,
            address: appointment.clinic.address || 'Dirección no disponible',
            phone: appointment.clinic.phone || 'Teléfono no disponible'
          },
          status: appointment.status,
          notes: appointment.notes,
          instructions: 'Llegar 10 minutos antes de la hora programada.',
          cancellationPolicy: 'Cancelación gratuita hasta 24 horas antes.'
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting extended appointment details:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
}));

// ⭐ NUEVA RUTA: PUT /api/appointments/:id/confirm - Confirmar asistencia
router.put('/:id/confirm', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    console.log('✅ Confirming appointment attendance:', id);

    if (userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Asistencia confirmada (Demo)',
        data: { 
          appointmentId: id, 
          status: 'COMPLETED',
          beautyPointsEarned: 70
        }
      });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id, userId }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cita no encontrada' }
      });
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: { 
        status: 'COMPLETED',
        updatedAt: new Date()
      },
      include: { treatment: true }
    });

    // Actualizar beauty points del usuario
    const beautyPoints = Math.floor(updatedAppointment.treatment.price / 50);
    await prisma.user.update({
      where: { id: userId },
      data: {
        beautyPoints: { increment: beautyPoints },
        sessionsCompleted: { increment: 1 }
      }
    });

    res.json({
      success: true,
      message: 'Asistencia confirmada exitosamente',
      data: { 
        appointmentId: id, 
        status: 'COMPLETED',
        beautyPointsEarned: beautyPoints
      }
    });

  } catch (error) {
    console.error('❌ Error confirming appointment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
}));

// ============================================================================
// HEALTH CHECK PARA APPOINTMENTS ✅
// ============================================================================
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Appointment routes working correctly',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /treatments',
      'GET /availability',
      'GET / (user appointments)',
      'GET /:id (appointment details)',
      'POST / (create appointment)',
      'PUT /:id (update appointment)',
      'DELETE /:id (cancel appointment)',
      'GET /:id/details (extended details)',
      'PUT /:id/confirm (confirm attendance)'
    ]
  });
});

module.exports = router;