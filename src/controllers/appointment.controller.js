// ============================================================================
// src/controllers/appointment.controller.js - VERSIÓN COMPLETA CORREGIDA ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class AppointmentController {
  // ============================================================================
  // DASHBOARD DATA - ENDPOINT PRINCIPAL CORREGIDO ✅
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

      console.log('📊 Getting dashboard data for user:', userId);

      // Verificar que el usuario existe
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true }
      });

      if (!userExists) {
        return res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado' }
        });
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      try {
        // Obtener datos en paralelo con validaciones defensivas
        const [appointments, userProfile, featuredTreatments] = await Promise.all([
          // Citas del usuario - CON VALIDACIÓN DEFENSIVA
          prisma.appointment.findMany({
            where: { 
              userId,
              status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] }
            },
            include: {
              treatment: {
                select: { name: true, durationMinutes: true, price: true }
              },
              professional: {
                select: { firstName: true, lastName: true }
              },
              clinic: {
                select: { name: true, address: true }
              }
            },
            orderBy: [
              { scheduledDate: 'asc' },
              { scheduledTime: 'asc' }
            ]
          }).catch(error => {
            console.warn('⚠️ Error fetching appointments:', error.message);
            return [];
          }),
          
          // Perfil del usuario
          prisma.user.findUnique({
            where: { id: userId },
            select: { beautyPoints: true, vipStatus: true }
          }).catch(error => {
            console.warn('⚠️ Error fetching user profile:', error.message);
            return { beautyPoints: 0, vipStatus: false };
          }),
          
          // Tratamientos destacados - CON VALIDACIÓN
          prisma.treatment.findMany({
            where: { 
              isActive: true,
              isFeatured: true 
            },
            select: {
              id: true,
              name: true,
              durationMinutes: true,
              price: true,
              description: true,
              category: true
            },
            take: 3,
            orderBy: { name: 'asc' } // Cambiar de popularity a name
          }).catch(error => {
            console.warn('⚠️ Error fetching treatments:', error.message);
            return [];
          })
        ]);

        // Procesar citas con validaciones
        const futureAppointments = (appointments || []).filter(apt => {
          try {
            const aptDate = new Date(apt.scheduledDate);
            return aptDate >= today && ['PENDING', 'CONFIRMED'].includes(apt.status);
          } catch {
            return false;
          }
        });

        const nextAppointment = futureAppointments[0];
        
        const todayAppointments = (appointments || []).filter(apt => {
          try {
            const aptDate = new Date(apt.scheduledDate);
            return aptDate.toDateString() === today.toDateString() && 
                   ['PENDING', 'CONFIRMED'].includes(apt.status);
          } catch {
            return false;
          }
        }).length;

        const upcomingAppointments = futureAppointments.slice(1, 6);
        const recentAppointments = (appointments || [])
          .filter(apt => apt.status === 'COMPLETED')
          .slice(-3);

        // Formatear respuesta con validaciones defensivas
        const dashboardData = {
          nextAppointment: nextAppointment ? {
            id: nextAppointment.id,
            date: nextAppointment.scheduledDate.toISOString(),
            treatment: {
              name: nextAppointment.treatment?.name || 'Tratamiento',
              duration: nextAppointment.durationMinutes || 60,
              price: nextAppointment.treatment?.price || 0
            },
            status: nextAppointment.status.toLowerCase(),
            professional: {
              name: nextAppointment.professional ? 
                `${nextAppointment.professional.firstName} ${nextAppointment.professional.lastName}` :
                'Profesional sin asignar'
            },
            location: {
              name: nextAppointment.clinic?.name || 'Clínica',
              address: nextAppointment.clinic?.address || 'Dirección no disponible'
            },
            notes: nextAppointment.notes
          } : null,

          featuredTreatments: (featuredTreatments || []).map(t => ({
            id: t.id,
            name: t.name,
            duration: t.durationMinutes,
            price: t.price,
            emoji: this.getEmojiForCategory(t.category),
            description: t.description || ''
          })),

          user: {
            beautyPoints: userProfile?.beautyPoints || 0,
            vipStatus: userProfile?.vipStatus || false
          },

          todayAppointments,
          
          upcomingAppointments: upcomingAppointments.map(apt => ({
            id: apt.id,
            date: apt.scheduledDate.toISOString(),
            treatment: { name: apt.treatment?.name || 'Tratamiento' },
            status: apt.status.toLowerCase()
          })),

          recentAppointments: recentAppointments.map(apt => ({
            id: apt.id,
            date: apt.scheduledDate.toISOString(),
            treatment: { name: apt.treatment?.name || 'Tratamiento' },
            status: apt.status.toLowerCase()
          }))
        };

        console.log('✅ Dashboard data prepared:', {
          hasNextAppointment: !!nextAppointment,
          todayCount: todayAppointments,
          upcomingCount: upcomingAppointments.length,
          beautyPoints: dashboardData.user.beautyPoints,
          treatmentsCount: featuredTreatments?.length || 0
        });

        res.json({
          success: true,
          data: dashboardData
        });

      } catch (dataError) {
        console.error('❌ Error processing dashboard data:', dataError);
        
        // FALLBACK: Retornar datos mínimos en caso de error
        res.json({
          success: true,
          data: {
            nextAppointment: null,
            featuredTreatments: [],
            user: {
              beautyPoints: 0,
              vipStatus: false
            },
            todayAppointments: 0,
            upcomingAppointments: [],
            recentAppointments: []
          }
        });
      }

    } catch (error) {
      console.error('❌ Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error interno del servidor',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  // ============================================================================
  // HEALTH CHECK - VERIFICAR ESTADO DE BD ✅
  // ============================================================================
  static async checkDatabaseHealth(req, res) {
    try {
      const checks = await Promise.allSettled([
        prisma.user.count(),
        prisma.appointment.count(),
        prisma.treatment.count(),
        prisma.professional.count(),
        prisma.clinic.count()
      ]);

      const results = {
        users: checks[0].status === 'fulfilled' ? checks[0].value : 0,
        appointments: checks[1].status === 'fulfilled' ? checks[1].value : 0,
        treatments: checks[2].status === 'fulfilled' ? checks[2].value : 0,
        professionals: checks[3].status === 'fulfilled' ? checks[3].value : 0,
        clinics: checks[4].status === 'fulfilled' ? checks[4].value : 0
      };

      const errors = checks
        .map((check, index) => ({ index, check }))
        .filter(({ check }) => check.status === 'rejected')
        .map(({ index, check }) => ({
          table: ['users', 'appointments', 'treatments', 'professionals', 'clinics'][index],
          error: check.reason?.message || 'Unknown error'
        }));

      console.log('🏥 Database health check:', results);
      if (errors.length > 0) {
        console.error('❌ Database errors:', errors);
      }

      res.json({
        success: true,
        data: {
          tablesCounts: results,
          totalTables: Object.keys(results).length,
          workingTables: Object.values(results).filter(count => count >= 0).length,
          errors: errors
        }
      });

    } catch (error) {
      console.error('❌ Database health check failed:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error verificando base de datos' }
      });
    }
  }

  // ============================================================================
  // CITAS DEL USUARIO ✅
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

      const whereClause = { userId };
      if (status) {
        whereClause.status = status.toUpperCase();
      }

      const [appointments, total] = await Promise.all([
        prisma.appointment.findMany({
          where: whereClause,
          include: {
            treatment: {
              select: { name: true, durationMinutes: true, price: true }
            },
            professional: {
              select: { firstName: true, lastName: true }
            },
            clinic: {
              select: { name: true, address: true }
            }
          },
          orderBy: [
            { scheduledDate: 'desc' },
            { scheduledTime: 'desc' }
          ],
          take: parseInt(limit),
          skip: parseInt(offset)
        }).catch(error => {
          console.warn('⚠️ Error fetching appointments:', error.message);
          return [];
        }),
        
        prisma.appointment.count({ where: whereClause }).catch(() => 0)
      ]);

      res.json({
        success: true,
        data: {
          appointments: (appointments || []).map(apt => ({
            id: apt.id,
            date: apt.scheduledDate.toISOString(),
            treatment: {
              name: apt.treatment?.name || 'Tratamiento',
              duration: apt.durationMinutes || 60,
              price: apt.treatment?.price || 0
            },
            status: apt.status.toLowerCase(),
            professional: {
              name: apt.professional ? 
                `${apt.professional.firstName} ${apt.professional.lastName}` :
                'Profesional sin asignar'
            },
            location: {
              name: apt.clinic?.name || 'Clínica',
              address: apt.clinic?.address || 'Dirección no disponible'
            },
            notes: apt.notes,
            beautyPointsEarned: apt.beautyPointsEarned || 0,
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
  // TRATAMIENTOS DISPONIBLES ✅
  // ============================================================================
  static async getTreatments(req, res) {
    try {
      console.log('💆‍♀️ Getting treatments...');
      
      const treatments = await prisma.treatment.findMany({
        where: { isActive: true },
        include: { 
          clinic: { 
            select: { name: true } 
          } 
        },
        orderBy: { name: 'asc' }
      }).catch(error => {
        console.warn('⚠️ Error fetching treatments:', error.message);
        return [];
      });

      res.json({
        success: true,
        data: {
          treatments: (treatments || []).map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description || '',
            duration: treatment.durationMinutes,
            durationMinutes: treatment.durationMinutes,
            price: treatment.price,
            category: treatment.category,
            emoji: this.getEmojiForCategory(treatment.category),
            iconName: treatment.iconName,
            isVipExclusive: treatment.isVipExclusive || false,
            clinic: treatment.clinic?.name || 'Clínica'
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
  // DISPONIBILIDAD ✅
  // ============================================================================
  static async getAvailability(req, res) {
    try {
      const { treatmentId, date } = req.params.treatmentId ? req.params : req.query;

      if (!treatmentId || !date) {
        return res.status(400).json({
          success: false,
          error: { message: 'treatmentId y date son requeridos' }
        });
      }

      console.log('⏰ Getting availability for:', treatmentId, date);

      const [treatment, professionals, existingAppointments] = await Promise.all([
        // Tratamiento
        prisma.treatment.findUnique({
          where: { id: treatmentId },
          include: { clinic: { select: { name: true } } }
        }).catch(() => null),
        
        // Profesionales disponibles
        prisma.professional.findMany({
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialties: true
          }
        }).catch(() => []),
        
        // Citas existentes
        prisma.appointment.findMany({
          where: {
            scheduledDate: new Date(date),
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          select: {
            scheduledTime: true,
            professionalId: true
          }
        }).catch(() => [])
      ]);

      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Tratamiento no encontrado' }
        });
      }

      // Horarios disponibles
      const timeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
      ];

      const availableSlots = timeSlots.map(time => {
        const availableProfessionals = professionals.filter(prof => {
          const hasConflict = existingAppointments.some(apt => {
            try {
              const aptTime = apt.scheduledTime.toTimeString().slice(0, 5);
              return aptTime === time && apt.professionalId === prof.id;
            } catch {
              return false;
            }
          });
          
          return !hasConflict;
        }).map(prof => ({
          id: prof.id,
          name: `${prof.firstName} ${prof.lastName}`,
          specialty: prof.specialties?.[0] || 'General',
          specialties: prof.specialties || ['General'],
          rating: 4.5 // Rating por defecto
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
          clinic: treatment.clinic?.name || 'Clínica Estética',
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

      if (!userId || !treatmentId || !date || !time) {
        return res.status(400).json({
          success: false,
          error: { message: 'Campos requeridos: treatmentId, date, time' }
        });
      }

      // Verificar disponibilidad
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          scheduledDate: new Date(date),
          scheduledTime: new Date(`${date}T${time}:00`),
          professionalId,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      }).catch(() => null);

      if (existingAppointment) {
        return res.status(409).json({
          success: false,
          error: { message: 'Horario no disponible' }
        });
      }

      // Obtener datos del tratamiento
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

      // Calcular beauty points
      const basePoints = Math.floor(treatment.price / 50);
      const userProfile = await prisma.user.findUnique({
        where: { id: userId },
        select: { vipStatus: true }
      });
      const beautyPointsEarned = userProfile?.vipStatus ? basePoints * 2 : basePoints;

      // Crear cita
      const appointment = await prisma.appointment.create({
        data: {
          userId,
          clinicId: treatment.clinicId,
          professionalId: professionalId || null,
          treatmentId,
          scheduledDate: new Date(date),
          scheduledTime: new Date(`${date}T${time}:00`),
          endTime: new Date(new Date(`${date}T${time}:00`).getTime() + (treatment.durationMinutes * 60000)),
          durationMinutes: treatment.durationMinutes,
          originalPrice: treatment.price,
          finalPrice: treatment.price,
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

      console.log('✅ Appointment created:', appointment.id);

      res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente',
        data: {
          appointment: {
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
  // CANCELAR CITA ✅
  // ============================================================================
  static async cancelAppointment(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || req.user?.userId;
      const { reason = 'Cancelado por usuario' } = req.body;
      
      console.log('❌ Cancelling appointment:', id);

      const appointment = await prisma.appointment.update({
        where: { id, userId },
        data: { 
          status: 'CANCELLED',
          notes: reason,
          cancelledAt: new Date(),
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Cita cancelada exitosamente',
        data: { 
          appointment: {
            id: appointment.id,
            status: 'cancelled',
            reason,
            cancelledAt: appointment.cancelledAt.toISOString()
          }
        }
      });

    } catch (error) {
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: { message: 'Cita no encontrada' }
        });
      }

      console.error('❌ Error cancelling appointment:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // PRÓXIMA CITA ✅
  // ============================================================================
  static async getNextAppointment(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;

      const nextAppointment = await prisma.appointment.findFirst({
        where: { 
          userId,
          scheduledDate: { gte: new Date() },
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        include: {
          treatment: {
            select: { name: true, durationMinutes: true, price: true }
          },
          professional: {
            select: { firstName: true, lastName: true }
          },
          clinic: {
            select: { name: true, address: true }
          }
        },
        orderBy: [
          { scheduledDate: 'asc' },
          { scheduledTime: 'asc' }
        ]
      }).catch(() => null);

      res.json({
        success: true,
        data: {
          nextAppointment: nextAppointment ? {
            id: nextAppointment.id,
            date: nextAppointment.scheduledDate.toISOString(),
            treatment: {
              name: nextAppointment.treatment?.name || 'Tratamiento',
              duration: nextAppointment.durationMinutes,
              price: nextAppointment.treatment?.price || 0
            },
            status: nextAppointment.status.toLowerCase(),
            professional: {
              name: nextAppointment.professional ? 
                `${nextAppointment.professional.firstName} ${nextAppointment.professional.lastName}` :
                'Profesional sin asignar'
            },
            location: {
              name: nextAppointment.clinic?.name || 'Clínica',
              address: nextAppointment.clinic?.address || 'Dirección no disponible'
            },
            notes: nextAppointment.notes
          } : null
        },
        message: nextAppointment ? 'Próxima cita encontrada' : 'No hay citas programadas'
      });

    } catch (error) {
      console.error('❌ Error getting next appointment:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // ESTADÍSTICAS ✅
  // ============================================================================
  static async getAppointmentStats(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;

      const appointments = await prisma.appointment.findMany({
        where: { userId },
        include: { treatment: { select: { price: true } } }
      }).catch(() => []);

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const stats = {
        total: appointments.length,
        completed: appointments.filter(apt => apt.status === 'COMPLETED').length,
        pending: appointments.filter(apt => ['PENDING', 'CONFIRMED'].includes(apt.status)).length,
        cancelled: appointments.filter(apt => apt.status === 'CANCELLED').length,
        thisMonth: appointments.filter(apt => apt.scheduledDate >= firstDayOfMonth).length,
        totalSpent: appointments
          .filter(apt => apt.status === 'COMPLETED')
          .reduce((sum, apt) => sum + (apt.finalPrice || apt.treatment?.price || 0), 0),
        beautyPointsEarned: appointments
          .filter(apt => apt.status === 'COMPLETED')
          .reduce((sum, apt) => sum + (apt.beautyPointsEarned || 0), 0)
      };

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      console.error('❌ Error getting appointment stats:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // UTILIDADES ✅
  // ============================================================================
  static getEmojiForCategory(category) {
    const emojiMap = {
      'Facial': '✨',
      'Corporal': '🌿', 
      'Masajes': '💆‍♀️',
      'Láser': '⚡',
      'Estética': '💅',
      'Relajación': '🧘‍♀️',
      'Premium': '👑'
    };
    return emojiMap[category] || '💆‍♀️';
  }
}

module.exports = AppointmentController;