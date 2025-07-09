// ============================================================================
// src/routes/admin/index.js - RUTAS ADMIN PRINCIPALES ✅
// ============================================================================
const express = require('express');

// Importar rutas específicas de admin
const dashboardRoutes = require('./dashboard');

const router = express.Router();

// ============================================================================
// ADMIN ROUTES - 👑 PANEL ADMINISTRATIVO ✅
// ============================================================================

// Health check para admin
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes working',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Ruta de bienvenida admin
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '👑 Panel de Administración - Belleza Estética',
    data: {
      availableEndpoints: {
        health: '/api/admin/health',
        dashboard: '/api/admin/dashboard/*',
        overview: '/api/admin/dashboard/overview',
        revenue: '/api/admin/dashboard/revenue',
        appointments: '/api/admin/dashboard/appointments',
        customers: '/api/admin/dashboard/customers',
        professionals: '/api/admin/dashboard/professionals',
        offers: '/api/admin/dashboard/offers',
        analytics: '/api/admin/dashboard/analytics',
        settings: '/api/admin/dashboard/settings'
      },
      features: [
        'Dashboard administrativo completo',
        'Métricas de ingresos y citas',
        'Gestión de clientes VIP',
        'Analytics avanzados (PREMIUM)',
        'Exportación de reportes (PREMIUM)',
        'Configuración personalizable'
      ]
    }
  });
});

// ============================================================================
// MONTAR SUB-RUTAS ✅
// ============================================================================

// Dashboard routes
router.use('/dashboard', dashboardRoutes);

// ============================================================================
// PLACEHOLDER PARA FUTURAS RUTAS ADMIN ✅
// ============================================================================

// Users management (futuro)
router.get('/users', (req, res) => {
  res.json({
    success: true,
    message: 'User management - Coming soon!',
    data: { placeholder: true }
  });
});

// Settings management (futuro)
router.get('/settings', (req, res) => {
  res.json({
    success: true,
    message: 'Settings management - Coming soon!',
    data: { placeholder: true }
  });
});

// Reports management (futuro)
router.get('/reports', (req, res) => {
  res.json({
    success: true,
    message: 'Reports management - Coming soon!',
    data: { placeholder: true }
  });
});

// ============================================================================
// ERROR HANDLING ✅
// ============================================================================
router.use((error, req, res, next) => {
  console.error('❌ Admin routes error:', {
    message: error.message,
    stack: error.stack,
    route: req.originalUrl
  });

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || 'Error en rutas admin',
      code: error.code || 'ADMIN_ROUTE_ERROR'
    }
  });
});

module.exports = router;