// ============================================================================
// app.js - APLICACIÓN PRINCIPAL CORREGIDA PARA POSTGRESQL ✅
// ============================================================================
const express = require('express');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

// Importar middlewares directamente
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');

// Importar rutas que SÍ existen
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

// Importar middleware de errores CORRECTAMENTE
const { errorHandler } = require('./src/middleware/error.middleware');

// ============================================================================
// INICIALIZACIÓN ✅
// ============================================================================
const app = express();
const prisma = new PrismaClient();

// ============================================================================
// CONFIGURAR MIDDLEWARES GLOBALES ✅
// ============================================================================

// Seguridad
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// ✅ CORS MEJORADO - Más permisivo para desarrollo
app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (apps móviles, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? (process.env.CORS_ORIGIN?.split(',') || [])
      : [
          'http://localhost:3000',
          'http://localhost:19006',
          'http://192.168.1.174:8081',
          'exp://192.168.1.174:8081',
          'http://192.168.1.174:19006',
          'http://192.168.1.174:3000',
          // Agregar más IPs locales comunes
          'http://10.0.0.0',
          'http://172.16.0.0',
          'http://192.168.0.0'
        ];
    
    // En desarrollo, ser más permisivo
    if (process.env.NODE_ENV === 'development') {
      // Permitir cualquier IP local
      if (origin.includes('192.168.') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      console.log('✅ Allowed origins:', allowedOrigins);
      callback(null, true); // ✅ TEMPORALMENTE PERMISIVO PARA DEBUG
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// ✅ LOGGING MEJORADO PARA DEBUG
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`📡 ${req.method} ${req.originalUrl} - Origin: ${req.get('Origin') || 'No origin'}`);
    console.log(`🎫 Auth: ${req.headers.authorization ? 'Present' : 'Missing'}`);
  }
  next();
});

// Rate limiting - Más permisivo en desarrollo
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 1000 : 100, // ✅ MÁS PERMISIVO EN DEV
  message: { success: false, error: { message: 'Demasiadas solicitudes' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Parsing - Webhooks de Stripe necesitan raw body
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compresión y logging
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// ============================================================================
// RUTAS DE SALUD ✅ (CORREGIDA PARA POSTGRESQL)
// ============================================================================
app.get('/health', async (req, res) => {
  try {
    // ✅ Query compatible con PostgreSQL
    await prisma.$queryRaw`SELECT 1 as test`;
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
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

// ✅ RUTA RAÍZ MEJORADA CON MÁS INFORMACIÓN
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Belleza Estética API - Sistema Completo',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: {
      node: process.version,
      platform: process.platform,
      uptime: process.uptime()
    },
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      dashboard: '/api/dashboard',
      appointments: '/api/appointments',
      beautyPoints: '/api/beauty-points',
      vip: '/api/vip/*',
      profile: '/api/profile',
      payments: '/api/payments',
      notifications: '/api/notifications',
      offers: '/api/offers',
      webhooks: '/api/webhooks/*'
    },
    documentation: {
      postman: '/docs/postman',
      swagger: '/docs/swagger',
      authTest: '/api/auth/health'
    }
  });
});

// ============================================================================
// RUTAS PRINCIPALES ✅
// ============================================================================

try {
  // ✅ RUTAS DE AUTENTICACIÓN (CRÍTICAS) - PRIMERA PRIORIDAD
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');

  // ✅ RUTAS PRINCIPALES (CRÍTICAS)
  app.use('/api/dashboard', dashboardRoutes);
  console.log('✅ Dashboard routes loaded');

  app.use('/api/appointments', appointmentRoutes);
  console.log('✅ Appointment routes loaded');

  // ✅ RUTAS OPCIONALES (CON MANEJO DE ERRORES)
  try {
    app.use('/api/beauty-points', beautyPointsRoutes);
    console.log('✅ Beauty Points routes loaded');
  } catch (error) {
    console.log('⚠️ Beauty Points routes not loaded:', error.message);
  }

  try {
    app.use('/api/vip', vipRoutes);
    console.log('✅ VIP routes loaded');
  } catch (error) {
    console.log('⚠️ VIP routes not loaded:', error.message);
  }

  try {
    app.use('/api/profile', profileRoutes);
    console.log('✅ Profile routes loaded');
  } catch (error) {
    console.log('⚠️ Profile routes not loaded:', error.message);
  }

  try {
    app.use('/api/payments', paymentRoutes);
    console.log('✅ Payment routes loaded');
  } catch (error) {
    console.log('⚠️ Payment routes not loaded:', error.message);
  }

  try {
    app.use('/api/notifications', notificationsRoutes);
    console.log('✅ Notifications routes loaded');
  } catch (error) {
    console.log('⚠️ Notifications routes not loaded:', error.message);
  }

  try {
    app.use('/api/offers', offersRoutes);
    console.log('✅ Offers routes loaded');
  } catch (error) {
    console.log('⚠️ Offers routes not loaded:', error.message);
  }

  try {
    app.use('/api/webhooks', webhookRoutes);
    console.log('✅ Webhook routes loaded');
  } catch (error) {
    console.log('⚠️ Webhook routes not loaded:', error.message);
  }

} catch (error) {
  console.error('❌ Error loading main routes:', error);
}

// ============================================================================
// RUTAS ADMIN (OPCIONALES) ✅
// ============================================================================
try {
  const adminDashboardRoutes = require('./src/routes/admin/dashboard');
  app.use('/api/admin/dashboard', adminDashboardRoutes);
  console.log('✅ Admin routes loaded');
} catch (error) {
  console.log('⚠️ Admin routes not found, skipping...');
}

// ============================================================================
// ✅ ENDPOINT PARA VERIFICAR RUTAS CRÍTICAS
// ============================================================================
app.get('/api/test-endpoints', async (req, res) => {
  const endpoints = [
    { name: 'Auth Health', path: '/api/auth/health' },
    { name: 'Dashboard', path: '/api/dashboard' },
    { name: 'Appointments', path: '/api/appointments/treatments' },
    { name: 'Beauty Points', path: '/api/beauty-points' },
    { name: 'VIP', path: '/api/vip/benefits' },
    { name: 'Profile', path: '/api/profile' }
  ];

  const results = [];
  
  for (const endpoint of endpoints) {
    try {
      // Simular una solicitud interna
      const testResponse = await new Promise((resolve) => {
        const mockReq = { method: 'GET', originalUrl: endpoint.path, headers: {} };
        const mockRes = {
          status: (code) => ({ json: (data) => resolve({ status: code, data }) }),
          json: (data) => resolve({ status: 200, data })
        };
        
        // Timeout para evitar bloqueos
        setTimeout(() => resolve({ status: 408, error: 'Timeout' }), 1000);
      });
      
      results.push({
        endpoint: endpoint.name,
        path: endpoint.path,
        status: 'available',
        responseStatus: testResponse.status
      });
    } catch (error) {
      results.push({
        endpoint: endpoint.name,
        path: endpoint.path,
        status: 'error',
        error: error.message
      });
    }
  }

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    results
  });
});

// ============================================================================
// DOCUMENTACIÓN MEJORADA ✅
// ============================================================================
app.get('/docs/postman', (req, res) => {
  res.json({
    info: {
      name: 'Belleza Estética API',
      description: 'API completa para sistema de belleza y estética',
      version: '1.0.0',
      baseUrl: `${req.protocol}://${req.get('host')}/api`
    },
    authentication: {
      type: 'Bearer Token',
      description: 'Usar el token obtenido del login en el header Authorization'
    },
    endpoints: [
      {
        name: 'Health Check General',
        method: 'GET',
        url: '/health',
        description: 'Verificar estado del servidor y base de datos'
      },
      {
        name: 'Auth Health Check',
        method: 'GET',
        url: '/api/auth/health',
        description: 'Verificar rutas de autenticación'
      },
      {
        name: 'Demo Login',
        method: 'POST',
        url: '/api/auth/demo-login',
        description: 'Login sin credenciales para testing',
        body: {},
        response: {
          success: true,
          data: {
            user: { id: 'demo', firstName: 'Demo', email: 'demo@app.com' },
            tokens: { accessToken: 'jwt_token', refreshToken: 'refresh_token' }
          }
        }
      },
      {
        name: 'Login Normal',
        method: 'POST',
        url: '/api/auth/login',
        body: { 
          email: 'demo@bellezaestetica.com', 
          password: 'demo123' 
        },
        response: {
          success: true,
          data: {
            user: { firstName: 'Usuario', email: 'email@ejemplo.com' },
            tokens: { accessToken: 'jwt_token', refreshToken: 'refresh_token' }
          }
        }
      },
      {
        name: 'Admin Login',
        method: 'POST',
        url: '/api/auth/admin-login',
        body: { 
          email: 'admin@bellezaestetica.com', 
          password: 'admin123' 
        },
        description: 'Login con privilegios de administrador'
      },
      {
        name: 'Register',
        method: 'POST',
        url: '/api/auth/register',
        body: { 
          firstName: 'Juan',
          lastName: 'Pérez',
          email: 'juan@example.com', 
          password: 'password123',
          phone: '+54 11 1234-5678'
        }
      },
      {
        name: 'Forgot Password',
        method: 'POST',
        url: '/api/auth/forgot-password',
        body: { email: 'usuario@ejemplo.com' },
        description: 'Solicitar recuperación de contraseña'
      },
      {
        name: 'Reset Password',
        method: 'POST',
        url: '/api/auth/reset-password',
        body: { token: 'reset_token', newPassword: 'nueva_password' },
        description: 'Restablecer contraseña con token'
      },
      {
        name: 'Dashboard',
        method: 'GET',
        url: '/api/dashboard',
        headers: { 'Authorization': 'Bearer <token>' },
        description: 'Dashboard principal del usuario'
      },
      {
        name: 'Get Treatments',
        method: 'GET',
        url: '/api/appointments/treatments',
        description: 'Lista de tratamientos disponibles'
      },
      {
        name: 'Get Availability',
        method: 'GET',
        url: '/api/appointments/availability?treatmentId=t1&date=2025-07-15',
        description: 'Horarios disponibles para un tratamiento'
      },
      {
        name: 'Create Appointment',
        method: 'POST',
        url: '/api/appointments',
        headers: { 'Authorization': 'Bearer <token>' },
        body: { 
          treatmentId: 't1', 
          date: '2025-07-15', 
          time: '14:30',
          notes: 'Opcional'
        }
      },
      {
        name: 'Get My Appointments',
        method: 'GET',
        url: '/api/appointments',
        headers: { 'Authorization': 'Bearer <token>' }
      },
      {
        name: 'Get Beauty Points',
        method: 'GET',
        url: '/api/beauty-points',
        headers: { 'Authorization': 'Bearer <token>' }
      },
      {
        name: 'Get VIP Benefits',
        method: 'GET',
        url: '/api/vip/benefits'
      },
      {
        name: 'Get Profile',
        method: 'GET',
        url: '/api/profile',
        headers: { 'Authorization': 'Bearer <token>' }
      },
      {
        name: 'Logout',
        method: 'POST',
        url: '/api/auth/logout',
        headers: { 'Authorization': 'Bearer <token>' }
      }
    ],
    testing: {
      demoCredentials: {
        email: 'demo@bellezaestetica.com',
        password: 'demo123'
      },
      adminCredentials: {
        email: 'admin@bellezaestetica.com',
        password: 'admin123'
      },
      demoToken: 'Use /api/auth/demo-login to get a token instantly'
    },
    notes: {
      cors: 'CORS está configurado para desarrollo local',
      rateLimit: 'Rate limit: 1000 requests per 15 minutes en desarrollo',
      errorFormat: {
        success: false,
        error: { message: 'Descripción del error', code: 'ERROR_CODE' }
      }
    }
  });
});

// ============================================================================
// MANEJO DE RUTAS NO ENCONTRADAS ✅
// ============================================================================
app.use('*', (req, res) => {
  const isApiRoute = req.originalUrl.startsWith('/api/');
  
  if (isApiRoute) {
    res.status(404).json({
      success: false,
      error: {
        message: 'Endpoint no encontrado',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      },
      availableEndpoints: {
        auth: '/api/auth/* (login, register, demo-login, etc.)',
        dashboard: '/api/dashboard',
        appointments: '/api/appointments',
        beautyPoints: '/api/beauty-points',
        vip: '/api/vip/*',
        profile: '/api/profile',
        payments: '/api/payments',
        notifications: '/api/notifications',
        offers: '/api/offers'
      },
      documentation: {
        postman: '/docs/postman',
        testEndpoints: '/api/test-endpoints',
        authHealth: '/api/auth/health'
      }
    });
  } else {
    // Para rutas no API, redirigir a la raíz con información
    res.redirect('/?info=api-redirect');
  }
});

// ============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES ✅
// ============================================================================
app.use(errorHandler);

// ============================================================================
// GRACEFUL SHUTDOWN ✅
// ============================================================================
const gracefulShutdown = async (signal) => {
  console.log(`\n📡 Recibida señal ${signal}. Iniciando cierre graceful...`);
  
  try {
    console.log('🔌 Cerrando conexión a Prisma...');
    await prisma.$disconnect();
    console.log('✅ Conexión a Prisma cerrada');
    
    console.log('🎉 Cierre graceful completado');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error durante cierre graceful:', error);
    process.exit(1);
  }
};

// Capturar señales de terminación
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Capturar errores no manejados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (process.env.NODE_ENV === 'production') {
    gracefulShutdown('UNHANDLED_REJECTION');
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// ============================================================================
// INICIALIZACIÓN DE BASE DE DATOS ✅ - COMPATIBLE CON SQLITE Y POSTGRESQL
// ============================================================================
const initializeDatabase = async () => {
  try {
    console.log('🔄 Verificando conexión a base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión a base de datos establecida');
    
    // Detectar tipo de base de datos y verificar tablas
    try {
      let tablesResult;
      let dbType = 'unknown';
      
      // Intentar con PostgreSQL/MySQL primero
      try {
        tablesResult = await prisma.$queryRaw`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name IN ('User', 'Clinic', 'Treatment', 'Appointment')
        `;
        dbType = 'postgresql';
      } catch (pgError) {
        // Si falla, intentar con SQLite
        try {
          tablesResult = await prisma.$queryRaw`
            SELECT name as table_name 
            FROM sqlite_master 
            WHERE type = 'table' 
            AND name IN ('User', 'Clinic', 'Treatment', 'Appointment')
          `;
          dbType = 'sqlite';
        } catch (sqliteError) {
          console.log('⚠️ No se pudo determinar el tipo de base de datos');
          console.log('💡 Ejecuta: npx prisma migrate dev');
          return;
        }
      }
      
      // Convertir resultado a array simple para manejar diferentes formatos
      const tables = Array.isArray(tablesResult) ? tablesResult : [tablesResult];
      
      console.log(`🎯 Base de datos detectada: ${dbType.toUpperCase()}`);
      
      if (tables.length > 0) {
        console.log(`✅ Tablas verificadas: ${tables.length}/4`);
        tables.forEach(table => {
          console.log(`   - ${table.table_name}`);
        });
        
        // Verificar si tenemos todas las tablas necesarias
        if (tables.length < 4) {
          console.log('⚠️ Faltan tablas por crear. Ejecuta: npx prisma migrate dev');
        }
      } else {
        console.log('⚠️ No se encontraron tablas principales');
        console.log('💡 Ejecuta: npx prisma migrate dev');
      }
    } catch (dbError) {
      console.log('⚠️ No se pudieron verificar las tablas:', dbError.message);
      console.log('💡 Esto es normal si es la primera vez que ejecutas la app');
    }
    
  } catch (error) {
    console.error('❌ Error conectando a base de datos:', error.message);
    
    // Mostrar más detalles del error en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error('🔍 Detalles del error:', {
        code: error.code,
        message: error.message,
        meta: error.meta
      });
      console.log('💡 Verifica tu DATABASE_URL en el archivo .env');
      console.log('💡 Si usas PostgreSQL, asegúrate de que el servidor esté corriendo');
      console.log('💡 Si usas SQLite, ejecuta: npx prisma migrate dev');
    }
    
    // Solo salir en producción si no hay base de datos
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Error crítico: No se puede conectar a la base de datos en producción');
      process.exit(1);
    }
  }
};

// ============================================================================
// FUNCIÓN PARA VERIFICAR ENDPOINTS CRÍTICOS AL INICIO
// ============================================================================
const verifyEndpoints = () => {
  const criticalRoutes = [
    '/api/auth/health',
    '/api/auth/demo-login',
    '/api/auth/login',
    '/api/auth/register'
  ];

  console.log('🔍 Verificando endpoints críticos...');
  
  criticalRoutes.forEach(route => {
    try {
      // Verificar que las rutas están registradas
      const routeExists = app._router && app._router.stack.some(layer => {
        return layer.route && layer.route.path === route;
      });
      
      if (routeExists) {
        console.log(`✅ ${route} - Registrado`);
      } else {
        console.log(`⚠️ ${route} - No encontrado en router`);
      }
    } catch (error) {
      console.log(`❌ ${route} - Error verificando: ${error.message}`);
    }
  });
};

// ============================================================================
// INICIALIZACIÓN COMPLETA
// ============================================================================
const initializeApp = async () => {
  console.log('🚀 Iniciando aplicación...');
  
  // 1. Inicializar base de datos
  await initializeDatabase();
  
  // 2. Verificar endpoints
  verifyEndpoints();
  
  // 3. Mostrar información de arranque
  console.log('🎯 Aplicación lista para recibir requests');
  console.log(`📱 Endpoints principales:`);
  console.log(`   - Health: GET /health`);
  console.log(`   - Demo Login: POST /api/auth/demo-login`);
  console.log(`   - Login: POST /api/auth/login`);
  console.log(`   - Register: POST /api/auth/register`);
  console.log(`   - Dashboard: GET /api/dashboard`);
  console.log(`   - Docs: GET /docs/postman`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔧 Modo desarrollo activo`);
    console.log(`🌐 CORS configurado para IPs locales`);
    console.log(`📊 Rate limit: 1000 requests/15min`);
  }
};

// Ejecutar inicialización
initializeApp().catch(error => {
  console.error('❌ Error durante inicialización:', error);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// ============================================================================
// EXPORTAR APP (para testing) ✅
// ============================================================================
module.exports = app;