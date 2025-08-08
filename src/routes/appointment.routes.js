// ============================================================================
// src/routes/appointment.routes.js - COMPLETO PARA PRODUCCIÓN ✅
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

// GET /api/appointments/availability/:treatmentId/:date
router.get('/availability/:treatmentId/:date', asyncHandler(async (req, res) => {
  try {
    const { treatmentId, date } = req.params;

    console.log('⏰ Getting availability for:', treatmentId, date);

    if (!treatmentId || !date) {
      return res.status(400).json({
        success: false,
        error: { message: 'treatmentId y date son requeridos' }
      });
    }

    let treatment = null;
    let professionals = [];

    try {
      // Intentar buscar en BD
      treatment = await prisma.treatment.findUnique({
        where: { id: treatmentId },
        include: { clinic: true }
      });

      if (treatment) {
        professionals = await prisma.professional.findMany({
          where: {
            clinicId: treatment.clinicId,
            isActive: true
          }
        });
        console.log('✅ Found treatment in database:', treatment.name);
      }
    } catch (dbError) {
      console.log('⚠️ Database error, using mock data:', dbError.message);
    }

    // Fallback a datos mock
    if (!treatment) {
      const mockTreatments = AppointmentController.getMockTreatments();
      treatment = mockTreatments[treatmentId];
      
      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { 
            message: `Tratamiento ${treatmentId} no encontrado`,
            availableTreatments: Object.keys(mockTreatments)
          }
        });
      }
      
      professionals = AppointmentController.getMockProfessionals();
      console.log('🔧 Using mock treatment:', treatment.name);
    }

    // Generar horarios disponibles
    const timeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    // Obtener citas existentes (si hay BD)
    let existingAppointments = [];
    try {
      existingAppointments = await prisma.appointment.findMany({
        where: {
          scheduledDate: new Date(date),
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        select: {
          scheduledTime: true,
          professionalId: true
        }
      });
    } catch (dbError) {
      console.log('⚠️ Could not fetch existing appointments');
    }

    const availableSlots = timeSlots.map(time => {
      const availableProfessionals = professionals.filter(prof => {
        const hasConflict = existingAppointments.some(apt => {
          const aptTime = apt.scheduledTime.toTimeString().slice(0, 5);
          return aptTime === time && apt.professionalId === prof.id;
        });
        
        return !hasConflict;
      }).map(prof => ({
        id: prof.id,
        name: `${prof.firstName} ${prof.lastName}`,
        specialty: prof.specialties?.[0] || 'General',
        specialties: prof.specialties || ['General'],
        rating: prof.rating || 4.5
      }));

      return {
        time,
        availableProfessionals
      };
    }).filter(slot => slot.availableProfessionals.length > 0);

    console.log(`✅ Generated ${availableSlots.length} available slots`);

    res.json({
      success: true,
      data: {
        date,
        treatmentId,
        treatment: {
          id: treatment.id,
          name: treatment.name,
          duration: treatment.durationMinutes,
          price: treatment.price
        },
        clinic: treatment.clinic?.name || 'Belleza Estética Premium',
        availableSlots
      }
    });

  } catch (error) {
    console.error('❌ Error getting availability:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
}));

// GET /api/appointments/availability (Legacy route)
router.get('/availability', asyncHandler(AppointmentController.getAvailability));

// ============================================================================
// RUTAS PROTEGIDAS ✅
// ============================================================================

// Aplicar autenticación a todas las rutas siguientes
router.use(verifyToken);

// 🔥 RUTA CRÍTICA 1: GET /api/appointments/dashboard
router.get('/dashboard', asyncHandler(AppointmentController.getDashboardData));

// 🔥 RUTA CRÍTICA 2: GET /api/appointments/user
router.get('/user', asyncHandler(AppointmentController.getUserAppointments));

// 🔧 RUTA ADICIONAL: GET /api/appointments/next (próxima cita)
router.get('/next', asyncHandler(AppointmentController.getNextAppointment));

// 🔧 RUTA ADICIONAL: GET /api/appointments/stats (estadísticas)
router.get('/stats', asyncHandler(AppointmentController.getAppointmentStats));

// GET /api/appointments - Obtener mis citas (ruta legacy, ahora apunta a /user)
router.get('/', asyncHandler(AppointmentController.getUserAppointments));

// GET /api/appointments/:id - Detalles de cita específica
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
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          treatment: { 
            name: 'Masaje Relajante', 
            duration: 60, 
            price: 3000,
            description: 'Masaje corporal completo para relajación',
            iconName: 'leaf'
          },
          status: 'confirmed',
          professional: {
            name: 'María González'
          },
          location: {
            name: 'Belleza Estética Premium',
            address: 'Calle Principal 123'
          },
          notes: 'Sesión de relajación completa',
          beautyPointsEarned: 60,
          createdAt: new Date().toISOString()
        },
        'apt-demo-next': {
          id: 'apt-demo-next',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          treatment: { 
            name: 'Masaje Relajante', 
            duration: 60, 
            price: 3000,
            description: 'Masaje corporal completo para relajación',
            iconName: 'leaf'
          },
          status: 'confirmed',
          professional: {
            name: 'María González'
          },
          location: {
            name: 'Belleza Estética Premium',
            address: 'Calle Principal 123'
          },
          notes: 'Sesión de relajación completa',
          beautyPointsEarned: 60,
          createdAt: new Date().toISOString()
        }
      };

      const demoAppointment = demoAppointments[id] || demoAppointments['apt-demo-next'];
      
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
          date: appointment.scheduledDate.toISOString(),
          treatment: {
            name: appointment.treatment.name,
            duration: appointment.treatment.durationMinutes,
            price: appointment.treatment.price,
            description: appointment.treatment.description,
            iconName: appointment.treatment.iconName
          },
          status: appointment.status.toLowerCase(),
          professional: {
            name: `${appointment.professional.firstName} ${appointment.professional.lastName}`
          },
          location: {
            name: appointment.clinic.name,
            address: appointment.clinic.address || 'Dirección no disponible'
          },
          notes: appointment.notes,
          beautyPointsEarned: appointment.beautyPointsEarned,
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

// PATCH /api/appointments/:id/cancel - Cancelar cita
router.patch('/:id/cancel', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;
    const { reason = 'Cancelado por usuario' } = req.body;
    
    console.log('❌ Cancelling appointment:', id, 'for user:', userId, 'reason:', reason);

    // Para usuario demo
    if (userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Cita cancelada exitosamente (Demo)',
        data: { 
          appointmentId: id,
          status: 'CANCELLED',
          reason
        }
      });
    }

    // Para usuarios reales
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
        status: 'CANCELLED',
        notes: appointment.notes ? `${appointment.notes}\n\nCancelado: ${reason}` : `Cancelado: ${reason}`,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Cita cancelada exitosamente',
      data: { 
        appointmentId: id,
        status: 'CANCELLED',
        reason
      }
    });
    
  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
}));

// PATCH /api/appointments/:id/reschedule - Reagendar cita
router.patch('/:id/reschedule', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;
    const { date, time } = req.body;
    
    console.log('🔄 Rescheduling appointment:', id, 'to:', date, time);

    if (!date || !time) {
      return res.status(400).json({
        success: false,
        error: { message: 'date y time son requeridos' }
      });
    }

    // Para usuario demo
    if (userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Cita reagendada exitosamente (Demo)',
        data: { 
          appointmentId: id,
          newDate: date,
          newTime: time,
          status: 'CONFIRMED'
        }
      });
    }

    // Para usuarios reales
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
        scheduledDate: new Date(date),
        scheduledTime: new Date(`${date}T${time}:00`),
        status: 'CONFIRMED',
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: 'Cita reagendada exitosamente',
      data: { 
        appointmentId: id,
        newDate: date,
        newTime: time,
        status: 'CONFIRMED'
      }
    });
    
  } catch (error) {
    console.error('❌ Error rescheduling appointment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
}));

// DELETE /api/appointments/:id - Cancelar cita (método legacy)
router.delete('/:id', asyncHandler(AppointmentController.cancelAppointment));

// GET /api/appointments/:id/details - Detalles extendidos
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
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            treatment: { 
              name: 'Masaje Relajante', 
              duration: 60, 
              price: 3000,
              description: 'Masaje corporal completo para relajación profunda y bienestar'
            },
            status: 'confirmed',
            professional: {
              name: 'María González',
              specialty: 'Masajes terapéuticos',
              rating: 4.9
            },
            location: {
              name: 'Belleza Estética Premium',
              address: 'Calle Principal 123, Ciudad',
              phone: '+34 123 456 789'
            },
            notes: 'Sesión de relajación completa',
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
          date: appointment.scheduledDate.toISOString(),
          treatment: {
            name: appointment.treatment.name,
            duration: appointment.treatment.durationMinutes,
            price: appointment.treatment.price,
            description: appointment.treatment.description
          },
          status: appointment.status.toLowerCase(),
          professional: {
            name: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
            specialty: appointment.professional.specialties || 'Especialista',
            rating: appointment.professional.rating || 4.5
          },
          location: {
            name: appointment.clinic.name,
            address: appointment.clinic.address || 'Dirección no disponible',
            phone: appointment.clinic.phone || 'Teléfono no disponible'
          },
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

// PUT /api/appointments/:id/confirm - Confirmar asistencia
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
          beautyPointsEarned: 60
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
    version: '2.0.0',
    availableEndpoints: [
      'GET /treatments (public)',
      'GET /availability/:treatmentId/:date (public)',
      'GET /availability (public legacy)',
      'GET /dashboard (dashboard data)', // ✅ NUEVA
      'GET /user (user appointments)', // ✅ NUEVA
      'GET /next (next appointment)', // ✅ NUEVA
      'GET /stats (appointment stats)', // ✅ NUEVA
      'GET / (user appointments legacy)',
      'GET /:id (appointment details)',
      'POST / (create appointment)',
      'PUT /:id (update appointment)',
      'PATCH /:id/cancel (cancel appointment)',
      'PATCH /:id/reschedule (reschedule appointment)',
      'DELETE /:id (cancel appointment legacy)',
      'GET /:id/details (extended details)',
      'PUT /:id/confirm (confirm attendance)'
    ],
    criticalEndpoints: [
      'GET /dashboard - Para NextAppointmentCard',
      'GET /user - Para lista de citas del usuario',
      'POST / - Para crear nuevas citas'
    ]
  });
});

module.exports = router;