// ============================================================================
// routes/offers.js - RUTAS DE OFERTAS CORREGIDAS ✅
// ============================================================================

const express = require('express');
const router = express.Router();
const {
  createOffer,
  getClinicOffers,
  getActiveOffers,
  updateOffer,
  redeemOffer,
  sendOfferNotification,
  getOfferStats
} = require('../controllers/offersController');

// ✅ MIDDLEWARE DE AUTENTICACIÓN SIMPLIFICADO (HASTA QUE CREES EL ARCHIVO)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: { message: 'Token requerido' }
    });
  }

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    // Usuario demo
    if (decoded.userId === 'demo-user-123') {
      req.user = { 
        id: decoded.userId, 
        userId: decoded.userId,
        email: 'demo@bellezaestetica.com', 
        role: 'clinic',
        isDemo: true,
        clinicId: 'demo-clinic-123'
      };
      return next();
    }
    
    // Usuario real (simplificado por ahora)
    req.user = { 
      id: decoded.userId,
      userId: decoded.userId, 
      email: 'usuario@ejemplo.com',
      role: 'clinic',
      isDemo: false,
      clinicId: decoded.userId
    };
    
    next();
  } catch (err) {
    return res.status(403).json({ 
      success: false,
      error: { message: 'Token inválido' }
    });
  }
};

// ============================================================================
// RUTAS PARA CLÍNICAS (ADMIN)
// ============================================================================

// Crear nueva oferta
router.post('/', authenticateToken, createOffer);

// Obtener ofertas de la clínica
router.get('/clinic', authenticateToken, getClinicOffers);

// Obtener estadísticas
router.get('/clinic/stats', authenticateToken, getOfferStats);

// Actualizar oferta
router.put('/:offerId', authenticateToken, updateOffer);

// Enviar notificación de oferta
router.post('/:offerId/send', authenticateToken, sendOfferNotification);

// ============================================================================
// RUTAS PARA USUARIOS
// ============================================================================

// Obtener ofertas activas disponibles
router.get('/active', authenticateToken, getActiveOffers);

// Canjear oferta
router.post('/:offerId/redeem', authenticateToken, redeemOffer);

// ============================================================================
// RUTA DE PRUEBA
// ============================================================================
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema de ofertas funcionando correctamente',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /': 'Crear oferta (clínicas)',
      'GET /clinic': 'Listar ofertas de clínica',
      'GET /clinic/stats': 'Estadísticas de ofertas',
      'PUT /:offerId': 'Actualizar oferta',
      'POST /:offerId/send': 'Enviar notificación',
      'GET /active': 'Ofertas activas (usuarios)',
      'POST /:offerId/redeem': 'Canjear oferta'
    }
  });
});

module.exports = router;