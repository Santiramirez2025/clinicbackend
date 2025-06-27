// ============================================================================
// src/services/payment.service.js - SERVICIO DE PAGOS MEJORADO
// ============================================================================

const EmailService = require('./email.service');
const NotificationService = require('./notification.service');

class PaymentService {
  
  // ========================================================================
  // CONFIGURACIÓN Y INICIALIZACIÓN
  // ========================================================================
  
  /**
   * Inicializa Stripe solo si está configurado
   */
  static getStripeInstance() {
    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      return stripe;
    }
    return null;
  }

  /**
   * Verifica si Stripe está configurado
   */
  static isStripeConfigured() {
    return !!(process.env.STRIPE_SECRET_KEY && 
              process.env.STRIPE_VIP_MONTHLY_PRICE_ID && 
              process.env.STRIPE_VIP_YEARLY_PRICE_ID);
  }

  // ========================================================================
  // GESTIÓN DE CLIENTES
  // ========================================================================

  /**
   * Crea o obtiene cliente de Stripe
   * @param {object} user - Datos del usuario
   * @returns {Promise<object>} Cliente de Stripe
   */
  static async getOrCreateStripeCustomer(user) {
    const stripe = this.getStripeInstance();
    if (!stripe) {
      throw new Error('Stripe no está configurado');
    }

    try {
      // Buscar cliente existente por email
      const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1
      });

      if (existingCustomers.data.length > 0) {
        console.log(`👤 Cliente Stripe existente encontrado: ${existingCustomers.data[0].id}`);
        return existingCustomers.data[0];
      }

      // Crear nuevo cliente
      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        metadata: {
          userId: user.id,
          createdAt: new Date().toISOString()
        }
      });

      console.log(`✅ Nuevo cliente Stripe creado: ${customer.id}`);
      return customer;

    } catch (error) {
      console.error('❌ Error gestionando cliente Stripe:', error.message);
      throw new Error(`Error de cliente: ${error.message}`);
    }
  }

  // ========================================================================
  // SUSCRIPCIONES VIP
  // ========================================================================

  /**
   * Crea suscripción VIP
   * @param {string} userId - ID del usuario
   * @param {string} planType - MONTHLY o YEARLY
   * @param {string} paymentMethodId - ID del método de pago
   * @param {object} userInfo - Información adicional del usuario
   * @returns {Promise<object>} Suscripción creada
   */
  static async createVIPSubscription(userId, planType, paymentMethodId, userInfo = {}) {
    console.log('\n💳 CREANDO SUSCRIPCIÓN VIP');
    console.log('===========================');
    console.log(`👤 Usuario: ${userId}`);
    console.log(`📋 Plan: ${planType}`);
    console.log(`💳 Payment Method: ${paymentMethodId}`);

    // Modo desarrollo - simular suscripción
    if (!this.isStripeConfigured()) {
      console.log('🧪 Modo desarrollo - simulando suscripción...');
      
      const mockSubscription = {
        id: `sub_mock_${Date.now()}`,
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor((Date.now() + (planType === 'MONTHLY' ? 30 : 365) * 24 * 60 * 60 * 1000) / 1000),
        plan: {
          id: planType === 'MONTHLY' ? 'price_monthly_mock' : 'price_yearly_mock',
          amount: planType === 'MONTHLY' ? 1999 : 19999, // centavos
          currency: 'usd',
          interval: planType === 'MONTHLY' ? 'month' : 'year'
        },
        customer: `cus_mock_${userId}`,
        metadata: {
          userId,
          planType,
          environment: 'development'
        }
      };

      console.log('✅ Suscripción simulada creada exitosamente');
      console.log('===========================\n');
      
      return mockSubscription;
    }

    // Modo producción - usar Stripe real
    try {
      const stripe = this.getStripeInstance();
      
      // 1. Crear o obtener cliente
      const customer = await this.getOrCreateStripeCustomer({
        id: userId,
        email: userInfo.email || `user_${userId}@example.com`,
        firstName: userInfo.firstName || 'Usuario',
        lastName: userInfo.lastName || 'VIP'
      });

      // 2. Adjuntar método de pago al cliente
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // 3. Establecer como método de pago por defecto
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // 4. Definir precios según plan
      const priceIds = {
        MONTHLY: process.env.STRIPE_VIP_MONTHLY_PRICE_ID,
        YEARLY: process.env.STRIPE_VIP_YEARLY_PRICE_ID
      };

      if (!priceIds[planType]) {
        throw new Error(`Price ID no configurado para plan: ${planType}`);
      }

      // 5. Crear suscripción
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: priceIds[planType],
        }],
        default_payment_method: paymentMethodId,
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId,
          planType,
          createdAt: new Date().toISOString()
        }
      });

      console.log(`✅ Suscripción Stripe creada: ${subscription.id}`);
      console.log(`💰 Estado: ${subscription.status}`);
      console.log('===========================\n');

      // 6. Notificar éxito
      if (userInfo.email) {
        await EmailService.sendVIPWelcome(userInfo, {
          id: subscription.id,
          planType,
          price: subscription.items.data[0].price.unit_amount / 100
        });
      }

      return subscription;

    } catch (error) {
      console.error('❌ Error creando suscripción Stripe:', error.message);
      
      // Log detallado del error
      if (error.type === 'StripeCardError') {
        console.error('💳 Error de tarjeta:', error.message);
      } else if (error.type === 'StripeInvalidRequestError') {
        console.error('📋 Error de solicitud:', error.message);
      }
      
      throw new Error(`Error de suscripción: ${error.message}`);
    }
  }

  /**
   * Cancela suscripción VIP
   * @param {string} subscriptionId - ID de la suscripción
   * @param {boolean} immediately - Si cancelar inmediatamente o al final del período
   * @returns {Promise<object>} Suscripción actualizada
   */
  static async cancelSubscription(subscriptionId, immediately = false) {
    console.log('\n❌ CANCELANDO SUSCRIPCIÓN VIP');
    console.log('==============================');
    console.log(`📋 Suscripción: ${subscriptionId}`);
    console.log(`⏰ Inmediato: ${immediately ? 'Sí' : 'No (al final del período)'}`);

    // Modo desarrollo
    if (!this.isStripeConfigured()) {
      console.log('🧪 Modo desarrollo - simulando cancelación...');
      
      const mockCancellation = {
        id: subscriptionId,
        status: immediately ? 'canceled' : 'active',
        cancel_at_period_end: !immediately,
        canceled_at: immediately ? Math.floor(Date.now() / 1000) : null,
        metadata: {
          canceledBy: 'user',
          environment: 'development'
        }
      };

      console.log('✅ Cancelación simulada exitosa');
      console.log('==============================\n');
      
      return mockCancellation;
    }

    // Modo producción
    try {
      const stripe = this.getStripeInstance();
      
      let subscription;
      
      if (immediately) {
        // Cancelar inmediatamente
        subscription = await stripe.subscriptions.del(subscriptionId);
        console.log('✅ Suscripción cancelada inmediatamente');
      } else {
        // Cancelar al final del período
        subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            canceledBy: 'user',
            canceledAt: new Date().toISOString()
          }
        });
        console.log('✅ Suscripción marcada para cancelar al final del período');
      }

      console.log(`📊 Estado: ${subscription.status}`);
      console.log('==============================\n');

      return subscription;

    } catch (error) {
      console.error('❌ Error cancelando suscripción:', error.message);
      throw new Error(`Error de cancelación: ${error.message}`);
    }
  }

  /**
   * Reactiva suscripción cancelada (si aún no ha expirado)
   */
  static async reactivateSubscription(subscriptionId) {
    console.log('\n🔄 REACTIVANDO SUSCRIPCIÓN');
    console.log('===========================');

    if (!this.isStripeConfigured()) {
      console.log('🧪 Modo desarrollo - simulando reactivación...');
      return {
        id: subscriptionId,
        status: 'active',
        cancel_at_period_end: false,
        reactivated_at: Math.floor(Date.now() / 1000)
      };
    }

    try {
      const stripe = this.getStripeInstance();
      
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        metadata: {
          reactivatedAt: new Date().toISOString()
        }
      });

      console.log('✅ Suscripción reactivada exitosamente');
      console.log('===========================\n');

      return subscription;

    } catch (error) {
      console.error('❌ Error reactivando suscripción:', error.message);
      throw new Error(`Error de reactivación: ${error.message}`);
    }
  }

  // ========================================================================
  // GESTIÓN DE PAGOS
  // ========================================================================

  /**
   * Procesa pago único (para tratamientos individuales)
   */
  static async processOneTimePayment(amount, currency, paymentMethodId, description, customerInfo) {
    console.log('\n💳 PROCESANDO PAGO ÚNICO');
    console.log('=========================');
    console.log(`💰 Monto: ${amount} ${currency.toUpperCase()}`);
    console.log(`📝 Descripción: ${description}`);

    if (!this.isStripeConfigured()) {
      console.log('🧪 Modo desarrollo - simulando pago...');
      return {
        id: `pi_mock_${Date.now()}`,
        status: 'succeeded',
        amount,
        currency,
        description,
        created: Math.floor(Date.now() / 1000)
      };
    }

    try {
      const stripe = this.getStripeInstance();

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convertir a centavos
        currency: currency.toLowerCase(),
        payment_method: paymentMethodId,
        description,
        confirm: true,
        metadata: {
          customerEmail: customerInfo.email,
          customerName: `${customerInfo.firstName} ${customerInfo.lastName}`
        }
      });

      console.log(`✅ Pago procesado: ${paymentIntent.id}`);
      console.log(`📊 Estado: ${paymentIntent.status}`);
      console.log('=========================\n');

      return paymentIntent;

    } catch (error) {
      console.error('❌ Error procesando pago:', error.message);
      throw new Error(`Error de pago: ${error.message}`);
    }
  }

  /**
   * Obtiene métodos de pago de un cliente
   */
  static async getCustomerPaymentMethods(customerId) {
    if (!this.isStripeConfigured()) {
      return {
        data: [{
          id: 'pm_mock_123',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025
          }
        }]
      };
    }

    try {
      const stripe = this.getStripeInstance();
      
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods;

    } catch (error) {
      console.error('❌ Error obteniendo métodos de pago:', error.message);
      throw new Error(`Error obteniendo métodos de pago: ${error.message}`);
    }
  }

  // ========================================================================
  // WEBHOOKS
  // ========================================================================

  /**
   * Maneja webhooks de Stripe
   * @param {object} event - Evento de webhook
   * @param {object} prisma - Cliente de Prisma para DB
   * @returns {Promise<object>} Resultado del procesamiento
   */
  static async handleWebhook(event, prisma = null) {
    console.log('\n🔗 PROCESANDO WEBHOOK STRIPE');
    console.log('=============================');
    console.log(`📨 Evento: ${event.type}`);
    console.log(`🆔 ID: ${event.id}`);

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded':
          return await this.handlePaymentSucceeded(event.data.object, prisma);
        
        case 'invoice.payment_failed':
          return await this.handlePaymentFailed(event.data.object, prisma);
        
        case 'customer.subscription.created':
          return await this.handleSubscriptionCreated(event.data.object, prisma);
        
        case 'customer.subscription.updated':
          return await this.handleSubscriptionUpdated(event.data.object, prisma);
        
        case 'customer.subscription.deleted':
          return await this.handleSubscriptionDeleted(event.data.object, prisma);
        
        case 'payment_intent.succeeded':
          return await this.handlePaymentIntentSucceeded(event.data.object, prisma);
        
        case 'payment_intent.payment_failed':
          return await this.handlePaymentIntentFailed(event.data.object, prisma);
        
        default:
          console.log(`⚠️ Evento no manejado: ${event.type}`);
          return { handled: false, event: event.type };
      }

    } catch (error) {
      console.error('❌ Error procesando webhook:', error.message);
      return { 
        handled: false, 
        error: error.message, 
        event: event.type 
      };
    } finally {
      console.log('=============================\n');
    }
  }

  /**
   * Maneja pago exitoso
   */
  static async handlePaymentSucceeded(invoice, prisma) {
    console.log('✅ Pago exitoso procesado');
    console.log(`💰 Monto: ${invoice.amount_paid / 100} ${invoice.currency}`);
    console.log(`👤 Cliente: ${invoice.customer}`);

    // Actualizar suscripción en BD si prisma está disponible
    if (prisma && invoice.subscription) {
      try {
        // Buscar suscripción VIP por Stripe ID
        const subscription = await prisma.vipSubscription.findFirst({
          where: { stripeSubscriptionId: invoice.subscription }
        });

        if (subscription) {
          await prisma.vipSubscription.update({
            where: { id: subscription.id },
            data: { 
              status: 'ACTIVE',
              updatedAt: new Date()
            }
          });

          // Activar estado VIP del usuario
          await prisma.user.update({
            where: { id: subscription.userId },
            data: { vipStatus: true }
          });

          console.log('💎 Estado VIP actualizado en BD');
        }
      } catch (dbError) {
        console.error('❌ Error actualizando BD:', dbError.message);
      }
    }

    return { handled: true, type: 'payment_succeeded' };
  }

  /**
   * Maneja pago fallido
   */
  static async handlePaymentFailed(invoice, prisma) {
    console.log('❌ Pago fallido procesado');
    console.log(`👤 Cliente: ${invoice.customer}`);
    console.log(`💰 Monto: ${invoice.amount_due / 100} ${invoice.currency}`);

    // Notificar al usuario sobre el fallo de pago
    if (prisma && invoice.subscription) {
      try {
        const subscription = await prisma.vipSubscription.findFirst({
          where: { stripeSubscriptionId: invoice.subscription },
          include: { user: true }
        });

        if (subscription?.user) {
          await NotificationService.sendPushNotification(
            subscription.user.id,
            '💳 Problema con el pago',
            'Hubo un problema con el pago de tu suscripción VIP. Por favor actualiza tu método de pago.',
            { type: 'payment_failed' }
          );
        }
      } catch (error) {
        console.error('❌ Error notificando fallo de pago:', error.message);
      }
    }

    return { handled: true, type: 'payment_failed' };
  }

  /**
   * Maneja suscripción creada
   */
  static async handleSubscriptionCreated(subscription, prisma) {
    console.log('🆕 Nueva suscripción creada');
    console.log(`🆔 ID: ${subscription.id}`);
    console.log(`📊 Estado: ${subscription.status}`);

    return { handled: true, type: 'subscription_created' };
  }

  /**
   * Maneja suscripción actualizada
   */
  static async handleSubscriptionUpdated(subscription, prisma) {
    console.log('🔄 Suscripción actualizada');
    console.log(`🆔 ID: ${subscription.id}`);
    console.log(`📊 Estado: ${subscription.status}`);

    return { handled: true, type: 'subscription_updated' };
  }

  /**
   * Maneja suscripción eliminada
   */
  static async handleSubscriptionDeleted(subscription, prisma) {
    console.log('🗑️ Suscripción eliminada');
    console.log(`🆔 ID: ${subscription.id}`);

    // Desactivar VIP en BD
    if (prisma) {
      try {
        const vipSub = await prisma.vipSubscription.findFirst({
          where: { stripeSubscriptionId: subscription.id }
        });

        if (vipSub) {
          await prisma.vipSubscription.update({
            where: { id: vipSub.id },
            data: { status: 'CANCELLED' }
          });

          await prisma.user.update({
            where: { id: vipSub.userId },
            data: { vipStatus: false }
          });

          console.log('💎 Estado VIP desactivado en BD');
        }
      } catch (error) {
        console.error('❌ Error desactivando VIP:', error.message);
      }
    }

    return { handled: true, type: 'subscription_deleted' };
  }

  /**
   * Maneja payment intent exitoso
   */
  static async handlePaymentIntentSucceeded(paymentIntent, prisma) {
    console.log('✅ Payment Intent exitoso');
    console.log(`💰 Monto: ${paymentIntent.amount / 100} ${paymentIntent.currency}`);

    return { handled: true, type: 'payment_intent_succeeded' };
  }

  /**
   * Maneja payment intent fallido
   */
  static async handlePaymentIntentFailed(paymentIntent, prisma) {
    console.log('❌ Payment Intent fallido');
    console.log(`💰 Monto: ${paymentIntent.amount / 100} ${paymentIntent.currency}`);

    return { handled: true, type: 'payment_intent_failed' };
  }

  // ========================================================================
  // UTILIDADES Y TESTING
  // ========================================================================

  /**
   * Obtiene información de suscripción
   */
  static async getSubscriptionInfo(subscriptionId) {
    if (!this.isStripeConfigured()) {
      return {
        id: subscriptionId,
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
        plan: { amount: 1999, currency: 'usd', interval: 'month' }
      };
    }

    try {
      const stripe = this.getStripeInstance();
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('❌ Error obteniendo suscripción:', error.message);
      throw new Error(`Error obteniendo suscripción: ${error.message}`);
    }
  }

  /**
   * Test del servicio de pagos
   */
  static async testPaymentService() {
    console.log('\n🧪 TESTING PAYMENT SERVICE');
    console.log('===========================');
    
    console.log(`🔧 Stripe configurado: ${this.isStripeConfigured() ? 'Sí' : 'No'}`);
    
    if (this.isStripeConfigured()) {
      console.log('🔑 Variables configuradas:');
      console.log(`   - STRIPE_SECRET_KEY: ${process.env.STRIPE_SECRET_KEY ? '✅' : '❌'}`);
      console.log(`   - MONTHLY_PRICE_ID: ${process.env.STRIPE_VIP_MONTHLY_PRICE_ID ? '✅' : '❌'}`);
      console.log(`   - YEARLY_PRICE_ID: ${process.env.STRIPE_VIP_YEARLY_PRICE_ID ? '✅' : '❌'}`);
    } else {
      console.log('⚠️ Modo desarrollo activo');
    }
    
    // Simular creación de suscripción
    try {
      const mockSubscription = await this.createVIPSubscription(
        'test-user-123',
        'MONTHLY',
        'pm_test_123',
        {
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User'
        }
      );
      
      console.log('✅ Test de suscripción exitoso');
      console.log(`   ID: ${mockSubscription.id}`);
      console.log(`   Estado: ${mockSubscription.status}`);
      
    } catch (error) {
      console.log('❌ Test de suscripción falló:', error.message);
    }
    
    console.log('===========================\n');
  }
}

module.exports = PaymentService;