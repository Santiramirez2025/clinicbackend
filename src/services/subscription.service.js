// ============================================================================
// src/services/subscription.service.js - LÓGICA SUSCRIPCIONES VIP ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const stripeService = require('./stripe.service');

const prisma = new PrismaClient();

class SubscriptionService {
  
  // ============================================================================
  // CREAR SUSCRIPCIÓN VIP
  // ============================================================================
  
  async createVIPSubscription(userId, planType, paymentMethodId = null) {
    try {
      console.log('🔵 Creating VIP subscription for user:', userId, 'Plan:', planType);
      
      // 1. Verificar que el usuario existe
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { vipSubscriptions: { where: { status: 'ACTIVE' } } }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // 2. Verificar que no tenga suscripción activa
      if (user.vipSubscriptions.length > 0) {
        throw new Error('El usuario ya tiene una suscripción VIP activa');
      }

      // 3. Obtener o crear customer en Stripe
      const stripeCustomer = await stripeService.getOrCreateCustomer(user);
      
      // 4. Obtener precios VIP
      const prices = await stripeService.getVIPPrices();
      const priceId = planType === 'YEARLY' ? prices.yearly?.id : prices.monthly?.id;
      
      if (!priceId) {
        throw new Error(`Precio no encontrado para plan: ${planType}`);
      }

      // 5. Crear suscripción en Stripe
      const stripeSubscription = await stripeService.createSubscription(
        stripeCustomer.id,
        priceId,
        paymentMethodId
      );

      // 6. Guardar suscripción en BD
      const subscription = await prisma.vipSubscription.create({
        data: {
          userId: userId,
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: stripeCustomer.id,
          planType: planType,
          status: stripeSubscription.status.toUpperCase(),
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          price: (stripeSubscription.items.data[0].price.unit_amount / 100),
          currency: stripeSubscription.items.data[0].price.currency.toUpperCase(),
          cancelAtPeriodEnd: false,
          trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null
        }
      });

      // 7. Actualizar estado VIP del usuario (si la suscripción ya está activa)
      if (stripeSubscription.status === 'active') {
        await this.activateVIPStatus(userId);
      }

      console.log('✅ VIP subscription created:', subscription.id);
      
      return {
        subscription,
        stripeSubscription,
        needsPaymentConfirmation: stripeSubscription.status === 'incomplete'
      };
      
    } catch (error) {
      console.error('❌ Error creating VIP subscription:', error);
      throw error;
    }
  }

  // ============================================================================
  // ACTIVAR ESTADO VIP
  // ============================================================================
  
  async activateVIPStatus(userId) {
    try {
      console.log('🔵 Activating VIP status for user:', userId);
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          vipStatus: true,
          updatedAt: new Date()
        }
      });

      // Agregar beauty points de bienvenida VIP
      const welcomePoints = parseInt(process.env.VIP_WELCOME_POINTS) || 50;
      await prisma.user.update({
        where: { id: userId },
        data: {
          beautyPoints: {
            increment: welcomePoints
          }
        }
      });

      console.log('✅ VIP status activated for user:', userId);
      return updatedUser;
      
    } catch (error) {
      console.error('❌ Error activating VIP status:', error);
      throw error;
    }
  }

  // ============================================================================
  // DESACTIVAR ESTADO VIP
  // ============================================================================
  
  async deactivateVIPStatus(userId) {
    try {
      console.log('🔵 Deactivating VIP status for user:', userId);
      
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          vipStatus: false,
          updatedAt: new Date()
        }
      });

      console.log('✅ VIP status deactivated for user:', userId);
      return updatedUser;
      
    } catch (error) {
      console.error('❌ Error deactivating VIP status:', error);
      throw error;
    }
  }

  // ============================================================================
  // CANCELAR SUSCRIPCIÓN
  // ============================================================================
  
  async cancelVIPSubscription(userId, immediately = false) {
    try {
      console.log('🔵 Canceling VIP subscription for user:', userId);
      
      // 1. Buscar suscripción activa
      const subscription = await prisma.vipSubscription.findFirst({
        where: {
          userId: userId,
          status: 'ACTIVE'
        }
      });

      if (!subscription) {
        throw new Error('No se encontró suscripción VIP activa');
      }

      // 2. Cancelar en Stripe
      const canceledStripeSubscription = await stripeService.cancelSubscription(
        subscription.stripeSubscriptionId,
        immediately
      );

      // 3. Actualizar en BD
      const updatedSubscription = await prisma.vipSubscription.update({
        where: { id: subscription.id },
        data: {
          status: immediately ? 'CANCELED' : 'ACTIVE',
          cancelAtPeriodEnd: !immediately,
          canceledAt: immediately ? new Date() : null,
          updatedAt: new Date()
        }
      });

      // 4. Si cancelación inmediata, desactivar VIP
      if (immediately) {
        await this.deactivateVIPStatus(userId);
      }

      console.log('✅ VIP subscription canceled:', subscription.id);
      return updatedSubscription;
      
    } catch (error) {
      console.error('❌ Error canceling VIP subscription:', error);
      throw error;
    }
  }

  // ============================================================================
  // REANUDAR SUSCRIPCIÓN
  // ============================================================================
  
  async resumeVIPSubscription(userId) {
    try {
      console.log('🔵 Resuming VIP subscription for user:', userId);
      
      // 1. Buscar suscripción cancelada al final del período
      const subscription = await prisma.vipSubscription.findFirst({
        where: {
          userId: userId,
          status: 'ACTIVE',
          cancelAtPeriodEnd: true
        }
      });

      if (!subscription) {
        throw new Error('No se encontró suscripción VIP para reanudar');
      }

      // 2. Reanudar en Stripe
      const resumedStripeSubscription = await stripeService.resumeSubscription(
        subscription.stripeSubscriptionId
      );

      // 3. Actualizar en BD
      const updatedSubscription = await prisma.vipSubscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: false,
          updatedAt: new Date()
        }
      });

      console.log('✅ VIP subscription resumed:', subscription.id);
      return updatedSubscription;
      
    } catch (error) {
      console.error('❌ Error resuming VIP subscription:', error);
      throw error;
    }
  }

  // ============================================================================
  // CAMBIAR PLAN DE SUSCRIPCIÓN
  // ============================================================================
  
  async changeVIPPlan(userId, newPlanType) {
    try {
      console.log('🔵 Changing VIP plan for user:', userId, 'to:', newPlanType);
      
      // 1. Buscar suscripción activa
      const subscription = await prisma.vipSubscription.findFirst({
        where: {
          userId: userId,
          status: 'ACTIVE'
        }
      });

      if (!subscription) {
        throw new Error('No se encontró suscripción VIP activa');
      }

      // 2. Obtener nuevo precio
      const prices = await stripeService.getVIPPrices();
      const newPriceId = newPlanType === 'YEARLY' ? prices.yearly?.id : prices.monthly?.id;
      
      if (!newPriceId) {
        throw new Error(`Precio no encontrado para plan: ${newPlanType}`);
      }

      // 3. Actualizar suscripción en Stripe
      const updatedStripeSubscription = await stripeService.updateSubscription(
        subscription.stripeSubscriptionId,
        {
          items: [{
            id: subscription.stripeSubscriptionId, // Item actual
            price: newPriceId
          }],
          proration_behavior: 'create_prorations' // Prorratear diferencia
        }
      );

      // 4. Actualizar en BD
      const updatedSubscription = await prisma.vipSubscription.update({
        where: { id: subscription.id },
        data: {
          planType: newPlanType,
          price: (updatedStripeSubscription.items.data[0].price.unit_amount / 100),
          currentPeriodStart: new Date(updatedStripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(updatedStripeSubscription.current_period_end * 1000),
          updatedAt: new Date()
        }
      });

      console.log('✅ VIP plan changed:', subscription.id);
      return updatedSubscription;
      
    } catch (error) {
      console.error('❌ Error changing VIP plan:', error);
      throw error;
    }
  }

  // ============================================================================
  // OBTENER ESTADO DE SUSCRIPCIÓN
  // ============================================================================
  
  async getVIPSubscriptionStatus(userId) {
    try {
      const subscription = await prisma.vipSubscription.findFirst({
        where: { userId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              vipStatus: true
            }
          }
        }
      });

      if (!subscription) {
        return {
          hasSubscription: false,
          isVIP: false,
          subscription: null
        };
      }

      // Calcular días restantes
      const now = new Date();
      const periodEnd = new Date(subscription.currentPeriodEnd);
      const daysRemaining = Math.max(0, Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24)));

      return {
        hasSubscription: true,
        isVIP: subscription.status === 'ACTIVE',
        subscription: {
          ...subscription,
          daysRemaining,
          isExpired: now > periodEnd,
          willCancelAtPeriodEnd: subscription.cancelAtPeriodEnd
        }
      };
      
    } catch (error) {
      console.error('❌ Error getting VIP subscription status:', error);
      throw error;
    }
  }

  // ============================================================================
  // SINCRONIZAR CON STRIPE (para webhooks)
  // ============================================================================
  
  async syncSubscriptionFromStripe(stripeSubscriptionId, stripeSubscription = null) {
    try {
      console.log('🔵 Syncing subscription from Stripe:', stripeSubscriptionId);
      
      // 1. Obtener suscripción de Stripe si no se provee
      if (!stripeSubscription) {
        stripeSubscription = await stripeService.getSubscription(stripeSubscriptionId);
      }

      // 2. Buscar suscripción en BD
      const subscription = await prisma.vipSubscription.findUnique({
        where: { stripeSubscriptionId: stripeSubscriptionId },
        include: { user: true }
      });

      if (!subscription) {
        console.warn('⚠️ Subscription not found in database:', stripeSubscriptionId);
        return null;
      }

      // 3. Actualizar datos en BD
      const updatedSubscription = await prisma.vipSubscription.update({
        where: { id: subscription.id },
        data: {
          status: stripeSubscription.status.toUpperCase(),
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
          updatedAt: new Date()
        }
      });

      // 4. Actualizar estado VIP del usuario
      const shouldBeVIP = ['active', 'trialing'].includes(stripeSubscription.status);
      
      if (subscription.user.vipStatus !== shouldBeVIP) {
        if (shouldBeVIP) {
          await this.activateVIPStatus(subscription.userId);
        } else {
          await this.deactivateVIPStatus(subscription.userId);
        }
      }

      console.log('✅ Subscription synced from Stripe:', stripeSubscriptionId);
      return updatedSubscription;
      
    } catch (error) {
      console.error('❌ Error syncing subscription from Stripe:', error);
      throw error;
    }
  }

  // ============================================================================
  // OBTENER MÉTRICAS VIP
  // ============================================================================
  
  async getVIPMetrics() {
    try {
      const [
        totalSubscriptions,
        activeSubscriptions,
        monthlySubscriptions,
        yearlySubscriptions,
        recentSubscriptions
      ] = await Promise.all([
        prisma.vipSubscription.count(),
        prisma.vipSubscription.count({ where: { status: 'ACTIVE' } }),
        prisma.vipSubscription.count({ where: { planType: 'MONTHLY', status: 'ACTIVE' } }),
        prisma.vipSubscription.count({ where: { planType: 'YEARLY', status: 'ACTIVE' } }),
        prisma.vipSubscription.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Últimos 30 días
            }
          }
        })
      ]);

      // Calcular MRR (Monthly Recurring Revenue)
      const subscriptions = await prisma.vipSubscription.findMany({
        where: { status: 'ACTIVE' },
        select: { planType: true, price: true }
      });

      const mrr = subscriptions.reduce((total, sub) => {
        const monthlyRevenue = sub.planType === 'YEARLY' ? sub.price / 12 : sub.price;
        return total + monthlyRevenue;
      }, 0);

      return {
        total: totalSubscriptions,
        active: activeSubscriptions,
        monthly: monthlySubscriptions,
        yearly: yearlySubscriptions,
        recent: recentSubscriptions,
        mrr: Math.round(mrr * 100) / 100, // Redondear a 2 decimales
        arr: Math.round(mrr * 12 * 100) / 100 // Annual Recurring Revenue
      };
      
    } catch (error) {
      console.error('❌ Error getting VIP metrics:', error);
      throw error;
    }
  }

  // ============================================================================
  // LIMPIAR SUSCRIPCIONES EXPIRADAS
  // ============================================================================
  
  async cleanupExpiredSubscriptions() {
    try {
      console.log('🔵 Cleaning up expired subscriptions...');
      
      const now = new Date();
      
      // Buscar suscripciones que deberían estar canceladas
      const expiredSubscriptions = await prisma.vipSubscription.findMany({
        where: {
          status: 'ACTIVE',
          cancelAtPeriodEnd: true,
          currentPeriodEnd: { lt: now }
        },
        include: { user: true }
      });

      console.log(`Found ${expiredSubscriptions.length} expired subscriptions to cleanup`);

      // Procesar cada suscripción expirada
      for (const subscription of expiredSubscriptions) {
        try {
          // Actualizar estado en BD
          await prisma.vipSubscription.update({
            where: { id: subscription.id },
            data: {
              status: 'CANCELED',
              canceledAt: now,
              updatedAt: now
            }
          });

          // Desactivar estado VIP del usuario
          await this.deactivateVIPStatus(subscription.userId);
          
          console.log(`✅ Cleaned up expired subscription: ${subscription.id}`);
          
        } catch (error) {
          console.error(`❌ Error cleaning up subscription ${subscription.id}:`, error);
        }
      }

      return expiredSubscriptions.length;
      
    } catch (error) {
      console.error('❌ Error cleaning up expired subscriptions:', error);
      throw error;
    }
  }
}

// ============================================================================
// EXPORTAR INSTANCIA ÚNICA
// ============================================================================
const subscriptionService = new SubscriptionService();
module.exports = subscriptionService;