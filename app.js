const express = require('express');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Middlewares
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

// Importar rutas principales
const authRoutes = require('./src/routes/auth.routes');
const treatmentRoutes = require('./src/routes/treatment.routes');

// Importar rutas opcionales con manejo de errores
const importOptionalRoute = (routePath, routeName) => {
  try {
    const route = require(routePath);
    console.log(`✅ ${routeName} routes loaded`);
    return route;
  } catch (error) {
    console.log(`⚠️ ${routeName} routes not found - using fallback`);
    return null;
  }
};

const dashboardRoutes = importOptionalRoute('./src/routes/dashboard.routes', 'Dashboard');
const appointmentRoutes = importOptionalRoute('./src/routes/appointment.routes', 'Appointment');
const profileRoutes = importOptionalRoute('./src/routes/profile.routes', 'Profile');
const beautyPointsRoutes = importOptionalRoute('./src/routes/beautyPoints.routes', 'BeautyPoints');
const vipRoutes = importOptionalRoute('./src/routes/vip.routes', 'VIP');
const paymentRoutes = importOptionalRoute('./src/routes/payment.routes', 'Payment');
const notificationsRoutes = importOptionalRoute('./src/routes/notifications.routes', 'Notifications');
const offersRoutes = importOptionalRoute('./src/routes/offers.routes', 'Offers');
const webhookRoutes = importOptionalRoute('./src/routes/webhook.routes', 'Webhook');

// Middleware de errores
const { errorHandler } = require('./src/middleware/error.middleware');

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
const app = express();
const prisma = new PrismaClient();

// ============================================================================
// MIDDLEWARES GLOBALES - CONFIGURACIÓN DE PRODUCCIÓN ✅
// ============================================================================

// Seguridad mejorada para producción
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configurado para producción
app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen solo en desarrollo (apps móviles, Postman)
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? (process.env.CORS_ORIGIN?.split(',') || [])
      : [
          'http://localhost:3000',
          'http://localhost:19006',
          'http://192.168.1.174:8081',
          'exp://192.168.1.174:8081',
          // Permitir IPs locales solo en desarrollo
          /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
          /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
          /^http:\/\/172\.16\.\d+\.\d+:\d+$/
        ];
    
    // En desarrollo, ser más permisivo
    if (process.env.NODE_ENV === 'development') {
      if (origin && (origin.includes('192.168.') || origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        return callback(null, true);
      }
    }
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (!isAllowed && process.env.NODE_ENV === 'production') {
      return callback(new Error('Not allowed by CORS policy'));
    }
    
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control']
}));

// Logging configurado por ambiente
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.originalUrl} - Origin: ${req.get('Origin') || 'No origin'}`);
    next();
  });
}

// Rate limiting más estricto en producción
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { 
    success: false, 
    error: { 
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    } 
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});
app.use('/api/', limiter);

// Rate limiting específico para login (más estricto)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 intentos en producción
  message: { 
    success: false, 
    error: { 
      message: 'Too many login attempts, please try again later.',
      retryAfter: '15 minutes'
    } 
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/patient/login', authLimiter);

// Body parsing - webhooks de Stripe necesitan raw body
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ 
  limit: process.env.NODE_ENV === 'production' ? '1mb' : '10mb' 
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: process.env.NODE_ENV === 'production' ? '1mb' : '10mb' 
}));

// Compresión y logging
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// ============================================================================
// RUTAS DE SALUD
// ============================================================================
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      version: '2.0.0'
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database connection failed'
    });
  }
});

// Ruta raíz simplificada para producción
app.get('/', (req, res) => {
  const endpoints = process.env.NODE_ENV === 'development' ? {
    health: '/health',
    auth: '/api/auth/*',
    clinics: '/api/clinics',
    treatments: '/api/treatments',
    appointments: '/api/appointments',
    profile: '/api/user/profile',
    docs: '/docs/postman'
  } : {
    health: '/health',
    status: 'API is running'
  };

  res.json({
    message: '🏥 Belleza Estética API',
    version: '2.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints
  });
});

// ============================================================================
// RUTAS PRINCIPALES
// ============================================================================

// RUTAS DE AUTENTICACIÓN (CRÍTICAS)
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes loaded');

// RUTAS DE TRATAMIENTOS
app.use('/api/treatments', treatmentRoutes);
console.log('✅ Treatment routes loaded');

// ============================================================================
// RUTAS DE CLÍNICAS - MEJORADAS PARA PRODUCCIÓN ✅
// ============================================================================
app.get('/api/clinics', async (req, res) => {
  try {
    let clinics = [];
    
    try {
      // Verificar si existe la tabla Clinic
      const tableExists = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'Clinic'
      `;
      
      if (Array.isArray(tableExists) && tableExists.length > 0) {
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
            description: true,
            createdAt: true
          },
          orderBy: { name: 'asc' }
        });
        console.log(`✅ Found ${clinics.length} clinics in database`);
      }
    } catch (dbError) {
      console.warn('⚠️ Database error fetching clinics:', dbError.message);
    }
    
    // Solo usar datos demo en desarrollo si no hay clínicas
    if (clinics.length === 0 && process.env.NODE_ENV === 'development') {
      clinics = [
        {
          id: 'madrid-centro',
          name: 'Clínica Madrid Centro',
          slug: 'madrid-centro',
          city: 'Madrid',
          address: 'Calle Gran Vía, 28, Madrid',
          phone: '+34 91 123 4567',
          logoUrl: null,
          description: 'Centro especializado en tratamientos estéticos',
          createdAt: new Date('2024-01-01').toISOString()
        },
        {
          id: 'barcelona-eixample',
          name: 'Clínica Barcelona Eixample',
          slug: 'barcelona-eixample',
          city: 'Barcelona',
          address: 'Passeig de Gràcia, 95, Barcelona',
          phone: '+34 93 234 5678',
          logoUrl: null,
          description: 'Tratamientos de belleza y bienestar',
          createdAt: new Date('2024-01-15').toISOString()
        }
      ];
    }
    
    res.json({
      success: true,
      data: clinics,
      total: clinics.length,
      ...(clinics.length === 0 && process.env.NODE_ENV === 'development' && {
        message: 'Using demo data - run database migrations'
      })
    });
    
  } catch (error) {
    console.error('❌ Error in GET /api/clinics:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      }
    });
  }
});

// RUTAS DE CLÍNICA ESPECÍFICA - MEJORADAS
app.get('/api/clinics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let clinic = null;
    
    try {
      clinic = await prisma.clinic.findFirst({
        where: { 
          OR: [{ id: id }, { slug: id }],
          isActive: true 
        },
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          address: true,
          phone: true,
          description: true,
          logoUrl: true,
          website: true,
          email: true,
          schedule: true,
          createdAt: true
        }
      });
      
      if (clinic) {
        console.log(`✅ Found clinic: ${clinic.name}`);
      }
    } catch (dbError) {
      console.warn('⚠️ Database error fetching clinic:', dbError.message);
    }
    
    // Fallback solo en desarrollo
    if (!clinic && process.env.NODE_ENV === 'development') {
      const demoClinics = {
        'madrid-centro': { 
          id: 'madrid-centro', 
          name: 'Clínica Madrid Centro', 
          slug: 'madrid-centro',
          city: 'Madrid',
          address: 'Calle Gran Vía, 28, Madrid',
          phone: '+34 91 123 4567',
          description: 'Centro especializado en tratamientos estéticos',
          logoUrl: null,
          website: 'https://madrid-centro.com',
          email: 'info@madrid-centro.com',
          createdAt: new Date('2024-01-01').toISOString()
        },
        'barcelona-eixample': { 
          id: 'barcelona-eixample', 
          name: 'Clínica Barcelona Eixample', 
          slug: 'barcelona-eixample',
          city: 'Barcelona',
          address: 'Passeig de Gràcia, 95, Barcelona',
          phone: '+34 93 234 5678',
          description: 'Tratamientos de belleza y bienestar',
          logoUrl: null,
          website: 'https://barcelona-eixample.com',
          email: 'info@barcelona-eixample.com',
          createdAt: new Date('2024-01-15').toISOString()
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
    
    res.json({ 
      success: true, 
      data: clinic 
    });
    
  } catch (error) {
    console.error('❌ Error in GET /api/clinics/:id:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { details: error.message })
      }
    });
  }
});

console.log('✅ Clinic routes loaded');

// ============================================================================
// RUTAS OPCIONALES CON FALLBACKS MEJORADOS ✅
// ============================================================================

// DASHBOARD ROUTES
if (dashboardRoutes) {
  app.use('/api/dashboard', dashboardRoutes);
  console.log('✅ Dashboard routes loaded');
} else {
  app.get('/api/dashboard', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(501).json({
        success: false,
        error: { message: 'Dashboard service not implemented' }
      });
    }
    
    res.json({
      success: true,
      data: {
        totalAppointments: 15,
        todayAppointments: 3,
        totalUsers: 120,
        revenue: 15000
      },
      message: 'Dashboard fallback - implement dashboard.routes.js'
    });
  });
  console.log('⚠️ Dashboard fallback loaded');
}

// APPOINTMENT ROUTES - CRÍTICAS
if (appointmentRoutes) {
  app.use('/api/appointments', appointmentRoutes);
  console.log('✅ Appointment routes loaded');
} else {
  // Fallback mínimo para appointments - solo en desarrollo
  if (process.env.NODE_ENV === 'development') {
    const appointmentFallbackRouter = express.Router();
    
    appointmentFallbackRouter.get('/health', (req, res) => {
      res.json({
        success: true,
        message: 'Appointment routes fallback - implement appointment.routes.js',
        timestamp: new Date().toISOString()
      });
    });
    
    appointmentFallbackRouter.get('/dashboard', (req, res) => {
      res.json({
        success: true,
        data: {
          nextAppointment: null,
          featuredTreatments: [],
          user: { beautyPoints: 0, vipStatus: false },
          todayAppointments: 0
        },
        message: 'Appointment dashboard fallback'
      });
    });
    
    appointmentFallbackRouter.get('/user', (req, res) => {
      res.json({
        success: true,
        data: { appointments: [] },
        message: 'User appointments fallback'
      });
    });
    
    app.use('/api/appointments', appointmentFallbackRouter);
    console.log('⚠️ Appointment fallback loaded (development only)');
  } else {
    // En producción, retornar error 501 para endpoints no implementados
    app.use('/api/appointments', (req, res) => {
      res.status(501).json({
        success: false,
        error: { message: 'Appointment service not implemented' }
      });
    });
    console.log('❌ Appointment service not available in production');
  }
}

// PROFILE ROUTES
if (profileRoutes) {
  app.use('/api/user', profileRoutes);
  console.log('✅ Profile routes loaded');
} else {
  if (process.env.NODE_ENV === 'development') {
    app.get('/api/user/profile', (req, res) => {
      res.json({
        success: true,
        data: {
          id: 'demo-user-123',
          firstName: 'Demo',
          lastName: 'User',
          email: 'demo@example.com',
          beautyPoints: 0,
          vipStatus: false,
          phone: null,
          avatar: null,
          registrationDate: new Date().toISOString(),
          totalAppointments: 0,
          favoriteServices: []
        },
        message: 'Profile fallback - implement profile.routes.js'
      });
    });
    console.log('⚠️ Profile fallback loaded');
  } else {
    app.use('/api/user', (req, res) => {
      res.status(501).json({
        success: false,
        error: { message: 'User service not implemented' }
      });
    });
  }
}

// BEAUTY POINTS ROUTES
if (beautyPointsRoutes) {
  app.use('/api/beauty-points', beautyPointsRoutes);
  console.log('✅ Beauty Points routes loaded');
} else {
  app.get('/api/beauty-points', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(501).json({
        success: false,
        error: { message: 'Beauty Points service not implemented' }
      });
    }
    
    res.json({
      success: true,
      data: {
        currentPoints: 0,
        history: [],
        availableRewards: []
      },
      message: 'Beauty points fallback'
    });
  });
}

// VIP ROUTES
if (vipRoutes) {
  app.use('/api/vip', vipRoutes);
  console.log('✅ VIP routes loaded');
} else {
  app.get('/api/vip/benefits', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(501).json({
        success: false,
        error: { message: 'VIP service not implemented' }
      });
    }
    
    res.json({
      success: true,
      data: {
        isVip: false,
        benefits: [],
        pointsToNextLevel: 1000,
        currentLevel: 'Standard'
      },
      message: 'VIP benefits fallback'
    });
  });
}

// Cargar rutas restantes
[
  { routes: paymentRoutes, path: '/api/payments', name: 'Payment' },
  { routes: notificationsRoutes, path: '/api/notifications', name: 'Notifications' },
  { routes: offersRoutes, path: '/api/offers', name: 'Offers' },
  { routes: webhookRoutes, path: '/api/webhooks', name: 'Webhook' }
].forEach(({ routes, path, name }) => {
  if (routes) {
    app.use(path, routes);
    console.log(`✅ ${name} routes loaded`);
  } else {
    // En producción, retornar 501 para servicios no implementados
    if (process.env.NODE_ENV === 'production') {
      app.use(path, (req, res) => {
        res.status(501).json({
          success: false,
          error: { message: `${name} service not implemented` }
        });
      });
    }
    console.log(`⚠️ ${name} routes not found`);
  }
});

// ============================================================================
// TESTING Y DOCUMENTACIÓN - SOLO EN DESARROLLO ✅
// ============================================================================
if (process.env.NODE_ENV === 'development') {
  app.get('/api/test-endpoints', (req, res) => {
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: 'development',
      criticalEndpoints: [
        { name: 'Auth Health', path: '/api/auth/health', status: 'active' },
        { name: 'Patient Login', path: '/api/auth/patient/login', status: 'active' },
        { name: 'Demo Login', path: '/api/auth/demo-login', status: 'active' },
        { name: 'Clinics List', path: '/api/clinics', status: 'active' },
        { name: 'Treatments List', path: '/api/treatments', status: 'active' },
        { name: 'Appointments', path: '/api/appointments/*', status: appointmentRoutes ? 'active' : 'fallback' },
        { name: 'User Profile', path: '/api/user/profile', status: profileRoutes ? 'active' : 'fallback' }
      ],
      testFlow: [
        '1. POST /api/auth/demo-login (get token)',
        '2. GET /api/treatments (verify treatments)',
        '3. GET /api/clinics (verify clinics)',
        '4. GET /api/appointments/dashboard (if implemented)',
        '5. GET /api/user/profile (if implemented)'
      ]
    });
  });

  app.get('/docs/postman', (req, res) => {
    res.json({
      name: 'Belleza Estética API v2.0',
      baseUrl: `${req.protocol}://${req.get('host')}/api`,
      environment: 'development',
      criticalEndpoints: [
        {
          name: 'Demo Login',
          method: 'POST',
          url: '/api/auth/demo-login',
          body: {},
          description: 'Quick login for testing'
        },
        {
          name: 'Patient Login', 
          method: 'POST',
          url: '/api/auth/patient/login',
          body: {
            email: 'user@example.com',
            password: 'password123',
            clinicSlug: 'madrid-centro'
          },
          description: 'Patient login'
        },
        {
          name: 'Treatments List',
          method: 'GET',
          url: '/api/treatments',
          description: 'Available treatments'
        },
        {
          name: 'Clinics List',
          method: 'GET',
          url: '/api/clinics',
          description: 'Available clinics'
        }
      ]
    });
  });
}

// ============================================================================
// MANEJO DE ERRORES - MEJORADO ✅
// ============================================================================

// Rutas no encontradas
app.use('*', (req, res) => {
  const isApiRoute = req.originalUrl.startsWith('/api/');
  
  if (isApiRoute) {
    res.status(404).json({
      success: false,
      error: {
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      },
      ...(process.env.NODE_ENV === 'development' && {
        availableEndpoints: {
          auth: '/api/auth/*',
          clinics: '/api/clinics',
          treatments: '/api/treatments',
          documentation: '/docs/postman (dev only)'
        }
      })
    });
  } else {
    res.status(404).json({
      success: false,
      error: { message: 'Page not found' }
    });
  }
});

// Middleware de errores
app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN ✅
// ============================================================================
const gracefulShutdown = async (signal) => {
  console.log(`\n📡 Received ${signal}. Shutting down gracefully...`);
  
  try {
    await prisma.$disconnect();
    console.log('✅ Prisma connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// ============================================================================
// INICIALIZACIÓN DE BASE DE DATOS ✅
// ============================================================================
const initializeDatabase = async () => {
  try {
    console.log('🔄 Checking database connection...');
    await prisma.$connect();
    console.log('✅ Database connection established');
    
    // Verificar tablas principales solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      try {
        const tablesResult = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('User', 'Clinic', 'Treatment', 'Appointment', 'Professional')
        `;
        
        const tables = Array.isArray(tablesResult) ? tablesResult : [tablesResult];
        console.log(`🎯 Tables verified: ${tables.length}/5`);
        
        if (tables.length < 5) {
          console.log('⚠️ Missing tables. Run: npx prisma migrate dev');
        }
      } catch (dbError) {
        console.log('⚠️ Could not verify tables - fallbacks will be used');
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    if (process.env.NODE_ENV === 'production') {
      console.error('💥 Cannot start without database in production');
      process.exit(1);
    } else {
      console.log('💡 Using fallbacks for development');
    }
  }
};

// ============================================================================
// INICIALIZACIÓN COMPLETA ✅
// ============================================================================
const initializeApp = async () => {
  console.log(`🚀 Starting Belleza Estética API v2.0 (${process.env.NODE_ENV || 'development'})...`);
  
  await initializeDatabase();
  
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log('🎯 Application ready:');
    console.log(`   🌐 Server: http://localhost:${port}`);
    console.log('   ✅ Auth routes: LOADED');
    console.log('   ✅ Treatment routes: LOADED');
    console.log('   ✅ Clinic routes: LOADED');
    console.log(`   📊 Appointment routes: ${appointmentRoutes ? 'LOADED' : 'FALLBACK'}`);
    console.log(`   👤 Profile routes: ${profileRoutes ? 'LOADED' : 'FALLBACK'}`);
    console.log('   🔒 Security: ENABLED');
    console.log('   📡 CORS: CONFIGURED');
    
    if (process.env.NODE_ENV === 'development') {
      console.log('   📚 Docs: GET /docs/postman');
      console.log('   🧪 Test: GET /api/test-endpoints');
    }
  });
};

initializeApp().catch(error => {
  console.error('❌ Failed to initialize application:', error);
  process.exit(1);
});

module.exports = app;