// ============================================================================
// src/controllers/appointment.controller.js - CONTROLADOR DE CITAS CORREGIDO
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { AppError } = require('../utils/errors');
const EmailService = require('../services/email.service');
const NotificationService = require('../services/notification.service');

const prisma = new PrismaClient();

class AppointmentController {
  // Obtener disponibilidad de horarios
  static async getAvailability(req, res, next) {
    try {
      const { treatmentId, date } = req.query;

      if (!treatmentId || !date) {
        throw new AppError('TreatmentId y date son requeridos', 400);
      }

      // Obtener tratamiento
      const treatment = await prisma.treatment.findUnique({
        where: { id: treatmentId },
        include: { clinic: true }
      });

      if (!treatment) {
        throw new AppError('Tratamiento no encontrado', 404);
      }

      // Obtener profesionales disponibles
      const professionals = await prisma.professional.findMany({
        where: {
          clinicId: treatment.clinicId,
          isActive: true
        }
      });

      // Obtener citas existentes para esa fecha
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          clinicId: treatment.clinicId,
          scheduledDate: new Date(date),
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        include: { professional: true }
      });

      // Generar horarios disponibles (9:00 - 18:00, cada 30 min)
      const availableSlots = [];
      const startHour = 9;
      const endHour = 18;
      const slotDuration = 30; // minutos

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          // Verificar disponibilidad de profesionales
          const availableProfessionals = professionals.filter(prof => {
            const hasConflict = existingAppointments.some(apt => {
              const aptTime = new Date(apt.scheduledTime);
              const slotTime = new Date(`${date}T${timeSlot}:00`);
              
              return apt.professional.id === prof.id && 
                     Math.abs(aptTime.getTime() - slotTime.getTime()) < treatment.durationMinutes * 60 * 1000;
            });
            
            return !hasConflict;
          });

          if (availableProfessionals.length > 0) {
            availableSlots.push({
              time: timeSlot,
              availableProfessionals: availableProfessionals.map(prof => ({
                id: prof.id,
                name: `${prof.firstName} ${prof.lastName}`,
                specialties: prof.specialties,
                rating: prof.rating
              }))
            });
          }
        }
      }

      res.status(200).json({
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
      next(error);
    }
  }

  // Crear nueva cita
  static async createAppointment(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos de entrada inválidos', 400, errors.array());
      }

      const userId = req.user.id;
      const { treatmentId, date, time, professionalId, notes } = req.body;

      // Verificar tratamiento
      const treatment = await prisma.treatment.findUnique({
        where: { id: treatmentId },
        include: { clinic: true }
      });

      if (!treatment) {
        throw new AppError('Tratamiento no encontrado', 404);
      }

      // Verificar si es tratamiento VIP y usuario tiene acceso
      if (treatment.isVipExclusive) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { vipStatus: true }
        });

        if (!user?.vipStatus) {
          throw new AppError('Este tratamiento es exclusivo para miembros VIP', 403);
        }
      }

      // Verificar profesional
      let professional;
      if (professionalId) {
        professional = await prisma.professional.findUnique({
          where: { id: professionalId, clinicId: treatment.clinicId }
        });
      } else {
        // Asignar profesional automáticamente
        professional = await prisma.professional.findFirst({
          where: { 
            clinicId: treatment.clinicId,
            isActive: true
          }
        });
      }

      if (!professional) {
        throw new AppError('Profesional no disponible', 404);
      }

      // Verificar disponibilidad
      const scheduledDateTime = new Date(`${date}T${time}:00`);
      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          professionalId: professional.id,
          scheduledDate: new Date(date),
          scheduledTime: scheduledDateTime,
          status: { in: ['PENDING', 'CONFIRMED'] }
        }
      });

      if (conflictingAppointment) {
        throw new AppError('Horario no disponible', 409);
      }

      // Calcular beauty points a otorgar
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { vipStatus: true }
      });

      const basePoints = Math.floor(treatment.price / 10); // 1 punto por cada $10
      const beautyPointsEarned = user.vipStatus ? basePoints * 2 : basePoints;

      // Crear cita
      const appointment = await prisma.appointment.create({
        data: {
          userId,
          clinicId: treatment.clinicId,
          professionalId: professional.id,
          treatmentId,
          scheduledDate: new Date(date),
          scheduledTime: scheduledDateTime,
          durationMinutes: treatment.durationMinutes,
          notes: notes || null,
          beautyPointsEarned,
          status: 'PENDING'
        },
        include: {
          treatment: true,
          professional: true,
          clinic: true,
          user: true
        }
      });

      // Enviar confirmación por email
      await EmailService.sendAppointmentConfirmation(appointment);

      // Programar recordatorio
      await NotificationService.scheduleAppointmentReminder(appointment);

      res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente',
        data: {
          appointment: {
            id: appointment.id,
            treatment: appointment.treatment.name,
            date: appointment.scheduledDate,
            time: appointment.scheduledTime,
            duration: appointment.durationMinutes,
            professional: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
            clinic: appointment.clinic.name,
            status: appointment.status,
            beautyPointsEarned: appointment.beautyPointsEarned,
            notes: appointment.notes
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener citas del usuario
  static async getUserAppointments(req, res, next) {
    try {
      const userId = req.user.id;
      const { status, limit = 10, offset = 0 } = req.query;

      const whereClause = { userId };
      if (status) {
        whereClause.status = status.toUpperCase();
      }

      const appointments = await prisma.appointment.findMany({
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

      const total = await prisma.appointment.count({ where: whereClause });

      res.status(200).json({
        success: true,
        data: {
          appointments: appointments.map(apt => ({
            id: apt.id,
            treatment: {
              name: apt.treatment.name,
              duration: apt.durationMinutes,
              price: apt.treatment.price
            },
            date: apt.scheduledDate,
            time: apt.scheduledTime,
            professional: `${apt.professional.firstName} ${apt.professional.lastName}`,
            clinic: apt.clinic.name,
            status: apt.status,
            beautyPointsEarned: apt.beautyPointsEarned,
            notes: apt.notes,
            createdAt: apt.createdAt
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
      next(error);
    }
  }

  // Modificar cita
  static async updateAppointment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { date, time, notes } = req.body;

      // Verificar que la cita pertenece al usuario
      const appointment = await prisma.appointment.findFirst({
        where: { id, userId },
        include: { treatment: true, professional: true, clinic: true }
      });

      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }

      // Solo permitir modificar citas pendientes o confirmadas
      if (!['PENDING', 'CONFIRMED'].includes(appointment.status)) {
        throw new AppError('No se puede modificar esta cita', 400);
      }

      // Verificar que la modificación es con al menos 24h de anticipación
      const now = new Date();
      const appointmentTime = new Date(appointment.scheduledDate);
      const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

      if (hoursUntilAppointment < 24) {
        throw new AppError('Las modificaciones deben hacerse 24h antes de la cita', 400);
      }

      const updateData = {};
      
      if (date && time) {
        const newDateTime = new Date(`${date}T${time}:00`);
        
        // Verificar disponibilidad del nuevo horario
        const conflictingAppointment = await prisma.appointment.findFirst({
          where: {
            professionalId: appointment.professionalId,
            scheduledDate: new Date(date),
            scheduledTime: newDateTime,
            status: { in: ['PENDING', 'CONFIRMED'] },
            id: { not: id }
          }
        });

        if (conflictingAppointment) {
          throw new AppError('El nuevo horario no está disponible', 409);
        }

        updateData.scheduledDate = new Date(date);
        updateData.scheduledTime = newDateTime;
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      // Actualizar cita
      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: updateData,
        include: {
          treatment: true,
          professional: true,
          clinic: true
        }
      });

      // Enviar notificación de cambio
      await EmailService.sendAppointmentUpdate(updatedAppointment);

      res.status(200).json({
        success: true,
        message: 'Cita actualizada exitosamente',
        data: {
          appointment: {
            id: updatedAppointment.id,
            treatment: updatedAppointment.treatment.name,
            date: updatedAppointment.scheduledDate,
            time: updatedAppointment.scheduledTime,
            professional: `${updatedAppointment.professional.firstName} ${updatedAppointment.professional.lastName}`,
            clinic: updatedAppointment.clinic.name,
            status: updatedAppointment.status,
            notes: updatedAppointment.notes
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Cancelar cita
  static async cancelAppointment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const appointment = await prisma.appointment.findFirst({
        where: { id, userId },
        include: { treatment: true, professional: true, clinic: true }
      });

      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }

      if (appointment.status === 'CANCELLED') {
        throw new AppError('La cita ya está cancelada', 400);
      }

      // Verificar política de cancelación (24h antes)
      const now = new Date();
      const appointmentTime = new Date(appointment.scheduledDate);
      const hoursUntilAppointment = (appointmentTime - now) / (1000 * 60 * 60);

      const penaltyApplied = hoursUntilAppointment < 24;

      // Cancelar cita
      const cancelledAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: appointment.notes ? 
            `${appointment.notes}\n\nCancelada el ${new Date().toISOString()}` :
            `Cancelada el ${new Date().toISOString()}`
        }
      });

      // Enviar notificación de cancelación
      await EmailService.sendAppointmentCancellation(appointment, penaltyApplied);

      res.status(200).json({
        success: true,
        message: 'Cita cancelada exitosamente',
        data: {
          appointmentId: id,
          penaltyApplied,
          penaltyMessage: penaltyApplied ? 
            'Se aplicó penalización por cancelación tardía' : 
            'Cancelación sin penalización'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener detalles de una cita específica
  static async getAppointmentDetails(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const appointment = await prisma.appointment.findFirst({
        where: { id, userId },
        include: {
          treatment: true,
          professional: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialties: true,
              rating: true,
              avatarUrl: true
            }
          },
          clinic: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true
            }
          }
        }
      });

      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }

      res.status(200).json({
        success: true,
        data: {
          appointment: {
            id: appointment.id,
            status: appointment.status,
            scheduledDate: appointment.scheduledDate,
            scheduledTime: appointment.scheduledTime,
            durationMinutes: appointment.durationMinutes,
            notes: appointment.notes,
            beautyPointsEarned: appointment.beautyPointsEarned,
            createdAt: appointment.createdAt,
            treatment: {
              id: appointment.treatment.id,
              name: appointment.treatment.name,
              description: appointment.treatment.description,
              price: appointment.treatment.price,
              category: appointment.treatment.category,
              iconName: appointment.treatment.iconName
            },
            professional: {
              id: appointment.professional.id,
              name: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
              specialties: appointment.professional.specialties,
              rating: appointment.professional.rating,
              avatarUrl: appointment.professional.avatarUrl
            },
            clinic: {
              id: appointment.clinic.id,
              name: appointment.clinic.name,
              address: appointment.clinic.address,
              phone: appointment.clinic.phone
            }
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Confirmar asistencia a cita (para el día de la cita)
  static async confirmAttendance(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const appointment = await prisma.appointment.findFirst({
        where: { id, userId },
        include: { treatment: true, user: true }
      });

      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }

      if (appointment.status !== 'CONFIRMED') {
        throw new AppError('Solo se pueden confirmar citas confirmadas', 400);
      }

      // Verificar que es el día de la cita (o después)
      const today = new Date();
      const appointmentDate = new Date(appointment.scheduledDate);
      
      if (appointmentDate > today) {
        throw new AppError('Solo puedes confirmar asistencia el día de la cita', 400);
      }

      // Marcar como completada y otorgar beauty points
      const completedAppointment = await prisma.$transaction(async (tx) => {
        // Actualizar cita
        const updated = await tx.appointment.update({
          where: { id },
          data: { status: 'COMPLETED' }
        });

        // Otorgar beauty points
        await tx.user.update({
          where: { id: userId },
          data: {
            beautyPoints: { increment: appointment.beautyPointsEarned },
            sessionsCompleted: { increment: 1 },
            totalInvestment: { increment: appointment.treatment.price }
          }
        });

        return updated;
      });

      res.status(200).json({
        success: true,
        message: 'Asistencia confirmada y beauty points otorgados',
        data: {
          appointmentId: id,
          beautyPointsEarned: appointment.beautyPointsEarned,
          newStatus: 'COMPLETED'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener próximas citas (para dashboard)
  static async getUpcomingAppointments(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 5 } = req.query;

      const upcomingAppointments = await prisma.appointment.findMany({
        where: {
          userId,
          scheduledDate: { gte: new Date() },
          status: { in: ['PENDING', 'CONFIRMED'] }
        },
        include: {
          treatment: true,
          professional: true,
          clinic: true
        },
        orderBy: [
          { scheduledDate: 'asc' },
          { scheduledTime: 'asc' }
        ],
        take: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        data: {
          upcomingAppointments: upcomingAppointments.map(apt => ({
            id: apt.id,
            treatment: apt.treatment.name,
            date: apt.scheduledDate,
            time: apt.scheduledTime,
            professional: `${apt.professional.firstName} ${apt.professional.lastName}`,
            clinic: apt.clinic.name,
            status: apt.status,
            durationMinutes: apt.durationMinutes
          }))
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = AppointmentController;