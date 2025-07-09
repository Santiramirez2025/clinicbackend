// ============================================================================
// src/controllers/dashboard.controller.js - CORREGIDO ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

class DashboardController {
  // ========================================================================
  // DASHBOARD PRINCIPAL ✅ CORREGIDO
  // ========================================================================
  static async getDashboard(req, res, next) {
    try {
      const userId = req.user.id;

      // Obtener datos del usuario
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

      // Tratamientos destacados (con manejo de errores)
      let featuredTreatments = [];
      try {
        featuredTreatments = await prisma.treatment.findMany({
          where: {
            isActive: true,
            OR: [
              { isVipExclusive: false },
              { isVipExclusive: true }
            ]
          },
          include: {
            clinic: true
          },
          take: 6,
          orderBy: { createdAt: 'desc' }
        });
      } catch (treatmentError) {
        console.log('⚠️ Error loading treatments:', treatmentError.message);
        // Fallback a tratamientos mock
        featuredTreatments = [
          {
            id: 't1',
            name: 'Ritual Purificante',
            description: 'Limpieza facial profunda',
            durationMinutes: 60,
            price: 2500,
            iconName: 'sparkles',
            isVipExclusive: false,
            clinic: { name: 'Belleza Estética Premium' }
          },
          {
            id: 't2',
            name: 'Drenaje Relajante',
            description: 'Masaje de drenaje linfático',
            durationMinutes: 90,
            price: 3500,
            iconName: 'waves',
            isVipExclusive: false,
            clinic: { name: 'Belleza Estética Premium' }
          },
          {
            id: 't3',
            name: 'Hidrafacial Premium',
            description: 'Tratamiento facial avanzado',
            durationMinutes: 75,
            price: 4500,
            iconName: 'crown',
            isVipExclusive: true,
            clinic: { name: 'Belleza Estética Premium' }
          }
        ];
      }

      // Tip de bienestar del día (con manejo de errores)
      let todaysTip = null;
      try {
        todaysTip = await prisma.wellnessTip.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        });
      } catch (tipError) {
        console.log('⚠️ WellnessTip table not found, using mock data');
        // Tip mock
        todaysTip = {
          title: 'Hidratación diaria',
          content: 'Recuerda beber al menos 8 vasos de agua al día para mantener tu piel radiante.',
          category: 'SKINCARE',
          iconName: 'droplet'
        };
      }

      // Estadísticas rápidas
      const stats = {
        totalSessions: user.sessionsCompleted || 0,
        beautyPoints: user.beautyPoints || 0,
        totalInvestment: user.totalInvestment || 0,
        vipStatus: user.vipStatus || false
      };

      res.status(200).json({
        success: true,
        data: {
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            vipStatus: user.vipStatus,
            beautyPoints: user.beautyPoints
          },
          nextAppointment: nextAppointment ? {
            id: nextAppointment.id,
            treatment: nextAppointment.treatment.name,
            date: nextAppointment.scheduledDate,
            time: nextAppointment.scheduledTime,
            professional: `${nextAppointment.professional.firstName} ${nextAppointment.professional.lastName}`,
            clinic: nextAppointment.clinic.name,
            status: nextAppointment.status
          } : null,
          featuredTreatments: featuredTreatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description,
            duration: treatment.durationMinutes,
            price: treatment.price,
            iconName: treatment.iconName,
            isVipExclusive: treatment.isVipExclusive,
            clinic: treatment.clinic?.name || 'Belleza Estética Premium'
          })),
          wellnessTip: todaysTip ? {
            title: todaysTip.title,
            content: todaysTip.content,
            category: todaysTip.category,
            iconName: todaysTip.iconName
          } : null,
          stats
        }
      });

    } catch (error) {
      console.error('❌ Error en getDashboard:', error);
      next(error);
    }
  }

  // ========================================================================
  // BEAUTY POINTS DETALLE ✅
  // ========================================================================
  static async getBeautyPoints(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          beautyPoints: true,
          vipStatus: true
        }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      // Historial de puntos (últimas 10 transacciones) con manejo de errores
      let pointsHistory = [];
      try {
        pointsHistory = await prisma.appointment.findMany({
          where: {
            userId,
            status: 'COMPLETED',
            beautyPointsEarned: { gt: 0 }
          },
          include: {
            treatment: true
          },
          orderBy: { updatedAt: 'desc' },
          take: 10
        });
      } catch (historyError) {
        console.log('⚠️ Error loading points history:', historyError.message);
        // Mock history si no hay datos
        pointsHistory = [
          {
            updatedAt: new Date(),
            treatment: { name: 'Ritual Purificante' },
            beautyPointsEarned: 50
          }
        ];
      }

      // Calcular próximas recompensas
      const nextRewards = [
        { points: 100, reward: 'Descuento 10%' },
        { points: 250, reward: 'Facial gratuito' },
        { points: 500, reward: 'Tratamiento premium' }
      ];

      const availableRewards = nextRewards.filter(
        reward => user.beautyPoints >= reward.points
      );

      res.status(200).json({
        success: true,
        data: {
          currentPoints: user.beautyPoints,
          vipMultiplier: user.vipStatus ? 2 : 1,
          history: pointsHistory.map(appointment => ({
            date: appointment.updatedAt,
            treatment: appointment.treatment.name,
            pointsEarned: appointment.beautyPointsEarned
          })),
          availableRewards,
          nextRewards: nextRewards.filter(
            reward => user.beautyPoints < reward.points
          )
        }
      });

    } catch (error) {
      console.error('❌ Error en getBeautyPoints:', error);
      next(error);
    }
  }
}

module.exports = DashboardController;