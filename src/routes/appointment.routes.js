// ============================================================================
// src/routes/appointment.routes.js - RUTAS COMPLETAS Y CORREGIDAS ✅
// ============================================================================
const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN SIMPLE ✅
// ============================================================================
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
        isDemo: true,
        vipStatus: true
      };
      return next();
    }
    
    // Usuario real
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return res.status(403).json({ 
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
    }
    
    req.user = { 
      id: user.id,
      userId: user.id, 
      email: user.email, 
      isDemo: false,
      vipStatus: user.vipStatus || false
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
// RUTAS PÚBLICAS ✅
// ============================================================================

// GET /api/appointments/treatments - CON PRISMA E IDs CONSISTENTES
router.get('/treatments', async (req, res) => {
  try {
    console.log('💆‍♀️ Getting treatments from database...');
    
    // Buscar treatments existentes
    let treatments = await prisma.treatment.findMany({
      where: { isActive: true },
      include: { clinic: true }
    });

    if (treatments.length > 0) {
      console.log(`✅ Found ${treatments.length} treatments in database`);
      return res.json({
        success: true,
        data: {
          treatments: treatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description,
            duration: treatment.durationMinutes,
            durationMinutes: treatment.durationMinutes,
            price: treatment.price,
            category: treatment.category,
            iconName: treatment.iconName,
            isVipExclusive: treatment.isVipExclusive,
            clinic: treatment.clinic.name
          }))
        }
      });
    }

    // Si no hay treatments, crear algunos con IDs específicos
    console.log('📝 Creating demo treatments with specific IDs...');
    
    // Crear o encontrar clínica
    let clinic = await prisma.clinic.findFirst();
    
    if (!clinic) {
      clinic = await prisma.clinic.create({
        data: {
          name: 'Belleza Estética Premium',
          email: 'admin@bellezaestetica.com',
          passwordHash: await bcrypt.hash('admin123', 12),
          phone: '+34 900 123 456',
          address: 'Av. Corrientes 1234, CABA',
          subscriptionPlan: 'PREMIUM'
        }
      });
      console.log('✅ Demo clinic created');
    }

    // Treatments con IDs específicos
    const treatmentsData = [
      {
        id: 't1',
        clinicId: clinic.id,
        name: 'Ritual Purificante',
        description: 'Limpieza facial profunda con extracción de comedones',
        durationMinutes: 60,
        price: 2500,
        category: 'Facial',
        iconName: 'sparkles',
        isVipExclusive: false
      },
      {
        id: 't2',
        clinicId: clinic.id,
        name: 'Drenaje Relajante',
        description: 'Masaje de drenaje linfático corporal',
        durationMinutes: 90,
        price: 3500,
        category: 'Corporal',
        iconName: 'waves',
        isVipExclusive: false
      },
      {
        id: 't3',
        clinicId: clinic.id,
        name: 'Hidrafacial Premium',
        description: 'Tratamiento facial avanzado con ácido hialurónico',
        durationMinutes: 75,
        price: 4500,
        category: 'Facial',
        iconName: 'crown',
        isVipExclusive: true
      }
    ];

    const createdTreatments = [];
    
    // Crear treatments uno por uno
    for (const treatmentData of treatmentsData) {
      try {
        const existingTreatment = await prisma.treatment.findUnique({
          where: { id: treatmentData.id },
          include: { clinic: true }
        });

        if (existingTreatment) {
          console.log(`✅ Treatment ${treatmentData.id} already exists`);
          createdTreatments.push(existingTreatment);
        } else {
          const newTreatment = await prisma.treatment.create({
            data: treatmentData,
            include: { clinic: true }
          });
          console.log(`✅ Created treatment ${treatmentData.id}: ${treatmentData.name}`);
          createdTreatments.push(newTreatment);
        }
      } catch (error) {
        console.error(`❌ Error with treatment ${treatmentData.id}:`, error.message);
        
        // Si hay error por ID duplicado, buscar el existente
        try {
          const existingTreatment = await prisma.treatment.findUnique({
            where: { id: treatmentData.id },
            include: { clinic: true }
          });
          if (existingTreatment) {
            createdTreatments.push(existingTreatment);
          }
        } catch (findError) {
          console.error(`❌ Error finding treatment ${treatmentData.id}:`, findError.message);
        }
      }
    }

    console.log(`✅ Processed ${createdTreatments.length} treatments`);

    res.json({
      success: true,
      data: {
        treatments: createdTreatments.map(treatment => ({
          id: treatment.id,
          name: treatment.name,
          description: treatment.description,
          duration: treatment.durationMinutes,
          durationMinutes: treatment.durationMinutes,
          price: treatment.price,
          category: treatment.category,
          iconName: treatment.iconName,
          isVipExclusive: treatment.isVipExclusive,
          clinic: treatment.clinic.name
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error getting treatments:', error);
    
    // Fallback a datos mock
    const mockTreatments = [
      {
        id: 't1',
        name: 'Ritual Purificante',
        description: 'Limpieza facial profunda con extracción de comedones',
        duration: 60,
        durationMinutes: 60,
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
        durationMinutes: 90,
        price: 3500,
        category: 'Corporal',
        iconName: 'waves',
        isVipExclusive: false,
        clinic: 'Belleza Estética Premium'
      },
      {
        id: 't3',
        name: 'Hidrafacial Premium',
        description: 'Tratamiento facial avanzado',
        duration: 75,
        durationMinutes: 75,
        price: 4500,
        category: 'Facial',
        iconName: 'crown',
        isVipExclusive: true,
        clinic: 'Belleza Estética Premium'
      }
    ];
    
    console.log('🔧 Using fallback mock treatments');
    res.json({
      success: true,
      data: { treatments: mockTreatments }
    });
  }
});

// GET /api/appointments/availability - CON PROFESIONALES AUTO-CREADOS
router.get('/availability', async (req, res) => {
  try {
    const { treatmentId, date } = req.query;

    if (!treatmentId || !date) {
      return res.status(400).json({
        success: false,
        error: { message: 'treatmentId y date son requeridos' }
      });
    }

    console.log('⏰ Getting availability...', { treatmentId, date });

    // Buscar treatment
    const treatment = await prisma.treatment.findUnique({
      where: { id: treatmentId },
      include: { clinic: true }
    });

    if (!treatment) {
      console.error(`❌ Treatment not found: ${treatmentId}`);
      
      // Mostrar treatments disponibles
      const availableTreatments = await prisma.treatment.findMany({
        select: { id: true, name: true }
      });
      
      console.log('📋 Available treatments:', availableTreatments);
      
      return res.status(404).json({
        success: false,
        error: { 
          message: 'Tratamiento no encontrado',
          treatmentId,
          availableTreatments: availableTreatments.map(t => ({ id: t.id, name: t.name }))
        }
      });
    }

    console.log(`✅ Found treatment: ${treatment.name}`);

    // Buscar profesionales
    let professionals = await prisma.professional.findMany({
      where: { 
        clinicId: treatment.clinicId,
        isActive: true 
      }
    });

    // Crear profesionales si no existen
    if (professionals.length === 0) {
      console.log('📝 Creating demo professionals...');
      
      const professionalsData = [
        {
          id: 'prof1',
          clinicId: treatment.clinicId,
          firstName: 'Ana',
          lastName: 'Martínez',
          specialties: 'Facial,Corporal',
          bio: 'Especialista en tratamientos faciales',
          rating: 4.9,
          availableHours: '09:00-18:00',
          isActive: true
        },
        {
          id: 'prof2',
          clinicId: treatment.clinicId,
          firstName: 'Carmen',
          lastName: 'Rodríguez',
          specialties: 'Corporal,Masajes',
          bio: 'Experta en drenaje linfático',
          rating: 4.8,
          availableHours: '10:00-19:00',
          isActive: true
        },
        {
          id: 'prof3',
          clinicId: treatment.clinicId,
          firstName: 'Laura',
          lastName: 'García',
          specialties: 'Facial,Estética',
          bio: 'Especialista en estética facial',
          rating: 4.7,
          availableHours: '09:00-17:00',
          isActive: true
        }
      ];

      for (const profData of professionalsData) {
        try {
          const existingProf = await prisma.professional.findUnique({
            where: { id: profData.id }
          });

          if (existingProf) {
            professionals.push(existingProf);
          } else {
            const newProf = await prisma.professional.create({ data: profData });
            professionals.push(newProf);
            console.log(`✅ Created professional: ${profData.firstName} ${profData.lastName}`);
          }
        } catch (error) {
          console.error(`❌ Error creating professional ${profData.id}:`, error.message);
        }
      }
    }

    // Buscar citas existentes
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        scheduledDate: new Date(date),
        status: { in: ['CONFIRMED', 'PENDING'] }
      },
      select: {
        scheduledTime: true,
        professionalId: true
      }
    });

    // Generar slots disponibles
    const timeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    const availableSlots = timeSlots.map(time => {
      const availableProfessionals = professionals.filter(prof => {
        const isOccupied = existingAppointments.some(apt => {
          const aptTime = apt.scheduledTime.toTimeString().slice(0, 5);
          return aptTime === time && apt.professionalId === prof.id;
        });
        
        return !isOccupied;
      }).map(prof => ({
        id: prof.id,
        name: `${prof.firstName} ${prof.lastName}`,
        specialty: prof.specialties.split(',')[0],
        specialties: prof.specialties.split(','),
        rating: prof.rating || 4.5
      }));

      return {
        time,
        availableProfessionals
      };
    }).filter(slot => slot.availableProfessionals.length > 0);

    console.log(`✅ Generated ${availableSlots.length} available slots`);

    res.json({
      success: true,
      data: {
        date,
        treatment: {
          name: treatment.name,
          duration: treatment.durationMinutes,
          price: treatment.price
        },
        clinic: treatment.clinic.name,
        availableSlots
      }
    });

  } catch (error) {
    console.error('❌ Error getting availability:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// RUTAS PROTEGIDAS ✅
// ============================================================================

// GET /api/appointments - Obtener mis citas
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📅 Getting appointments for user:', req.user.userId);

    // Para usuario demo
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: {
          appointments: [
            {
              id: 'apt-demo-123',
              treatment: { name: 'Drenaje Relajante', duration: 90, price: 3500 },
              date: '2025-07-15',
              time: '14:30',
              professional: 'Carmen Rodríguez',
              clinic: 'Belleza Estética Premium',
              status: 'CONFIRMED',
              beautyPointsEarned: 70,
              notes: 'Solicita música relajante'
            }
          ],
          pagination: { total: 1, page: 1, limit: 10, hasMore: false }
        }
      });
    }

    // Para usuarios reales
    const appointments = await prisma.appointment.findMany({
      where: { userId: req.user.userId },
      include: {
        treatment: true,
        professional: true,
        clinic: true
      },
      orderBy: { scheduledDate: 'desc' }
    });

    const transformedAppointments = appointments.map(apt => ({
      id: apt.id,
      treatment: {
        name: apt.treatment.name,
        duration: apt.treatment.durationMinutes,
        price: apt.treatment.price
      },
      date: apt.scheduledDate.toISOString().split('T')[0],
      time: apt.scheduledTime.toTimeString().slice(0, 5),
      professional: `${apt.professional.firstName} ${apt.professional.lastName}`,
      clinic: apt.clinic.name,
      status: apt.status,
      beautyPointsEarned: apt.beautyPointsEarned,
      notes: apt.notes,
      createdAt: apt.createdAt.toISOString()
    }));

    console.log(`✅ Found ${appointments.length} appointments`);

    res.json({
      success: true,
      data: {
        appointments: transformedAppointments,
        pagination: { 
          total: appointments.length, 
          page: 1, 
          limit: 50, 
          hasMore: false 
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting appointments:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// POST /api/appointments - Crear nueva cita
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { treatmentId, date, time, professionalId, notes } = req.body;

    console.log('📅 Creating appointment...', {
      userId: req.user.userId,
      treatmentId,
      date,
      time,
      professionalId
    });

    if (!treatmentId || !date || !time) {
      return res.status(400).json({
        success: false,
        error: { message: 'treatmentId, date y time son requeridos' }
      });
    }

    // Para usuario demo
    if (req.user.userId === 'demo-user-123') {
      const newAppointment = {
        id: `apt_${Date.now()}`,
        treatment: { name: 'Ritual Purificante', duration: 60, price: 2500 },
        date,
        time,
        professional: 'Ana Martínez',
        clinic: 'Belleza Estética Premium',
        status: 'PENDING',
        beautyPointsEarned: 50,
        notes: notes || null
      };

      return res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente (Demo)',
        data: { appointment: newAppointment }
      });
    }

    // Verificar treatment
    const treatment = await prisma.treatment.findUnique({
      where: { id: treatmentId },
      include: { clinic: true }
    });

    if (!treatment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Tratamiento no encontrado' }
      });
    }

    // Verificar/asignar profesional
    let professional = null;
    if (professionalId) {
      professional = await prisma.professional.findUnique({
        where: { id: professionalId }
      });

      if (!professional) {
        return res.status(404).json({
          success: false,
          error: { message: 'Profesional no encontrado' }
        });
      }
    } else {
      // Asignar primer profesional disponible
      const availableProfessionals = await prisma.professional.findMany({
        where: { 
          clinicId: treatment.clinicId,
          isActive: true 
        }
      });

      if (availableProfessionals.length > 0) {
        professional = availableProfessionals[0];
      }
    }

    if (!professional) {
      return res.status(400).json({
        success: false,
        error: { message: 'No hay profesionales disponibles' }
      });
    }

    // Preparar fechas
    const scheduledDate = new Date(date);
    const [hours, minutes] = time.split(':');
    const scheduledTime = new Date(date);
    scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    // Verificar disponibilidad
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        professionalId: professional.id,
        scheduledDate,
        scheduledTime,
        status: { in: ['CONFIRMED', 'PENDING'] }
      }
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        error: { message: 'El horario ya está ocupado' }
      });
    }

    // Calcular beauty points
    const beautyPoints = Math.floor(treatment.price / 50);

    // Crear appointment
    const newAppointment = await prisma.appointment.create({
      data: {
        userId: req.user.userId,
        clinicId: treatment.clinicId,
        professionalId: professional.id,
        treatmentId: treatment.id,
        scheduledDate,
        scheduledTime,
        durationMinutes: treatment.durationMinutes,
        status: 'PENDING',
        notes: notes?.trim() || null,
        beautyPointsEarned: beautyPoints
      },
      include: {
        treatment: true,
        professional: true,
        clinic: true
      }
    });

    // Actualizar beauty points del usuario
    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        beautyPoints: { increment: beautyPoints }
      }
    });

    console.log('✅ Appointment created successfully:', newAppointment.id);

    res.status(201).json({
      success: true,
      message: 'Cita creada exitosamente',
      data: {
        appointment: {
          id: newAppointment.id,
          treatment: {
            name: newAppointment.treatment.name,
            duration: newAppointment.treatment.durationMinutes,
            price: newAppointment.treatment.price
          },
          date: newAppointment.scheduledDate.toISOString().split('T')[0],
          time: newAppointment.scheduledTime.toTimeString().slice(0, 5),
          professional: `${newAppointment.professional.firstName} ${newAppointment.professional.lastName}`,
          clinic: newAppointment.clinic.name,
          status: newAppointment.status,
          beautyPointsEarned: newAppointment.beautyPointsEarned,
          notes: newAppointment.notes
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// PUT /api/appointments/:id - Actualizar cita
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, date, time } = req.body;

    console.log('📝 Updating appointment:', id);

    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Cita actualizada exitosamente (Demo)',
        data: { appointment: { id, status, notes, date, time } }
      });
    }

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cita no encontrada' }
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (date) updateData.scheduledDate = new Date(date);
    if (time && date) {
      const [hours, minutes] = time.split(':');
      const scheduledTime = new Date(date);
      scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      updateData.scheduledTime = scheduledTime;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        treatment: true,
        professional: true,
        clinic: true
      }
    });

    console.log('✅ Appointment updated successfully');

    res.json({
      success: true,
      message: 'Cita actualizada exitosamente',
      data: { appointment: updatedAppointment }
    });

  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// DELETE /api/appointments/:id - Cancelar cita
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelado por usuario' } = req.body;

    console.log('❌ Cancelling appointment:', id);

    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Cita cancelada exitosamente (Demo)'
      });
    }

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cita no encontrada' }
      });
    }

    const cancelledAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: existingAppointment.notes ? 
          `${existingAppointment.notes}\n\nMotivo: ${reason}` :
          `Motivo: ${reason}`
      }
    });

    console.log('✅ Appointment cancelled successfully');

    res.json({
      success: true,
      message: 'Cita cancelada exitosamente',
      data: { appointment: { id: cancelledAppointment.id, status: 'CANCELLED' } }
    });

  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

module.exports = router;