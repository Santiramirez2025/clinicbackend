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
app.use(helmet());

// CORS - Más permisivo para producción
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.CORS_ORIGIN?.split(',') || true) 
    : [
        'http://localhost:3000',
        'http://localhost:19006',
        'exp://192.168.1.174:8081'
      ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: { success: false, error: { message: 'Demasiadas solicitudes' } }
});
app.use('/api/', limiter);

// Parsing
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Compresión y logging
app.use(compression());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
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
      uptime: process.uptime()
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

app.get('/', (req, res) => {
  res.json({
    message: '🏥 Belleza Estética API - Sistema Completo',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
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
      swagger: '/docs/swagger'
    }
  });
});

// ============================================================================
// RUTAS PRINCIPALES ✅
// ============================================================================

try {
  // Rutas de autenticación (CRÍTICAS)
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded');

  // Rutas principales (CRÍTICAS)
  app.use('/api/dashboard', dashboardRoutes);
  console.log('✅ Dashboard routes loaded');

  app.use('/api/appointments', appointmentRoutes);
  console.log('✅ Appointment routes loaded');

  // Rutas opcionales (CON MANEJO DE ERRORES)
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
// DOCUMENTACIÓN ✅
// ============================================================================
app.get('/docs/postman', (req, res) => {
  res.json({
    info: {
      name: 'Belleza Estética API',
      description: 'API completa para sistema de belleza y estética',
      version: '1.0.0'
    },
    endpoints: [
      {
        name: 'Health Check',
        method: 'GET',
        url: '/health'
      },
      {
        name: 'Auth - Demo Login',
        method: 'POST',
        url: '/api/auth/demo-login',
        description: 'Login sin credenciales para testing'
      },
      {
        name: 'Auth - Login',
        method: 'POST',
        url: '/api/auth/login',
        body: { 
          email: 'demo@bellezaestetica.com', 
          password: 'demo123' 
        }
      },
      {
        name: 'Auth - Register',
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
      }
    ],
    testing: {
      demoCredentials: {
        email: 'demo@bellezaestetica.com',
        password: 'demo123'
      },
      demoToken: 'Use /api/auth/demo-login to get a token'
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
        auth: '/api/auth/*',
        dashboard: '/api/dashboard',
        appointments: '/api/appointments',
        beautyPoints: '/api/beauty-points',
        vip: '/api/vip/*',
        profile: '/api/profile',
        payments: '/api/payments',
        notifications: '/api/notifications',
        offers: '/api/offers'
      },
      documentation: '/docs/postman'
    });
  } else {
    // Para rutas no API, redirigir a la raíz
    res.redirect('/');
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
    }
    
    // Solo salir en producción si no hay base de datos
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 Error crítico: No se puede conectar a la base de datos en producción');
      process.exit(1);
    }
  }
};

// Inicializar BD al arrancar
initializeDatabase();

// ============================================================================
// EXPORTAR APP (para testing) ✅
// ============================================================================
module.exports = app;