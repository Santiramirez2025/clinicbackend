// ============================================================================
// src/utils/constants.js - CONSTANTES DE LA APLICACIÓN
// ============================================================================
const SKIN_TYPES = {
    OILY: 'Grasa',
    DRY: 'Seca',
    MIXED: 'Mixta',
    SENSITIVE: 'Sensible',
    NORMAL: 'Normal'
  };
  
  const APPOINTMENT_STATUS = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    COMPLETED: 'Completada',
    CANCELLED: 'Cancelada',
    NO_SHOW: 'No asistió'
  };
  
  const VIP_BENEFITS = {
    DISCOUNT_PERCENTAGE: 25,
    POINTS_MULTIPLIER: 2,
    FREE_FACIAL_FREQUENCY: 90, // días
    PRIORITY_BOOKING: true,
    PERSONAL_ADVISOR: true,
    BIRTHDAY_GIFT: true
  };
  
  const BEAUTY_POINTS_RULES = {
    SIGNUP_BONUS: 20,
    VIP_SUBSCRIPTION_BONUS: 50,
    REFERRAL_BONUS: 50,
    POINTS_PER_PESO: 0.1, // 1 punto por cada $10
    VIP_MULTIPLIER: 2
  };
  
  const NOTIFICATION_TYPES = {
    APPOINTMENT_REMINDER: 'appointment_reminder',
    APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
    VIP_EXPIRATION: 'vip_expiration',
    WELLNESS_TIP: 'wellness_tip',
    PROMOTION: 'promotion',
    BEAUTY_POINTS: 'beauty_points'
  };
  
  const EMAIL_TEMPLATES = {
    WELCOME: 'welcome',
    APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    VIP_WELCOME: 'vip_welcome',
    INVITATION: 'invitation',
    PASSWORD_RESET: 'password_reset'
  };
  
  const SUBSCRIPTION_PLANS = {
    FREE: {
      name: 'Gratuito',
      maxAppointments: 5,
      features: ['Reservas básicas', 'Beauty Points', 'Tips de bienestar']
    },
    PREMIUM: {
      name: 'Premium',
      price: 19.99,
      maxAppointments: -1, // Ilimitado
      features: ['Todo lo de Gratuito', 'Descuentos VIP', 'Prioridad en reservas', 'Asesoría personalizada']
    }
  };
  
  const TREATMENT_CATEGORIES = {
    FACIAL: 'Facial',
    CORPORAL: 'Corporal',
    DEPILACION: 'Depilación',
    MASAJES: 'Masajes',
    ESTETICA: 'Estética',
    RELAJACION: 'Relajación'
  };
  
  const ERROR_MESSAGES = {
    UNAUTHORIZED: 'No autorizado',
    FORBIDDEN: 'Acceso denegado',
    NOT_FOUND: 'Recurso no encontrado',
    VALIDATION_ERROR: 'Error de validación',
    SERVER_ERROR: 'Error interno del servidor',
    TOKEN_EXPIRED: 'Token expirado',
    INVALID_CREDENTIALS: 'Credenciales inválidas'
  };
  
  module.exports = {
    SKIN_TYPES,
    APPOINTMENT_STATUS,
    VIP_BENEFITS,
    BEAUTY_POINTS_RULES,
    NOTIFICATION_TYPES,
    EMAIL_TEMPLATES,
    SUBSCRIPTION_PLANS,
    TREATMENT_CATEGORIES,
    ERROR_MESSAGES
  };