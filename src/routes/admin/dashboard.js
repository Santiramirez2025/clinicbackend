// ============================================================================
// src/routes/admin/dashboard.js - RUTAS CORREGIDAS PARA FRONTEND ✅
// ============================================================================
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const DashboardController = require('../../controllers/admin/dashboardController');
const { authenticateAdmin } = require('../../middleware/auth.middleware');

const prisma = new PrismaClient();

// ============================================================================
// MIDDLEWARE - TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN DE ADMIN
// ============================================================================
router.use(authenticateAdmin);

// ============================================================================
// RUTAS PRINCIPALES QUE ESPERA EL FRONTEND
// ============================================================================

// 📊 Dashboard principal - MATCH CON FRONTEND
router.get('/', DashboardController.getDashboard);

// 📅 Gestión de reservas/bookings - MATCH CON FRONTEND
router.get('/bookings', DashboardController.getBookings);

// 👥 Gestión de clientes - MATCH CON FRONTEND
router.get('/customers', DashboardController.getCustomers);

// ⚡ Estadísticas en tiempo real - MATCH CON FRONTEND
router.get('/realtime-stats', DashboardController.getRealTimeStats);

// ============================================================================
// RUTAS DE GESTIÓN DE CITAS
// ============================================================================

// Actualizar estado de una cita - MATCH CON FRONTEND
router.patch('/appointments/:appointmentId/status', DashboardController.updateAppointmentStatus);

// Obtener detalles de una cita específica
router.get('/appointments/:appointmentId', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        clinicId: req.clinic.id
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            vipStatus: true,
            beautyPoints: true,
            totalInvestment: true,
            sessionsCompleted: true
          }
        },
        treatment: true,
        professional: true,
        offerRedemptions: {
          include: {
            offer: true
          }
        }
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cita no encontrada' }
      });
    }

    res.json({
      success: true,
      data: { appointment }
    });

  } catch (error) {
    console.error('❌ Get appointment details error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error obteniendo detalles de la cita' }
    });
  }
});

// ============================================================================
// RUTAS ADICIONALES COMPATIBLES
// ============================================================================

// 📊 Overview general (ruta alternativa)
router.get('/overview', DashboardController.getDashboard);

// 💰 Métricas de ingresos
router.get('/revenue', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Calcular ingresos básicos
    const revenue = await prisma.appointment.aggregate({
      where: {
        clinicId: req.clinic.id,
        status: 'COMPLETED',
        scheduledDate: { gte: startDate, lte: endDate }
      },
      _sum: {
        treatment: {
          price: true
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        totalRevenue: revenue._sum?.price || 0,
        period: days
      }
    });

  } catch (error) {
    console.error('❌ Revenue error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error obteniendo ingresos' }
    });
  }
});

// 📅 Métricas de citas
router.get('/appointments-metrics', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period);
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const appointmentStats = await prisma.appointment.groupBy({
      by: ['status'],
      where: {
        clinicId: req.clinic.id,
        scheduledDate: { gte: startDate, lte: endDate }
      },
      _count: { id: true }
    });
    
    res.json({
      success: true,
      data: {
        stats: appointmentStats,
        period: days
      }
    });

  } catch (error) {
    console.error('❌ Appointment metrics error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error obteniendo métricas de citas' }
    });
  }
});

// ============================================================================
// RUTAS DE CONFIGURACIÓN Y UTILIDADES
// ============================================================================

// Obtener configuración del dashboard
router.get('/settings', async (req, res) => {
  try {
    const clinic = await prisma.clinic.findUnique({
      where: { id: req.clinic.id },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true,
        subscriptionExpiresAt: true,
        settings: true,
        brandColors: true
      }
    });

    const settings = clinic?.settings ? 
      (typeof clinic.settings === 'string' ? JSON.parse(clinic.settings) : clinic.settings) : {};

    res.json({
      success: true,
      data: {
        clinic: {
          ...clinic,
          settings
        },
        dashboardConfig: {
          autoRefresh: settings.autoRefresh !== false,
          refreshInterval: settings.refreshInterval || 300,
          defaultPeriod: settings.defaultPeriod || '30',
          showAlerts: settings.showAlerts !== false,
          compactMode: settings.compactMode || false
        }
      }
    });

  } catch (error) {
    console.error('❌ Get settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error obteniendo configuración' }
    });
  }
});

// Búsqueda global
router.get('/search', async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: { message: 'Query de búsqueda muy corta' }
      });
    }

    const results = {};

    // Buscar clientes
    if (type === 'all' || type === 'customers') {
      results.customers = await prisma.user.findMany({
        where: {
          appointments: { some: { clinicId: req.clinic.id } },
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          vipStatus: true
        },
        take: 10
      });
    }

    // Buscar citas
    if (type === 'all' || type === 'appointments') {
      results.appointments = await prisma.appointment.findMany({
        where: {
          clinicId: req.clinic.id,
          OR: [
            { user: { firstName: { contains: q, mode: 'insensitive' } } },
            { user: { lastName: { contains: q, mode: 'insensitive' } } },
            { treatment: { name: { contains: q, mode: 'insensitive' } } }
          ]
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
          treatment: { select: { name: true } }
        },
        take: 10
      });
    }

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error en búsqueda' }
    });
  }
});

// ============================================================================
// RUTAS DE TESTING PARA DEBUG
// ============================================================================

// Test de conectividad
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard routes working!',
    timestamp: new Date().toISOString(),
    clinic: req.clinic?.id || 'No clinic found'
  });
});

module.exports = router;