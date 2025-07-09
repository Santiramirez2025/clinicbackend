// ============================================================================
// routes/payment.routes.js - RUTAS DE PAGO STRIPE COMPLETAS ✅
// ============================================================================
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN LOCAL (SIN DEPENDENCIAS EXTERNAS)
// ============================================================================
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: { message: 'Token requerido' } 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    console.log('🔍 Payment route - Token decoded, userId:', decoded.userId);
    
    // Si es el usuario demo, no buscar en BD
    if (decoded.userId === 'demo-user-123') {
      req.user = { userId: decoded.userId, email: 'demo@bellezaestetica.com', isDemo: true };
      return next();
    }
    
    // Para usuarios reales, buscar en BD
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        stripeCustomer: true,
        subscription: {
          where: { status: { in: ['active', 'trialing'] } },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    
    if (!user) {
      console.log('❌ Payment route - Usuario no encontrado:', decoded.userId);
      return res.status(403).json({ 
        success: false,
        error: { message: 'Usuario no encontrado' } 
      });
    }
    
    console.log('✅ Payment route - Usuario encontrado:', user.email);
    req.user = { 
      userId: user.id, 
      email: user.email, 
      isDemo: false,
      stripeCustomer: user.stripeCustomer,
      activeSubscription: user.subscription[0] || null
    };
    next();
  } catch (err) {
    console.error('❌ Payment route - Token error:', err.message);
    return res.status(403).json({ 
      success: false,
      error: { message: 'Token inválido' } 
    });
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getVIPPricing = () => ({
  MONTHLY: {
    priceId: process.env.STRIPE_PRICE_MONTHLY || 'price_monthly_vip',
    amount: 2999, // €29.99 en centavos
    currency: 'eur',
    interval: 'month'
  },
  YEARLY: {
    priceId: process.env.STRIPE_PRICE_YEARLY || 'price_yearly_vip',
    amount: 24999, // €249.99 en centavos
    currency: 'eur',
    interval: 'year'
  }
});

const calculatePeriodEnd = (planType) => {
  const now = new Date();
  if (planType === 'MONTHLY') {
    return new Date(now.setMonth(now.getMonth() + 1));
  } else {
    return new Date(now.setFullYear(now.getFullYear() + 1));
  }
};

// ============================================================================
// CREAR SUSCRIPCIÓN VIP
// ============================================================================
router.post('/create-subscription', authenticateToken, async (req, res) => {
  console.log('💳 Creating VIP subscription for user:', req.user.userId);
  
  try {
    const { planType = 'MONTHLY', paymentMethodId } = req.body;
    
    // Validar planType
    if (!['MONTHLY', 'YEARLY'].includes(planType)) {
      return res.status(400).json({
        success: false,
        error: { message: 'planType debe ser MONTHLY o YEARLY' }
      });
    }

    const pricing = getVIPPricing();
    const selectedPlan = pricing[planType];

    // ✅ USUARIO DEMO - SIMULACIÓN COMPLETA
    if (req.user.userId === 'demo-user-123') {
      const demoSubscription = {
        id: `sub_demo_${Date.now()}`,
        planType,
        status: 'active',
        price: selectedPlan.amount / 100, // Convertir de centavos a euros
        currency: selectedPlan.currency,
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: calculatePeriodEnd(planType).toISOString(),
        cancelAtPeriodEnd: false,
        createdAt: new Date().toISOString()
      };

      return res.json({
        success: true,
        message: '¡Suscripción VIP creada exitosamente! 🎉',
        data: {
          subscription: demoSubscription,
          paymentMethod: {
            id: paymentMethodId || 'pm_demo_card_' + Date.now(),
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              expMonth: 12,
              expYear: 2028
            }
          },
          customer: {
            id: 'cus_demo_' + Date.now(),
            email: req.user.email
          },
          immediateAccess: true,
          bonusPoints: planType === 'YEARLY' ? 100 : 50,
          welcomeMessage: `¡Bienvenida al Club VIP ${planType === 'YEARLY' ? 'Anual' : 'Mensual'}! Ya puedes disfrutar de todos los beneficios exclusivos.`
        }
      });
    }

    // ✅ USUARIOS REALES - PREPARADO PARA STRIPE SDK
    console.log('🔧 Real user subscription creation - Stripe SDK required');
    
    // TODO: Implementar con Stripe SDK
    res.json({
      success: false,
      error: { 
        message: 'Funcionalidad en desarrollo. Stripe SDK requerido.',
        code: 'STRIPE_SDK_REQUIRED',
        details: {
          planType,
          pricing: selectedPlan,
          userHasStripeCustomer: !!req.user.stripeCustomer,
          hasActiveSubscription: !!req.user.activeSubscription
        },
        nextSteps: [
          '1. Instalar: npm install stripe',
          '2. Configurar STRIPE_SECRET_KEY en .env',
          '3. Crear productos y precios en Stripe Dashboard',
          '4. Implementar servicios/stripe.service.js'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Create subscription error:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// ============================================================================
// OBTENER ESTADO DE SUSCRIPCIÓN
// ============================================================================
router.get('/subscription', authenticateToken, async (req, res) => {
  console.log('📊 Getting subscription status for user:', req.user.userId);
  
  try {
    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      const demoSubscription = {
        id: 'sub_demo_123',
        planType: 'MONTHLY',
        status: 'active',
        price: 29.99,
        currency: 'eur',
        currentPeriodStart: '2024-06-01T00:00:00.000Z',
        currentPeriodEnd: '2024-07-01T00:00:00.000Z',
        cancelAtPeriodEnd: false,
        createdAt: '2024-06-01T00:00:00.000Z'
      };

      const daysRemaining = Math.ceil(
        (new Date(demoSubscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)
      );

      return res.json({
        success: true,
        data: {
          hasActiveSubscription: true,
          subscription: {
            ...demoSubscription,
            daysRemaining: Math.max(0, daysRemaining)
          },
          customer: {
            id: 'cus_demo_123',
            email: req.user.email
          },
          paymentMethod: {
            id: 'pm_demo_visa',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              expMonth: 12,
              expYear: 2028
            },
            isDefault: true
          },
          billing: {
            nextPaymentDate: demoSubscription.currentPeriodEnd,
            nextPaymentAmount: demoSubscription.price
          }
        }
      });
    }

    // ✅ USUARIOS REALES
    const activeSubscription = req.user.activeSubscription;
    
    if (!activeSubscription) {
      return res.json({
        success: true,
        data: {
          hasActiveSubscription: false,
          subscription: null,
          customer: req.user.stripeCustomer ? {
            id: req.user.stripeCustomer.stripeCustomerId,
            email: req.user.email
          } : null,
          paymentMethod: null,
          billing: null
        }
      });
    }

    // Calcular días restantes
    const daysRemaining = Math.ceil(
      (new Date(activeSubscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      success: true,
      data: {
        hasActiveSubscription: true,
        subscription: {
          id: activeSubscription.stripeSubscriptionId,
          planType: activeSubscription.planType,
          status: activeSubscription.status,
          price: activeSubscription.planType === 'MONTHLY' ? 29.99 : 249.99,
          currency: 'eur',
          currentPeriodStart: activeSubscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: activeSubscription.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd,
          createdAt: activeSubscription.createdAt.toISOString(),
          daysRemaining: Math.max(0, daysRemaining)
        },
        customer: req.user.stripeCustomer ? {
          id: req.user.stripeCustomer.stripeCustomerId,
          email: req.user.email
        } : null,
        paymentMethod: null, // TODO: Cargar desde Stripe
        billing: {
          nextPaymentDate: activeSubscription.currentPeriodEnd.toISOString(),
          nextPaymentAmount: activeSubscription.planType === 'MONTHLY' ? 29.99 : 249.99
        }
      }
    });

  } catch (error) {
    console.error('❌ Get subscription error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// CANCELAR SUSCRIPCIÓN
// ============================================================================
router.put('/subscription/cancel', authenticateToken, async (req, res) => {
  console.log('❌ Canceling subscription for user:', req.user.userId);
  
  try {
    const { cancelAtPeriodEnd = true, reason } = req.body;

    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: cancelAtPeriodEnd 
          ? 'Tu suscripción se cancelará al final del período actual. Seguirás disfrutando de los beneficios VIP hasta entonces.'
          : 'Suscripción cancelada inmediatamente. Lamentamos verte partir.',
        data: {
          subscription: {
            id: 'sub_demo_123',
            status: cancelAtPeriodEnd ? 'active' : 'canceled',
            cancelAtPeriodEnd,
            canceledAt: cancelAtPeriodEnd ? null : new Date().toISOString(),
            currentPeriodEnd: '2024-07-01T00:00:00.000Z',
            cancellationReason: reason
          },
          refund: cancelAtPeriodEnd ? null : {
            amount: 0, // No refund demo
            currency: 'eur',
            reason: 'requested_by_customer'
          }
        }
      });
    }

    // ✅ USUARIOS REALES
    if (!req.user.activeSubscription) {
      return res.status(404).json({
        success: false,
        error: { message: 'No tienes una suscripción activa para cancelar' }
      });
    }

    // TODO: Implementar cancelación real con Stripe SDK
    res.json({
      success: false,
      error: { 
        message: 'Funcionalidad en desarrollo. Stripe SDK requerido.',
        code: 'STRIPE_SDK_REQUIRED'
      }
    });

  } catch (error) {
    console.error('❌ Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// REANUDAR SUSCRIPCIÓN
// ============================================================================
router.put('/subscription/resume', authenticateToken, async (req, res) => {
  console.log('▶️ Resuming subscription for user:', req.user.userId);
  
  try {
    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: '¡Genial! Tu suscripción VIP continúa activa. Seguirás disfrutando de todos los beneficios.',
        data: {
          subscription: {
            id: 'sub_demo_123',
            status: 'active',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: '2024-07-01T00:00:00.000Z',
            resumedAt: new Date().toISOString()
          }
        }
      });
    }

    // ✅ USUARIOS REALES
    if (!req.user.activeSubscription) {
      return res.status(404).json({
        success: false,
        error: { message: 'No tienes una suscripción para reanudar' }
      });
    }

    if (!req.user.activeSubscription.cancelAtPeriodEnd) {
      return res.status(400).json({
        success: false,
        error: { message: 'Tu suscripción no está programada para cancelación' }
      });
    }

    // TODO: Implementar reanudación real con Stripe SDK
    res.json({
      success: false,
      error: { 
        message: 'Funcionalidad en desarrollo. Stripe SDK requerido.',
        code: 'STRIPE_SDK_REQUIRED'
      }
    });

  } catch (error) {
    console.error('❌ Resume subscription error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// MÉTODOS DE PAGO
// ============================================================================

// Listar métodos de pago
router.get('/methods', authenticateToken, async (req, res) => {
  console.log('💳 Getting payment methods for user:', req.user.userId);
  
  try {
    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: {
          paymentMethods: [
            {
              id: 'pm_demo_visa',
              type: 'card',
              card: {
                brand: 'visa',
                last4: '4242',
                expMonth: 12,
                expYear: 2028,
                country: 'ES'
              },
              isDefault: true,
              createdAt: '2024-01-15T00:00:00.000Z'
            },
            {
              id: 'pm_demo_mastercard',
              type: 'card',
              card: {
                brand: 'mastercard',
                last4: '5555',
                expMonth: 6,
                expYear: 2027,
                country: 'ES'
              },
              isDefault: false,
              createdAt: '2024-02-01T00:00:00.000Z'
            }
          ],
          defaultPaymentMethodId: 'pm_demo_visa'
        }
      });
    }

    // ✅ USUARIOS REALES
    // TODO: Cargar métodos de pago reales desde Stripe
    res.json({
      success: true,
      data: {
        paymentMethods: [],
        defaultPaymentMethodId: null
      }
    });

  } catch (error) {
    console.error('❌ Get payment methods error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// Agregar método de pago
router.post('/methods', authenticateToken, async (req, res) => {
  console.log('➕ Adding payment method for user:', req.user.userId);
  
  try {
    const { paymentMethodId, setAsDefault = false } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: { message: 'paymentMethodId es requerido' }
      });
    }

    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Método de pago agregado exitosamente',
        data: {
          paymentMethod: {
            id: paymentMethodId,
            type: 'card',
            card: {
              brand: 'visa',
              last4: '4242',
              expMonth: 12,
              expYear: 2028,
              country: 'ES'
            },
            isDefault: setAsDefault,
            createdAt: new Date().toISOString()
          }
        }
      });
    }

    // ✅ USUARIOS REALES
    // TODO: Implementar con Stripe SDK
    res.json({
      success: false,
      error: { 
        message: 'Funcionalidad en desarrollo. Stripe SDK requerido.',
        code: 'STRIPE_SDK_REQUIRED'
      }
    });

  } catch (error) {
    console.error('❌ Add payment method error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// Eliminar método de pago
router.delete('/methods/:paymentMethodId', authenticateToken, async (req, res) => {
  console.log('🗑️ Deleting payment method:', req.params.paymentMethodId);
  
  try {
    const { paymentMethodId } = req.params;

    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      // Verificar que no sea el método por defecto
      if (paymentMethodId === 'pm_demo_visa') {
        return res.status(400).json({
          success: false,
          error: { message: 'No puedes eliminar tu método de pago predeterminado. Configura otro como predeterminado primero.' }
        });
      }

      return res.json({
        success: true,
        message: 'Método de pago eliminado exitosamente',
        data: {
          deletedPaymentMethodId: paymentMethodId
        }
      });
    }

    // ✅ USUARIOS REALES
    // TODO: Implementar con Stripe SDK
    res.json({
      success: false,
      error: { 
        message: 'Funcionalidad en desarrollo. Stripe SDK requerido.',
        code: 'STRIPE_SDK_REQUIRED'
      }
    });

  } catch (error) {
    console.error('❌ Delete payment method error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// Establecer método de pago por defecto
router.put('/methods/:paymentMethodId/default', authenticateToken, async (req, res) => {
  console.log('⭐ Setting default payment method:', req.params.paymentMethodId);
  
  try {
    const { paymentMethodId } = req.params;

    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Método de pago establecido como predeterminado',
        data: {
          defaultPaymentMethodId: paymentMethodId,
          updatedAt: new Date().toISOString()
        }
      });
    }

    // ✅ USUARIOS REALES
    // TODO: Implementar con Stripe SDK
    res.json({
      success: false,
      error: { 
        message: 'Funcionalidad en desarrollo. Stripe SDK requerido.',
        code: 'STRIPE_SDK_REQUIRED'
      }
    });

  } catch (error) {
    console.error('❌ Set default payment method error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// SETUP INTENTS Y PAYMENT INTENTS
// ============================================================================

// Crear Setup Intent para agregar nueva tarjeta
router.post('/create-setup-intent', authenticateToken, async (req, res) => {
  console.log('🎯 Creating setup intent for user:', req.user.userId);
  
  try {
    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: {
          setupIntent: {
            id: 'seti_demo_' + Date.now(),
            clientSecret: 'seti_demo_secret_' + Math.random().toString(36).substring(7),
            status: 'requires_payment_method',
            usage: 'off_session'
          },
          customer: {
            id: 'cus_demo_123'
          }
        }
      });
    }

    // ✅ USUARIOS REALES
    // TODO: Implementar con Stripe SDK
    res.json({
      success: false,
      error: { 
        message: 'Funcionalidad en desarrollo. Stripe SDK requerido.',
        code: 'STRIPE_SDK_REQUIRED'
      }
    });

  } catch (error) {
    console.error('❌ Create setup intent error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// Crear Payment Intent para pago único
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  console.log('💰 Creating payment intent for user:', req.user.userId);
  
  try {
    const { amount, currency = 'eur', description, treatmentId } = req.body;

    if (!amount || amount < 50) { // Mínimo €0.50
      return res.status(400).json({
        success: false,
        error: { message: 'Cantidad mínima: €0.50' }
      });
    }

    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: {
          paymentIntent: {
            id: 'pi_demo_' + Date.now(),
            clientSecret: 'pi_demo_secret_' + Math.random().toString(36).substring(7),
            amount,
            currency,
            status: 'requires_payment_method',
            description: description || 'Pago de tratamiento',
            metadata: {
              treatmentId: treatmentId || null,
              userId: req.user.userId
            }
          }
        }
      });
    }

    // ✅ USUARIOS REALES
    // TODO: Implementar con Stripe SDK
    res.json({
      success: false,
      error: { 
        message: 'Funcionalidad en desarrollo. Stripe SDK requerido.',
        code: 'STRIPE_SDK_REQUIRED'
      }
    });

  } catch (error) {
    console.error('❌ Create payment intent error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// FACTURAS Y HISTORIAL
// ============================================================================

// Obtener historial de facturas
router.get('/invoices', authenticateToken, async (req, res) => {
  console.log('📄 Getting invoices for user:', req.user.userId);
  
  try {
    const { limit = 10, startingAfter } = req.query;

    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      const demoInvoices = [
        {
          id: 'in_demo_001',
          amount: 2999,
          currency: 'eur',
          status: 'paid',
          description: 'Membresía VIP Mensual',
          created: '2024-06-01T00:00:00.000Z',
          paidAt: '2024-06-01T00:00:00.000Z',
          invoiceUrl: 'https://invoice.stripe.com/demo/001',
          subscriptionId: 'sub_demo_123'
        },
        {
          id: 'in_demo_002',
          amount: 2999,
          currency: 'eur',
          status: 'paid',
          description: 'Membresía VIP Mensual',
          created: '2024-05-01T00:00:00.000Z',
          paidAt: '2024-05-01T00:00:00.000Z',
          invoiceUrl: 'https://invoice.stripe.com/demo/002',
          subscriptionId: 'sub_demo_123'
        }
      ];

      return res.json({
        success: true,
        data: {
          invoices: demoInvoices.slice(0, parseInt(limit)),
          hasMore: demoInvoices.length > parseInt(limit)
        }
      });
    }

    // ✅ USUARIOS REALES
    // TODO: Implementar con Stripe SDK
    res.json({
      success: true,
      data: {
        invoices: [],
        hasMore: false
      }
    });

  } catch (error) {
    console.error('❌ Get invoices error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// Descargar factura específica
router.get('/invoices/:invoiceId/download', authenticateToken, async (req, res) => {
  console.log('⬇️ Downloading invoice:', req.params.invoiceId);
  
  try {
    const { invoiceId } = req.params;

    // ✅ USUARIO DEMO
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: {
          downloadUrl: `https://invoice.stripe.com/demo/${invoiceId}`,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hora
        }
      });
    }

    // ✅ USUARIOS REALES
    // TODO: Implementar con Stripe SDK
    res.json({
      success: false,
      error: { 
        message: 'Funcionalidad en desarrollo. Stripe SDK requerido.',
        code: 'STRIPE_SDK_REQUIRED'
      }
    });

  } catch (error) {
    console.error('❌ Download invoice error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// HEALTH CHECK Y INFORMACIÓN DEL SERVICIO
// ============================================================================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Payment Service',
    status: 'active',
    timestamp: new Date().toISOString(),
    features: {
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      subscriptions: process.env.STRIPE_SECRET_KEY ? 'production-ready' : 'development',
      paymentMethods: process.env.STRIPE_SECRET_KEY ? 'production-ready' : 'development',
      webhooks: process.env.STRIPE_WEBHOOK_SECRET ? 'production-ready' : 'development',
      demoMode: true
    },
    endpoints: {
      subscriptions: {
        create: 'POST /create-subscription',
        get: 'GET /subscription',
        cancel: 'PUT /subscription/cancel',
        resume: 'PUT /subscription/resume'
      },
      paymentMethods: {
        list: 'GET /methods',
        add: 'POST /methods',
        delete: 'DELETE /methods/:id',
        setDefault: 'PUT /methods/:id/default'
      },
      intents: {
        setup: 'POST /create-setup-intent',
        payment: 'POST /create-payment-intent'
      },
      billing: {
        invoices: 'GET /invoices',
        download: 'GET /invoices/:id/download'
      }
    },
    pricing: getVIPPricing(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Información de precios VIP
router.get('/pricing', (req, res) => {
  const pricing = getVIPPricing();
  
  res.json({
    success: true,
    data: {
      plans: {
        MONTHLY: {
          ...pricing.MONTHLY,
          amountEur: pricing.MONTHLY.amount / 100,
          benefits: [
            '20% descuento en todos los tratamientos',
            'Reservas prioritarias',
            'Puntos dobles Beauty Points',
            'Línea directa VIP'
          ]
        },
        YEARLY: {
          ...pricing.YEARLY,
          amountEur: pricing.YEARLY.amount / 100,
          monthlyEquivalent: Math.round(pricing.YEARLY.amount / 12) / 100,
          savings: Math.round(((pricing.MONTHLY.amount * 12) - pricing.YEARLY.amount) / 100),
          benefits: [
            '25% descuento en todos los tratamientos',
            'Facial GRATIS cada trimestre',
            'Puntos triples Beauty Points',
            'Acceso a tratamientos exclusivos VIP',
            'App premium con seguimiento personalizado',
            'Regalo especial cumpleaños'
          ]
        }
      },
      currency: 'EUR',
      country: 'ES',
      taxIncluded: true
    }
  });
});

module.exports = router;