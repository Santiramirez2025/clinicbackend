// ============================================================================
// src/controllers/treatment.controller.js - CONTROLADOR DE TRATAMIENTOS
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

class TreatmentController {
  // Obtener todos los tratamientos con filtros
  static async getAllTreatments(req, res, next) {
    try {
      const { 
        clinicId, 
        category, 
        isVipExclusive, 
        minPrice, 
        maxPrice, 
        search,
        limit = 20,
        offset = 0 
      } = req.query;

      // Construir filtros dinámicos
      const whereClause = {};
      
      if (clinicId) {
        whereClause.clinicId = clinicId;
      }
      
      if (category) {
        whereClause.category = category;
      }
      
      if (isVipExclusive !== undefined) {
        whereClause.isVipExclusive = isVipExclusive === 'true';
      }
      
      if (minPrice || maxPrice) {
        whereClause.price = {};
        if (minPrice) whereClause.price.gte = parseFloat(minPrice);
        if (maxPrice) whereClause.price.lte = parseFloat(maxPrice);
      }
      
      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Obtener tratamientos con información de clínica
      const treatments = await prisma.treatment.findMany({
        where: whereClause,
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true
            }
          }
        },
        orderBy: [
          { isVipExclusive: 'desc' }, // VIP primero
          { category: 'asc' },
          { price: 'asc' }
        ],
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      const total = await prisma.treatment.count({ where: whereClause });

      res.status(200).json({
        success: true,
        data: {
          treatments: treatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description,
            price: treatment.price,
            durationMinutes: treatment.durationMinutes,
            category: treatment.category,
            iconName: treatment.iconName,
            emoji: treatment.emoji,
            isVipExclusive: treatment.isVipExclusive,
            benefits: treatment.benefits,
            clinic: {
              id: treatment.clinic.id,
              name: treatment.clinic.name,
              address: treatment.clinic.address,
              phone: treatment.clinic.phone
            }
          })),
          pagination: {
            total,
            page: Math.floor(offset / limit) + 1,
            limit: parseInt(limit),
            hasMore: (parseInt(offset) + parseInt(limit)) < total
          },
          filters: {
            clinicId,
            category,
            isVipExclusive,
            minPrice,
            maxPrice,
            search
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener tratamientos destacados para dashboard
  static async getFeaturedTreatments(req, res, next) {
    try {
      const { clinicId, userId } = req.query;
      const limit = parseInt(req.query.limit) || 6;

      // Si hay userId, personalizar recomendaciones
      let userPreferences = null;
      if (userId && userId !== 'demo-user-123') {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            vipStatus: true,
            skinType: true,
            // Obtener tratamientos previos para personalización
            appointments: {
              where: { status: 'COMPLETED' },
              include: { treatment: true },
              orderBy: { scheduledDate: 'desc' },
              take: 5
            }
          }
        });
        userPreferences = user;
      }

      // Construir filtros base
      const whereClause = {};
      
      if (clinicId) {
        whereClause.clinicId = clinicId;
      }

      // Si el usuario no es VIP, excluir tratamientos VIP
      if (userPreferences && !userPreferences.vipStatus) {
        whereClause.isVipExclusive = false;
      }

      // Obtener tratamientos destacados
      const featuredTreatments = await prisma.treatment.findMany({
        where: whereClause,
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        },
        orderBy: [
          // Priorizar tratamientos VIP si el usuario es VIP
          ...(userPreferences?.vipStatus ? [{ isVipExclusive: 'desc' }] : []),
          { price: 'asc' } // Más económicos primero
        ],
        take: limit
      });

      // Si hay preferencias del usuario, reordenar por compatibilidad
      let finalTreatments = featuredTreatments;
      
      if (userPreferences) {
        // Obtener categorías de tratamientos previos
        const previousCategories = userPreferences.appointments.map(
          apt => apt.treatment.category
        );
        
        // Ordenar por relevancia
        finalTreatments = featuredTreatments.sort((a, b) => {
          const aScore = previousCategories.includes(a.category) ? 2 : 0;
          const bScore = previousCategories.includes(b.category) ? 2 : 0;
          
          const aVipScore = a.isVipExclusive && userPreferences.vipStatus ? 1 : 0;
          const bVipScore = b.isVipExclusive && userPreferences.vipStatus ? 1 : 0;
          
          return (bScore + bVipScore) - (aScore + aVipScore);
        });
      }

      res.status(200).json({
        success: true,
        data: {
          featuredTreatments: finalTreatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description,
            price: treatment.price,
            durationMinutes: treatment.durationMinutes,
            duration: treatment.durationMinutes, // Compatibilidad con frontend
            category: treatment.category,
            iconName: treatment.iconName,
            emoji: treatment.emoji || TreatmentController.getEmojiFromCategory(treatment.category),
            isVipExclusive: treatment.isVipExclusive,
            benefits: treatment.benefits,
            clinic: {
              id: treatment.clinic.id,
              name: treatment.clinic.name,
              address: treatment.clinic.address
            }
          })),
          personalized: !!userPreferences,
          userTier: userPreferences?.vipStatus ? 'VIP' : 'Standard'
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener tratamientos por clínica específica
  static async getTreatmentsByClinic(req, res, next) {
    try {
      const { clinicId } = req.params;
      const { category, isVipExclusive } = req.query;

      // Verificar que la clínica existe
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId }
      });

      if (!clinic) {
        throw new AppError('Clínica no encontrada', 404);
      }

      // Construir filtros
      const whereClause = { clinicId };
      
      if (category) {
        whereClause.category = category;
      }
      
      if (isVipExclusive !== undefined) {
        whereClause.isVipExclusive = isVipExclusive === 'true';
      }

      const treatments = await prisma.treatment.findMany({
        where: whereClause,
        orderBy: [
          { isVipExclusive: 'desc' },
          { category: 'asc' },
          { price: 'asc' }
        ]
      });

      res.status(200).json({
        success: true,
        data: {
          clinic: {
            id: clinic.id,
            name: clinic.name,
            address: clinic.address,
            phone: clinic.phone
          },
          treatments: treatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description,
            price: treatment.price,
            durationMinutes: treatment.durationMinutes,
            duration: treatment.durationMinutes,
            category: treatment.category,
            iconName: treatment.iconName,
            emoji: treatment.emoji || TreatmentController.getEmojiFromCategory(treatment.category),
            isVipExclusive: treatment.isVipExclusive,
            benefits: treatment.benefits
          }))
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener categorías disponibles
  static async getCategories(req, res, next) {
    try {
      const { clinicId } = req.query;

      const whereClause = {};
      if (clinicId) {
        whereClause.clinicId = clinicId;
      }

      const categories = await prisma.treatment.findMany({
        where: whereClause,
        select: { category: true },
        distinct: ['category']
      });

      const categoryList = categories.map(c => c.category).filter(Boolean);

      // Obtener conteos para cada categoría
      const categoriesWithCount = await Promise.all(
        categoryList.map(async (category) => {
          const treatmentCount = await prisma.treatment.count({
            where: { ...whereClause, category }
          });
          
          return {
            name: category,
            emoji: TreatmentController.getEmojiFromCategory(category),
            treatmentCount
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          categories: categoriesWithCount
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Obtener detalles de un tratamiento específico
  static async getTreatmentDetails(req, res, next) {
    try {
      const { id } = req.params;

      const treatment = await prisma.treatment.findUnique({
        where: { id },
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              website: true,
              rating: true
            }
          },
          // Incluir profesionales que pueden realizar este tratamiento
          clinic: {
            include: {
              professionals: {
                where: { isActive: true },
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  specialties: true,
                  rating: true,
                  avatarUrl: true
                }
              }
            }
          }
        }
      });

      if (!treatment) {
        throw new AppError('Tratamiento no encontrado', 404);
      }

      res.status(200).json({
        success: true,
        data: {
          treatment: {
            id: treatment.id,
            name: treatment.name,
            description: treatment.description,
            price: treatment.price,
            durationMinutes: treatment.durationMinutes,
            duration: treatment.durationMinutes,
            category: treatment.category,
            iconName: treatment.iconName,
            emoji: treatment.emoji || TreatmentController.getEmojiFromCategory(treatment.category),
            isVipExclusive: treatment.isVipExclusive,
            benefits: treatment.benefits,
            preparationInstructions: treatment.preparationInstructions,
            aftercareInstructions: treatment.aftercareInstructions,
            clinic: {
              id: treatment.clinic.id,
              name: treatment.clinic.name,
              address: treatment.clinic.address,
              phone: treatment.clinic.phone,
              website: treatment.clinic.website,
              rating: treatment.clinic.rating
            },
            availableProfessionals: treatment.clinic.professionals.map(prof => ({
              id: prof.id,
              name: `${prof.firstName} ${prof.lastName}`,
              specialties: prof.specialties,
              rating: prof.rating,
              avatarUrl: prof.avatarUrl
            }))
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Buscar tratamientos
  static async searchTreatments(req, res, next) {
    try {
      const { q: query, clinicId, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: { message: 'La búsqueda debe tener al menos 2 caracteres' }
        });
      }

      const whereClause = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { category: { contains: query, mode: 'insensitive' } }
        ]
      };

      if (clinicId) {
        whereClause.clinicId = clinicId;
      }

      const treatments = await prisma.treatment.findMany({
        where: whereClause,
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        },
        orderBy: [
          { name: 'asc' }
        ],
        take: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        data: {
          query,
          treatments: treatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description,
            price: treatment.price,
            durationMinutes: treatment.durationMinutes,
            duration: treatment.durationMinutes,
            category: treatment.category,
            iconName: treatment.iconName,
            emoji: treatment.emoji || TreatmentController.getEmojiFromCategory(treatment.category),
            isVipExclusive: treatment.isVipExclusive,
            clinic: {
              id: treatment.clinic.id,
              name: treatment.clinic.name,
              address: treatment.clinic.address
            }
          }))
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // Método helper para emojis por categoría
  static getEmojiFromCategory(category) {
    const emojiMap = {
      'Facial': '💆‍♀️',
      'Corporal': '🌿',
      'Masajes': '👐',
      'Depilación': '✨',
      'Uñas': '💅',
      'Cejas': '👁️',
      'Pestañas': '👁️‍🗨️',
      'Maquillaje': '💄',
      'Spa': '🧘‍♀️',
      'Relajación': '🌸',
      'Tratamientos': '💎',
      'Belleza': '✨'
    };
    return emojiMap[category] || '💆‍♀️';
  }
}

module.exports = TreatmentController;