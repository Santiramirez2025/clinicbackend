// ============================================================================
// app.js - PRODUCCIÓN OPTIMIZADA ⚡
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

// Routes
const authRoutes = require('./src/routes/auth.routes');
const dashboardRoutes = require('./src/routes/dashboard.routes');
const appointmentRoutes = require('./src/routes/appointment.routes');
const beautyPointsRoutes = require('./src/routes/beautyPoints.routes');
const vipRoutes = require('./src/routes/vip.routes');
const profileRoutes = require('./src/routes/profile.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const notificationsRoutes = require('./src/routes/notifications.routes');
const offersRoutes = require('./src/routes/offers');
const webhookRoutes = require('./src/routes/webhook.routes');

const { errorHandler } = require('./src/middleware/error.middleware');

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
const app = express();
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  errorFormat: 'minimal'
});

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

// ============================================================================
// MIDDLEWARES DE SEGURIDAD
// ============================================================================
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  } : false,
  hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false
}));

// CORS optimizado
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = isProduction 
      ? (process.env.CORS_ORIGIN?.split(',') || [])
      : ['http://localhost:3000', 'http://localhost:19006', /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/];
    
    if (isDevelopment && (
      origin.includes('localhost') || 
      origin.includes('127.0.0.1') || 
      /192\.168\.\d{1,3}\.\d{1,3}/.test(origin)
    )) {
      return callback(null, true);
    }
    
    const isAllowed = allowedOrigins.some(allowed => 
      typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
    );
    
    callback(null, isAllowed || isDevelopment);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDevelopment ? 1000 : 100,
  message: { success: false, error: { message: 'Demasiadas solicitudes' } },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isDevelopment && req.ip === '127.0.0.1'
});
app.use('/api/', limiter);

// Body parsing
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compresión y logging
app.use(compression());
if (!process.env.NODE_ENV?.includes('test')) {
  app.use(morgan(isProduction ? 'combined' : 'dev'));
}

// Request logging (solo desarrollo)
if (isDevelopment) {
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ============================================================================
// RUTAS DE SALUD
// ============================================================================
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected'
    };
    
    if (isDevelopment) {
      healthData.uptime = process.uptime();
      healthData.memory = process.memoryUsage();
      healthData.version = process.version;
    }
    
    res.json(healthData);
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: isDevelopment ? error.message : 'Database connection failed'
    });
  }
});

app.get('/', (req, res) => {
  const response = {
    message: '🏥 Belleza Estética API',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
  
  if (isDevelopment) {
    response.endpoints = {
      health: '/health',
      auth: '/api/auth/*',
      dashboard: '/api/dashboard',
      appointments: '/api/appointments',
      documentation: '/docs/postman'
    };
  }
  
  res.json(response);
});

// ============================================================================
// RUTAS PRINCIPALES
// ============================================================================
const routes = [
  { path: '/api/auth', router: authRoutes, name: 'Auth' },
  { path: '/api/dashboard', router: dashboardRoutes, name: 'Dashboard' },
  { path: '/api/appointments', router: appointmentRoutes, name: 'Appointments' },
  { path: '/api/beauty-points', router: beautyPointsRoutes, name: 'Beauty Points' },
  { path: '/api/vip', router: vipRoutes, name: 'VIP' },
  { path: '/api/profile', router: profileRoutes, name: 'Profile' },
  { path: '/api/payments', router: paymentRoutes, name: 'Payments' },
  { path: '/api/notifications', router: notificationsRoutes, name: 'Notifications' },
  { path: '/api/offers', router: offersRoutes, name: 'Offers' },
  { path: '/api/webhooks', router: webhookRoutes, name: 'Webhooks' }
];

routes.forEach(({ path, router, name }) => {
  try {
    app.use(path, router);
    isDevelopment && console.log(`✅ ${name} routes loaded`);
  } catch (error) {
    console.log(`⚠️ ${name} routes failed:`, error.message);
  }
});

// Admin routes (opcional)
try {
  const adminRoutes = require('./src/routes/admin');
  const adminDashboardRoutes = require('./src/routes/admin/dashboard');
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/dashboard', adminDashboardRoutes);
  isDevelopment && console.log('✅ Admin routes loaded');
} catch (error) {
  isDevelopment && console.log('⚠️ Admin routes not found');
}

// ============================================================================
// DOCUMENTACIÓN (SOLO DESARROLLO)
// ============================================================================
if (isDevelopment) {
  app.get('/docs/postman', (req, res) => {
    res.json({
      info: {
        name: 'Belleza Estética API',
        version: '1.0.0',
        baseUrl: `${req.protocol}://${req.get('host')}/api`
      },
      authentication: {
        type: 'Bearer Token',
        description: 'Token obtenido del login'
      },
      endpoints: [
        {
          name: 'Demo Login',
          method: 'POST',
          url: '/api/auth/demo-login',
          description: 'Login instantáneo para testing'
        },
        {
          name: 'Login',
          method: 'POST',
          url: '/api/auth/login',
          body: { email: 'demo@bellezaestetica.com', password: 'demo123' }
        },
        {
          name: 'Register',
          method: 'POST',
          url: '/api/auth/register',
          body: { 
            firstName: 'Juan', lastName: 'Pérez', 
            email: 'juan@example.com', password: 'password123', 
            phone: '+54 11 1234-5678' 
          }
        },
        {
          name: 'Dashboard',
          method: 'GET',
          url: '/api/dashboard',
          headers: { 'Authorization': 'Bearer <token>' }
        },
        {
          name: 'Treatments',
          method: 'GET',
          url: '/api/appointments/treatments'
        },
        {
          name: 'Create Appointment',
          method: 'POST',
          url: '/api/appointments',
          headers: { 'Authorization': 'Bearer <token>' },
          body: { treatmentId: 't1', date: '2025-07-15', time: '14:30' }
        }
      ],
      testing: {
        demoCredentials: {
          email: 'demo@bellezaestetica.com',
          password: 'demo123'
        }
      }
    });
  });
}

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({
      success: false,
      error: {
        message: 'Endpoint no encontrado',
        path: req.originalUrl,
        method: req.method
      }
    });
  } else {
    res.redirect('/');
  }
});

app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================
const gracefulShutdown = async (signal) => {
  console.log(`\n📡 Cierre graceful iniciado (${signal})`);
  
  try {
    await prisma.$disconnect();
    console.log('✅ Base de datos desconectada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en cierre:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  if (isProduction) gracefulShutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
const initializeApp = async () => {
  try {
    console.log('🚀 Iniciando aplicación...');
    
    // Conexión a BD
    await prisma.$connect();
    console.log('✅ Base de datos conectada');
    
    // Verificar tablas (silencioso en producción)
    try {
      await prisma.$queryRaw`SELECT 1 as test`;
      isDevelopment && console.log('✅ Tablas verificadas');
    } catch (error) {
      console.log('⚠️ Verificar esquema de BD');
    }
    
    console.log(`🎯 API lista en modo ${process.env.NODE_ENV || 'development'}`);
    
    if (isDevelopment) {
      console.log('📱 Endpoints principales:');
      console.log('   - Health: GET /health');
      console.log('   - Demo Login: POST /api/auth/demo-login');
      console.log('   - Docs: GET /docs/postman');
    }
    
  } catch (error) {
    console.error('❌ Error en inicialización:', error);
    if (isProduction) process.exit(1);
  }
};

// Inicializar
initializeApp();

module.exports = app;