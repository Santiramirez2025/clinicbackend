// ============================================================================
// src/middleware/stripe.middleware.js - VALIDACIÓN WEBHOOKS ✅
// ============================================================================
const stripeService = require('../services/stripe.service');

// ============================================================================
// MIDDLEWARE PARA VERIFICAR WEBHOOKS DE STRIPE
// ============================================================================

/**
 * Middleware para verificar la signature de webhooks de Stripe
 * Debe usarse ANTES de parsear el body como JSON
 */
const verifyStripeWebhook = (req, res, next) => {
  try {
    console.log('🔍 Verifying Stripe webhook signature...');
    
    // Obtener signature del header
    const signature = req.get('stripe-signature');
    
    if (!signature) {
      console.error('❌ Missing Stripe signature header');
      return res.status(400).json({
        error: 'Missing Stripe signature'
      });
    }

    // Verificar que tengamos el body raw
    if (!req.body) {
      console.error('❌ Missing request body for webhook verification');
      return res.status(400).json({
        error: 'Missing request body'
      });
    }

    // Verificar signature y construir evento
    const event = stripeService.verifyWebhookSignature(req.body, signature);
    
    console.log(`✅ Webhook signature verified - Event: ${event.type} - ID: ${event.id}`);
    
    // Agregar evento verificado al request
    req.stripeEvent = event;
    
    next();
    
  } catch (error) {
    console.error('❌ Webhook verification failed:', error.message);
    
    // Responder con error 400 para signatures inválidas
    return res.status(400).json({
      error: 'Invalid webhook signature',
      message: error.message
    });
  }
};

// ============================================================================
// MIDDLEWARE PARA VALIDAR DATOS DE PAGO
// ============================================================================

/**
 * Validar datos de suscripción VIP
 */
const validateVIPSubscriptionData = (req, res, next) => {
  try {
    const { planType, paymentMethodId } = req.body;
    
    // Validar planType
    if (!planType) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'planType es requerido',
          field: 'planType'
        }
      });
    }
    
    if (!['MONTHLY', 'YEARLY'].includes(planType)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'planType debe ser MONTHLY o YEARLY',
          field: 'planType'
        }
      });
    }
    
    // Validar paymentMethodId si se proporciona
    if (paymentMethodId && typeof paymentMethodId !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'paymentMethodId debe ser string',
          field: 'paymentMethodId'
        }
      });
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    return res.status(400).json({
      success: false,
      error: {
        type: 'validation_error',
        message: 'Error validando datos de suscripción'
      }
    });
  }
};

/**
 * Validar datos de método de pago
 */
const validatePaymentMethodData = (req, res, next) => {
  try {
    const { paymentMethodId } = req.body;
    
    if (!paymentMethodId) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'paymentMethodId es requerido',
          field: 'paymentMethodId'
        }
      });
    }
    
    if (typeof paymentMethodId !== 'string' || paymentMethodId.length < 10) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'paymentMethodId inválido',
          field: 'paymentMethodId'
        }
      });
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    return res.status(400).json({
      success: false,
      error: {
        type: 'validation_error',
        message: 'Error validando método de pago'
      }
    });
  }
};

/**
 * Validar datos de customer
 */
const validateCustomerData = (req, res, next) => {
  try {
    const { name, email, phone } = req.body;
    
    // Validar email si se proporciona
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'Email inválido',
          field: 'email'
        }
      });
    }
    
    // Validar name si se proporciona
    if (name && (typeof name !== 'string' || name.length < 2)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'Nombre debe tener al menos 2 caracteres',
          field: 'name'
        }
      });
    }
    
    // Validar phone si se proporciona
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'validation_error',
          message: 'Teléfono inválido',
          field: 'phone'
        }
      });
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Validation error:', error);
    return res.status(400).json({
      success: false,
      error: {
        type: 'validation_error',
        message: 'Error validando datos de customer'
      }
    });
  }
};

// ============================================================================
// MIDDLEWARE PARA VERIFICAR ESTADO VIP
// ============================================================================

/**
 * Verificar que el usuario tiene suscripción VIP activa
 */
const requireActiveVIPSubscription = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    const subscription = await prisma.vipSubscription.findFirst({
      where: {
        userId: userId,
        status: 'ACTIVE'
      }
    });
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: {
          type: 'subscription_required',
          message: 'Se requiere suscripción VIP activa',
          code: 'no_active_subscription'
        }
      });
    }
    
    // Verificar que no esté expirada
    const now = new Date();
    if (now > subscription.currentPeriodEnd) {
      return res.status(403).json({
        success: false,
        error: {
          type: 'subscription_expired',
          message: 'Suscripción VIP expirada',
          code: 'subscription_expired'
        }
      });
    }
    
    req.vipSubscription = subscription;
    next();
    
  } catch (error) {
    console.error('❌ Error checking VIP subscription:', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        message: 'Error verificando suscripción VIP'
      }
    });
  }
};

/**
 * Verificar que el usuario NO tiene suscripción VIP activa
 */
const requireNoActiveVIPSubscription = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    
    const subscription = await prisma.vipSubscription.findFirst({
      where: {
        userId: userId,
        status: 'ACTIVE'
      }
    });
    
    if (subscription) {
      return res.status(409).json({
        success: false,
        error: {
          type: 'subscription_exists',
          message: 'Ya tienes una suscripción VIP activa',
          code: 'active_subscription_exists'
        }
      });
    }
    
    next();
    
  } catch (error) {
    console.error('❌ Error checking VIP subscription:', error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'server_error',
        message: 'Error verificando suscripción VIP'
      }
    });
  }
};

// ============================================================================
// MIDDLEWARE PARA MANEJO DE ERRORES STRIPE
// ============================================================================

/**
 * Middleware para manejar errores específicos de Stripe
 */
const handleStripeErrors = (error, req, res, next) => {
  // Si no es error de Stripe, pasar al siguiente handler
  if (!error.type || !error.type.startsWith('Stripe')) {
    return next(error);
  }
  
  console.error('🔴 Stripe Error:', error);
  
  const stripeError = stripeService.handleStripeError(error);
  
  // Mapear códigos de error a status HTTP
  const statusMap = {
    'card_error': 402,           // Payment Required
    'rate_limit': 429,           // Too Many Requests
    'invalid_request': 400,      // Bad Request
    'api_error': 502,            // Bad Gateway
    'connection_error': 503,     // Service Unavailable
    'authentication_error': 500, // Internal Server Error
    'unknown_error': 500         // Internal Server Error
  };
  
  const status = statusMap[stripeError.type] || 500;
  
  res.status(status).json({
    success: false,
    error: {
      type: 'payment_error',
      message: stripeError.message,
      code: stripeError.code,
      stripeType: error.type
    }
  });
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Validar formato de email
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validar formato de teléfono (España)
 */
function isValidPhone(phone) {
  // Formato español: +34XXXXXXXXX o 6XXXXXXXX o 9XXXXXXXX
  const phoneRegex = /^(\+34|0034)?[6789]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Sanitizar datos de entrada
 */
function sanitizeInput(obj) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Remover caracteres peligrosos
      sanitized[key] = value.trim().replace(/[<>]/g, '');
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// ============================================================================
// MIDDLEWARE DE LOGGING PARA AUDITORÍA
// ============================================================================

/**
 * Log de operaciones de pago para auditoría
 */
const logPaymentOperation = (operation) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    // Log inicial
    console.log(`💳 Payment Operation: ${operation}`, {
      userId: req.user?.userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    // Override res.json para log de respuesta
    const originalJson = res.json;
    res.json = function(body) {
      const duration = Date.now() - startTime;
      
      console.log(`💳 Payment Operation Complete: ${operation}`, {
        userId: req.user?.userId,
        success: body.success,
        duration: `${duration}ms`,
        statusCode: res.statusCode
      });
      
      return originalJson.call(this, body);
    };
    
    next();
  };
};

// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {
  verifyStripeWebhook,
  validateVIPSubscriptionData,
  validatePaymentMethodData,
  validateCustomerData,
  requireActiveVIPSubscription,
  requireNoActiveVIPSubscription,
  handleStripeErrors,
  logPaymentOperation,
  sanitizeInput
};