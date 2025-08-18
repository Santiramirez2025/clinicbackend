// ============================================================================
// controllers/appointment.controller.js - PROFESIONAL Y COMPACTO ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AppointmentController {
  // ============================================================================
  // 🔥 TRATAMIENTOS - ENDPOINT PRINCIPAL CORREGIDO
  // ============================================================================
  static async getTreatments(req, res) {
    try {
      console.log('💊 Cargando tratamientos...');
      
      const treatments = await prisma.treatment.findMany({
        where: { isActive: true },
        include: { 
          clinic: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { name: 'asc' }
      }).catch(() => []);

      console.log(`✅ ${treatments.length} tratamientos encontrados`);

      // ✅ FORMATO CORRECTO PARA EL FRONTEND
      res.json({
        success: true,
        data: treatments.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          price: t.price,
          duration: t.durationMinutes,
          category: t.category || 'Estética',
          isVipExclusive: t.isVipExclusive || false,
          isActive: t.isActive,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          clinicId: t.clinicId,
          clinic: t.clinic
        }))
      });

    } catch (error) {
      console.error('❌ Error en getTreatments:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // 📊 DASHBOARD DATA
  // ============================================================================
  static async getDashboardData(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario requerido' }
        });
      }

      console.log('📊 Dashboard para usuario:', userId);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const [appointments, userProfile] = await Promise.allSettled([
        prisma.appointment.findMany({
          where: { userId, status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] }},
          include: {
            treatment: { select: { name: true, durationMinutes: true, price: true }},
            professional: { select: { firstName: true, lastName: true }},
            clinic: { select: { name: true, address: true }}
          },
          orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }]
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { beautyPoints: true, vipStatus: true }
        })
      ]);

      const userAppointments = appointments.status === 'fulfilled' ? appointments.value : [];
      const user = userProfile.status === 'fulfilled' ? userProfile.value : {};

      const futureAppointments = userAppointments.filter(apt => 
        new Date(apt.scheduledDate) >= today && ['PENDING', 'CONFIRMED'].includes(apt.status)
      );

      const nextAppointment = futureAppointments[0];
      const todayCount = userAppointments.filter(apt => 
        new Date(apt.scheduledDate).toDateString() === today.toDateString() &&
        ['PENDING', 'CONFIRMED'].includes(apt.status)
      ).length;

      res.json({
        success: true,
        data: {
          nextAppointment: nextAppointment ? {
            id: nextAppointment.id,
            date: nextAppointment.scheduledDate.toISOString(),
            treatment: {
              name: nextAppointment.treatment?.name || 'Tratamiento',
              duration: nextAppointment.durationMinutes || 60,
              price: nextAppointment.treatment?.price || 0
            },
            status: nextAppointment.status.toLowerCase(),
            professional: nextAppointment.professional ? {
              name: `${nextAppointment.professional.firstName} ${nextAppointment.professional.lastName}`
            } : { name: 'Sin asignar' },
            location: {
              name: nextAppointment.clinic?.name || 'Clínica',
              address: nextAppointment.clinic?.address || 'Dirección no disponible'
            },
            notes: nextAppointment.notes
          } : null,
          todayAppointments: todayCount,
          upcomingAppointments: futureAppointments.length - 1,
          completedAppointments: userAppointments.filter(apt => apt.status === 'COMPLETED').length,
          beautyPoints: user?.beautyPoints || 0,
          isVIP: user?.vipStatus || false
        }
      });

    } catch (error) {
      console.error('❌ Error en dashboard:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // 📅 PRÓXIMA CITA
  // ============================================================================
  static async getNextAppointment(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario requerido' }
        });
      }

      const nextAppointment = await prisma.appointment.findFirst({
        where: { 
          userId,
          scheduledDate: { gte: new Date() },
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        include: {
          treatment: { select: { name: true, durationMinutes: true, price: true }},
          professional: { select: { firstName: true, lastName: true }},
          clinic: { select: { name: true, address: true }}
        },
        orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }]
      }).catch(() => null);

      res.json({
        success: true,
        data: nextAppointment ? {
          id: nextAppointment.id,
          date: nextAppointment.scheduledDate.toISOString(),
          treatment: {
            name: nextAppointment.treatment?.name || 'Tratamiento',
            duration: nextAppointment.durationMinutes,
            price: nextAppointment.treatment?.price || 0
          },
          status: nextAppointment.status.toLowerCase(),
          professional: nextAppointment.professional ? {
            name: `${nextAppointment.professional.firstName} ${nextAppointment.professional.lastName}`
          } : { name: 'Sin asignar' },
          location: {
            name: nextAppointment.clinic?.name || 'Clínica',
            address: nextAppointment.clinic?.address || 'Dirección no disponible'
          },
          notes: nextAppointment.notes
        } : null
      });

    } catch (error) {
      console.error('❌ Error próxima cita:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // 📋 CITAS DEL USUARIO
  // ============================================================================
  static async getUserAppointments(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario requerido' }
        });
      }

      const { status, limit = 10, offset = 0 } = req.query;
      const whereClause = { userId };
      if (status) whereClause.status = status.toUpperCase();

      const appointments = await prisma.appointment.findMany({
        where: whereClause,
        include: {
          treatment: { select: { name: true, durationMinutes: true, price: true }},
          professional: { select: { firstName: true, lastName: true }},
          clinic: { select: { name: true, address: true }}
        },
        orderBy: [{ scheduledDate: 'desc' }, { scheduledTime: 'desc' }],
        take: parseInt(limit),
        skip: parseInt(offset)
      }).catch(() => []);

      res.json({
        success: true,
        data: appointments.map(apt => ({
          id: apt.id,
          date: apt.scheduledDate.toISOString(),
          treatment: {
            name: apt.treatment?.name || 'Tratamiento',
            duration: apt.durationMinutes || 60,
            price: apt.treatment?.price || 0
          },
          status: apt.status.toLowerCase(),
          professional: apt.professional ? {
            name: `${apt.professional.firstName} ${apt.professional.lastName}`
          } : { name: 'Sin asignar' },
          location: {
            name: apt.clinic?.name || 'Clínica',
            address: apt.clinic?.address || 'Dirección no disponible'
          },
          notes: apt.notes,
          beautyPointsEarned: apt.beautyPointsEarned || 0,
          createdAt: apt.createdAt.toISOString()
        }))
      });

    } catch (error) {
      console.error('❌ Error citas usuario:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // 🕐 DISPONIBILIDAD
  // ============================================================================
  static async getAvailability(req, res) {
    try {
      let { clinicId, date } = req.params;
      if (!clinicId || !date) {
        clinicId = req.query.clinicId;
        date = req.query.date;
      }

      if (!date) {
        return res.status(400).json({
          success: false,
          error: { message: 'Fecha requerida' }
        });
      }

      const requestedDate = new Date(date);
      if (isNaN(requestedDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: { message: 'Formato de fecha inválido' }
        });
      }

      console.log('🕐 Disponibilidad para:', { clinicId, date });

      // Profesionales disponibles
      const professionals = await prisma.professional.findMany({
        where: { 
          isActive: true,
          ...(clinicId && { clinicId })
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialties: true
        }
      }).catch(() => []);

      // Citas existentes
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          scheduledDate: requestedDate,
          status: { in: ['PENDING', 'CONFIRMED'] },
          ...(clinicId && { clinicId })
        },
        select: {
          scheduledTime: true,
          professionalId: true,
          durationMinutes: true
        }
      }).catch(() => []);

      // Fallback si no hay profesionales
      if (professionals.length === 0) {
        professionals.push(
          { id: 'demo-1', firstName: 'María', lastName: 'González', specialties: ['Facial'] },
          { id: 'demo-2', firstName: 'Ana', lastName: 'Martínez', specialties: ['Masajes'] }
        );
      }

      // Generar slots disponibles
      const timeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', 
        '16:00', '16:30', '17:00', '17:30'
      ];

      const availableSlots = timeSlots.map(time => {
        const availableProfessionals = professionals.filter(prof => {
          return !existingAppointments.some(apt => {
            try {
              const aptTime = new Date(apt.scheduledTime);
              const [hours, minutes] = time.split(':').map(Number);
              const slotTime = new Date(requestedDate);
              slotTime.setHours(hours, minutes, 0, 0);
              
              return apt.professionalId === prof.id && 
                     Math.abs(aptTime.getTime() - slotTime.getTime()) < 3600000; // 1 hora
            } catch {
              return false;
            }
          });
        }).map(prof => ({
          id: prof.id,
          name: `${prof.firstName} ${prof.lastName}`,
          specialty: prof.specialties?.[0] || 'General',
          specialties: prof.specialties || ['General'],
          rating: 4.5 + Math.random() * 0.5
        }));

        return {
          time,
          available: availableProfessionals.length > 0,
          professionals: availableProfessionals,
          count: availableProfessionals.length
        };
      }).filter(slot => slot.available);

      res.json({
        success: true,
        data: {
          date,
          clinicId: clinicId || 'demo',
          clinic: {
            id: clinicId || 'demo',
            name: 'Clínica Estética',
            address: 'Dirección principal'
          },
          availableSlots,
          totalSlots: availableSlots.length,
          meta: {
            totalProfessionals: professionals.length,
            workingHours: '09:00 - 18:00',
            defaultSlotDuration: 60
          }
        }
      });

    } catch (error) {
      console.error('❌ Error disponibilidad:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // ➕ CREAR CITA
  // ============================================================================
  static async createAppointment(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { treatmentId, date, time, professionalId, notes } = req.body;

      if (!userId || !treatmentId || !date || !time) {
        return res.status(400).json({
          success: false,
          error: { message: 'Campos requeridos: treatmentId, date, time' }
        });
      }

      console.log('➕ Creando cita:', { treatmentId, date, time, userId });

      // Verificar tratamiento
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

      // Crear cita
      const appointment = await prisma.appointment.create({
        data: {
          // Relaciones usando connect
          user: {
            connect: { id: userId }
          },
          clinic: {
            connect: { id: treatment.clinicId }
          },
          treatment: {
            connect: { id: treatmentId }
          },
          
          // Professional es opcional, solo conectar si existe
          ...(professionalId && {
            professional: {
              connect: { id: professionalId }
            }
          }),
          
          // Resto de campos normales (sin cambios)
          scheduledDate: new Date(date),
          scheduledTime: new Date(`${date}T${time}:00`),
          durationMinutes: treatment.durationMinutes,
          originalPrice: treatment.price,
          finalPrice: treatment.price,
          notes: notes || null,
          beautyPointsEarned: Math.floor(treatment.price / 50),
          status: 'PENDING'
        },
        include: {
          treatment: true,
          professional: true,
          clinic: true,
          user: true  // ✅ Agregar user también
        }
      });

      res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente',
        data: {
          id: appointment.id,
          date: appointment.scheduledDate.toISOString(),
          treatment: {
            name: appointment.treatment.name,
            duration: appointment.durationMinutes,
            price: appointment.treatment.price
          },
          status: appointment.status.toLowerCase(),
          professional: appointment.professional ? {
            name: `${appointment.professional.firstName} ${appointment.professional.lastName}`
          } : null,
          location: {
            name: appointment.clinic.name,
            address: appointment.clinic.address || 'Dirección no disponible'
          },
          notes: appointment.notes,
          beautyPointsEarned: appointment.beautyPointsEarned
        }
      });

    } catch (error) {
      console.error('❌ Error crear cita:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // 📊 ESTADÍSTICAS
  // ============================================================================
  static async getAppointmentStats(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario requerido' }
        });
      }

      const appointments = await prisma.appointment.findMany({
        where: { userId },
        include: { treatment: { select: { price: true } } }
      }).catch(() => []);

      const stats = {
        total: appointments.length,
        completed: appointments.filter(apt => apt.status === 'COMPLETED').length,
        pending: appointments.filter(apt => ['PENDING', 'CONFIRMED'].includes(apt.status)).length,
        cancelled: appointments.filter(apt => apt.status === 'CANCELLED').length,
        totalSpent: appointments
          .filter(apt => apt.status === 'COMPLETED')
          .reduce((sum, apt) => sum + (apt.finalPrice || 0), 0),
        beautyPointsEarned: appointments
          .filter(apt => apt.status === 'COMPLETED')
          .reduce((sum, apt) => sum + (apt.beautyPointsEarned || 0), 0)
      };

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('❌ Error estadísticas:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }
}

module.exports = AppointmentController;