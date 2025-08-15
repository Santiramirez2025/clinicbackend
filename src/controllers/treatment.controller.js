// ============================================================================
// src/controllers/treatment.controller.js - CONTROLADOR DE TRATAMIENTOS CON COMPLIANCE LEGAL ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// DATOS PREDEFINIDOS - TRATAMIENTOS CON CLASIFICACIÓN LEGAL
// ============================================================================
const FALLBACK_TREATMENTS = [
  // 🟢 GRUPO A - RIESGO BAJO (Sin consulta previa obligatoria)
  {
    id: 'facial-basic-1',
    name: 'Limpieza Facial Profunda',
    shortDescription: 'Limpieza profunda con extracción de comedones',
    description: 'Tratamiento completo de limpieza facial que incluye análisis de piel, limpieza profunda, extracción de comedones, mascarilla purificante e hidratación. Ideal para pieles mixtas y grasas.',
    category: 'facial',
    subcategory: 'limpieza',
    durationMinutes: 60,
    price: 65,
    vipPrice: 55,
    riskLevel: 'LOW',
    requiresConsultation: false,
    requiresMedicalStaff: false,
    consentType: 'SIMPLE',
    appointmentType: 'DIRECT',
    minimumAge: 16,
    contraindications: ['Heridas abiertas en la cara', 'Dermatitis activa', 'Uso reciente de isotretinoína'],
    sideEffects: ['Enrojecimiento temporal', 'Sensibilidad leve'],
    recoveryTime: '0-24h',
    iconName: 'sparkles',
    color: '#E8F5E8',
    isPopular: true,
    isFeatured: false,
    isActive: true,
    beautyPointsEarned: 15,
    legalNotice: 'Tratamiento de bajo riesgo que no requiere consulta previa.'
  },
  {
    id: 'facial-basic-2',
    name: 'Hidratación Facial Premium',
    shortDescription: 'Tratamiento hidratante con ácido hialurónico',
    description: 'Sesión intensiva de hidratación con sérums de ácido hialurónico de diferentes pesos moleculares, mascarilla hidratante y masaje facial relajante.',
    category: 'facial',
    subcategory: 'hidratacion',
    durationMinutes: 45,
    price: 75,
    vipPrice: 65,
    riskLevel: 'LOW',
    requiresConsultation: false,
    requiresMedicalStaff: false,
    consentType: 'SIMPLE',
    appointmentType: 'DIRECT',
    minimumAge: 18,
    contraindications: ['Alergias conocidas a ácido hialurónico'],
    sideEffects: ['Posible sensibilidad temporal'],
    recoveryTime: '0h',
    iconName: 'water',
    color: '#E3F2FD',
    isFeatured: true,
    isPopular: false,
    isActive: true,
    beautyPointsEarned: 20,
    legalNotice: 'Tratamiento seguro de hidratación sin contraindicaciones importantes.'
  },
  {
    id: 'corporal-basic-1',
    name: 'Masaje Relajante Completo',
    shortDescription: 'Masaje corporal completo de relajación',
    description: 'Sesión de masaje corporal completo con aceites esenciales para relajación muscular, reducción del estrés y mejora de la circulación.',
    category: 'corporal',
    subcategory: 'masajes',
    durationMinutes: 90,
    price: 85,
    vipPrice: 75,
    riskLevel: 'LOW',
    requiresConsultation: false,
    requiresMedicalStaff: false,
    consentType: 'SIMPLE',
    appointmentType: 'DIRECT',
    minimumAge: 16,
    contraindications: ['Embarazo primer trimestre', 'Lesiones musculares recientes', 'Fiebre'],
    sideEffects: ['Relajación muscular', 'Somnolencia temporal'],
    recoveryTime: '0h',
    iconName: 'hand-heart',
    color: '#FFF3E0',
    isPopular: true,
    isFeatured: false,
    isActive: true,
    beautyPointsEarned: 25,
    legalNotice: 'Tratamiento de bienestar sin riesgos médicos.'
  },
  {
    id: 'corporal-basic-2',
    name: 'Exfoliación Corporal Suave',
    shortDescription: 'Peeling corporal suave con hidratación',
    description: 'Exfoliación suave de todo el cuerpo con productos naturales, seguida de hidratación intensiva con cremas nutritivas.',
    category: 'corporal',
    subcategory: 'exfoliacion',
    durationMinutes: 75,
    price: 70,
    vipPrice: 60,
    riskLevel: 'LOW',
    requiresConsultation: false,
    requiresMedicalStaff: false,
    consentType: 'SIMPLE',
    appointmentType: 'DIRECT',
    minimumAge: 16,
    contraindications: ['Piel irritada o con heridas', 'Dermatitis activa', 'Quemaduras solares recientes'],
    sideEffects: ['Enrojecimiento temporal leve'],
    recoveryTime: '0-12h',
    iconName: 'refresh',
    color: '#F3E5F5',
    isPopular: false,
    isFeatured: false,
    isActive: true,
    beautyPointsEarned: 20,
    legalNotice: 'Exfoliación suave apta para todos los tipos de piel.'
  },

  // 🟡 GRUPO B - RIESGO MEDIO (Consulta recomendada)
  {
    id: 'facial-medium-1',
    name: 'Peeling Químico Suave',
    shortDescription: 'Peeling con ácidos suaves para renovación celular',
    description: 'Peeling químico superficial con ácidos glicólico y láctico para renovación celular, mejora de textura y reducción de manchas leves.',
    category: 'facial',
    subcategory: 'peeling',
    durationMinutes: 75,
    price: 120,
    vipPrice: 100,
    riskLevel: 'MEDIUM',
    requiresConsultation: true,
    requiresMedicalStaff: false,
    consentType: 'INFORMED',
    appointmentType: 'CONSULTATION_TREATMENT',
    consultationDuration: 15,
    minimumAge: 18,
    contraindications: ['Embarazo', 'Lactancia', 'Uso de retinoides', 'Piel sensible extrema', 'Exposición solar reciente'],
    sideEffects: ['Enrojecimiento', 'Descamación leve', 'Sensibilidad temporal', 'Posible hiperpigmentación'],
    recoveryTime: '3-7 días',
    followUpRequired: true,
    iconName: 'sparkles-outline',
    color: '#FFF9C4',
    isPopular: false,
    isFeatured: true,
    isActive: true,
    beautyPointsEarned: 35,
    consentFormRequired: true,
    legalNotice: 'Requiere consulta previa para evaluar tipo de piel y posibles contraindicaciones.'
  },
  {
    id: 'facial-medium-2',
    name: 'Radiofrecuencia Facial',
    shortDescription: 'Tratamiento de radiofrecuencia para firmeza',
    description: 'Sesión de radiofrecuencia facial para estimular la producción de colágeno, mejorar la firmeza de la piel y reducir líneas de expresión.',
    category: 'facial',
    subcategory: 'radiofrecuencia',
    durationMinutes: 60,
    price: 150,
    vipPrice: 130,
    riskLevel: 'MEDIUM',
    requiresConsultation: true,
    requiresMedicalStaff: false,
    consentType: 'INFORMED',
    appointmentType: 'CONSULTATION_TREATMENT',
    consultationDuration: 20,
    minimumAge: 25,
    contraindications: ['Marcapasos', 'Embarazo', 'Implantes metálicos faciales', 'Cáncer de piel', 'Diabetes descompensada'],
    sideEffects: ['Enrojecimiento temporal', 'Sensación de calor', 'Hinchazón leve'],
    recoveryTime: '0-24h',
    iconName: 'radio',
    color: '#E1F5FE',
    isPopular: true,
    isFeatured: false,
    isActive: true,
    beautyPointsEarned: 40,
    consentFormRequired: true,
    legalNotice: 'Tratamiento con tecnología médica que requiere evaluación previa.'
  },

  // 🔴 GRUPO B - RIESGO ALTO (Consulta médica obligatoria)
  {
    id: 'medical-high-1',
    name: 'Ácido Hialurónico - Labios',
    shortDescription: 'Aumento y definición de labios con ácido hialurónico',
    description: 'Tratamiento de medicina estética para aumento y definición de labios mediante inyección de ácido hialurónico reticulado de alta calidad.',
    category: 'medicina-estetica',
    subcategory: 'rellenos',
    durationMinutes: 45,
    price: 350,
    vipPrice: 315,
    riskLevel: 'HIGH',
    requiresConsultation: true,
    requiresMedicalStaff: true,
    consentType: 'MEDICAL',
    appointmentType: 'CONSULTATION_SEPARATE',
    consultationDuration: 30,
    minimumAge: 18,
    regulatoryCategory: 'SANITARIO',
    authorizedProfessionalTypes: ['MEDICO', 'ENFERMERO_ESPECIALISTA'],
    contraindications: ['Embarazo', 'Lactancia', 'Herpes labial activo', 'Alergias a ácido hialurónico', 'Trastornos autoinmunes', 'Trastornos de coagulación'],
    sideEffects: ['Hinchazón', 'Moratones', 'Dolor leve', 'Asimetría temporal', 'Nódulos', 'Reacciones alérgicas'],
    recoveryTime: '7-14 días',
    followUpRequired: true,
    iconName: 'medical',
    color: '#FFEBEE',
    isPopular: true,
    isFeatured: true,
    isActive: true,
    beautyPointsEarned: 75,
    consentFormRequired: true,
    digitalSignatureRequired: true,
    legalNotice: 'TRATAMIENTO MÉDICO: Requiere consulta médica previa obligatoria y consentimiento informado.'
  },
  {
    id: 'medical-high-2',
    name: 'Toxina Botulínica - Arrugas',
    shortDescription: 'Tratamiento de arrugas de expresión con bótox',
    description: 'Aplicación de toxina botulínica tipo A para el tratamiento de arrugas de expresión en frente, entrecejo y patas de gallo.',
    category: 'medicina-estetica',
    subcategory: 'botox',
    durationMinutes: 30,
    price: 250,
    vipPrice: 225,
    riskLevel: 'HIGH',
    requiresConsultation: true,
    requiresMedicalStaff: true,
    consentType: 'MEDICAL',
    appointmentType: 'CONSULTATION_SEPARATE',
    consultationDuration: 30,
    minimumAge: 25,
    regulatoryCategory: 'SANITARIO',
    authorizedProfessionalTypes: ['MEDICO'],
    contraindications: ['Embarazo', 'Lactancia', 'Miastenia gravis', 'Esclerosis lateral amiotrófica', 'Infección local', 'Alergia a toxina botulínica'],
    sideEffects: ['Dolor en punto de inyección', 'Cefalea leve', 'Ptosis temporal', 'Asimetría facial temporal'],
    recoveryTime: '0-7 días',
    followUpRequired: true,
    iconName: 'medical-outline',
    color: '#FCE4EC',
    isPopular: true,
    isFeatured: false,
    isActive: true,
    beautyPointsEarned: 60,
    consentFormRequired: true,
    digitalSignatureRequired: true,
    legalNotice: 'TRATAMIENTO MÉDICO: Solo puede ser realizado por médicos colegiados. Consulta previa obligatoria.'
  }
];

// ============================================================================
// UTILIDADES Y HELPERS
// ============================================================================

const getLegalNotice = (treatment) => {
  switch (treatment.riskLevel) {
    case 'LOW':
      return 'Tratamiento de bajo riesgo que puede reservarse directamente.';
    case 'MEDIUM':
      return 'Se recomienda consulta previa para evaluar idoneidad del tratamiento.';
    case 'HIGH':
      return 'TRATAMIENTO MÉDICO: Consulta médica previa obligatoria según normativa sanitaria.';
    default:
      return 'Consulte con nuestros profesionales para más información.';
  }
};

const getBookingInstructions = (treatment) => {
  switch (treatment.appointmentType) {
    case 'DIRECT':
      return 'Puedes reservar este tratamiento directamente en nuestro calendario.';
    case 'CONSULTATION_TREATMENT':
      return 'Incluye consulta previa el mismo día del tratamiento para tu seguridad.';
    case 'CONSULTATION_SEPARATE':
      return 'Requiere cita de consulta médica previa en fecha separada antes del tratamiento.';
    default:
      return 'Contacta con la clínica para más información sobre la reserva.';
  }
};

const addLegalInfoToTreatment = (treatment) => ({
  ...treatment,
  legalInfo: {
    riskLevel: treatment.riskLevel,
    requiresConsultation: treatment.requiresConsultation,
    requiresMedicalStaff: treatment.requiresMedicalStaff,
    consentType: treatment.consentType,
    appointmentType: treatment.appointmentType,
    legalNotice: treatment.legalNotice || getLegalNotice(treatment),
    bookingInstructions: getBookingInstructions(treatment),
    minimumAge: treatment.minimumAge,
    contraindications: treatment.contraindications || [],
    sideEffects: treatment.sideEffects || [],
    recoveryTime: treatment.recoveryTime,
    followUpRequired: treatment.followUpRequired || false,
    consentFormRequired: treatment.consentFormRequired || false,
    digitalSignatureRequired: treatment.digitalSignatureRequired || false
  }
});

const getAvailableCategories = (treatments) => {
  const categoriesMap = new Map();
  
  treatments.forEach(treatment => {
    if (!categoriesMap.has(treatment.category)) {
      categoriesMap.set(treatment.category, {
        id: treatment.category,
        name: getCategoryName(treatment.category),
        count: 0,
        subcategories: new Set()
      });
    }
    
    const category = categoriesMap.get(treatment.category);
    category.count++;
    if (treatment.subcategory) {
      category.subcategories.add(treatment.subcategory);
    }
  });
  
  return Array.from(categoriesMap.values()).map(cat => ({
    ...cat,
    subcategories: Array.from(cat.subcategories)
  }));
};

const getCategoryName = (category) => {
  const names = {
    'facial': 'Tratamientos Faciales',
    'corporal': 'Tratamientos Corporales',
    'medicina-estetica': 'Medicina Estética',
    'depilacion': 'Depilación',
    'bienestar': 'Bienestar'
  };
  return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
};

// ============================================================================
// CONTROLADORES PRINCIPALES
// ============================================================================

const TreatmentController = {
  
  // ✅ OBTENER TODOS LOS TRATAMIENTOS CON FILTROS
  async getAllTreatments(req, res) {
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

      console.log('📋 Getting treatments with filters:', { 
        clinicId, category, isVipExclusive, minPrice, maxPrice, search, limit, offset 
      });

      let treatments = [];

      // Intentar obtener de la base de datos
      try {
        const where = {
          isActive: true,
          ...(clinicId && { clinicId }),
          ...(category && { category }),
          ...(isVipExclusive !== undefined && { isVipExclusive: isVipExclusive === 'true' }),
          ...(minPrice && { price: { gte: parseFloat(minPrice) } }),
          ...(maxPrice && { price: { lte: parseFloat(maxPrice) } }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { shortDescription: { contains: search, mode: 'insensitive' } }
            ]
          })
        };

        treatments = await prisma.treatment.findMany({
          where,
          orderBy: [
            { isFeatured: 'desc' },
            { isPopular: 'desc' },
            { sortOrder: 'asc' },
            { name: 'asc' }
          ],
          take: parseInt(limit),
          skip: parseInt(offset)
        });

      } catch (dbError) {
        console.warn('⚠️ Database query failed, using fallback data:', dbError.message);
      }

      // Si no hay datos en BD, usar fallback
      if (treatments.length === 0) {
        console.log('💡 Using fallback treatment data');
        treatments = FALLBACK_TREATMENTS.filter(treatment => {
          if (category && treatment.category !== category) return false;
          if (isVipExclusive === 'true' && !treatment.isVipExclusive) return false;
          if (minPrice && treatment.price < parseFloat(minPrice)) return false;
          if (maxPrice && treatment.price > parseFloat(maxPrice)) return false;
          if (search) {
            const searchLower = search.toLowerCase();
            return treatment.name.toLowerCase().includes(searchLower) ||
                   treatment.description.toLowerCase().includes(searchLower) ||
                   (treatment.shortDescription && treatment.shortDescription.toLowerCase().includes(searchLower));
          }
          return true;
        }).slice(parseInt(offset), parseInt(offset) + parseInt(limit));
      }

      // Agregar información legal a cada tratamiento
      const treatmentsWithLegalInfo = treatments.map(addLegalInfoToTreatment);

      res.json({
        success: true,
        data: {
          treatments: treatmentsWithLegalInfo,
          total: treatmentsWithLegalInfo.length,
          categories: getAvailableCategories(treatmentsWithLegalInfo),
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: treatmentsWithLegalInfo.length === parseInt(limit)
          },
          legalInfo: {
            complianceNote: "Todos nuestros tratamientos cumplen con la normativa sanitaria vigente",
            consultationPolicy: "Los tratamientos de riesgo medio-alto requieren consulta previa para garantizar tu seguridad",
            riskLevels: {
              LOW: "Bajo riesgo - Reserva directa",
              MEDIUM: "Riesgo medio - Consulta recomendada", 
              HIGH: "Alto riesgo - Consulta médica obligatoria"
            }
          }
        }
      });

    } catch (error) {
      console.error('❌ Error in getAllTreatments:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo tratamientos' }
      });
    }
  },

  // ✅ OBTENER TRATAMIENTOS DESTACADOS PARA DASHBOARD
  async getFeaturedTreatments(req, res) {
    try {
      const { clinicId, userId, limit = 6 } = req.query;

      console.log('⭐ Getting featured treatments for dashboard:', { clinicId, userId, limit });

      let treatments = [];

      // Intentar obtener de BD
      try {
        const where = {
          isActive: true,
          isFeatured: true,
          ...(clinicId && { clinicId })
        };

        treatments = await prisma.treatment.findMany({
          where,
          orderBy: [
            { isPopular: 'desc' },
            { sortOrder: 'asc' }
          ],
          take: parseInt(limit)
        });

      } catch (dbError) {
        console.warn('⚠️ Database query failed for featured treatments:', dbError.message);
      }

      // Fallback a tratamientos destacados
      if (treatments.length === 0) {
        treatments = FALLBACK_TREATMENTS
          .filter(t => t.isFeatured || t.isPopular)
          .slice(0, parseInt(limit));
      }

      const treatmentsWithLegalInfo = treatments.map(addLegalInfoToTreatment);

      res.json({
        success: true,
        data: {
          featuredTreatments: treatmentsWithLegalInfo,
          total: treatmentsWithLegalInfo.length
        }
      });

    } catch (error) {
      console.error('❌ Error in getFeaturedTreatments:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo tratamientos destacados' }
      });
    }
  },

  // ✅ OBTENER CATEGORÍAS DISPONIBLES
  async getCategories(req, res) {
    try {
      const { clinicId } = req.query;

      console.log('📂 Getting treatment categories:', { clinicId });

      let treatments = [];

      // Intentar obtener de BD
      try {
        const where = {
          isActive: true,
          ...(clinicId && { clinicId })
        };

        treatments = await prisma.treatment.findMany({
          where,
          select: {
            category: true,
            subcategory: true,
            riskLevel: true
          }
        });

      } catch (dbError) {
        console.warn('⚠️ Database query failed for categories:', dbError.message);
        treatments = FALLBACK_TREATMENTS;
      }

      if (treatments.length === 0) {
        treatments = FALLBACK_TREATMENTS;
      }

      const categories = getAvailableCategories(treatments);

      res.json({
        success: true,
        data: {
          categories,
          total: categories.length
        }
      });

    } catch (error) {
      console.error('❌ Error in getCategories:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo categorías' }
      });
    }
  },

  // ✅ BUSCAR TRATAMIENTOS
  async searchTreatments(req, res) {
    try {
      const { q, clinicId, limit = 10 } = req.query;

      console.log('🔍 Searching treatments:', { query: q, clinicId, limit });

      if (!q || q.length < 2) {
        return res.status(400).json({
          success: false,
          error: { message: 'La búsqueda debe tener al menos 2 caracteres' }
        });
      }

      let treatments = [];

      // Intentar búsqueda en BD
      try {
        const where = {
          isActive: true,
          ...(clinicId && { clinicId }),
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { shortDescription: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            { subcategory: { contains: q, mode: 'insensitive' } }
          ]
        };

        treatments = await prisma.treatment.findMany({
          where,
          orderBy: [
            { isPopular: 'desc' },
            { isFeatured: 'desc' }
          ],
          take: parseInt(limit)
        });

      } catch (dbError) {
        console.warn('⚠️ Database search failed:', dbError.message);
      }

      // Fallback search
      if (treatments.length === 0) {
        const searchLower = q.toLowerCase();
        treatments = FALLBACK_TREATMENTS.filter(treatment => 
          treatment.name.toLowerCase().includes(searchLower) ||
          treatment.description.toLowerCase().includes(searchLower) ||
          treatment.category.toLowerCase().includes(searchLower) ||
          (treatment.subcategory && treatment.subcategory.toLowerCase().includes(searchLower))
        ).slice(0, parseInt(limit));
      }

      const treatmentsWithLegalInfo = treatments.map(addLegalInfoToTreatment);

      res.json({
        success: true,
        data: {
          treatments: treatmentsWithLegalInfo,
          query: q,
          total: treatmentsWithLegalInfo.length
        }
      });

    } catch (error) {
      console.error('❌ Error in searchTreatments:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error en la búsqueda de tratamientos' }
      });
    }
  },

  // ✅ OBTENER TRATAMIENTOS POR CLÍNICA
  async getTreatmentsByClinic(req, res) {
    try {
      const { clinicId } = req.params;
      const { category, isVipExclusive } = req.query;

      console.log('🏥 Getting treatments by clinic:', { clinicId, category, isVipExclusive });

      let treatments = [];

      // Intentar obtener de BD
      try {
        const where = {
          clinicId,
          isActive: true,
          ...(category && { category }),
          ...(isVipExclusive !== undefined && { isVipExclusive: isVipExclusive === 'true' })
        };

        treatments = await prisma.treatment.findMany({
          where,
          orderBy: [
            { isFeatured: 'desc' },
            { isPopular: 'desc' },
            { name: 'asc' }
          ]
        });

      } catch (dbError) {
        console.warn('⚠️ Database query failed for clinic treatments:', dbError.message);
      }

      // Fallback - todos los tratamientos disponibles
      if (treatments.length === 0) {
        treatments = FALLBACK_TREATMENTS.filter(treatment => {
          if (category && treatment.category !== category) return false;
          if (isVipExclusive === 'true' && !treatment.isVipExclusive) return false;
          return true;
        });
      }

      const treatmentsWithLegalInfo = treatments.map(addLegalInfoToTreatment);

      res.json({
        success: true,
        data: {
          treatments: treatmentsWithLegalInfo,
          clinicId,
          total: treatmentsWithLegalInfo.length,
          categories: getAvailableCategories(treatmentsWithLegalInfo)
        }
      });

    } catch (error) {
      console.error('❌ Error in getTreatmentsByClinic:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo tratamientos de la clínica' }
      });
    }
  },

  // ✅ OBTENER DETALLES DE UN TRATAMIENTO ESPECÍFICO
  async getTreatmentDetails(req, res) {
    try {
      const { id } = req.params;

      console.log('🔍 Getting treatment details:', { id });

      let treatment = null;

      // Intentar obtener de BD
      try {
        treatment = await prisma.treatment.findUnique({
          where: { id, isActive: true },
          include: {
            clinic: {
              select: {
                id: true,
                name: true,
                city: true,
                phone: true,
                address: true
              }
            }
          }
        });

      } catch (dbError) {
        console.warn('⚠️ Database query failed for treatment details:', dbError.message);
      }

      // Fallback search
      if (!treatment) {
        treatment = FALLBACK_TREATMENTS.find(t => t.id === id);
        if (treatment) {
          // Agregar info de clínica demo
          treatment.clinic = {
            id: 'demo-clinic-1',
            name: 'Belleza Estética Madrid',
            city: 'Madrid',
            phone: '+34 91 555 0123',
            address: 'Calle Gran Vía, 28, Madrid'
          };
        }
      }

      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Tratamiento no encontrado' }
        });
      }

      const treatmentWithLegalInfo = addLegalInfoToTreatment(treatment);

      res.json({
        success: true,
        data: {
          treatment: treatmentWithLegalInfo
        }
      });

    } catch (error) {
      console.error('❌ Error in getTreatmentDetails:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo detalles del tratamiento' }
      });
    }
  },

  // ✅ VALIDAR ELEGIBILIDAD PARA TRATAMIENTO (NUEVO - COMPLIANCE LEGAL)
  async validateTreatmentEligibility(req, res) {
    try {
      const { treatmentId, userAge, medicalConditions = [], allergies = [] } = req.body;

      console.log('🔍 Validating treatment eligibility:', { treatmentId, userAge, medicalConditions, allergies });

      let treatment = null;

      // Buscar tratamiento
      try {
        treatment = await prisma.treatment.findUnique({
          where: { id: treatmentId, isActive: true }
        });
      } catch (dbError) {
        treatment = FALLBACK_TREATMENTS.find(t => t.id === treatmentId);
      }

      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Tratamiento no encontrado' }
        });
      }

      // Validaciones de elegibilidad
      const validationResults = {
        isEligible: true,
        warnings: [],
        requirements: [],
        blockers: []
      };

      // Validar edad mínima
      if (treatment.minimumAge && userAge && userAge < treatment.minimumAge) {
        validationResults.isEligible = false;
        validationResults.blockers.push(`Edad mínima requerida: ${treatment.minimumAge} años`);
      }

      // Validar contraindicaciones
      if (treatment.contraindications && Array.isArray(treatment.contraindications)) {
        const userConditionsLower = medicalConditions.map(c => c.toLowerCase());
        const userAllergiesLower = allergies.map(a => a.toLowerCase());
        
        treatment.contraindications.forEach(contraindication => {
          const contraindicationLower = contraindication.toLowerCase();
          
          // Buscar coincidencias en condiciones médicas
          if (userConditionsLower.some(condition => 
            contraindicationLower.includes(condition) || condition.includes(contraindicationLower)
          )) {
            validationResults.isEligible = false;
            validationResults.blockers.push(`Contraindicación: ${contraindication}`);
          }
          
          // Buscar coincidencias en alergias
          if (userAllergiesLower.some(allergy => 
            contraindicationLower.includes(allergy) || allergy.includes(contraindicationLower)
          )) {
            validationResults.isEligible = false;
            validationResults.blockers.push(`Alergia contraindicada: ${contraindication}`);
          }
        });
      }

      // Agregar requisitos según nivel de riesgo
      switch (treatment.riskLevel) {
        case 'MEDIUM':
          validationResults.requirements.push('Consulta previa recomendada');
          if (treatment.consentFormRequired) {
            validationResults.requirements.push('Formulario de consentimiento informado');
          }
          break;
        case 'HIGH':
          validationResults.requirements.push('Consulta médica obligatoria');
          validationResults.requirements.push('Consentimiento médico informado');
          if (treatment.digitalSignatureRequired) {
            validationResults.requirements.push('Firma digital requerida');
          }
          break;
      }

      // Agregar advertencias para casos especiales
      if (treatment.sideEffects && treatment.sideEffects.length > 0) {
        validationResults.warnings.push('Revisar posibles efectos secundarios antes del tratamiento');
      }

      if (treatment.recoveryTime && treatment.recoveryTime !== '0h') {
        validationResults.warnings.push(`Tiempo de recuperación: ${treatment.recoveryTime}`);
      }

      res.json({
        success: true,
        data: {
          treatmentId,
          validation: validationResults,
          nextSteps: getNextSteps(treatment, validationResults)
        }
      });

    } catch (error) {
      console.error('❌ Error in validateTreatmentEligibility:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error validando elegibilidad para el tratamiento' }
      });
    }
  },

  // ✅ OBTENER INFORMACIÓN LEGAL ESPECÍFICA
  async getLegalInfo(req, res) {
    try {
      const { treatmentId } = req.params;

      console.log('⚖️ Getting legal info for treatment:', { treatmentId });

      let treatment = null;

      try {
        treatment = await prisma.treatment.findUnique({
          where: { id: treatmentId, isActive: true }
        });
      } catch (dbError) {
        treatment = FALLBACK_TREATMENTS.find(t => t.id === treatmentId);
      }

      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Tratamiento no encontrado' }
        });
      }

      const legalInfo = {
        treatmentId,
        treatmentName: treatment.name,
        riskClassification: {
          level: treatment.riskLevel,
          description: getRiskLevelDescription(treatment.riskLevel),
          requirements: getRiskLevelRequirements(treatment.riskLevel)
        },
        consultationPolicy: {
          required: treatment.requiresConsultation,
          type: treatment.appointmentType,
          duration: treatment.consultationDuration || null,
          description: getConsultationDescription(treatment)
        },
        consent: {
          type: treatment.consentType,
          formRequired: treatment.consentFormRequired || false,
          digitalSignatureRequired: treatment.digitalSignatureRequired || false,
          description: getConsentDescription(treatment.consentType)
        },
        professionalRequirements: {
          medicalStaffRequired: treatment.requiresMedicalStaff || false,
          authorizedTypes: treatment.authorizedProfessionalTypes || [],
          specialization: treatment.requiresSpecialization || false
        },
        safetyInfo: {
          minimumAge: treatment.minimumAge,
          contraindications: treatment.contraindications || [],
          sideEffects: treatment.sideEffects || [],
          recoveryTime: treatment.recoveryTime,
          followUpRequired: treatment.followUpRequired || false
        },
        regulatoryInfo: {
          category: treatment.regulatoryCategory || 'ESTETICO',
          complianceNote: 'Cumple con la normativa sanitaria española vigente',
          lastUpdated: new Date().toISOString()
        }
      };

      res.json({
        success: true,
        data: legalInfo
      });

    } catch (error) {
      console.error('❌ Error in getLegalInfo:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error obteniendo información legal' }
      });
    }
  }
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

const getNextSteps = (treatment, validation) => {
  const steps = [];

  if (!validation.isEligible) {
    steps.push({
      type: 'CONTACT_CLINIC',
      title: 'Contactar con la clínica',
      description: 'Hay contraindicaciones que requieren evaluación médica personalizada'
    });
    return steps;
  }

  switch (treatment.appointmentType) {
    case 'DIRECT':
      steps.push({
        type: 'BOOK_DIRECTLY',
        title: 'Reservar directamente',
        description: 'Puedes proceder a reservar tu cita directamente'
      });
      break;
    case 'CONSULTATION_TREATMENT':
      steps.push({
        type: 'BOOK_WITH_CONSULTATION',
        title: 'Reservar con consulta',
        description: 'Se incluirá una consulta previa el mismo día del tratamiento'
      });
      break;
    case 'CONSULTATION_SEPARATE':
      steps.push({
        type: 'BOOK_CONSULTATION_FIRST',
        title: 'Reservar consulta médica',
        description: 'Primero debes agendar una consulta médica previa'
      });
      break;
  }

  if (treatment.consentFormRequired) {
    steps.push({
      type: 'COMPLETE_CONSENT',
      title: 'Completar consentimiento',
      description: 'Deberás completar el formulario de consentimiento informado'
    });
  }

  return steps;
};

const getRiskLevelDescription = (riskLevel) => {
  const descriptions = {
    LOW: 'Tratamiento de bajo riesgo sin contraindicaciones significativas',
    MEDIUM: 'Tratamiento de riesgo moderado que requiere evaluación previa',
    HIGH: 'Tratamiento médico de alto riesgo que requiere supervisión médica'
  };
  return descriptions[riskLevel] || 'Nivel de riesgo no especificado';
};

const getRiskLevelRequirements = (riskLevel) => {
  const requirements = {
    LOW: ['Información básica del paciente'],
    MEDIUM: ['Consulta previa recomendada', 'Consentimiento informado'],
    HIGH: ['Consulta médica obligatoria', 'Consentimiento médico', 'Supervisión médica durante el tratamiento']
  };
  return requirements[riskLevel] || [];
};

const getConsultationDescription = (treatment) => {
  switch (treatment.appointmentType) {
    case 'DIRECT':
      return 'No requiere consulta previa. Puedes reservar directamente.';
    case 'CONSULTATION_TREATMENT':
      return 'Incluye consulta previa el mismo día para evaluar idoneidad del tratamiento.';
    case 'CONSULTATION_SEPARATE':
      return 'Requiere consulta médica previa en cita separada antes del tratamiento.';
    default:
      return 'Consulta con la clínica para determinar el proceso de reserva.';
  }
};

const getConsentDescription = (consentType) => {
  const descriptions = {
    SIMPLE: 'Consentimiento básico para tratamientos de bajo riesgo',
    INFORMED: 'Consentimiento informado con explicación detallada de riesgos y beneficios',
    MEDICAL: 'Consentimiento médico completo con evaluación clínica y firma médica'
  };
  return descriptions[consentType] || 'Tipo de consentimiento no especificado';
};

module.exports = TreatmentController;