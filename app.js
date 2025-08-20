// ============================================================================
// app.js - Belleza Estética API v3.0 - PRODUCTION READY ✅ MODULAR SCHEMA
// ============================================================================
const express = require('express');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Middlewares
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;

console.log('🚀 Belleza Estética API v3.0 - MODULAR SCHEMA');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Port: ${PORT}`);

// ============================================================================
// VALIDADORES PARA NUEVOS ENUMS
// ============================================================================
const validateAppointmentStatus = (status) => {
  const validStatuses = [
    'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 
    'CANCELLED', 'NO_SHOW', 'RESCHEDULED'
  ];
  return validStatuses.includes(status);
};

const validateUserRole = (role) => {
  const validRoles = ['CLIENT', 'VIP_CLIENT', 'PROFESSIONAL', 'MANAGER', 'ADMIN'];
  return validRoles.includes(role);
};

const validatePaymentStatus = (status) => {
  const validStatuses = [
    'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 
    'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'
  ];
  return validStatuses.includes(status);
};

const validateTreatmentRiskLevel = (level) => {
  const validLevels = ['LOW', 'MEDIUM', 'HIGH', 'MEDICAL'];
  return validLevels.includes(level);
};

// ============================================================================
// RUTAS - IMPORTACIÓN SEGURA
// ============================================================================
const safeImport = (path, name) => {
  try {
    const route = require(path);
    console.log(`✅ ${name} routes loaded`);
    return route;
  } catch (error) {
    console.log(`⚠️ ${name} routes not available:`, error.message);
    return null;
  }
};

// Rutas principales
const authRoutes = safeImport('./src/routes/auth.routes', 'Auth');
const treatmentRoutes = safeImport('./src/routes/treatment.routes', 'Treatment');
const appointmentRoutes = safeImport('./src/routes/appointment.routes', 'Appointment');
const profileRoutes = safeImport('./src/routes/profile.routes', 'Profile');
const professionalRoutes = safeImport('./src/routes/professional.routes', 'Professional');

// Rutas nuevas del schema modular
const reviewRoutes = safeImport('./src/routes/review.routes', 'Review');
const analyticsRoutes = safeImport('./src/routes/analytics.routes', 'Analytics');
const consentRoutes = safeImport('./src/routes/consent.routes', 'Consent');

// Rutas opcionales
const dashboardRoutes = safeImport('./src/routes/dashboard.routes', 'Dashboard');
const beautyPointsRoutes = safeImport('./src/routes/beautyPoints.routes', 'BeautyPoints');
const paymentRoutes = safeImport('./src/routes/payment.routes', 'Payment');
const notificationsRoutes = safeImport('./src/routes/notifications.routes', 'Notifications');
const webhookRoutes = safeImport('./src/routes/webhook.routes', 'Webhook');

// ============================================================================
// PRISMA - INICIALIZACIÓN CON CONFIGURACIÓN MEJORADA
// ============================================================================
let prisma = null;

const initPrisma = () => {
  try {
    prisma = new PrismaClient({
      log: isProduction ? ['error'] : ['error', 'warn'],
      datasources: { db: { url: process.env.DATABASE_URL } },
      // ✅ NUEVO: Configuración optimizada para schema modular
      errorFormat: 'pretty',
      rejectOnNotFound: false
    });
    console.log('✅ Prisma client initialized with modular schema');
    return true;
  } catch (error) {
    console.error('❌ Prisma init failed:', error.message);
    return false;
  }
};

// ============================================================================
// EXPRESS APP
// ============================================================================
const app = express();

// Trust proxy
app.set('trust proxy', 1);

// Middleware básico
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.use(helmet({ 
  crossOriginEmbedderPolicy: false, 
  contentSecurityPolicy: false 
}));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin', 'X-Requested-With', 'Content-Type', 'Accept', 
    'Authorization', 'Cache-Control', 'X-API-Version'
  ]
}));

// ✅ MEJORADO: Rate limiting más granular
const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message } },
  skip: (req) => req.path === '/health'
});

// Rate limiters específicos
const generalLimiter = createLimiter(15 * 60 * 1000, 1000, 'Too many requests');
const authLimiter = createLimiter(15 * 60 * 1000, 10, 'Too many auth attempts');
const paymentLimiter = createLimiter(60 * 1000, 5, 'Too many payment requests');

app.use('/api/auth', authLimiter);
app.use('/api/payments', paymentLimiter);
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(compression());

// ============================================================================
// HEALTH CHECK - MEJORADO PARA SCHEMA MODULAR
// ============================================================================
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '3.0.0-MODULAR', // ✅ ACTUALIZADO
    port: PORT,
    schema: 'modular-v3' // ✅ NUEVO
  };

  // Test DB connection con queries del nuevo schema
  if (prisma) {
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1 as test`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DB timeout')), 3000)
        )
      ]);
      
      // ✅ NUEVO: Test de integridad del schema modular
      const [clinicCount, userCount, appointmentCount] = await Promise.all([
        prisma.clinic.count(),
        prisma.user.count(),
        prisma.appointment.count()
      ]);
      
      health.database = 'connected';
      health.stats = {
        clinics: clinicCount,
        users: userCount,
        appointments: appointmentCount
      };
    } catch (error) {
      health.database = 'error';
      health.databaseError = error.message;
    }
  } else {
    health.database = 'not_initialized';
  }

  health.responseTime = Date.now() - startTime;
  res.status(200).json(health);
});

// ============================================================================
// ROOT ENDPOINT - ACTUALIZADO PARA SCHEMA MODULAR
// ============================================================================
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Belleza Estética API',
    version: '3.0.0-MODULAR', // ✅ ACTUALIZADO
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    schema: 'modular-v3',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      treatments: '/api/treatments',
      appointments: '/api/appointments',
      profile: '/api/user',
      clinics: '/api/clinics',
      professionals: '/api/professionals',
      // ✅ NUEVOS ENDPOINTS
      reviews: '/api/reviews',
      analytics: '/api/analytics',
      consents: '/api/consents'
    },
    features: {
      modularSchema: true,
      legalCompliance: true,
      stripeIntegration: true,
      reviewSystem: true,
      analytics: true
    }
  });
});

// ============================================================================
// MIDDLEWARE DE VALIDACIÓN PARA NUEVOS ENUMS
// ============================================================================
const validateEnums = (req, res, next) => {
  // Validar appointment status si está presente
  if (req.body.status && req.path.includes('/appointments/')) {
    if (!validateAppointmentStatus(req.body.status)) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Invalid appointment status',
          validValues: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED']
        }
      });
    }
  }

  // Validar user role si está presente
  if (req.body.role && req.path.includes('/user')) {
    if (!validateUserRole(req.body.role)) {
      return res.status(400).json({
        success: false,
        error: { 
          message: 'Invalid user role',
          validValues: ['CLIENT', 'VIP_CLIENT', 'PROFESSIONAL', 'MANAGER', 'ADMIN']
        }
      });
    }
  }

  next();
};

app.use('/api', validateEnums);

// ============================================================================
// RUTAS PRINCIPALES
// ============================================================================

// Auth routes (críticas)
if (authRoutes) {
  app.use('/api/auth', authRoutes);
} else {
  app.use('/api/auth', (req, res) => {
    res.status(503).json({
      success: false,
      error: { message: 'Auth service not available' }
    });
  });
}

// Treatment routes
if (treatmentRoutes) {
  app.use('/api/treatments', treatmentRoutes);
} else {
  app.use('/api/treatments', (req, res) => {
    res.status(503).json({
      success: false,
      error: { message: 'Treatment service not available' }
    });
  });
}

// Appointment routes
if (appointmentRoutes) {
  app.use('/api/appointments', appointmentRoutes);
} else {
  app.use('/api/appointments', (req, res) => {
    res.status(503).json({
      success: false,
      error: { message: 'Appointment service not available' }
    });
  });
}

// Profile routes
if (profileRoutes) {
  app.use('/api/user', profileRoutes);
} else {
  app.use('/api/user', (req, res) => {
    res.status(503).json({
      success: false,
      error: { message: 'Profile service not available' }
    });
  });
}

// Professionals routes
if (professionalRoutes) {
  app.use('/api/professionals', professionalRoutes);
} else {
  app.use('/api/professionals', (req, res) => {
    res.status(503).json({
      success: false,
      error: { message: 'Professional service not available' }
    });
  });
}

// ✅ NUEVAS RUTAS DEL SCHEMA MODULAR
if (reviewRoutes) {
  app.use('/api/reviews', reviewRoutes);
}

if (analyticsRoutes) {
  app.use('/api/analytics', analyticsRoutes);
}

if (consentRoutes) {
  app.use('/api/consents', consentRoutes);
}

// ============================================================================
// CLÍNICAS ENDPOINT - MEJORADO PARA SCHEMA MODULAR
// ============================================================================
app.get('/api/clinics', async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        success: false,
        error: { message: 'Database not available' }
      });
    }

    // ✅ MEJORADO: Query con nuevos campos del schema modular
    const clinics = await Promise.race([
      prisma.clinic.findMany({
        where: { 
          isActive: true,
          emailVerified: true // ✅ NUEVO: Solo clínicas verificadas
        },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          postalCode: true, // ✅ NUEVO
          logoUrl: true,
          address: true,
          phone: true,
          email: true,
          websiteUrl: true,
          subscriptionPlan: true, // ✅ NUEVO: Mostrar plan
          isVerified: true, // ✅ NUEVO
          // ✅ NUEVO: Estadísticas básicas
          _count: {
            select: {
              professionals: { where: { isActive: true } },
              treatments: { where: { isActive: true } },
              users: { where: { isActive: true } }
            }
          }
        },
        orderBy: [
          { isVerified: 'desc' }, // ✅ NUEVO: Verificadas primero
          { subscriptionPlan: 'desc' }, // Premium primero
          { name: 'asc' }
        ]
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      )
    ]);
    
    console.log(`✅ Retrieved ${clinics.length} verified clinics successfully`);
    
    res.json({
      success: true,
      data: clinics.map(clinic => ({
        ...clinic,
        stats: clinic._count,
        _count: undefined // Remover el campo interno
      })),
      total: clinics.length,
      version: '3.0.0-MODULAR'
    });
    
  } catch (error) {
    console.error('❌ Clinics endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Error retrieving clinics', 
        details: error.message 
      }
    });
  }
});

app.get('/api/clinics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!prisma) {
      return res.status(503).json({
        success: false,
        error: { message: 'Database not available' }
      });
    }

    // ✅ MEJORADO: Query detallada con nuevos campos
    const clinic = await Promise.race([
      prisma.clinic.findFirst({
        where: { 
          OR: [{ id }, { slug: id }],
          isActive: true 
        },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          postalCode: true, // ✅ NUEVO
          logoUrl: true,
          address: true,
          phone: true,
          email: true,
          websiteUrl: true,
          timezone: true,
          isActive: true,
          isVerified: true, // ✅ NUEVO
          emailVerified: true, // ✅ NUEVO
          subscriptionPlan: true, // ✅ NUEVO
          onboardingCompleted: true, // ✅ NUEVO
          businessHours: true,
          // ✅ NUEVO: Configuración legal
          medicalLicense: true,
          healthRegistration: true,
          autonomousCommunity: true,
          // ✅ NUEVO: Capacidades
          enableVipProgram: true,
          enableOnlineBooking: true,
          enablePayments: true,
          enableLoyaltyProgram: true,
          createdAt: true,
          // ✅ NUEVO: Estadísticas detalladas
          _count: {
            select: {
              professionals: { where: { isActive: true } },
              treatments: { where: { isActive: true } },
              users: { where: { isActive: true } },
              appointments: { where: { status: 'COMPLETED' } }
            }
          }
        }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 3000)
      )
    ]);
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: { message: 'Clinic not found' }
      });
    }
    
    console.log(`✅ Retrieved clinic details for: ${clinic.name}`);
    
    // ✅ NUEVO: Formatear respuesta con estadísticas
    const response = {
      ...clinic,
      stats: clinic._count,
      capabilities: {
        vipProgram: clinic.enableVipProgram,
        onlineBooking: clinic.enableOnlineBooking,
        payments: clinic.enablePayments,
        loyaltyProgram: clinic.enableLoyaltyProgram
      },
      compliance: {
        medicalLicense: !!clinic.medicalLicense,
        healthRegistration: !!clinic.healthRegistration,
        autonomousCommunity: clinic.autonomousCommunity
      },
      _count: undefined, // Remover campo interno
      enableVipProgram: undefined,
      enableOnlineBooking: undefined,
      enablePayments: undefined,
      enableLoyaltyProgram: undefined,
      medicalLicense: undefined,
      healthRegistration: undefined
    };
    
    res.json({ 
      success: true, 
      data: response,
      version: '3.0.0-MODULAR'
    });
    
  } catch (error) {
    console.error('❌ Clinic detail error:', error.message);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Error retrieving clinic details', 
        details: error.message 
      }
    });
  }
});

// ============================================================================
// RUTAS OPCIONALES
// ============================================================================
if (dashboardRoutes) app.use('/api/dashboard', dashboardRoutes);
if (beautyPointsRoutes) app.use('/api/beauty-points', beautyPointsRoutes);
if (paymentRoutes) app.use('/api/payments', paymentRoutes);
if (notificationsRoutes) app.use('/api/notifications', notificationsRoutes);
if (webhookRoutes) app.use('/api/webhooks', webhookRoutes);

// ============================================================================
// ERROR HANDLING - MEJORADO
// ============================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method,
      version: '3.0.0-MODULAR'
    }
  });
});

// Global error handler mejorado
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.message);
  
  if (res.headersSent) return next(err);
  
  // ✅ NUEVO: Manejo específico de errores de Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        message: 'Duplicate entry conflict',
        code: 'DUPLICATE_ENTRY',
        field: err.meta?.target?.[0] || 'unknown'
      }
    });
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: {
        message: 'Record not found',
        code: 'NOT_FOUND'
      }
    });
  }
  
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        details: err.message,
        stack: err.stack
      })
    }
  });
});

// ============================================================================
// SERVER STARTUP - MEJORADO
// ============================================================================
const startServer = async () => {
  try {
    console.log('🔄 Initializing server with modular schema...');
    
    // Initialize Prisma
    const prismaOk = initPrisma();
    
    if (prismaOk && prisma) {
      try {
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('DB connection timeout')), 10000)
          )
        ]);
        console.log('✅ Database connected successfully');
        
        // ✅ NUEVO: Test del schema modular
        try {
          const schemaTest = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'clinics', 'appointments', 'treatments', 'consent_form_templates')
          `;
          console.log(`✅ Modular schema validated - ${schemaTest.length} core tables found`);
        } catch (schemaError) {
          console.warn('⚠️ Schema validation warning:', schemaError.message);
        }
        
      } catch (dbError) {
        console.warn('⚠️ Database connection failed:', dbError.message);
        console.log('💡 Server will continue without database');
      }
    }
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🎯 SERVER READY (MODULAR SCHEMA v3.0):');
      console.log(`   🌐 Port: ${PORT}`);
      console.log(`   📊 Database: ${prisma ? 'connected' : 'disconnected'}`);
      console.log(`   🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   📋 Schema: modular-v3`);
      console.log(`   ✅ Health check: http://localhost:${PORT}/health`);
      console.log(`   🏥 Clinics: http://localhost:${PORT}/api/clinics`);
      console.log(`   💉 Treatments: http://localhost:${PORT}/api/treatments`);
      console.log(`   📅 Appointments: http://localhost:${PORT}/api/appointments`);
      console.log(`   👨‍⚕️ Professionals: http://localhost:${PORT}/api/professionals`);
      console.log(`   ⭐ Reviews: http://localhost:${PORT}/api/reviews`); // ✅ NUEVO
      console.log(`   📊 Analytics: http://localhost:${PORT}/api/analytics`); // ✅ NUEVO
      console.log(`   📝 Consents: http://localhost:${PORT}/api/consents`); // ✅ NUEVO
    });
    
    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n📡 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          if (prisma) {
            await prisma.$disconnect();
            console.log('✅ Database disconnected');
          }
          console.log('✅ Server stopped gracefully');
          process.exit(0);
        } catch (error) {
          console.error('❌ Shutdown error:', error.message);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    return server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

// Start server
if (require.main === module) {
  startServer();
}

module.exports = app;