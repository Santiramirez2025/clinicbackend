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
// CONFIGURACIÓN RAILWAY - SIMPLIFICADA ✅
// ============================================================================
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;

console.log('🚀 Belleza Estética API v2.0');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Port: ${PORT}`);

// ============================================================================
// IMPORTAR RUTAS DE FORMA SEGURA ✅
// ============================================================================
const safeImport = (path, name) => {
  try {
    const route = require(path);
    console.log(`✅ ${name} routes loaded`);
    return route;
  } catch (error) {
    console.log(`⚠️ ${name} routes not available`);
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
const vipRoutes = safeImport('./src/routes/vip.routes', 'VIP');
const paymentRoutes = safeImport('./src/routes/payment.routes', 'Payment');
const notificationsRoutes = safeImport('./src/routes/notifications.routes', 'Notifications');
const webhookRoutes = safeImport('./src/routes/webhook.routes', 'Webhook');

// ============================================================================
// PRISMA - INICIALIZACIÓN SIMPLIFICADA ✅
// ============================================================================
let prisma = null;

const initPrisma = () => {
  try {
    prisma = new PrismaClient({
      log: isProduction ? ['error'] : ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    console.log('✅ Prisma client created');
    return true;
  } catch (error) {
    console.error('❌ Prisma init failed:', error.message);
    return false;
  }
};

// ============================================================================
// EXPRESS APP ✅
// ============================================================================
const app = express();

// Trust proxy for Railway
app.set('trust proxy', 1);

// ============================================================================
// MIDDLEWARES BÁSICOS ✅
// ============================================================================

// Logging
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Seguridad básica
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS permisivo para apps móviles
app.use(cors({
  origin: true, // Permitir todos los orígenes por ahora
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control']
}));

// Rate limiting básico
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(compression());

// ============================================================================
// HEALTH CHECK - PRIMERA PRIORIDAD ✅
// ============================================================================
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0',
    port: PORT
  };

  // Test de base de datos (no crítico para health)
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
  
  // Siempre retornar 200 si el servidor funciona
  res.status(200).json(health);
});

// ============================================================================
// RUTAS PRINCIPALES ✅
// ============================================================================

// Root
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Belleza Estética API',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Auth routes (críticas)
if (authRoutes) {
  app.use('/api/auth', authRoutes);
} else {
  console.error('❌ CRITICAL: Auth routes required but not found');
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
  app.get('/api/treatments', (req, res) => {
    res.json({
      success: true,
      data: {
        treatments: [
          {
            id: 't1',
            name: 'Limpieza Facial',
            description: 'Tratamiento de limpieza facial profunda',
            duration: 60,
            durationMinutes: 60,
            price: 5000,
            category: 'Facial',
            emoji: '✨'
          },
          {
            id: 't2',
            name: 'Masaje Relajante',
            description: 'Masaje corporal completo',
            duration: 90,
            durationMinutes: 90,
            price: 7000,
            category: 'Corporal',
            emoji: '💆‍♀️'
          }
        ]
      }
    });
  });
}

// ============================================================================
// CLÍNICAS - ENDPOINTS CRÍTICOS ✅
// ============================================================================
app.get('/api/clinics', async (req, res) => {
  try {
    let clinics = [];
    
    // Solo intentar BD si prisma está disponible
    if (prisma) {
      try {
        const dbTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 5000)
        );
        
        const clinicsQuery = prisma.clinic.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            logoUrl: true,
            address: true,
            phone: true,
            description: true
          },
          orderBy: { name: 'asc' }
        });

        clinics = await Promise.race([clinicsQuery, dbTimeout]);
        
      } catch (dbError) {
        console.warn('⚠️ Database query failed:', dbError.message);
      }
    }
    
    // Fallback data
    if (clinics.length === 0) {
      clinics = [
        {
          id: 'madrid-centro',
          name: 'Clínica Madrid Centro',
          slug: 'madrid-centro',
          city: 'Madrid',
          address: 'Calle Gran Vía, 28, Madrid',
          phone: '+34 91 123 4567',
          logoUrl: null,
          description: 'Centro especializado en tratamientos estéticos'
        },
        {
          id: 'barcelona-eixample',
          name: 'Clínica Barcelona Eixample',
          slug: 'barcelona-eixample',
          city: 'Barcelona',
          address: 'Passeig de Gràcia, 95, Barcelona',
          phone: '+34 93 234 5678',
          logoUrl: null,
          description: 'Tratamientos de belleza y bienestar'
        },
        {
          id: 'cmea67zey00040jpk5c8638ao',
          name: 'Belleza Estética Premium',
          slug: 'premium',
          city: 'Madrid',
          address: 'Avenida Principal 123, Madrid',
          phone: '+34 91 555 0123',
          logoUrl: null,
          description: 'Centro premium de medicina estética'
        }
      ];
    }
    
    res.json({
      success: true,
      data: clinics,
      total: clinics.length
    });
    
  } catch (error) {
    console.error('❌ Clinics endpoint error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
});

app.get('/api/clinics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let clinic = null;
    
    if (prisma) {
      try {
        const dbTimeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database timeout')), 3000)
        );
        
        const clinicQuery = prisma.clinic.findFirst({
          where: { 
            OR: [{ id }, { slug: id }],
            isActive: true 
          }
        });

        clinic = await Promise.race([clinicQuery, dbTimeout]);
        
      } catch (dbError) {
        console.warn('⚠️ Clinic query failed:', dbError.message);
      }
    }
    
    // Fallback
    if (!clinic) {
      const demoClinics = {
        'madrid-centro': { 
          id: 'madrid-centro', 
          name: 'Clínica Madrid Centro', 
          city: 'Madrid',
          address: 'Calle Gran Vía, 28, Madrid',
          phone: '+34 91 123 4567'
        },
        'barcelona-eixample': { 
          id: 'barcelona-eixample', 
          name: 'Clínica Barcelona Eixample', 
          city: 'Barcelona'
        },
        'cmea67zey00040jpk5c8638ao': {
          id: 'cmea67zey00040jpk5c8638ao',
          name: 'Belleza Estética Premium',
          city: 'Madrid'
        }
      };
      clinic = demoClinics[id];
    }
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: { message: 'Clinic not found' }
      });
    }
    
    res.json({ success: true, data: clinic });
    
  } catch (error) {
    console.error('❌ Clinic detail error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
});

// ============================================================================
// RUTAS OPCIONALES CON FALLBACKS MÍNIMOS ✅
// ============================================================================

// Appointments
if (appointmentRoutes) {
  app.use('/api/appointments', appointmentRoutes);
} else {
  const appointmentRouter = express.Router();
  
  appointmentRouter.get('/health', (req, res) => {
    res.json({ success: true, message: 'Appointment fallback active' });
  });
  
  appointmentRouter.get('/dashboard', (req, res) => {
    res.json({
      success: true,
      data: {
        nextAppointment: null,
        featuredTreatments: [],
        todayAppointments: 0,
        user: { beautyPoints: 0, vipStatus: false }
      }
    });
  });
  
  appointmentRouter.get('/user', (req, res) => {
    res.json({
      success: true,
      data: { appointments: [] }
    });
  });
  
  appointmentRouter.get('/availability/:clinicId/:date', (req, res) => {
    res.json({
      success: true,
      data: {
        date: req.params.date,
        clinicId: req.params.clinicId,
        availableSlots: [],
        totalSlots: 0
      }
    });
  });
  
  app.use('/api/appointments', appointmentRouter);
}

// Profile
if (profileRoutes) {
  app.use('/api/user', profileRoutes);
} else {
  app.get('/api/user/profile', (req, res) => {
    res.json({
      success: true,
      data: {
        id: 'demo-user-123',
        firstName: 'Demo',
        lastName: 'User',
        email: 'demo@example.com',
        beautyPoints: 0,
        vipStatus: false
      }
    });
  });
}

// Otras rutas opcionales
if (dashboardRoutes) app.use('/api/dashboard', dashboardRoutes);
if (beautyPointsRoutes) app.use('/api/beauty-points', beautyPointsRoutes);
if (vipRoutes) app.use('/api/vip', vipRoutes);
if (paymentRoutes) app.use('/api/payments', paymentRoutes);
if (notificationsRoutes) app.use('/api/notifications', notificationsRoutes);
if (webhookRoutes) app.use('/api/webhooks', webhookRoutes);

// ============================================================================
// ERROR HANDLING ✅
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
  console.error('❌ Global error:', err);
  
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    }
  });
});

// ============================================================================
// INICIALIZACIÓN Y STARTUP ✅
// ============================================================================

const startServer = async () => {
  try {
    console.log('🔄 Initializing server...');
    
    // Inicializar Prisma (no crítico)
    const prismaOk = initPrisma();
    
    if (prismaOk && prisma) {
      try {
        console.log('🔄 Testing database connection...');
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('DB connection timeout')), 10000))
        ]);
        console.log('✅ Database connected');
      } catch (dbError) {
        console.warn('⚠️ Database connection failed:', dbError.message);
        console.log('💡 Server will continue with fallback data');
      }
    }
    
    // Iniciar servidor
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🎯 SERVER READY:');
      console.log(`   🌐 Port: ${PORT}`);
      console.log(`   📊 Database: ${prisma ? 'initialized' : 'fallback mode'}`);
      console.log(`   🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('   ✅ Accepting connections');
      console.log('   🏥 Health check: /health');
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
          console.log('✅ Server stopped');
          process.exit(0);
        } catch (error) {
          console.error('❌ Shutdown error:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    return server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app;