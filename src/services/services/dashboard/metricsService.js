// ============================================================================
// src/services/dashboard/metricsService.js - SERVICIO DE MÉTRICAS
// ============================================================================
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class MetricsService {
  
  // ========================================================================
  // MÉTRICAS FINANCIERAS
  // ========================================================================
  
  static async getRevenueMetrics(clinicId, startDate, endDate) {
    try {
      // Ingresos por citas completadas
      const appointmentRevenue = await prisma.appointment.aggregate({
        where: {
          clinicId,
          status: 'COMPLETED',
          scheduledDate: { gte: startDate, lte: endDate }
        },
        _sum: { beautyPointsEarned: true },
        _count: true
      });

      // Ingresos VIP (aproximado basado en suscripciones activas)
      const vipRevenue = await prisma.vipSubscription.aggregate({
        where: {
          user: { appointments: { some: { clinicId } } },
          status: 'ACTIVE',
          currentPeriodStart: { gte: startDate },
          currentPeriodEnd: { lte: endDate }
        },
        _sum: { price: true },
        _count: true
      });

      // Cálculo de ingresos estimados (Beauty Points como proxy)
      const estimatedAppointmentRevenue = (appointmentRevenue._sum.beautyPointsEarned || 0) * 50; // 1 punto = 50 EUR aprox
      const vipSubscriptionRevenue = vipRevenue._sum.price || 0;

      const totalRevenue = estimatedAppointmentRevenue + vipSubscriptionRevenue;

      return {
        totalRevenue,
        appointmentRevenue: estimatedAppointmentRevenue,
        vipRevenue: vipSubscriptionRevenue,
        totalAppointments: appointmentRevenue._count,
        averageRevenuePerAppointment: appointmentRevenue._count > 0 ? 
          estimatedAppointmentRevenue / appointmentRevenue._count : 0
      };

    } catch (error) {
      console.error('❌ Revenue metrics error:', error);
      throw error;
    }
  }

  static async getRevenueComparison(clinicId, currentStart, currentEnd, previousStart, previousEnd) {
    try {
      const [currentRevenue, previousRevenue] = await Promise.all([
        this.getRevenueMetrics(clinicId, currentStart, currentEnd),
        this.getRevenueMetrics(clinicId, previousStart, previousEnd)
      ]);

      const growthRate = previousRevenue.totalRevenue > 0 ? 
        ((currentRevenue.totalRevenue - previousRevenue.totalRevenue) / previousRevenue.totalRevenue) * 100 : 0;

      return {
        current: currentRevenue,
        previous: previousRevenue,
        growthRate: Math.round(growthRate * 100) / 100,
        difference: currentRevenue.totalRevenue - previousRevenue.totalRevenue
      };

    } catch (error) {
      console.error('❌ Revenue comparison error:', error);
      throw error;
    }
  }

  // ========================================================================
  // MÉTRICAS DE CITAS
  // ========================================================================
  
  static async getAppointmentMetrics(clinicId, startDate, endDate) {
    try {
      const appointments = await prisma.appointment.groupBy({
        by: ['status'],
        where: {
          clinicId,
          scheduledDate: { gte: startDate, lte: endDate }
        },
        _count: { status: true }
      });

      const statusMap = appointments.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
      }, {});

      const total = Object.values(statusMap).reduce((sum, count) => sum + count, 0);
      const confirmed = statusMap.CONFIRMED || 0;
      const completed = statusMap.COMPLETED || 0;
      const cancelled = statusMap.CANCELLED || 0;
      const pending = statusMap.PENDING || 0;

      const completionRate = total > 0 ? (completed / total) * 100 : 0;
      const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;

      return {
        total,
        confirmed,
        completed,
        cancelled,
        pending,
        completionRate: Math.round(completionRate * 100) / 100,
        cancellationRate: Math.round(cancellationRate * 100) / 100
      };

    } catch (error) {
      console.error('❌ Appointment metrics error:', error);
      throw error;
    }
  }

  static async getDailyAppointments(clinicId, startDate, endDate) {
    try {
      const dailyData = await prisma.appointment.groupBy({
        by: ['scheduledDate'],
        where: {
          clinicId,
          scheduledDate: { gte: startDate, lte: endDate }
        },
        _count: { id: true },
        orderBy: { scheduledDate: 'asc' }
      });

      return dailyData.map(day => ({
        date: day.scheduledDate.toISOString().split('T')[0],
        count: day._count.id
      }));

    } catch (error) {
      console.error('❌ Daily appointments error:', error);
      throw error;
    }
  }

  // ========================================================================
  // MÉTRICAS DE CLIENTES
  // ========================================================================
  
  static async getCustomerMetrics(clinicId, startDate, endDate) {
    try {
      // Clientes únicos que tuvieron citas
      const uniqueCustomers = await prisma.user.count({
        where: {
          appointments: {
            some: {
              clinicId,
              scheduledDate: { gte: startDate, lte: endDate }
            }
          }
        }
      });

      // Nuevos clientes (primera cita en el período)
      const newCustomers = await prisma.user.count({
        where: {
          appointments: {
            some: {
              clinicId,
              scheduledDate: { gte: startDate, lte: endDate }
            },
            none: {
              clinicId,
              scheduledDate: { lt: startDate }
            }
          }
        }
      });

      // Clientes VIP
      const vipCustomers = await prisma.user.count({
        where: {
          vipStatus: true,
          appointments: {
            some: {
              clinicId,
              scheduledDate: { gte: startDate, lte: endDate }
            }
          }
        }
      });

      // Beauty Points promedio
      const avgBeautyPoints = await prisma.user.aggregate({
        where: {
          appointments: {
            some: {
              clinicId,
              scheduledDate: { gte: startDate, lte: endDate }
            }
          }
        },
        _avg: { beautyPoints: true }
      });

      return {
        totalCustomers: uniqueCustomers,
        newCustomers,
        vipCustomers,
        returningCustomers: uniqueCustomers - newCustomers,
        averageBeautyPoints: Math.round(avgBeautyPoints._avg.beautyPoints || 0),
        vipConversionRate: uniqueCustomers > 0 ? 
          Math.round((vipCustomers / uniqueCustomers) * 10000) / 100 : 0
      };

    } catch (error) {
      console.error('❌ Customer metrics error:', error);
      throw error;
    }
  }

  // ========================================================================
  // MÉTRICAS DE PROFESIONALES
  // ========================================================================
  
  static async getProfessionalMetrics(clinicId, startDate, endDate) {
    try {
      const professionals = await prisma.professional.findMany({
        where: { 
          clinicId,
          isActive: true 
        },
        include: {
          appointments: {
            where: {
              scheduledDate: { gte: startDate, lte: endDate }
            },
            select: {
              status: true,
              beautyPointsEarned: true
            }
          }
        }
      });

      const professionalStats = professionals.map(prof => {
        const appointments = prof.appointments;
        const total = appointments.length;
        const completed = appointments.filter(apt => apt.status === 'COMPLETED').length;
        const revenue = appointments.reduce((sum, apt) => sum + (apt.beautyPointsEarned * 50), 0);

        return {
          id: prof.id,
          name: `${prof.firstName} ${prof.lastName}`,
          specialties: prof.specialties.split(','),
          totalAppointments: total,
          completedAppointments: completed,
          estimatedRevenue: revenue,
          completionRate: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
          rating: prof.rating || 5.0
        };
      });

      const topPerformer = professionalStats.reduce((top, current) => 
        current.estimatedRevenue > top.estimatedRevenue ? current : top, 
        professionalStats[0] || {}
      );

      return {
        totalProfessionals: professionals.length,
        professionalStats,
        topPerformer,
        averageRating: professionalStats.length > 0 ? 
          professionalStats.reduce((sum, prof) => sum + prof.rating, 0) / professionalStats.length : 0
      };

    } catch (error) {
      console.error('❌ Professional metrics error:', error);
      throw error;
    }
  }

  // ========================================================================
  // MÉTRICAS DE TRATAMIENTOS
  // ========================================================================
  
  static async getTreatmentMetrics(clinicId, startDate, endDate) {
    try {
      const treatmentData = await prisma.treatment.findMany({
        where: { clinicId },
        include: {
          appointments: {
            where: {
              scheduledDate: { gte: startDate, lte: endDate },
              status: { in: ['COMPLETED', 'CONFIRMED'] }
            }
          }
        }
      });

      const treatmentStats = treatmentData.map(treatment => ({
        id: treatment.id,
        name: treatment.name,
        category: treatment.category,
        price: treatment.price,
        bookings: treatment.appointments.length,
        revenue: treatment.appointments.length * treatment.price,
        isVipExclusive: treatment.isVipExclusive
      })).sort((a, b) => b.revenue - a.revenue);

      return {
        totalTreatments: treatmentData.length,
        topTreatments: treatmentStats.slice(0, 5),
        totalBookings: treatmentStats.reduce((sum, t) => sum + t.bookings, 0)
      };

    } catch (error) {
      console.error('❌ Treatment metrics error:', error);
      throw error;
    }
  }

  // ========================================================================
  // ALERTAS INTELIGENTES
  // ========================================================================
  
  static async getSmartAlerts(clinicId) {
    try {
      const alerts = [];
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Alerta: Caída en bookings
      const [thisWeekBookings, lastWeekBookings] = await Promise.all([
        prisma.appointment.count({
          where: { clinicId, scheduledDate: { gte: lastWeek } }
        }),
        prisma.appointment.count({
          where: { 
            clinicId, 
            scheduledDate: { gte: twoWeeksAgo, lt: lastWeek } 
          }
        })
      ]);

      if (lastWeekBookings > 0 && thisWeekBookings < lastWeekBookings * 0.8) {
        alerts.push({
          type: 'warning',
          title: 'Caída en reservas',
          message: `Las reservas han bajado ${Math.round(((lastWeekBookings - thisWeekBookings) / lastWeekBookings) * 100)}% esta semana`,
          action: 'Considera crear una oferta especial'
        });
      }

      // Alerta: Profesionales con baja ocupación
      const lowUtilizationProfessionals = await prisma.professional.findMany({
        where: {
          clinicId,
          isActive: true,
          appointments: {
            none: {
              scheduledDate: { gte: lastWeek }
            }
          }
        }
      });

      if (lowUtilizationProfessionals.length > 0) {
        alerts.push({
          type: 'info',
          title: 'Profesionales sin reservas',
          message: `${lowUtilizationProfessionals.length} profesional(es) no tienen citas esta semana`,
          action: 'Revisar disponibilidad y promocionar'
        });
      }

      return alerts;

    } catch (error) {
      console.error('❌ Smart alerts error:', error);
      return [];
    }
  }
}

module.exports = MetricsService;