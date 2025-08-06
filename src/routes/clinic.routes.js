// ============================================================================
// 1. BACKEND: src/routes/clinic.routes.js - RUTAS COMPLETAS DE CLÍNICAS ✅
// ============================================================================

const express = require('express');
const { body, query } = require('express-validator');
const { verifyToken, verifyClinicToken, verifyAdminToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/asyncHandler');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// CONTROLADOR DE CLÍNICAS COMPLETO
// ============================================================================
const ClinicController = {
  // ✅ OBTENER TODAS LAS CLÍNICAS ACTIVAS (PÚBLICO)
  async getAllClinics(req, res) {
    const clinics = await prisma.clinic.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        location: true,
        address: true,
        phone: true,
        email: true,
        services: true,
        rating: true,
        imageUrl: true,
        coordinates: true
      },
      orderBy: { name: 'asc' }
    });

    // Si no hay clínicas en BD, devolver datos demo
    if (clinics.length === 0) {
      const demoClinics = [
        {
          id: 'madrid-centro',
          name: 'Clínica Madrid Centro',
          location: 'Madrid',
          address: 'Calle Gran Vía, 28, Madrid',
          phone: '+34 91 123 4567',
          email: 'madrid@bellezaestetica.com',
          services: ['Facial', 'Corporal', 'Láser', 'Botox'],
          rating: 4.8,
          imageUrl: null,
          coordinates: { lat: 40.4168, lng: -3.7038 }
        },
        {
          id: 'barcelona-eixample',
          name: 'Clínica Barcelona Eixample',
          location: 'Barcelona',
          address: 'Passeig de Gràcia, 95, Barcelona',
          phone: '+34 93 234 5678',
          email: 'barcelona@bellezaestetica.com',
          services: ['Facial', 'Corporal', 'Peeling', 'Rellenos'],
          rating: 4.9,
          imageUrl: null,
          coordinates: { lat: 41.3851, lng: 2.1734 }
        },
        {
          id: 'valencia-centro',
          name: 'Clínica Valencia Centro',
          location: 'Valencia',
          address: 'Calle Colón, 45, Valencia',
          phone: '+34 96 345 6789',
          email: 'valencia@bellezaestetica.com',
          services: ['Facial', 'Láser', 'Mesoterapia'],
          rating: 4.7,
          imageUrl: null,
          coordinates: { lat: 39.4699, lng: -0.3763 }
        },
        {
          id: 'sevilla-centro',
          name: 'Clínica Sevilla Centro',
          location: 'Sevilla',
          address: 'Avenida Constitución, 12, Sevilla',
          phone: '+34 95 456 7890',
          email: 'sevilla@bellezaestetica.com',
          services: ['Facial', 'Corporal', 'Botox'],
          rating: 4.6,
          imageUrl: null,
          coordinates: { lat: 37.3886, lng: -5.9823 }
        }
      ];
      
      return res.json({
        success: true,
        data: demoClinics,
        message: 'Clínicas demo - Configura la base de datos para datos reales'
      });
    }

    res.json({
      success: true,
      data: clinics,
      total: clinics.length
    });
  },

  // ✅ OBTENER CLÍNICA POR ID (PÚBLICO)
  async getClinicById(req, res) {
    const { id } = req.params;
    
    const clinic = await prisma.clinic.findFirst({
      where: { 
        OR: [
          { id: id },
          { slug: id } // Por si usas slugs como madrid-centro
        ],
        isActive: true 
      },
      include: {
        treatments: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            price: true,
            category: true
          }
        },
        _count: {
          select: {
            appointments: true,
            users: true
          }
        }
      }
    });

    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: { message: 'Clínica no encontrada' }
      });
    }

    res.json({
      success: true,
      data: clinic
    });
  },

  // ✅ DASHBOARD DE CLÍNICA (AUTENTICADO)
  async getDashboard(req, res) {
    const clinicId = req.user.clinicId || req.params.clinicId;
    
    if (!clinicId) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de clínica requerido' }
      });
    }

    // Obtener estadísticas de la clínica
    const [clinic, todayAppointments, monthlyRevenue, totalPatients] = await Promise.all([
      prisma.clinic.findUnique({
        where: { id: clinicId },
        include: {
          treatments: { where: { isActive: true } }
        }
      }),
      prisma.appointment.count({
        where: {
          clinicId,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      prisma.appointment.aggregate({
        where: {
          clinicId,
          status: 'completed',
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: { totalAmount: true }
      }),
      prisma.user.count({
        where: { clinicId }
      })
    ]);

    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: { message: 'Clínica no encontrada' }
      });
    }

    res.json({
      success: true,
      data: {
        clinic: {
          id: clinic.id,
          name: clinic.name,
          location: clinic.location
        },
        stats: {
          todayAppointments,
          monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
          totalPatients,
          treatments: clinic.treatments.length
        },
        treatments: clinic.treatments
      }
    });
  },

  // ✅ CREAR NUEVA CLÍNICA (ADMIN)
  async createClinic(req, res) {
    const {
      name,
      location,
      address,
      phone,
      email,
      services = [],
      coordinates
    } = req.body;

    const clinic = await prisma.clinic.create({
      data: {
        name,
        location,
        address,
        phone,
        email,
        services,
        coordinates,
        isActive: true,
        slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      }
    });

    res.status(201).json({
      success: true,
      data: clinic,
      message: 'Clínica creada exitosamente'
    });
  },

  // ✅ ACTUALIZAR CLÍNICA (ADMIN)
  async updateClinic(req, res) {
    const { id } = req.params;
    const updateData = req.body;

    const clinic = await prisma.clinic.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      data: clinic,
      message: 'Clínica actualizada exitosamente'
    });
  },

  // ✅ DESACTIVAR CLÍNICA (ADMIN)
  async deactivateClinic(req, res) {
    const { id } = req.params;

    const clinic = await prisma.clinic.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({
      success: true,
      data: clinic,
      message: 'Clínica desactivada exitosamente'
    });
  }
};

// ============================================================================
// RUTAS PÚBLICAS
// ============================================================================

// ✅ GET /api/clinics - Obtener todas las clínicas
router.get('/', asyncHandler(ClinicController.getAllClinics));

// ✅ GET /api/clinics/:id - Obtener clínica específica
router.get('/:id', asyncHandler(ClinicController.getClinicById));

// ============================================================================
// RUTAS AUTENTICADAS
// ============================================================================

// ✅ GET /api/clinics/:id/dashboard - Dashboard de clínica
router.get('/:clinicId/dashboard', 
  verifyToken, 
  asyncHandler(ClinicController.getDashboard)
);

// ============================================================================
// RUTAS ADMIN
// ============================================================================

// ✅ POST /api/clinics - Crear clínica
router.post('/',
  verifyAdminToken,
  [
    body('name').notEmpty().withMessage('Nombre requerido'),
    body('location').notEmpty().withMessage('Ubicación requerida'),
    body('address').notEmpty().withMessage('Dirección requerida'),
    body('phone').notEmpty().withMessage('Teléfono requerido'),
    body('email').isEmail().withMessage('Email válido requerido')
  ],
  asyncHandler(ClinicController.createClinic)
);

// ✅ PUT /api/clinics/:id - Actualizar clínica
router.put('/:id',
  verifyAdminToken,
  asyncHandler(ClinicController.updateClinic)
);

// ✅ DELETE /api/clinics/:id - Desactivar clínica
router.delete('/:id',
  verifyAdminToken,
  asyncHandler(ClinicController.deactivateClinic)
);

module.exports = router;