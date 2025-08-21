// ============================================================================
// src/controllers/treatment.controller.js - CONTROLADOR DE TRATAMIENTOS CON COMPLIANCE LEGAL ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

      const treatments = await prisma.treatment.findMany({
        where,
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              city: true
            }
          }
        },
        orderBy: [
          { isFeatured: 'desc' },
          { isPopular: 'desc' },
          { sortOrder: 'asc' },
          { name: 'asc' }
        ],
        take: parseInt(limit),
        skip: parseInt(offset)
      });

      // Obtener total para paginación
      const total = await prisma.treatment.count({ where });

      // Agregar información legal a cada tratamiento
      const treatmentsWithLegalInfo = treatments.map(addLegalInfoToTreatment);

      res.json({
        success: true,
        data: {
          treatments: treatmentsWithLegalInfo,
          total,
          categories: getAvailableCategories(treatmentsWithLegalInfo),
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: parseInt(offset) + parseInt(limit) < total
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
        error: { 
          message: 'Error obteniendo tratamientos',
          details: error.message
        }
      });
    }
  },

  // ✅ OBTENER TRATAMIENTOS DESTACADOS PARA DASHBOARD
  async getFeaturedTreatments(req, res) {
    try {
      const { clinicId, userId, limit = 6 } = req.query;

      console.log('⭐ Getting featured treatments for dashboard:', { clinicId, userId, limit });

      const where = {
        isActive: true,
        isFeatured: true,
        ...(clinicId && { clinicId })
      };

      const treatments = await prisma.treatment.findMany({
        where,
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              city: true
            }
          }
        },
        orderBy: [
          { isPopular: 'desc' },
          { sortOrder: 'asc' }
        ],
        take: parseInt(limit)
      });

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
        error: { 
          message: 'Error obteniendo tratamientos destacados',
          details: error.message
        }
      });
    }
  },

  // ✅ OBTENER CATEGORÍAS DISPONIBLES
  async getCategories(req, res) {
    try {
      const { clinicId } = req.query;

      console.log('📂 Getting treatment categories:', { clinicId });

      const where = {
        isActive: true,
        ...(clinicId && { clinicId })
      };

      const treatments = await prisma.treatment.findMany({
        where,
        select: {
          category: true,
          subcategory: true,
          riskLevel: true
        }
      });

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
        error: { 
          message: 'Error obteniendo categorías',
          details: error.message
        }
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

      const treatments = await prisma.treatment.findMany({
        where,
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              city: true
            }
          }
        },
        orderBy: [
          { isPopular: 'desc' },
          { isFeatured: 'desc' }
        ],
        take: parseInt(limit)
      });

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
        error: { 
          message: 'Error en la búsqueda de tratamientos',
          details: error.message
        }
      });
    }
  },

  // ✅ OBTENER TRATAMIENTOS POR CLÍNICA
  async getTreatmentsByClinic(req, res) {
    try {
      const { clinicId } = req.params;
      const { category, isVipExclusive } = req.query;

      console.log('🏥 Getting treatments by clinic:', { clinicId, category, isVipExclusive });

      const where = {
        clinicId,
        isActive: true,
        ...(category && { category }),
        ...(isVipExclusive !== undefined && { isVipExclusive: isVipExclusive === 'true' })
      };

      const treatments = await prisma.treatment.findMany({
        where,
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
        },
        orderBy: [
          { isFeatured: 'desc' },
          { isPopular: 'desc' },
          { name: 'asc' }
        ]
      });

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
        error: { 
          message: 'Error obteniendo tratamientos de la clínica',
          details: error.message
        }
      });
    }
  },

  // ✅ OBTENER DETALLES DE UN TRATAMIENTO ESPECÍFICO
  async getTreatmentDetails(req, res) {
    try {
      const { id } = req.params;

      console.log('🔍 Getting treatment details:', { id });

      const treatment = await prisma.treatment.findUnique({
        where: { 
          id, 
          isActive: true 
        },
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              city: true,
              phone: true,
              address: true,
              timezone: true
            }
          },
          consentFormTemplate: {
            select: {
              id: true,
              name: true,
              title: true,
              consentType: true
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
        error: { 
          message: 'Error obteniendo detalles del tratamiento',
          details: error.message
        }
      });
    }
  },

  // ✅ VALIDAR ELEGIBILIDAD PARA TRATAMIENTO (COMPLIANCE LEGAL)
  async validateTreatmentEligibility(req, res) {
    try {
      const { 
        treatmentId, 
        userAge, 
        medicalConditions = [], 
        hasAllergies = false,
        allergyDetails = null,
        takingMedications = false,
        medicationDetails = null
      } = req.body;

      console.log('🔍 Validating treatment eligibility:', { 
        treatmentId, 
        userAge, 
        medicalConditions, 
        hasAllergies,
        takingMedications
      });

      const treatment = await prisma.treatment.findUnique({
        where: { 
          id: treatmentId, 
          isActive: true 
        }
      });

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

      // Validar contraindicaciones médicas
      if (treatment.contraindications && Array.isArray(treatment.contraindications)) {
        const userConditionsLower = medicalConditions.map(c => c.toLowerCase());
        
        treatment.contraindications.forEach(contraindication => {
          const contraindicationLower = contraindication.toLowerCase();
          
          // Buscar coincidencias en condiciones médicas
          if (userConditionsLower.some(condition => 
            contraindicationLower.includes(condition) || condition.includes(contraindicationLower)
          )) {
            validationResults.isEligible = false;
            validationResults.blockers.push(`Contraindicación médica: ${contraindication}`);
          }
          
          // Validar alergias si las hay
          if (hasAllergies && allergyDetails) {
            try {
              const allergies = typeof allergyDetails === 'string' ? 
                JSON.parse(allergyDetails) : allergyDetails;
              
              if (Array.isArray(allergies)) {
                const userAllergiesLower = allergies.map(a => a.toLowerCase());
                
                if (userAllergiesLower.some(allergy => 
                  contraindicationLower.includes(allergy) || allergy.includes(contraindicationLower)
                )) {
                  validationResults.isEligible = false;
                  validationResults.blockers.push(`Alergia contraindicada: ${contraindication}`);
                }
              }
            } catch (e) {
              console.warn('Error parsing allergy details:', e);
            }
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

      // Agregar advertencias
      if (treatment.sideEffects && treatment.sideEffects.length > 0) {
        validationResults.warnings.push('Revisar posibles efectos secundarios antes del tratamiento');
      }

      if (treatment.recoveryTime && treatment.recoveryTime !== '0h') {
        validationResults.warnings.push(`Tiempo de recuperación: ${treatment.recoveryTime}`);
      }

      if (takingMedications) {
        validationResults.warnings.push('Informar sobre medicamentos durante la consulta');
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
        error: { 
          message: 'Error validando elegibilidad para el tratamiento',
          details: error.message
        }
      });
    }
  },

  // ✅ OBTENER INFORMACIÓN LEGAL ESPECÍFICA
  async getLegalInfo(req, res) {
    try {
      const { id: treatmentId } = req.params;

      console.log('⚖️ Getting legal info for treatment:', { treatmentId });

      const treatment = await prisma.treatment.findUnique({
        where: { 
          id: treatmentId, 
          isActive: true 
        },
        include: {
          consentFormTemplate: {
            select: {
              id: true,
              name: true,
              title: true,
              consentType: true,
              content: true,
              fields: true
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
          description: getConsentDescription(treatment.consentType),
          template: treatment.consentFormTemplate || null
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
        error: { 
          message: 'Error obteniendo información legal',
          details: error.message
        }
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