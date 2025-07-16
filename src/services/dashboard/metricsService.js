// ============================================================================
// src/services/dashboard/metricsService.js - SERVICIO DE MÉTRICAS REALES ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class MetricsService {
  
  // ========================================================================
  // OVERVIEW COMPLETO PARA ADMIN DASHBOARD
  // ========================================================================
  
  static async getCompleteOverview(clinicId, period = '30') {
    try {
      console.log(`📊 Generando overview completo para clínica: ${clinicId}`);
      
      const days = parseInt(period);
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Período anterior para comparación
      const previousEndDate = new Date(startDate.getTime() - 1);
      const previousStartDate = new Date(previousEndDate.getTime() - days * 24 * 60 * 60 * 1000);

      const [
        // Métricas principales
        revenueMetrics,
        appointmentMetrics,
        customerMetrics,
        professionalMetrics,
        
        // Datos detallados
        todayAppointments,
        upcomingAppointments,
        recentCustomers,
        topTreatments,
        vipMetrics,
        alertsData
      ] = await Promise.all([
        this.getRevenueMetrics(clinicId, startDate, endDate, previousStartDate, previousEndDate),
        this.getAppointmentMetrics(clinicId, startDate, endDate, previousStartDate, previousEndDate),
        this.getCustomerMetrics(clinicId, startDate, endDate, previousStartDate, previousEndDate),
        this.getProfessionalMetrics(clinicId, startDate, endDate),
        
        // Datos en tiempo real
        this.getTodayAppointments(clinicId),
        this.getUpcomingAppointments(clinicId),
        this.getRecentCustomers(clinicId, 10),
        this.getTopTreatments(clinicId, startDate, endDate),
        this.getVIPMetrics(clinicId, startDate, endDate),
        this.generateSmartAlerts(clinicId)
      ]);

      // Calcular KPIs principales
      const kpis = {
        revenue: {
          current: revenueMetrics.current.total,
          previous: revenueMetrics.previous.total,
          growth: this.calculateGrowthRate(revenueMetrics.current.total, revenueMetrics.previous.total),
          trend: this.getTrend(revenueMetrics.current.total, revenueMetrics.previous.total)
        },
        appointments: {
          total: appointmentMetrics.current.total,
          completed: appointmentMetrics.current.completed,
          completionRate: appointmentMetrics.current.completionRate,
          growth: this.calculateGrowthRate(appointmentMetrics.current.total, appointmentMetrics.previous.total),
          trend: this.getTrend(appointmentMetrics.current.total, appointmentMetrics.previous.total)
        },
        customers: {
          total: customerMetrics.current.total,
          new: customerMetrics.current.new,
          vip: customerMetrics.current.vip,
          growth: this.calculateGrowthRate(customerMetrics.current.total, customerMetrics.previous.total),
          trend: this.getTrend(customerMetrics.current.total, customerMetrics.previous.total)
        },
        professionals: {
          total: professionalMetrics.total,
          averageRating: professionalMetrics.averageRating,
          topPerformer: professionalMetrics.topPerformer,
          trend: professionalMetrics.averageRating >= 4.5 ? 'up' : professionalMetrics.averageRating >= 4.0 ? 'stable' : 'down'
        }
      };

      // Quick stats en tiempo real
      const quickStats = {
        todayAppointments: todayAppointments.length,
        upcomingNext2Hours: upcomingAppointments.filter(apt => {
          const timeDiff = new Date(apt.scheduledTime) - new Date();
          return timeDiff > 0 && timeDiff <= 2 * 60 * 60 * 1000; // 2 horas
        }).length,
        unconfirmedAppointments: todayAppointments.filter(apt => apt.status === 'PENDING').length,
        todayCancellations: todayAppointments.filter(apt => apt.status === 'CANCELLED').length,
        todayRevenue: await this.getTodayRevenue(clinicId),
        revenuePerHour: Math.round((await this.getTodayRevenue(clinicId)) / 8) // Asumiendo 8 horas de trabajo
      };

      // Clinic info
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        select: {
          id: true,
          name: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true
        }
      });

      return {
        success: true,
        data: {
          clinic,
          period: {
            days,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          },
          kpis,
          quickStats,
          todayAppointments: todayAppointments.map(apt => ({
            id: apt.id,
            time: apt.scheduledTime,
            customerName: `${apt.user.firstName} ${apt.user.lastName}`,
            treatmentName: apt.treatment.name,
            professionalName: `${apt.professional.firstName} ${apt.professional.lastName}`,
            status: apt.status,
            duration: apt.durationMinutes,
            price: apt.treatment.price
          })),
          upcomingAppointments: upcomingAppointments.slice(0, 5).map(apt => ({
            id: apt.id,
            time: apt.scheduledTime,
            customerName: `${apt.user.firstName} ${apt.user.lastName}`,
            treatmentName: apt.treatment.name,
            status: apt.status
          })),
          recentCustomers: recentCustomers.map(customer => ({
            id: customer.id,
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            vipStatus: customer.vipStatus,
            totalInvestment: customer.totalInvestment,
            sessionsCompleted: customer.sessionsCompleted,
            lastAppointment: customer.appointments[0]?.scheduledDate
          })),
          topTreatments,
          vipMetrics,
          alerts: alertsData,
          topPerformers: {
            professional: professionalMetrics.topPerformer,
            treatment: topTreatments[0]
          }
        }
      };

    } catch (error) {
      console.error('❌ Error generating complete overview:', error);
      throw error;
    }
  }

  // ========================================================================
  // MÉTRICAS DE REVENUE CON COMPARACIÓN
  // ========================================================================
  
  static async getRevenueMetrics(clinicId, startDate, endDate, previousStartDate, previousEndDate) {
    const [currentPeriod, previousPeriod] = await Promise.all([
      this.calculateRevenue(clinicId, startDate, endDate),
      this.calculateRevenue(clinicId, previousStartDate, previousEndDate)
    ]);

    return {
      current: currentPeriod,
      previous: previousPeriod
    };
  }

  static async calculateRevenue(clinicId, startDate, endDate) {
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        scheduledDate: { gte: startDate, lte: endDate },
        status: 'COMPLETED'
      },
      include: {
        treatment: true,
        offerRedemptions: true
      }
    });

    let totalRevenue = 0;
    let appointmentRevenue = 0;
    let offerDiscounts = 0;

    appointments.forEach(apt => {
      const basePrice = apt.treatment.price;
      
      // Calcular descuentos de ofertas
      const offerDiscount = apt.offerRedemptions.reduce((sum, redemption) => 
        sum + redemption.discountApplied, 0);
      
      const finalPrice = basePrice - offerDiscount;
      
      totalRevenue += finalPrice;
      appointmentRevenue += basePrice;
      offerDiscounts += offerDiscount;
    });

    return {
      total: totalRevenue,
      appointmentRevenue,
      offerDiscounts,
      averagePerAppointment: appointments.length > 0 ? totalRevenue / appointments.length : 0,
      appointmentCount: appointments.length
    };
  }

  // ========================================================================
  // MÉTRICAS DE CITAS CON DETALLE
  // ========================================================================
  
  static async getAppointmentMetrics(clinicId, startDate, endDate, previousStartDate, previousEndDate) {
    const [current, previous] = await Promise.all([
      this.getAppointmentStats(clinicId, startDate, endDate),
      this.getAppointmentStats(clinicId, previousStartDate, previousEndDate)
    ]);

    return { current, previous };
  }

  static async getAppointmentStats(clinicId, startDate, endDate) {
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        scheduledDate: { gte: startDate, lte: endDate }
      }
    });

    const total = appointments.length;
    const completed = appointments.filter(apt => apt.status === 'COMPLETED').length;
    const cancelled = appointments.filter(apt => apt.status === 'CANCELLED').length;
    const pending = appointments.filter(apt => apt.status === 'PENDING').length;
    const confirmed = appointments.filter(apt => apt.status === 'CONFIRMED').length;

    return {
      total,
      completed,
      cancelled,
      pending,
      confirmed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0
    };
  }

  // ========================================================================
  // MÉTRICAS DE CLIENTES
  // ========================================================================
  
  static async getCustomerMetrics(clinicId, startDate, endDate, previousStartDate, previousEndDate) {
    const [current, previous] = await Promise.all([
      this.getCustomerStats(clinicId, startDate, endDate),
      this.getCustomerStats(clinicId, previousStartDate, previousEndDate)
    ]);

    return { current, previous };
  }

  static async getCustomerStats(clinicId, startDate, endDate) {
    // Clientes que tuvieron citas en el período
    const customersWithAppointments = await prisma.user.findMany({
      where: {
        appointments: {
          some: {
            clinicId,
            scheduledDate: { gte: startDate, lte: endDate }
          }
        }
      },
      include: {
        appointments: {
          where: {
            clinicId,
            scheduledDate: { gte: startDate, lte: endDate }
          }
        }
      }
    });

    // Clientes nuevos (primera cita en este período)
    const newCustomers = [];
    for (const customer of customersWithAppointments) {
      const firstAppointment = await prisma.appointment.findFirst({
        where: {
          userId: customer.id,
          clinicId
        },
        orderBy: { scheduledDate: 'asc' }
      });

      if (firstAppointment && firstAppointment.scheduledDate >= startDate) {
        newCustomers.push(customer);
      }
    }

    const vipCustomers = customersWithAppointments.filter(c => c.vipStatus).length;
    const returningCustomers = customersWithAppointments.length - newCustomers.length;

    return {
      total: customersWithAppointments.length,
      new: newCustomers.length,
      returning: returningCustomers,
      vip: vipCustomers,
      averageInvestment: customersWithAppointments.reduce((sum, c) => sum + c.totalInvestment, 0) / Math.max(customersWithAppointments.length, 1)
    };
  }

  // ========================================================================
  // MÉTRICAS DE PROFESIONALES
  // ========================================================================
  
  static async getProfessionalMetrics(clinicId, startDate, endDate) {
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
          include: {
            treatment: true
          }
        }
      }
    });

    const professionalStats = professionals.map(prof => {
      const appointments = prof.appointments;
      const completed = appointments.filter(apt => apt.status === 'COMPLETED');
      const revenue = completed.reduce((sum, apt) => sum + apt.treatment.price, 0);

      return {
        id: prof.id,
        name: `${prof.firstName} ${prof.lastName}`,
        totalAppointments: appointments.length,
        completedAppointments: completed.length,
        completionRate: appointments.length > 0 ? Math.round((completed.length / appointments.length) * 100) : 0,
        estimatedRevenue: revenue,
        rating: prof.rating,
        specialties: prof.specialties
      };
    });

    const averageRating = professionals.reduce((sum, prof) => sum + (prof.rating || 0), 0) / Math.max(professionals.length, 1);
    const topPerformer = professionalStats.reduce((top, current) => 
      current.estimatedRevenue > (top?.estimatedRevenue || 0) ? current : top, null);

    return {
      total: professionals.length,
      averageRating,
      topPerformer,
      professionalStats
    };
  }

  // ========================================================================
  // DATOS EN TIEMPO REAL
  // ========================================================================
  
  static async getTodayAppointments(clinicId) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return await prisma.appointment.findMany({
      where: {
        clinicId,
        scheduledDate: { gte: startOfDay, lt: endOfDay }
      },
      include: {
        user: true,
        treatment: true,
        professional: true
      },
      orderBy: { scheduledTime: 'asc' }
    });
  }

  static async getUpcomingAppointments(clinicId, limit = 10) {
    const now = new Date();
    
    return await prisma.appointment.findMany({
      where: {
        clinicId,
        scheduledTime: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      include: {
        user: true,
        treatment: true,
        professional: true
      },
      orderBy: { scheduledTime: 'asc' },
      take: limit
    });
  }

  static async getRecentCustomers(clinicId, limit = 10) {
    return await prisma.user.findMany({
      where: {
        appointments: {
          some: { clinicId }
        }
      },
      include: {
        appointments: {
          where: { clinicId },
          orderBy: { scheduledDate: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  static async getTodayRevenue(clinicId) {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const todayAppointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        scheduledDate: { gte: startOfDay, lt: endOfDay },
        status: 'COMPLETED'
      },
      include: {
        treatment: true,
        offerRedemptions: true
      }
    });

    return todayAppointments.reduce((total, apt) => {
      const basePrice = apt.treatment.price;
      const discount = apt.offerRedemptions.reduce((sum, redemption) => 
        sum + redemption.discountApplied, 0);
      return total + (basePrice - discount);
    }, 0);
  }

  // ========================================================================
  // TOP TREATMENTS
  // ========================================================================
  
  static async getTopTreatments(clinicId, startDate, endDate, limit = 5) {
    const treatmentStats = await prisma.treatment.findMany({
      where: { clinicId },
      include: {
        appointments: {
          where: {
            scheduledDate: { gte: startDate, lte: endDate },
            status: 'COMPLETED'
          }
        }
      }
    });

    return treatmentStats
      .map(treatment => ({
        id: treatment.id,
        name: treatment.name,
        bookings: treatment.appointments.length,
        revenue: treatment.appointments.length * treatment.price,
        price: treatment.price,
        category: treatment.category
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  // ========================================================================
  // VIP METRICS
  // ========================================================================
  
  static async getVIPMetrics(clinicId, startDate, endDate) {
    const vipSubscriptions = await prisma.vipSubscription.findMany({
      where: {
        user: {
          appointments: {
            some: { clinicId }
          }
        },
        status: 'ACTIVE'
      },
      include: {
        user: {
          include: {
            appointments: {
              where: {
                clinicId,
                scheduledDate: { gte: startDate, lte: endDate }
              }
            }
          }
        }
      }
    });

    const totalVIPRevenue = vipSubscriptions.reduce((sum, sub) => sum + sub.price, 0);
    const vipAppointments = vipSubscriptions.reduce((sum, sub) => 
      sum + sub.user.appointments.length, 0);

    return {
      totalVIPCustomers: vipSubscriptions.length,
      totalVIPRevenue,
      vipAppointments,
      averageVIPSpend: vipSubscriptions.length > 0 ? totalVIPRevenue / vipSubscriptions.length : 0
    };
  }

  // ========================================================================
  // ALERTAS INTELIGENTES
  // ========================================================================
  
  static async generateSmartAlerts(clinicId) {
    const alerts = [];
    const now = new Date();

    // Alertas de citas sin confirmar
    const unconfirmedCount = await prisma.appointment.count({
      where: {
        clinicId,
        status: 'PENDING',
        scheduledTime: { 
          gte: now,
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) // Próximas 24 horas
        }
      }
    });

    if (unconfirmedCount > 0) {
      alerts.push({
        id: 'unconfirmed_appointments',
        type: 'warning',
        level: unconfirmedCount > 5 ? 'high' : 'medium',
        title: 'Citas sin confirmar',
        message: `${unconfirmedCount} citas pendientes de confirmación para las próximas 24 horas`,
        action: 'Revisar agenda',
        priority: 2
      });
    }

    // Alerta de revenue bajo
    const todayRevenue = await this.getTodayRevenue(clinicId);
    const avgDailyRevenue = 300; // Esto debería calcularse basado en histórico

    if (todayRevenue < avgDailyRevenue * 0.5) {
      alerts.push({
        id: 'low_revenue',
        type: 'warning',
        level: 'high',
        title: 'Revenue bajo hoy',
        message: `Solo €${todayRevenue} generados hoy, muy por debajo del promedio`,
        action: 'Revisar estrategia',
        priority: 1
      });
    }

    // Alertas de profesionales inactivos
    const inactiveProfessionals = await prisma.professional.count({
      where: {
        clinicId,
        isActive: false
      }
    });

    if (inactiveProfessionals > 0) {
      alerts.push({
        id: 'inactive_professionals',
        type: 'info',
        level: 'low',
        title: 'Profesionales inactivos',
        message: `${inactiveProfessionals} profesionales marcados como inactivos`,
        action: 'Revisar equipo',
        priority: 3
      });
    }

    return alerts.sort((a, b) => a.priority - b.priority);
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================
  
  static calculateGrowthRate(current, previous) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100 * 10) / 10;
  }

  static getTrend(current, previous) {
    if (current > previous) return 'up';
    if (current < previous) return 'down';
    return 'stable';
  }
}

module.exports = MetricsService;