// ============================================================================
// src/services/stripe.service.js - SERVICIO PRINCIPAL STRIPE ✅
// ============================================================================
const Stripe = require('stripe');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ✅ CONFIGURACIÓN STRIPE
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16', // Última versión estable
  appInfo: {
    name: 'Belleza Estética VIP',
    version: '1.0.0',
  },
});

class StripeService {
  constructor() {
    this.stripe = stripe;
    this.webhook_secret = process.env.STRIPE_WEBHOOK_SECRET;
  }

  // ============================================================================
  // GESTIÓN DE CUSTOMERS
  // ============================================================================
  
  async createCustomer(user) {
    try {
      console.log('🔵 Creating Stripe customer for user:', user.id);
      
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone || undefined,
        metadata: {
          userId: user.id,
          app: 'belleza-estetica',
          userType: 'vip_subscriber'
        },
        preferred_locales: ['es-ES'],
        address: {
          country: 'ES'
        }
      });

      // Guardar en BD
      await prisma.stripeCustomer.create({
        data: {
          userId: user.id,
          stripeCustomerId: customer.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          createdAt: new Date(),
        }
      });

      console.log('✅ Stripe customer created:', customer.id);
      return customer;
      
    } catch (error) {
      console.error('❌ Error creating Stripe customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async getOrCreateCustomer(user) {
    try {
      // Buscar customer existente
      const existingCustomer = await prisma.stripeCustomer.findUnique({
        where: { userId: user.id }
      });

      if (existingCustomer) {
        console.log('✅ Found existing Stripe customer:', existingCustomer.stripeCustomerId);
        return await this.stripe.customers.retrieve(existingCustomer.stripeCustomerId);
      }

      // Crear nuevo customer
      return await this.createCustomer(user);
      
    } catch (error) {
      console.error('❌ Error getting/creating customer:', error);
      throw error;
    }
  }

  async updateCustomer(userId, updateData) {
    try {
      const stripeCustomer = await prisma.stripeCustomer.findUnique({
        where: { userId }
      });

      if (!stripeCustomer) {
        throw new Error('Customer not found');
      }

      const updatedCustomer = await this.stripe.customers.update(
        stripeCustomer.stripeCustomerId,
        updateData
      );

      // Actualizar en BD si hay cambios relevantes
      if (updateData.email || updateData.name) {
        await prisma.stripeCustomer.update({
          where: { userId },
          data: {
            email: updateData.email || stripeCustomer.email,
            name: updateData.name || stripeCustomer.name,
            updatedAt: new Date()
          }
        });
      }

      return updatedCustomer;
      
    } catch (error) {
      console.error('❌ Error updating customer:', error);
      throw error;
    }
  }

  // ============================================================================
  // GESTIÓN DE PRECIOS Y PRODUCTOS
  // ============================================================================

  async getVIPPrices() {
    try {
      const prices = await this.stripe.prices.list({
        product: process.env.STRIPE_VIP_PRODUCT_ID,
        active: true,
        expand: ['data.product']
      });

      const formattedPrices = prices.data.reduce((acc, price) => {
        const interval = price.recurring?.interval;
        if (interval === 'month') {
          acc.monthly = {
            id: price.id,
            amount: price.unit_amount,
            currency: price.currency,
            interval: 'month'
          };
        } else if (interval === 'year') {
          acc.yearly = {
            id: price.id,
            amount: price.unit_amount,
            currency: price.currency,
            interval: 'year'
          };
        }
        return acc;
      }, {});

      return formattedPrices;
      
    } catch (error) {
      console.error('❌ Error fetching VIP prices:', error);
      throw error;
    }
  }

  // ============================================================================
  // GESTIÓN DE SUSCRIPCIONES
  // ============================================================================

  async createSubscription(customerId, priceId, paymentMethodId = null) {
    try {
      console.log('🔵 Creating subscription for customer:', customerId);

      const subscriptionData = {
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          app: 'belleza-estetica',
          feature: 'vip-membership'
        },
        trial_period_days: 0, // Sin trial por defecto
        billing_cycle_anchor_config: {
          hour: 9 // Renovar a las 9 AM hora española
        }
      };

      // Si hay método de pago específico
      if (paymentMethodId) {
        subscriptionData.default_payment_method = paymentMethodId;
      }

      const subscription = await this.stripe.subscriptions.create(subscriptionData);
      
      console.log('✅ Subscription created:', subscription.id);
      return subscription;
      
    } catch (error) {
      console.error('❌ Error creating subscription:', error);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId, immediately = false) {
    try {
      console.log('🔵 Canceling subscription:', subscriptionId);

      let canceledSubscription;
      
      if (immediately) {
        // Cancelar inmediatamente
        canceledSubscription = await this.stripe.subscriptions.cancel(subscriptionId);
      } else {
        // Cancelar al final del período
        canceledSubscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
          metadata: {
            cancellation_reason: 'user_requested',
            canceled_at: new Date().toISOString()
          }
        });
      }

      console.log('✅ Subscription canceled:', subscriptionId);
      return canceledSubscription;
      
    } catch (error) {
      console.error('❌ Error canceling subscription:', error);
      throw error;
    }
  }

  async resumeSubscription(subscriptionId) {
    try {
      console.log('🔵 Resuming subscription:', subscriptionId);

      const resumedSubscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        metadata: {
          resumed_at: new Date().toISOString()
        }
      });

      console.log('✅ Subscription resumed:', subscriptionId);
      return resumedSubscription;
      
    } catch (error) {
      console.error('❌ Error resuming subscription:', error);
      throw error;
    }
  }

  async updateSubscription(subscriptionId, updateData) {
    try {
      console.log('🔵 Updating subscription:', subscriptionId);

      const updatedSubscription = await this.stripe.subscriptions.update(
        subscriptionId, 
        updateData
      );

      console.log('✅ Subscription updated:', subscriptionId);
      return updatedSubscription;
      
    } catch (error) {
      console.error('❌ Error updating subscription:', error);
      throw error;
    }
  }

  // ============================================================================
  // GESTIÓN DE MÉTODOS DE PAGO
  // ============================================================================

  async createPaymentMethod(customerId, paymentMethodData) {
    try {
      console.log('🔵 Creating payment method for customer:', customerId);

      const paymentMethod = await this.stripe.paymentMethods.create(paymentMethodData);
      
      // Attach to customer
      await this.stripe.paymentMethods.attach(paymentMethod.id, {
        customer: customerId
      });

      console.log('✅ Payment method created and attached:', paymentMethod.id);
      return paymentMethod;
      
    } catch (error) {
      console.error('❌ Error creating payment method:', error);
      throw error;
    }
  }

  async getCustomerPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return paymentMethods.data;
      
    } catch (error) {
      console.error('❌ Error fetching payment methods:', error);
      throw error;
    }
  }

  async deletePaymentMethod(paymentMethodId) {
    try {
      console.log('🔵 Deleting payment method:', paymentMethodId);

      const deletedPaymentMethod = await this.stripe.paymentMethods.detach(paymentMethodId);
      
      console.log('✅ Payment method deleted:', paymentMethodId);
      return deletedPaymentMethod;
      
    } catch (error) {
      console.error('❌ Error deleting payment method:', error);
      throw error;
    }
  }

  // ============================================================================
  // SETUP INTENT PARA GUARDAR MÉTODOS DE PAGO
  // ============================================================================

  async createSetupIntent(customerId) {
    try {
      console.log('🔵 Creating setup intent for customer:', customerId);

      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session', // Para pagos futuros
        metadata: {
          app: 'belleza-estetica'
        }
      });

      console.log('✅ Setup intent created:', setupIntent.id);
      return setupIntent;
      
    } catch (error) {
      console.error('❌ Error creating setup intent:', error);
      throw error;
    }
  }

  // ============================================================================
  // WEBHOOKS
  // ============================================================================

  verifyWebhookSignature(payload, signature) {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhook_secret
      );
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  // ============================================================================
  // UTILIDADES
  // ============================================================================

  async getSubscription(subscriptionId) {
    try {
      return await this.stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['default_payment_method', 'latest_invoice']
      });
    } catch (error) {
      console.error('❌ Error retrieving subscription:', error);
      throw error;
    }
  }

  async getCustomer(customerId) {
    try {
      return await this.stripe.customers.retrieve(customerId);
    } catch (error) {
      console.error('❌ Error retrieving customer:', error);
      throw error;
    }
  }

  formatPrice(amount, currency = 'eur') {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  // ============================================================================
  // MANEJO DE ERRORES STRIPE
  // ============================================================================

  handleStripeError(error) {
    console.error('🔴 Stripe Error:', error);
    
    switch (error.type) {
      case 'StripeCardError':
        return {
          type: 'card_error',
          message: 'Tu tarjeta fue rechazada. Verifica los datos o usa otra tarjeta.',
          code: error.code
        };
      
      case 'StripeRateLimitError':
        return {
          type: 'rate_limit',
          message: 'Demasiadas solicitudes. Intenta en unos segundos.',
          code: 'rate_limit'
        };
      
      case 'StripeInvalidRequestError':
        return {
          type: 'invalid_request',
          message: 'Error en la solicitud. Contacta con soporte.',
          code: error.code
        };
      
      case 'StripeAPIError':
        return {
          type: 'api_error', 
          message: 'Error del servidor de pagos. Intenta más tarde.',
          code: 'api_error'
        };
      
      case 'StripeConnectionError':
        return {
          type: 'connection_error',
          message: 'Error de conexión. Verifica tu internet.',
          code: 'connection_error'
        };
      
      case 'StripeAuthenticationError':
        return {
          type: 'authentication_error',
          message: 'Error de autenticación. Contacta con soporte.',
          code: 'authentication_error'
        };
      
      default:
        return {
          type: 'unknown_error',
          message: 'Error inesperado. Contacta con soporte.',
          code: 'unknown'
        };
    }
  }
}

// ============================================================================
// EXPORTAR INSTANCIA ÚNICA
// ============================================================================
const stripeService = new StripeService();
module.exports = stripeService;