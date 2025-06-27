const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

class DashboardController {
  // Dashboard principal
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
              expiresAt: { gte: new Date() }
            }
          }
        }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

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

      // Tratamientos destacados
      const featuredTreatments = await prisma.treatment.findMany({
        where: {
          isActive: true,
          OR: [
            { isVipExclusive: false },
            { isVipExclusive: true, AND: { clinic: { id: { not: null } } } }
          ]
        },
        include: {
          clinic: true
        },
        take: 6,
        orderBy: { createdAt: 'desc' }
      });

      // Tip de bienestar del día
      const todaysTip = await prisma.wellnessTip.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      // Estadísticas rápidas
      const stats = {
        totalSessions: user.sessionsCompleted,
        beautyPoints: user.beautyPoints,
        totalInvestment: user.totalInvestment,
        vipStatus: user.vipStatus
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
            clinic: treatment.clinic.name
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
      next(error);
    }
  }

  // Beauty Points detalle
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

      // Historial de puntos (últimas 10 transacciones)
      const pointsHistory = await prisma.appointment.findMany({
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
      next(error);
    }
  }
}

module.exports = DashboardController;