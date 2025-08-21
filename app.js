// ============================================================================
// app.js - RAILWAY COMPATIBLE v3.0 ✅
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
// CONFIGURACIÓN RAILWAY
// ============================================================================
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;

console.log('🚀 Belleza Estética API v3.0 - RAILWAY COMPATIBLE');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Port: ${PORT}`);

// ============================================================================
// VALIDADORES PARA ENUMS
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

// Rutas del schema modular
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
// PRISMA - CONFIGURACIÓN RAILWAY COMPATIBLE ✅
// ============================================================================
let prisma = null;

const initPrisma = () => {
  try {
    prisma = new PrismaClient({
      log: isProduction ? ['error'] : ['error', 'warn'],
      datasources: { db: { url: process.env.DATABASE_URL } },
      errorFormat: 'pretty'
      // ✅ NO incluir rejectOnNotFound (deprecated en Railway)
    });
    console.log('✅ Prisma client initialized for Railway');
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

// Trust proxy para Railway
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

// Rate limiting optimizado para Railway
const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message } },
  skip: (req) => req.path === '/health' || req.path === '/debug/railway'
});

const generalLimiter = createLimiter(15 * 60 * 1000, 1000, 'Too many requests');
const authLimiter = createLimiter(15 * 60 * 1000, 20, 'Too many auth attempts');
const paymentLimiter = createLimiter(60 * 1000, 10, 'Too many payment requests');

app.use('/api/auth', authLimiter);
app.use('/api/payments', paymentLimiter);
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(compression());

// ============================================================================
// HEALTH CHECK - RAILWAY COMPATIBLE ✅
// ============================================================================
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '3.0.0-RAILWAY',
    port: PORT,
    railway: true
  };

  // Test DB connection SIN seed data
  if (prisma) {
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1 as test`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DB timeout')), 3000)
        )
      ]);
      
      // ✅ Test básico de tablas sin campos problemáticos
      const [clinicCount, userCount] = await Promise.all([
        prisma.$queryRaw`SELECT COUNT(*) as count FROM clinics`,
        prisma.$queryRaw`SELECT COUNT(*) as count FROM users`
      ]);
      
      health.database = 'connected';
      health.stats = {
        clinics: Number(clinicCount[0]?.count || 0),
        users: Number(userCount[0]?.count || 0)
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
// ROOT ENDPOINT - RAILWAY COMPATIBLE ✅
// ============================================================================
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Belleza Estética API',
    version: '3.0.0-RAILWAY',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    railway: true,
    endpoints: {
      health: '/health',
      debug: '/debug/railway',
      auth: '/api/auth',
      treatments: '/api/treatments',
      appointments: '/api/appointments',
      profile: '/api/user',
      clinics: '/api/clinics',
      professionals: '/api/professionals',
      reviews: '/api/reviews',
      analytics: '/api/analytics',
      consents: '/api/consents'
    },
    features: {
      railwayCompatible: true,
      modularSchema: true,
      rawSQLFallbacks: true
    }
  });
});

// ============================================================================
// DEBUG ENDPOINT PARA RAILWAY ✅
// ============================================================================
app.get('/debug/railway', async (req, res) => {
  try {
    console.log('🔍 Railway debug endpoint called');
    
    const debug = {
      environment: process.env.NODE_ENV,
      hasDatabase: !!process.env.DATABASE_URL,
      databaseHost: process.env.DATABASE_URL ? 'configured' : 'missing',
      prismaConnected: false,
      tables: {},
      errors: []
    };
    
    // Test Prisma connection
    try {
      await prisma.$connect();
      debug.prismaConnected = true;
      
      // Test tablas básicas con raw SQL
      try {
        const clinics = await prisma.$queryRaw`SELECT COUNT(*) as count FROM clinics`;
        debug.tables.clinics = Number(clinics[0]?.count || 0);
      } catch (e) {
        debug.errors.push(`Clinics table: ${e.message}`);
      }
      
      try {
        const users = await prisma.$queryRaw`SELECT COUNT(*) as count FROM users`;
        debug.tables.users = Number(users[0]?.count || 0);
      } catch (e) {
        debug.errors.push(`Users table: ${e.message}`);
      }
      
      // Test campos específicos
      try {
        const userFields = await prisma.$queryRaw`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'users' 
          ORDER BY ordinal_position LIMIT 10
        `;
        debug.userFields = userFields.map(f => f.column_name);
      } catch (e) {
        debug.errors.push(`User fields: ${e.message}`);
      }
      
    } catch (dbError) {
      debug.errors.push(`Database connection: ${dbError.message}`);
    }
    
    res.json({
      success: true,
      debug,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// ============================================================================
// MIDDLEWARE DE VALIDACIÓN
// ============================================================================
const validateEnums = (req, res, next) => {
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
}

// Appointment routes
if (appointmentRoutes) {
  app.use('/api/appointments', appointmentRoutes);
}

// Profile routes
if (profileRoutes) {
  app.use('/api/user', profileRoutes);
}

// Professionals routes
if (professionalRoutes) {
  app.use('/api/professionals', professionalRoutes);
}

// Nuevas rutas del schema modular
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
// CLÍNICAS ENDPOINT - RAILWAY COMPATIBLE ✅
// ============================================================================
app.get('/api/clinics', async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        success: false,
        error: { message: 'Database not available' }
      });
    }

    // ✅ RAW SQL QUERY PARA RAILWAY
    let clinics;
    try {
      clinics = await prisma.$queryRaw`
        SELECT 
          id, name, slug, city, postal_code, logo_url, 
          address, phone, website_url, subscription_plan,
          is_verified, enable_online_booking, enable_vip_program, enable_payments
        FROM clinics 
        WHERE is_active = true AND is_verified = true
        ORDER BY is_verified DESC, subscription_plan DESC, name ASC
      `;
    } catch (rawError) {
      console.log('⚠️ Raw query failed, using Prisma method:', rawError.message);
      
      // Fallback a Prisma normal
      clinics = await prisma.clinic.findMany({
        where: { 
          isActive: true,
          isVerified: true
        },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          postalCode: true,
          logoUrl: true,
          address: true,
          phone: true,
          websiteUrl: true,
          subscriptionPlan: true,
          isVerified: true,
          enableOnlineBooking: true,
          enableVipProgram: true,
          enablePayments: true
        },
        orderBy: [
          { isVerified: 'desc' },
          { subscriptionPlan: 'desc' },
          { name: 'asc' }
        ]
      });
    }
    
    console.log(`✅ Retrieved ${clinics.length} verified clinics`);
    
    res.json({
      success: true,
      data: clinics,
      total: clinics.length,
      version: '3.0.0-RAILWAY'
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

    // ✅ RAW SQL QUERY PARA RAILWAY
    let clinic;
    try {
      clinic = await prisma.$queryRaw`
        SELECT 
          id, name, slug, city, postal_code, logo_url, address, phone, 
          website_url, timezone, is_active, is_verified, subscription_plan,
          enable_vip_program, enable_online_booking, enable_payments,
          created_at
        FROM clinics 
        WHERE (id = ${id} OR slug = ${id}) AND is_active = true
        LIMIT 1
      `;
      clinic = clinic[0] || null;
    } catch (rawError) {
      console.log('⚠️ Raw query failed, using Prisma method:', rawError.message);
      
      clinic = await prisma.clinic.findFirst({
        where: { 
          OR: [{ id }, { slug: id }],
          isActive: true 
        },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          postalCode: true,
          logoUrl: true,
          address: true,
          phone: true,
          websiteUrl: true,
          timezone: true,
          isActive: true,
          isVerified: true,
          subscriptionPlan: true,
          enableVipProgram: true,
          enableOnlineBooking: true,
          enablePayments: true,
          createdAt: true
        }
      });
    }
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: { message: 'Clinic not found' }
      });
    }
    
    console.log(`✅ Retrieved clinic details for: ${clinic.name}`);
    
    res.json({ 
      success: true, 
      data: clinic,
      version: '3.0.0-RAILWAY'
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
// ERROR HANDLING - RAILWAY COMPATIBLE ✅
// ============================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method,
      version: '3.0.0-RAILWAY'
    }
  });
});

// Global error handler Railway compatible
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.message);
  
  if (res.headersSent) return next(err);
  
  // Errores específicos de Prisma para Railway
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
// SERVER STARTUP - RAILWAY COMPATIBLE ✅
// ============================================================================
const startServer = async () => {
  try {
    console.log('🔄 Initializing Railway server...');
    
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
        
        // ✅ NO ejecutar seed data automáticamente en Railway
        // ❌ NO hacer: await ensureSeedData();
        
      } catch (dbError) {
        console.warn('⚠️ Database connection failed:', dbError.message);
        console.log('💡 Server will continue without database');
      }
    }
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🎯 RAILWAY SERVER READY:');
      console.log(`   🌐 Port: ${PORT}`);
      console.log(`   📊 Database: ${prisma ? 'connected' : 'disconnected'}`);
      console.log(`   🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   🚂 Railway: Compatible`);
      console.log(`   ✅ Health check: https://clinicbackend-production-9e33.up.railway.app/health`);
      console.log(`   🔍 Debug: https://clinicbackend-production-9e33.up.railway.app/debug/railway`);
      console.log(`   🏥 Clinics: https://clinicbackend-production-9e33.up.railway.app/api/clinics`);
      console.log(`   🔐 Auth: https://clinicbackend-production-9e33.up.railway.app/api/auth`);
    });
    
    // Graceful shutdown para Railway
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

// Error handling para Railway
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