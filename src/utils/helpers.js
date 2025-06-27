// ============================================================================
// src/utils/helpers.js - FUNCIONES AUXILIARES
// ============================================================================
const crypto = require('crypto');

// Generar código aleatorio
const generateRandomCode = (length = 6) => {
  return crypto.randomBytes(length).toString('hex').slice(0, length).toUpperCase();
};

// Calcular edad desde fecha de nacimiento
const calculateAge = (birthDate) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

// Formatear precio en pesos argentinos
const formatPrice = (amount) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS'
  }).format(amount);
};

// Formatear fecha en español
const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires'
  };
  
  return new Date(date).toLocaleDateString('es-AR', { ...defaultOptions, ...options });
};

// Generar avatar por defecto basado en iniciales
const generateAvatar = (firstName, lastName) => {
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  const color = colors[initials.charCodeAt(0) % colors.length];
  
  return {
    initials,
    backgroundColor: color,
    textColor: '#FFFFFF'
  };
};

// Sanitizar entrada de usuario
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover < y >
    .replace(/javascript:/gi, '') // Remover javascript:
    .replace(/on\w+=/gi, ''); // Remover event handlers
};

// Generar slug amigable para URLs
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .replace(/[^a-z0-9\s-]/g, '') // Solo letras, números, espacios y guiones
    .replace(/\s+/g, '-') // Espacios a guiones
    .replace(/-+/g, '-') // Múltiples guiones a uno solo
    .replace(/^-|-$/g, ''); // Remover guiones al inicio y final
};

// Calcular distancia entre dos coordenadas (Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distancia en km
};

// Generar horarios disponibles
const generateTimeSlots = (startHour = 9, endHour = 18, slotDuration = 30) => {
  const slots = [];
  
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(time);
    }
  }
  
  return slots;
};

module.exports = {
  generateRandomCode,
  calculateAge,
  formatPrice,
  formatDate,
  generateAvatar,
  sanitizeInput,
  generateSlug,
  calculateDistance,
  generateTimeSlots
};