// ============================================================================
// src/controllers/vip.controller.js - CONTROLADOR VIP COMPLETO
// ============================================================================
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/errors');
const PaymentService = require('../services/payment.service');
const EmailService = require('../services/email.service');

const prisma = new PrismaClient();

class VIPController {
  // Obtener beneficios VIP
  static async getBenefits(req, res, next) {
    try {
      const benefits = [
        {
          id: 'discounts',
          title: 'Descuentos Exclusivos',
          description: 'Hasta 25% de descuento en todos los tratamientos',
          iconName: 'tag',
          category: 'savings'
        },
        {
          id: 'priority',
          title: 'Citas Prioritarias',
          description: 'Acceso preferencial a los mejores horarios',
          iconName: 'clock',
          category: 'convenience'
        },
        {
          id: 'free-facial',
          title: 'Facial Gratuito',
          description: 'Un facial de limpieza profunda cada 3 meses',
          iconName: 'sparkles',
          category: 'treatment'
        },
        {
          id: 'double-points',
          title: 'Puntos Dobles',
          description: 'Acumula Beauty Points 2x más rápido',
          iconName: 'star',
          category: 'points'
        },
        {
          id: 'personal-advisor',
          title: 'Asesoría Personalizada',
          description: 'Consulta con especialista en cuidado de la piel',
          iconName: 'user-check',
          category: 'consultation'
        },
        {
          id: 'birthday-gift',
          title: 'Regalo de Cumpleaños',
          description: 'Tratamiento sorpresa en tu mes especial',
          iconName: 'gift',
          category: 'special'
        },
        {
          id: 'custom-guide',
          title: 'Guía Personalizada',
          description: 'Rutina de cuidado diseñada solo para ti',
          iconName: 'book-open',
          category: 'guide'
        }
      ];

      res.status(200).json({
        success: true,
        data: { benefits }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener testimonios
  static async getTestimonials(req, res, next) {
    try {
      const testimonials = [
        {
          id: 1,
          name: 'Ana García',
          age: 28,
          avatar: '👩🏻‍💼',
          comment: 'Los descuentos VIP me permiten cuidarme más seguido. ¡Increíble!',
          rating: 5
        },
        {
          id: 2,
          name: 'María Rodríguez',
          age: 35,
          avatar: '👩🏽‍🦰',
          comment: 'La asesoría personalizada cambió completamente mi rutina de belleza.',
          rating: 5
        },
        {
          id: 3,
          name: 'Carmen López',
          age: 42,
          avatar: '👩🏻‍🦱',
          comment: 'Siempre consigo los mejores horarios gracias a la prioridad VIP.',
          rating: 5
        },
        {
          id: 4,
          name: 'Sofia Martín',
          age: 31,
          avatar: '👩🏼‍💻',
          comment: 'El facial gratuito trimestral es mi momento favorito del año.',
          rating: 5
        }
      ];

      res.status(200).json({
        success: true,
        data: { testimonials }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener estado VIP del usuario
  static async getVIPStatus(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          vipSubscriptions: {
            where: {
              status: 'ACTIVE',
              expiresAt: { gte: new Date() }
            },
            orderBy: { expiresAt: 'desc' },
            take: 1
          }
        }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      const activeSubscription = user.vipSubscriptions[0];

      res.status(200).json({
        success: true,
        data: {
          isVIP: user.vipStatus,
          subscription: activeSubscription ? {
            id: activeSubscription.id,
            planType: activeSubscription.planType,
            price: activeSubscription.price,
            status: activeSubscription.status,
            expiresAt: activeSubscription.expiresAt,
            daysRemaining: Math.ceil(
              (new Date(activeSubscription.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
            )
          } : null,
          benefits: {
            discountPercentage: user.vipStatus ? 25 : 0,
            pointsMultiplier: user.vipStatus ? 2 : 1,
            priorityBooking: user.vipStatus,
            freeMonthlyFacial: user.vipStatus,
            personalAdvisor: user.vipStatus
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Suscribirse a VIP
  static async subscribe(req, res, next) {
    try {
      const userId = req.user.id;
      const { planType = 'MONTHLY', paymentMethodId } = req.body;

      // Verificar si ya tiene suscripción activa
      const existingSubscription = await prisma.vipSubscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          expiresAt: { gte: new Date() }
        }
      });

      if (existingSubscription) {
        throw new AppError('Ya tienes una suscripción VIP activa', 409);
      }

      // Obtener usuario
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      // Definir precio según plan
      const pricing = {
        MONTHLY: 19.99,
        YEARLY: 199.99 // 2 meses gratis
      };

      const price = pricing[planType];
      const duration = planType === 'MONTHLY' ? 30 : 365; // días

      let stripeSubscriptionId = null;

      // Crear suscripción en Stripe (en producción)
      if (process.env.NODE_ENV === 'production' && paymentMethodId) {
        try {
          const stripeSubscription = await PaymentService.createVIPSubscription(
            userId,
            planType,
            paymentMethodId
          );
          stripeSubscriptionId = stripeSubscription.id;
        } catch (stripeError) {
          throw new AppError('Error procesando el pago', 402, stripeError.message);
        }
      }

      // Crear suscripción en base de datos usando transacción
      const subscription = await prisma.$transaction(async (tx) => {
        // Crear suscripción
        const newSubscription = await tx.vipSubscription.create({
          data: {
            userId,
            planType,
            price,
            status: 'ACTIVE',
            stripeSubscriptionId,
            startsAt: new Date(),
            expiresAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
          }
        });

        // Actualizar estado VIP del usuario
        await tx.user.update({
          where: { id: userId },
          data: {
            vipStatus: true,
            beautyPoints: { increment: 50 } // Bonus por suscribirse
          }
        });

        return newSubscription;
      });

      // Enviar email de bienvenida VIP
      await EmailService.sendVIPWelcome(user, subscription);

      res.status(201).json({
        success: true,
        message: '¡Bienvenida al Club VIP! 🎉',
        data: {
          subscription: {
            id: subscription.id,
            planType: subscription.planType,
            price: subscription.price,
            status: subscription.status,
            expiresAt: subscription.expiresAt
          },
          bonusPoints: 50,
          immediateDiscounts: true,
          welcomeMessage: 'Ya puedes disfrutar de todos los beneficios VIP'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Cancelar suscripción VIP
  static async cancelSubscription(req, res, next) {
    try {
      const userId = req.user.id;

      // Buscar suscripción activa
      const activeSubscription = await prisma.vipSubscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          expiresAt: { gte: new Date() }
        }
      });

      if (!activeSubscription) {
        throw new AppError('No tienes suscripción VIP activa', 404);
      }

      // Cancelar en Stripe si existe
      if (activeSubscription.stripeSubscriptionId) {
        try {
          await PaymentService.cancelSubscription(activeSubscription.stripeSubscriptionId);
        } catch (stripeError) {
          console.error('Error cancelando en Stripe:', stripeError);
          // Continuar con cancelación local aunque falle Stripe
        }
      }

      // Actualizar suscripción como cancelada (pero sigue activa hasta expirar)
      await prisma.vipSubscription.update({
        where: { id: activeSubscription.id },
        data: { status: 'CANCELLED' }
      });

      res.status(200).json({
        success: true,
        message: 'Suscripción VIP cancelada',
        data: {
          message: 'Tu suscripción VIP seguirá activa hasta el final del período pagado',
          expiresAt: activeSubscription.expiresAt,
          daysRemaining: Math.ceil(
            (new Date(activeSubscription.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
          )
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener ofertas exclusivas VIP
  static async getVIPOffers(req, res, next) {
    try {
      const userId = req.user.id;

      // Verificar estado VIP
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { vipStatus: true, beautyPoints: true }
      });

      if (!user?.vipStatus) {
        throw new AppError('Acceso VIP requerido', 403);
      }

      // Obtener tratamientos exclusivos VIP
      const vipTreatments = await prisma.treatment.findMany({
        where: {
          isVipExclusive: true,
          isActive: true
        },
        include: {
          clinic: true
        },
        take: 10
      });

      // Generar ofertas personalizadas
      const personalizedOffers = [
        {
          id: 'vip-combo-1',
          title: 'Combo Renovación VIP',
          description: 'Limpieza facial + Hidratación + Masaje relajante',
          originalPrice: 150,
          vipPrice: 112.50,
          discount: 25,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
          category: 'combo'
        },
        {
          id: 'vip-monthly-facial',
          title: 'Facial Mensual VIP',
          description: 'Tu facial gratuito de este mes está disponible',
          originalPrice: 80,
          vipPrice: 0,
          discount: 100,
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
          category: 'free'
        },
        {
          id: 'vip-points-bonus',
          title: 'Doble Puntos Especial',
          description: 'Gana puntos x4 en lugar de x2 esta semana',
          originalPrice: null,
          vipPrice: null,
          discount: null,
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          category: 'points'
        }
      ];

      // Ofertas basadas en historial del usuario
      const userHistory = await prisma.appointment.findMany({
        where: {
          userId,
          status: 'COMPLETED'
        },
        include: {
          treatment: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 5
      });

      // Recomendar tratamientos similares con descuento VIP
      const recommendedTreatments = await prisma.treatment.findMany({
        where: {
          isActive: true,
          category: {
            in: userHistory.map(apt => apt.treatment.category)
          }
        },
        include: {
          clinic: true
        },
        take: 5
      });

      res.status(200).json({
        success: true,
        data: {
          exclusiveTreatments: vipTreatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description,
            duration: treatment.durationMinutes,
            originalPrice: treatment.price,
            vipPrice: treatment.price * 0.75, // 25% descuento
            clinic: treatment.clinic.name,
            iconName: treatment.iconName
          })),
          personalizedOffers,
          recommendedTreatments: recommendedTreatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description,
            duration: treatment.durationMinutes,
            originalPrice: treatment.price,
            vipPrice: treatment.price * 0.75,
            savings: treatment.price * 0.25,
            clinic: treatment.clinic.name,
            iconName: treatment.iconName,
            category: treatment.category
          })),
          vipPerks: {
            discountPercentage: 25,
            pointsMultiplier: 2,
            freeMonthlyFacial: true,
            priorityBooking: true,
            currentPoints: user.beautyPoints
          },
          summary: {
            totalSavingsAvailable: vipTreatments.reduce((sum, t) => sum + (t.price * 0.25), 0),
            exclusiveTreatmentsCount: vipTreatments.length,
            personalizedOffersCount: personalizedOffers.length
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Renovar suscripción VIP
  static async renewSubscription(req, res, next) {
    try {
      const userId = req.user.id;
      const { planType } = req.body;

      // Buscar suscripción actual
      const currentSubscription = await prisma.vipSubscription.findFirst({
        where: {
          userId,
          status: { in: ['ACTIVE', 'CANCELLED'] }
        },
        orderBy: { expiresAt: 'desc' }
      });

      if (!currentSubscription) {
        throw new AppError('No se encontró suscripción para renovar', 404);
      }

      // Si está cancelada pero aún no expiró, reactivar
      if (currentSubscription.status === 'CANCELLED' && 
          new Date(currentSubscription.expiresAt) > new Date()) {
        
        await prisma.vipSubscription.update({
          where: { id: currentSubscription.id },
          data: { status: 'ACTIVE' }
        });

        // Reactivar en Stripe si es necesario
        if (currentSubscription.stripeSubscriptionId) {
          try {
            await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
              cancel_at_period_end: false
            });
          } catch (stripeError) {
            console.error('Error reactivando en Stripe:', stripeError);
          }
        }

        res.status(200).json({
          success: true,
          message: 'Suscripción VIP reactivada exitosamente',
          data: {
            subscription: currentSubscription,
            message: 'Tu suscripción VIP ha sido reactivada'
          }
        });
        return;
      }

      // Crear nueva suscripción si la actual ya expiró
      const pricing = {
        MONTHLY: 19.99,
        YEARLY: 199.99
      };

      const price = pricing[planType || currentSubscription.planType];
      const duration = (planType || currentSubscription.planType) === 'MONTHLY' ? 30 : 365;

      const newSubscription = await prisma.vipSubscription.create({
        data: {
          userId,
          planType: planType || currentSubscription.planType,
          price,
          status: 'ACTIVE',
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
        }
      });

      // Dar bonus por renovar
      await prisma.user.update({
        where: { id: userId },
        data: {
          beautyPoints: { increment: 25 } // Bonus menor por renovación
        }
      });

      res.status(201).json({
        success: true,
        message: 'Suscripción VIP renovada exitosamente',
        data: {
          subscription: newSubscription,
          bonusPoints: 25,
          message: '¡Gracias por continuar con nosotras!'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Usar beneficio VIP (facial gratuito, etc.)
  static async useBenefit(req, res, next) {
    try {
      const userId = req.user.id;
      const { benefitType } = req.body;

      // Verificar que sea usuario VIP
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { vipStatus: true }
      });

      if (!user?.vipStatus) {
        throw new AppError('Acceso VIP requerido', 403);
      }

      let result = {};

      switch (benefitType) {
        case 'free_facial':
          // Verificar si ya usó el facial este trimestre
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

          const recentFreeFacial = await prisma.appointment.findFirst({
            where: {
              userId,
              createdAt: { gte: threeMonthsAgo },
              notes: { contains: 'VIP_FREE_FACIAL' },
              status: { in: ['CONFIRMED', 'COMPLETED'] }
            }
          });

          if (recentFreeFacial) {
            throw new AppError('Ya usaste tu facial gratuito en los últimos 3 meses', 400);
          }

          result = {
            benefitUsed: 'free_facial',
            message: 'Facial gratuito disponible para reservar',
            nextAvailable: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          };
          break;

        case 'birthday_gift':
          // Verificar si es su mes de cumpleaños
          const userBirthday = await prisma.user.findUnique({
            where: { id: userId },
            select: { birthDate: true }
          });

          if (!userBirthday?.birthDate) {
            throw new AppError('Fecha de nacimiento no registrada', 400);
          }

          const currentMonth = new Date().getMonth();
          const birthdayMonth = new Date(userBirthday.birthDate).getMonth();

          if (currentMonth !== birthdayMonth) {
            throw new AppError('El regalo de cumpleaños solo está disponible en tu mes de nacimiento', 400);
          }

          result = {
            benefitUsed: 'birthday_gift',
            message: '¡Feliz cumpleaños! Tu regalo especial está disponible',
            gift: 'Tratamiento premium gratuito'
          };
          break;

        default:
          throw new AppError('Tipo de beneficio no válido', 400);
      }

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = VIPController;