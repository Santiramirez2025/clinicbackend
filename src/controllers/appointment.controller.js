// ============================================================================
// 📅 SINGLE CLINIC APPOINTMENT CONTROLLER - PRODUCTION READY v4.0 ✅
// src/controllers/appointment.controller.js - OPTIMIZED FOR SINGLE CLINIC
// ============================================================================

const { PrismaClient } = require('@prisma/client');

// Singleton de Prisma
let prisma;
if (global.prisma) {
  prisma = global.prisma;
} else {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    datasources: {
      db: { url: process.env.DATABASE_URL }
    },
    errorFormat: 'pretty'
  });
  global.prisma = prisma;
}

// Configuración de horarios de negocio
const BUSINESS_HOURS = {
  monday: { open: '09:00', close: '20:00', enabled: true },
  tuesday: { open: '09:00', close: '20:00', enabled: true },
  wednesday: { open: '09:00', close: '20:00', enabled: true },
  thursday: { open: '09:00', close: '20:00', enabled: true },
  friday: { open: '09:00', close: '20:00', enabled: true },
  saturday: { open: '10:00', close: '18:00', enabled: true },
  sunday: { closed: true }
};

// Utilidades
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && date > new Date();
};

const isValidTime = (timeString) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(timeString);
};

const getBusinessHoursForDate = (date) => {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[new Date(date).getDay()];
  return BUSINESS_HOURS[dayName];
};

const generateTimeSlots = (openTime, closeTime, slotDuration = 30) => {
  const slots = [];
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  
  let current = new Date();
  current.setHours(openHour, openMin, 0, 0);
  
  const end = new Date();
  end.setHours(closeHour, closeMin, 0, 0);
  
  while (current < end) {
    const timeString = current.toTimeString().slice(0, 5);
    slots.push(timeString);
    current.setMinutes(current.getMinutes() + slotDuration);
  }
  
  return slots;
};

class AppointmentController {

  // ============================================================================
  // 📊 DASHBOARD DATA - OPTIMIZADO
  // ============================================================================
  static async getDashboardData(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        });
      }

      console.log(`📊 Loading dashboard for user: ${userId}`);

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);

      // Queries paralelas para mejor performance
      const [appointmentsResult, userResult, treatmentsResult] = await Promise.allSettled([
        prisma.appointment.findMany({
          where: { 
            userId,
            scheduledDate: { gte: thirtyDaysAgo }
          },
          include: {
            treatment: { 
              select: { 
                name: true, 
                durationMinutes: true, 
                price: true,
                category: true
              } 
            },
            professional: { 
              select: { 
                firstName: true, 
                lastName: true,
                specialties: true
              } 
            }
          },
          orderBy: [
            { scheduledDate: 'asc' }, 
            { scheduledTime: 'asc' }
          ]
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { 
            beautyPoints: true, 
            vipStatus: true, 
            loyaltyTier: true,
            totalInvestment: true,
            sessionsCompleted: true
          }
        }),
        prisma.treatment.count({
          where: { isActive: true }
        })
      ]);

      const appointments = appointmentsResult.status === 'fulfilled' ? appointmentsResult.value : [];
      const user = userResult.status === 'fulfilled' ? userResult.value : {};
      const totalTreatments = treatmentsResult.status === 'fulfilled' ? treatmentsResult.value : 0;

      // Filtrar citas por estado y fecha
      const futureAppointments = appointments.filter(apt => 
        new Date(apt.scheduledDate) >= today && 
        ['PENDING', 'CONFIRMED'].includes(apt.status)
      );

      const todayAppointments = appointments.filter(apt => 
        new Date(apt.scheduledDate).toDateString() === today.toDateString() &&
        ['PENDING', 'CONFIRMED'].includes(apt.status)
      );

      const completedAppointments = appointments.filter(apt => apt.status === 'COMPLETED');

      const nextAppointment = futureAppointments[0];

      // Calcular estadísticas
      const stats = {
        totalAppointments: appointments.length,
        completedAppointments: completedAppointments.length,
        pendingAppointments: appointments.filter(apt => 
          ['PENDING', 'CONFIRMED'].includes(apt.status)
        ).length,
        cancelledAppointments: appointments.filter(apt => 
          apt.status === 'CANCELLED'
        ).length,
        totalSpent: completedAppointments.reduce((sum, apt) => 
          sum + (apt.finalPrice || 0), 0
        ),
        beautyPointsEarned: completedAppointments.reduce((sum, apt) => 
          sum + (apt.beautyPointsEarned || 0), 0
        )
      };

      res.status(200).json({
        success: true,
        data: {
          nextAppointment: nextAppointment ? {
            id: nextAppointment.id,
            date: nextAppointment.scheduledDate.toISOString(),
            time: nextAppointment.scheduledTime ? 
              new Date(nextAppointment.scheduledTime).toTimeString().slice(0, 5) : 
              '09:00',
            treatment: {
              name: nextAppointment.treatment?.name || 'Treatment',
              duration: nextAppointment.durationMinutes || 60,
              price: nextAppointment.finalPrice || nextAppointment.treatment?.price || 0,
              category: nextAppointment.treatment?.category || 'General'
            },
            status: nextAppointment.status.toLowerCase(),
            professional: nextAppointment.professional ? {
              name: `${nextAppointment.professional.firstName} ${nextAppointment.professional.lastName}`,
              specialties: nextAppointment.professional.specialties || []
            } : null,
            notes: nextAppointment.notes,
            beautyPointsEarned: nextAppointment.beautyPointsEarned || 0
          } : null,
          
          todayAppointments: todayAppointments.length,
          upcomingAppointments: futureAppointments.length,
          
          userProfile: {
            beautyPoints: user?.beautyPoints || 0,
            vipStatus: user?.vipStatus || false,
            loyaltyTier: user?.loyaltyTier || 'BRONZE',
            totalInvestment: user?.totalInvestment || 0,
            sessionsCompleted: user?.sessionsCompleted || 0
          },
          
          stats,
          
          quickActions: [
            { 
              type: 'book_appointment', 
              label: 'Book New Appointment', 
              available: totalTreatments > 0 
            },
            { 
              type: 'view_history', 
              label: 'View History', 
              available: appointments.length > 0 
            },
            { 
              type: 'manage_profile', 
              label: 'Update Profile', 
              available: true 
            }
          ]
        },
        message: 'Dashboard data loaded successfully'
      });

    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error loading dashboard data', 
          code: 'DASHBOARD_ERROR' 
        }
      });
    }
  }

  // ============================================================================
  // 📋 OBTENER CITAS DEL USUARIO
  // ============================================================================
  static async getUserAppointments(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        });
      }

      const { 
        status, 
        limit = 10, 
        offset = 0, 
        startDate, 
        endDate,
        sort = 'desc' 
      } = req.query;

      // Construir filtros
      const whereClause = { userId };
      
      if (status) {
        whereClause.status = status.toUpperCase();
      }
      
      if (startDate || endDate) {
        whereClause.scheduledDate = {};
        if (startDate) whereClause.scheduledDate.gte = new Date(startDate);
        if (endDate) whereClause.scheduledDate.lte = new Date(endDate);
      }

      // Obtener citas con información completa
      const appointments = await prisma.appointment.findMany({
        where: whereClause,
        include: {
          treatment: { 
            select: { 
              name: true, 
              durationMinutes: true, 
              price: true,
              category: true
            } 
          },
          professional: { 
            select: { 
              firstName: true, 
              lastName: true,
              specialties: true,
              rating: true
            } 
          }
        },
        orderBy: [
          { scheduledDate: sort === 'asc' ? 'asc' : 'desc' }, 
          { scheduledTime: sort === 'asc' ? 'asc' : 'desc' }
        ],
        take: Math.min(parseInt(limit), 50), // Máximo 50
        skip: parseInt(offset)
      });

      // Contar total para paginación
      const total = await prisma.appointment.count({ where: whereClause });

      // Formatear respuesta
      const formattedAppointments = appointments.map(apt => ({
        id: apt.id,
        date: apt.scheduledDate.toISOString(),
        time: apt.scheduledTime ? 
          new Date(apt.scheduledTime).toTimeString().slice(0, 5) : 
          '09:00',
        treatment: {
          name: apt.treatment?.name || 'Treatment',
          duration: apt.durationMinutes || 60,
          price: apt.finalPrice || apt.treatment?.price || 0,
          originalPrice: apt.originalPrice || apt.treatment?.price || 0,
          category: apt.treatment?.category || 'General'
        },
        status: {
          code: apt.status,
          label: apt.status.toLowerCase(),
          canCancel: ['PENDING', 'CONFIRMED'].includes(apt.status) && 
                    new Date(apt.scheduledDate) > new Date(),
          canReschedule: ['PENDING', 'CONFIRMED'].includes(apt.status) && 
                        new Date(apt.scheduledDate) > new Date()
        },
        professional: apt.professional ? {
          name: `${apt.professional.firstName} ${apt.professional.lastName}`,
          specialties: apt.professional.specialties || [],
          rating: apt.professional.rating || 4.5
        } : null,
        notes: apt.notes,
        beautyPointsEarned: apt.beautyPointsEarned || 0,
        createdAt: apt.createdAt.toISOString(),
        updatedAt: apt.updatedAt.toISOString()
      }));

      res.status(200).json({
        success: true,
        data: formattedAppointments,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < total
        },
        message: `${formattedAppointments.length} appointments retrieved`
      });

    } catch (error) {
      console.error('Get user appointments error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error retrieving appointments', 
          code: 'APPOINTMENTS_ERROR' 
        }
      });
    }
  }

  // ============================================================================
  // 🕐 OBTENER DISPONIBILIDAD
  // ============================================================================
  static async getAvailability(req, res) {
    try {
      const { date } = req.params;
      const { treatmentId, professionalId } = req.query;

      if (!date || !isValidDate(date)) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Valid future date is required', 
            code: 'INVALID_DATE' 
          }
        });
      }

      console.log(`🕐 Checking availability for: ${date}`);

      const requestedDate = new Date(date);
      const dayHours = getBusinessHoursForDate(requestedDate);

      if (!dayHours.enabled || dayHours.closed) {
        return res.status(200).json({
          success: true,
          data: {
            date,
            availableSlots: [],
            message: 'Clinic is closed on this day'
          }
        });
      }

      // Obtener profesionales disponibles
      let professionalsQuery = {
        isActive: true
      };

      if (professionalId) {
        professionalsQuery.id = professionalId;
      }

      const professionals = await prisma.professional.findMany({
        where: professionalsQuery,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialties: true,
          rating: true,
          schedule: true
        }
      });

      // Obtener citas existentes para la fecha
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          scheduledDate: requestedDate,
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        select: {
          scheduledTime: true,
          professionalId: true,
          durationMinutes: true
        }
      });

      // Generar slots de tiempo
      const timeSlots = generateTimeSlots(dayHours.open, dayHours.close, 30);

      // Verificar disponibilidad para cada slot
      const availableSlots = timeSlots.map(time => {
        const availableProfessionals = professionals.filter(prof => {
          // Verificar si el profesional está ocupado en este horario
          const isOccupied = existingAppointments.some(apt => {
            if (apt.professionalId !== prof.id) return false;
            
            try {
              const aptTime = new Date(apt.scheduledTime);
              const [hours, minutes] = time.split(':').map(Number);
              const slotTime = new Date(requestedDate);
              slotTime.setHours(hours, minutes, 0, 0);
              
              const aptDuration = apt.durationMinutes || 60;
              const aptEnd = new Date(aptTime.getTime() + (aptDuration * 60 * 1000));
              const slotEnd = new Date(slotTime.getTime() + (60 * 60 * 1000)); // 1 hora por defecto
              
              // Verificar solapamiento
              return (slotTime < aptEnd && slotEnd > aptTime);
            } catch {
              return false;
            }
          });

          return !isOccupied;
        });

        return {
          time,
          available: availableProfessionals.length > 0,
          professionals: availableProfessionals.map(prof => ({
            id: prof.id,
            name: `${prof.firstName} ${prof.lastName}`,
            specialties: prof.specialties || [],
            rating: prof.rating || 4.5
          })),
          count: availableProfessionals.length
        };
      }).filter(slot => slot.available);

      res.status(200).json({
        success: true,
        data: {
          date,
          businessHours: dayHours,
          availableSlots,
          totalSlots: availableSlots.length,
          professionals: professionals.map(prof => ({
            id: prof.id,
            name: `${prof.firstName} ${prof.lastName}`,
            specialties: prof.specialties || [],
            rating: prof.rating || 4.5
          }))
        },
        message: `${availableSlots.length} available time slots found`
      });

    } catch (error) {
      console.error('Get availability error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error checking availability', 
          code: 'AVAILABILITY_ERROR' 
        }
      });
    }
  }

  // ============================================================================
  // ➕ CREAR CITA
  // ============================================================================
  static async createAppointment(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        });
      }

      const { 
        treatmentId, 
        date, 
        time, 
        professionalId, 
        notes,
        useBeautyPoints = false 
      } = req.body;

      // Validaciones
      if (!treatmentId || !date || !time) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Treatment, date, and time are required', 
            code: 'MISSING_FIELDS' 
          }
        });
      }

      if (!isValidDate(date) || !isValidTime(time)) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Invalid date or time format', 
            code: 'INVALID_FORMAT' 
          }
        });
      }

      console.log(`➕ Creating appointment: ${treatmentId} on ${date} at ${time}`);

      // Verificar tratamiento
      const treatment = await prisma.treatment.findUnique({
        where: { id: treatmentId, isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          durationMinutes: true,
          isVipExclusive: true,
          category: true
        }
      });

      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Treatment not found', code: 'TREATMENT_NOT_FOUND' }
        });
      }

      // Verificar si es VIP exclusive y el usuario es VIP
      if (treatment.isVipExclusive && !req.user.vipStatus) {
        return res.status(403).json({
          success: false,
          error: { 
            message: 'This treatment is VIP exclusive', 
            code: 'VIP_REQUIRED' 
          }
        });
      }

      // Crear fecha y hora completa
      const appointmentDateTime = new Date(`${date}T${time}:00`);
      const appointmentDate = new Date(date);

      // Verificar disponibilidad del slot
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          scheduledDate: appointmentDate,
          scheduledTime: appointmentDateTime,
          professionalId: professionalId || undefined,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });

      if (existingAppointment) {
        return res.status(409).json({
          success: false,
          error: { 
            message: 'Time slot is not available', 
            code: 'SLOT_UNAVAILABLE' 
          }
        });
      }

      // Obtener información del usuario para calcular descuentos
      let finalPrice = treatment.price;
      let beautyPointsUsed = 0;
      let beautyPointsEarned = Math.floor(treatment.price / 10); // 1 punto por cada 10€

      if (useBeautyPoints && req.user.beautyPoints > 0) {
        const maxPointsToUse = Math.min(req.user.beautyPoints, treatment.price);
        beautyPointsUsed = maxPointsToUse;
        finalPrice = Math.max(0, finalPrice - beautyPointsUsed);
      }

      // VIP discount
      if (req.user.vipStatus) {
        finalPrice = finalPrice * 0.9; // 10% descuento VIP
        beautyPointsEarned = Math.floor(beautyPointsEarned * 1.5); // 50% más puntos
      }

      // Crear la cita
      const appointment = await prisma.appointment.create({
        data: {
          userId,
          treatmentId,
          professionalId: professionalId || null,
          scheduledDate: appointmentDate,
          scheduledTime: appointmentDateTime,
          durationMinutes: treatment.durationMinutes || 60,
          originalPrice: treatment.price,
          finalPrice: Math.round(finalPrice * 100) / 100, // Redondear a 2 decimales
          beautyPointsUsed,
          beautyPointsEarned,
          notes: notes || null,
          status: 'PENDING'
        },
        include: {
          treatment: {
            select: {
              name: true,
              category: true,
              durationMinutes: true
            }
          },
          professional: {
            select: {
              firstName: true,
              lastName: true,
              specialties: true
            }
          }
        }
      });

      // Actualizar puntos del usuario si se usaron
      if (beautyPointsUsed > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            beautyPoints: { decrement: beautyPointsUsed }
          }
        });
      }

      res.status(201).json({
        success: true,
        data: {
          id: appointment.id,
          date: appointment.scheduledDate.toISOString(),
          time: appointment.scheduledTime.toTimeString().slice(0, 5),
          treatment: {
            id: treatment.id,
            name: appointment.treatment.name,
            duration: appointment.durationMinutes,
            category: appointment.treatment.category,
            originalPrice: appointment.originalPrice,
            finalPrice: appointment.finalPrice
          },
          status: appointment.status.toLowerCase(),
          professional: appointment.professional ? {
            name: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
            specialties: appointment.professional.specialties || []
          } : null,
          notes: appointment.notes,
          beautyPoints: {
            used: appointment.beautyPointsUsed,
            earned: appointment.beautyPointsEarned
          },
          createdAt: appointment.createdAt.toISOString()
        },
        message: 'Appointment created successfully'
      });

    } catch (error) {
      console.error('Create appointment error:', error);
      
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: { 
            message: 'Appointment slot already taken', 
            code: 'SLOT_CONFLICT' 
          }
        });
      }

      res.status(500).json({
        success: false,
        error: { 
          message: 'Error creating appointment', 
          code: 'APPOINTMENT_CREATION_ERROR' 
        }
      });
    }
  }

  // ============================================================================
  // ✏️ ACTUALIZAR CITA
  // ============================================================================
  static async updateAppointment(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { appointmentId } = req.params;
      const { date, time, notes, status } = req.body;

      if (!userId || !appointmentId) {
        return res.status(400).json({
          success: false,
          error: { message: 'User ID and appointment ID required', code: 'MISSING_IDS' }
        });
      }

      // Verificar que la cita existe y pertenece al usuario
      const existingAppointment = await prisma.appointment.findFirst({
        where: { 
          id: appointmentId, 
          userId 
        },
        include: {
          treatment: { select: { name: true, price: true } }
        }
      });

      if (!existingAppointment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Appointment not found', code: 'APPOINTMENT_NOT_FOUND' }
        });
      }

      // Verificar si se puede modificar
      const canModify = ['PENDING', 'CONFIRMED'].includes(existingAppointment.status) &&
                       new Date(existingAppointment.scheduledDate) > new Date();

      if (!canModify && (date || time)) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Cannot reschedule past or completed appointments', 
            code: 'CANNOT_RESCHEDULE' 
          }
        });
      }

      // Preparar datos para actualizar
      const updateData = {};
      
      if (date && isValidDate(date)) {
        updateData.scheduledDate = new Date(date);
      }
      
      if (time && isValidTime(time)) {
        const dateToUse = date || existingAppointment.scheduledDate.toISOString().split('T')[0];
        updateData.scheduledTime = new Date(`${dateToUse}T${time}:00`);
      }
      
      if (notes !== undefined) {
        updateData.notes = notes;
      }
      
      if (status && ['PENDING', 'CONFIRMED', 'CANCELLED'].includes(status.toUpperCase())) {
        updateData.status = status.toUpperCase();
      }

      // Actualizar la cita
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: updateData,
        include: {
          treatment: { select: { name: true, category: true } },
          professional: { select: { firstName: true, lastName: true } }
        }
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedAppointment.id,
          date: updatedAppointment.scheduledDate.toISOString(),
          time: updatedAppointment.scheduledTime.toTimeString().slice(0, 5),
          treatment: {
            name: updatedAppointment.treatment.name,
            category: updatedAppointment.treatment.category
          },
          status: updatedAppointment.status.toLowerCase(),
          professional: updatedAppointment.professional ? {
            name: `${updatedAppointment.professional.firstName} ${updatedAppointment.professional.lastName}`
          } : null,
          notes: updatedAppointment.notes,
          updatedAt: updatedAppointment.updatedAt.toISOString()
        },
        message: 'Appointment updated successfully'
      });

    } catch (error) {
      console.error('Update appointment error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error updating appointment', 
          code: 'APPOINTMENT_UPDATE_ERROR' 
        }
      });
    }
  }

  // ============================================================================
  // ❌ CANCELAR CITA
  // ============================================================================
  static async cancelAppointment(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { appointmentId } = req.params;
      const { reason } = req.body;

      if (!userId || !appointmentId) {
        return res.status(400).json({
          success: false,
          error: { message: 'User ID and appointment ID required', code: 'MISSING_IDS' }
        });
      }

      // Verificar que la cita existe y se puede cancelar
      const appointment = await prisma.appointment.findFirst({
        where: { 
          id: appointmentId, 
          userId,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: { 
            message: 'Appointment not found or cannot be cancelled', 
            code: 'CANNOT_CANCEL' 
          }
        });
      }

      // Verificar tiempo de cancelación (ej: no se puede cancelar con menos de 2 horas)
      const appointmentTime = new Date(appointment.scheduledTime);
      const now = new Date();
      const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 2) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Cannot cancel appointment less than 2 hours before scheduled time', 
            code: 'TOO_LATE_TO_CANCEL' 
          }
        });
      }

      // Cancelar la cita
      const cancelledAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason || 'Cancelled by user',
          cancelledAt: new Date()
        }
      });

      // Devolver beauty points si se usaron
      if (appointment.beautyPointsUsed > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            beautyPoints: { increment: appointment.beautyPointsUsed }
          }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: cancelledAppointment.id,
          status: 'cancelled',
          cancelledAt: cancelledAppointment.cancelledAt.toISOString(),
          beautyPointsRefunded: appointment.beautyPointsUsed
        },
        message: 'Appointment cancelled successfully'
      });

    } catch (error) {
      console.error('Cancel appointment error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error cancelling appointment', 
          code: 'APPOINTMENT_CANCEL_ERROR' 
        }
      });
    }
  }

  // ============================================================================
  // 📈 ESTADÍSTICAS DE CITAS
  // ============================================================================
  static async getAppointmentStats(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { message: 'Authentication required', code: 'AUTH_REQUIRED' }
        });
      }

      const { period = '30' } = req.query; // días
      const daysAgo = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const appointments = await prisma.appointment.findMany({
        where: { 
          userId,
          createdAt: { gte: startDate }
        },
        include: {
          treatment: { 
            select: { 
              name: true, 
              category: true, 
              price: true 
            } 
          }
        }
      });

      // Calcular estadísticas
      const stats = {
        total: appointments.length,
        byStatus: {
          pending: appointments.filter(apt => apt.status === 'PENDING').length,
          confirmed: appointments.filter(apt => apt.status === 'CONFIRMED').length,
          completed: appointments.filter(apt => apt.status === 'COMPLETED').length,
          cancelled: appointments.filter(apt => apt.status === 'CANCELLED').length,
          noShow: appointments.filter(apt => apt.status === 'NO_SHOW').length
        },
        financial: {
          totalSpent: appointments
            .filter(apt => apt.status === 'COMPLETED')
            .reduce((sum, apt) => sum + (apt.finalPrice || 0), 0),
          totalSaved: appointments
            .filter(apt => apt.status === 'COMPLETED')
            .reduce((sum, apt) => sum + ((apt.originalPrice || 0) - (apt.finalPrice || 0)), 0),
          averageSpent: 0
        },
        beautyPoints: {
          totalEarned: appointments
            .filter(apt => apt.status === 'COMPLETED')
            .reduce((sum, apt) => sum + (apt.beautyPointsEarned || 0), 0),
          totalUsed: appointments
            .reduce((sum, apt) => sum + (apt.beautyPointsUsed || 0), 0)
        },
        treatmentCategories: {},
        monthlyTrend: []
      };

      // Calcular promedio
      const completedAppointments = appointments.filter(apt => apt.status === 'COMPLETED');
      if (completedAppointments.length > 0) {
        stats.financial.averageSpent = stats.financial.totalSpent / completedAppointments.length;
      }

      // Categorías de tratamientos
      appointments.forEach(apt => {
        const category = apt.treatment?.category || 'General';
        if (!stats.treatmentCategories[category]) {
          stats.treatmentCategories[category] = 0;
        }
        stats.treatmentCategories[category]++;
      });

      // Tendencia mensual (últimos 6 meses)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthAppointments = appointments.filter(apt => {
          const aptDate = new Date(apt.scheduledDate);
          return aptDate >= monthStart && aptDate <= monthEnd;
        });

        stats.monthlyTrend.push({
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          count: monthAppointments.length,
          completed: monthAppointments.filter(apt => apt.status === 'COMPLETED').length,
          spent: monthAppointments
            .filter(apt => apt.status === 'COMPLETED')
            .reduce((sum, apt) => sum + (apt.finalPrice || 0), 0)
        });
      }

      res.status(200).json({
        success: true,
        data: {
          period: `Last ${daysAgo} days`,
          stats
        },
        message: 'Statistics retrieved successfully'
      });

    } catch (error) {
      console.error('Get appointment stats error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error retrieving statistics', 
          code: 'STATS_ERROR' 
        }
      });
    }
  }

  // ============================================================================
  // 🔍 OBTENER CITA POR ID
  // ============================================================================
  static async getAppointmentById(req, res) {
    try {
      const userId = req.user?.id || req.user?.userId;
      const { appointmentId } = req.params;

      if (!userId || !appointmentId) {
        return res.status(400).json({
          success: false,
          error: { message: 'User ID and appointment ID required', code: 'MISSING_IDS' }
        });
      }

      const appointment = await prisma.appointment.findFirst({
        where: { 
          id: appointmentId, 
          userId 
        },
        include: {
          treatment: {
            select: {
              name: true,
              description: true,
              category: true,
              durationMinutes: true,
              price: true,
              beforeCare: true,
              afterCare: true
            }
          },
          professional: {
            select: {
              firstName: true,
              lastName: true,
              specialties: true,
              rating: true,
              bio: true
            }
          }
        }
      });

      if (!appointment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Appointment not found', code: 'APPOINTMENT_NOT_FOUND' }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: appointment.id,
          date: appointment.scheduledDate.toISOString(),
          time: appointment.scheduledTime.toTimeString().slice(0, 5),
          treatment: {
            name: appointment.treatment?.name || 'Treatment',
            description: appointment.treatment?.description,
            category: appointment.treatment?.category,
            duration: appointment.durationMinutes,
            price: {
              original: appointment.originalPrice,
              final: appointment.finalPrice,
              saved: (appointment.originalPrice || 0) - (appointment.finalPrice || 0)
            },
            beforeCare: appointment.treatment?.beforeCare,
            afterCare: appointment.treatment?.afterCare
          },
          status: {
            code: appointment.status,
            label: appointment.status.toLowerCase(),
            canCancel: ['PENDING', 'CONFIRMED'].includes(appointment.status) && 
                      new Date(appointment.scheduledDate) > new Date(),
            canReschedule: ['PENDING', 'CONFIRMED'].includes(appointment.status) && 
                          new Date(appointment.scheduledDate) > new Date()
          },
          professional: appointment.professional ? {
            name: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
            specialties: appointment.professional.specialties || [],
            rating: appointment.professional.rating || 4.5,
            bio: appointment.professional.bio
          } : null,
          notes: appointment.notes,
          beautyPoints: {
            used: appointment.beautyPointsUsed || 0,
            earned: appointment.beautyPointsEarned || 0
          },
          cancellation: appointment.status === 'CANCELLED' ? {
            reason: appointment.cancellationReason,
            cancelledAt: appointment.cancelledAt?.toISOString()
          } : null,
          createdAt: appointment.createdAt.toISOString(),
          updatedAt: appointment.updatedAt.toISOString()
        },
        message: 'Appointment details retrieved'
      });

    } catch (error) {
      console.error('Get appointment by ID error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error retrieving appointment details', 
          code: 'APPOINTMENT_DETAIL_ERROR' 
        }
      });
    }
  }
}

module.exports = AppointmentController;