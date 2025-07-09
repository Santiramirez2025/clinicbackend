// ============================================================================
// src/services/smartRewards.service.js - SISTEMA INTELIGENTE DE RECOMPENSAS
// ============================================================================
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class SmartRewardsService {
  
  // ✅ GENERAR RECOMPENSAS PERSONALIZADAS PARA UN USUARIO
  static async generatePersonalizedRewards(userId, clinicId = null) {
    try {
      console.log('🤖 Generating personalized rewards for user:', userId);
      
      // Obtener datos completos del usuario
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          appointments: {
            include: { 
              treatment: true,
              clinic: true 
            },
            orderBy: { createdAt: 'desc' },
            take: 20 // Últimas 20 citas para análisis
          },
          vipSubscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Analizar perfil del usuario
      const userProfile = this.analyzeUserProfile(user);
      console.log('📊 User profile analyzed:', userProfile);

      // Obtener templates disponibles con scoring
      const templates = await this.getAvailableTemplates(clinicId, userProfile);
      console.log(`🎁 Found ${templates.length} available templates`);

      // Calcular recomendaciones con algoritmo inteligente
      const recommendations = this.calculateRecommendations(templates, userProfile, user.beautyPoints);
      
      // Agregar datos adicionales para el frontend
      const enhancedRecommendations = {
        ...recommendations,
        userInsights: {
          loyaltyTier: this.getLoyaltyTier(user.beautyPoints),
          favoriteCategories: userProfile.favoriteCategories,
          visitFrequency: userProfile.visitFrequency,
          personalizedMessage: this.generatePersonalizedMessage(userProfile)
        },
        level: {
          current: Math.floor(user.beautyPoints / 100),
          pointsToNext: 100 - (user.beautyPoints % 100),
          nextLevelPoints: Math.floor(user.beautyPoints / 100 + 1) * 100
        },
        currentPoints: user.beautyPoints,
        vipMultiplier: user.vipStatus ? 2 : 1
      };

      console.log('✅ Personalized rewards generated successfully');
      return enhancedRecommendations;

    } catch (error) {
      console.error('❌ Error generating personalized rewards:', error);
      throw error;
    }
  }

  // ✅ ANALIZAR PERFIL COMPLETO DEL USUARIO
  static analyzeUserProfile(user) {
    const appointments = user.appointments || [];
    const now = new Date();
    
    // Análisis temporal
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const last3Months = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    
    const recentAppointments = appointments.filter(apt => new Date(apt.createdAt) > lastMonth);
    const quarterAppointments = appointments.filter(apt => new Date(apt.createdAt) > last3Months);

    return {
      // Métricas básicas
      totalSpent: user.totalInvestment,
      sessionCount: user.sessionsCompleted,
      vipStatus: user.vipStatus,
      averageSpending: appointments.length ? user.totalInvestment / appointments.length : 0,
      
      // Análisis de comportamiento
      favoriteCategories: this.getFavoriteCategories(appointments),
      visitFrequency: this.calculateVisitFrequency(appointments),
      loyaltyScore: this.calculateLoyaltyScore(user),
      pointsBalance: user.beautyPoints,
      
      // Patrones temporales
      recentActivity: recentAppointments.length,
      quarterActivity: quarterAppointments.length,
      isNewUser: appointments.length <= 2,
      isRegularUser: quarterAppointments.length >= 4,
      
      // Preferencias de horario (si hay datos)
      preferredTimeSlots: this.analyzeTimePreferences(appointments),
      
      // Score de compromiso
      engagementScore: this.calculateEngagementScore(user, appointments),
      
      // Potencial de gasto
      spendingPotential: this.calculateSpendingPotential(user, appointments)
    };
  }

  // ✅ OBTENER CATEGORÍAS FAVORITAS CON PESO
  static getFavoriteCategories(appointments) {
    const categories = {};
    const recentWeight = 2; // Dar más peso a citas recientes
    const now = new Date();
    
    appointments.forEach(apt => {
      const category = apt.treatment?.category || 'General';
      const daysSince = (now - new Date(apt.createdAt)) / (1000 * 60 * 60 * 24);
      const weight = daysSince <= 30 ? recentWeight : 1;
      
      categories[category] = (categories[category] || 0) + weight;
    });
    
    return Object.entries(categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category, weight]) => ({ category, weight }));
  }

  // ✅ CALCULAR FRECUENCIA DE VISITAS CON CATEGORÍAS
  static calculateVisitFrequency(appointments) {
    if (appointments.length === 0) return 'new';
    if (appointments.length === 1) return 'first_time';
    
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const recentAppointments = appointments.filter(
      apt => new Date(apt.createdAt) > lastMonth
    );
    
    if (recentAppointments.length >= 4) return 'very_high';
    if (recentAppointments.length >= 3) return 'high';
    if (recentAppointments.length >= 2) return 'medium';
    if (recentAppointments.length >= 1) return 'low';
    return 'inactive';
  }

  // ✅ SCORE DE LEALTAD MEJORADO
  static calculateLoyaltyScore(user) {
    let score = 0;
    
    // Puntos por sesiones (máximo 100 puntos)
    score += Math.min(user.sessionsCompleted * 15, 100);
    
    // Puntos por inversión total (máximo 80 puntos)
    score += Math.min(user.totalInvestment / 50, 80);
    
    // Bonus VIP (30 puntos)
    if (user.vipStatus) score += 30;
    
    // Bonus por antigüedad (máximo 40 puntos)
    const accountAgeMonths = (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
    score += Math.min(accountAgeMonths * 5, 40);
    
    // Bonus por consistency en beauty points
    const pointsPerSession = user.sessionsCompleted > 0 ? user.beautyPoints / user.sessionsCompleted : 0;
    if (pointsPerSession > 20) score += 20; // Usuario que acumula bien
    
    return Math.min(Math.round(score), 250);
  }

  // ✅ ANALIZAR PREFERENCIAS DE HORARIO
  static analyzeTimePreferences(appointments) {
    const timeSlots = { morning: 0, afternoon: 0, evening: 0 };
    
    appointments.forEach(apt => {
      const hour = new Date(apt.scheduledTime).getHours();
      if (hour < 12) timeSlots.morning++;
      else if (hour < 17) timeSlots.afternoon++;
      else timeSlots.evening++;
    });
    
    const total = appointments.length;
    return {
      morning: total > 0 ? Math.round((timeSlots.morning / total) * 100) : 0,
      afternoon: total > 0 ? Math.round((timeSlots.afternoon / total) * 100) : 0,
      evening: total > 0 ? Math.round((timeSlots.evening / total) * 100) : 0
    };
  }

  // ✅ SCORE DE COMPROMISO/ENGAGEMENT
  static calculateEngagementScore(user, appointments) {
    let score = 0;
    
    // Frecuencia de citas (0-40 puntos)
    const avgMonthlyAppointments = appointments.length / Math.max(1, this.getAccountAgeMonths(user));
    score += Math.min(avgMonthlyAppointments * 20, 40);
    
    // Consistencia en pagos (0-30 puntos)
    if (user.totalInvestment > 1000) score += 30;
    else if (user.totalInvestment > 500) score += 20;
    else if (user.totalInvestment > 100) score += 10;
    
    // VIP engagement (0-20 puntos)
    if (user.vipStatus) score += 20;
    
    // Beauty points accumulation (0-10 puntos)
    if (user.beautyPoints > 200) score += 10;
    else if (user.beautyPoints > 100) score += 5;
    
    return Math.min(Math.round(score), 100);
  }

  // ✅ POTENCIAL DE GASTO
  static calculateSpendingPotential(user, appointments) {
    const avgSpend = appointments.length > 0 ? user.totalInvestment / appointments.length : 0;
    
    if (avgSpend > 300) return 'high';
    if (avgSpend > 150) return 'medium';
    if (avgSpend > 50) return 'low';
    return 'minimal';
  }

  // ✅ OBTENER MESES DE ANTIGÜEDAD
  static getAccountAgeMonths(user) {
    return Math.max(1, (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30));
  }

  // ✅ OBTENER TEMPLATES DISPONIBLES CON SCORING
  static async getAvailableTemplates(clinicId, userProfile) {
    try {
      // Si no se especifica clínica, obtener templates de todas las clínicas activas
      const whereClause = clinicId ? { clinicId, isActive: true } : { isActive: true };
      
      const templates = await prisma.rewardTemplate.findMany({
        where: whereClause,
        include: {
          clinic: {
            select: { name: true, id: true }
          }
        }
      });

      // Aplicar scoring personalizado a cada template
      return templates.map(template => ({
        ...template,
        personalizedScore: this.calculateTemplateScore(template, userProfile),
        affordability: userProfile.pointsBalance >= template.pointsCost,
        clinicName: template.clinic?.name || 'Clínica'
      }));

    } catch (error) {
      console.error('❌ Error getting available templates:', error);
      return [];
    }
  }

  // ✅ ALGORITMO DE SCORING AVANZADO PARA TEMPLATES
  static calculateTemplateScore(template, userProfile) {
    let score = 0;
    
    // Score base por popularidad (0-20 puntos)
    score += Math.min(template.popularity * 2, 20);
    
    // Ajustes por tipo de usuario y template
    switch (template.type) {
      case 'DISCOUNT':
        if (userProfile.spendingPotential === 'high') score += 25;
        if (userProfile.visitFrequency === 'high' || userProfile.visitFrequency === 'very_high') score += 20;
        if (userProfile.engagementScore > 70) score += 15;
        break;
        
      case 'UPGRADE':
        if (userProfile.vipStatus) score += 30;
        if (userProfile.loyaltyScore > 150) score += 25;
        if (userProfile.averageSpending > 200) score += 20;
        break;
        
      case 'FREE_SERVICE':
        if (userProfile.loyaltyScore > 100) score += 30;
        if (userProfile.isRegularUser) score += 25;
        if (userProfile.engagementScore > 80) score += 20;
        break;
        
      case 'PRODUCT':
        if (userProfile.vipStatus) score += 15;
        if (userProfile.sessionCount > 5) score += 10;
        break;
    }
    
    // Ajustes por frecuencia de visita
    const frequencyBonus = {
      'very_high': 25,
      'high': 20,
      'medium': 10,
      'low': 5,
      'inactive': -10,
      'first_time': 15, // Bonus para primeras veces
      'new': 20 // Bonus para usuarios nuevos
    };
    score += frequencyBonus[userProfile.visitFrequency] || 0;
    
    // Ajuste por accesibilidad de puntos
    const pointsRatio = userProfile.pointsBalance / template.pointsCost;
    if (pointsRatio >= 2) score += 15; // Muy fácil de canjear
    else if (pointsRatio >= 1.5) score += 10; // Fácil de canjear
    else if (pointsRatio >= 1) score += 5; // Justo alcanza
    else if (pointsRatio >= 0.8) score -= 5; // Casi alcanza
    else score -= 15; // Muy caro
    
    // Ajuste por target user type del template
    if (template.targetUserType) {
      const targetMatch = this.checkTargetMatch(template.targetUserType, userProfile);
      if (targetMatch) score += 20;
    }
    
    // Ajuste por loyalty score mínimo
    if (userProfile.loyaltyScore >= template.minLoyaltyScore) {
      score += 10;
    } else {
      score -= 20; // Penalizar si no cumple el mínimo
    }
    
    // Estacionalidad (ejemplo básico)
    if (template.seasonality) {
      try {
        const seasonal = JSON.parse(template.seasonality);
        const currentMonth = new Date().getMonth();
        if (seasonal.months?.includes(currentMonth)) {
          score += 15;
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }
    
    // Bonus por categorías favoritas
    if (template.conditions) {
      try {
        const conditions = JSON.parse(template.conditions);
        if (conditions.categories) {
          const userFavorites = userProfile.favoriteCategories.map(f => f.category);
          const hasMatchingCategory = conditions.categories.some(cat => userFavorites.includes(cat));
          if (hasMatchingCategory) score += 15;
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }
    
    return Math.max(score, 0);
  }

  // ✅ VERIFICAR SI EL USUARIO COINCIDE CON EL TARGET
  static checkTargetMatch(targetUserType, userProfile) {
    switch (targetUserType) {
      case 'VIP':
        return userProfile.vipStatus;
      case 'FREQUENT':
        return userProfile.visitFrequency === 'high' || userProfile.visitFrequency === 'very_high';
      case 'NEW':
        return userProfile.isNewUser;
      case 'LOYAL':
        return userProfile.loyaltyScore > 100;
      case 'HIGH_SPENDER':
        return userProfile.spendingPotential === 'high';
      case 'ALL':
      default:
        return true;
    }
  }

  // ✅ CALCULAR RECOMENDACIONES FINALES
  static calculateRecommendations(templates, userProfile, currentPoints) {
    // Filtrar y ordenar recompensas disponibles
    const affordable = templates
      .filter(t => t.pointsCost <= currentPoints)
      .sort((a, b) => b.personalizedScore - a.personalizedScore)
      .slice(0, 4); // Top 4 disponibles
    
    // Próximas recompensas (aspiracionales) ordenadas por score
    const aspirational = templates
      .filter(t => t.pointsCost > currentPoints)
      .sort((a, b) => {
        // Priorizar por score, pero también por cercanía en puntos
        const scoreA = b.personalizedScore - a.personalizedScore;
        const proximityA = (a.pointsCost - currentPoints) / 100; // Normalizar proximidad
        return scoreA + proximityA;
      })
      .slice(0, 3); // Top 3 próximas
    
    return {
      availableRewards: affordable.map(t => this.formatReward(t, true)),
      nextRewards: aspirational.map(t => this.formatReward(t, false)),
      recommendations: this.generateTextRecommendations(userProfile, affordable),
      history: this.generateMockHistory(userProfile) // TODO: Reemplazar con historial real
    };
  }

  // ✅ FORMATEAR RECOMPENSA PARA FRONTEND
  static formatReward(template, isAvailable) {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      pointsCost: template.pointsCost,
      category: template.type.toLowerCase(),
      isAvailable,
      value: template.value,
      validityDays: template.validityDays,
      score: Math.round(template.personalizedScore),
      clinicName: template.clinicName,
      type: template.type,
      marginCost: template.marginCost
    };
  }

  // ✅ GENERAR RECOMENDACIONES DE TEXTO INTELIGENTES
  static generateTextRecommendations(userProfile, topRewards) {
    const recommendations = [];
    
    if (userProfile.vipStatus && topRewards.some(r => r.type === 'UPGRADE')) {
      recommendations.push("Como VIP, te recomendamos los upgrades exclusivos 👑");
    }
    
    if (userProfile.visitFrequency === 'high' || userProfile.visitFrequency === 'very_high') {
      recommendations.push("¡Eres una cliente frecuente! Los descuentos son perfectos para ti 🌟");
    }
    
    if (userProfile.loyaltyScore > 150) {
      recommendations.push("Tu lealtad merece recompensas especiales. ¡Prueba los servicios gratuitos! 💎");
    }
    
    if (userProfile.isNewUser) {
      recommendations.push("¡Bienvenida! Estas recompensas están pensadas especialmente para ti 🎉");
    }
    
    if (userProfile.spendingPotential === 'high') {
      recommendations.push("Sabemos que aprecias la calidad. Estas recompensas premium son para ti ✨");
    }
    
    return recommendations.slice(0, 2); // Máximo 2 recomendaciones
  }

  // ✅ GENERAR HISTORIAL MOCK (TEMPORAL)
  static generateMockHistory(userProfile) {
    const history = [];
    
    if (userProfile.sessionCount > 0) {
      history.push({
        date: '2025-06-01',
        treatment: 'Ritual Purificante',
        pointsEarned: userProfile.vipStatus ? 100 : 50,
        iconName: 'sparkles'
      });
    }
    
    if (userProfile.sessionCount > 1) {
      history.push({
        date: '2025-05-15',
        treatment: 'Drenaje Relajante',
        pointsEarned: userProfile.vipStatus ? 140 : 70,
        iconName: 'waves'
      });
    }
    
    return history;
  }

  // ✅ OBTENER TIER DE FIDELIDAD
  static getLoyaltyTier(points) {
    if (points >= 1000) return 'Diamond';
    if (points >= 500) return 'Gold';
    if (points >= 250) return 'Silver';
    return 'Bronze';
  }

  // ✅ GENERAR MENSAJE PERSONALIZADO
  static generatePersonalizedMessage(userProfile) {
    const tier = this.getLoyaltyTier(userProfile.pointsBalance);
    const messages = {
      Diamond: "¡Eres una clienta diamante! Disfruta estas recompensas exclusivas 💎",
      Gold: "Tu estatus Gold te da acceso a recompensas premium ⭐",
      Silver: "Como clienta Silver, estas recompensas están seleccionadas para ti 🥈",
      Bronze: "¡Sigue acumulando puntos para desbloquear más recompensas! 🌟"
    };
    
    return messages[tier] || messages.Bronze;
  }

  // ✅ CANJEAR RECOMPENSA CON VALIDACIONES COMPLETAS
  static async redeemReward(userId, templateId) {
    try {
      console.log('💎 Processing reward redemption:', { userId, templateId });
      
      return await prisma.$transaction(async (tx) => {
        // Obtener usuario y template
        const user = await tx.user.findUnique({ where: { id: userId } });
        const template = await tx.rewardTemplate.findUnique({ 
          where: { id: templateId },
          include: { clinic: true }
        });
        
        // Validaciones
        if (!template || !template.isActive) {
          throw new Error('Recompensa no disponible');
        }
        
        if (user.beautyPoints < template.pointsCost) {
          throw new Error('Puntos insuficientes');
        }
        
        // Verificar límites mensuales
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        
        const monthlyRedemptions = await tx.rewardRedemption.count({
          where: {
            templateId,
            createdAt: { gte: thisMonth }
          }
        });
        
        if (monthlyRedemptions >= template.maxUsesPerMonth) {
          throw new Error('Límite mensual alcanzado para esta recompensa');
        }
        
        // Verificar loyalty score mínimo
        const userProfile = this.analyzeUserProfile({ ...user, appointments: [] });
        if (userProfile.loyaltyScore < template.minLoyaltyScore) {
          throw new Error('No cumples los requisitos de lealtad para esta recompensa');
        }
        
        // Crear canje
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + template.validityDays);
        
        const redemption = await tx.rewardRedemption.create({
          data: {
            userId,
            templateId,
            code: this.generateRedemptionCode(),
            pointsUsed: template.pointsCost,
            expiresAt,
            discountAmount: template.type === 'DISCOUNT' ? template.value : null
          }
        });
        
        // Descontar puntos
        await tx.user.update({
          where: { id: userId },
          data: {
            beautyPoints: { decrement: template.pointsCost }
          }
        });
        
        // Actualizar popularidad del template
        await tx.rewardTemplate.update({
          where: { id: templateId },
          data: {
            popularity: { increment: 1 }
          }
        });
        
        // Crear analytics record
        await tx.rewardAnalytics.create({
          data: {
            templateId,
            userId,
            eventType: 'REDEEM',
            userLoyaltyScore: userProfile.loyaltyScore,
            userTier: this.getLoyaltyTier(user.beautyPoints),
            metadata: JSON.stringify({
              pointsCost: template.pointsCost,
              rewardType: template.type,
              clinicId: template.clinicId
            })
          }
        });
        
        console.log('✅ Reward redemption completed successfully');
        
        return {
          ...redemption,
          template: {
            name: template.name,
            type: template.type,
            value: template.value,
            clinicName: template.clinic?.name
          }
        };
      });
      
    } catch (error) {
      console.error('❌ Error redeeming reward:', error);
      throw error;
    }
  }

  // ✅ GENERAR CÓDIGO ÚNICO DE CANJE
  static generateRedemptionCode() {
    const prefix = 'RWD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // ✅ OBTENER ESTADÍSTICAS DE ANALYTICS
  static async getRewardAnalytics(clinicId, dateRange = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);
      
      const analytics = await prisma.rewardAnalytics.findMany({
        where: {
          createdAt: { gte: startDate },
          template: { clinicId }
        },
        include: {
          template: {
            select: { name: true, type: true, pointsCost: true }
          }
        }
      });
      
      return {
        totalEvents: analytics.length,
        redemptions: analytics.filter(a => a.eventType === 'REDEEM').length,
        views: analytics.filter(a => a.eventType === 'VIEW').length,
        topRewards: this.getTopRewards(analytics),
        userTierDistribution: this.getTierDistribution(analytics)
      };
      
    } catch (error) {
      console.error('❌ Error getting reward analytics:', error);
      throw error;
    }
  }

  // ✅ OBTENER TOP RECOMPENSAS
  static getTopRewards(analytics) {
    const rewardCounts = {};
    
    analytics.filter(a => a.eventType === 'REDEEM').forEach(a => {
      const key = a.template.name;
      rewardCounts[key] = (rewardCounts[key] || 0) + 1;
    });
    
    return Object.entries(rewardCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }

  // ✅ OBTENER DISTRIBUCIÓN POR TIER
  static getTierDistribution(analytics) {
    const tierCounts = {};
    
    analytics.filter(a => a.eventType === 'REDEEM').forEach(a => {
      const tier = a.userTier;
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });
    
    return tierCounts;
  }
}

module.exports = SmartRewardsService;