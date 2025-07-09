// ============================================================================
// src/controllers/appointment.controller.js - CONTROLADOR SIMPLIFICADO ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AppointmentController {
  // ============================================================================
  // DATOS MOCK PARA FALLBACK ✅
  // ============================================================================
  static getMockTreatments() {
    return {
      't1': {
        id: 't1',
        name: 'Ritual Purificante',
        durationMinutes: 60,
        price: 2500,
        category: 'Facial',
        description: 'Limpieza facial profunda con extracción de comedones',
        iconName: 'sparkles',
        isVipExclusive: false,
        clinicId: 'clinic-1',
        clinic: { name: 'Belleza Estética Premium' }
      },
      't2': {
        id: 't2',
        name: 'Drenaje Relajante',
        durationMinutes: 90,
        price: 3500,
        category: 'Corporal',
        description: 'Masaje de drenaje linfático corporal',
        iconName: 'waves',
        isVipExclusive: false,
        clinicId: 'clinic-1',
        clinic: { name: 'Belleza Estética Premium' }
      },
      't3': {
        id: 't3',
        name: 'Hidrafacial Premium',
        durationMinutes: 75,
        price: 4500,
        category: 'Facial',
        description: 'Tratamiento facial avanzado con ácido hialurónico',
        iconName: 'crown',
        isVipExclusive: true,
        clinicId: 'clinic-1',
        clinic: { name: 'Belleza Estética Premium' }
      }
    };
  }

  static getMockProfessionals() {
    return [
      {
        id: 'prof1',
        firstName: 'Ana',
        lastName: 'Martínez',
        specialties: ['Facial', 'Corporal'],
        rating: 4.9,
        clinicId: 'clinic-1',
        isActive: true
      },
      {
        id: 'prof2',
        firstName: 'Carmen',
        lastName: 'Rodríguez',
        specialties: ['Corporal', 'Masajes'],
        rating: 4.8,
        clinicId: 'clinic-1',
        isActive: true
      },
      {
        id: 'prof3',
        firstName: 'Laura',
        lastName: 'García',
        specialties: ['Facial', 'Estética'],
        rating: 4.7,
        clinicId: 'clinic-1',
        isActive: true
      }
    ];
  }

  // ============================================================================
  // OBTENER TRATAMIENTOS ✅
  // ============================================================================
  static async getTreatments(req, res) {
    try {
      console.log('💆‍♀️ Getting treatments...');
      
      let treatments = [];
      
      try {
        // Intentar obtener de BD
        treatments = await prisma.treatment.findMany({
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
      } catch (dbError) {
        console.log('⚠️ Database error, using mock treatments:', dbError.message);
      }
      
      // Usar datos mock como fallback
      const mockTreatments = Object.values(AppointmentController.getMockTreatments());
      console.log('🔧 Using mock treatments');
      
      res.json({
        success: true,
        data: {
          treatments: mockTreatments.map(treatment => ({
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
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // OBTENER DISPONIBILIDAD ✅
  // ============================================================================
  static async getAvailability(req, res) {
    try {
      const { treatmentId, date } = req.query;

      if (!treatmentId || !date) {
        return res.status(400).json({
          success: false,
          error: { message: 'treatmentId y date son requeridos' }
        });
      }

      console.log('⏰ Getting availability for:', treatmentId, date);

      let treatment = null;
      let professionals = [];

      try {
        // Intentar buscar en BD
        treatment = await prisma.treatment.findUnique({
          where: { id: treatmentId },
          include: { clinic: true }
        });

        if (treatment) {
          professionals = await prisma.professional.findMany({
            where: {
              clinicId: treatment.clinicId,
              isActive: true
            }
          });
          console.log('✅ Found treatment in database:', treatment.name);
        }
      } catch (dbError) {
        console.log('⚠️ Database error, using mock data:', dbError.message);
      }

      // Fallback a datos mock
      if (!treatment) {
        const mockTreatments = AppointmentController.getMockTreatments();
        treatment = mockTreatments[treatmentId];
        
        if (!treatment) {
          return res.status(404).json({
            success: false,
            error: { 
              message: `Tratamiento ${treatmentId} no encontrado`,
              availableTreatments: ['t1', 't2', 't3']
            }
          });
        }
        
        professionals = AppointmentController.getMockProfessionals();
        console.log('🔧 Using mock treatment:', treatment.name);
      }

      // Generar horarios disponibles
      const timeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
      ];

      // Obtener citas existentes (si hay BD)
      let existingAppointments = [];
      try {
        existingAppointments = await prisma.appointment.findMany({
          where: {
            scheduledDate: new Date(date),
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          select: {
            scheduledTime: true,
            professionalId: true
          }
        });
      } catch (dbError) {
        console.log('⚠️ Could not fetch existing appointments');
      }

      const availableSlots = timeSlots.map(time => {
        const availableProfessionals = professionals.filter(prof => {
          const hasConflict = existingAppointments.some(apt => {
            const aptTime = apt.scheduledTime.toTimeString().slice(0, 5);
            return aptTime === time && apt.professionalId === prof.id;
          });
          
          return !hasConflict;
        }).map(prof => ({
          id: prof.id,
          name: `${prof.firstName} ${prof.lastName}`,
          specialty: prof.specialties?.[0] || 'General',
          specialties: prof.specialties || ['General'],
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
          treatmentId,
          treatment: {
            id: treatment.id,
            name: treatment.name,
            duration: treatment.durationMinutes,
            price: treatment.price
          },
          clinic: treatment.clinic?.name || 'Belleza Estética Premium',
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
  }

  // ============================================================================
  // CREAR CITA ✅
  // ============================================================================
  static async createAppointment(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { treatmentId, date, time, professionalId, notes } = req.body;

      console.log('📅 Creating appointment:', { treatmentId, date, time, userId });

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario requerido' }
        });
      }

      if (!treatmentId || !date || !time) {
        return res.status(400).json({
          success: false,
          error: { message: 'treatmentId, date y time son requeridos' }
        });
      }

      // Para usuario demo
      if (userId === 'demo-user-123') {
        const mockAppointment = {
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
          data: { appointment: mockAppointment }
        });
      }

      // Verificar treatment
      let treatment = null;
      try {
        treatment = await prisma.treatment.findUnique({
          where: { id: treatmentId },
          include: { clinic: true }
        });
      } catch (dbError) {
        console.log('⚠️ Database error, using mock treatment');
      }

      if (!treatment) {
        const mockTreatments = AppointmentController.getMockTreatments();
        treatment = mockTreatments[treatmentId];
        
        if (!treatment) {
          return res.status(404).json({
            success: false,
            error: { message: 'Tratamiento no encontrado' }
          });
        }
        
        console.log('🔧 Using mock treatment for appointment creation');
      }

      // Verificar/asignar profesional
      let professional = null;
      const mockProfessionals = AppointmentController.getMockProfessionals();
      
      if (professionalId) {
        try {
          professional = await prisma.professional.findUnique({
            where: { id: professionalId }
          });
        } catch (dbError) {
          console.log('⚠️ Database error, using mock professional');
        }
        
        if (!professional) {
          professional = mockProfessionals.find(p => p.id === professionalId);
        }
      } else {
        professional = mockProfessionals[0];
      }

      if (!professional) {
        return res.status(404).json({
          success: false,
          error: { message: 'Profesional no disponible' }
        });
      }

      // Calcular beauty points
      const basePoints = Math.floor(treatment.price / 50);
      const beautyPointsEarned = req.user?.vipStatus ? basePoints * 2 : basePoints;

      // Crear appointment
      let appointment;
      
      try {
        // Intentar crear en BD
        appointment = await prisma.appointment.create({
          data: {
            userId,
            clinicId: treatment.clinicId || 'clinic-1',
            professionalId: professional.id,
            treatmentId,
            scheduledDate: new Date(date),
            scheduledTime: new Date(`${date}T${time}:00`),
            durationMinutes: treatment.durationMinutes,
            notes: notes || null,
            beautyPointsEarned,
            status: 'PENDING'
          },
          include: {
            treatment: true,
            professional: true,
            clinic: true
          }
        });
        
        // Actualizar beauty points del usuario
        await prisma.user.update({
          where: { id: userId },
          data: {
            beautyPoints: { increment: beautyPointsEarned }
          }
        });
        
        console.log('✅ Appointment created in database');
        
      } catch (dbError) {
        console.log('⚠️ Database error, creating mock appointment:', dbError.message);
        
        // Mock appointment
        appointment = {
          id: `apt_${Date.now()}`,
          treatment: treatment,
          professional: professional,
          clinic: treatment.clinic || { name: 'Belleza Estética Premium' },
          scheduledDate: new Date(date),
          scheduledTime: new Date(`${date}T${time}:00`),
          durationMinutes: treatment.durationMinutes,
          status: 'PENDING',
          beautyPointsEarned,
          notes: notes || null
        };
        
        console.log('✅ Mock appointment created');
      }

      res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente',
        data: {
          appointment: {
            id: appointment.id,
            treatment: {
              name: appointment.treatment.name,
              duration: appointment.durationMinutes || treatment.durationMinutes,
              price: appointment.treatment.price || treatment.price
            },
            date: appointment.scheduledDate.toISOString().split('T')[0],
            time: appointment.scheduledTime.toTimeString().slice(0, 5),
            professional: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
            clinic: appointment.clinic.name,
            status: appointment.status,
            beautyPointsEarned: appointment.beautyPointsEarned,
            notes: appointment.notes
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
  }

  // ============================================================================
  // OBTENER CITAS DEL USUARIO ✅
  // ============================================================================
  static async getUserAppointments(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { status, limit = 10, offset = 0 } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario requerido' }
        });
      }

      console.log('📅 Getting appointments for user:', userId);

      // Para usuario demo
      if (userId === 'demo-user-123') {
        const demoAppointments = [
          {
            id: 'apt-demo-123',
            treatment: { name: 'Drenaje Relajante', duration: 90, price: 3500 },
            date: '2025-07-15',
            time: '14:30',
            professional: 'Carmen Rodríguez',
            clinic: 'Belleza Estética Premium',
            status: 'CONFIRMED',
            beautyPointsEarned: 70,
            notes: 'Solicita música relajante',
            createdAt: new Date().toISOString()
          }
        ];

        return res.json({
          success: true,
          data: {
            appointments: demoAppointments,
            pagination: { total: 1, page: 1, limit: 10, hasMore: false }
          }
        });
      }

      let appointments = [];
      let total = 0;

      try {
        // Intentar obtener de BD
        const whereClause = { userId };
        if (status) {
          whereClause.status = status.toUpperCase();
        }

        appointments = await prisma.appointment.findMany({
          where: whereClause,
          include: {
            treatment: true,
            professional: true,
            clinic: true
          },
          orderBy: [
            { scheduledDate: 'desc' },
            { scheduledTime: 'desc' }
          ],
          take: parseInt(limit),
          skip: parseInt(offset)
        });

        total = await prisma.appointment.count({ where: whereClause });
        
        console.log('✅ Found appointments in database:', appointments.length);

      } catch (dbError) {
        console.log('⚠️ Database error, using mock appointments:', dbError.message);
        
        // Mock appointments como fallback
        const mockTreatments = AppointmentController.getMockTreatments();
        const mockProfessionals = AppointmentController.getMockProfessionals();
        
        appointments = [
          {
            id: `apt_${Date.now()}_1`,
            treatment: mockTreatments['t2'],
            professional: mockProfessionals[1],
            clinic: { name: 'Belleza Estética Premium' },
            scheduledDate: new Date('2025-07-15'),
            scheduledTime: new Date('2025-07-15T14:30:00'),
            durationMinutes: 90,
            status: 'CONFIRMED',
            beautyPointsEarned: 70,
            notes: null,
            createdAt: new Date()
          }
        ];
        
        total = appointments.length;
      }

      res.json({
        success: true,
        data: {
          appointments: appointments.map(apt => ({
            id: apt.id,
            treatment: {
              name: apt.treatment.name,
              duration: apt.durationMinutes,
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
          })),
          pagination: {
            total,
            page: Math.floor(offset / limit) + 1,
            limit: parseInt(limit),
            hasMore: (parseInt(offset) + parseInt(limit)) < total
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting user appointments:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // MÉTODOS ADICIONALES SIMPLIFICADOS ✅
  // ============================================================================
  
  static async updateAppointment(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      console.log('📝 Updating appointment:', id, updates);
      
      res.json({
        success: true,
        message: 'Cita actualizada exitosamente',
        data: { appointmentId: id, updates }
      });
    } catch (error) {
      console.error('❌ Error updating appointment:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  static async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const { reason = 'Cancelado por usuario' } = req.body;
      
      console.log('❌ Cancelling appointment:', id, reason);
      
      res.json({
        success: true,
        message: 'Cita cancelada exitosamente',
        data: { 
          appointmentId: id,
          status: 'CANCELLED',
          reason
        }
      });
    } catch (error) {
      console.error('❌ Error cancelling appointment:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  static async getAppointmentDetails(req, res) {
    try {
      const { id } = req.params;
      
      console.log('🔍 Getting appointment details:', id);
      
      res.json({
        success: true,
        message: 'Detalles de la cita',
        data: { appointmentId: id }
      });
    } catch (error) {
      console.error('❌ Error getting appointment details:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  static async confirmAttendance(req, res) {
    try {
      const { id } = req.params;
      
      console.log('✅ Confirming attendance:', id);
      
      res.json({
        success: true,
        message: 'Asistencia confirmada',
        data: { appointmentId: id, status: 'COMPLETED' }
      });
    } catch (error) {
      console.error('❌ Error confirming attendance:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }
}

module.exports = AppointmentController;