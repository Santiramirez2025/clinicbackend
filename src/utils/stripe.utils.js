// ============================================================================
// src/utils/stripe.utils.js - HELPERS STRIPE ✅
// ============================================================================

// ============================================================================
// FORMATEO DE PRECIOS Y MONEDAS
// ============================================================================

/**
 * Formatear precio en cents a formato legible
 * @param {number} amount - Cantidad en cents
 * @param {string} currency - Código de moneda (EUR, USD, etc.)
 * @param {string} locale - Locale para formateo (es-ES, en-US, etc.)
 * @returns {string} Precio formateado
 */
function formatPrice(amount, currency = 'EUR', locale = 'es-ES') {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount / 100);
    } catch (error) {
      console.error('Error formatting price:', error);
      return `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
    }
  }
  
  /**
   * Convertir precio a cents
   * @param {number} amount - Cantidad en unidad principal (euros, dólares, etc.)
   * @returns {number} Cantidad en cents
   */
  function toCents(amount) {
    return Math.round(amount * 100);
  }
  
  /**
   * Convertir cents a unidad principal
   * @param {number} cents - Cantidad en cents
   * @returns {number} Cantidad en unidad principal
   */
  function fromCents(cents) {
    return cents / 100;
  }
  
  /**
   * Calcular descuento
   * @param {number} originalPrice - Precio original en cents
   * @param {number} discountPercent - Porcentaje de descuento (0-100)
   * @returns {object} Objeto con precio original, descuento y precio final
   */
  function calculateDiscount(originalPrice, discountPercent) {
    const discountAmount = Math.round((originalPrice * discountPercent) / 100);
    const finalPrice = originalPrice - discountAmount;
    
    return {
      originalPrice,
      discountAmount,
      finalPrice,
      discountPercent,
      savings: discountAmount
    };
  }
  
  // ============================================================================
  // VALIDACIÓN DE DATOS
  // ============================================================================
  
  /**
   * Validar formato de Payment Method ID
   * @param {string} paymentMethodId - ID del método de pago
   * @returns {boolean} True si es válido
   */
  function isValidPaymentMethodId(paymentMethodId) {
    if (!paymentMethodId || typeof paymentMethodId !== 'string') {
      return false;
    }
    
    // Stripe payment method IDs empiezan con "pm_" y tienen al menos 24 caracteres
    return /^pm_[a-zA-Z0-9]{20,}$/.test(paymentMethodId);
  }
  
  /**
   * Validar formato de Customer ID
   * @param {string} customerId - ID del customer
   * @returns {boolean} True si es válido
   */
  function isValidCustomerId(customerId) {
    if (!customerId || typeof customerId !== 'string') {
      return false;
    }
    
    // Stripe customer IDs empiezan con "cus_"
    return /^cus_[a-zA-Z0-9]{14,}$/.test(customerId);
  }
  
  /**
   * Validar formato de Subscription ID
   * @param {string} subscriptionId - ID de la suscripción
   * @returns {boolean} True si es válido
   */
  function isValidSubscriptionId(subscriptionId) {
    if (!subscriptionId || typeof subscriptionId !== 'string') {
      return false;
    }
    
    // Stripe subscription IDs empiezan con "sub_"
    return /^sub_[a-zA-Z0-9]{14,}$/.test(subscriptionId);
  }
  
  /**
   * Validar formato de Invoice ID
   * @param {string} invoiceId - ID de la factura
   * @returns {boolean} True si es válido
   */
  function isValidInvoiceId(invoiceId) {
    if (!invoiceId || typeof invoiceId !== 'string') {
      return false;
    }
    
    // Stripe invoice IDs empiezan con "in_"
    return /^in_[a-zA-Z0-9]{14,}$/.test(invoiceId);
  }
  
  /**
   * Validar datos de tarjeta
   * @param {object} cardData - Datos de la tarjeta
   * @returns {object} Resultado de validación
   */
  function validateCardData(cardData) {
    const errors = [];
    
    if (!cardData) {
      return { isValid: false, errors: ['Datos de tarjeta requeridos'] };
    }
    
    // Validar número de tarjeta (algoritmo de Luhn simplificado)
    if (!cardData.number || !isValidCardNumber(cardData.number)) {
      errors.push('Número de tarjeta inválido');
    }
    
    // Validar mes de expiración
    if (!cardData.exp_month || cardData.exp_month < 1 || cardData.exp_month > 12) {
      errors.push('Mes de expiración inválido');
    }
    
    // Validar año de expiración
    const currentYear = new Date().getFullYear();
    if (!cardData.exp_year || cardData.exp_year < currentYear || cardData.exp_year > currentYear + 20) {
      errors.push('Año de expiración inválido');
    }
    
    // Validar CVC
    if (!cardData.cvc || !/^\d{3,4}$/.test(cardData.cvc)) {
      errors.push('CVC inválido');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validar número de tarjeta usando algoritmo de Luhn
   * @param {string} cardNumber - Número de tarjeta
   * @returns {boolean} True si es válido
   */
  function isValidCardNumber(cardNumber) {
    if (!cardNumber || typeof cardNumber !== 'string') {
      return false;
    }
    
    // Remover espacios y guiones
    const number = cardNumber.replace(/[\s-]/g, '');
    
    // Verificar que solo contenga dígitos
    if (!/^\d+$/.test(number)) {
      return false;
    }
    
    // Verificar longitud (13-19 dígitos)
    if (number.length < 13 || number.length > 19) {
      return false;
    }
    
    // Algoritmo de Luhn
    let sum = 0;
    let alternate = false;
    
    for (let i = number.length - 1; i >= 0; i--) {
      let digit = parseInt(number.charAt(i), 10);
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return sum % 10 === 0;
  }
  
  // ============================================================================
  // MANEJO DE FECHAS Y PERÍODOS
  // ============================================================================
  
  /**
   * Calcular fecha de fin de período
   * @param {Date} startDate - Fecha de inicio
   * @param {string} interval - Intervalo ('month' o 'year')
   * @param {number} intervalCount - Número de intervalos (por defecto 1)
   * @returns {Date} Fecha de fin del período
   */
  function calculatePeriodEnd(startDate, interval, intervalCount = 1) {
    const endDate = new Date(startDate);
    
    if (interval === 'month') {
      endDate.setMonth(endDate.getMonth() + intervalCount);
    } else if (interval === 'year') {
      endDate.setFullYear(endDate.getFullYear() + intervalCount);
    }
    
    return endDate;
  }
  
  /**
   * Calcular días hasta la fecha
   * @param {Date|string} targetDate - Fecha objetivo
   * @returns {number} Días hasta la fecha (negativo si ya pasó)
   */
  function daysUntil(targetDate) {
    const target = new Date(targetDate);
    const now = new Date();
    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
  
  /**
   * Verificar si una suscripción está próxima a vencer
   * @param {Date|string} endDate - Fecha de fin de período
   * @param {number} warningDays - Días de anticipación para advertencia (por defecto 7)
   * @returns {object} Estado de la suscripción
   */
  function getSubscriptionStatus(endDate, warningDays = 7) {
    const daysRemaining = daysUntil(endDate);
    
    return {
      daysRemaining,
      isExpired: daysRemaining < 0,
      isExpiringSoon: daysRemaining >= 0 && daysRemaining <= warningDays,
      isActive: daysRemaining > warningDays,
      expiresAt: new Date(endDate)
    };
  }
  
  // ============================================================================
  // MAPEO DE DATOS STRIPE
  // ============================================================================
  
  /**
   * Mapear objeto Subscription de Stripe a formato local
   * @param {object} stripeSubscription - Suscripción de Stripe
   * @returns {object} Suscripción en formato local
   */
  function mapStripeSubscription(stripeSubscription) {
    if (!stripeSubscription) return null;
    
    return {
      id: stripeSubscription.id,
      customerId: stripeSubscription.customer,
      status: stripeSubscription.status,
      currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
      trialStart: stripeSubscription.trial_start ? new Date(stripeSubscription.trial_start * 1000) : null,
      trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
      price: stripeSubscription.items?.data?.[0]?.price,
      defaultPaymentMethod: stripeSubscription.default_payment_method,
      latestInvoice: stripeSubscription.latest_invoice,
      created: new Date(stripeSubscription.created * 1000)
    };
  }
  
  /**
   * Mapear objeto PaymentMethod de Stripe a formato local
   * @param {object} stripePaymentMethod - Payment Method de Stripe
   * @returns {object} Payment Method en formato local
   */
  function mapStripePaymentMethod(stripePaymentMethod) {
    if (!stripePaymentMethod) return null;
    
    return {
      id: stripePaymentMethod.id,
      type: stripePaymentMethod.type,
      card: stripePaymentMethod.card ? {
        brand: stripePaymentMethod.card.brand,
        last4: stripePaymentMethod.card.last4,
        expMonth: stripePaymentMethod.card.exp_month,
        expYear: stripePaymentMethod.card.exp_year,
        funding: stripePaymentMethod.card.funding,
        country: stripePaymentMethod.card.country
      } : null,
      billingDetails: stripePaymentMethod.billing_details,
      created: new Date(stripePaymentMethod.created * 1000)
    };
  }
  
  /**
   * Mapear objeto Invoice de Stripe a formato local
   * @param {object} stripeInvoice - Invoice de Stripe
   * @returns {object} Invoice en formato local
   */
  function mapStripeInvoice(stripeInvoice) {
    if (!stripeInvoice) return null;
    
    return {
      id: stripeInvoice.id,
      number: stripeInvoice.number,
      customerId: stripeInvoice.customer,
      subscriptionId: stripeInvoice.subscription,
      status: stripeInvoice.status,
      amountDue: fromCents(stripeInvoice.amount_due),
      amountPaid: fromCents(stripeInvoice.amount_paid),
      currency: stripeInvoice.currency,
      description: stripeInvoice.description,
      hostedInvoiceUrl: stripeInvoice.hosted_invoice_url,
      invoicePdf: stripeInvoice.invoice_pdf,
      paidAt: stripeInvoice.status_transitions?.paid_at ? 
        new Date(stripeInvoice.status_transitions.paid_at * 1000) : null,
      created: new Date(stripeInvoice.created * 1000),
      dueDate: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null
    };
  }
  
  // ============================================================================
  // GENERACIÓN DE METADATOS
  // ============================================================================
  
  /**
   * Generar metadata estándar para objetos Stripe
   * @param {object} options - Opciones para metadata
   * @returns {object} Metadata para Stripe
   */
  function generateMetadata(options = {}) {
    const {
      userId,
      userEmail,
      feature = 'vip-membership',
      source = 'mobile-app',
      version = '1.0.0'
    } = options;
    
    return {
      app: 'belleza-estetica',
      feature,
      source,
      version,
      userId,
      userEmail,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };
  }
  
  // ============================================================================
  // ANÁLISIS DE ERRORES
  // ============================================================================
  
  /**
   * Analizar error de Stripe y generar mensaje amigable
   * @param {object} error - Error de Stripe
   * @returns {object} Información del error procesada
   */
  function analyzeStripeError(error) {
    const errorInfo = {
      type: error.type || 'unknown_error',
      code: error.code || 'unknown',
      message: 'Error procesando el pago',
      userMessage: 'Ocurrió un error inesperado. Intenta nuevamente.',
      shouldRetry: false,
      suggestedAction: null
    };
    
    switch (error.type) {
      case 'StripeCardError':
        errorInfo.userMessage = 'Tu tarjeta fue rechazada. Verifica los datos o usa otra tarjeta.';
        errorInfo.shouldRetry = true;
        errorInfo.suggestedAction = 'update_payment_method';
        break;
        
      case 'StripeRateLimitError':
        errorInfo.userMessage = 'Demasiadas solicitudes. Intenta en unos segundos.';
        errorInfo.shouldRetry = true;
        errorInfo.suggestedAction = 'wait_and_retry';
        break;
        
      case 'StripeInvalidRequestError':
        errorInfo.userMessage = 'Error en la solicitud. Contacta con soporte.';
        errorInfo.shouldRetry = false;
        errorInfo.suggestedAction = 'contact_support';
        break;
        
      case 'StripeAPIError':
        errorInfo.userMessage = 'Error del servidor de pagos. Intenta más tarde.';
        errorInfo.shouldRetry = true;
        errorInfo.suggestedAction = 'try_later';
        break;
        
      case 'StripeConnectionError':
        errorInfo.userMessage = 'Error de conexión. Verifica tu internet.';
        errorInfo.shouldRetry = true;
        errorInfo.suggestedAction = 'check_connection';
        break;
        
      case 'StripeAuthenticationError':
        errorInfo.userMessage = 'Error de autenticación. Contacta con soporte.';
        errorInfo.shouldRetry = false;
        errorInfo.suggestedAction = 'contact_support';
        break;
    }
    
    // Análisis específico por código de error
    if (error.code) {
      switch (error.code) {
        case 'card_declined':
          errorInfo.userMessage = 'Tu tarjeta fue rechazada. Contacta con tu banco o usa otra tarjeta.';
          break;
        case 'insufficient_funds':
          errorInfo.userMessage = 'Fondos insuficientes en tu tarjeta.';
          break;
        case 'expired_card':
          errorInfo.userMessage = 'Tu tarjeta ha expirado. Actualiza la información.';
          break;
        case 'incorrect_cvc':
          errorInfo.userMessage = 'Código CVC incorrecto. Verifica el código de seguridad.';
          break;
        case 'processing_error':
          errorInfo.userMessage = 'Error procesando el pago. Intenta nuevamente.';
          errorInfo.shouldRetry = true;
          break;
      }
    }
    
    return errorInfo;
  }
  
  // ============================================================================
  // UTILIDADES DE CONFIGURACIÓN
  // ============================================================================
  
  /**
   * Obtener configuración de Stripe según el entorno
   * @returns {object} Configuración de Stripe
   */
  function getStripeConfig() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return {
      apiVersion: '2023-10-16',
      maxNetworkRetries: 3,
      timeout: 30000, // 30 segundos
      telemetry: !isDevelopment,
      appInfo: {
        name: 'Belleza Estética VIP',
        version: '1.0.0',
        url: 'https://belleza-estetica.app'
      }
    };
  }
  
  /**
   * Generar URL de retorno para billing portal
   * @param {string} baseUrl - URL base de la aplicación
   * @param {string} section - Sección específica (opcional)
   * @returns {string} URL de retorno
   */
  function generateReturnUrl(baseUrl, section = 'subscription') {
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/vip/${section}`;
  }
  
  // ============================================================================
  // EXPORTACIONES
  // ============================================================================
  
  module.exports = {
    // Formateo de precios
    formatPrice,
    toCents,
    fromCents,
    calculateDiscount,
    
    // Validación
    isValidPaymentMethodId,
    isValidCustomerId,
    isValidSubscriptionId,
    isValidInvoiceId,
    validateCardData,
    isValidCardNumber,
    
    // Fechas y períodos
    calculatePeriodEnd,
    daysUntil,
    getSubscriptionStatus,
    
    // Mapeo de datos
    mapStripeSubscription,
    mapStripePaymentMethod,
    mapStripeInvoice,
    
    // Utilidades
    generateMetadata,
    analyzeStripeError,
    getStripeConfig,
    generateReturnUrl
  };