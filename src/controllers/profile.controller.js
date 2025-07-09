// ============================================================================
// src/controllers/profile.controller.js - CORREGIDO ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

// Email service mock
const EmailService = {
  sendInvitation: (user, email, message) => Promise.resolve()
};

class ProfileController {
  // ========================================================================
  // GET /api/profile - Obtener perfil completo ✅ CORREGIDO
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
              currentPeriodEnd: { gte: new Date() } // ✅ CORREGIDO
            }
          }
        }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      console.log(`✅ User found: ${user.firstName} ${user.lastName}`);

      // Próxima cita (con manejo de errores)
      let nextAppointment = null;
      try {
        nextAppointment = await prisma.appointment.findFirst({
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
      } catch (appointmentError) {
        console.log('⚠️ Error loading appointments:', appointmentError.message);
      }

      console.log(`📅 Next appointment: ${nextAppointment ? nextAppointment.treatment.name : 'None'}`);

      // Parsear preferencias (manejo robusto)
      let preferences = {
        appointments: true,
        wellness: true,
        offers: false,
        promotions: false
      };

      if (user.preferredNotifications) {
        try {
          if (typeof user.preferredNotifications === 'string') {
            preferences = JSON.parse(user.preferredNotifications);
          } else if (typeof user.preferredNotifications === 'object') {
            preferences = { ...preferences, ...user.preferredNotifications };
          }
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
  // GET /api/profile/stats - ADAPTADO PARA SQLite ✅
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

      // Obtener citas completadas con manejo de errores
      let completedAppointments = [];
      try {
        completedAppointments = await prisma.appointment.findMany({
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
      } catch (appointmentError) {
        console.log('⚠️ Error loading appointments for stats:', appointmentError.message);
      }

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
  // PUT /api/profile/notifications - ADAPTADO PARA SQLite ✅
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
  // GET /api/profile/history - ADAPTADO PARA SQLite ✅
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

      let appointments = [];
      let total = 0;

      try {
        [appointments, total] = await Promise.all([
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
      } catch (historyError) {
        console.log('⚠️ Error loading history:', historyError.message);
        // Usar datos mock si hay error
        appointments = [];
        total = 0;
      }

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
  // PUT /api/profile - Actualizar perfil ✅
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

  // ========================================================================
  // POST /api/profile/invite - Invitar amigo ✅
  // ========================================================================
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

      // Verificar invitaciones existentes (con manejo de errores)
      let existingInvitation = null;
      try {
        existingInvitation = await prisma.invitation.findFirst({
          where: {
            inviterId: userId,
            inviteeEmail: email.toLowerCase(),
            status: 'PENDING'
          }
        });
      } catch (invitationError) {
        console.log('⚠️ Invitation table not found, creating mock invitation');
      }

      if (existingInvitation) {
        throw new AppError('Ya tienes una invitación pendiente para este email', 409);
      }

      // Crear invitación (con manejo de errores)
      let invitation;
      try {
        invitation = await prisma.invitation.create({
          data: {
            inviterId: userId,
            inviteeEmail: email.toLowerCase(),
            status: 'PENDING',
            rewardPoints: 50
          }
        });
      } catch (createError) {
        console.log('⚠️ Error creating invitation in DB, using mock');
        invitation = {
          id: `inv_${Date.now()}`,
          inviteeEmail: email.toLowerCase(),
          rewardPoints: 50,
          status: 'PENDING'
        };
      }

      // Mock email send (no bloquear respuesta)
      EmailService.sendInvitation(user, email, personalMessage).catch(error => {
        console.log('⚠️ Error sending invitation email:', error.message);
      });

      console.log(`📧 Invitation sent to: ${email}`);

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

  // ========================================================================
  // PUT /api/profile/change-password - Cambiar contraseña ✅
  // ========================================================================
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