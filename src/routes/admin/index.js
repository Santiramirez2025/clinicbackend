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

// TEST endpoint - NUEVO ✅
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin service active',
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'admin-api'
  });
});

// Health check para admin
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes working',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============================================================================
// 🆕 RUTAS DIRECTAS QUE FALTABAN - ENDPOINTS ESPECÍFICOS
// ============================================================================

// GET /api/admin/stats - Estadísticas generales
router.get('/stats', async (req, res) => {
  try {
    console.log('📈 Admin stats requested');
    
    // TODO: Implementar lógica real con base de datos
    const mockStats = {
      totalAppointments: 125,
      totalCustomers: 89,
      totalRevenue: 15450,
      appointmentsToday: 12,
      pendingAppointments: 5,
      completedToday: 7,
      monthlyGrowth: 15.5,
      customerRetention: 87.2
    };

    res.json({
      success: true,
      message: 'Admin stats retrieved successfully',
      data: mockStats
    });

  } catch (error) {
    console.error('❌ Error getting admin stats:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error retrieving admin statistics',
        code: 'ADMIN_STATS_ERROR'
      }
    });
  }
});

// GET /api/admin/bookings - Lista de reservas
router.get('/bookings', async (req, res) => {
  try {
    console.log('📅 Admin bookings requested');
    
    // TODO: Implementar lógica real con base de datos
    const mockBookings = {
      appointments: [
        {
          id: '1',
          customerName: 'María García',
          service: 'Corte y Peinado Premium',
          date: new Date().toISOString().split('T')[0],
          time: '10:00',
          status: 'confirmed',
          phone: '+34 600 123 456',
          email: 'maria.garcia@email.com',
          duration: 60,
          price: 45,
          notes: 'Cliente VIP, prefiere estilista senior'
        },
        {
          id: '2',
          customerName: 'Ana López',
          service: 'Manicura Francesa',
          date: new Date().toISOString().split('T')[0],
          time: '11:30',
          status: 'pending',
          phone: '+34 600 789 012',
          email: 'ana.lopez@email.com',
          duration: 45,
          price: 35,
          notes: 'Primera visita'
        },
        {
          id: '3',
          customerName: 'Carmen Ruiz',
          service: 'Tratamiento Facial Anti-edad',
          date: new Date().toISOString().split('T')[0],
          time: '14:00',
          status: 'completed',
          phone: '+34 600 456 789',
          email: 'carmen.ruiz@email.com',
          duration: 90,
          price: 85,
          notes: 'Tratamiento mensual'
        }
      ],
      totalCount: 3,
      pendingCount: 1,
      confirmedCount: 1,
      completedCount: 1
    };

    res.json({
      success: true,
      message: 'Admin bookings retrieved successfully',
      data: mockBookings
    });

  } catch (error) {
    console.error('❌ Error getting admin bookings:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error retrieving admin bookings',
        code: 'ADMIN_BOOKINGS_ERROR'
      }
    });
  }
});

// GET /api/admin/customers - Lista de clientes
router.get('/customers', async (req, res) => {
  try {
    console.log('👥 Admin customers requested');
    
    // TODO: Implementar lógica real con base de datos
    const mockCustomers = {
      customers: [
        {
          id: '1',
          name: 'María García',
          email: 'maria.garcia@email.com',
          phone: '+34 600 123 456',
          totalVisits: 12,
          totalSpent: 540,
          lastVisit: '2024-01-10',
          joinDate: '2023-06-15',
          preferredServices: ['Corte y Peinado', 'Manicura'],
          vipStatus: true
        },
        {
          id: '2',
          name: 'Ana López',
          email: 'ana.lopez@email.com',
          phone: '+34 600 789 012',
          totalVisits: 8,
          totalSpent: 280,
          lastVisit: '2024-01-12',
          joinDate: '2023-08-20',
          preferredServices: ['Manicura', 'Pedicura'],
          vipStatus: false
        },
        {
          id: '3',
          name: 'Carmen Ruiz',
          email: 'carmen.ruiz@email.com',
          phone: '+34 600 456 789',
          totalVisits: 15,
          totalSpent: 1275,
          lastVisit: '2024-01-14',
          joinDate: '2023-03-10',
          preferredServices: ['Tratamiento Facial', 'Masajes'],
          vipStatus: true
        }
      ],
      totalCount: 3,
      vipCount: 2,
      newThisMonth: 1
    };

    res.json({
      success: true,
      message: 'Admin customers retrieved successfully',
      data: mockCustomers
    });

  } catch (error) {
    console.error('❌ Error getting admin customers:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Error retrieving admin customers',
        code: 'ADMIN_CUSTOMERS_ERROR'
      }
    });
  }
});

// ============================================================================
// RUTA DE BIENVENIDA ADMIN ✅
// ============================================================================
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '👑 Panel de Administración - Belleza Estética',
    data: {
      availableEndpoints: {
        test: '/api/admin/test',
        health: '/api/admin/health',
        stats: '/api/admin/stats',          // 🆕 NUEVO
        bookings: '/api/admin/bookings',    // 🆕 NUEVO
        customers: '/api/admin/customers',  // 🆕 NUEVO
        dashboard: '/api/admin/dashboard/*',
        overview: '/api/admin/dashboard/overview',
        revenue: '/api/admin/dashboard/revenue',
        appointments: '/api/admin/dashboard/appointments',
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