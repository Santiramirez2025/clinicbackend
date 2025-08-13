// ============================================================================
// src/controllers/treatment.controller.js - CONTROLADOR DE TRATAMIENTOS CORREGIDO ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class TreatmentController {
  // ============================================================================
  // OBTENER TODOS LOS TRATAMIENTOS
  // ============================================================================
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

      console.log('💊 Getting all treatments with filters:', {
        clinicId, category, isVipExclusive, search, limit, offset
      });

      // Construir filtros dinámicos
      const whereClause = {
        isActive: true
      };
      
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
          { description: { contains: search, mode: 'insensitive' } },
          { shortDescription: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Obtener tratamientos con información de clínica
      const [treatments, total] = await Promise.all([
        prisma.treatment.findMany({
          where: whereClause,
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                city: true
              }
            }
          },
          orderBy: [
            { isFeatured: 'desc' },
            { isVipExclusive: 'desc' },
            { category: 'asc' },
            { price: 'asc' }
          ],
          take: parseInt(limit),
          skip: parseInt(offset)
        }),
        prisma.treatment.count({ where: whereClause })
      ]);

      console.log(`✅ Found ${treatments.length} treatments (${total} total)`);

      res.status(200).json({
        success: true,
        data: {
          treatments: treatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description || treatment.shortDescription || '',
            price: treatment.price,
            duration: treatment.durationMinutes,
            durationMinutes: treatment.durationMinutes,
            category: treatment.category,
            iconName: treatment.iconName,
            emoji: TreatmentController.getEmojiFromCategory(treatment.category),
            isVipExclusive: treatment.isVipExclusive,
            isActive: treatment.isActive,
            isFeatured: treatment.isFeatured,
            vipPrice: treatment.vipPrice,
            clinic: treatment.clinic?.name || 'Clínica Principal'
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
      console.error('❌ Error getting all treatments:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // OBTENER TRATAMIENTOS DESTACADOS
  // ============================================================================
  static async getFeaturedTreatments(req, res, next) {
    try {
      const { clinicId, userId } = req.query;
      const limit = parseInt(req.query.limit) || 6;

      console.log('⭐ Getting featured treatments:', { clinicId, userId, limit });

      // Construir filtros base
      const whereClause = {
        isActive: true,
        isFeatured: true
      };
      
      if (clinicId) {
        whereClause.clinicId = clinicId;
      }

      // Si hay usuario, verificar VIP status
      let userVipStatus = false;
      if (userId && userId !== 'demo-user-123') {
        try {
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { vipStatus: true }
          });
          userVipStatus = user?.vipStatus || false;
        } catch (userError) {
          console.log('⚠️ Could not fetch user VIP status');
        }
      }

      // Si el usuario no es VIP, excluir tratamientos VIP
      if (!userVipStatus) {
        whereClause.isVipExclusive = false;
      }

      const featuredTreatments = await prisma.treatment.findMany({
        where: whereClause,
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true
            }
          }
        },
        orderBy: [
          { isVipExclusive: userVipStatus ? 'desc' : 'asc' },
          { price: 'asc' }
        ],
        take: limit
      });

      console.log(`✅ Found ${featuredTreatments.length} featured treatments`);

      res.status(200).json({
        success: true,
        data: {
          featuredTreatments: featuredTreatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description || treatment.shortDescription || '',
            price: treatment.price,
            duration: treatment.durationMinutes,
            durationMinutes: treatment.durationMinutes,
            category: treatment.category,
            iconName: treatment.iconName,
            emoji: TreatmentController.getEmojiFromCategory(treatment.category),
            isVipExclusive: treatment.isVipExclusive,
            vipPrice: treatment.vipPrice,
            clinic: treatment.clinic?.name || 'Clínica Principal'
          })),
          personalized: !!userId,
          userTier: userVipStatus ? 'VIP' : 'Standard'
        }
      });

    } catch (error) {
      console.error('❌ Error getting featured treatments:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // OBTENER CATEGORÍAS
  // ============================================================================
  static async getCategories(req, res, next) {
    try {
      const { clinicId } = req.query;

      console.log('🏷️ Getting categories for clinic:', clinicId);

      const whereClause = {
        isActive: true
      };
      
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

      console.log(`✅ Found ${categoriesWithCount.length} categories`);

      res.status(200).json({
        success: true,
        data: {
          categories: categoriesWithCount
        }
      });

    } catch (error) {
      console.error('❌ Error getting categories:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // OBTENER TRATAMIENTOS POR CLÍNICA
  // ============================================================================
  static async getTreatmentsByClinic(req, res, next) {
    try {
      const { clinicId } = req.params;
      const { category, isVipExclusive } = req.query;

      console.log('🏥 Getting treatments for clinic:', clinicId);

      // Verificar que la clínica existe
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId }
      });

      if (!clinic) {
        return res.status(404).json({
          success: false,
          error: { message: 'Clínica no encontrada' }
        });
      }

      // Construir filtros
      const whereClause = { 
        clinicId,
        isActive: true
      };
      
      if (category) {
        whereClause.category = category;
      }
      
      if (isVipExclusive !== undefined) {
        whereClause.isVipExclusive = isVipExclusive === 'true';
      }

      const treatments = await prisma.treatment.findMany({
        where: whereClause,
        orderBy: [
          { isFeatured: 'desc' },
          { isVipExclusive: 'desc' },
          { category: 'asc' },
          { price: 'asc' }
        ]
      });

      console.log(`✅ Found ${treatments.length} treatments for clinic`);

      res.status(200).json({
        success: true,
        data: {
          clinic: {
            id: clinic.id,
            name: clinic.name,
            address: clinic.address,
            phone: clinic.phone,
            city: clinic.city
          },
          treatments: treatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description || treatment.shortDescription || '',
            price: treatment.price,
            duration: treatment.durationMinutes,
            durationMinutes: treatment.durationMinutes,
            category: treatment.category,
            iconName: treatment.iconName,
            emoji: TreatmentController.getEmojiFromCategory(treatment.category),
            isVipExclusive: treatment.isVipExclusive,
            vipPrice: treatment.vipPrice
          }))
        }
      });

    } catch (error) {
      console.error('❌ Error getting treatments by clinic:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // OBTENER DETALLES DE TRATAMIENTO
  // ============================================================================
  static async getTreatmentDetails(req, res, next) {
    try {
      const { id } = req.params;

      console.log('🔍 Getting treatment details:', id);

      const treatment = await prisma.treatment.findUnique({
        where: { id },
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              city: true
            }
          }
        }
      });

      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Tratamiento no encontrado' }
        });
      }

      console.log(`✅ Found treatment: ${treatment.name}`);

      res.status(200).json({
        success: true,
        data: {
          treatment: {
            id: treatment.id,
            name: treatment.name,
            description: treatment.description || treatment.shortDescription || '',
            price: treatment.price,
            duration: treatment.durationMinutes,
            durationMinutes: treatment.durationMinutes,
            category: treatment.category,
            iconName: treatment.iconName,
            emoji: TreatmentController.getEmojiFromCategory(treatment.category),
            isVipExclusive: treatment.isVipExclusive,
            vipPrice: treatment.vipPrice,
            aftercareInfo: treatment.aftercareInfo,
            clinic: {
              id: treatment.clinic.id,
              name: treatment.clinic.name,
              address: treatment.clinic.address,
              phone: treatment.clinic.phone,
              city: treatment.clinic.city
            }
          }
        }
      });

    } catch (error) {
      console.error('❌ Error getting treatment details:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // BUSCAR TRATAMIENTOS
  // ============================================================================
  static async searchTreatments(req, res, next) {
    try {
      const { q: query, clinicId, limit = 10 } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: { message: 'La búsqueda debe tener al menos 2 caracteres' }
        });
      }

      console.log('🔍 Searching treatments:', query);

      const whereClause = {
        isActive: true,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { shortDescription: { contains: query, mode: 'insensitive' } },
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
              address: true,
              city: true
            }
          }
        },
        orderBy: [
          { name: 'asc' }
        ],
        take: parseInt(limit)
      });

      console.log(`✅ Found ${treatments.length} treatments matching search`);

      res.status(200).json({
        success: true,
        data: {
          query,
          treatments: treatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description || treatment.shortDescription || '',
            price: treatment.price,
            duration: treatment.durationMinutes,
            durationMinutes: treatment.durationMinutes,
            category: treatment.category,
            iconName: treatment.iconName,
            emoji: TreatmentController.getEmojiFromCategory(treatment.category),
            isVipExclusive: treatment.isVipExclusive,
            vipPrice: treatment.vipPrice,
            clinic: treatment.clinic?.name || 'Clínica Principal'
          }))
        }
      });

    } catch (error) {
      console.error('❌ Error searching treatments:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor' }
      });
    }
  }

  // ============================================================================
  // HELPER: EMOJI POR CATEGORÍA
  // ============================================================================
  static getEmojiFromCategory(category) {
    const emojiMap = {
      'Facial': '✨',
      'Corporal': '🌿',
      'Masajes': '💆‍♀️',
      'Láser': '⚡',
      'Estética': '💅',
      'Relajación': '🧘‍♀️',
      'Premium': '👑',
      'Depilación': '✨',
      'Uñas': '💅',
      'Cejas': '👁️',
      'Pestañas': '👁️‍🗨️',
      'Maquillaje': '💄',
      'Spa': '🧘‍♀️',
      'Tratamientos': '💎',
      'Belleza': '✨'
    };
    return emojiMap[category] || '💆‍♀️';
  }
}

module.exports = TreatmentController;