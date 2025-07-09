// ============================================================================
// src/routes/admin/dashboard.js - RUTAS DEL DASHBOARD ADMIN
// ============================================================================
const express = require('express');
const DashboardController = require('../../controllers/admin/dashboardController');
const { authenticateAdmin, checkSubscription } = require('../../middleware/admin/adminAuth');

const router = express.Router();

// ============================================================================
// MIDDLEWARE GLOBAL PARA TODAS LAS RUTAS ADMIN
// ============================================================================
router.use(authenticateAdmin);

// ============================================================================
// RUTAS PRINCIPALES DEL DASHBOARD
// ============================================================================

/**
 * GET /api/admin/dashboard/overview
 * Resumen general del dashboard con KPIs principales
 */
router.get('/overview', DashboardController.getOverview);

/**
 * GET /api/admin/dashboard/revenue
 * Métricas detalladas de ingresos
 */
router.get('/revenue', DashboardController.getRevenue);

/**
 * GET /api/admin/dashboard/appointments
 * Métricas de citas y reservas
 */
router.get('/appointments', DashboardController.getAppointments);

/**
 * GET /api/admin/dashboard/customers
 * Métricas de clientes y segmentación
 */
router.get('/customers', DashboardController.getCustomers);

/**
 * GET /api/admin/dashboard/professionals
 * Métricas de profesionales y rendimiento
 */
router.get('/professionals', DashboardController.getProfessionals);

/**
 * GET /api/admin/dashboard/offers
 * Métricas de ofertas y promociones
 * Requiere plan BASIC o superior
 */
router.get('/offers', checkSubscription('BASIC'), DashboardController.getOffers);

/**
 * GET /api/admin/dashboard/analytics
 * Analytics avanzados y predicciones
 * Requiere plan PREMIUM o superior
 */
router.get('/analytics', checkSubscription('PREMIUM'), DashboardController.getAnalytics);

// ============================================================================
// RUTAS DE EXPORTACIÓN (PREMIUM)
// ============================================================================

/**
 * GET /api/admin/dashboard/export/pdf
 * Exportar reporte en PDF
 */
router.get('/export/pdf', checkSubscription('PREMIUM'), async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Exportación PDF en desarrollo',
      data: {
        downloadUrl: '#', // URL temporal
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Error exportando PDF' }
    });
  }
});

/**
 * GET /api/admin/dashboard/export/csv
 * Exportar datos en CSV
 */
router.get('/export/csv', checkSubscription('BASIC'), async (req, res) => {
  try {
    const { type = 'appointments' } = req.query;
    
    res.json({
      success: true,
      message: `Exportación CSV de ${type} en desarrollo`,
      data: {
        downloadUrl: '#', // URL temporal
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Error exportando CSV' }
    });
  }
});

// ============================================================================
// RUTAS DE CONFIGURACIÓN
// ============================================================================

/**
 * GET /api/admin/dashboard/settings
 * Configuración del dashboard
 */
router.get('/settings', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        clinic: {
          id: req.clinic.id,
          name: req.clinic.name,
          plan: req.clinic.subscriptionPlan
        },
        features: {
          basicMetrics: true,
          advancedAnalytics: ['PREMIUM', 'ENTERPRISE'].includes(req.clinic.subscriptionPlan),
          offerTracking: ['BASIC', 'PREMIUM', 'ENTERPRISE'].includes(req.clinic.subscriptionPlan),
          exportReports: ['PREMIUM', 'ENTERPRISE'].includes(req.clinic.subscriptionPlan),
          apiAccess: req.clinic.subscriptionPlan === 'ENTERPRISE'
        },
        preferences: {
          defaultPeriod: 30,
          currency: 'EUR',
          timezone: 'Europe/Madrid',
          autoRefresh: true,
          refreshInterval: 300000 // 5 minutos
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Error obteniendo configuración' }
    });
  }
});

/**
 * PUT /api/admin/dashboard/settings
 * Actualizar configuración del dashboard
 */
router.put('/settings', async (req, res) => {
  try {
    const { preferences } = req.body;
    
    // Aquí se guardarían las preferencias en la BD
    // Por ahora solo devolvemos success
    
    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: { preferences }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Error actualizando configuración' }
    });
  }
});

// ============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ============================================================================
router.use((error, req, res, next) => {
  console.error('❌ Dashboard route error:', {
    message: error.message,
    stack: error.stack,
    clinic: req.clinic?.id,
    route: req.originalUrl
  });

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Error interno del dashboard',
      code: error.code || 'DASHBOARD_ERROR'
    }
  });
});

module.exports = router;