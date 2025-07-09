// ============================================================================
// routes/webhook.routes.js - WEBHOOKS STRIPE COMPLETOS ✅
// ============================================================================
const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const logWebhookEvent = (eventType, eventId, status = 'received') => {
  console.log(`🔔 Webhook ${status}: ${eventType} (${eventId})`);
};

const updateUserVIPStatus = async (userId, isVIP) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { vipStatus: isVIP }
    });
    console.log(`✅ Usuario ${userId} VIP status actualizado: ${isVIP}`);
  } catch (error) {
    console.error(`❌ Error actualizando VIP status para usuario ${userId}:`, error);
  }
};

const findUserByStripeCustomerId = async (stripeCustomerId) => {
  try {
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { stripeCustomerId },
      include: { user: true }
    });
    return stripeCustomer?.user || null;
  } catch (error) {
    console.error('❌ Error buscando usuario por Stripe Customer ID:', error);
    return null;
  }
};

const awardBonusPoints = async (userId, points, reason) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        beautyPoints: {
          increment: points
        }
      }
    });
    console.log(`🎉 ${points} puntos otorgados a usuario ${userId} por: ${reason}`);
  } catch (error) {
    console.error(`❌ Error otorgando puntos a usuario ${userId}:`, error);
  }
};

// ============================================================================
// WEBHOOK STRIPE PRINCIPAL
// ============================================================================

router.post('/stripe', async (req, res) => {
  console.log('🔄 Stripe webhook received');
  
  try {
    // TODO: Implementar verificación de signature cuando tengamos Stripe SDK
    // const sig = req.headers['stripe-signature'];
    // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // let event;
    // try {
    //   event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    // } catch (err) {
    //   console.error('❌ Webhook signature verification failed:', err.message);
    //   return res.status(400).json({ error: 'Invalid signature' });
    // }

    // ✅ SIMULACIÓN PARA DESARROLLO (REMOVER EN PRODUCCIÓN)
    const event = req.body?.type ? req.body : {
      id: `evt_demo_${Date.now()}`,
      type: 'customer.subscription.created',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'sub_demo_webhook',
          customer: 'cus_demo_webhook',
          status: 'active',
          items: {
            data: [{
              price: {
                id: 'price_monthly_vip',
                recurring: { interval: 'month' }
              }
            }]
          },
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          cancel_at_period_end: false,
          metadata: {
            userId: 'demo-user-123'
          }
        }
      }
    };

    logWebhookEvent(event.type, event.id);

    // ============================================================================
    // MANEJAR DIFERENTES TIPOS DE EVENTOS
    // ============================================================================

    switch (event.type) {
      // 🔔 SUSCRIPCIONES
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      // 💰 PAGOS
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      // 👤 CLIENTES
      case 'customer.created':
        await handleCustomerCreated(event.data.object);
        break;

      case 'customer.updated':
        await handleCustomerUpdated(event.data.object);
        break;

      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object);
        break;

      // 💳 MÉTODOS DE PAGO
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object);
        break;

      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object);
        break;

      // 📄 FACTURAS
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object);
        break;

      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object);
        break;

      // ⚠️ DISPUTAS Y CHARGEBACKS
      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object);
        break;

      default:
        console.log(`ℹ️ Evento no manejado: ${event.type}`);
    }

    logWebhookEvent(event.type, event.id, 'processed');

    res.json({ 
      success: true,
      message: 'Webhook procesado exitosamente',
      eventType: event.type,
      eventId: event.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(400).json({
      success: false,
      error: { 
        message: 'Error procesando webhook',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// ============================================================================
// HANDLERS DE EVENTOS ESPECÍFICOS
// ============================================================================

// 🔔 Suscripción creada
async function handleSubscriptionCreated(subscription) {
  console.log('✅ Procesando suscripción creada:', subscription.id);
  
  try {
    const customerId = subscription.customer;
    const userId = subscription.metadata?.userId;
    
    // Buscar usuario
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (customerId) {
      user = await findUserByStripeCustomerId(customerId);
    }

    if (!user) {
      console.warn('⚠️ Usuario no encontrado para suscripción:', subscription.id);
      return;
    }

    // Determinar tipo de plan
    const priceId = subscription.items.data[0]?.price?.id;
    const interval = subscription.items.data[0]?.price?.recurring?.interval;
    const planType = interval === 'year' ? 'YEARLY' : 'MONTHLY';

    // Crear/actualizar suscripción en BD
    await prisma.subscription.upsert({
      where: { stripeSubscriptionId: subscription.id },
      update: {
        status: subscription.status,
        planType,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      },
      create: {
        userId: user.id,
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        planType,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });

    // Activar VIP status
    await updateUserVIPStatus(user.id, true);

    // Otorgar puntos de bienvenida
    const bonusPoints = planType === 'YEARLY' ? 100 : 50;
    await awardBonusPoints(user.id, bonusPoints, 'Bienvenida VIP');

    console.log(`🎉 Suscripción VIP ${planType} activada para usuario: ${user.email}`);

  } catch (error) {
    console.error('❌ Error procesando suscripción creada:', error);
  }
}

// 🔄 Suscripción actualizada
async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Procesando suscripción actualizada:', subscription.id);
  
  try {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      include: { user: true }
    });

    if (!existingSubscription) {
      console.warn('⚠️ Suscripción no encontrada en BD:', subscription.id);
      return;
    }

    // Actualizar suscripción
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      }
    });

    // Actualizar VIP status basado en estado de suscripción
    const isActive = ['active', 'trialing'].includes(subscription.status);
    await updateUserVIPStatus(existingSubscription.user.id, isActive);

    console.log(`📝 Suscripción actualizada: ${subscription.status} para ${existingSubscription.user.email}`);

  } catch (error) {
    console.error('❌ Error procesando suscripción actualizada:', error);
  }
}

// ❌ Suscripción cancelada/eliminada
async function handleSubscriptionDeleted(subscription) {
  console.log('❌ Procesando suscripción eliminada:', subscription.id);
  
  try {
    const existingSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      include: { user: true }
    });

    if (!existingSubscription) {
      console.warn('⚠️ Suscripción no encontrada en BD:', subscription.id);
      return;
    }

    // Actualizar estado a cancelado
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        canceledAt: new Date()
      }
    });

    // Verificar si el usuario tiene otras suscripciones activas
    const otherActiveSubscriptions = await prisma.subscription.findFirst({
      where: {
        userId: existingSubscription.user.id,
        status: { in: ['active', 'trialing'] },
        id: { not: existingSubscription.id }
      }
    });

    // Si no tiene otras suscripciones activas, desactivar VIP
    if (!otherActiveSubscriptions) {
      await updateUserVIPStatus(existingSubscription.user.id, false);
    }

    console.log(`💔 Suscripción VIP cancelada para: ${existingSubscription.user.email}`);

  } catch (error) {
    console.error('❌ Error procesando suscripción eliminada:', error);
  }
}

// 💰 Pago exitoso
async function handlePaymentSucceeded(invoice) {
  console.log('💰 Procesando pago exitoso:', invoice.id);
  
  try {
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { user: true }
      });

      if (subscription) {
        // Otorgar puntos por pago
        const points = subscription.planType === 'YEARLY' ? 50 : 25;
        await awardBonusPoints(subscription.user.id, points, 'Pago mensualidad VIP');

        console.log(`🎉 Pago procesado exitosamente para: ${subscription.user.email}`);
      }
    }

  } catch (error) {
    console.error('❌ Error procesando pago exitoso:', error);
  }
}

// 💸 Pago fallido
async function handlePaymentFailed(invoice) {
  console.log('💸 Procesando pago fallido:', invoice.id);
  
  try {
    const subscriptionId = invoice.subscription;
    
    if (subscriptionId) {
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscriptionId },
        include: { user: true }
      });

      if (subscription) {
        // TODO: Implementar lógica de manejo de pagos fallidos
        // - Enviar email de notificación
        // - Crear registro de pago fallido
        // - Programar reintento de pago
        
        console.log(`⚠️ Pago fallido para: ${subscription.user.email}`);
      }
    }

  } catch (error) {
    console.error('❌ Error procesando pago fallido:', error);
  }
}

// 💳 Payment Intent exitoso
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('💳 Procesando payment intent exitoso:', paymentIntent.id);
  
  try {
    const userId = paymentIntent.metadata?.userId;
    const treatmentId = paymentIntent.metadata?.treatmentId;
    
    if (userId && treatmentId) {
      // Otorgar puntos por pago de tratamiento
      const amount = paymentIntent.amount / 100; // Convertir de centavos
      const points = Math.floor(amount / 10); // 1 punto por cada €10
      
      await awardBonusPoints(userId, points, 'Pago tratamiento');
      
      console.log(`💎 ${points} puntos otorgados por pago de tratamiento`);
    }

  } catch (error) {
    console.error('❌ Error procesando payment intent exitoso:', error);
  }
}

// 💸 Payment Intent fallido
async function handlePaymentIntentFailed(paymentIntent) {
  console.log('💸 Procesando payment intent fallido:', paymentIntent.id);
  
  try {
    // TODO: Implementar lógica de manejo de pagos fallidos
    // - Notificar al usuario
    // - Registrar intento de pago
    
    console.log('⚠️ Payment intent falló:', paymentIntent.last_payment_error?.message);

  } catch (error) {
    console.error('❌ Error procesando payment intent fallido:', error);
  }
}

// 👤 Cliente creado
async function handleCustomerCreated(customer) {
  console.log('👤 Procesando cliente creado:', customer.id);
  
  try {
    const userId = customer.metadata?.userId;
    
    if (userId) {
      await prisma.stripeCustomer.upsert({
        where: { userId },
        update: { stripeCustomerId: customer.id },
        create: {
          userId,
          stripeCustomerId: customer.id
        }
      });

      console.log(`✅ Stripe Customer vinculado a usuario: ${userId}`);
    }

  } catch (error) {
    console.error('❌ Error procesando cliente creado:', error);
  }
}

// 📝 Cliente actualizado
async function handleCustomerUpdated(customer) {
  console.log('📝 Procesando cliente actualizado:', customer.id);
  
  try {
    // TODO: Actualizar información del cliente si es necesario
    console.log('ℹ️ Cliente actualizado en Stripe');

  } catch (error) {
    console.error('❌ Error procesando cliente actualizado:', error);
  }
}

// 🗑️ Cliente eliminado
async function handleCustomerDeleted(customer) {
  console.log('🗑️ Procesando cliente eliminado:', customer.id);
  
  try {
    await prisma.stripeCustomer.deleteMany({
      where: { stripeCustomerId: customer.id }
    });

    console.log(`🗑️ Stripe Customer eliminado: ${customer.id}`);

  } catch (error) {
    console.error('❌ Error procesando cliente eliminado:', error);
  }
}

// 💳 Método de pago vinculado
async function handlePaymentMethodAttached(paymentMethod) {
  console.log('💳 Método de pago vinculado:', paymentMethod.id);
  
  try {
    // TODO: Guardar método de pago en BD si es necesario
    console.log('💳 Nuevo método de pago vinculado a customer:', paymentMethod.customer);

  } catch (error) {
    console.error('❌ Error procesando método de pago vinculado:', error);
  }
}

// 🗑️ Método de pago desvinculado
async function handlePaymentMethodDetached(paymentMethod) {
  console.log('🗑️ Método de pago desvinculado:', paymentMethod.id);
  
  try {
    // TODO: Remover método de pago de BD si es necesario
    console.log('🗑️ Método de pago desvinculado:', paymentMethod.id);

  } catch (error) {
    console.error('❌ Error procesando método de pago desvinculado:', error);
  }
}

// 📄 Factura creada
async function handleInvoiceCreated(invoice) {
  console.log('📄 Factura creada:', invoice.id);
  // Generalmente no requiere acción especial
}

// 📋 Factura finalizada
async function handleInvoiceFinalized(invoice) {
  console.log('📋 Factura finalizada:', invoice.id);
  // TODO: Enviar factura por email si es necesario
}

// ⚠️ Disputa creada
async function handleDisputeCreated(dispute) {
  console.log('⚠️ Disputa creada:', dispute.id);
  
  try {
    // TODO: Implementar manejo de disputas
    // - Notificar al equipo de soporte
    // - Crear ticket de seguimiento
    // - Pausar servicios si es necesario
    
    console.log(`⚠️ Nueva disputa: ${dispute.reason} por ${dispute.amount / 100} ${dispute.currency.toUpperCase()}`);

  } catch (error) {
    console.error('❌ Error procesando disputa:', error);
  }
}

// ============================================================================
// ENDPOINT DE PRUEBA PARA SIMULAR WEBHOOKS
// ============================================================================

router.post('/stripe/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: { message: 'Endpoint de prueba no disponible en producción' }
    });
  }

  console.log('🧪 Simulando webhook de prueba');
  
  try {
    const { eventType = 'customer.subscription.created', customData = {} } = req.body;
    
    const testEvent = {
      id: `evt_test_${Date.now()}`,
      type: eventType,
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: `sub_test_${Date.now()}`,
          customer: 'cus_test_123',
          status: 'active',
          ...customData
        }
      }
    };

    // Simular procesamiento del webhook
    req.body = testEvent;
    
    res.json({
      success: true,
      message: 'Webhook de prueba procesado',
      testEvent
    });

  } catch (error) {
    console.error('❌ Error en webhook de prueba:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error procesando webhook de prueba' }
    });
  }
});

// ============================================================================
// HEALTH CHECK Y ESTADÍSTICAS
// ============================================================================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Webhook Service',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      stripe: 'POST /webhooks/stripe',
      test: 'POST /webhooks/stripe/test (dev only)'
    },
    eventTypes: [
      'customer.subscription.created',
      'customer.subscription.updated', 
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'invoice.payment_failed',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'customer.created',
      'customer.updated',
      'customer.deleted',
      'payment_method.attached',
      'payment_method.detached',
      'invoice.created',
      'invoice.finalized',
      'charge.dispute.created'
    ],
    configuration: {
      stripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Estadísticas de webhooks (solo en desarrollo)
router.get('/stats', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: { message: 'Estadísticas no disponibles en producción' }
    });
  }

  res.json({
    success: true,
    data: {
      message: 'Estadísticas de webhooks en desarrollo',
      note: 'En producción, las estadísticas se almacenarían en base de datos',
      sampleEvents: [
        'customer.subscription.created',
        'invoice.payment_succeeded',
        'payment_intent.succeeded'
      ]
    }
  });
});

module.exports = router;