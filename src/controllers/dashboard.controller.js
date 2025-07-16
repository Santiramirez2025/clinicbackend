// ============================================================================
// src/controllers/dashboard.controller.js - CON MOCK DATA PARA DEMO ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

class DashboardController {
  // ========================================================================
  // DASHBOARD PRINCIPAL ✅ CON MOCK DATA PARA DEMO
  // ========================================================================
  static async getDashboard(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      console.log('📊 Dashboard request for user:', userId, 'role:', userRole);

      // ✅ MOCK DATA PARA USUARIO DEMO
      if (userRole === 'demo' || userId === 'demo-user-123') {
        console.log('🎭 Returning mock data for demo user');
        
        const mockDashboardData = {
          user: {
            firstName: 'María',
            lastName: 'García',
            vipStatus: true,
            beautyPoints: 620
          },
          // ✅ MOCK PRÓXIMO TURNO PARA DEMO
          nextAppointment: {
            id: 'demo-appointment-123',
            treatment: 'Ritual Purificante Facial',
            date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // En 2 días
            time: '15:30',
            professional: 'Dra. Ana Martínez',
            clinic: 'Belleza Estética Premium',
            status: 'CONFIRMED'
          },
          featuredTreatments: [
            {
              id: 'demo-treatment-1',
              name: 'Ritual Purificante',
              description: 'Limpieza facial profunda con extractos naturales',
              durationMinutes: 60,
              price: 2500,
              category: 'Facial',
              iconName: 'sparkles',
              isVipExclusive: false,
              clinic: 'Belleza Estética Premium'
            },
            {
              id: 'demo-treatment-2', 
              name: 'Drenaje Relajante',
              description: 'Masaje de drenaje linfático corporal',
              durationMinutes: 90,
              price: 3500,
              category: 'Corporal',
              iconName: 'waves',
              isVipExclusive: false,
              clinic: 'Belleza Estética Premium'
            },
            {
              id: 'demo-treatment-3',
              name: 'Hidrafacial Premium VIP',
              description: 'Tratamiento facial exclusivo con tecnología avanzada',
              durationMinutes: 75,
              price: 4500,
              category: 'Facial',
              iconName: 'crown',
              isVipExclusive: true,
              clinic: 'Belleza Estética Premium'
            }
          ],
          wellnessTip: {
            title: 'Hidratación diaria',
            content: 'Recuerda beber al menos 8 vasos de agua al día para mantener tu piel radiante y saludable.',
            category: 'SKINCARE',
            iconName: 'droplets'
          },
          stats: {
            totalSessions: 12,
            beautyPoints: 620,
            totalInvestment: 15750,
            vipStatus: true
          }
        };

        return res.status(200).json({
          success: true,
          data: mockDashboardData
        });
      }

      // ✅ DATOS REALES PARA USUARIOS NORMALES
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          vipSubscriptions: {
            where: {
              status: 'ACTIVE',
              currentPeriodEnd: { gte: new Date() }
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

        console.log('📅 Next appointment found:', !!nextAppointment);
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

        console.log('💆‍♀️ Featured treatments found:', featuredTreatments.length);
      } catch (treatmentError) {
        console.log('⚠️ Error loading treatments:', treatmentError.message);
        // Fallback a tratamientos básicos
        featuredTreatments = [];
      }

      // Tip de bienestar del día (con manejo de errores)
      let todaysTip = null;
      try {
        todaysTip = await prisma.wellnessTip.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'desc' }
        });
      } catch (tipError) {
        console.log('⚠️ WellnessTip table not found, using fallback data');
        todaysTip = {
          title: 'Cuidado diario',
          content: 'Dedica unos minutos cada día al cuidado personal. Tu bienestar es importante.',
          category: 'GENERAL',
          iconName: 'heart'
        };
      }

      // Estadísticas del usuario
      const stats = {
        totalSessions: user.sessionsCompleted || 0,
        beautyPoints: user.beautyPoints || 0,
        totalInvestment: user.totalInvestment || 0,
        vipStatus: user.vipStatus || false
      };

      // ✅ ESTRUCTURA DE RESPUESTA CONSISTENTE
      const dashboardData = {
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          vipStatus: user.vipStatus,
          beautyPoints: user.beautyPoints
        },
        nextAppointment: nextAppointment ? {
          id: nextAppointment.id,
          treatment: nextAppointment.treatment.name,
          date: nextAppointment.scheduledDate.toISOString(),
          time: nextAppointment.scheduledTime,
          professional: `${nextAppointment.professional.firstName} ${nextAppointment.professional.lastName}`,
          clinic: nextAppointment.clinic.name,
          status: nextAppointment.status
        } : null,
        featuredTreatments: featuredTreatments.map(treatment => ({
          id: treatment.id,
          name: treatment.name,
          description: treatment.description,
          durationMinutes: treatment.durationMinutes,
          price: treatment.price,
          category: treatment.category,
          iconName: treatment.iconName,
          isVipExclusive: treatment.isVipExclusive,
          clinic: treatment.clinic?.name || 'Belleza Estética'
        })),
        wellnessTip: todaysTip ? {
          title: todaysTip.title,
          content: todaysTip.content,
          category: todaysTip.category,
          iconName: todaysTip.iconName
        } : null,
        stats
      };

      console.log('✅ Dashboard data prepared for real user');

      res.status(200).json({
        success: true,
        data: dashboardData
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
      const userRole = req.user.role;

      // ✅ MOCK DATA PARA USUARIO DEMO
      if (userRole === 'demo' || userId === 'demo-user-123') {
        console.log('🎭 Returning mock beauty points for demo user');
        
        return res.status(200).json({
          success: true,
          data: {
            currentPoints: 620,
            vipMultiplier: 2,
            history: [
              {
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                treatment: 'Ritual Purificante',
                pointsEarned: 50
              },
              {
                date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
                treatment: 'Drenaje Relajante',
                pointsEarned: 70
              },
              {
                date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
                treatment: 'Hidrafacial Premium',
                pointsEarned: 90
              }
            ],
            availableRewards: [
              { points: 100, reward: 'Descuento 10%' },
              { points: 250, reward: 'Facial gratuito' },
              { points: 500, reward: 'Tratamiento premium' }
            ],
            nextRewards: [
              { points: 750, reward: 'Masaje relajante' },
              { points: 1000, reward: 'Día de spa completo' }
            ]
          }
        });
      }

      // ✅ DATOS REALES PARA USUARIOS NORMALES
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
        pointsHistory = [];
      }

      // Calcular próximas recompensas
      const nextRewards = [
        { points: 100, reward: 'Descuento 10%' },
        { points: 250, reward: 'Facial gratuito' },
        { points: 500, reward: 'Tratamiento premium' },
        { points: 750, reward: 'Masaje relajante' },
        { points: 1000, reward: 'Día de spa completo' }
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