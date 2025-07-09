// ============================================================================
// src/controllers/rewards.controller.js - CONTROLADOR DE RECOMPENSAS INTELIGENTE
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const SmartRewardsService = require('../services/smartRewards.service');

const prisma = new PrismaClient();

class RewardsController {
  
  // ============================================================================
  // RUTAS PRINCIPALES PARA USUARIOS
  // ============================================================================

  // 📊 Obtener recompensas personalizadas
  static async getPersonalizedRewards(req, res, next) {
    try {
      const userId = req.user.userId;
      const { clinicId } = req.query;
      
      console.log('🎯 Getting personalized rewards for user:', userId);
      
      // Si es usuario demo, usar datos demo
      if (userId === 'demo-user-123') {
        const demoRewards = {
          availableRewards: [
            {
              id: 'discount_10',
              name: 'Descuento 10%',
              description: 'Descuento en tu próximo tratamiento',
              pointsCost: 100,
              category: 'discount',
              isAvailable: true,
              value: 10,
              validityDays: 30,
              score: 85
            }
          ],
          nextRewards: [
            {
              id: 'premium_treatment',
              name: 'Tratamiento Premium',
              description: 'Acceso a tratamiento exclusivo',
              pointsCost: 500,
              category: 'premium',
              isAvailable: false,
              value: 100,
              validityDays: 60,
              score: 95
            }
          ],
          userInsights: {
            loyaltyTier: 'Silver',
            favoriteCategories: [{ category: 'Facial', weight: 3 }],
            visitFrequency: 'high',
            personalizedMessage: 'Como clienta Silver, estas recompensas están seleccionadas para ti 🥈'
          },
          level: { current: 1, pointsToNext: 50, nextLevelPoints: 200 },
          currentPoints: 150,
          vipMultiplier: 2,
          history: [
            {
              date: '2025-06-01',
              treatment: 'Ritual Purificante',
              pointsEarned: 100,
              iconName: 'sparkles'
            }
          ]
        };
        
        return res.json({
          success: true,
          data: demoRewards
        });
      }
      
      // Para usuarios reales, usar el servicio inteligente
      const rewards = await SmartRewardsService.generatePersonalizedRewards(userId, clinicId);
      
      // Registrar evento de visualización para analytics
      await this.trackRewardEvent(userId, 'VIEW', { clinicId });
      
      res.json({
        success: true,
        data: rewards
      });
      
    } catch (error) {
      console.error('❌ Error getting personalized rewards:', error);
      next(error);
    }
  }

  // 💎 Canjear recompensa
  static async redeemReward(req, res, next) {
    try {
      const userId = req.user.userId;
      const { templateId } = req.body;
      
      console.log('💎 Redeeming reward:', { userId, templateId });
      
      // Usuario demo - simular canje
      if (userId === 'demo-user-123') {
        const demoRedemption = {
          id: `redemption_${Date.now()}`,
          code: `RWD${Date.now().toString(36).toUpperCase()}`,
          template: {
            name: 'Descuento 10%',
            type: 'DISCOUNT',
            value: 10
          },
          pointsUsed: 100,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE'
        };
        
        return res.json({
          success: true,
          message: '¡Recompensa canjeada exitosamente! 🎉',
          data: {
            redemption: demoRedemption,
            remainingPoints: 50 // 150 - 100
          }
        });
      }
      
      // Usar el servicio inteligente para canje real
      const redemption = await SmartRewardsService.redeemReward(userId, templateId);
      
      // Obtener puntos restantes
      const user = await prisma.user.findUnique({ 
        where: { id: userId },
        select: { beautyPoints: true }
      });
      
      res.json({
        success: true,
        message: '¡Recompensa canjeada exitosamente! 🎉',
        data: {
          redemption: {
            id: redemption.id,
            code: redemption.code,
            template: redemption.template,
            pointsUsed: redemption.pointsUsed,
            expiresAt: redemption.expiresAt,
            status: redemption.status
          },
          remainingPoints: user.beautyPoints
        }
      });
      
    } catch (error) {
      console.error('❌ Error redeeming reward:', error);
      next(error);
    }
  }

  // 📋 Obtener mis canjes activos
  static async getMyRedemptions(req, res, next) {
    try {
      const userId = req.user.userId;
      const { status = 'ACTIVE', limit = 10 } = req.query;
      
      console.log('📋 Getting redemptions for user:', userId);
      
      // Usuario demo
      if (userId === 'demo-user-123') {
        const demoRedemptions = [
          {
            id: 'redemption_demo_1',
            code: 'RWDDEMO123',
            status: 'ACTIVE',
            template: {
              name: 'Descuento 10%',
              description: 'Descuento en tu próximo tratamiento',
              type: 'DISCOUNT',
              value: 10
            },
            pointsUsed: 100,
            expiresAt: '2025-07-15T00:00:00.000Z',
            createdAt: '2025-06-15T10:00:00.000Z',
            daysUntilExpiry: 30
          }
        ];
        
        return res.json({
          success: true,
          data: {
            redemptions: demoRedemptions,
            total: 1
          }
        });
      }
      
      // Usuarios reales
      const redemptions = await prisma.rewardRedemption.findMany({
        where: {
          userId,
          ...(status !== 'ALL' && { status })
        },
        include: {
          template: {
            select: {
              name: true,
              description: true,
              type: true,
              value: true,
              clinic: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit)
      });
      
      const formattedRedemptions = redemptions.map(redemption => ({
        id: redemption.id,
        code: redemption.code,
        status: redemption.status,
        template: {
          name: redemption.template.name,
          description: redemption.template.description,
          type: redemption.template.type,
          value: redemption.template.value,
          clinicName: redemption.template.clinic?.name
        },
        pointsUsed: redemption.pointsUsed,
        discountAmount: redemption.discountAmount,
        expiresAt: redemption.expiresAt,
        usedAt: redemption.usedAt,
        createdAt: redemption.createdAt,
        daysUntilExpiry: Math.ceil((new Date(redemption.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
      }));
      
      res.json({
        success: true,
        data: {
          redemptions: formattedRedemptions,
          total: redemptions.length
        }
      });
      
    } catch (error) {
      console.error('❌ Error getting redemptions:', error);
      next(error);
    }
  }

  // 🎯 Obtener detalles de template específico
  static async getRewardTemplate(req, res, next) {
    try {
      const { templateId } = req.params;
      const userId = req.user.userId;
      
      console.log('🎯 Getting reward template:', templateId);
      
      const template = await prisma.rewardTemplate.findUnique({
        where: { id: templateId },
        include: {
          clinic: {
            select: { name: true, id: true }
          }
        }
      });
      
      if (!template || !template.isActive) {
        return res.status(404).json({
          success: false,
          error: { message: 'Template de recompensa no encontrado' }
        });
      }
      
      // Verificar si el usuario puede acceder a esta recompensa
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const canAfford = user.beautyPoints >= template.pointsCost;
      
      // Calcular score personalizado
      const userProfile = await SmartRewardsService.analyzeUserProfile({
        ...user,
        appointments: []
      });
      const personalizedScore = SmartRewardsService.calculateTemplateScore(template, userProfile);
      
      // Registrar visualización para analytics
      await this.trackRewardEvent(userId, 'VIEW', { 
        templateId,
        canAfford,
        userPoints: user.beautyPoints
      });
      
      res.json({
        success: true,
        data: {
          template: {
            id: template.id,
            name: template.name,
            description: template.description,
            type: template.type,
            value: template.value,
            pointsCost: template.pointsCost,
            validityDays: template.validityDays,
            clinicName: template.clinic?.name,
            isAffordable: canAfford,
            personalizedScore: Math.round(personalizedScore),
            conditions: template.conditions ? JSON.parse(template.conditions) : null
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error getting reward template:', error);
      next(error);
    }
  }

  // 📈 Historial de puntos
  static async getPointsHistory(req, res, next) {
    try {
      const userId = req.user.userId;
      const { limit = 20, offset = 0, type = 'ALL' } = req.query;
      
      console.log('📈 Getting points history for user:', userId);
      
      // Usuario demo
      if (userId === 'demo-user-123') {
        const demoHistory = [
          {
            id: 'history_1',
            type: 'earned',
            points: 100,
            description: 'Completaste: Ritual Purificante',
            date: '2025-06-01T14:30:00.000Z',
            iconName: 'sparkles',
            source: 'appointment'
          },
          {
            id: 'history_2',
            type: 'earned',
            points: 140,
            description: 'Completaste: Drenaje Relajante',
            date: '2025-05-15T10:00:00.000Z',
            iconName: 'waves',
            source: 'appointment'
          },
          {
            id: 'history_3',
            type: 'redeemed',
            points: -100,
            description: 'Canjeaste: Descuento 10%',
            date: '2025-05-10T16:20:00.000Z',
            iconName: 'gift',
            source: 'redemption'
          }
        ];
        
        return res.json({
          success: true,
          data: {
            history: demoHistory,
            pagination: {
              total: 3,
              page: 1,
              limit: 20,
              hasMore: false
            }
          }
        });
      }
      
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
      
      // Historial de puntos canjeados
      const redeemedHistory = await prisma.rewardRedemption.findMany({
        where: { userId },
        include: {
          template: {
            select: { name: true, type: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      });
      
      // Combinar y formatear historial
      const combinedHistory = [
        ...earnedHistory.map(apt => ({
          id: `earned_${apt.id}`,
          type: 'earned',
          points: apt.beautyPointsEarned,
          description: `Completaste: ${apt.treatment.name}`,
          date: apt.createdAt,
          iconName: apt.treatment.iconName || 'sparkles',
          source: 'appointment'
        })),
        ...redeemedHistory.map(redemption => ({
          id: `redeemed_${redemption.id}`,
          type: 'redeemed',
          points: -redemption.pointsUsed,
          description: `Canjeaste: ${redemption.template.name}`,
          date: redemption.createdAt,
          iconName: 'gift',
          source: 'redemption'
        }))
      ];
      
      // Ordenar por fecha y aplicar filtros
      let filteredHistory = combinedHistory;
      if (type !== 'ALL') {
        filteredHistory = combinedHistory.filter(item => item.type === type.toLowerCase());
      }
      
      filteredHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      const total = filteredHistory.length;
      const paginatedHistory = filteredHistory.slice(0, parseInt(limit));
      
      res.json({
        success: true,
        data: {
          history: paginatedHistory,
          pagination: {
            total,
            page: Math.floor(parseInt(offset) / parseInt(limit)) + 1,
            limit: parseInt(limit),
            hasMore: (parseInt(offset) + parseInt(limit)) < total
          }
        }
      });
      
    } catch (error) {
      console.error('❌ Error getting points history:', error);
      next(error);
    }
  }

  // 🏆 Estadísticas de fidelidad
  static async getLoyaltyStats(req, res, next) {
    try {
      const userId = req.user.userId;
      
      console.log('🏆 Getting loyalty stats for user:', userId);
      
      // Usuario demo
      if (userId === 'demo-user-123') {
        const demoStats = {
          overview: {
            beautyPoints: 150,
            sessionsCompleted: 8,
            totalInvestment: 2400,
            vipStatus: true,
            memberSince: '2024-01-15T10:00:00.000Z',
            monthsActive: 6,
            loyaltyTier: 'Silver',
            loyaltyScore: 185
          },
          achievements: [
            {
              id: 'first-appointment',
              name: 'Primera Cita',
              description: 'Completaste tu primera cita',
              earned: true,
              iconName: 'calendar-check',
              earnedAt: '2024-01-20T10:00:00.000Z'
            },
            {
              id: 'vip-member',
              name: 'Miembro VIP',
              description: 'Te uniste al club exclusivo',
              earned: true,
              iconName: 'crown',
              earnedAt: '2024-03-15T10:00:00.000Z'
            },
            {
              id: 'points-collector',
              name: 'Coleccionista',
              description: 'Acumulaste 100+ Beauty Points',
              earned: true,
              iconName: 'diamond',
              earnedAt: '2024-04-10T10:00:00.000Z'
            }
          ],
          nextMilestones: [
            {
              id: 'loyalty-champion',
              name: 'Campeón de Lealtad',
              description: 'Completa 10 sesiones',
              progress: 80,
              target: 10,
              current: 8
            }
          ]
        };
        
        return res.json({
          success: true,
          data: demoStats
        });
      }
      
      // Estadísticas reales
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          appointments: {
            where: { status: 'COMPLETED' }
          }
        }
      });
      
      const userProfile = SmartRewardsService.analyzeUserProfile(user);
      
      const monthsActive = Math.floor(
        (new Date().getTime() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
      );
      
      // Calcular logros
      const achievements = [
        {
          id: 'first-appointment',
          name: 'Primera Cita',
          description: 'Completaste tu primera cita',
          earned: user.sessionsCompleted >= 1,
          iconName: 'calendar-check'
        },
        {
          id: 'vip-member',
          name: 'Miembro VIP',
          description: 'Te uniste al club exclusivo',
          earned: user.vipStatus,
          iconName: 'crown'
        },
        {
          id: 'points-collector',
          name: 'Coleccionista',
          description: 'Acumulaste 100+ Beauty Points',
          earned: user.beautyPoints >= 100,
          iconName: 'diamond'
        },
        {
          id: 'loyal-client',
          name: 'Cliente Leal',
          description: 'Completaste 5+ sesiones',
          earned: user.sessionsCompleted >= 5,
          iconName: 'heart'
        }
      ];
      
      res.json({
        success: true,
        data: {
          overview: {
            beautyPoints: user.beautyPoints,
            sessionsCompleted: user.sessionsCompleted,
            totalInvestment: user.totalInvestment,
            vipStatus: user.vipStatus,
            memberSince: user.createdAt,
            monthsActive,
            loyaltyTier: SmartRewardsService.getLoyaltyTier(user.beautyPoints),
            loyaltyScore: userProfile.loyaltyScore
          },
          achievements: achievements.filter(a => a.earned),
          nextMilestones: [
            {
              id: 'loyalty-champion',
              name: 'Campeón de Lealtad',
              description: 'Completa 10 sesiones',
              progress: Math.min((user.sessionsCompleted / 10) * 100, 100),
              target: 10,
              current: user.sessionsCompleted
            }
          ]
        }
      });
      
    } catch (error) {
      console.error('❌ Error getting loyalty stats:', error);
      next(error);
    }
  }

  // ✅ Usar/aplicar recompensa
  static async useRedemption(req, res, next) {
    try {
      const { redemptionId } = req.params;
      const userId = req.user.userId;
      const { appointmentId, notes } = req.body;
      
      console.log('✅ Using redemption:', { redemptionId, userId, appointmentId });
      
      const redemption = await prisma.rewardRedemption.findFirst({
        where: {
          id: redemptionId,
          userId,
          status: 'ACTIVE'
        },
        include: {
          template: true
        }
      });
      
      if (!redemption) {
        return res.status(404).json({
          success: false,
          error: { message: 'Canje no encontrado o ya utilizado' }
        });
      }
      
      // Verificar expiración
      if (new Date() > redemption.expiresAt) {
        await prisma.rewardRedemption.update({
          where: { id: redemptionId },
          data: { status: 'EXPIRED' }
        });
        
        return res.status(400).json({
          success: false,
          error: { message: 'El canje ha expirado' }
        });
      }
      
      // Marcar como usado
      await prisma.rewardRedemption.update({
        where: { id: redemptionId },
        data: {
          status: 'USED',
          usedAt: new Date(),
          appointmentId,
          notes
        }
      });
      
      res.json({
        success: true,
        message: 'Recompensa aplicada exitosamente',
        data: {
          redemptionId,
          template: redemption.template.name,
          usedAt: new Date()
        }
      });
      
    } catch (error) {
      console.error('❌ Error using redemption:', error);
      next(error);
    }
  }

  // ❌ Cancelar recompensa
  static async cancelRedemption(req, res, next) {
    try {
      const { redemptionId } = req.params;
      const userId = req.user.userId;
      
      console.log('❌ Canceling redemption:', { redemptionId, userId });
      
      const redemption = await prisma.rewardRedemption.findFirst({
        where: {
          id: redemptionId,
          userId,
          status: 'ACTIVE'
        }
      });
      
      if (!redemption) {
        return res.status(404).json({
          success: false,
          error: { message: 'Canje no encontrado o no puede ser cancelado' }
        });
      }
      
      // Verificar que no haya pasado más de 24 horas
      const hoursSinceRedemption = (new Date() - new Date(redemption.createdAt)) / (1000 * 60 * 60);
      if (hoursSinceRedemption > 24) {
        return res.status(400).json({
          success: false,
          error: { message: 'No se puede cancelar el canje después de 24 horas' }
        });
      }
      
      // Cancelar y devolver puntos
      await prisma.$transaction([
        prisma.rewardRedemption.update({
          where: { id: redemptionId },
          data: { status: 'CANCELLED' }
        }),
        prisma.user.update({
          where: { id: userId },
          data: {
            beautyPoints: { increment: redemption.pointsUsed }
          }
        })
      ]);
      
      res.json({
        success: true,
        message: 'Canje cancelado y puntos devueltos',
        data: {
          pointsReturned: redemption.pointsUsed
        }
      });
      
    } catch (error) {
      console.error('❌ Error canceling redemption:', error);
      next(error);
    }
  }

  // 🔍 Verificar código de canje
  static async verifyRedemptionCode(req, res, next) {
    try {
      const { code } = req.params;
      
      console.log('🔍 Verifying redemption code:', code);
      
      const redemption = await prisma.rewardRedemption.findUnique({
        where: { code },
        include: {
          template: {
            select: {
              name: true,
              type: true,
              value: true,
              clinic: { select: { name: true } }
            }
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });
      
      if (!redemption) {
        return res.status(404).json({
          success: false,
          error: { message: 'Código de canje no válido' }
        });
      }
      
      const isExpired = new Date() > redemption.expiresAt;
      const isUsed = redemption.status === 'USED';
      
      res.json({
        success: true,
        data: {
          code: redemption.code,
          status: redemption.status,
          isValid: redemption.status === 'ACTIVE' && !isExpired,
          isExpired,
          isUsed,
          template: redemption.template,
          user: redemption.user,
          expiresAt: redemption.expiresAt,
          createdAt: redemption.createdAt
        }
      });
      
    } catch (error) {
      console.error('❌ Error verifying redemption code:', error);
      next(error);
    }
  }

  // ============================================================================
  // RUTAS ADMINISTRATIVAS
  // ============================================================================

  // 📊 Analytics de recompensas
  static async getRewardAnalytics(req, res, next) {
    try {
      const { clinicId, dateRange = 30 } = req.query;
      
      console.log('📊 Getting reward analytics for clinic:', clinicId);
      
      const analytics = await SmartRewardsService.getRewardAnalytics(clinicId, parseInt(dateRange));
      
      res.json({
        success: true,
        data: analytics
      });
      
    } catch (error) {
      console.error('❌ Error getting reward analytics:', error);
      next(error);
    }
  }

  // 🎁 Obtener templates de recompensas
  static async getRewardTemplates(req, res, next) {
    try {
      const { clinicId, isActive = true } = req.query;
      
      console.log('🎁 Getting reward templates for clinic:', clinicId);
      
      const templates = await prisma.rewardTemplate.findMany({
        where: {
          ...(clinicId && { clinicId }),
          ...(isActive !== 'all' && { isActive: isActive === 'true' })
        },
        include: {
          clinic: {
            select: { name: true }
          },
          _count: {
            select: { redemptions: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      res.json({
        success: true,
        data: {
          templates: templates.map(template => ({
            ...template,
            totalRedemptions: template._count.redemptions,
            clinicName: template.clinic?.name
          }))
        }
      });
      
    } catch (error) {
      console.error('❌ Error getting reward templates:', error);
      next(error);
    }
  }

  // ➕ Crear template de recompensa
  static async createRewardTemplate(req, res, next) {
    try {
      const {
        clinicId,
        name,
        description,
        type,
        value,
        pointsCost,
        marginCost,
        validityDays = 30,
        maxUsesPerMonth = 10,
        targetUserType = 'ALL',
        minLoyaltyScore = 0,
        conditions,
        seasonality
      } = req.body;
      
      console.log('➕ Creating reward template:', name);
      
      const template = await prisma.rewardTemplate.create({
        data: {
          clinicId,
          name,
          description,
          type,
          value,
          pointsCost,
          marginCost,
          validityDays,
          maxUsesPerMonth,
          targetUserType,
          minLoyaltyScore,
          conditions: conditions ? JSON.stringify(conditions) : null,
          seasonality: seasonality ? JSON.stringify(seasonality) : null
        }
      });
      
      res.status(201).json({
        success: true,
        message: 'Template de recompensa creado exitosamente',
        data: { template }
      });
      
    } catch (error) {
      console.error('❌ Error creating reward template:', error);
      next(error);
    }
  }

  // ✏️ Actualizar template
  static async updateRewardTemplate(req, res, next) {
    try {
      const { templateId } = req.params;
      const updateData = req.body;
      
      console.log('✏️ Updating reward template:', templateId);
      
      // Procesar campos JSON
      if (updateData.conditions) {
        updateData.conditions = JSON.stringify(updateData.conditions);
      }
      if (updateData.seasonality) {
        updateData.seasonality = JSON.stringify(updateData.seasonality);
      }
      
      const template = await prisma.rewardTemplate.update({
        where: { id: templateId },
        data: updateData
      });
      
      res.json({
        success: true,
        message: 'Template actualizado exitosamente',
        data: { template }
      });
      
    } catch (error) {
      console.error('❌ Error updating reward template:', error);
      next(error);
    }
  }

  // 🚫 Desactivar template
  static async deactivateRewardTemplate(req, res, next) {
    try {
      const { templateId } = req.params;
      
      console.log('🚫 Deactivating reward template:', templateId);
      
      await prisma.rewardTemplate.update({
        where: { id: templateId },
        data: { isActive: false }
      });
      
      res.json({
        success: true,
        message: 'Template desactivado exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error deactivating reward template:', error);
      next(error);
    }
  }

  // 📋 Canjes pendientes para clínica
  static async getPendingRedemptions(req, res, next) {
    try {
      const { clinicId, limit = 50 } = req.query;
      
      console.log('📋 Getting pending redemptions for clinic:', clinicId);
      
      const redemptions = await prisma.rewardRedemption.findMany({
        where: {
          status: 'ACTIVE',
          template: { clinicId },
          expiresAt: { gt: new Date() }
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          template: {
            select: {
              name: true,
              type: true,
              value: true,
              description: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit)
      });
      
      res.json({
        success: true,
        data: {
          redemptions: redemptions.map(redemption => ({
            id: redemption.id,
            code: redemption.code,
            user: redemption.user,
            template: redemption.template,
            pointsUsed: redemption.pointsUsed,
            expiresAt: redemption.expiresAt,
            createdAt: redemption.createdAt,
            daysUntilExpiry: Math.ceil((new Date(redemption.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
          })),
          total: redemptions.length
        }
      });
      
    } catch (error) {
      console.error('❌ Error getting pending redemptions:', error);
      next(error);
    }
  }

  // ✅ Marcar canje como usado
  static async markRedemptionAsUsed(req, res, next) {
    try {
      const { redemptionId } = req.params;
      const { appointmentId, notes, staffId } = req.body;
      
      console.log('✅ Marking redemption as used:', redemptionId);
      
      const redemption = await prisma.rewardRedemption.update({
        where: {
          id: redemptionId,
          status: 'ACTIVE'
        },
        data: {
          status: 'USED',
          usedAt: new Date(),
          appointmentId,
          notes: notes || `Aplicado por staff: ${staffId || 'N/A'}`
        }
      });
      
      res.json({
        success: true,
        message: 'Canje marcado como utilizado',
        data: { redemption }
      });
      
    } catch (error) {
      console.error('❌ Error marking redemption as used:', error);
      next(error);
    }
  }

  // ============================================================================
  // RUTAS DE DESARROLLO/TESTING
  // ============================================================================

  // 🧪 Simular canje para testing
  static async simulateRedemption(req, res, next) {
    try {
      const userId = req.user.userId;
      const { templateId, simulate = true } = req.body;
      
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
          success: false,
          error: { message: 'Solo disponible en desarrollo' }
        });
      }
      
      console.log('🧪 Simulating redemption for testing');
      
      // Simular sin afectar la base de datos
      const mockRedemption = {
        id: `test_${Date.now()}`,
        code: `TEST${Date.now().toString(36).toUpperCase()}`,
        pointsUsed: 100,
        status: 'ACTIVE',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      
      res.json({
        success: true,
        message: 'Simulación de canje exitosa (TEST)',
        data: {
          redemption: mockRedemption,
          isSimulation: true
        }
      });
      
    } catch (error) {
      console.error('❌ Error simulating redemption:', error);
      next(error);
    }
  }

  // 📊 Métricas de desarrollo
  static async getDevelopmentMetrics(req, res, next) {
    try {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
          success: false,
          error: { message: 'Solo disponible en desarrollo' }
        });
      }
      
      const metrics = {
        totalTemplates: await prisma.rewardTemplate.count(),
        totalRedemptions: await prisma.rewardRedemption.count(),
        activeRedemptions: await prisma.rewardRedemption.count({
          where: { status: 'ACTIVE' }
        }),
        usedRedemptions: await prisma.rewardRedemption.count({
          where: { status: 'USED' }
        }),
        expiredRedemptions: await prisma.rewardRedemption.count({
          where: { status: 'EXPIRED' }
        })
      };
      
      res.json({
        success: true,
        data: { metrics }
      });
      
    } catch (error) {
      console.error('❌ Error getting development metrics:', error);
      next(error);
    }
  }

  // 🔄 Reset popularidad
  static async resetTemplatePopularity(req, res, next) {
    try {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({
          success: false,
          error: { message: 'Solo disponible en desarrollo' }
        });
      }
      
      await prisma.rewardTemplate.updateMany({
        data: { popularity: 0 }
      });
      
      res.json({
        success: true,
        message: 'Popularidad de templates reiniciada'
      });
      
    } catch (error) {
      console.error('❌ Error resetting template popularity:', error);
      next(error);
    }
  }

  // ============================================================================
  // MÉTODOS AUXILIARES
  // ============================================================================

  // 📊 Registrar evento para analytics
  static async trackRewardEvent(userId, eventType, metadata = {}) {
    try {
      // Solo registrar en usuarios reales, no demo
      if (userId === 'demo-user-123') return;
      
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;
      
      const userProfile = SmartRewardsService.analyzeUserProfile({
        ...user,
        appointments: []
      });
      
      await prisma.rewardAnalytics.create({
        data: {
          templateId: metadata.templateId || null,
          userId,
          eventType,
          userLoyaltyScore: userProfile.loyaltyScore,
          userTier: SmartRewardsService.getLoyaltyTier(user.beautyPoints),
          metadata: JSON.stringify(metadata)
        }
      });
      
    } catch (error) {
      console.error('❌ Error tracking reward event:', error);
      // No propagar el error para no afectar la operación principal
    }
  }
}

module.exports = RewardsController;