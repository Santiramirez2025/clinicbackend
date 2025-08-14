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
// IMPORTAR RUTAS CON MEJOR MANEJO DE ERRORES ✅
// ============================================================================

// Función mejorada para importar rutas
const importOptionalRoute = (routePath, routeName) => {
  try {
    const route = require(routePath);
    console.log(`✅ ${routeName} routes loaded successfully`);
    return route;
  } catch (error) {
    console.log(`⚠️ ${routeName} routes not found:`, error.message);
    return null;
  }
};

// Importar rutas principales
let authRoutes, treatmentRoutes;
try {
  authRoutes = require('./src/routes/auth.routes');
  console.log('✅ Auth routes imported');
} catch (error) {
  console.error('❌ CRITICAL: Auth routes failed to load:', error.message);
  process.exit(1); // Auth es crítico
}

try {
  treatmentRoutes = require('./src/routes/treatment.routes');
  console.log('✅ Treatment routes imported');
} catch (error) {
  console.log('⚠️ Treatment routes not available:', error.message);
  treatmentRoutes = null;
}

// Importar rutas opcionales
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
let errorHandler;
try {
  const errorMiddleware = require('./src/middleware/error.middleware');
  errorHandler = errorMiddleware.errorHandler;
  console.log('✅ Error handler loaded');
} catch (error) {
  console.log('⚠️ Error handler not found, using default');
  errorHandler = (err, req, res, next) => {
    console.error('❌ Error:', err);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      }
    });
  };
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================
const app = express();
let prisma;

try {
  prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
  });
  console.log('✅ Prisma client initialized');
} catch (error) {
  console.error('❌ Prisma initialization failed:', error);
  process.exit(1);
}

// ============================================================================
// MIDDLEWARES GLOBALES - CONFIGURACIÓN PERMISIVA PARA DEBUG ✅
// ============================================================================

// Logging temprano para debug
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Seguridad básica (menos restrictiva para debug)
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // Deshabilitado temporalmente
  hsts: false // Deshabilitado para desarrollo
}));

// CORS muy permisivo para debug
app.use(cors({
  origin: true, // Permitir todos los orígenes temporalmente
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control']
}));

// Rate limiting muy permisivo para debug
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000, // Muy alto para debug
  message: { success: false, error: { message: 'Too many requests' } },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development'
});
app.use('/api/', limiter);

// Body parsing
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compresión y logging
app.use(compression());
app.use(morgan('dev'));

// ============================================================================
// RUTAS DE SALUD Y DEBUG ✅
// ============================================================================
app.get('/health', async (req, res) => {
  console.log('🏥 Health check requested');
  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection OK');
    
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      version: '2.0.0',
      debug: {
        authRoutes: !!authRoutes,
        treatmentRoutes: !!treatmentRoutes,
        appointmentRoutes: !!appointmentRoutes,
        profileRoutes: !!profileRoutes
      }
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Ruta raíz con información de debug
app.get('/', (req, res) => {
  console.log('🏠 Root endpoint accessed');
  res.json({
    message: '🏥 Belleza Estética API - Debug Mode',
    version: '2.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    debug: {
      nodeEnv: process.env.NODE_ENV || 'development',
      authRoutes: !!authRoutes,
      treatmentRoutes: !!treatmentRoutes,
      appointmentRoutes: !!appointmentRoutes,
      profileRoutes: !!profileRoutes,
      prismaConnected: !!prisma
    },
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      clinics: '/api/clinics',
      treatments: '/api/treatments',
      appointments: '/api/appointments',
      profile: '/api/user/profile'
    }
  });
});

// ============================================================================
// RUTAS PRINCIPALES CON MANEJO DE ERRORES ✅
// ============================================================================

// RUTAS DE AUTENTICACIÓN (CRÍTICAS)
try {
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes mounted successfully');
} catch (error) {
  console.error('❌ Failed to mount auth routes:', error);
}

// RUTAS DE TRATAMIENTOS
if (treatmentRoutes) {
  try {
    app.use('/api/treatments', treatmentRoutes);
    console.log('✅ Treatment routes mounted successfully');
  } catch (error) {
    console.error('❌ Failed to mount treatment routes:', error);
  }
} else {
  // Fallback simple para treatments
  app.get('/api/treatments', (req, res) => {
    console.log('📋 Treatments fallback called');
    res.json({
      success: true,
      data: {
        treatments: [
          {
            id: 't1',
            name: 'Limpieza Facial',
            description: 'Limpieza profunda facial',
            duration: 60,
            price: 5000,
            category: 'Facial',
            emoji: '✨'
          },
          {
            id: 't2',
            name: 'Masaje Relajante',
            description: 'Masaje corporal relajante',
            duration: 90,
            price: 7000,
            category: 'Corporal',
            emoji: '💆‍♀️'
          }
        ]
      },
      message: 'Treatments fallback data'
    });
  });
  console.log('⚠️ Treatment routes fallback loaded');
}

// ============================================================================
// RUTAS DE CLÍNICAS - SIMPLIFICADAS PARA DEBUG ✅
// ============================================================================
app.get('/api/clinics', async (req, res) => {
  console.log('🏥 Clinics endpoint called');
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
        console.log(`✅ Found ${clinics.length} clinics in database`);
      }
    } catch (dbError) {
      console.log('⚠️ Database query failed, using fallback:', dbError.message);
    }
    
    // Usar datos demo si no hay clínicas
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
      console.log('✅ Using demo clinic data');
    }
    
    res.json({
      success: true,
      data: clinics,
      total: clinics.length,
      debug: {
        source: clinics.length > 0 && clinics[0].id !== 'madrid-centro' ? 'database' : 'demo',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error in GET /api/clinics:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Error fetching clinics',
        details: error.message
      }
    });
  }
});

// RUTAS DE CLÍNICA ESPECÍFICA
app.get('/api/clinics/:id', async (req, res) => {
  console.log(`🏥 Specific clinic requested: ${req.params.id}`);
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
      
      if (clinic) {
        console.log(`✅ Found clinic in database: ${clinic.name}`);
      }
    } catch (dbError) {
      console.log('⚠️ Database error, using demo data:', dbError.message);
    }
    
    // Fallback a datos demo
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
      
      if (clinic) {
        console.log(`✅ Using demo clinic: ${clinic.name}`);
      }
    }
    
    if (!clinic) {
      console.log(`❌ Clinic not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: { message: 'Clinic not found' }
      });
    }
    
    res.json({ 
      success: true, 
      data: clinic,
      debug: {
        source: clinic.createdAt ? 'database' : 'demo',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error in GET /api/clinics/:id:', error);
    res.status(500).json({
      success: false,
      error: { 
        message: 'Error fetching clinic',
        details: error.message
      }
    });
  }
});

console.log('✅ Clinic routes loaded');

// ============================================================================
// RUTAS OPCIONALES CON FALLBACKS ROBUSTOS ✅
// ============================================================================

// DASHBOARD ROUTES
if (dashboardRoutes) {
  try {
    app.use('/api/dashboard', dashboardRoutes);
    console.log('✅ Dashboard routes mounted');
  } catch (error) {
    console.error('❌ Failed to mount dashboard routes:', error);
  }
} else {
  app.get('/api/dashboard', (req, res) => {
    console.log('📊 Dashboard fallback called');
    res.json({
      success: true,
      data: {
        totalAppointments: 15,
        todayAppointments: 3,
        totalUsers: 120,
        revenue: 15000
      },
      message: 'Dashboard fallback active'
    });
  });
  console.log('⚠️ Dashboard fallback loaded');
}

// APPOINTMENT ROUTES - CRÍTICAS
if (appointmentRoutes) {
  try {
    app.use('/api/appointments', appointmentRoutes);
    console.log('✅ Appointment routes mounted');
  } catch (error) {
    console.error('❌ Failed to mount appointment routes:', error);
    // Crear fallback en caso de error
    createAppointmentFallback();
  }
} else {
  createAppointmentFallback();
}

function createAppointmentFallback() {
  const appointmentFallbackRouter = express.Router();
  
  // Health check
  appointmentFallbackRouter.get('/health', (req, res) => {
    console.log('🏥 Appointment health check');
    res.json({
      success: true,
      message: 'Appointment routes fallback active',
      timestamp: new Date().toISOString()
    });
  });
  
  // Dashboard data
  appointmentFallbackRouter.get('/dashboard', (req, res) => {
    console.log('📊 Appointment dashboard fallback');
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
          { id: 't1', name: 'Masaje Relajante', price: 5000, emoji: '💆‍♀️' },
          { id: 't2', name: 'Tratamiento Antiedad', price: 8500, emoji: '✨' }
        ],
        todayAppointments: 1,
        user: {
          beautyPoints: 1250,
          vipStatus: true
        }
      },
      message: 'Appointment dashboard fallback'
    });
  });
  
  // User appointments
  appointmentFallbackRouter.get('/user', (req, res) => {
    console.log('👤 User appointments fallback');
    res.json({
      success: true,
      data: {
        appointments: [
          {
            id: 'apt-demo-123',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            treatment: { name: 'Limpieza Facial Profunda', duration: 60 },
            status: 'confirmed',
            professional: { name: 'María González' }
          }
        ]
      },
      message: 'User appointments fallback'
    });
  });
  
  // Availability endpoint - CRÍTICO
  appointmentFallbackRouter.get('/availability/:clinicId/:date', (req, res) => {
    const { clinicId, date } = req.params;
    console.log(`⏰ Availability fallback: ${clinicId} - ${date}`);
    
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
            professionals: [
              {
                id: 'prof-demo-1',
                name: 'María González',
                specialty: 'Facial',
                rating: 4.8
              }
            ],
            count: 1
          },
          {
            time: '10:00',
            available: true,
            professionals: [
              {
                id: 'prof-demo-2',
                name: 'Ana Martínez',
                specialty: 'Corporal',
                rating: 4.9
              }
            ],
            count: 1
          }
        ],
        totalSlots: 2
      },
      message: 'Availability fallback data'
    });
  });
  
  app.use('/api/appointments', appointmentFallbackRouter);
  console.log('⚠️ Appointment fallback routes loaded');
}

// PROFILE ROUTES
if (profileRoutes) {
  try {
    app.use('/api/user', profileRoutes);
    console.log('✅ Profile routes mounted');
  } catch (error) {
    console.error('❌ Failed to mount profile routes:', error);
    createProfileFallback();
  }
} else {
  createProfileFallback();
}

function createProfileFallback() {
  app.get('/api/user/profile', (req, res) => {
    console.log('👤 Profile fallback called');
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
      message: 'Profile fallback active'
    });
  });
  console.log('⚠️ Profile fallback loaded');
}

// BEAUTY POINTS ROUTES
if (beautyPointsRoutes) {
  try {
    app.use('/api/beauty-points', beautyPointsRoutes);
    console.log('✅ Beauty Points routes mounted');
  } catch (error) {
    console.error('❌ Failed to mount beauty points routes:', error);
  }
} else {
  app.get('/api/beauty-points', (req, res) => {
    console.log('💎 Beauty points fallback called');
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

// VIP ROUTES
if (vipRoutes) {
  try {
    app.use('/api/vip', vipRoutes);
    console.log('✅ VIP routes mounted');
  } catch (error) {
    console.error('❌ Failed to mount VIP routes:', error);
  }
} else {
  app.get('/api/vip/benefits', (req, res) => {
    console.log('👑 VIP benefits fallback called');
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

// Cargar rutas restantes de forma segura
[
  { routes: paymentRoutes, path: '/api/payments', name: 'Payment' },
  { routes: notificationsRoutes, path: '/api/notifications', name: 'Notifications' },
  { routes: offersRoutes, path: '/api/offers', name: 'Offers' },
  { routes: webhookRoutes, path: '/api/webhooks', name: 'Webhook' }
].forEach(({ routes, path, name }) => {
  if (routes) {
    try {
      app.use(path, routes);
      console.log(`✅ ${name} routes mounted`);
    } catch (error) {
      console.error(`❌ Failed to mount ${name} routes:`, error.message);
    }
  } else {
    console.log(`⚠️ ${name} routes not available`);
  }
});

// ============================================================================
// TESTING Y DEBUG ENDPOINTS ✅
// ============================================================================
app.get('/api/test-endpoints', (req, res) => {
  console.log('🧪 Test endpoints called');
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    server: 'running',
    environment: process.env.NODE_ENV || 'development',
    criticalEndpoints: [
      { name: 'Health Check', path: '/health', status: 'active' },
      { name: 'Auth Routes', path: '/api/auth/*', status: authRoutes ? 'active' : 'missing' },
      { name: 'Clinics List', path: '/api/clinics', status: 'active' },
      { name: 'Treatments List', path: '/api/treatments', status: treatmentRoutes ? 'active' : 'fallback' },
      { name: 'Appointments', path: '/api/appointments/*', status: appointmentRoutes ? 'active' : 'fallback' },
      { name: 'User Profile', path: '/api/user/profile', status: profileRoutes ? 'active' : 'fallback' }
    ],
    testFlow: [
      '1. GET /health (check server)',
      '2. POST /api/auth/demo-login (get token)',
      '3. GET /api/clinics (verify clinics)',
      '4. GET /api/treatments (verify treatments)',
      '5. GET /api/appointments/dashboard (if available)'
    ],
    debug: {
      authRoutes: !!authRoutes,
      treatmentRoutes: !!treatmentRoutes,
      appointmentRoutes: !!appointmentRoutes,
      profileRoutes: !!profileRoutes,
      prisma: !!prisma
    }
  });
});

app.get('/api/debug/status', (req, res) => {
  console.log('🔍 Debug status requested');
  res.json({
    success: true,
    server: {
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development'
    },
    routes: {
      auth: !!authRoutes,
      treatments: !!treatmentRoutes,
      appointments: !!appointmentRoutes,
      profiles: !!profileRoutes,
      dashboard: !!dashboardRoutes
    },
    database: {
      connected: !!prisma,
      client: 'Prisma'
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// MANEJO DE ERRORES MEJORADO ✅
// ============================================================================

// Capturar errores de rutas no encontradas
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  
  const isApiRoute = req.originalUrl.startsWith('/api/');
  
  if (isApiRoute) {
    res.status(404).json({
      success: false,
      error: {
        message: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method
      },
      availableEndpoints: {
        health: '/health',
        auth: '/api/auth/*',
        clinics: '/api/clinics',
        treatments: '/api/treatments',
        appointments: '/api/appointments/*',
        profile: '/api/user/profile',
        debug: '/api/debug/status'
      }
    });
  } else {
    res.status(404).json({
      success: false,
      error: { message: 'Page not found' },
      apiInfo: 'API available at /api/*'
    });
  }
});

// Middleware de errores global
app.use((err, req, res, next) => {
  console.error('❌ Global error handler:', err);
  
  // Si ya se envió la respuesta, delegar al manejador por defecto
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err
      })
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// MANEJO DE ERRORES DE PROCESO ✅
// ============================================================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // No cerrar el proceso en desarrollo
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // No cerrar el proceso en desarrollo
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// ============================================================================
// INICIALIZACIÓN SIMPLIFICADA ✅
// ============================================================================
const initializeDatabase = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('💡 Continuing with fallback data');
    return false;
  }
};

const startServer = async () => {
  try {
    console.log('🚀 Starting Belleza Estética API...');
    
    // Intentar conectar a la base de datos (no crítico)
    const dbConnected = await initializeDatabase();
    
    const port = process.env.PORT || 3001;
    
    const server = app.listen(port, () => {
      console.log('🎯 SERVER STARTED SUCCESSFULLY:');
      console.log(`   🌐 URL: http://localhost:${port}`);
      console.log(`   📊 Database: ${dbConnected ? 'CONNECTED' : 'FALLBACK MODE'}`);
      console.log(`   🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('   📍 Key endpoints:');
      console.log('      - GET /health');
      console.log('      - GET /api/test-endpoints');
      console.log('      - GET /api/debug/status');
      console.log('      - POST /api/auth/demo-login');
      console.log('      - GET /api/clinics');
      console.log('   ✅ Server ready for connections');
    });
    
    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      console.log(`\n📡 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          if (prisma) {
            await prisma.$disconnect();
            console.log('✅ Database disconnected');
          }
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Iniciar el servidor
startServer();

module.exports = app;