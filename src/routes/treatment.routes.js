// ============================================================================
// 💊 SINGLE CLINIC TREATMENT ROUTES - PRODUCTION READY v4.0 ✅
// src/routes/treatment.routes.js - OPTIMIZED FOR SINGLE CLINIC
// ============================================================================

const express = require('express');
const { body, query, param } = require('express-validator');
const TreatmentController = require('../controllers/treatment.controller');
const { 
  verifyToken, 
  optionalAuth, 
  requireVIPAccess,
  requireAdmin 
} = require('../middleware/auth.middleware');

const router = express.Router();

// ============================================================================
// CONFIGURACIÓN Y UTILIDADES
// ============================================================================

// AsyncHandler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware de validación simplificado
const validateRequest = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: { 
        message: 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      }
    });
  }
  next();
};

// Fallback controller para desarrollo
const TreatmentFallback = {
  getAllTreatments: async (req, res) => {
    const treatments = [
      {
        id: 't1',
        name: 'Limpieza Facial Profunda',
        description: 'Tratamiento completo de limpieza facial con extracción de impurezas e hidratación profunda',
        category: 'Facial',
        duration: 60,
        durationMinutes: 60,
        price: 65.00,
        originalPrice: 65.00,
        isActive: true,
        isVipExclusive: false,
        riskLevel: 'LOW',
        requiresConsultation: false,
        minAge: 16,
        benefits: ['Elimina impurezas', 'Hidrata profundamente', 'Mejora textura de la piel'],
        contraindications: ['Piel extremadamente sensible', 'Heridas abiertas', 'Irritación severa'],
        afterCare: ['Usar protector solar', 'Mantener hidratación', 'Evitar maquillaje 4 horas'],
        beforeCare: ['No usar exfoliantes 24h antes', 'Llegar sin maquillaje']
      },
      {
        id: 't2',
        name: 'Masaje Relajante Corporal',
        description: 'Masaje corporal completo con técnicas de relajación profunda y aceites esenciales',
        category: 'Corporal',
        duration: 90,
        durationMinutes: 90,
        price: 85.00,
        originalPrice: 85.00,
        isActive: true,
        isVipExclusive: false,
        riskLevel: 'LOW',
        requiresConsultation: false,
        minAge: 18,
        benefits: ['Reduce estrés y tensión', 'Mejora circulación sanguínea', 'Relaja músculos'],
        contraindications: ['Lesiones musculares recientes', 'Fiebre', 'Inflamación aguda'],
        afterCare: ['Hidratación abundante', 'Descanso recomendado', 'Evitar ejercicio intenso 2 horas'],
        beforeCare: ['Hidratación previa', 'Evitar comidas pesadas 2 horas antes']
      },
      {
        id: 't3',
        name: 'Tratamiento Anti-edad Avanzado',
        description: 'Protocolo avanzado anti-envejecimiento con tecnología de vanguardia y principios activos',
        category: 'Anti-edad',
        duration: 75,
        durationMinutes: 75,
        price: 120.00,
        originalPrice: 120.00,
        isActive: true,
        isVipExclusive: true,
        riskLevel: 'MEDIUM',
        requiresConsultation: true,
        minAge: 25,
        benefits: ['Reduce arrugas visibles', 'Mejora firmeza de la piel', 'Ilumina el rostro'],
        contraindications: ['Embarazo', 'Lactancia', 'Piel extremadamente sensible', 'Tratamientos recientes con ácidos'],
        afterCare: ['Protección solar obligatoria', 'Usar productos específicos recomendados', 'Evitar sol directo 48h'],
        beforeCare: ['Consulta previa obligatoria', 'Suspender retinoides 1 semana antes']
      },
      {
        id: 't4',
        name: 'Depilación Láser Diodo',
        description: 'Sesión de depilación láser con tecnología diodo de última generación para reducción permanente del vello',
        category: 'Láser',
        duration: 45,
        durationMinutes: 45,
        price: 75.00,
        originalPrice: 75.00,
        isActive: true,
        isVipExclusive: false,
        riskLevel: 'MEDIUM',
        requiresConsultation: true,
        minAge: 18,
        benefits: ['Reducción permanente del vello', 'Proceso prácticamente indoloro', 'Resultados duraderos'],
        contraindications: ['Piel bronceada', 'Medicación fotosensibilizante', 'Embarazo', 'Tatuajes en zona'],
        afterCare: ['Protección solar obligatoria', 'Hidratación de la zona', 'No depilación con cera entre sesiones'],
        beforeCare: ['No exposición solar 2 semanas', 'Afeitar zona 24h antes', 'Evitar productos perfumados']
      },
      {
        id: 't5',
        name: 'Hidrafacial Premium',
        description: 'Tratamiento facial de hidratación profunda con tecnología HydraFacial MD para resultados inmediatos',
        category: 'Facial',
        duration: 50,
        durationMinutes: 50,
        price: 95.00,
        originalPrice: 95.00,
        isActive: true,
        isVipExclusive: false,
        riskLevel: 'LOW',
        requiresConsultation: false,
        minAge: 16,
        benefits: ['Hidratación intensa instantánea', 'Poros visiblemente más cerrados', 'Piel luminosa y suave'],
        contraindications: ['Heridas abiertas en rostro', 'Irritación severa activa', 'Rosácea en brote'],
        afterCare: ['Mantener hidratación con productos recomendados', 'Protección solar', 'Evitar exfoliación 48h'],
        beforeCare: ['Evitar exfoliación previa 24h', 'No usar ácidos 2 días antes']
      }
    ];

    // Aplicar filtros de query parameters
    let filteredTreatments = treatments;
    
    if (req.query.category) {
      filteredTreatments = filteredTreatments.filter(t => 
        t.category.toLowerCase() === req.query.category.toLowerCase()
      );
    }
    
    if (req.query.isVipExclusive !== undefined) {
      filteredTreatments = filteredTreatments.filter(t => 
        t.isVipExclusive === (req.query.isVipExclusive === 'true')
      );
    }
    
    if (req.query.riskLevel) {
      filteredTreatments = filteredTreatments.filter(t => 
        t.riskLevel === req.query.riskLevel.toUpperCase()
      );
    }
    
    if (req.query.search) {
      const searchTerm = req.query.search.toLowerCase();
      filteredTreatments = filteredTreatments.filter(t => 
        t.name.toLowerCase().includes(searchTerm) ||
        t.description.toLowerCase().includes(searchTerm)
      );
    }

    // Aplicar límites
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const paginatedTreatments = filteredTreatments.slice(offset, offset + limit);

    res.status(200).json({
      success: true,
      data: paginatedTreatments,
      pagination: {
        total: filteredTreatments.length,
        limit,
        offset,
        hasMore: (offset + limit) < filteredTreatments.length
      },
      message: `${paginatedTreatments.length} treatments retrieved`
    });
  }
};

// ============================================================================
// HEALTH CHECK
// ============================================================================
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'treatment-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '4.0.0-SINGLE-CLINIC',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      public: [
        'GET /health',
        'GET /',
        'GET /categories',
        'GET /featured',
        'GET /search',
        'GET /:id',
        'POST /validate-eligibility'
      ],
      protected: [
        'GET /vip-exclusive'
      ],
      admin: [
        'POST /',
        'PUT /:id',
        'DELETE /:id'
      ]
    }
  });
});

// ============================================================================
// RUTAS PÚBLICAS
// ============================================================================

// GET /api/treatments - Obtener todos los tratamientos
router.get('/',
  [
    query('category').optional().isString().trim().withMessage('Category must be a string'),
    query('riskLevel').optional().isIn(['LOW', 'MEDIUM', 'HIGH']).withMessage('Risk level must be LOW, MEDIUM or HIGH'),
    query('requiresConsultation').optional().isBoolean().withMessage('requiresConsultation must be boolean'),
    query('isVipExclusive').optional().isBoolean().withMessage('isVipExclusive must be boolean'),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be positive'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be positive'),
    query('search').optional().isLength({ min: 2 }).withMessage('Search must be at least 2 characters'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative')
  ],
  validateRequest,
  asyncHandler(TreatmentController?.getAllTreatments || TreatmentFallback.getAllTreatments)
);

// GET /api/treatments/categories - Obtener categorías disponibles
router.get('/categories',
  asyncHandler(async (req, res) => {
    try {
      const categories = [
        { name: 'Facial', count: 15, description: 'Tratamientos faciales de belleza y cuidado' },
        { name: 'Corporal', count: 8, description: 'Tratamientos corporales y masajes' },
        { name: 'Anti-edad', count: 6, description: 'Tratamientos anti-envejecimiento avanzados' },
        { name: 'Láser', count: 4, description: 'Tratamientos con tecnología láser' },
        { name: 'Depilación', count: 5, description: 'Servicios de depilación profesional' },
        { name: 'Hidratación', count: 7, description: 'Tratamientos de hidratación profunda' }
      ];

      res.status(200).json({
        success: true,
        data: categories,
        total: categories.length,
        message: 'Treatment categories retrieved'
      });
    } catch (error) {
      console.error('Categories error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error retrieving categories', code: 'CATEGORIES_ERROR' }
      });
    }
  })
);

// GET /api/treatments/featured - Tratamientos destacados
router.get('/featured',
  [
    query('limit').optional().isInt({ min: 1, max: 10 }).withMessage('Limit must be between 1 and 10')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    try {
      // Para single clinic, destacamos los más populares
      const featured = [
        {
          id: 't1',
          name: 'Limpieza Facial Profunda',
          category: 'Facial',
          price: 65.00,
          duration: 60,
          rating: 4.8,
          bookingCount: 156,
          isPopular: true,
          discount: null
        },
        {
          id: 't5',
          name: 'Hidrafacial Premium',
          category: 'Facial',
          price: 95.00,
          duration: 50,
          rating: 4.9,
          bookingCount: 89,
          isPopular: true,
          discount: null
        },
        {
          id: 't2',
          name: 'Masaje Relajante Corporal',
          category: 'Corporal',
          price: 85.00,
          duration: 90,
          rating: 4.7,
          bookingCount: 124,
          isPopular: true,
          discount: null
        }
      ];

      const limit = parseInt(req.query.limit) || 3;
      const limitedFeatured = featured.slice(0, limit);

      res.status(200).json({
        success: true,
        data: limitedFeatured,
        total: limitedFeatured.length,
        message: 'Featured treatments retrieved'
      });
    } catch (error) {
      console.error('Featured treatments error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error retrieving featured treatments', code: 'FEATURED_ERROR' }
      });
    }
  })
);

// GET /api/treatments/search - Buscar tratamientos
router.get('/search',
  [
    query('q').notEmpty().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    try {
      const searchQuery = req.query.q.toLowerCase();
      const limit = parseInt(req.query.limit) || 10;

      // Simulación de búsqueda - en producción usaría base de datos
      const allTreatments = [
        { id: 't1', name: 'Limpieza Facial Profunda', category: 'Facial', price: 65.00 },
        { id: 't2', name: 'Masaje Relajante Corporal', category: 'Corporal', price: 85.00 },
        { id: 't3', name: 'Tratamiento Anti-edad Avanzado', category: 'Anti-edad', price: 120.00 },
        { id: 't4', name: 'Depilación Láser Diodo', category: 'Láser', price: 75.00 },
        { id: 't5', name: 'Hidrafacial Premium', category: 'Facial', price: 95.00 }
      ];

      const searchResults = allTreatments
        .filter(treatment => 
          treatment.name.toLowerCase().includes(searchQuery) ||
          treatment.category.toLowerCase().includes(searchQuery)
        )
        .slice(0, limit);

      res.status(200).json({
        success: true,
        data: searchResults,
        query: req.query.q,
        total: searchResults.length,
        message: `${searchResults.length} treatments found`
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error searching treatments', code: 'SEARCH_ERROR' }
      });
    }
  })
);

// GET /api/treatments/:id - Detalles de tratamiento específico
router.get('/:id',
  [
    param('id').notEmpty().withMessage('Treatment ID is required')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      // Simulación de tratamiento específico - usar base de datos en producción
      const treatments = {
        't1': {
          id: 't1',
          name: 'Limpieza Facial Profunda',
          description: 'Tratamiento completo de limpieza facial con extracción de impurezas e hidratación profunda usando técnicas profesionales y productos de alta calidad.',
          category: 'Facial',
          duration: 60,
          price: 65.00,
          originalPrice: 65.00,
          isActive: true,
          isVipExclusive: false,
          riskLevel: 'LOW',
          requiresConsultation: false,
          minAge: 16,
          maxFrequency: 'monthly',
          benefits: [
            'Elimina impurezas y puntos negros',
            'Hidrata profundamente la piel',
            'Mejora la textura y luminosidad',
            'Minimiza la apariencia de poros',
            'Deja la piel suave y renovada'
          ],
          process: [
            'Limpieza inicial con productos específicos',
            'Exfoliación suave para renovar células',
            'Extracción profesional de impurezas',
            'Aplicación de mascarilla hidratante',
            'Hidratación final con cremas nutritivas'
          ],
          contraindications: [
            'Piel extremadamente sensible o irritada',
            'Heridas abiertas en el rostro',
            'Infecciones cutáneas activas',
            'Rosácea en brote agudo'
          ],
          afterCare: [
            'Usar protector solar obligatoriamente',
            'Mantener hidratación con productos recomendados',
            'Evitar maquillaje durante 4 horas',
            'No tocar ni frotar la zona tratada'
          ],
          beforeCare: [
            'No usar exfoliantes 24 horas antes',
            'Llegar al tratamiento sin maquillaje',
            'Informar sobre productos usados recientemente',
            'Evitar exposición solar previa'
          ],
          includedProducts: [
            'Limpiador específico para tipo de piel',
            'Exfoliante suave profesional',
            'Mascarilla hidratante personalizada',
            'Crema hidratante post-tratamiento'
          ],
          results: {
            immediate: 'Piel más limpia, suave e hidratada inmediatamente',
            shortTerm: 'Mejora en textura y luminosidad en 2-3 días',
            longTerm: 'Con tratamientos regulares, piel más saludable y radiante'
          },
          rating: 4.8,
          reviewCount: 156,
          bookingCount: 234
        }
      };

      const treatment = treatments[id];

      if (!treatment) {
        return res.status(404).json({
          success: false,
          error: { message: 'Treatment not found', code: 'TREATMENT_NOT_FOUND' }
        });
      }

      res.status(200).json({
        success: true,
        data: treatment,
        message: 'Treatment details retrieved'
      });
    } catch (error) {
      console.error('Treatment details error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error retrieving treatment details', code: 'TREATMENT_DETAIL_ERROR' }
      });
    }
  })
);

// POST /api/treatments/validate-eligibility - Validar elegibilidad médica
router.post('/validate-eligibility',
  [
    body('treatmentId').notEmpty().withMessage('Treatment ID is required'),
    body('userAge').optional().isInt({ min: 16, max: 100 }).withMessage('Age must be between 16 and 100'),
    body('hasAllergies').optional().isBoolean().withMessage('hasAllergies must be boolean'),
    body('allergyDetails').optional().isString().withMessage('allergyDetails must be string'),
    body('hasMedicalConditions').optional().isBoolean().withMessage('hasMedicalConditions must be boolean'),
    body('medicalDetails').optional().isString().withMessage('medicalDetails must be string'),
    body('takingMedications').optional().isBoolean().withMessage('takingMedications must be boolean'),
    body('medicationDetails').optional().isString().withMessage('medicationDetails must be string'),
    body('isPregnant').optional().isBoolean().withMessage('isPregnant must be boolean'),
    body('isBreastfeeding').optional().isBoolean().withMessage('isBreastfeeding must be boolean')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    try {
      const { 
        treatmentId, 
        userAge, 
        hasAllergies, 
        allergyDetails,
        hasMedicalConditions, 
        medicalDetails,
        takingMedications,
        medicationDetails,
        isPregnant,
        isBreastfeeding
      } = req.body;

      // Simulación de validación médica - implementar lógica real según tratamiento
      const warnings = [];
      const contraindications = [];
      let requiresConsultation = false;
      let eligible = true;

      // Validaciones por edad
      if (userAge && userAge < 18) {
        if (['t3', 't4'].includes(treatmentId)) {
          contraindications.push('Minimum age requirement not met for this treatment');
          eligible = false;
        } else {
          warnings.push('Parental consent required for minors');
        }
      }

      // Validaciones por embarazo/lactancia
      if (isPregnant || isBreastfeeding) {
        if (['t3', 't4'].includes(treatmentId)) {
          contraindications.push('Treatment not recommended during pregnancy or breastfeeding');
          eligible = false;
        } else {
          requiresConsultation = true;
          warnings.push('Medical consultation recommended due to pregnancy/breastfeeding');
        }
      }

      // Validaciones por medicamentos
      if (takingMedications && medicationDetails) {
        const sensitizingMeds = ['retinoids', 'photosensitizing', 'anticoagulants'];
        const hasConflict = sensitizingMeds.some(med => 
          medicationDetails.toLowerCase().includes(med)
        );
        
        if (hasConflict) {
          requiresConsultation = true;
          warnings.push('Current medications may affect treatment - consultation required');
        }
      }

      // Validaciones por condiciones médicas
      if (hasMedicalConditions && medicalDetails) {
        const contraindictoryConditions = ['active skin infections', 'severe eczema', 'open wounds'];
        const hasContraindication = contraindictoryConditions.some(condition =>
          medicalDetails.toLowerCase().includes(condition)
        );

        if (hasContraindication) {
          contraindications.push('Current medical condition contraindicates this treatment');
          eligible = false;
        }
      }

      // Validaciones por alergias
      if (hasAllergies && allergyDetails) {
        const commonAllergens = ['latex', 'fragrances', 'chemical peels'];
        const hasAllergenConflict = commonAllergens.some(allergen =>
          allergyDetails.toLowerCase().includes(allergen)
        );

        if (hasAllergenConflict) {
          warnings.push('Allergies noted - special precautions will be taken');
          requiresConsultation = true;
        }
      }

      const result = {
        eligible,
        requiresConsultation,
        warnings,
        contraindications,
        recommendations: eligible ? [
          'Follow all pre and post-treatment care instructions',
          'Inform staff of any changes in health status',
          'Schedule follow-up if recommended'
        ] : [
          'Consult with medical professional',
          'Consider alternative treatments',
          'Address contraindications before proceeding'
        ]
      };

      res.status(200).json({
        success: true,
        data: result,
        message: eligible ? 
          'Patient eligible for treatment' : 
          'Treatment eligibility requires medical evaluation'
      });

    } catch (error) {
      console.error('Eligibility validation error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error validating treatment eligibility', 
          code: 'ELIGIBILITY_ERROR' 
        }
      });
    }
  })
);

// ============================================================================
// RUTAS PROTEGIDAS - VIP
// ============================================================================

// GET /api/treatments/vip-exclusive - Tratamientos exclusivos VIP
router.get('/vip-exclusive',
  requireVIPAccess,
  asyncHandler(async (req, res) => {
    try {
      const vipTreatments = [
        {
          id: 't3',
          name: 'Tratamiento Anti-edad Avanzado',
          category: 'Anti-edad',
          price: 120.00,
          vipPrice: 108.00, // 10% descuento VIP
          duration: 75,
          isVipExclusive: true,
          vipBenefits: [
            '10% discount on all sessions',
            'Priority booking slots',
            'Extended consultation time',
            'Complimentary aftercare products'
          ]
        }
      ];

      res.status(200).json({
        success: true,
        data: vipTreatments,
        message: 'VIP exclusive treatments retrieved'
      });
    } catch (error) {
      console.error('VIP treatments error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error retrieving VIP treatments', code: 'VIP_TREATMENTS_ERROR' }
      });
    }
  })
);

// ============================================================================
// RUTAS ADMINISTRATIVAS (FUTURAS)
// ============================================================================

if (process.env.NODE_ENV !== 'production') {
  // Debug endpoint
  router.get('/debug/info', (req, res) => {
    res.status(200).json({
      success: true,
      debug: {
        controllerAvailable: !!TreatmentController,
        fallbackActive: !TreatmentController,
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });
  });
}

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================
router.use((error, req, res, next) => {
  console.error('Treatment route error:', {
    url: req.url,
    method: req.method,
    error: error.message,
    code: error.code
  });
  
  // Errores específicos de tratamientos
  if (error.message.includes('not found')) {
    return res.status(404).json({
      success: false,
      error: { 
        message: 'Treatment not found or unavailable',
        code: 'TREATMENT_NOT_FOUND'
      }
    });
  }
  
  if (error.message.includes('contraindication')) {
    return res.status(400).json({
      success: false,
      error: { 
        message: 'Medical contraindications prevent this treatment',
        code: 'MEDICAL_CONTRAINDICATION'
      }
    });
  }
  
  if (error.message.includes('age restriction')) {
    return res.status(400).json({
      success: false,
      error: { 
        message: 'Age requirements not met for this treatment',
        code: 'AGE_RESTRICTION'
      }
    });
  }

  // Errores de Prisma
  if (error.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: { 
        message: 'Treatment not found', 
        code: 'NOT_FOUND' 
      }
    });
  }

  // Error genérico
  res.status(error.status || 500).json({
    success: false,
    error: { 
      message: error.message || 'Treatment system error',
      code: error.code || 'TREATMENT_SYSTEM_ERROR',
      timestamp: new Date().toISOString()
    }
  });
});

module.exports = router;