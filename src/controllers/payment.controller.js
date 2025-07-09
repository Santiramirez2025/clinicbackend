// ============================================================================
// src/controllers/payment.controller.js - CONTROLADORES PAGO ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const stripeService = require('../services/stripe.service');
const subscriptionService = require('../services/subscription.service');

const prisma = new PrismaClient();

// ============================================================================
// CONTROLADORES DE SUSCRIPCIONES VIP
// ============================================================================

/**
 * Crear nueva suscripción VIP
 */
const createVIPSubscription = async (req, res) => {
  try {
    console.log('🔵 Creating VIP subscription for user:', req.user.userId);
    
    const { planType, paymentMethodId } = req.body;
    const userId = req.user.userId;
    
    const result = await subscriptionService.createVIPSubscription(
      userId,
      planType,
      paymentMethodId
    );
    
    res.status(201).json({
      success: true,
      message: 'Suscripción VIP creada exitosamente',
      data: {
        subscription: result.subscription,
        needsPaymentConfirmation: result.needsPaymentConfirmation,
        clientSecret: result.stripeSubscription.latest_invoice?.payment_intent?.client_secret
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating VIP subscription:', error);
    
    if (error.message.includes('ya tiene una suscripción')) {
      return res.status(409).json({
        success: false,
        error: {
          type: 'subscription_exists',
          message: error.message
        }
      });
    }
    
    res.status(500).json({
      success: false,
      error: {
        type: 'subscription_error',
        message: 'Error creando suscripción VIP'
      }
    });
  }
};

/**
 * Obtener estado de suscripción VIP
 */
const getVIPSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const status = await subscriptionService.getVIPSubscriptionStatus(userId);
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('❌ Error getting VIP subscription status:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        message: 'Error obteniendo estado de suscripción'
      }
    });
  }
};

/**
 * Cancelar suscripción VIP
 */
const cancelVIPSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { immediately = false } = req.body;
    
    const canceledSubscription = await subscriptionService.cancelVIPSubscription(
      userId,
      immediately
    );
    
    res.json({
      success: true,
      message: immediately ? 
        'Suscripción VIP cancelada inmediatamente' : 
        'Suscripción VIP se cancelará al final del período',
      data: {
        subscription: canceledSubscription,
        willCancelAt: immediately ? null : canceledSubscription.currentPeriodEnd
      }
    });
    
  } catch (error) {
    console.error('❌ Error canceling VIP subscription:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'cancellation_error',
        message: 'Error cancelando suscripción VIP'
      }
    });
  }
};

/**
 * Reanudar suscripción VIP
 */
const resumeVIPSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const resumedSubscription = await subscriptionService.resumeVIPSubscription(userId);
    
    res.json({
      success: true,
      message: 'Suscripción VIP reanudada exitosamente',
      data: {
        subscription: resumedSubscription
      }
    });
    
  } catch (error) {
    console.error('❌ Error resuming VIP subscription:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'resume_error',
        message: 'Error reanudando suscripción VIP'
      }
    });
  }
};

/**
 * Cambiar plan de suscripción VIP
 */
const changeVIPPlan = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { newPlanType } = req.body;
    
    if (!['MONTHLY', 'YEARLY'].includes(newPlanType)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'newPlanType debe ser MONTHLY o YEARLY'
        }
      });
    }
    
    const updatedSubscription = await subscriptionService.changeVIPPlan(
      userId,
      newPlanType
    );
    
    res.json({
      success: true,
      message: `Plan cambiado a ${newPlanType} exitosamente`,
      data: {
        subscription: updatedSubscription
      }
    });
    
  } catch (error) {
    console.error('❌ Error changing VIP plan:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'plan_change_error',
        message: 'Error cambiando plan VIP'
      }
    });
  }
};

/**
 * Obtener precios de planes VIP
 */
const getVIPPrices = async (req, res) => {
  try {
    const prices = await stripeService.getVIPPrices();
    
    res.json({
      success: true,
      data: {
        prices,
        currency: 'EUR',
        country: 'ES'
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting VIP prices:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'pricing_error',
        message: 'Error obteniendo precios VIP'
      }
    });
  }
};

// ============================================================================
// CONTROLADORES DE MÉTODOS DE PAGO
// ============================================================================

/**
 * Obtener métodos de pago del usuario
 */
const getPaymentMethods = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Obtener customer de Stripe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        stripeCustomer: true
      }
    });
    
    if (!user?.stripeCustomer) {
      return res.json({
        success: true,
        data: {
          paymentMethods: []
        }
      });
    }
    
    const paymentMethods = await stripeService.getCustomerPaymentMethods(
      user.stripeCustomer.stripeCustomerId
    );
    
    res.json({
      success: true,
      data: {
        paymentMethods: paymentMethods.map(pm => ({
          id: pm.id,
          type: pm.type,
          card: pm.card ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year
          } : null,
          created: pm.created
        }))
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting payment methods:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'payment_methods_error',
        message: 'Error obteniendo métodos de pago'
      }
    });
  }
};

/**
 * Agregar nuevo método de pago
 */
const addPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentMethodId } = req.body;
    
    // Obtener o crear customer
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    const customer = await stripeService.getOrCreateCustomer(user);
    
    // Attach payment method al customer
    await stripeService.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id
    });
    
    res.json({
      success: true,
      message: 'Método de pago agregado exitosamente',
      data: {
        paymentMethodId
      }
    });
    
  } catch (error) {
    console.error('❌ Error adding payment method:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'add_payment_method_error',
        message: 'Error agregando método de pago'
      }
    });
  }
};

/**
 * Eliminar método de pago
 */
const deletePaymentMethod = async (req, res) => {
  try {
    const { paymentMethodId } = req.params;
    
    await stripeService.deletePaymentMethod(paymentMethodId);
    
    res.json({
      success: true,
      message: 'Método de pago eliminado exitosamente'
    });
    
  } catch (error) {
    console.error('❌ Error deleting payment method:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'delete_payment_method_error',
        message: 'Error eliminando método de pago'
      }
    });
  }
};

/**
 * Establecer método de pago como predeterminado
 */
const setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentMethodId } = req.params;
    
    // Obtener customer
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId }
    });
    
    if (!stripeCustomer) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'customer_not_found',
          message: 'Customer no encontrado'
        }
      });
    }
    
    // Actualizar customer con método de pago por defecto
    await stripeService.stripe.customers.update(stripeCustomer.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
    
    res.json({
      success: true,
      message: 'Método de pago establecido como predeterminado'
    });
    
  } catch (error) {
    console.error('❌ Error setting default payment method:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'set_default_payment_method_error',
        message: 'Error estableciendo método de pago predeterminado'
      }
    });
  }
};

// ============================================================================
// CONTROLADORES DE SETUP INTENT
// ============================================================================

/**
 * Crear Setup Intent para guardar método de pago
 */
const createSetupIntent = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Obtener o crear customer
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    const customer = await stripeService.getOrCreateCustomer(user);
    const setupIntent = await stripeService.createSetupIntent(customer.id);
    
    res.json({
      success: true,
      data: {
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating setup intent:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'setup_intent_error',
        message: 'Error creando setup intent'
      }
    });
  }
};

/**
 * Confirmar Setup Intent
 */
const confirmSetupIntent = async (req, res) => {
  try {
    const { setupIntentId } = req.body;
    
    const setupIntent = await stripeService.stripe.setupIntents.retrieve(setupIntentId);
    
    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: {
          type: 'setup_intent_failed',
          message: 'Setup Intent no completado'
        }
      });
    }
    
    res.json({
      success: true,
      message: 'Método de pago guardado exitosamente',
      data: {
        paymentMethodId: setupIntent.payment_method
      }
    });
    
  } catch (error) {
    console.error('❌ Error confirming setup intent:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'confirm_setup_intent_error',
        message: 'Error confirmando setup intent'
      }
    });
  }
};

// ============================================================================
// CONTROLADORES DE CUSTOMER
// ============================================================================

/**
 * Obtener información del customer
 */
const getCustomerInfo = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId },
      include: { user: true }
    });
    
    if (!stripeCustomer) {
      return res.json({
        success: true,
        data: {
          hasStripeCustomer: false
        }
      });
    }
    
    const customer = await stripeService.getCustomer(stripeCustomer.stripeCustomerId);
    
    res.json({
      success: true,
      data: {
        hasStripeCustomer: true,
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          phone: customer.phone,
          created: customer.created,
          defaultPaymentMethod: customer.invoice_settings?.default_payment_method
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting customer info:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'customer_info_error',
        message: 'Error obteniendo información del customer'
      }
    });
  }
};

/**
 * Actualizar información del customer
 */
const updateCustomerInfo = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updateData = req.body;
    
    const updatedCustomer = await stripeService.updateCustomer(userId, updateData);
    
    res.json({
      success: true,
      message: 'Información actualizada exitosamente',
      data: {
        customer: {
          id: updatedCustomer.id,
          email: updatedCustomer.email,
          name: updatedCustomer.name,
          phone: updatedCustomer.phone
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating customer info:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'update_customer_error',
        message: 'Error actualizando información del customer'
      }
    });
  }
};

// ============================================================================
// CONTROLADORES DE FACTURACIÓN
// ============================================================================

/**
 * Obtener facturas del usuario
 */
const getInvoices = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 10, starting_after } = req.query;
    
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId }
    });
    
    if (!stripeCustomer) {
      return res.json({
        success: true,
        data: {
          invoices: [],
          hasMore: false
        }
      });
    }
    
    const invoices = await stripeService.stripe.invoices.list({
      customer: stripeCustomer.stripeCustomerId,
      limit: parseInt(limit),
      starting_after,
      expand: ['data.subscription']
    });
    
    res.json({
      success: true,
      data: {
        invoices: invoices.data.map(invoice => ({
          id: invoice.id,
          number: invoice.number,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: invoice.status,
          paidAt: invoice.status_transitions.paid_at ? 
            new Date(invoice.status_transitions.paid_at * 1000) : null,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          invoicePdf: invoice.invoice_pdf,
          subscription: invoice.subscription?.id
        })),
        hasMore: invoices.has_more
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting invoices:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'invoices_error',
        message: 'Error obteniendo facturas'
      }
    });
  }
};

/**
 * Obtener factura específica
 */
const getInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await stripeService.stripe.invoices.retrieve(invoiceId);
    
    res.json({
      success: true,
      data: {
        invoice: {
          id: invoice.id,
          number: invoice.number,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          status: invoice.status,
          paidAt: invoice.status_transitions.paid_at ? 
            new Date(invoice.status_transitions.paid_at * 1000) : null,
          hostedInvoiceUrl: invoice.hosted_invoice_url,
          invoicePdf: invoice.invoice_pdf
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting invoice:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'invoice_error',
        message: 'Error obteniendo factura'
      }
    });
  }
};

/**
 * Descargar factura en PDF
 */
const downloadInvoice = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    
    const invoice = await stripeService.stripe.invoices.retrieve(invoiceId);
    
    if (!invoice.invoice_pdf) {
      return res.status(404).json({
        success: false,
        error: {
          type: 'pdf_not_found',
          message: 'PDF de factura no disponible'
        }
      });
    }
    
    res.redirect(invoice.invoice_pdf);
    
  } catch (error) {
    console.error('❌ Error downloading invoice:', error);
    res.status(500).json({
      success: false,
      error: {
        type: 'download_error',
        message: 'Error descargando factura'
      }
    });
  }
};

// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {
  // Suscripciones VIP
  createVIPSubscription,
  getVIPSubscriptionStatus,
  cancelVIPSubscription,
  resumeVIPSubscription,
  changeVIPPlan,
  getVIPPrices,
  
  // Métodos de pago
  getPaymentMethods,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  
  // Setup Intent
  createSetupIntent,
  confirmSetupIntent,
  
  // Customer
  getCustomerInfo,
  updateCustomerInfo,
  
  // Facturación
  getInvoices,
  getInvoice,
  downloadInvoice
};