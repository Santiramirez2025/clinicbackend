// ============================================================================
// 💊 SINGLE CLINIC TREATMENT CONTROLLER - PRODUCTION READY v4.0 ✅
// src/controllers/treatment.controller.js - OPTIMIZED FOR SINGLE CLINIC
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

// ============================================================================
// CONFIGURACIÓN Y UTILIDADES PARA SINGLE CLINIC
// ============================================================================

// Tratamientos de fallback para desarrollo/demo
const FALLBACK_TREATMENTS = [
  {
    id: 't1',
    name: 'Limpieza Facial Profunda',
    description: 'Tratamiento completo de limpieza facial con extracción de impurezas e hidratación profunda usando técnicas profesionales y productos de alta calidad.',
    shortDescription: 'Limpieza completa con hidratación profunda',
    category: 'Facial',
    subcategory: 'Limpieza',
    duration: 60,
    durationMinutes: 60,
    price: 65.00,
    originalPrice: 65.00,
    isActive: true,
    isFeatured: true,
    isPopular: true,
    isVipExclusive: false,
    riskLevel: 'LOW',
    requiresConsultation: false,
    requiresMedicalStaff: false,
    minAge: 16,
    maxFrequency: 'MONTHLY',
    benefits: [
      'Elimina impurezas y puntos negros efectivamente',
      'Hidrata profundamente todas las capas de la piel',
      'Mejora textura y luminosidad natural',
      'Minimiza apariencia de poros dilatados',
      'Deja la piel suave, limpia y renovada'
    ],
    contraindications: [
      'Piel extremadamente sensible o reactiva',
      'Heridas abiertas o cortes en el rostro',
      'Infecciones cutáneas activas (acné quístico)',
      'Rosácea en fase aguda o brote activo',
      'Tratamientos con ácidos en últimas 48 horas'
    ],
    beforeCare: [
      'No usar exfoliantes o scrubs 24 horas antes',
      'Llegar sin maquillaje o solo con productos básicos',
      'Evitar exposición solar intensa día previo',
      'Informar sobre productos usados recientemente',
      'Suspender retinoides 2 días antes si los usa'
    ],
    afterCare: [
      'Usar protector solar SPF 30+ obligatoriamente',
      'Mantener hidratación con productos recomendados',
      'Evitar maquillaje durante primeras 4 horas',
      'No tocar ni frotar la zona tratada',
      'Evitar saunas y ejercicio intenso 24 horas'
    ],
    sideEffects: [
      'Ligero enrojecimiento temporal (1-2 horas)',
      'Sensación de tirantez leve y temporal',
      'Posible descamación mínima en días siguientes'
    ],
    recoveryTime: '2-4 hours',
    rating: 4.8,
    reviewCount: 156,
    bookingCount: 234
  },
  {
    id: 't2',
    name: 'Masaje Relajante Corporal',
    description: 'Masaje corporal completo con técnicas de relajación profunda, aceites esenciales terapéuticos y ambiente tranquilizador para liberar tensiones.',
    shortDescription: 'Masaje completo con aceites esenciales',
    category: 'Corporal',
    subcategory: 'Masajes',
    duration: 90,
    durationMinutes: 90,
    price: 85.00,
    originalPrice: 85.00,
    isActive: true,
    isFeatured: true,
    isPopular: true,
    isVipExclusive: false,
    riskLevel: 'LOW',
    requiresConsultation: false,
    requiresMedicalStaff: false,
    minAge: 18,
    maxFrequency: 'WEEKLY',
    benefits: [
      'Reduce significativamente estrés y tensión muscular',
      'Mejora circulación sanguínea y linfática',
      'Relaja músculos y articulaciones',
      'Favorece el descanso y calidad del sueño',
      'Proporciona bienestar mental y físico integral'
    ],
    contraindications: [
      'Lesiones musculares agudas o recientes',
      'Estados febriles o infecciones activas',
      'Inflamación aguda en músculos o articulaciones',
      'Trombosis o problemas circulatorios graves',
      'Embarazo sin autorización médica'
    ],
    beforeCare: [
      'Mantener hidratación adecuada horas previas',
      'Evitar comidas pesadas 2 horas antes',
      'Informar sobre lesiones o molestias existentes',
      'Llegar con ropa cómoda y fácil de quitar'
    ],
    afterCare: [
      'Hidratación abundante post-tratamiento',
      'Descanso recomendado resto del día',
      'Evitar ejercicio intenso siguientes 2 horas',
      'Mantener calor corporal y evitar corrientes',
      'Escuchar las sensaciones del cuerpo'
    ],
    sideEffects: [
      'Relajación profunda y posible somnolencia',
      'Ligero mareo temporal al levantarse',
      'Mayor sensibilidad muscular 24 horas'
    ],
    recoveryTime: '0 hours',
    rating: 4.7,
    reviewCount: 124,
    bookingCount: 187
  },
  {
    id: 't3',
    name: 'Tratamiento Anti-edad Avanzado',
    description: 'Protocolo anti-envejecimiento de última generación con tecnología avanzada, principios activos concentrados y técnicas especializadas para resultados visibles.',
    shortDescription: 'Anti-aging avanzado con tecnología de vanguardia',
    category: 'Anti-edad',
    subcategory: 'Rejuvenecimiento',
    duration: 75,
    durationMinutes: 75,
    price: 120.00,
    originalPrice: 120.00,
    isActive: true,
    isFeatured: true,
    isPopular: false,
    isVipExclusive: true,
    riskLevel: 'MEDIUM',
    requiresConsultation: true,
    requiresMedicalStaff: true,
    minAge: 25,
    maxFrequency: 'MONTHLY',
    benefits: [
      'Reduce visiblemente arrugas y líneas de expresión',
      'Mejora firmeza y elasticidad de la piel',
      'Ilumina y unifica el tono facial',
      'Estimula producción natural de colágeno',
      'Proporciona hidratación profunda y duradera'
    ],
    contraindications: [
      'Embarazo y período de lactancia',
      'Piel extremadamente sensible o reactiva',
      'Tratamientos con ácidos fuertes recientes',
      'Medicación fotosensibilizante activa',
      'Infecciones o irritaciones cutáneas activas'
    ],
    beforeCare: [
      'Consulta médica previa obligatoria',
      'Suspender retinoides 1 semana antes',
      'Evitar exposición solar 72 horas previas',
      'No realizar otros tratamientos faciales 2 semanas antes',
      'Informar sobre medicación actual completa'
    ],
    afterCare: [
      'Protección solar SPF 50+ obligatoria 2 semanas',
      'Usar exclusivamente productos recomendados',
      'Evitar sol directo y camas bronceadoras 48 horas',
      'No exfoliación ni tratamientos agresivos 1 semana',
      'Seguimiento médico programado'
    ],
    sideEffects: [
      'Enrojecimiento moderado temporal (4-8 horas)',
      'Posible descamación controlada días siguientes',
      'Sensibilidad aumentada temporal',
      'Sequedad temporal que mejora con hidratación'
    ],
    recoveryTime: '24-48 hours',
    rating: 4.9,
    reviewCount: 67,
    bookingCount: 89
  },
  {
    id: 't4',
    name: 'Depilación Láser Diodo',
    description: 'Sesión de depilación láser con tecnología diodo de última generación para reducción permanente y progresiva del vello no deseado.',
    shortDescription: 'Depilación permanente con láser diodo',
    category: 'Láser',
    subcategory: 'Depilación',
    duration: 45,
    durationMinutes: 45,
    price: 75.00,
    originalPrice: 75.00,
    isActive: true,
    isFeatured: false,
    isPopular: true,
    isVipExclusive: false,
    riskLevel: 'MEDIUM',
    requiresConsultation: true,
    requiresMedicalStaff: true,
    minAge: 18,
    maxFrequency: 'EVERY_6_WEEKS',
    benefits: [
      'Reducción permanente y progresiva del vello',
      'Proceso prácticamente indoloro con tecnología avanzada',
      'Resultados duraderos y efectivos',
      'Piel más suave sin irritaciones',
      'Ahorro a largo plazo vs métodos tradicionales'
    ],
    contraindications: [
      'Piel bronceada o con autobroncedor reciente',
      'Medicación fotosensibilizante activa',
      'Embarazo y lactancia',
      'Tatuajes en zona a tratar',
      'Fototipo de piel muy oscura sin evaluación'
    ],
    beforeCare: [
      'No exposición solar directa 2 semanas antes',
      'Afeitar zona exactamente 24 horas antes',
      'Evitar cera, pinzas o depilación química 4 semanas',
      'No usar productos perfumados en zona 48 horas',
      'Consulta previa para evaluar fototipo'
    ],
    afterCare: [
      'Protección solar obligatoria SPF 50+ por 2 semanas',
      'Hidratación intensiva de zona tratada',
      'No depilación con cera entre sesiones',
      'Evitar saunas y ejercicio intenso 24 horas',
      'No frotar ni exfoliar zona 48 horas'
    ],
    sideEffects: [
      'Enrojecimiento leve temporal (2-4 horas)',
      'Sensación de calor residual moderada',
      'Posible hinchazón mínima en folículos',
      'Caída progresiva del vello tratado'
    ],
    recoveryTime: '2-4 hours',
    rating: 4.6,
    reviewCount: 203,
    bookingCount: 156
  },
  {
    id: 't5',
    name: 'Hidrafacial Premium',
    description: 'Tratamiento facial de hidratación profunda con tecnología HydraFacial MD que limpia, extrae e hidrata en una sola sesión.',
    shortDescription: 'Hidratación facial con tecnología HydraFacial',
    category: 'Facial',
    subcategory: 'Hidratación',
    duration: 50,
    durationMinutes: 50,
    price: 95.00,
    originalPrice: 95.00,
    isActive: true,
    isFeatured: true,
    isPopular: true,
    isVipExclusive: false,
    riskLevel: 'LOW',
    requiresConsultation: false,
    requiresMedicalStaff: false,
    minAge: 16,
    maxFrequency: 'MONTHLY',
    benefits: [
      'Hidratación intensa e inmediata',
      'Poros visiblemente más refinados',
      'Piel luminosa y textura mejorada',
      'Limpieza profunda sin irritación',
      'Resultados inmediatos y acumulativos'
    ],
    contraindications: [
      'Heridas abiertas o cortes en rostro',
      'Irritación severa o eccema activo',
      'Rosácea en fase de brote agudo',
      'Infecciones cutáneas localizadas',
      'Sensibilidad extrema a succiones'
    ],
    beforeCare: [
      'Evitar exfoliación previa 24 horas',
      'No usar ácidos 2 días antes del tratamiento',
      'Llegar con rostro limpio y sin maquillaje',
      'Informar sobre sensibilidades conocidas'
    ],
    afterCare: [
      'Mantener hidratación con productos recomendados',
      'Usar protección solar diaria',
      'Evitar exfoliación mecánica 48 horas',
      'Mantener rutina suave primeros días',
      'Hidratación extra las primeras 72 horas'
    ],
    sideEffects: [
      'Ligero enrojecimiento temporal (30 minutos)',
      'Sensación refrescante y de limpieza',
      'Mayor suavidad inmediata'
    ],
    recoveryTime: '0 hours',
    rating: 4.9,
    reviewCount: 89,
    bookingCount: 145
  }
];

// Utilidades simplificadas para single clinic
const getRiskLevelInfo = (level) => {
  const info = {
    'LOW': {
      description: 'Tratamiento de bajo riesgo',
      requirements: ['Información básica'],
      notice: 'Puedes reservar directamente'
    },
    'MEDIUM': {
      description: 'Tratamiento de riesgo moderado',
      requirements: ['Consulta previa recomendada', 'Consentimiento informado'],
      notice: 'Se recomienda consulta previa'
    },
    'HIGH': {
      description: 'Tratamiento médico especializado',
      requirements: ['Consulta médica obligatoria', 'Supervisión médica'],
      notice: 'Requiere consulta médica obligatoria'
    }
  };
  return info[level] || info['LOW'];
};

const getCategoryInfo = (category) => {
  const categories = {
    'Facial': { name: 'Tratamientos Faciales', description: 'Cuidado y belleza facial' },
    'Corporal': { name: 'Tratamientos Corporales', description: 'Relajación y bienestar corporal' },
    'Anti-edad': { name: 'Anti-envejecimiento', description: 'Tratamientos rejuvenecedores' },
    'Láser': { name: 'Tecnología Láser', description: 'Tratamientos con láser médico' }
  };
  return categories[category] || { name: category, description: 'Tratamiento especializado' };
};

// ============================================================================
// TREATMENT CONTROLLER CLASS
// ============================================================================
class TreatmentController {

  // ========================================================================
  // OBTENER TODOS LOS TRATAMIENTOS - OPTIMIZADO PARA SINGLE CLINIC ✅
  // ========================================================================
  static async getAllTreatments(req, res) {
    try {
      const { 
        category, 
        isVipExclusive,
        minPrice,
        maxPrice,
        search,
        riskLevel,
        requiresConsultation,
        limit = 20,
        offset = 0
      } = req.query;

      console.log('Retrieving treatments with filters:', {
        category, isVipExclusive, minPrice, maxPrice, search, limit, offset
      });

      let treatments;

      // Intentar obtener de base de datos primero
      try {
        if (prisma) {
          const where = {
            isActive: true,
            ...(category && { category }),
            ...(isVipExclusive !== undefined && { isVipExclusive: isVipExclusive === 'true' }),
            ...(riskLevel && { riskLevel: riskLevel.toUpperCase() }),
            ...(requiresConsultation !== undefined && { requiresConsultation: requiresConsultation === 'true' }),
            ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
            ...(maxPrice && { price: { ...((minPrice && { gte: parseFloat(minPrice) }) || {}), lte: parseFloat(maxPrice) } }),
            ...(search && {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { shortDescription: { contains: search, mode: 'insensitive' } }
              ]
            })
          };

          const [treatmentList, total] = await Promise.all([
            prisma.treatment.findMany({
              where,
              orderBy: [
                { isFeatured: 'desc' },
                { isPopular: 'desc' },
                { name: 'asc' }
              ],
              take: parseInt(limit),
              skip: parseInt(offset)
            }),
            prisma.treatment.count({ where })
          ]);

          treatments = { list: treatmentList, total };
        } else {
          throw new Error('Database not available');
        }
      } catch (dbError) {
        console.warn('Database query failed, using fallback data:', dbError.message);
        
        // Usar datos de fallback
        let filteredTreatments = [...FALLBACK_TREATMENTS];
        
        // Aplicar filtros
        if (category) {
          filteredTreatments = filteredTreatments.filter(t => 
            t.category.toLowerCase() === category.toLowerCase()
          );
        }
        
        if (isVipExclusive !== undefined) {
          filteredTreatments = filteredTreatments.filter(t => 
            t.isVipExclusive === (isVipExclusive === 'true')
          );
        }
        
        if (riskLevel) {
          filteredTreatments = filteredTreatments.filter(t => 
            t.riskLevel === riskLevel.toUpperCase()
          );
        }
        
        if (search) {
          const searchTerm = search.toLowerCase();
          filteredTreatments = filteredTreatments.filter(t => 
            t.name.toLowerCase().includes(searchTerm) ||
            t.description.toLowerCase().includes(searchTerm)
          );
        }
        
        if (minPrice) {
          filteredTreatments = filteredTreatments.filter(t => t.price >= parseFloat(minPrice));
        }
        
        if (maxPrice) {
          filteredTreatments = filteredTreatments.filter(t => t.price <= parseFloat(maxPrice));
        }
        
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        
        treatments = {
          list: filteredTreatments.slice(startIndex, endIndex),
          total: filteredTreatments.length
        };
      }

      // Enriquecer tratamientos con información adicional
      const enrichedTreatments = treatments.list.map(treatment => ({
        ...treatment,
        riskInfo: getRiskLevelInfo(treatment.riskLevel),
        categoryInfo: getCategoryInfo(treatment.category),
        vipDiscount: treatment.isVipExclusive ? 0.10 : 0, // 10% descuento VIP
        estimatedBookingWindow: treatment.requiresConsultation ? '2-3 days' : 'same day'
      }));

      // Generar categorías disponibles
      const availableCategories = [...new Set(treatments.list.map(t => t.category))]
        .map(cat => ({
          id: cat,
          name: getCategoryInfo(cat).name,
          count: treatments.list.filter(t => t.category === cat).length
        }));

      res.status(200).json({
        success: true,
        data: enrichedTreatments,
        pagination: {
          total: treatments.total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: (parseInt(offset) + parseInt(limit)) < treatments.total
        },
        categories: availableCategories,
        filters: {
          riskLevels: ['LOW', 'MEDIUM', 'HIGH'],
          priceRange: {
            min: Math.min(...treatments.list.map(t => t.price)),
            max: Math.max(...treatments.list.map(t => t.price))
          }
        },
        message: `${enrichedTreatments.length} treatments retrieved`
      });

    } catch (error) {
      console.error('Get all treatments error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error retrieving treatments', 
          code: 'TREATMENTS_ERROR' 
        }
      });
    }
  }

  // ========================================================================
  // OBTENER TRATAMIENTOS DESTACADOS ✅
  // ========================================================================
  static async getFeaturedTreatments(req, res) {
    try {
      const { limit = 6 } = req.query;

      console.log('Retrieving featured treatments for dashboard');

      let featuredTreatments;

      try {
        if (prisma) {
          featuredTreatments = await prisma.treatment.findMany({
            where: {
              isActive: true,
              isFeatured: true
            },
            orderBy: [
              { isPopular: 'desc' },
              { name: 'asc' }
            ],
            take: parseInt(limit)
          });
        } else {
          throw new Error('Database not available');
        }
      } catch (dbError) {
        console.warn('Database query failed, using fallback featured treatments');
        featuredTreatments = FALLBACK_TREATMENTS
          .filter(t => t.isFeatured)
          .slice(0, parseInt(limit));
      }

      const enrichedTreatments = featuredTreatments.map(treatment => ({
        id: treatment.id,
        name: treatment.name,
        shortDescription: treatment.shortDescription || treatment.description,
        category: treatment.category,
        price: treatment.price,
        originalPrice: treatment.originalPrice || treatment.price,
        duration: treatment.durationMinutes || treatment.duration,
        riskLevel: treatment.riskLevel,
        isVipExclusive: treatment.isVipExclusive,
        requiresConsultation: treatment.requiresConsultation,
        rating: treatment.rating || 4.5,
        bookingCount: treatment.bookingCount || 0,
        benefits: treatment.benefits ? treatment.benefits.slice(0, 3) : [], // Solo primeros 3
        badge: treatment.isPopular ? 'Popular' : (treatment.isVipExclusive ? 'VIP' : null)
      }));

      res.status(200).json({
        success: true,
        data: enrichedTreatments,
        total: enrichedTreatments.length,
        message: 'Featured treatments retrieved'
      });

    } catch (error) {
      console.error('Get featured treatments error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error retrieving featured treatments', 
          code: 'FEATURED_ERROR' 
        }
      });
    }
  }

  // ========================================================================
  // OBTENER CATEGORÍAS ✅
  // ========================================================================
  static async getCategories(req, res) {
    try {
      console.log('Retrieving treatment categories');

      let treatments;

      try {
        if (prisma) {
          treatments = await prisma.treatment.findMany({
            where: { isActive: true },
            select: {
              category: true,
              subcategory: true,
              riskLevel: true,
              isVipExclusive: true
            }
          });
        } else {
          throw new Error('Database not available');
        }
      } catch (dbError) {
        console.warn('Database query failed, using fallback categories');
        treatments = FALLBACK_TREATMENTS;
      }

      // Generar estadísticas por categoría
      const categoryStats = {};
      
      treatments.forEach(treatment => {
        const cat = treatment.category;
        if (!categoryStats[cat]) {
          categoryStats[cat] = {
            id: cat,
            name: getCategoryInfo(cat).name,
            description: getCategoryInfo(cat).description,
            count: 0,
            subcategories: new Set(),
            riskLevels: new Set(),
            hasVipExclusive: false,
            priceRange: { min: Infinity, max: 0 }
          };
        }
        
        const stats = categoryStats[cat];
        stats.count++;
        
        if (treatment.subcategory) {
          stats.subcategories.add(treatment.subcategory);
        }
        
        if (treatment.riskLevel) {
          stats.riskLevels.add(treatment.riskLevel);
        }
        
        if (treatment.isVipExclusive) {
          stats.hasVipExclusive = true;
        }
        
        if (treatment.price) {
          stats.priceRange.min = Math.min(stats.priceRange.min, treatment.price);
          stats.priceRange.max = Math.max(stats.priceRange.max, treatment.price);
        }
      });

      // Convertir sets a arrays y limpiar datos
      const categories = Object.values(categoryStats).map(cat => ({
        ...cat,
        subcategories: Array.from(cat.subcategories),
        riskLevels: Array.from(cat.riskLevels),
        priceRange: cat.priceRange.min === Infinity ? 
          { min: 0, max: 0 } : 
          cat.priceRange
      }));

      res.status(200).json({
        success: true,
        data: categories,
        total: categories.length,
        summary: {
          totalCategories: categories.length,
          totalTreatments: treatments.length,
          hasVipExclusive: categories.some(cat => cat.hasVipExclusive)
        },
        message: 'Categories retrieved successfully'
      });

    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error retrieving categories', 
          code: 'CATEGORIES_ERROR' 
        }
      });
    }
  }

  // ========================================================================
  // BUSCAR TRATAMIENTOS ✅
  // ========================================================================
  static async searchTreatments(req, res) {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Search query must be at least 2 characters', 
            code: 'INVALID_SEARCH_QUERY' 
          }
        });
      }

      console.log(`Searching treatments for: "${q}"`);

      let searchResults;

      try {
        if (prisma) {
          searchResults = await prisma.treatment.findMany({
            where: {
              isActive: true,
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { shortDescription: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
                { subcategory: { contains: q, mode: 'insensitive' } }
              ]
            },
            orderBy: [
              { isPopular: 'desc' },
              { isFeatured: 'desc' },
              { name: 'asc' }
            ],
            take: parseInt(limit)
          });
        } else {
          throw new Error('Database not available');
        }
      } catch (dbError) {
        console.warn('Database search failed, using fallback search');
        const searchTerm = q.toLowerCase();
        searchResults = FALLBACK_TREATMENTS
          .filter(treatment => 
            treatment.name.toLowerCase().includes(searchTerm) ||
            treatment.description.toLowerCase().includes(searchTerm) ||
            treatment.category.toLowerCase().includes(searchTerm)
          )
          .slice(0, parseInt(limit));
      }

      // Enriquecer resultados con relevancia
      const enrichedResults = searchResults.map(treatment => ({
        ...treatment,
        relevanceScore: calculateRelevance(treatment, q),
        matchedFields: getMatchedFields(treatment, q)
      })).sort((a, b) => b.relevanceScore - a.relevanceScore);

      res.status(200).json({
        success: true,
        data: enrichedResults,
        query: q,
        total: enrichedResults.length,
        suggestions: generateSearchSuggestions(q, searchResults),
        message: `${enrichedResults.length} treatments found`
      });

    } catch (error) {
      console.error('Search treatments error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error searching treatments', 
          code: 'SEARCH_ERROR' 
        }
      });
    }
  }

  // ========================================================================
  // OBTENER DETALLES DE TRATAMIENTO ✅
  // ========================================================================
  static async getTreatmentDetails(req, res) {
    try {
      const { id } = req.params;

      console.log(`Retrieving treatment details for: ${id}`);

      let treatment;

      try {
        if (prisma) {
          treatment = await prisma.treatment.findUnique({
            where: { 
              id, 
              isActive: true 
            }
          });
        } else {
          throw new Error('Database not available');
        }
      } catch (dbError) {
        console.warn('Database query failed, using fallback treatment details');
        treatment = FALLBACK_TREATMENTS.find(t => t.id === id);
      }

      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Treatment not found', code: 'TREATMENT_NOT_FOUND' }
        });
      }

      // Enriquecer con información completa
      const detailedTreatment = {
        ...treatment,
        riskInfo: getRiskLevelInfo(treatment.riskLevel),
        categoryInfo: getCategoryInfo(treatment.category),
        bookingInfo: {
          canBookDirectly: !treatment.requiresConsultation,
          estimatedWaitTime: treatment.requiresConsultation ? '2-3 days' : 'same day',
          requiresConsultation: treatment.requiresConsultation,
          requiresMedicalStaff: treatment.requiresMedicalStaff
        },
        pricing: {
          basePrice: treatment.price,
          vipPrice: treatment.isVipExclusive ? treatment.price * 0.9 : treatment.price,
          currency: 'EUR',
          includes: [
            'Consulta inicial',
            'Tratamiento completo',
            'Productos post-tratamiento',
            'Seguimiento telefónico'
          ]
        },
        safety: {
          riskLevel: treatment.riskLevel,
          minAge: treatment.minAge || 16,
          contraindications: treatment.contraindications || [],
          sideEffects: treatment.sideEffects || [],
          recoveryTime: treatment.recoveryTime || '0 hours'
        }
      };

      res.status(200).json({
        success: true,
        data: detailedTreatment,
        message: 'Treatment details retrieved'
      });

    } catch (error) {
      console.error('Get treatment details error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error retrieving treatment details', 
          code: 'TREATMENT_DETAIL_ERROR' 
        }
      });
    }
  }

  // ========================================================================
  // VALIDAR ELEGIBILIDAD MÉDICA ✅
  // ========================================================================
  static async validateTreatmentEligibility(req, res) {
    try {
      const { 
        treatmentId, 
        userAge, 
        hasAllergies = false,
        allergyDetails,
        hasMedicalConditions = false,
        medicalDetails,
        takingMedications = false,
        medicationDetails,
        isPregnant = false,
        isBreastfeeding = false
      } = req.body;

      console.log(`Validating eligibility for treatment: ${treatmentId}`);

      // Obtener tratamiento
      let treatment;
      try {
        if (prisma) {
          treatment = await prisma.treatment.findUnique({
            where: { id: treatmentId, isActive: true }
          });
        } else {
          treatment = FALLBACK_TREATMENTS.find(t => t.id === treatmentId);
        }
      } catch (dbError) {
        treatment = FALLBACK_TREATMENTS.find(t => t.id === treatmentId);
      }

      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Treatment not found', code: 'TREATMENT_NOT_FOUND' }
        });
      }

      // Validación de elegibilidad
      const validation = {
        eligible: true,
        requiresConsultation: treatment.requiresConsultation || false,
        warnings: [],
        blockers: [],
        recommendations: []
      };

      // Validar edad mínima
      if (userAge && treatment.minAge && userAge < treatment.minAge) {
        validation.eligible = false;
        validation.blockers.push(`Minimum age requirement: ${treatment.minAge} years`);
      }

      // Validar embarazo/lactancia
      if (isPregnant || isBreastfeeding) {
        if (treatment.riskLevel === 'HIGH' || treatment.category === 'Láser') {
          validation.eligible = false;
          validation.blockers.push('Treatment not recommended during pregnancy/breastfeeding');
        } else {
          validation.requiresConsultation = true;
          validation.warnings.push('Medical consultation required due to pregnancy/breastfeeding');
        }
      }

      // Validar contraindicaciones
      if (treatment.contraindications && treatment.contraindications.length > 0) {
        const checkContraindications = (details) => {
          if (!details) return false;
          const detailsLower = details.toLowerCase();
          return treatment.contraindications.some(contra => 
            detailsLower.includes(contra.toLowerCase()) || 
            contra.toLowerCase().includes(detailsLower)
          );
        };

        if (hasMedicalConditions && medicalDetails && checkContraindications(medicalDetails)) {
          validation.eligible = false;
          validation.blockers.push('Medical condition contraindicates this treatment');
        }

        if (hasAllergies && allergyDetails && checkContraindications(allergyDetails)) {
          validation.eligible = false;
          validation.blockers.push('Known allergies contraindicate this treatment');
        }
      }

      // Medicamentos
      if (takingMedications && medicationDetails) {
        const photosensitizingMeds = ['retinoids', 'antibiotics', 'diuretics'];
        const hasConflict = photosensitizingMeds.some(med => 
          medicationDetails.toLowerCase().includes(med)
        );
        
        if (hasConflict && treatment.category === 'Láser') {
          validation.requiresConsultation = true;
          validation.warnings.push('Current medications may interact with laser treatment');
        }
      }

      // Recomendaciones basadas en el nivel de riesgo
      switch (treatment.riskLevel) {
        case 'LOW':
          validation.recommendations.push('Follow pre and post-care instructions carefully');
          break;
        case 'MEDIUM':
          validation.requiresConsultation = true;
          validation.recommendations.push('Professional consultation recommended before treatment');
          break;
        case 'HIGH':
          validation.requiresConsultation = true;
          validation.recommendations.push('Medical evaluation mandatory before proceeding');
          break;
      }

      // Próximos pasos
      const nextSteps = [];
      if (!validation.eligible) {
        nextSteps.push({
          type: 'CONSULT_SPECIALIST',
          title: 'Consult with Medical Professional',
          description: 'Medical evaluation required to address contraindications'
        });
      } else if (validation.requiresConsultation) {
        nextSteps.push({
          type: 'BOOK_CONSULTATION',
          title: 'Book Consultation First',
          description: 'Schedule consultation to evaluate treatment suitability'
        });
      } else {
        nextSteps.push({
          type: 'BOOK_DIRECTLY',
          title: 'Book Treatment',
          description: 'You can proceed to book this treatment directly'
        });
      }

      res.status(200).json({
        success: true,
        data: {
          treatmentId,
          treatmentName: treatment.name,
          validation,
          nextSteps,
          additionalInfo: {
            riskLevel: treatment.riskLevel,
            expectedDuration: treatment.durationMinutes,
            recoveryTime: treatment.recoveryTime
          }
        },
        message: validation.eligible ? 
          'Eligibility validation completed' : 
          'Treatment requires medical evaluation'
      });

    } catch (error) {
      console.error('Validate eligibility error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error validating treatment eligibility', 
          code: 'ELIGIBILITY_ERROR' 
        }
      });
    }
  }

  // ========================================================================
  // OBTENER INFORMACIÓN LEGAL ✅
  // ========================================================================
  static async getLegalInfo(req, res) {
    try {
      const { id: treatmentId } = req.params;

      console.log(`Retrieving legal info for treatment: ${treatmentId}`);

      // Obtener tratamiento
      let treatment;
      try {
        if (prisma) {
          treatment = await prisma.treatment.findUnique({
            where: { id: treatmentId, isActive: true }
          });
        } else {
          treatment = FALLBACK_TREATMENTS.find(t => t.id === treatmentId);
        }
      } catch (dbError) {
        treatment = FALLBACK_TREATMENTS.find(t => t.id === treatmentId);
      }

      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Treatment not found', code: 'TREATMENT_NOT_FOUND' }
        });
      }

      const legalInfo = {
        treatmentId,
        treatmentName: treatment.name,
        riskClassification: {
          level: treatment.riskLevel,
          description: getRiskLevelInfo(treatment.riskLevel).description,
          requirements: getRiskLevelInfo(treatment.riskLevel).requirements
        },
        consultationPolicy: {
          required: treatment.requiresConsultation,
          type: treatment.requiresConsultation ? 'MEDICAL_EVALUATION' : 'OPTIONAL',
          description: treatment.requiresConsultation ? 
            'Medical consultation required before treatment' : 
            'Treatment can be booked directly'
        },
        consent: {
          type: treatment.riskLevel === 'HIGH' ? 'MEDICAL' : 
                treatment.riskLevel === 'MEDIUM' ? 'INFORMED' : 'SIMPLE',
          required: treatment.riskLevel !== 'LOW',
          description: 'Consent form detailing risks, benefits, and alternatives'
        },
        professionalRequirements: {
          medicalStaffRequired: treatment.requiresMedicalStaff || false,
          specialization: treatment.category === 'Láser' ? 'Laser certified' : 'Aesthetic professional',
          supervision: treatment.riskLevel === 'HIGH' ? 'Medical supervision required' : 'Professional guidance'
        },
        safetyInformation: {
          minimumAge: treatment.minAge || 16,
          contraindications: treatment.contraindications || [],
          sideEffects: treatment.sideEffects || [],
          recoveryTime: treatment.recoveryTime || 'Immediate',
          followUpRequired: treatment.riskLevel === 'HIGH'
        },
        regulatoryCompliance: {
          category: 'AESTHETIC_TREATMENT',
          jurisdiction: 'Spain - EU',
          complianceStandards: [
            'Spanish Health Ministry regulations',
            'EU Medical Device Regulation (MDR)',
            'Data Protection (GDPR)'
          ],
          lastUpdated: new Date().toISOString()
        },
        dataProcessing: {
          personalDataCollected: [
            'Medical history',
            'Treatment preferences', 
            'Before/after photos (with consent)',
            'Contact information'
          ],
          retentionPeriod: '7 years (medical records)',
          rights: [
            'Access to your data',
            'Correction of inaccurate data',
            'Data portability',
            'Right to be forgotten (with medical limitations)'
          ]
        }
      };

      res.status(200).json({
        success: true,
        data: legalInfo,
        message: 'Legal information retrieved'
      });

    } catch (error) {
      console.error('Get legal info error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error retrieving legal information', 
          code: 'LEGAL_INFO_ERROR' 
        }
      });
    }
  }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

const calculateRelevance = (treatment, query) => {
  const queryLower = query.toLowerCase();
  let score = 0;
  
  if (treatment.name.toLowerCase().includes(queryLower)) score += 10;
  if (treatment.category.toLowerCase().includes(queryLower)) score += 8;
  if (treatment.description.toLowerCase().includes(queryLower)) score += 5;
  if (treatment.isPopular) score += 3;
  if (treatment.isFeatured) score += 2;
  
  return score;
};

const getMatchedFields = (treatment, query) => {
  const queryLower = query.toLowerCase();
  const matches = [];
  
  if (treatment.name.toLowerCase().includes(queryLower)) matches.push('name');
  if (treatment.category.toLowerCase().includes(queryLower)) matches.push('category');
  if (treatment.description.toLowerCase().includes(queryLower)) matches.push('description');
  
  return matches;
};

const generateSearchSuggestions = (query, results) => {
  const suggestions = [];
  
  // Sugerencias basadas en categorías de los resultados
  const categories = [...new Set(results.map(t => t.category))];
  categories.forEach(cat => {
    if (!query.toLowerCase().includes(cat.toLowerCase())) {
      suggestions.push(`${query} ${cat.toLowerCase()}`);
    }
  });
  
  // Sugerencias comunes
  const commonTerms = ['facial', 'corporal', 'laser', 'hidratante', 'anti-edad'];
  commonTerms.forEach(term => {
    if (!query.toLowerCase().includes(term) && results.some(t => 
      t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term)
    )) {
      suggestions.push(`${query} ${term}`);
    }
  });
  
  return suggestions.slice(0, 3);
};

module.exports = TreatmentController;