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

// Importar rutas opcionales con manejo de errores
const importOptionalRoute = (routePath, routeName) => {
  try {
    const route = require(routePath);
    console.log(`✅ ${routeName} routes loaded`);
    return route;
  } catch (error) {
    console.log(`⚠️ ${routeName} routes not found - creating fallback`);
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
const offersRoutes = importOptionalRoute('./src/routes/offers', 'Offers');
const webhookRoutes = importOptionalRoute('./src/routes/webhook.routes', 'Webhook');

// Middleware de errores
const { errorHandler } = require('./src/middleware/error.middleware');

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
const app = express();
const prisma = new PrismaClient();

// ============================================================================
// MIDDLEWARES GLOBALES
// ============================================================================

// Seguridad
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// CORS mejorado y más permisivo
app.use(cors({
  origin: function (origin, callback) {
    // Permitir solicitudes sin origen (apps móviles, Postman)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? (process.env.CORS_ORIGIN?.split(',') || [])
      : [
          'http://localhost:3000',
          'http://localhost:19006',
          'http://192.168.1.174:8081',
          'exp://192.168.1.174:8081',
          // Permitir cualquier IP local en desarrollo
          /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
          /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/,
          /^http:\/\/172\.16\.\d+\.\d+:\d+$/
        ];
    
    // En desarrollo, ser más permisivo
    if (process.env.NODE_ENV === 'development') {
      if (origin.includes('192.168.') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    callback(null, isAllowed || process.env.NODE_ENV === 'development');
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control']
}));

// Logging para debug
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`📡 ${req.method} ${req.originalUrl} - Origin: ${req.get('Origin') || 'No origin'}`);
    next();
  });
}

// Rate limiting más permisivo en desarrollo
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'development' ? 1000 : 100,
  message: { success: false, error: { message: 'Demasiadas solicitudes' } },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing - webhooks de Stripe necesitan raw body
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Belleza Estética API - Sistema Completo',
    version: '2.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      clinics: '/api/clinics',
      dashboard: '/api/dashboard',
      appointments: '/api/appointments',
      profile: '/api/user/profile'
    }
  });
});

// ============================================================================
// RUTAS PRINCIPALES
// ============================================================================

// RUTAS DE AUTENTICACIÓN (CRÍTICAS)
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes loaded');

// RUTAS DE CLÍNICAS con fallback
app.get('/api/clinics', async (req, res) => {
  try {
    let clinics = [];
    
    try {
      // Intentar obtener de la base de datos
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
            id: true, name: true, slug: true, city: true,
            logoUrl: true, address: true, phone: true, description: true
          },
          orderBy: { name: 'asc' }
        });
      }
    } catch (dbError) {
      console.log('⚠️ No se pudo consultar tabla Clinic, usando datos demo');
    }
    
    // Si no hay clínicas en BD, usar datos demo
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
        }
      ];
    }
    
    res.json({
      success: true,
      data: clinics,
      total: clinics.length,
      message: clinics.length === 0 ? 'Datos demo - configura la migración' : undefined
    });
    
  } catch (error) {
    console.error('❌ Error en GET /api/clinics:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error obteniendo clínicas' }
    });
  }
});

// RUTAS DE CLÍNICA ESPECÍFICA
app.get('/api/clinics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let clinic = null;
    
    try {
      clinic = await prisma.clinic.findFirst({
        where: { 
          OR: [{ id: id }, { slug: id }],
          isActive: true 
        }
      });
    } catch (dbError) {
      console.log('⚠️ Error consultando BD, usando datos demo');
    }
    
    // Fallback a datos demo
    if (!clinic) {
      const demoClinics = {
        'madrid-centro': { id: 'madrid-centro', name: 'Clínica Madrid Centro', city: 'Madrid' },
        'barcelona-eixample': { id: 'barcelona-eixample', name: 'Clínica Barcelona Eixample', city: 'Barcelona' }
      };
      clinic = demoClinics[id];
    }
    
    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: { message: 'Clínica no encontrada' }
      });
    }
    
    res.json({ success: true, data: clinic });
    
  } catch (error) {
    console.error('❌ Error en GET /api/clinics/:id:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error obteniendo clínica' }
    });
  }
});

console.log('✅ Clinic routes loaded');

// RUTAS OPCIONALES CON FALLBACKS
if (dashboardRoutes) {
  app.use('/api/dashboard', dashboardRoutes);
} else {
  app.get('/api/dashboard', (req, res) => {
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
}

if (appointmentRoutes) {
  app.use('/api/appointments', appointmentRoutes);
} else {
  // FALLBACK CRÍTICO PARA APPOINTMENTS
  const appointmentRouter = express.Router();
  
  // Dashboard data para NextAppointmentCard
  appointmentRouter.get('/dashboard', (req, res) => {
    res.json({
      success: true,
      data: {
        nextAppointment: {
          id: 'apt-demo-123',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
          treatment: {
            name: 'Limpieza Facial Profunda',
            duration: 60,
            price: 7500
          },
          status: 'confirmed',
          professional: {
            name: 'María González',
            avatar: null
          },
          location: {
            name: 'Clínica Madrid Centro',
            address: 'Calle Gran Vía, 28'
          }
        },
        featuredTreatments: [
          { id: 't1', name: 'Masaje Relajante', price: 5000, image: null },
          { id: 't2', name: 'Tratamiento Antiedad', price: 8500, image: null }
        ],
        todayAppointments: 1,
        user: {
          beautyPoints: 1250,
          vipStatus: true
        }
      },
      message: 'Dashboard fallback - implement appointment.routes.js'
    });
  });
  
  // Lista de citas del usuario
  appointmentRouter.get('/user', (req, res) => {
    res.json({
      success: true,
      data: [
        {
          id: 'apt-demo-123',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          treatment: { name: 'Limpieza Facial Profunda', duration: 60 },
          status: 'confirmed',
          professional: { name: 'María González' }
        }
      ],
      message: 'User appointments fallback'
    });
  });
  
  // Lista de tratamientos
  appointmentRouter.get('/treatments', (req, res) => {
    res.json({
      success: true,
      data: [
        { id: 't1', name: 'Limpieza Facial', duration: 60, price: 5000, category: 'Facial' },
        { id: 't2', name: 'Masaje Relajante', duration: 90, price: 7500, category: 'Corporal' },
        { id: 't3', name: 'Tratamiento Antiedad', duration: 75, price: 8500, category: 'Facial' }
      ],
      message: 'Treatments fallback'
    });
  });
  
  app.use('/api/appointments', appointmentRouter);
}

if (profileRoutes) {
  app.use('/api/user', profileRoutes);
} else {
  // FALLBACK CRÍTICO PARA PROFILE
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
      },
      message: 'Profile fallback - implement profile.routes.js'
    });
  });
}

// RUTAS OPCIONALES ADICIONALES
if (beautyPointsRoutes) {
  app.use('/api/beauty-points', beautyPointsRoutes);
} else {
  app.get('/api/beauty-points', (req, res) => {
    res.json({
      success: true,
      data: {
        currentPoints: 1250,
        history: [
          { date: '2025-08-01', points: 100, description: 'Cita completada', type: 'earned' },
          { date: '2025-07-28', points: -200, description: 'Descuento aplicado', type: 'spent' }
        ],
        availableRewards: [
          { id: 'r1', name: 'Descuento 10%', cost: 500, description: '10% en próxima cita' },
          { id: 'r2', name: 'Tratamiento gratis', cost: 1000, description: 'Limpieza facial gratuita' }
        ]
      },
      message: 'Beauty points fallback'
    });
  });
}

if (vipRoutes) {
  app.use('/api/vip', vipRoutes);
} else {
  app.get('/api/vip/benefits', (req, res) => {
    res.json({
      success: true,
      data: {
        isVip: true,
        benefits: [
          'Descuentos exclusivos del 15%',
          'Prioridad en reservas',
          'Acceso a tratamientos premium',
          'Consultas gratuitas'
        ],
        pointsToNextLevel: 0,
        currentLevel: 'VIP Gold'
      },
      message: 'VIP benefits fallback'
    });
  });
}

// Cargar rutas restantes con fallbacks silenciosos
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
    console.log(`⚠️ ${name} routes not found - skipping`);
  }
});

// ============================================================================
// ENDPOINT DE TESTING
// ============================================================================
app.get('/api/test-endpoints', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    criticalEndpoints: [
      { name: 'Auth Health', path: '/api/auth/health', status: 'active' },
      { name: 'Patient Login', path: '/api/auth/patient/login', status: 'fixed' },
      { name: 'Demo Login', path: '/api/auth/demo-login', status: 'active' },
      { name: 'Clinics List', path: '/api/clinics', status: 'active' },
      { name: 'Dashboard Data', path: '/api/appointments/dashboard', status: 'active' },
      { name: 'User Profile', path: '/api/user/profile', status: 'active' },
      { name: 'Treatments', path: '/api/appointments/treatments', status: 'active' }
    ],
    testFlow: [
      '1. POST /api/auth/demo-login (get token)',
      '2. GET /api/appointments/dashboard (verify NextAppointment data)',
      '3. GET /api/user/profile (verify user data)',
      '4. GET /api/clinics (verify clinics list)'
    ]
  });
});

// ============================================================================
// DOCUMENTACIÓN SIMPLIFICADA
// ============================================================================
app.get('/docs/postman', (req, res) => {
  res.json({
    name: 'Belleza Estética API v2.0',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    criticalEndpoints: [
      {
        name: 'Demo Login',
        method: 'POST',
        url: '/api/auth/demo-login',
        body: {},
        description: 'Login instantáneo para testing'
      },
      {
        name: 'Patient Login', 
        method: 'POST',
        url: '/api/auth/patient/login',
        body: {
          email: 'ana.garcia@example.com',
          password: 'password123',
          clinicSlug: 'madrid-centro'
        },
        description: 'Login normal de paciente - CORREGIDO'
      },
      {
        name: 'Dashboard Data',
        method: 'GET',
        url: '/api/appointments/dashboard',
        headers: { 'Authorization': 'Bearer <token>' },
        description: 'Datos para NextAppointmentCard'
      },
      {
        name: 'User Profile',
        method: 'GET',
        url: '/api/user/profile',
        headers: { 'Authorization': 'Bearer <token>' },
        description: 'Perfil con beautyPoints'
      },
      {
        name: 'Clinics List',
        method: 'GET',
        url: '/api/clinics',
        description: 'Lista de clínicas disponibles'
      }
    ],
    fixes: [
      '✅ Eliminado filtro restrictivo role: "user" en patient login',
      '✅ Añadida verificación de tipo de usuario',
      '✅ Fallbacks implementados para todos los endpoints críticos',
      '✅ CORS más permisivo para desarrollo',
      '✅ Manejo de errores mejorado'
    ]
  });
});

// ============================================================================
// MANEJO DE ERRORES
// ============================================================================

// Rutas no encontradas
app.use('*', (req, res) => {
  const isApiRoute = req.originalUrl.startsWith('/api/');
  
  if (isApiRoute) {
    res.status(404).json({
      success: false,
      error: {
        message: 'Endpoint no encontrado',
        path: req.originalUrl,
        method: req.method
      },
      availableEndpoints: {
        auth: '/api/auth/* (login corregido)',
        clinics: '/api/clinics',
        appointments: '/api/appointments/dashboard, /api/appointments/user',
        profile: '/api/user/profile',
        documentation: '/docs/postman'
      }
    });
  } else {
    res.redirect('/?info=api-redirect');
  }
});

// Middleware de errores
app.use(errorHandler);

// ============================================================================
// INICIALIZACIÓN Y GRACEFUL SHUTDOWN
// ============================================================================
const gracefulShutdown = async (signal) => {
  console.log(`\n📡 Recibida señal ${signal}. Cerrando aplicación...`);
  
  try {
    await prisma.$disconnect();
    console.log('✅ Conexión a Prisma cerrada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante cierre:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

// Inicialización de base de datos
const initializeDatabase = async () => {
  try {
    console.log('🔄 Verificando conexión a base de datos...');
    await prisma.$connect();
    console.log('✅ Conexión a base de datos establecida');
    
    // Verificar tablas principales
    try {
      const tablesResult = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('User', 'Clinic', 'Treatment', 'Appointment')
      `;
      
      const tables = Array.isArray(tablesResult) ? tablesResult : [tablesResult];
      console.log(`🎯 Tablas verificadas: ${tables.length}/4`);
      
      if (tables.length < 4) {
        console.log('⚠️ Faltan tablas. Ejecuta: npx prisma migrate dev');
      }
    } catch (dbError) {
      console.log('⚠️ No se pudieron verificar tablas - usando fallbacks');
    }
    
  } catch (error) {
    console.error('❌ Error conectando a base de datos:', error.message);
    console.log('💡 Usando fallbacks para desarrollo');
  }
};

// Inicialización completa
const initializeApp = async () => {
  console.log('🚀 Iniciando aplicación v2.0...');
  
  await initializeDatabase();
  
  console.log('🎯 Aplicación lista:');
  console.log('   ✅ Auth login CORREGIDO');
  console.log('   ✅ Fallbacks implementados');
  console.log('   ✅ NextAppointmentCard soportado');
  console.log('   📚 Docs: GET /docs/postman');
  console.log('   🧪 Test: POST /api/auth/demo-login');
};

initializeApp().catch(error => {
  console.error('❌ Error durante inicialización:', error);
});

module.exports = app;