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
// CONFIGURACIÓN PARA RAILWAY ✅
// ============================================================================
const isProduction = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Belleza Estética API...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 Port: ${PORT}`);
console.log(`🔗 Database URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);

// ============================================================================
// IMPORTAR RUTAS CON MANEJO ROBUSTO ✅
// ============================================================================
const importRoute = (path, name, required = false) => {
  try {
    const route = require(path);
    console.log(`✅ ${name} routes loaded`);
    return route;
  } catch (error) {
    console.log(`⚠️ ${name} routes not found: ${error.message}`);
    if (required) {
      console.error(`❌ CRITICAL: ${name} routes are required`);
      process.exit(1);
    }
    return null;
  }
};

// Rutas críticas
const authRoutes = importRoute('./src/routes/auth.routes', 'Auth', true);
const treatmentRoutes = importRoute('./src/routes/treatment.routes', 'Treatment');

// Rutas opcionales
const appointmentRoutes = importRoute('./src/routes/appointment.routes', 'Appointment');
const profileRoutes = importRoute('./src/routes/profile.routes', 'Profile');
const dashboardRoutes = importRoute('./src/routes/dashboard.routes', 'Dashboard');
const beautyPointsRoutes = importRoute('./src/routes/beautyPoints.routes', 'BeautyPoints');
const vipRoutes = importRoute('./src/routes/vip.routes', 'VIP');
const paymentRoutes = importRoute('./src/routes/payment.routes', 'Payment');
const notificationsRoutes = importRoute('./src/routes/notifications.routes', 'Notifications');
const offersRoutes = importRoute('./src/routes/offers.routes', 'Offers');
const webhookRoutes = importRoute('./src/routes/webhook.routes', 'Webhook');

// Error handler
const errorHandler = importRoute('./src/middleware/error.middleware', 'Error')?.errorHandler || 
  ((err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
      }
    });
  });

// ============================================================================
// PRISMA SETUP PARA RAILWAY ✅
// ============================================================================
let prisma;
try {
  prisma = new PrismaClient({
    log: isProduction ? ['error'] : ['query', 'info', 'warn', 'error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  console.log('✅ Prisma client initialized');
} catch (error) {
  console.error('❌ Prisma initialization failed:', error);
  if (isProduction) {
    process.exit(1);
  }
}

// ============================================================================
// EXPRESS APP SETUP ✅
// ============================================================================
const app = express();

// Trust proxy for Railway
app.set('trust proxy', 1);

// ============================================================================
// MIDDLEWARES PARA RAILWAY ✅
// ============================================================================

// Health check temprano (antes de otros middlewares)
app.get('/health', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Test básico del servidor
    const serverStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      version: '2.0.0'
    };

    // Test de base de datos
    if (prisma) {
      try {
        await prisma.$queryRaw`SELECT 1 as test`;
        serverStatus.database = 'connected';
      } catch (dbError) {
        console.error('❌ Database health check failed:', dbError);
        serverStatus.database = 'error';
        serverStatus.databaseError = dbError.message;
      }
    } else {
      serverStatus.database = 'not_initialized';
    }

    serverStatus.responseTime = Date.now() - startTime;

    // Retornar 200 si el servidor funciona, aunque la BD falle
    res.status(200).json(serverStatus);
    
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: Date.now() - startTime
    });
  }
});

// Logging para Railway
if (isProduction) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Seguridad para Railway
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    }
  } : false,
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false
}));

// CORS configurado para Railway + apps móviles
app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (apps móviles, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = isProduction 
      ? [
          // Agrega aquí tus dominios de producción
          'https://tu-app.com',
          'https://www.tu-app.com',
          // Railway preview deployments
          /^https:\/\/.*\.railway\.app$/,
          // Apps móviles (Expo, React Native)
          /^exp:\/\/.*$/,
          /^exps:\/\/.*$/
        ]
      : [
          'http://localhost:3000',
          'http://localhost:19006',
          /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
          /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
          /^http:\/\/172\.16\.\d+\.\d+:\d+$/,
          /^exp:\/\/.*$/,
          /^exps:\/\/.*$/
        ];
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, true); // Permitir por ahora, loggear para debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control']
}));

// Rate limiting para Railway
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: isProduction ? 1000 : 10000, // Más permisivo para desarrollo
  message: { 
    success: false, 
    error: { 
      message: 'Too many requests, please try again later.',
      retryAfter: '15 minutes'
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting para health checks
    return req.path === '/health' || req.path === '/';
  }
});
app.use('/api/', limiter);

// Body parsing
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: isProduction ? '1mb' : '10mb' }));
app.use(express.urlencoded({ extended: true, limit: isProduction ? '1mb' : '10mb' }));

// Compresión
app.use(compression());

// ============================================================================
// RUTAS PRINCIPALES ✅
// ============================================================================

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Belleza Estética API',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    ...(process.env.NODE_ENV === 'development' && {
      endpoints: {
        health: '/health',
        auth: '/api/auth/*',
        clinics: '/api/clinics',
        treatments: '/api/treatments',
        appointments: '/api/appointments',
        profile: '/api/user/profile'
      }
    })
  });
});

// Auth routes (críticas)
app.use('/api/auth', authRoutes);

// Treatment routes
if (treatmentRoutes) {
  app.use('/api/treatments', treatmentRoutes);
} else {
  // Fallback mínimo para treatments
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
            description: 'Masaje corporal completo para relajación',
            duration: 90,
            durationMinutes: 90,
            price: 7000,
            category: 'Corporal',
            emoji: '💆‍♀️'
          },
          {
            id: 't3',
            name: 'Tratamiento Antiedad',
            description: 'Tratamiento facial antiedad con última tecnología',
            duration: 75,
            durationMinutes: 75,
            price: 12000,
            category: 'Premium',
            emoji: '👑'
          }
        ]
      }
    });
  });
}

// ============================================================================
// RUTAS DE CLÍNICAS - PRODUCCIÓN ✅
// ============================================================================
app.get('/api/clinics', async (req, res) => {
  try {
    let clinics = [];
    
    if (prisma) {
      try {
        clinics = await prisma.clinic.findMany({
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
      } catch (dbError) {
        console.error('⚠️ Database error in clinics:', dbError.message);
      }
    }
    
    // Fallback solo si no hay clínicas
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
    console.error('❌ Error in clinics endpoint:', error);
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
        clinic = await prisma.clinic.findFirst({
          where: { 
            OR: [{ id }, { slug: id }],
            isActive: true 
          }
        });
      } catch (dbError) {
        console.error('⚠️ Database error in clinic detail:', dbError.message);
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
          city: 'Barcelona',
          address: 'Passeig de Gràcia, 95, Barcelona',
          phone: '+34 93 234 5678'
        },
        'cmea67zey00040jpk5c8638ao': {
          id: 'cmea67zey00040jpk5c8638ao',
          name: 'Belleza Estética Premium',
          city: 'Madrid',
          address: 'Avenida Principal 123, Madrid',
          phone: '+34 91 555 0123'
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
    console.error('❌ Error in clinic detail:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
});

// ============================================================================
// RUTAS OPCIONALES CON FALLBACKS ✅
// ============================================================================

// Appointments
if (appointmentRoutes) {
  app.use('/api/appointments', appointmentRoutes);
} else {
  const appointmentRouter = express.Router();
  
  appointmentRouter.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'Appointment service fallback',
      timestamp: new Date().toISOString()
    });
  });
  
  appointmentRouter.get('/dashboard', (req, res) => {
    res.json({
      success: true,
      data: {
        nextAppointment: {
          id: 'apt-demo-123',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          treatment: {
            name: 'Limpieza Facial Profunda',
            duration: 60,
            price: 7500
          },
          status: 'confirmed',
          professional: { name: 'María González' },
          location: {
            name: 'Clínica Madrid Centro',
            address: 'Calle Gran Vía, 28'
          }
        },
        featuredTreatments: [
          { id: 't1', name: 'Masaje Relajante', price: 5000, emoji: '💆‍♀️' },
          { id: 't2', name: 'Tratamiento Antiedad', price: 8500, emoji: '✨' }
        ],
        todayAppointments: 1,
        user: { beautyPoints: 1250, vipStatus: true }
      }
    });
  });
  
  appointmentRouter.get('/user', (req, res) => {
    res.json({
      success: true,
      data: { appointments: [] }
    });
  });
  
  // Availability endpoint crítico
  appointmentRouter.get('/availability/:clinicId/:date', (req, res) => {
    const { clinicId, date } = req.params;
    
    res.json({
      success: true,
      data: {
        date,
        clinicId,
        clinic: {
          id: clinicId,
          name: clinicId === 'cmea67zey00040jpk5c8638ao' ? 'Belleza Estética Premium' : 'Clínica Demo',
          address: 'Dirección demo'
        },
        availableSlots: [
          {
            time: '09:00',
            available: true,
            professionals: [{
              id: 'prof-demo-1',
              name: 'María González',
              specialty: 'Facial',
              rating: 4.8
            }],
            count: 1
          },
          {
            time: '10:00',
            available: true,
            professionals: [{
              id: 'prof-demo-2',
              name: 'Ana Martínez',
              specialty: 'Corporal',
              rating: 4.9
            }],
            count: 1
          }
        ],
        totalSlots: 2
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
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana.garcia@example.com',
        beautyPoints: 1250,
        vipStatus: true,
        phone: '+34 123 456 789',
        avatar: null,
        registrationDate: new Date('2024-01-15').toISOString(),
        totalAppointments: 12,
        favoriteServices: ['Limpieza Facial', 'Masaje Relajante']
      }
    });
  });
}

// Otras rutas
if (dashboardRoutes) app.use('/api/dashboard', dashboardRoutes);
if (beautyPointsRoutes) app.use('/api/beauty-points', beautyPointsRoutes);
if (vipRoutes) app.use('/api/vip', vipRoutes);
if (paymentRoutes) app.use('/api/payments', paymentRoutes);
if (notificationsRoutes) app.use('/api/notifications', notificationsRoutes);
if (offersRoutes) app.use('/api/offers', offersRoutes);
if (webhookRoutes) app.use('/api/webhooks', webhookRoutes);

// ============================================================================
// MANEJO DE ERRORES PARA RAILWAY ✅
// ============================================================================

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method
    }
  });
});

// Error handler
app.use(errorHandler);

// ============================================================================
// INICIALIZACIÓN PARA RAILWAY ✅
// ============================================================================
const initializeDatabase = async () => {
  if (!prisma) return false;
  
  try {
    console.log('🔄 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connected');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (isProduction) {
      console.error('💥 Database required in production');
      return false;
    }
    console.log('💡 Continuing with fallbacks');
    return false;
  }
};

const startServer = async () => {
  try {
    // Conectar a la base de datos
    const dbConnected = await initializeDatabase();
    
    if (isProduction && !dbConnected) {
      console.error('❌ Cannot start in production without database');
      process.exit(1);
    }
    
    // Iniciar servidor
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('🎯 SERVER RUNNING:');
      console.log(`   🌐 Port: ${PORT}`);
      console.log(`   📊 Database: ${dbConnected ? 'CONNECTED' : 'FALLBACK'}`);
      console.log(`   🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('   ✅ Ready for connections');
    });
    
    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n📡 Received ${signal}. Shutting down...`);
      server.close(async () => {
        try {
          if (prisma) await prisma.$disconnect();
          process.exit(0);
        } catch (error) {
          console.error('❌ Shutdown error:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Server failed to start:', error);
    process.exit(1);
  }
};

// Error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  if (isProduction) process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  if (isProduction) process.exit(1);
});

// Start the server
startServer();

module.exports = app;