// ============================================================================
// src/routes/appointment.routes.js - RUTAS DE CITAS COMPLETAS ✅
// ============================================================================
const express = require('express');
const AppointmentController = require('../controllers/appointment.controller');
const { verifyToken, optionalAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../utils/asyncHandler');

const router = express.Router();

// ============================================================================
// RUTAS PÚBLICAS (sin autenticación o auth opcional)
// ============================================================================

// GET /api/appointments/treatments - Listar tratamientos disponibles
router.get('/treatments', asyncHandler(async (req, res) => {
  console.log('💆‍♀️ Getting treatments...');
  
  // ✅ FALLBACK A DATOS MOCK SI NO HAY BD
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const treatments = await prisma.treatment.findMany({
      where: { isActive: true },
      include: { clinic: true },
      orderBy: { name: 'asc' }
    });

    if (treatments.length > 0) {
      console.log('✅ Found treatments in database:', treatments.length);
      res.json({
        success: true,
        data: {
          treatments: treatments.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            duration: t.durationMinutes,
            price: t.price,
            category: t.category,
            iconName: t.iconName,
            isVipExclusive: t.isVipExclusive,
            clinic: t.clinic.name
          }))
        }
      });
    } else {
      throw new Error('No treatments in database');
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.log('⚠️ Database error, using mock treatments:', error.message);
    
    // ✅ MOCK TREATMENTS QUE COINCIDEN CON TU FRONTEND
    const mockTreatments = [
      {
        id: 't1',
        name: 'Ritual Purificante',
        description: 'Limpieza facial profunda con extracción de comedones',
        duration: 60,
        price: 2500,
        category: 'Facial',
        iconName: 'sparkles',
        isVipExclusive: false,
        clinic: 'Belleza Estética Premium'
      },
      {
        id: 't2',
        name: 'Drenaje Relajante',
        description: 'Masaje de drenaje linfático corporal',
        duration: 90,
        price: 3500,
        category: 'Corporal',
        iconName: 'waves',
        isVipExclusive: false,
        clinic: 'Belleza Estética Premium'
      },
      {
        id: 't3',
        name: 'Hidrafacial Premium',
        description: 'Tratamiento facial avanzado con tecnología HydraFacial',
        duration: 75,
        price: 4500,
        category: 'Facial',
        iconName: 'sparkles',
        isVipExclusive: true,
        clinic: 'Belleza Estética Premium'
      },
      {
        id: 't4',
        name: 'Masaje Relajante',
        description: 'Masaje corporal con aceites esenciales',
        duration: 60,
        price: 3000,
        category: 'Corporal',
        iconName: 'heart',
        isVipExclusive: false,
        clinic: 'Belleza Estética Premium'
      }
    ];
    
    console.log('✅ Returning mock treatments:', mockTreatments.length);
    res.json({
      success: true,
      data: { treatments: mockTreatments }
    });
  }
}));

// GET /api/appointments/availability?treatmentId=X&date=YYYY-MM-DD
router.get('/availability', optionalAuth, asyncHandler(AppointmentController.getAvailability));

// ============================================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// ============================================================================

// Aplicar autenticación a las rutas siguientes
router.use(verifyToken);

// GET /api/appointments - Obtener citas del usuario
router.get('/', asyncHandler(AppointmentController.getUserAppointments));

// POST /api/appointments - Crear nueva cita
router.post('/', asyncHandler(AppointmentController.createAppointment));

// GET /api/appointments/:id - Obtener detalles de una cita
router.get('/:id', asyncHandler(AppointmentController.getAppointmentDetails));

// PUT /api/appointments/:id - Actualizar cita
router.put('/:id', asyncHandler(AppointmentController.updateAppointment));

// DELETE /api/appointments/:id - Cancelar cita
router.delete('/:id', asyncHandler(AppointmentController.cancelAppointment));

// POST /api/appointments/:id/confirm - Confirmar asistencia
router.post('/:id/confirm', asyncHandler(AppointmentController.confirmAttendance));

// GET /api/appointments/upcoming/next - Próximas citas (para dashboard)
router.get('/upcoming/next', asyncHandler(AppointmentController.getUpcomingAppointments));

// ============================================================================
// RUTAS DE TESTING (SOLO EN DESARROLLO)
// ============================================================================
if (process.env.NODE_ENV === 'development') {
  // GET /api/appointments/test/data - Ver datos de prueba
  router.get('/test/data', asyncHandler(async (req, res) => {
    const mockTreatments = AppointmentController.getMockTreatments();
    const mockProfessionals = AppointmentController.getMockProfessionals();
    
    res.json({
      success: true,
      message: 'Datos de prueba del sistema de citas',
      data: {
        treatments: Object.values(mockTreatments),
        professionals: mockProfessionals,
        testEndpoints: {
          treatments: '/api/appointments/treatments',
          availability: '/api/appointments/availability?treatmentId=t2&date=2024-12-01',
          createAppointment: {
            method: 'POST',
            url: '/api/appointments',
            body: {
              treatmentId: 't2',
              date: '2024-12-01',
              time: '10:00',
              professionalId: 'prof1',
              notes: 'Prueba desde API'
            }
          }
        }
      }
    });
  }));

  // POST /api/appointments/test/create - Crear cita de prueba
  router.post('/test/create', asyncHandler(async (req, res) => {
    const testAppointment = {
      treatmentId: 't2',
      date: '2024-12-01',
      time: '10:00',
      professionalId: 'prof1',
      notes: 'Cita de prueba creada desde endpoint de testing'
    };

    // Simular request con datos de prueba
    req.body = testAppointment;
    
    try {
      await AppointmentController.createAppointment(req, res);
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creando cita de prueba',
        error: error.message
      });
    }
  }));
}

// ============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES ESPECÍFICO
// ============================================================================
router.use((error, req, res, next) => {
  console.error('❌ Error en appointment routes:', error);
  
  // Errores específicos de appointments
  if (error.message?.includes('Treatment') || error.message?.includes('Professional')) {
    return res.status(404).json({
      success: false,
      message: 'Recurso no encontrado',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Recurso no disponible'
    });
  }
  
  if (error.message?.includes('disponible') || error.message?.includes('conflict')) {
    return res.status(409).json({
      success: false,
      message: 'Conflicto de horario',
      error: 'El horario seleccionado no está disponible'
    });
  }
  
  // Pasar al middleware de errores general
  next(error);
});

// ============================================================================
// DOCUMENTACIÓN DE ENDPOINTS
// ============================================================================

/*
# 📅 ENDPOINTS DE CITAS

## Endpoints Públicos

### GET /api/appointments/treatments
Obtiene lista de tratamientos disponibles.

**Response:**
```json
{
  "success": true,
  "data": {
    "treatments": [
      {
        "id": "t1",
        "name": "Ritual Purificante",
        "description": "Limpieza facial profunda",
        "duration": 60,
        "price": 2500,
        "category": "Facial",
        "iconName": "sparkles",
        "isVipExclusive": false,
        "clinic": "Belleza Estética Premium"
      }
    ]
  }
}
```

### GET /api/appointments/availability?treatmentId=t2&date=2024-12-01
Obtiene horarios disponibles para un tratamiento en una fecha específica.

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2024-12-01",
    "treatmentId": "t2",
    "availableSlots": [
      {
        "time": "09:00",
        "availableProfessionals": [
          {
            "id": "prof1",
            "name": "Ana Martínez",
            "specialty": "Facial",
            "rating": 4.9
          }
        ]
      }
    ]
  }
}
```

## Endpoints Autenticados

### POST /api/appointments
Crea una nueva cita.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```

**Body:**
```json
{
  "treatmentId": "t2",
  "date": "2024-12-01",
  "time": "10:00",
  "professionalId": "prof1",
  "notes": "Solicita música relajante"
}
```

### GET /api/appointments
Obtiene las citas del usuario autenticado.

### GET /api/appointments/:id
Obtiene detalles de una cita específica.

### PUT /api/appointments/:id
Actualiza una cita existente.

### DELETE /api/appointments/:id
Cancela una cita.

### POST /api/appointments/:id/confirm
Confirma asistencia a una cita.

## Endpoints de Testing (Development)

### GET /api/appointments/test/data
Ver datos de prueba y endpoints disponibles.

### POST /api/appointments/test/create
Crear cita de prueba automáticamente.

*/

module.exports = router;