// ============================================================================
// src/controllers/profile.controller.js - ADAPTADO PARA SQLite
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { AppError } = require('../utils/errors');
const EmailService = require('../services/email.service');

const prisma = new PrismaClient();

class ProfileController {
  // ========================================================================
  // GET /api/profile - Obtener perfil completo
  // ========================================================================
  static async getProfile(req, res, next) {
    try {
      const userId = req.user.id;

      console.log(`📊 Getting profile for user: ${userId}`);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          vipSubscriptions: {
            where: {
              status: 'ACTIVE',
              expiresAt: { gte: new Date() }
            }
          }
        }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      console.log(`✅ User found: ${user.firstName} ${user.lastName}`);

      // Próxima cita
      const nextAppointment = await prisma.appointment.findFirst({
        where: {
          userId,
          scheduledDate: { gte: new Date() },
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        include: {
          treatment: true,
          professional: true,
          clinic: true
        },
        orderBy: [
          { scheduledDate: 'asc' },
          { scheduledTime: 'asc' }
        ]
      });

      console.log(`📅 Next appointment: ${nextAppointment ? nextAppointment.treatment.name : 'None'}`);

      // Parsear preferencias (SQLite almacena como string)
      let preferences = {
        appointments: true,
        wellness: true,
        offers: false,
        promotions: false
      };

      if (user.preferredNotifications) {
        try {
          preferences = JSON.parse(user.preferredNotifications);
        } catch (error) {
          console.warn('Error parsing preferences, using defaults');
        }
      }

      // Formatear respuesta
      const profileData = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          birthDate: user.birthDate,
          skinType: user.skinType,
          memberSince: user.createdAt
        },
        stats: {
          beautyPoints: user.beautyPoints || 0,
          sessionsCompleted: user.sessionsCompleted || 0,
          totalInvestment: parseFloat(user.totalInvestment) || 0,
          vipStatus: user.vipStatus || false
        },
        skinProfile: {
          type: user.skinType || 'No definido',
          currentFocus: ['Hidratación', 'Luminosidad'],
          specialist: 'Dra. Ana Martínez'
        },
        nextAppointment: nextAppointment ? {
          id: nextAppointment.id,
          treatment: nextAppointment.treatment.name,
          date: nextAppointment.scheduledDate,
          time: nextAppointment.scheduledTime,
          professional: `${nextAppointment.professional.firstName} ${nextAppointment.professional.lastName}`,
          clinic: nextAppointment.clinic.name
        } : null,
        preferences
      };

      res.status(200).json({
        success: true,
        data: profileData
      });

    } catch (error) {
      console.error('❌ Error in getProfile:', error);
      next(error);
    }
  }

  // ========================================================================
  // GET /api/profile/stats - ADAPTADO PARA SQLite
  // ========================================================================
  static async getStats(req, res, next) {
    try {
      const userId = req.user.id;

      console.log(`📈 Getting stats for user: ${userId}`);

      // Estadísticas básicas
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          beautyPoints: true,
          sessionsCompleted: true,
          totalInvestment: true,
          vipStatus: true,
          createdAt: true
        }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      // Fecha límite para citas (últimos 12 meses)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // Obtener citas completadas con SQLite-compatible query
      const completedAppointments = await prisma.appointment.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          scheduledDate: {
            gte: oneYearAgo
          }
        },
        include: {
          treatment: {
            select: {
              name: true,
              price: true,
              iconName: true
            }
          }
        },
        orderBy: {
          scheduledDate: 'asc'
        }
      });

      console.log(`📊 Found ${completedAppointments.length} completed appointments`);

      // Agrupar por mes manualmente (SQLite-friendly)
      const monthlyData = {};
      
      completedAppointments.forEach(appointment => {
        const date = new Date(appointment.scheduledDate);
        const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!monthlyData[key]) {
          monthlyData[key] = {
            month: key,
            count: 0,
            spent: 0
          };
        }
        
        monthlyData[key].count++;
        monthlyData[key].spent += parseFloat(appointment.treatment.price || 0);
      });

      // Convertir a array
      const monthlyActivity = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

      // Tratamientos más frecuentes (SQLite-friendly)
      const treatmentCounts = {};
      
      completedAppointments.forEach(appointment => {
        const treatmentName = appointment.treatment.name;
        const iconName = appointment.treatment.iconName || 'spa';
        
        if (!treatmentCounts[treatmentName]) {
          treatmentCounts[treatmentName] = {
            name: treatmentName,
            iconName: iconName,
            count: 0
          };
        }
        treatmentCounts[treatmentName].count++;
      });

      const topTreatments = Object.values(treatmentCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Logros/Achievements
      const achievements = [
        {
          id: 'first-appointment',
          name: 'Primera Cita',
          description: 'Completaste tu primera cita',
          earned: (user.sessionsCompleted || 0) >= 1,
          iconName: 'calendar-check'
        },
        {
          id: 'beauty-enthusiast',
          name: 'Entusiasta de la Belleza',
          description: 'Completaste 10 sesiones',
          earned: (user.sessionsCompleted || 0) >= 10,
          iconName: 'sparkles'
        },
        {
          id: 'vip-member',
          name: 'Miembro VIP',
          description: 'Te uniste al club exclusivo',
          earned: user.vipStatus || false,
          iconName: 'crown'
        },
        {
          id: 'wellness-warrior',
          name: 'Guerrera del Bienestar',
          description: 'Completaste 25 sesiones',
          earned: (user.sessionsCompleted || 0) >= 25,
          iconName: 'star'
        },
        {
          id: 'beauty-queen',
          name: 'Reina de la Belleza',
          description: 'Completaste 50 sesiones',
          earned: (user.sessionsCompleted || 0) >= 50,
          iconName: 'gem'
        }
      ];

      const statsData = {
        overview: {
          beautyPoints: user.beautyPoints || 0,
          sessionsCompleted: user.sessionsCompleted || 0,
          totalInvestment: parseFloat(user.totalInvestment) || 0,
          vipStatus: user.vipStatus || false,
          memberSince: user.createdAt,
          monthsActive: Math.max(1, Math.ceil(
            (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24 * 30)
          ))
        },
        monthlyActivity,
        topTreatments,
        achievements
      };

      console.log(`✅ Stats calculated: ${achievements.filter(a => a.earned).length} achievements earned`);

      res.status(200).json({
        success: true,
        data: statsData
      });

    } catch (error) {
      console.error('❌ Error in getStats:', error);
      next(error);
    }
  }

  // ========================================================================
  // PUT /api/profile/notifications - ADAPTADO PARA SQLite
  // ========================================================================
  static async updateNotificationPreferences(req, res, next) {
    try {
      const userId = req.user.id;
      const { appointments, wellness, offers, promotions } = req.body;

      console.log(`🔔 Updating notification preferences for user: ${userId}`, req.body);

      const preferences = {
        appointments: appointments !== undefined ? appointments : true,
        wellness: wellness !== undefined ? wellness : true,
        offers: offers !== undefined ? offers : false,
        promotions: promotions !== undefined ? promotions : false
      };

      // SQLite: Convertir a string JSON
      const preferencesString = JSON.stringify(preferences);

      await prisma.user.update({
        where: { id: userId },
        data: { preferredNotifications: preferencesString }
      });

      console.log(`✅ Notification preferences updated:`, preferences);

      res.status(200).json({
        success: true,
        message: 'Preferencias actualizadas exitosamente',
        data: { preferences }
      });

    } catch (error) {
      console.error('❌ Error in updateNotificationPreferences:', error);
      next(error);
    }
  }

  // ========================================================================
  // GET /api/profile/history - ADAPTADO PARA SQLite
  // ========================================================================
  static async getHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0, status } = req.query;

      console.log(`📚 Getting history for user: ${userId}`, { limit, offset, status });

      const whereClause = { userId };
      if (status) {
        whereClause.status = status.toUpperCase();
      }

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where: whereClause,
          include: {
            treatment: true,
            professional: true,
            clinic: true
          },
          orderBy: [
            { scheduledDate: 'desc' },
            { scheduledTime: 'desc' }
          ],
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.appointment.count({ where: whereClause })
      ]);

      // Agrupar por año-mes
      const groupedHistory = {};
      
      appointments.forEach(appointment => {
        const date = new Date(appointment.scheduledDate);
        const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (!groupedHistory[key]) {
          groupedHistory[key] = [];
        }
        
        groupedHistory[key].push({
          id: appointment.id,
          treatment: {
            name: appointment.treatment.name,
            duration: appointment.durationMinutes,
            price: parseFloat(appointment.treatment.price || 0),
            iconName: appointment.treatment.iconName
          },
          date: appointment.scheduledDate,
          time: appointment.scheduledTime,
          professional: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
          clinic: appointment.clinic.name,
          status: appointment.status,
          beautyPointsEarned: appointment.beautyPointsEarned || 0,
          notes: appointment.notes
        });
      });

      // Calcular summary
      const completedAppointments = appointments.filter(a => a.status === 'COMPLETED');
      const totalSpent = completedAppointments.reduce((sum, a) => sum + parseFloat(a.treatment.price || 0), 0);

      console.log(`✅ History retrieved: ${appointments.length} appointments, ${completedAppointments.length} completed`);

      res.status(200).json({
        success: true,
        data: {
          history: groupedHistory,
          pagination: {
            total,
            page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
            limit: parseInt(limit),
            hasMore: (parseInt(offset) + parseInt(limit)) < total
          },
          summary: {
            totalAppointments: total,
            completedAppointments: completedAppointments.length,
            totalSpent
          }
        }
      });

    } catch (error) {
      console.error('❌ Error in getHistory:', error);
      next(error);
    }
  }

  // ========================================================================
  // Resto de métodos sin cambios significativos...
  // ========================================================================
  
  static async updateProfile(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos de entrada inválidos', 400, errors.array());
      }

      const userId = req.user.id;
      const { firstName, lastName, phone, birthDate, skinType } = req.body;

      console.log(`📝 Updating profile for user: ${userId}`);

      const updateData = {};
      if (firstName) updateData.firstName = firstName.trim();
      if (lastName) updateData.lastName = lastName.trim();
      if (phone) updateData.phone = phone.trim();
      if (birthDate) updateData.birthDate = new Date(birthDate);
      if (skinType) updateData.skinType = skinType;
      
      updateData.updatedAt = new Date();

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      console.log(`✅ Profile updated successfully`);

      res.status(200).json({
        success: true,
        message: 'Perfil actualizado exitosamente',
        data: {
          user: {
            id: updatedUser.id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            phone: updatedUser.phone,
            birthDate: updatedUser.birthDate,
            skinType: updatedUser.skinType
          }
        }
      });

    } catch (error) {
      console.error('❌ Error in updateProfile:', error);
      next(error);
    }
  }

  static async inviteFriend(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos de entrada inválidos', 400, errors.array());
      }

      const userId = req.user.id;
      const { email, personalMessage } = req.body;

      console.log(`💌 Inviting friend: ${email}`);

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (user.email.toLowerCase() === email.toLowerCase()) {
        throw new AppError('No puedes invitarte a ti misma', 400);
      }

      const existingInvitation = await prisma.invitation.findFirst({
        where: {
          inviterId: userId,
          inviteeEmail: email.toLowerCase(),
          status: 'PENDING'
        }
      });

      if (existingInvitation) {
        throw new AppError('Ya tienes una invitación pendiente para este email', 409);
      }

      const invitation = await prisma.invitation.create({
        data: {
          inviterId: userId,
          inviteeEmail: email.toLowerCase(),
          status: 'PENDING',
          rewardPoints: 50
        }
      });

      // Mock email send (no bloquear respuesta)
      console.log(`📧 Would send invitation email to: ${email}`);

      res.status(201).json({
        success: true,
        message: 'Invitación enviada exitosamente',
        data: {
          invitation: {
            id: invitation.id,
            inviteeEmail: email,
            rewardPoints: invitation.rewardPoints,
            status: invitation.status
          }
        }
      });

    } catch (error) {
      console.error('❌ Error in inviteFriend:', error);
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos de entrada inválidos', 400, errors.array());
      }

      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      console.log(`🔐 Changing password for user: ${userId}`);

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidCurrentPassword) {
        throw new AppError('Contraseña actual incorrecta', 400);
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { 
          passwordHash: newPasswordHash,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Password changed successfully`);

      res.status(200).json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error in changePassword:', error);
      next(error);
    }
  }
}

module.exports = ProfileController;

// ============================================================================
// src/routes/profile.routes.js - ASEGURAR TODAS LAS RUTAS
// ============================================================================

/*
const express = require('express');
const { body } = require('express-validator');
const ProfileController = require('../controllers/profile.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// ⚠️ CRÍTICO: Aplicar auth a todas las rutas
router.use(verifyToken);

// Validaciones
const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }),
  body('phone').optional().isMobilePhone('any'),
  body('birthDate').optional().isISO8601(),
  body('skinType').optional().isString()
];

const inviteFriendValidation = [
  body('email').isEmail().normalizeEmail(),
  body('personalMessage').optional().isLength({ max: 200 })
];

const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6, max: 100 })
];

// ============================================================================
// RUTAS PRINCIPALES - ORDEN IMPORTANTE
// ============================================================================

// GET /api/profile/stats - DEBE IR ANTES QUE /:id
router.get('/stats', asyncHandler(ProfileController.getStats));

// GET /api/profile/history 
router.get('/history', asyncHandler(ProfileController.getHistory));

// GET /api/profile - Perfil base
router.get('/', asyncHandler(ProfileController.getProfile));

// PUT /api/profile - Actualizar perfil
router.put('/', updateProfileValidation, asyncHandler(ProfileController.updateProfile));

// PUT /api/profile/notifications
router.put('/notifications', asyncHandler(ProfileController.updateNotificationPreferences));

// POST /api/profile/invite
router.post('/invite', inviteFriendValidation, asyncHandler(ProfileController.inviteFriend));

// PUT /api/profile/change-password
router.put('/change-password', changePasswordValidation, asyncHandler(ProfileController.changePassword));

module.exports = router;
*/

// ============================================================================
// VERIFICAR EN app.js QUE ESTÉ IMPORTADO
// ============================================================================

/*
// src/app.js
const profileRoutes = require('./routes/profile.routes');

// ASEGURAR QUE ESTA LÍNEA EXISTE:
app.use('/api/profile', profileRoutes);

// Debug temporal - agregar esto para verificar rutas:
if (process.env.NODE_ENV === 'development') {
  console.log('🛣️ Profile routes mounted at /api/profile');
  
  // Test endpoint
  app.get('/api/debug', (req, res) => {
    res.json({
      message: 'Server is running',
      profileRoutes: 'mounted at /api/profile',
      availableEndpoints: [
        'GET /api/profile',
        'GET /api/profile/stats',
        'GET /api/profile/history',
        'PUT /api/profile/notifications'
      ]
    });
  });
}
*/

// ============================================================================
// QUICK TEST COMMANDS
// ============================================================================

/*
# 1. Verificar que el servidor está corriendo
curl http://192.168.1.174:3000/api/debug

# 2. Test profile endpoint (necesita auth token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://192.168.1.174:3000/api/profile

# 3. Test stats endpoint (necesita auth token)  
curl -H "Authorization: Bearer YOUR_TOKEN" http://192.168.1.174:3000/api/profile/stats
*/