// ============================================================================
// server.js - SERVIDOR COMPLETO Y PROFESIONAL (REEMPLAZA TU ARCHIVO ACTUAL)
// ============================================================================
const express = require('express');
const cors = require('cors');
require('dotenv').config();

console.log('🚀 Iniciando servidor avanzado...');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARES BÁSICOS
// ============================================================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Log de requests en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// ============================================================================
// DATOS MOCK SIMULANDO BASE DE DATOS
// ============================================================================
const MOCK_DATA = {
  users: {
    'demo-user-123': {
      id: 'demo-user-123',
      email: 'demo@bellezaestetica.com',
      firstName: 'María',
      lastName: 'Ejemplar',
      phone: '+54 11 1234-5678',
      vipStatus: true,
      beautyPoints: 280,
      sessionsCompleted: 12,
      totalInvestment: 18500,
      skinType: 'MIXED',
      memberSince: '2024-01-15',
      notifications: {
        appointments: true,
        wellness: true,
        offers: true
      }
    }
  },
  appointments: [
    {
      id: 'apt-001',
      userId: 'demo-user-123',
      treatment: 'Ritual Purificante',
      date: '2025-06-20',
      time: '14:30',
      professional: 'Ana Martínez',
      clinic: 'Belleza Estética Premium',
      status: 'confirmed',
      duration: 60,
      price: 2500,
      beautyPoints: 50
    },
    {
      id: 'apt-002',
      userId: 'demo-user-123',
      treatment: 'Drenaje Relajante',
      date: '2025-05-30',
      time: '16:00',
      professional: 'Carmen Rodríguez',
      clinic: 'Belleza Estética Premium',
      status: 'completed',
      duration: 90,
      price: 3500,
      beautyPoints: 70
    }
  ],
  treatments: [
    {
      id: 'treat-001',
      name: 'Ritual Purificante',
      description: 'Limpieza facial profunda con extracción y mascarilla',
      duration: 60,
      price: 2500,
      category: 'Facial',
      iconName: 'sparkles',
      isVipExclusive: false
    },
    {
      id: 'treat-002',
      name: 'Hidratación Premium VIP',
      description: 'Tratamiento exclusivo con ácido hialurónico y oro',
      duration: 75,
      price: 4500,
      category: 'Facial',
      iconName: 'crown',
      isVipExclusive: true
    },
    {
      id: 'treat-003',
      name: 'Drenaje Relajante',
      description: 'Masaje corporal de drenaje linfático',
      duration: 90,
      price: 3500,
      category: 'Corporal',
      iconName: 'waves',
      isVipExclusive: false
    }
  ],
  wellnessTips: [
    {
      title: 'Hidratación Matutina',
      content: 'Comienza tu día con un vaso de agua tibia con limón para activar tu metabolismo.',
      category: 'hidratacion',
      iconName: 'droplets'
    },
    {
      title: 'Protección Solar',
      content: 'Usa protector solar todos los días, incluso en días nublados.',
      category: 'proteccion',
      iconName: 'sun'
    }
  ]
};

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN SIMULADO
// ============================================================================
const mockAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Token de acceso requerido',
      message: 'Incluye Authorization: Bearer TOKEN en los headers'
    });
  }

  const token = authHeader.split(' ')[1];
  
  if (token === 'demo-jwt-token-123' || token.startsWith('valid-')) {
    req.user = MOCK_DATA.users['demo-user-123'];
    next();
  } else {
    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

// ============================================================================
// RUTAS BÁSICAS
// ============================================================================
app.get('/', (req, res) => {
  res.json({
    message: '🏥 Clínicas Estéticas SaaS API',
    status: 'online',
    version: '2.0.0',
    description: 'API completa con todas las funcionalidades',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: '✅ Servidor funcionando correctamente',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    features: ['Auth', 'Dashboard', 'VIP', 'Appointments', 'Profile']
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: '🚀 API Endpoints Disponibles',
    version: '2.0.0',
    endpoints: {
      auth: {
        demoLogin: 'POST /api/auth/demo-login',
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      },
      dashboard: {
        main: 'GET /api/dashboard (requiere auth)',
        beautyPoints: 'GET /api/dashboard/beauty-points (requiere auth)'
      },
      vip: {
        benefits: 'GET /api/vip/benefits',
        testimonials: 'GET /api/vip/testimonials',
        status: 'GET /api/vip/status (requiere auth)',
        subscribe: 'POST /api/vip/subscribe (requiere auth)'
      },
      appointments: {
        list: 'GET /api/appointments (requiere auth)',
        create: 'POST /api/appointments (requiere auth)',
        availability: 'GET /api/appointments/availability?treatmentId=X&date=Y'
      },
      profile: {
        get: 'GET /api/profile (requiere auth)',
        update: 'PUT /api/profile (requiere auth)',
        stats: 'GET /api/profile/stats (requiere auth)',
        history: 'GET /api/profile/history (requiere auth)'
      }
    }
  });
});

// ============================================================================
// AUTH ENDPOINTS
// ============================================================================
app.post('/api/auth/demo-login', (req, res) => {
  const user = MOCK_DATA.users['demo-user-123'];
  res.json({
    success: true,
    message: 'Bienvenida a la experiencia demo',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        vipStatus: user.vipStatus,
        beautyPoints: user.beautyPoints,
        sessionsCompleted: user.sessionsCompleted,
        isDemo: true
      },
      tokens: {
        accessToken: 'demo-jwt-token-123',
        refreshToken: 'demo-refresh-token-123',
        expiresIn: '1h'
      }
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'demo@bellezaestetica.com' && password === 'demo123') {
    const user = MOCK_DATA.users['demo-user-123'];
    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          vipStatus: user.vipStatus,
          beautyPoints: user.beautyPoints
        },
        tokens: {
          accessToken: 'valid-jwt-token-456',
          refreshToken: 'valid-refresh-token-456',
          expiresIn: '1h'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Credenciales inválidas',
      message: 'Usa: demo@bellezaestetica.com / demo123'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName, phone } = req.body;
  
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      error: 'Campos requeridos: email, password, firstName, lastName'
    });
  }

  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    data: {
      user: {
        id: `user-${Date.now()}`,
        email,
        firstName,
        lastName,
        beautyPoints: 20, // Bonus de bienvenida
        vipStatus: false
      },
      tokens: {
        accessToken: `valid-token-${Date.now()}`,
        refreshToken: `refresh-token-${Date.now()}`,
        expiresIn: '1h'
      }
    }
  });
});

// ============================================================================
// DASHBOARD ENDPOINTS
// ============================================================================
app.get('/api/dashboard', mockAuth, (req, res) => {
  const user = req.user;
  const nextAppointment = MOCK_DATA.appointments.find(apt => 
    apt.userId === user.id && apt.status === 'confirmed'
  );
  
  res.json({
    success: true,
    data: {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        vipStatus: user.vipStatus,
        beautyPoints: user.beautyPoints
      },
      nextAppointment: nextAppointment ? {
        id: nextAppointment.id,
        treatment: nextAppointment.treatment,
        date: nextAppointment.date,
        time: nextAppointment.time,
        professional: nextAppointment.professional,
        clinic: nextAppointment.clinic
      } : null,
      featuredTreatments: MOCK_DATA.treatments.slice(0, 3),
      wellnessTip: MOCK_DATA.wellnessTips[0],
      stats: {
        totalSessions: user.sessionsCompleted,
        beautyPoints: user.beautyPoints,
        totalInvestment: user.totalInvestment,
        vipStatus: user.vipStatus
      }
    }
  });
});

app.get('/api/dashboard/beauty-points', mockAuth, (req, res) => {
  const user = req.user;
  const history = MOCK_DATA.appointments
    .filter(apt => apt.userId === user.id && apt.status === 'completed')
    .map(apt => ({
      date: apt.date,
      treatment: apt.treatment,
      pointsEarned: apt.beautyPoints
    }));

  res.json({
    success: true,
    data: {
      currentPoints: user.beautyPoints,
      vipMultiplier: user.vipStatus ? 2 : 1,
      history,
      availableRewards: [
        { points: 100, reward: 'Descuento 10%', available: user.beautyPoints >= 100 },
        { points: 250, reward: 'Facial gratuito', available: user.beautyPoints >= 250 },
        { points: 500, reward: 'Tratamiento premium', available: user.beautyPoints >= 500 }
      ]
    }
  });
});

// ============================================================================
// VIP ENDPOINTS
// ============================================================================
app.get('/api/vip/benefits', (req, res) => {
  res.json({
    success: true,
    data: {
      benefits: [
        {
          id: 'discounts',
          title: 'Descuentos Exclusivos',
          description: 'Hasta 25% de descuento en todos los tratamientos',
          iconName: 'tag',
          category: 'savings'
        },
        {
          id: 'priority',
          title: 'Citas Prioritarias',
          description: 'Acceso preferencial a los mejores horarios',
          iconName: 'clock',
          category: 'convenience'
        },
        {
          id: 'free-facial',
          title: 'Facial Gratuito',
          description: 'Un facial de limpieza profunda cada 3 meses',
          iconName: 'sparkles',
          category: 'treatment'
        },
        {
          id: 'double-points',
          title: 'Puntos Dobles',
          description: 'Acumula Beauty Points 2x más rápido',
          iconName: 'star',
          category: 'points'
        },
        {
          id: 'personal-advisor',
          title: 'Asesoría Personalizada',
          description: 'Consulta con especialista en cuidado de la piel',
          iconName: 'user-check',
          category: 'consultation'
        }
      ]
    }
  });
});

app.get('/api/vip/testimonials', (req, res) => {
  res.json({
    success: true,
    data: {
      testimonials: [
        {
          id: 1,
          name: 'Ana García',
          age: 28,
          avatar: '👩🏻‍💼',
          comment: 'Los descuentos VIP me permiten cuidarme más seguido. ¡Increíble!',
          rating: 5
        },
        {
          id: 2,
          name: 'María Rodríguez',
          age: 35,
          avatar: '👩🏽‍🦰',
          comment: 'La asesoría personalizada cambió completamente mi rutina de belleza.',
          rating: 5
        },
        {
          id: 3,
          name: 'Carmen López',
          age: 42,
          avatar: '👩🏻‍🦱',
          comment: 'Siempre consigo los mejores horarios gracias a la prioridad VIP.',
          rating: 5
        }
      ]
    }
  });
});

app.get('/api/vip/status', mockAuth, (req, res) => {
  const user = req.user;
  res.json({
    success: true,
    data: {
      isVIP: user.vipStatus,
      subscription: user.vipStatus ? {
        id: 'sub-123',
        planType: 'MONTHLY',
        price: 19.99,
        status: 'ACTIVE',
        expiresAt: '2025-07-15',
        daysRemaining: 30
      } : null,
      benefits: {
        discountPercentage: user.vipStatus ? 25 : 0,
        pointsMultiplier: user.vipStatus ? 2 : 1,
        priorityBooking: user.vipStatus,
        freeMonthlyFacial: user.vipStatus,
        personalAdvisor: user.vipStatus
      }
    }
  });
});

app.post('/api/vip/subscribe', mockAuth, (req, res) => {
  const { planType = 'MONTHLY' } = req.body;
  const user = req.user;

  if (user.vipStatus) {
    return res.status(409).json({
      success: false,
      error: 'Ya tienes una suscripción VIP activa'
    });
  }

  res.status(201).json({
    success: true,
    message: '¡Bienvenida al Club VIP! 🎉',
    data: {
      subscription: {
        id: `sub-${Date.now()}`,
        planType,
        price: planType === 'MONTHLY' ? 19.99 : 199.99,
        status: 'ACTIVE',
        expiresAt: planType === 'MONTHLY' ? '2025-07-15' : '2026-06-15'
      },
      bonusPoints: 50,
      immediateDiscounts: true,
      welcomeMessage: 'Ya puedes disfrutar de todos los beneficios VIP'
    }
  });
});

// ============================================================================
// APPOINTMENTS ENDPOINTS
// ============================================================================
app.get('/api/appointments', mockAuth, (req, res) => {
  const user = req.user;
  const userAppointments = MOCK_DATA.appointments.filter(apt => apt.userId === user.id);

  res.json({
    success: true,
    data: {
      appointments: userAppointments.map(apt => ({
        id: apt.id,
        treatment: {
          name: apt.treatment,
          duration: apt.duration,
          price: apt.price
        },
        date: apt.date,
        time: apt.time,
        professional: apt.professional,
        clinic: apt.clinic,
        status: apt.status,
        beautyPointsEarned: apt.beautyPoints
      })),
      pagination: {
        total: userAppointments.length,
        page: 1,
        limit: 10,
        hasMore: false
      }
    }
  });
});

app.get('/api/appointments/availability', (req, res) => {
  const { treatmentId, date } = req.query;

  if (!treatmentId || !date) {
    return res.status(400).json({
      success: false,
      error: 'treatmentId y date son requeridos'
    });
  }

  const treatment = MOCK_DATA.treatments.find(t => t.id === treatmentId);
  if (!treatment) {
    return res.status(404).json({
      success: false,
      error: 'Tratamiento no encontrado'
    });
  }

  // Simular slots disponibles
  const availableSlots = [
    {
      time: '09:00',
      availableProfessionals: [
        { id: 'prof-1', name: 'Ana Martínez', specialties: ['Facial'], rating: 4.9 }
      ]
    },
    {
      time: '10:30',
      availableProfessionals: [
        { id: 'prof-1', name: 'Ana Martínez', specialties: ['Facial'], rating: 4.9 },
        { id: 'prof-2', name: 'Carmen Rodríguez', specialties: ['Corporal'], rating: 4.8 }
      ]
    },
    {
      time: '15:00',
      availableProfessionals: [
        { id: 'prof-2', name: 'Carmen Rodríguez', specialties: ['Corporal'], rating: 4.8 }
      ]
    }
  ];

  res.json({
    success: true,
    data: {
      date,
      treatment: {
        name: treatment.name,
        duration: treatment.duration,
        price: treatment.price
      },
      clinic: 'Belleza Estética Premium',
      availableSlots
    }
  });
});

app.post('/api/appointments', mockAuth, (req, res) => {
  const { treatmentId, date, time, professionalId, notes } = req.body;

  if (!treatmentId || !date || !time) {
    return res.status(400).json({
      success: false,
      error: 'treatmentId, date y time son requeridos'
    });
  }

  const treatment = MOCK_DATA.treatments.find(t => t.id === treatmentId);
  if (!treatment) {
    return res.status(404).json({
      success: false,
      error: 'Tratamiento no encontrado'
    });
  }

  const newAppointment = {
    id: `apt-${Date.now()}`,
    userId: req.user.id,
    treatment: treatment.name,
    date,
    time,
    professional: 'Ana Martínez',
    clinic: 'Belleza Estética Premium',
    status: 'pending',
    duration: treatment.duration,
    price: treatment.price,
    beautyPoints: Math.floor(treatment.price / 10) * (req.user.vipStatus ? 2 : 1),
    notes
  };

  // Simular guardar en "base de datos"
  MOCK_DATA.appointments.push(newAppointment);

  res.status(201).json({
    success: true,
    message: 'Cita creada exitosamente',
    data: {
      appointment: {
        id: newAppointment.id,
        treatment: newAppointment.treatment,
        date: newAppointment.date,
        time: newAppointment.time,
        professional: newAppointment.professional,
        clinic: newAppointment.clinic,
        status: newAppointment.status,
        beautyPointsEarned: newAppointment.beautyPoints,
        notes: newAppointment.notes
      }
    }
  });
});

// ============================================================================
// PROFILE ENDPOINTS
// ============================================================================
app.get('/api/profile', mockAuth, (req, res) => {
  const user = req.user;
  const nextAppointment = MOCK_DATA.appointments.find(apt => 
    apt.userId === user.id && apt.status === 'confirmed'
  );

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        skinType: user.skinType,
        memberSince: user.memberSince
      },
      stats: {
        beautyPoints: user.beautyPoints,
        sessionsCompleted: user.sessionsCompleted,
        totalInvestment: user.totalInvestment,
        vipStatus: user.vipStatus
      },
      skinProfile: {
        type: user.skinType,
        currentFocus: ['Hidratación', 'Luminosidad'],
        specialist: 'Dra. Ana Martínez'
      },
      nextAppointment: nextAppointment ? {
        id: nextAppointment.id,
        treatment: nextAppointment.treatment,
        date: nextAppointment.date,
        time: nextAppointment.time,
        professional: nextAppointment.professional,
        clinic: nextAppointment.clinic
      } : null,
      preferences: user.notifications
    }
  });
});

app.put('/api/profile', mockAuth, (req, res) => {
  const { firstName, lastName, phone, skinType } = req.body;
  
  // Simular actualización
  const updatedFields = {};
  if (firstName) updatedFields.firstName = firstName;
  if (lastName) updatedFields.lastName = lastName;
  if (phone) updatedFields.phone = phone;
  if (skinType) updatedFields.skinType = skinType;

  res.json({
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: { user: updatedFields }
  });
});

app.get('/api/profile/stats', mockAuth, (req, res) => {
  const user = req.user;
  
  res.json({
    success: true,
    data: {
      overview: {
        beautyPoints: user.beautyPoints,
        sessionsCompleted: user.sessionsCompleted,
        totalInvestment: user.totalInvestment,
        vipStatus: user.vipStatus,
        memberSince: user.memberSince,
        monthsActive: 5
      },
      topTreatments: [
        { name: 'Ritual Purificante', count: 4, iconName: 'sparkles' },
        { name: 'Drenaje Relajante', count: 3, iconName: 'waves' },
        { name: 'Hidratación Premium', count: 2, iconName: 'crown' }
      ],
      achievements: [
        {
          id: 'first-appointment',
          name: 'Primera Cita',
          description: 'Completaste tu primera cita',
          earned: true,
          iconName: 'calendar-check'
        },
        {
          id: 'beauty-enthusiast',
          name: 'Entusiasta de la Belleza',
          description: 'Completaste 10 sesiones',
          earned: user.sessionsCompleted >= 10,
          iconName: 'sparkles'
        },
        {
          id: 'vip-member',
          name: 'Miembro VIP',
          description: 'Te uniste al club exclusivo',
          earned: user.vipStatus,
          iconName: 'crown'
        }
      ]
    }
  });
});

app.get('/api/profile/history', mockAuth, (req, res) => {
  const user = req.user;
  const appointments = MOCK_DATA.appointments.filter(apt => apt.userId === user.id);
  
  // Agrupar por año-mes
  const groupedHistory = appointments.reduce((acc, appointment) => {
    const key = appointment.date.substring(0, 7); // YYYY-MM
    if (!acc[key]) acc[key] = [];
    acc[key].push({
      id: appointment.id,
      treatment: {
        name: appointment.treatment,
        duration: appointment.duration,
        price: appointment.price,
        iconName: 'sparkles'
      },
      date: appointment.date,
      time: appointment.time,
      professional: appointment.professional,
      clinic: appointment.clinic,
      status: appointment.status,
      beautyPointsEarned: appointment.beautyPoints
    });
    return acc;
  }, {});

  res.json({
    success: true,
    data: {
      history: groupedHistory,
      pagination: {
        total: appointments.length,
        page: 1,
        limit: 20,
        hasMore: false
      },
      summary: {
        totalAppointments: appointments.length,
        completedAppointments: appointments.filter(a => a.status === 'completed').length,
        totalSpent: appointments
          .filter(a => a.status === 'completed')
          .reduce((sum, a) => sum + a.price, 0)
      }
    }
  });
});

// ============================================================================
// ERROR HANDLERS
// ============================================================================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api',
      'POST /api/auth/demo-login',
      'POST /api/auth/login',
      'GET /api/dashboard (auth)',
      'GET /api/vip/benefits',
      'GET /api/appointments (auth)',
      'GET /api/profile (auth)'
    ]
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  res.status(err.status || 500).json({
    success: false,
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================
const server = app.listen(PORT, () => {
  console.log('\n🎉 ================================');
  console.log('   🚀 SERVIDOR COMPLETO INICIADO');
  console.log('🎉 ================================');
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🌐 URL Local: http://localhost:${PORT}`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Hora de inicio: ${new Date().toLocaleString()}`);
  console.log('================================\n');
  console.log('📋 Endpoints disponibles:');
  console.log('  ✅ GET  /health');
  console.log('  ✅ POST /api/auth/demo-login');
  console.log('  ✅ POST /api/auth/login');
  console.log('  ✅ GET  /api/dashboard (requiere auth)');
  console.log('  ✅ GET  /api/dashboard/beauty-points (requiere auth)');
  console.log('  ✅ GET  /api/vip/benefits');
  console.log('  ✅ GET  /api/vip/testimonials');
  console.log('  ✅ GET  /api/vip/status (requiere auth)');
  console.log('  ✅ POST /api/vip/subscribe (requiere auth)');
  console.log('  ✅ GET  /api/appointments (requiere auth)');
  console.log('  ✅ POST /api/appointments (requiere auth)');
  console.log('  ✅ GET  /api/appointments/availability');
  console.log('  ✅ GET  /api/profile (requiere auth)');
  console.log('  ✅ PUT  /api/profile (requiere auth)');
  console.log('  ✅ GET  /api/profile/stats (requiere auth)');
  console.log('  ✅ GET  /api/profile/history (requiere auth)');
  console.log('\n🔑 Credenciales de prueba:');
  console.log('  📧 Email: demo@bellezaestetica.com');
  console.log('  🔑 Password: demo123');
  console.log('  🎫 Demo Token: demo-jwt-token-123');
  console.log('\n✨ ¡Listo para recibir requests!');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal SIGTERM. Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal SIGINT (Ctrl+C). Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

module.exports = app;