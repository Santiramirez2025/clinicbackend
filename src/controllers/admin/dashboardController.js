// ============================================================================
// src/controllers/admin/dashboardController.js - CONTROLADOR DASHBOARD
// ============================================================================
const MetricsService = require('../../services/dashboard/metricsService');

class DashboardController {

  // ========================================================================
  // OVERVIEW GENERAL
  // ========================================================================
  
  static async getOverview(req, res) {
    try {
      console.log('📊 Getting dashboard overview for clinic:', req.clinic.id);

      const { period = '30' } = req.query;
      const days = parseInt(period);
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Para comparación (período anterior)
      const previousEndDate = new Date(startDate.getTime() - 1);
      const previousStartDate = new Date(previousEndDate.getTime() - days * 24 * 60 * 60 * 1000);

      const [
        revenueComparison,
        appointmentMetrics,
        customerMetrics,
        professionalMetrics,
        smartAlerts
      ] = await Promise.all([
        MetricsService.getRevenueComparison(
          req.clinic.id, 
          startDate, endDate, 
          previousStartDate, previousEndDate
        ),
        MetricsService.getAppointmentMetrics(req.clinic.id, startDate, endDate),
        MetricsService.getCustomerMetrics(req.clinic.id, startDate, endDate),
        MetricsService.getProfessionalMetrics(req.clinic.id, startDate, endDate),
        MetricsService.getSmartAlerts(req.clinic.id)
      ]);

      const overview = {
        clinic: {
          id: req.clinic.id,
          name: req.clinic.name,
          plan: req.clinic.subscriptionPlan
        },
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        kpis: {
          revenue: {
            current: revenueComparison.current.totalRevenue,
            previous: revenueComparison.previous.totalRevenue,
            growth: revenueComparison.growthRate,
            trend: revenueComparison.growthRate >= 0 ? 'up' : 'down'
          },
          appointments: {
            total: appointmentMetrics.total,
            completed: appointmentMetrics.completed,
            completionRate: appointmentMetrics.completionRate,
            trend: appointmentMetrics.completionRate >= 80 ? 'up' : 'down'
          },
          customers: {
            total: customerMetrics.totalCustomers,
            new: customerMetrics.newCustomers,
            vip: customerMetrics.vipCustomers,
            trend: customerMetrics.newCustomers > 0 ? 'up' : 'stable'
          },
          professionals: {
            total: professionalMetrics.totalProfessionals,
            averageRating: Math.round(professionalMetrics.averageRating * 10) / 10,
            topPerformer: professionalMetrics.topPerformer?.name || 'N/A',
            trend: professionalMetrics.averageRating >= 4.5 ? 'up' : 'down'
          }
        },
        alerts: smartAlerts
      };

      res.json({
        success: true,
        data: overview
      });

    } catch (error) {
      console.error('❌ Dashboard overview error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo overview del dashboard' }
      });
    }
  }

  // ========================================================================
  // MÉTRICAS DE INGRESOS
  // ========================================================================
  
  static async getRevenue(req, res) {
    try {
      console.log('💰 Getting revenue metrics for clinic:', req.clinic.id);

      const { period = '30', groupBy = 'day' } = req.query;
      const days = parseInt(period);
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const [revenueMetrics, dailyRevenue] = await Promise.all([
        MetricsService.getRevenueMetrics(req.clinic.id, startDate, endDate),
        MetricsService.getDailyAppointments(req.clinic.id, startDate, endDate)
      ]);

      // Transformar datos para gráficos
      const chartData = dailyRevenue.map(day => ({
        date: day.date,
        appointments: day.count,
        estimatedRevenue: day.count * 100 // Estimación: 100 EUR promedio por cita
      }));

      res.json({
        success: true,
        data: {
          summary: revenueMetrics,
          chartData,
          breakdown: {
            appointmentRevenue: revenueMetrics.appointmentRevenue,
            vipRevenue: revenueMetrics.vipRevenue,
            averagePerAppointment: revenueMetrics.averageRevenuePerAppointment
          }
        }
      });

    } catch (error) {
      console.error('❌ Revenue metrics error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo métricas de ingresos' }
      });
    }
  }

  // ========================================================================
  // MÉTRICAS DE CITAS
  // ========================================================================
  
  static async getAppointments(req, res) {
    try {
      console.log('📅 Getting appointment metrics for clinic:', req.clinic.id);

      const { period = '30' } = req.query;
      const days = parseInt(period);
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const [appointmentMetrics, dailyAppointments, treatmentMetrics] = await Promise.all([
        MetricsService.getAppointmentMetrics(req.clinic.id, startDate, endDate),
        MetricsService.getDailyAppointments(req.clinic.id, startDate, endDate),
        MetricsService.getTreatmentMetrics(req.clinic.id, startDate, endDate)
      ]);

      res.json({
        success: true,
        data: {
          summary: appointmentMetrics,
          dailyData: dailyAppointments,
          topTreatments: treatmentMetrics.topTreatments,
          statusDistribution: [
            { name: 'Completadas', value: appointmentMetrics.completed, color: '#10b981' },
            { name: 'Confirmadas', value: appointmentMetrics.confirmed, color: '#3b82f6' },
            { name: 'Pendientes', value: appointmentMetrics.pending, color: '#f59e0b' },
            { name: 'Canceladas', value: appointmentMetrics.cancelled, color: '#ef4444' }
          ]
        }
      });

    } catch (error) {
      console.error('❌ Appointment metrics error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo métricas de citas' }
      });
    }
  }

  // ========================================================================
  // MÉTRICAS DE CLIENTES
  // ========================================================================
  
  static async getCustomers(req, res) {
    try {
      console.log('👥 Getting customer metrics for clinic:', req.clinic.id);

      const { period = '30' } = req.query;
      const days = parseInt(period);
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const customerMetrics = await MetricsService.getCustomerMetrics(req.clinic.id, startDate, endDate);

      // Distribución de clientes
      const customerDistribution = [
        { 
          name: 'VIP', 
          value: customerMetrics.vipCustomers, 
          color: '#8b5cf6',
          percentage: customerMetrics.totalCustomers > 0 ? 
            Math.round((customerMetrics.vipCustomers / customerMetrics.totalCustomers) * 100) : 0
        },
        { 
          name: 'Nuevos', 
          value: customerMetrics.newCustomers, 
          color: '#10b981',
          percentage: customerMetrics.totalCustomers > 0 ? 
            Math.round((customerMetrics.newCustomers / customerMetrics.totalCustomers) * 100) : 0
        },
        { 
          name: 'Recurrentes', 
          value: customerMetrics.returningCustomers, 
          color: '#3b82f6',
          percentage: customerMetrics.totalCustomers > 0 ? 
            Math.round((customerMetrics.returningCustomers / customerMetrics.totalCustomers) * 100) : 0
        }
      ];

      res.json({
        success: true,
        data: {
          summary: customerMetrics,
          distribution: customerDistribution,
          insights: {
            vipConversionRate: customerMetrics.vipConversionRate,
            averageBeautyPoints: customerMetrics.averageBeautyPoints,
            newCustomerRate: customerMetrics.totalCustomers > 0 ? 
              Math.round((customerMetrics.newCustomers / customerMetrics.totalCustomers) * 100) : 0
          }
        }
      });

    } catch (error) {
      console.error('❌ Customer metrics error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo métricas de clientes' }
      });
    }
  }

  // ========================================================================
  // MÉTRICAS DE PROFESIONALES
  // ========================================================================
  
  static async getProfessionals(req, res) {
    try {
      console.log('👨‍⚕️ Getting professional metrics for clinic:', req.clinic.id);

      const { period = '30' } = req.query;
      const days = parseInt(period);
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const professionalMetrics = await MetricsService.getProfessionalMetrics(req.clinic.id, startDate, endDate);

      // Top 3 profesionales por ingresos
      const topProfessionals = professionalMetrics.professionalStats
        .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)
        .slice(0, 3);

      res.json({
        success: true,
        data: {
          summary: {
            total: professionalMetrics.totalProfessionals,
            averageRating: Math.round(professionalMetrics.averageRating * 10) / 10,
            topPerformer: professionalMetrics.topPerformer
          },
          professionals: professionalMetrics.professionalStats,
          topProfessionals,
          performanceChart: professionalMetrics.professionalStats.map(prof => ({
            name: prof.name.length > 15 ? prof.name.substring(0, 12) + '...' : prof.name,
            appointments: prof.totalAppointments,
            revenue: prof.estimatedRevenue,
            rating: prof.rating,
            completionRate: prof.completionRate
          }))
        }
      });

    } catch (error) {
      console.error('❌ Professional metrics error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo métricas de profesionales' }
      });
    }
  }

  // ========================================================================
  // MÉTRICAS DE OFERTAS
  // ========================================================================
  
  static async getOffers(req, res) {
    try {
      console.log('🎯 Getting offer metrics for clinic:', req.clinic.id);

      const { period = '30' } = req.query;
      const days = parseInt(period);
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      // Ofertas activas y su rendimiento
      const offers = await prisma.offer.findMany({
        where: {
          clinicId: req.clinic.id,
          createdAt: { gte: startDate, lte: endDate }
        },
        include: {
          offerRedemptions: {
            where: {
              redeemedAt: { gte: startDate, lte: endDate }
            }
          }
        }
      });

      const offerStats = offers.map(offer => {
        const redemptions = offer.offerRedemptions.length;
        const conversionRate = offer.maxUses > 0 ? (redemptions / offer.maxUses) * 100 : 0;
        const revenue = offer.offerRedemptions.reduce((sum, redemption) => 
          sum + redemption.finalPrice, 0);

        return {
          id: offer.id,
          title: offer.title,
          discountType: offer.discountType,
          discountValue: offer.discountValue,
          redemptions,
          maxUses: offer.maxUses,
          conversionRate: Math.round(conversionRate * 100) / 100,
          revenue,
          isActive: offer.isActive,
          validUntil: offer.validUntil
        };
      });

      const totalRedemptions = offerStats.reduce((sum, offer) => sum + offer.redemptions, 0);
      const totalOfferRevenue = offerStats.reduce((sum, offer) => sum + offer.revenue, 0);

      res.json({
        success: true,
        data: {
          summary: {
            totalOffers: offers.length,
            activeOffers: offers.filter(o => o.isActive).length,
            totalRedemptions,
            totalRevenue: totalOfferRevenue,
            averageConversionRate: offerStats.length > 0 ? 
              offerStats.reduce((sum, o) => sum + o.conversionRate, 0) / offerStats.length : 0
          },
          offers: offerStats,
          topPerformingOffers: offerStats
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5)
        }
      });

    } catch (error) {
      console.error('❌ Offer metrics error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo métricas de ofertas' }
      });
    }
  }

  // ========================================================================
  // ANALYTICS AVANZADOS
  // ========================================================================
  
  static async getAnalytics(req, res) {
    try {
      console.log('📈 Getting advanced analytics for clinic:', req.clinic.id);

      const { period = '90' } = req.query;
      const days = parseInt(period);
      
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const [
        appointmentTrends,
        customerRetention,
        revenueForecasting,
        professionalUtilization
      ] = await Promise.all([
        this.getAppointmentTrends(req.clinic.id, startDate, endDate),
        this.getCustomerRetention(req.clinic.id, startDate, endDate),
        this.getRevenueForecasting(req.clinic.id, startDate, endDate),
        this.getProfessionalUtilization(req.clinic.id, startDate, endDate)
      ]);

      res.json({
        success: true,
        data: {
          appointmentTrends,
          customerRetention,
          revenueForecasting,
          professionalUtilization,
          insights: [
            {
              type: 'trend',
              title: 'Tendencia de Citas',
              description: appointmentTrends.trend === 'up' ? 
                'Las citas están aumentando consistentemente' : 
                'Se observa una disminución en las reservas',
              recommendation: appointmentTrends.trend === 'down' ? 
                'Considera lanzar una campaña promocional' : 
                'Mantén la estrategia actual'
            },
            {
              type: 'retention',
              title: 'Retención de Clientes',
              description: `Tasa de retención del ${customerRetention.rate}%`,
              recommendation: customerRetention.rate < 70 ? 
                'Implementa un programa de fidelización' : 
                'Excelente retención de clientes'
            }
          ]
        }
      });

    } catch (error) {
      console.error('❌ Analytics error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo analytics avanzados' }
      });
    }
  }

  // ========================================================================
  // MÉTODOS AUXILIARES PARA ANALYTICS
  // ========================================================================
  
  static async getAppointmentTrends(clinicId, startDate, endDate) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      const weeklyData = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('week', scheduled_date) as week,
          COUNT(*) as appointments
        FROM appointments 
        WHERE clinic_id = ${clinicId} 
          AND scheduled_date >= ${startDate} 
          AND scheduled_date <= ${endDate}
        GROUP BY DATE_TRUNC('week', scheduled_date)
        ORDER BY week
      `;

      const trend = weeklyData.length >= 2 ? 
        (weeklyData[weeklyData.length - 1].appointments > weeklyData[0].appointments ? 'up' : 'down') : 
        'stable';

      return {
        weeklyData: weeklyData.map(week => ({
          week: week.week.toISOString().split('T')[0],
          appointments: parseInt(week.appointments)
        })),
        trend,
        growth: weeklyData.length >= 2 ? 
          ((weeklyData[weeklyData.length - 1].appointments - weeklyData[0].appointments) / weeklyData[0].appointments) * 100 :
          0
      };

    } catch (error) {
      console.error('❌ Appointment trends error:', error);
      return { weeklyData: [], trend: 'stable', growth: 0 };
    }
  }

  static async getCustomerRetention(clinicId, startDate, endDate) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      // Clientes que tuvieron citas en los primeros 30 días del período
      const earlyPeriodEnd = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const earlyCustomers = await prisma.user.findMany({
        where: {
          appointments: {
            some: {
              clinicId,
              scheduledDate: { gte: startDate, lte: earlyPeriodEnd }
            }
          }
        },
        select: { id: true }
      });

      // De esos clientes, cuántos regresaron después de los 30 días
      const returningCustomers = await prisma.user.count({
        where: {
          id: { in: earlyCustomers.map(c => c.id) },
          appointments: {
            some: {
              clinicId,
              scheduledDate: { gt: earlyPeriodEnd, lte: endDate }
            }
          }
        }
      });

      const retentionRate = earlyCustomers.length > 0 ? 
        Math.round((returningCustomers / earlyCustomers.length) * 100) : 0;

      return {
        totalCustomers: earlyCustomers.length,
        returningCustomers,
        rate: retentionRate
      };

    } catch (error) {
      console.error('❌ Customer retention error:', error);
      return { totalCustomers: 0, returningCustomers: 0, rate: 0 };
    }
  }

  static async getRevenueForecasting(clinicId, startDate, endDate) {
    try {
      // Predicción simple basada en tendencia histórica
      const revenueData = await MetricsService.getRevenueMetrics(clinicId, startDate, endDate);
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      const dailyAverage = revenueData.totalRevenue / days;
      
      // Proyección para próximos 30 días
      const forecastedRevenue = dailyAverage * 30;

      return {
        currentPeriodRevenue: revenueData.totalRevenue,
        dailyAverage,
        forecastedRevenue: Math.round(forecastedRevenue),
        confidence: 75 // Porcentaje de confianza en la predicción
      };

    } catch (error) {
      console.error('❌ Revenue forecasting error:', error);
      return { currentPeriodRevenue: 0, dailyAverage: 0, forecastedRevenue: 0, confidence: 0 };
    }
  }

  static async getProfessionalUtilization(clinicId, startDate, endDate) {
    try {
      const professionalMetrics = await MetricsService.getProfessionalMetrics(clinicId, startDate, endDate);
      
      const utilizationData = professionalMetrics.professionalStats.map(prof => {
        // Asumiendo 8 horas de trabajo por día y días del período
        const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        const availableHours = days * 8;
        const workedHours = prof.totalAppointments * 1.5; // Asumiendo 1.5 horas promedio por cita
        const utilization = Math.min((workedHours / availableHours) * 100, 100);

        return {
          name: prof.name,
          utilization: Math.round(utilization),
          appointments: prof.totalAppointments,
          revenue: prof.estimatedRevenue
        };
      });

      return {
        professionalUtilization: utilizationData,
        averageUtilization: utilizationData.length > 0 ?
          utilizationData.reduce((sum, prof) => sum + prof.utilization, 0) / utilizationData.length :
          0
      };

    } catch (error) {
      console.error('❌ Professional utilization error:', error);
      return { professionalUtilization: [], averageUtilization: 0 };
    }
  }
}

module.exports = DashboardController;