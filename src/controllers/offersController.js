// ============================================================================
// controllers/offersController.js - CONTROLADOR CORREGIDO ✅
// ============================================================================

const { PrismaClient } = require('@prisma/client');
// ✅ COMENTAR POR AHORA - IMPLEMENTAR DESPUÉS
// const { notificationsAPI } = require('../services/api');

const prisma = new PrismaClient();

// ============================================================================
// CREAR NUEVA OFERTA
// ============================================================================
const createOffer = async (req, res) => {
  try {
    const {
      title,
      description,
      terms,
      discountType,
      discountValue,
      originalPrice,
      validFrom,
      validUntil,
      targetAudience,
      minAge,
      maxAge,
      treatmentIds,
      maxUses,
      maxUsesPerUser,
      sendNotification,
      notificationSchedule,
      imageUrl,
      priority,
      category
    } = req.body;

    // Validaciones básicas
    if (!title || !description || !discountType || !discountValue || !validFrom || !validUntil) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campos requeridos: title, description, discountType, discountValue, validFrom, validUntil' }
      });
    }

    // Validar fechas
    const startDate = new Date(validFrom);
    const endDate = new Date(validUntil);
    const now = new Date();

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'La fecha de inicio debe ser anterior a la fecha de fin' }
      });
    }

    if (endDate <= now) {
      return res.status(400).json({
        success: false,
        error: { message: 'La fecha de fin debe ser futura' }
      });
    }

    // Calcular precio final
    let finalPrice = originalPrice;
    if (originalPrice) {
      if (discountType === 'PERCENTAGE') {
        finalPrice = originalPrice * (1 - discountValue / 100);
      } else if (discountType === 'FIXED_AMOUNT') {
        finalPrice = Math.max(0, originalPrice - discountValue);
      } else if (discountType === 'FREE_TREATMENT') {
        finalPrice = 0;
      }
    }

    // Crear oferta
    const newOffer = await prisma.offer.create({
      data: {
        clinicId: req.user.clinicId || req.user.id, // Dependiendo de tu estructura de auth
        title: title.trim(),
        description: description.trim(),
        terms: terms?.trim(),
        discountType,
        discountValue,
        originalPrice,
        finalPrice,
        validFrom: startDate,
        validUntil: endDate,
        targetAudience: targetAudience || 'ALL',
        minAge,
        maxAge,
        treatmentIds: JSON.stringify(treatmentIds || []),
        maxUses,
        maxUsesPerUser: maxUsesPerUser || 1,
        sendNotification: sendNotification !== false,
        notificationSchedule,
        imageUrl,
        priority: priority || 1,
        category: category || 'GENERAL',
      },
      include: {
        clinic: {
          select: {
            name: true,
            id: true
          }
        }
      }
    });

    console.log('✅ Oferta creada:', newOffer.title);

    // ✅ PROGRAMAR NOTIFICACIÓN (IMPLEMENTAR DESPUÉS)
    if (sendNotification) {
      // await scheduleOfferNotification(newOffer);
      console.log('📱 Notificación programada para:', newOffer.title);
    }

    res.status(201).json({
      success: true,
      message: 'Oferta creada exitosamente',
      data: { offer: newOffer }
    });

  } catch (error) {
    console.error('❌ Error creando oferta:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
};

// ============================================================================
// OBTENER OFERTAS DE UNA CLÍNICA
// ============================================================================
const getClinicOffers = async (req, res) => {
  try {
    const { status, category, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const whereClause = {
      clinicId: req.user.clinicId || req.user.id,
      ...(status && { isActive: status === 'active' }),
      ...(category && { category }),
    };

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where: whereClause,
        include: {
          clinic: {
            select: { name: true }
          },
          offerRedemptions: {
            select: {
              id: true,
              redeemedAt: true,
              status: true,
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: parseInt(limit)
      }),
      prisma.offer.count({ where: whereClause })
    ]);

    // Enriquecer con estadísticas
    const enrichedOffers = offers.map(offer => ({
      ...offer,
      stats: {
        totalRedemptions: offer.offerRedemptions.length,
        activeRedemptions: offer.offerRedemptions.filter(r => r.status === 'ACTIVE').length,
        usedRedemptions: offer.offerRedemptions.filter(r => r.status === 'USED').length,
        redemptionRate: offer.maxUses ? (offer.currentUses / offer.maxUses * 100).toFixed(1) + '%' : 'Sin límite',
        isExpired: new Date(offer.validUntil) < new Date(),
        daysRemaining: Math.ceil((new Date(offer.validUntil) - new Date()) / (1000 * 60 * 60 * 24))
      }
    }));

    res.json({
      success: true,
      data: {
        offers: enrichedOffers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
          hasMore: skip + offers.length < total
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo ofertas:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
};

// ============================================================================
// OBTENER OFERTAS ACTIVAS PARA USUARIOS
// ============================================================================
const getActiveOffers = async (req, res) => {
  try {
    const { category, targetAudience } = req.query;
    const userId = req.user.userId;

    // Obtener perfil del usuario para targeting
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        vipStatus: true,
        birthDate: true,
        createdAt: true
      }
    });

    const now = new Date();
    const userAge = user?.birthDate ? 
      Math.floor((now - new Date(user.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    const isNewCustomer = user?.createdAt ? 
      user.createdAt > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : false;

    const whereClause = {
      isActive: true,
      validFrom: { lte: now },
      validUntil: { gte: now },
      ...(category && { category }),
      // Targeting por audiencia
      OR: [
        { targetAudience: 'ALL' },
        ...(user?.vipStatus ? [{ targetAudience: 'VIP' }] : []),
        ...(isNewCustomer ? [{ targetAudience: 'NEW_CUSTOMERS' }] : []),
        ...(!isNewCustomer ? [{ targetAudience: 'RETURNING' }] : [])
      ],
    };

    // Targeting por edad
    if (userAge) {
      whereClause.AND = [
        {
          OR: [
            { minAge: null, maxAge: null },
            { minAge: { lte: userAge }, maxAge: { gte: userAge } },
            { minAge: { lte: userAge }, maxAge: null },
            { minAge: null, maxAge: { gte: userAge } }
          ]
        }
      ];
    }

    const offers = await prisma.offer.findMany({
      where: whereClause,
      include: {
        clinic: {
          select: {
            name: true,
            address: true,
            phone: true
          }
        },
        offerRedemptions: {
          where: { userId },
          select: {
            id: true,
            status: true,
            redeemedAt: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { validUntil: 'asc' }
      ]
    });

    // Filtrar ofertas ya usadas por el usuario
    const availableOffers = offers.filter(offer => {
      const userRedemptions = offer.offerRedemptions.length;
      return userRedemptions < (offer.maxUsesPerUser || 1);
    });

    res.json({
      success: true,
      data: {
        offers: availableOffers.map(offer => ({
          ...offer,
          userCanRedeem: true,
          userRedemptionsUsed: offer.offerRedemptions.length,
          userRedemptionsRemaining: (offer.maxUsesPerUser || 1) - offer.offerRedemptions.length,
          daysRemaining: Math.ceil((new Date(offer.validUntil) - now) / (1000 * 60 * 60 * 24))
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo ofertas activas:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
};

// ============================================================================
// ACTUALIZAR OFERTA
// ============================================================================
const updateOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const updateData = req.body;

    // Verificar que la oferta pertenece a la clínica
    const existingOffer = await prisma.offer.findFirst({
      where: {
        id: offerId,
        clinicId: req.user.clinicId || req.user.id
      }
    });

    if (!existingOffer) {
      return res.status(404).json({
        success: false,
        error: { message: 'Oferta no encontrada' }
      });
    }

    // Validar fechas si se actualizan
    if (updateData.validFrom || updateData.validUntil) {
      const startDate = new Date(updateData.validFrom || existingOffer.validFrom);
      const endDate = new Date(updateData.validUntil || existingOffer.validUntil);

      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          error: { message: 'La fecha de inicio debe ser anterior a la fecha de fin' }
        });
      }
    }

    // Recalcular precio final si es necesario
    if (updateData.originalPrice || updateData.discountType || updateData.discountValue) {
      const originalPrice = updateData.originalPrice || existingOffer.originalPrice;
      const discountType = updateData.discountType || existingOffer.discountType;
      const discountValue = updateData.discountValue || existingOffer.discountValue;

      if (originalPrice) {
        if (discountType === 'PERCENTAGE') {
          updateData.finalPrice = originalPrice * (1 - discountValue / 100);
        } else if (discountType === 'FIXED_AMOUNT') {
          updateData.finalPrice = Math.max(0, originalPrice - discountValue);
        } else if (discountType === 'FREE_TREATMENT') {
          updateData.finalPrice = 0;
        }
      }
    }

    const updatedOffer = await prisma.offer.update({
      where: { id: offerId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        clinic: {
          select: { name: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Oferta actualizada exitosamente',
      data: { offer: updatedOffer }
    });

  } catch (error) {
    console.error('❌ Error actualizando oferta:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
};

// ============================================================================
// CANJEAR OFERTA (USUARIOS)
// ============================================================================
const redeemOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { appointmentId } = req.body;
    const userId = req.user.userId;

    // Verificar oferta
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        offerRedemptions: {
          where: { userId }
        }
      }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: { message: 'Oferta no encontrada' }
      });
    }

    // Validaciones
    const now = new Date();
    if (!offer.isActive) {
      return res.status(400).json({
        success: false,
        error: { message: 'Oferta no está activa' }
      });
    }

    if (offer.validUntil < now) {
      return res.status(400).json({
        success: false,
        error: { message: 'Oferta expirada' }
      });
    }

    if (offer.validFrom > now) {
      return res.status(400).json({
        success: false,
        error: { message: 'Oferta aún no está disponible' }
      });
    }

    // Verificar límites de uso
    if (offer.maxUses && offer.currentUses >= offer.maxUses) {
      return res.status(400).json({
        success: false,
        error: { message: 'Oferta agotada' }
      });
    }

    const userRedemptions = offer.offerRedemptions.length;
    if (userRedemptions >= (offer.maxUsesPerUser || 1)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Ya has usado esta oferta el máximo de veces permitido' }
      });
    }

    // Crear redención
    const code = `OFFER${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

    const redemption = await prisma.offerRedemption.create({
      data: {
        offerId,
        userId,
        appointmentId,
        originalPrice: offer.originalPrice || 0,
        discountApplied: offer.discountValue,
        finalPrice: offer.finalPrice || 0,
        code,
        expiresAt
      }
    });

    // Actualizar contador de usos
    await prisma.offer.update({
      where: { id: offerId },
      data: {
        currentUses: { increment: 1 }
      }
    });

    res.json({
      success: true,
      message: 'Oferta canjeada exitosamente',
      data: { redemption }
    });

  } catch (error) {
    console.error('❌ Error canjeando oferta:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
};

// ============================================================================
// ENVIAR NOTIFICACIÓN DE OFERTA
// ============================================================================
const sendOfferNotification = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { targetUsers, immediate = false } = req.body;

    const offer = await prisma.offer.findFirst({
      where: {
        id: offerId,
        clinicId: req.user.clinicId || req.user.id,
        isActive: true
      },
      include: {
        clinic: {
          select: { name: true }
        }
      }
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: { message: 'Oferta no encontrada' }
      });
    }

    // ✅ AQUÍ INTEGRARÍAS CON TU SISTEMA DE NOTIFICACIONES
    // Por ejemplo, con Firebase, OneSignal, etc.
    
    console.log(`📱 Enviando notificación de oferta: ${offer.title}`);

    res.json({
      success: true,
      message: 'Notificación enviada exitosamente',
      data: {
        offerId,
        notificationsSent: targetUsers?.length || 0,
        immediate
      }
    });

  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
};

// ============================================================================
// ESTADÍSTICAS DE OFERTAS
// ============================================================================
const getOfferStats = async (req, res) => {
  try {
    const clinicId = req.user.clinicId || req.user.id;

    const [
      totalOffers,
      activeOffers,
      totalRedemptions,
      expiredOffers
    ] = await Promise.all([
      prisma.offer.count({ where: { clinicId } }),
      prisma.offer.count({ where: { clinicId, isActive: true } }),
      prisma.offerRedemption.count({
        where: {
          offer: { clinicId }
        }
      }),
      prisma.offer.count({
        where: {
          clinicId,
          validUntil: { lt: new Date() }
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalOffers,
          activeOffers,
          expiredOffers,
          totalRedemptions,
          averageRedemptionsPerOffer: totalOffers > 0 ? (totalRedemptions / totalOffers).toFixed(1) : 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
};

module.exports = {
  createOffer,
  getClinicOffers,
  getActiveOffers,
  updateOffer,
  redeemOffer,
  sendOfferNotification,
  getOfferStats
};