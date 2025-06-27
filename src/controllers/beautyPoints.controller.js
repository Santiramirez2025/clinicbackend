// ============================================================================
// src/controllers/beautyPoints.controller.js - SISTEMA DE FIDELIZACIÓN
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

class BeautyPointsController {
  
  // Obtener resumen de puntos del usuario
  static async getPointsSummary(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          beautyPoints: true,
          vipStatus: true,
          totalInvestment: true,
          sessionsCompleted: true
        }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      // Calcular multiplicador VIP
      const pointsMultiplier = user.vipStatus ? 2 : 1;

      // Obtener historial reciente de puntos
      const recentHistory = await prisma.appointment.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          beautyPointsEarned: { gt: 0 }
        },
        include: {
          treatment: {
            select: { name: true, iconName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      // Calcular próximo nivel
      const currentLevel = Math.floor(user.beautyPoints / 100);
      const nextLevelPoints = (currentLevel + 1) * 100;
      const pointsToNextLevel = nextLevelPoints - user.beautyPoints;

      // Recompensas disponibles
      const availableRewards = [
        {
          id: 'discount_10',
          name: 'Descuento 10%',
          description: 'Descuento en tu próximo tratamiento',
          pointsCost: 100,
          category: 'discount',
          isAvailable: user.beautyPoints >= 100
        },
        {
          id: 'facial_free',
          name: 'Facial Gratuito',
          description: 'Limpieza facial básica sin costo',
          pointsCost: 250,
          category: 'treatment',
          isAvailable: user.beautyPoints >= 250
        },
        {
          id: 'massage_30min',
          name: 'Masaje 30min',
          description: 'Masaje relajante de 30 minutos',
          pointsCost: 400,
          category: 'treatment',
          isAvailable: user.beautyPoints >= 400
        },
        {
          id: 'premium_treatment',
          name: 'Tratamiento Premium',
          description: 'Acceso a tratamiento exclusivo',
          pointsCost: 500,
          category: 'premium',
          isAvailable: user.beautyPoints >= 500
        }
      ];

      res.status(200).json({
        success: true,
        data: {
          currentPoints: user.beautyPoints,
          vipMultiplier: pointsMultiplier,
          level: {
            current: currentLevel,
            pointsToNext: pointsToNextLevel,
            nextLevelPoints
          },
          history: recentHistory.map(apt => ({
            date: apt.createdAt,
            treatment: apt.treatment.name,
            pointsEarned: apt.beautyPointsEarned,
            iconName: apt.treatment.iconName
          })),
          availableRewards: availableRewards.filter(r => r.isAvailable),
          nextRewards: availableRewards.filter(r => !r.isAvailable).slice(0, 2)
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Canjear recompensa con puntos
  static async redeemReward(req, res, next) {
    try {
      const userId = req.user.id;
      const { rewardId } = req.body;

      if (!rewardId) {
        throw new AppError('ID de recompensa requerido', 400);
      }

      // Definir recompensas disponibles
      const rewards = {
        'discount_10': { name: 'Descuento 10%', cost: 100, type: 'discount', value: 10 },
        'facial_free': { name: 'Facial Gratuito', cost: 250, type: 'treatment', value: 'facial_basic' },
        'massage_30min': { name: 'Masaje 30min', cost: 400, type: 'treatment', value: 'massage_30' },
        'premium_treatment': { name: 'Tratamiento Premium', cost: 500, type: 'premium', value: 'premium_access' }
      };

      const reward = rewards[rewardId];
      if (!reward) {
        throw new AppError('Recompensa no válida', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { beautyPoints: true }
      });

      if (user.beautyPoints < reward.cost) {
        throw new AppError('Puntos insuficientes', 400);
      }

      // Crear transacción para canjear puntos
      const redemption = await prisma.$transaction(async (tx) => {
        // Descontar puntos
        await tx.user.update({
          where: { id: userId },
          data: {
            beautyPoints: { decrement: reward.cost }
          }
        });

        // Crear registro de canje (necesitarías una tabla PointRedemption)
        return {
          id: `redemption_${Date.now()}`,
          rewardId,
          rewardName: reward.name,
          pointsUsed: reward.cost,
          type: reward.type,
          value: reward.value,
          redeemedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
        };
      });

      res.status(200).json({
        success: true,
        message: `¡Recompensa canjeada exitosamente! 🎉`,
        data: {
          redemption,
          remainingPoints: user.beautyPoints - reward.cost
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Otorgar puntos por completar cita
  static async awardPoints(req, res, next) {
    try {
      const userId = req.user.id;
      const { appointmentId } = req.body;

      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          treatment: true,
          user: { select: { vipStatus: true, beautyPoints: true } }
        }
      });

      if (!appointment || appointment.userId !== userId) {
        throw new AppError('Cita no encontrada', 404);
      }

      if (appointment.status !== 'COMPLETED') {
        throw new AppError('La cita debe estar completada para otorgar puntos', 400);
      }

      // Calcular puntos base (1 punto por cada $10)
      const basePoints = Math.floor(appointment.treatment.price / 10);
      const multiplier = appointment.user.vipStatus ? 2 : 1;
      const pointsToAward = basePoints * multiplier;

      // Otorgar puntos
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          beautyPoints: { increment: pointsToAward }
        },
        select: { beautyPoints: true }
      });

      // Actualizar appointment con puntos otorgados
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: { beautyPointsEarned: pointsToAward }
      });

      res.status(200).json({
        success: true,
        message: `¡${pointsToAward} Beauty Points otorgados! 💎`,
        data: {
          pointsAwarded: pointsToAward,
          totalPoints: updatedUser.beautyPoints,
          multiplier,
          basePoints
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener historial completo de puntos
  static async getPointsHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      // Historial de puntos ganados (appointments)
      const earnedHistory = await prisma.appointment.findMany({
        where: {
          userId,
          status: 'COMPLETED',
          beautyPointsEarned: { gt: 0 }
        },
        include: {
          treatment: {
            select: { name: true, iconName: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      // Aquí podrías agregar historial de canjes si tienes una tabla PointRedemption

      const history = earnedHistory.map(apt => ({
        id: apt.id,
        type: 'earned',
        points: apt.beautyPointsEarned,
        description: `Completaste: ${apt.treatment.name}`,
        date: apt.createdAt,
        iconName: apt.treatment.iconName || 'sparkles'
      }));

      const total = await prisma.appointment.count({
        where: {
          userId,
          status: 'COMPLETED',
          beautyPointsEarned: { gt: 0 }
        }
      });

      res.status(200).json({
        success: true,
        data: {
          history,
          pagination: {
            total,
            page: Math.floor(offset / limit) + 1,
            limit: parseInt(limit),
            hasMore: (parseInt(offset) + parseInt(limit)) < total
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener estadísticas de fidelización
  static async getLoyaltyStats(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          beautyPoints: true,
          vipStatus: true,
          totalInvestment: true,
          sessionsCompleted: true,
          createdAt: true
        }
      });

      // Calcular estadísticas
      const totalPointsEarned = await prisma.appointment.aggregate({
        where: { userId, status: 'COMPLETED' },
        _sum: { beautyPointsEarned: true }
      });

      const monthsActive = Math.floor(
        (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      const averageSpentPerSession = user.sessionsCompleted > 0 
        ? user.totalInvestment / user.sessionsCompleted 
        : 0;

      // Ranking de fidelidad
      const loyaltyTier = user.beautyPoints >= 1000 ? 'Diamond' :
                          user.beautyPoints >= 500 ? 'Gold' :
                          user.beautyPoints >= 250 ? 'Silver' : 'Bronze';

      res.status(200).json({
        success: true,
        data: {
          currentPoints: user.beautyPoints,
          totalPointsEarned: totalPointsEarned._sum.beautyPointsEarned || 0,
          loyaltyTier,
          sessionsCompleted: user.sessionsCompleted,
          totalInvestment: user.totalInvestment,
          averageSpentPerSession: Math.round(averageSpentPerSession),
          monthsActive,
          vipStatus: user.vipStatus,
          achievements: {
            firstTreatment: user.sessionsCompleted >= 1,
            loyalClient: user.sessionsCompleted >= 5,
            pointsCollector: user.beautyPoints >= 100,
            bigSpender: user.totalInvestment >= 5000,
            vipMember: user.vipStatus
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = BeautyPointsController;