// ============================================================================
// app.js - Belleza Estética API v2.0 - PRODUCTION READY ✅ FIXED
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

console.log('🚀 Belleza Estética API v2.0 - FIXED');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Port: ${PORT}`);

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

// Rutas opcionales
const dashboardRoutes = safeImport('./src/routes/dashboard.routes', 'Dashboard');
const beautyPointsRoutes = safeImport('./src/routes/beautyPoints.routes', 'BeautyPoints');
const paymentRoutes = safeImport('./src/routes/payment.routes', 'Payment');
const notificationsRoutes = safeImport('./src/routes/notifications.routes', 'Notifications');
const webhookRoutes = safeImport('./src/routes/webhook.routes', 'Webhook');

// ============================================================================
// PRISMA - INICIALIZACIÓN
// ============================================================================
let prisma = null;

const initPrisma = () => {
  try {
    prisma = new PrismaClient({
      log: isProduction ? ['error'] : ['error', 'warn'],
      datasources: { db: { url: process.env.DATABASE_URL } }
    });
    console.log('✅ Prisma client initialized');
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
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control']
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health'
}));

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(compression());

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.1-FIXED',
    port: PORT
  };

  // Test DB connection
  if (prisma) {
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1 as test`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000))
      ]);
      health.database = 'connected';
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
// ROOT ENDPOINT
// ============================================================================
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Belleza Estética API',
    version: '2.0.1-FIXED',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      treatments: '/api/treatments',
      appointments: '/api/appointments',
      profile: '/api/user',
      clinics: '/api/clinics'
    }
  });
});

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

// ============================================================================
// CLÍNICAS ENDPOINT - ✅ FIXED: REMOVED DESCRIPTION FIELD
// ============================================================================
app.get('/api/clinics', async (req, res) => {
  try {
    if (!prisma) {
      return res.status(503).json({
        success: false,
        error: { message: 'Database not available' }
      });
    }

    const clinics = await Promise.race([
      prisma.clinic.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          logoUrl: true,
          address: true,
          phone: true
          // ✅ REMOVED: description: true, - FIELD DOESN'T EXIST IN SCHEMA
        },
        orderBy: { name: 'asc' }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      )
    ]);
    
    console.log(`✅ Retrieved ${clinics.length} clinics successfully`);
    
    res.json({
      success: true,
      data: clinics,
      total: clinics.length
    });
    
  } catch (error) {
    console.error('❌ Clinics endpoint error:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Error retrieving clinics', details: error.message }
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
          logoUrl: true,
          address: true,
          phone: true,
          email: true,
          websiteUrl: true,
          timezone: true,
          isActive: true,
          createdAt: true
          // ✅ REMOVED: description field - doesn't exist in schema
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
    
    res.json({ success: true, data: clinic });
    
  } catch (error) {
    console.error('❌ Clinic detail error:', error.message);
    res.status(500).json({
      success: false,
      error: { message: 'Error retrieving clinic details', details: error.message }
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
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.originalUrl
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Global error:', err.message);
  
  if (res.headersSent) return next(err);
  
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    }
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================
const startServer = async () => {
  try {
    console.log('🔄 Initializing server...');
    
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
        
        // Test database with a simple query
        const testQuery = await prisma.$queryRaw`SELECT 1 as connection_test`;
        console.log('✅ Database test query successful');
        
      } catch (dbError) {
        console.warn('⚠️ Database connection failed:', dbError.message);
        console.log('💡 Server will continue without database');
      }
    }
    
    // Start server
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🎯 SERVER READY:');
      console.log(`   🌐 Port: ${PORT}`);
      console.log(`   📊 Database: ${prisma ? 'connected' : 'disconnected'}`);
      console.log(`   🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   ✅ Health check: http://localhost:${PORT}/health`);
      console.log(`   🏥 Clinics: http://localhost:${PORT}/api/clinics`);
      console.log(`   💉 Treatments: http://localhost:${PORT}/api/treatments`);
      console.log(`   📅 Appointments: http://localhost:${PORT}/api/appointments`);
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