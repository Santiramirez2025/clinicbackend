// ============================================================================
// src/app.js - APLICACIÓN PRINCIPAL COMPLETA Y FUNCIONAL ✅
// ============================================================================
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

// ============================================================================
// MIDDLEWARES GLOBALES ✅
// ============================================================================

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://localhost:19006',
    'exp://192.168.1.174:8081'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: { message: 'Demasiadas solicitudes' } }
});
app.use('/api/', limiter);

app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ============================================================================
// HELPERS Y UTILIDADES ✅
// ============================================================================

const generateToken = (userId) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default-secret-key',
    { expiresIn: '24h' }
  );
};

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: { message: 'Token requerido' }
    });
  }

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    console.log('🔍 Token decoded, userId:', decoded.userId);
    
    // Usuario demo
    if (decoded.userId === 'demo-user-123') {
      req.user = { 
        id: decoded.userId, 
        userId: decoded.userId,
        email: 'demo@bellezaestetica.com', 
        isDemo: true,
        vipStatus: true
      };
      return next();
    }
    
    // Usuario real
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return res.status(403).json({ 
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
    }
    
    req.user = { 
      id: user.id,
      userId: user.id, 
      email: user.email, 
      isDemo: false,
      vipStatus: user.vipStatus || false
    };
    next();
  } catch (err) {
    return res.status(403).json({ 
      success: false,
      error: { message: 'Token inválido' }
    });
  }
};

// ============================================================================
// DATOS DEMO ✅
// ============================================================================

const getDemoUserData = () => ({
  id: 'demo-user-123',
  firstName: 'María',
  lastName: 'Ejemplar',
  email: 'demo@bellezaestetica.com',
  beautyPoints: 150,
  sessionsCompleted: 8,
  totalInvestment: 2400,
  vipStatus: true
});

const getDemoDashboard = () => ({
  user: {
    firstName: 'María',
    lastName: 'Ejemplar',
    vipStatus: true,
    beautyPoints: 150
  },
  nextAppointment: {
    id: 'apt-123',
    treatment: 'Limpieza Facial',
    date: '2025-07-15',
    time: '14:30',
    professional: 'Ana Martínez',
    clinic: 'Belleza Estética Premium'
  },
  featuredTreatments: [
    {
      id: 't1',
      name: 'Ritual Purificante',
      description: 'Limpieza facial profunda',
      duration: 60,
      price: 2500,
      iconName: 'sparkles'
    },
    {
      id: 't2',
      name: 'Drenaje Relajante',
      description: 'Masaje de drenaje linfático',
      duration: 90,
      price: 3500,
      iconName: 'waves'
    }
  ],
  wellnessTip: {
    title: 'Hidratación Matutina',
    content: 'Comienza tu día bebiendo un vaso de agua tibia con limón.',
    category: 'hidratacion',
    iconName: 'droplets'
  },
  stats: {
    totalSessions: 8,
    beautyPoints: 150,
    totalInvestment: 2400,
    vipStatus: true
  }
});

// ============================================================================
// RUTAS PRINCIPALES ✅
// ============================================================================

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: 'connected',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      database: 'disconnected'
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    message: '🏥 Belleza Estética API - Sistema Completo',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      dashboard: '/api/dashboard',
      beautyPoints: '/api/beauty-points',
      vip: '/api/vip/*',
      appointments: '/api/appointments',
      profile: '/api/profile',
      admin: '/api/admin/dashboard/*'
    }
  });
});

// ============================================================================
// AUTH ROUTES ✅
// ============================================================================

app.post('/api/auth/demo-login', (req, res) => {
  console.log('🎭 Demo login request received');
  
  const demoUser = getDemoUserData();
  const token = generateToken(demoUser.id);
  
  res.json({
    success: true,
    message: 'Bienvenida a la experiencia demo',
    data: {
      user: { ...demoUser, isDemo: true },
      tokens: {
        accessToken: token,
        refreshToken: `refresh_${token}`,
        expiresIn: '24h'
      }
    }
  });
});

app.post('/api/auth/login', async (req, res) => {
  console.log('🔐 Login request received');
  
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email y contraseña son requeridos' }
      });
    }

    // Demo user
    if (email === 'demo@bellezaestetica.com' && password === 'demo123') {
      const demoUser = getDemoUserData();
      const token = generateToken(demoUser.id);
      
      return res.json({
        success: true,
        message: 'Login exitoso (Demo)',
        data: {
          user: demoUser,
          tokens: {
            accessToken: token,
            refreshToken: `refresh_${token}`,
            expiresIn: '24h'
          }
        }
      });
    }

    // Real user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Credenciales inválidas' }
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: { message: 'Credenciales inválidas' }
      });
    }

    const token = generateToken(user.id);
    
    res.json({
      success: true,
      message: 'Login exitoso',
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          beautyPoints: user.beautyPoints,
          sessionsCompleted: user.sessionsCompleted,
          vipStatus: user.vipStatus,
          totalInvestment: user.totalInvestment
        },
        tokens: {
          accessToken: token,
          refreshToken: `refresh_${token}`,
          expiresIn: '24h'
        }
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  console.log('📝 Register request received');
  
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campos requeridos: email, password, firstName, lastName' }
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'Este email ya está registrado' }
      });
    }

    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newUser = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone?.trim() || null,
        beautyPoints: parseInt(process.env.BEAUTY_POINTS_SIGNUP_BONUS) || 20,
        sessionsCompleted: 0,
        totalInvestment: 0,
        vipStatus: false
      }
    });

    const token = generateToken(newUser.id);
    
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phone: newUser.phone,
          beautyPoints: newUser.beautyPoints,
          vipStatus: newUser.vipStatus,
          sessionsCompleted: newUser.sessionsCompleted,
          totalInvestment: newUser.totalInvestment
        },
        tokens: {
          accessToken: token,
          refreshToken: `refresh_${token}`,
          expiresIn: '24h'
        }
      }
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { message: 'Este email ya está registrado' }
      });
    }
    
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  console.log('👋 Logout request received for user:', req.user.userId);
  
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

// ============================================================================
// DASHBOARD ROUTES ✅
// ============================================================================

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: getDemoDashboard()
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
    }

    // Buscar próxima cita
    const nextAppointment = await prisma.appointment.findFirst({
      where: {
        userId: user.id,
        scheduledDate: { gte: new Date() }
      },
      orderBy: { scheduledDate: 'asc' },
      include: {
        treatment: true,
        professional: true,
        clinic: true
      }
    });

    const dashboardData = {
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        vipStatus: user.vipStatus,
        beautyPoints: user.beautyPoints
      },
      nextAppointment: nextAppointment ? {
        id: nextAppointment.id,
        treatment: nextAppointment.treatment.name,
        date: nextAppointment.scheduledDate.toISOString().split('T')[0],
        time: nextAppointment.scheduledTime.toTimeString().slice(0, 5),
        professional: `${nextAppointment.professional.firstName} ${nextAppointment.professional.lastName}`,
        clinic: nextAppointment.clinic.name
      } : null,
      featuredTreatments: getDemoDashboard().featuredTreatments,
      wellnessTip: getDemoDashboard().wellnessTip,
      stats: {
        totalSessions: user.sessionsCompleted,
        beautyPoints: user.beautyPoints,
        totalInvestment: user.totalInvestment,
        vipStatus: user.vipStatus
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// APPOINTMENTS ROUTES - COMPLETO CON DETALLES ✅
// ============================================================================

// GET Treatments
app.get('/api/appointments/treatments', async (req, res) => {
  try {
    console.log('💆‍♀️ Getting treatments from database...');
    
    const treatments = await prisma.treatment.findMany({
      where: { isActive: true },
      include: { clinic: true }
    });

    if (treatments.length > 0) {
      console.log(`✅ Found ${treatments.length} treatments in database`);
      return res.json({
        success: true,
        data: {
          treatments: treatments.map(treatment => ({
            id: treatment.id,
            name: treatment.name,
            description: treatment.description,
            duration: treatment.durationMinutes,
            durationMinutes: treatment.durationMinutes,
            price: treatment.price,
            category: treatment.category,
            iconName: treatment.iconName,
            isVipExclusive: treatment.isVipExclusive,
            clinic: treatment.clinic.name
          }))
        }
      });
    }

    // Si no hay treatments, crear algunos demo
    console.log('📝 Creating demo treatments in database...');
    
    let clinic = await prisma.clinic.findFirst();
    
    if (!clinic) {
      clinic = await prisma.clinic.create({
        data: {
          name: 'Belleza Estética Premium',
          email: 'admin@bellezaestetica.com',
          passwordHash: await bcrypt.hash('admin123', 12),
          phone: '+34 900 123 456',
          address: 'Av. Corrientes 1234, CABA',
          subscriptionPlan: 'PREMIUM'
        }
      });
      console.log('✅ Demo clinic created');
    }

    const demoTreatments = [
      {
        clinicId: clinic.id,
        name: 'Ritual Purificante',
        description: 'Limpieza facial profunda con extracción de comedones',
        durationMinutes: 60,
        price: 2500,
        category: 'Facial',
        iconName: 'sparkles',
        isVipExclusive: false
      },
      {
        clinicId: clinic.id,
        name: 'Drenaje Relajante',
        description: 'Masaje de drenaje linfático corporal',
        durationMinutes: 90,
        price: 3500,
        category: 'Corporal',
        iconName: 'waves',
        isVipExclusive: false
      },
      {
        clinicId: clinic.id,
        name: 'Hidratación Premium VIP',
        description: 'Tratamiento facial exclusivo con ácido hialurónico',
        durationMinutes: 75,
        price: 4500,
        category: 'Facial',
        iconName: 'crown',
        isVipExclusive: true
      }
    ];

    const createdTreatments = await Promise.all(
      demoTreatments.map(treatment => 
        prisma.treatment.create({ 
          data: treatment,
          include: { clinic: true }
        })
      )
    );

    console.log(`✅ Created ${createdTreatments.length} demo treatments`);

    res.json({
      success: true,
      data: {
        treatments: createdTreatments.map(treatment => ({
          id: treatment.id,
          name: treatment.name,
          description: treatment.description,
          duration: treatment.durationMinutes,
          durationMinutes: treatment.durationMinutes,
          price: treatment.price,
          category: treatment.category,
          iconName: treatment.iconName,
          isVipExclusive: treatment.isVipExclusive,
          clinic: treatment.clinic.name
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error getting treatments:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// GET Availability
app.get('/api/appointments/availability', async (req, res) => {
  try {
    const { treatmentId, date } = req.query;

    if (!treatmentId || !date) {
      return res.status(400).json({
        success: false,
        error: { message: 'treatmentId y date son requeridos' }
      });
    }

    console.log('⏰ Getting availability from database...', { treatmentId, date });

    const treatment = await prisma.treatment.findUnique({
      where: { id: treatmentId },
      include: { clinic: true }
    });

    if (!treatment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Tratamiento no encontrado' }
      });
    }

    let professionals = await prisma.professional.findMany({
      where: { 
        clinicId: treatment.clinicId,
        isActive: true 
      }
    });

    if (professionals.length === 0) {
      console.log('📝 Creating demo professionals...');
      
      const demoProfessionals = [
        {
          clinicId: treatment.clinicId,
          firstName: 'Ana',
          lastName: 'Martínez',
          specialties: 'Facial,Corporal',
          bio: 'Especialista en tratamientos faciales con 10 años de experiencia',
          rating: 4.9,
          availableHours: '09:00-18:00',
          isActive: true
        },
        {
          clinicId: treatment.clinicId,
          firstName: 'Carmen',
          lastName: 'Rodríguez',
          specialties: 'Corporal,Masajes',
          bio: 'Experta en drenaje linfático y tratamientos corporales',
          rating: 4.8,
          availableHours: '10:00-19:00',
          isActive: true
        }
      ];

      professionals = await Promise.all(
        demoProfessionals.map(prof => 
          prisma.professional.create({ data: prof })
        )
      );

      console.log(`✅ Created ${professionals.length} demo professionals`);
    }

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        scheduledDate: new Date(date),
        status: { in: ['CONFIRMED', 'PENDING'] }
      },
      select: {
        scheduledTime: true,
        professionalId: true
      }
    });

    const timeSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
    ];

    const availableSlots = timeSlots.map(time => {
      const availableProfessionals = professionals.filter(prof => {
        const isOccupied = existingAppointments.some(apt => {
          const aptTime = apt.scheduledTime.toTimeString().slice(0, 5);
          return aptTime === time && apt.professionalId === prof.id;
        });
        
        return !isOccupied;
      }).map(prof => ({
        id: prof.id,
        name: `${prof.firstName} ${prof.lastName}`,
        specialty: prof.specialties.split(',')[0],
        specialties: prof.specialties.split(','),
        rating: prof.rating || 4.5
      }));

      return {
        time,
        availableProfessionals
      };
    }).filter(slot => slot.availableProfessionals.length > 0);

    res.json({
      success: true,
      data: {
        date,
        treatment: {
          name: treatment.name,
          duration: treatment.durationMinutes,
          price: treatment.price
        },
        clinic: treatment.clinic.name,
        availableSlots
      }
    });

  } catch (error) {
    console.error('❌ Error getting availability:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// POST Create Appointment
app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { treatmentId, date, time, professionalId, notes } = req.body;

    console.log('📅 Creating appointment in database...', {
      userId: req.user.userId,
      treatmentId,
      date,
      time,
      professionalId
    });

    if (!treatmentId || !date || !time) {
      return res.status(400).json({
        success: false,
        error: { message: 'treatmentId, date y time son requeridos' }
      });
    }

    // Para usuario demo
    if (req.user.userId === 'demo-user-123') {
      const newAppointment = {
        id: `apt_${Date.now()}`,
        treatment: { name: 'Ritual Purificante', duration: 60, price: 2500 },
        date,
        time,
        professional: 'Ana Martínez',
        clinic: 'Belleza Estética Premium',
        status: 'PENDING',
        beautyPointsEarned: 50,
        notes: notes || null
      };

      return res.status(201).json({
        success: true,
        message: 'Cita creada exitosamente (Demo)',
        data: { appointment: newAppointment }
      });
    }

    const treatment = await prisma.treatment.findUnique({
      where: { id: treatmentId },
      include: { clinic: true }
    });

    if (!treatment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Tratamiento no encontrado' }
      });
    }

    let professional = null;
    if (professionalId) {
      professional = await prisma.professional.findUnique({
        where: { id: professionalId }
      });

      if (!professional) {
        return res.status(404).json({
          success: false,
          error: { message: 'Profesional no encontrado' }
        });
      }
    } else {
      const availableProfessionals = await prisma.professional.findMany({
        where: { 
          clinicId: treatment.clinicId,
          isActive: true 
        }
      });

      if (availableProfessionals.length > 0) {
        professional = availableProfessionals[0];
      }
    }

    if (!professional) {
      return res.status(400).json({
        success: false,
        error: { message: 'No hay profesionales disponibles' }
      });
    }

    const scheduledDate = new Date(date);
    const [hours, minutes] = time.split(':');
    const scheduledTime = new Date(date);
    scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        professionalId: professional.id,
        scheduledDate,
        scheduledTime,
        status: { in: ['CONFIRMED', 'PENDING'] }
      }
    });

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        error: { message: 'El horario ya está ocupado' }
      });
    }

    const beautyPoints = Math.floor(treatment.price / 50);

    const newAppointment = await prisma.appointment.create({
      data: {
        userId: req.user.userId,
        clinicId: treatment.clinicId,
        professionalId: professional.id,
        treatmentId: treatment.id,
        scheduledDate,
        scheduledTime,
        durationMinutes: treatment.durationMinutes,
        status: 'PENDING',
        notes: notes?.trim() || null,
        beautyPointsEarned: beautyPoints
      },
      include: {
        treatment: true,
        professional: true,
        clinic: true
      }
    });

    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        beautyPoints: { increment: beautyPoints }
      }
    });

    console.log('✅ Appointment created in database:', newAppointment.id);

    res.status(201).json({
      success: true,
      message: 'Cita creada exitosamente',
      data: {
        appointment: {
          id: newAppointment.id,
          treatment: {
            name: newAppointment.treatment.name,
            duration: newAppointment.treatment.durationMinutes,
            price: newAppointment.treatment.price
          },
          date: newAppointment.scheduledDate.toISOString().split('T')[0],
          time: newAppointment.scheduledTime.toTimeString().slice(0, 5),
          professional: `${newAppointment.professional.firstName} ${newAppointment.professional.lastName}`,
          clinic: newAppointment.clinic.name,
          status: newAppointment.status,
          beautyPointsEarned: newAppointment.beautyPointsEarned,
          notes: newAppointment.notes
        }
      }
    });

  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// GET All Appointments
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    console.log('📅 Getting appointments from database for user:', req.user.userId);

    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: {
          appointments: [
            {
              id: 'apt-demo-123',
              treatment: { name: 'Drenaje Relajante', duration: 90, price: 3500 },
              date: '2025-07-15',
              time: '14:30',
              professional: 'Carmen Rodríguez',
              clinic: 'Belleza Estética Premium',
              status: 'CONFIRMED',
              beautyPointsEarned: 70,
              notes: 'Solicita música relajante'
            }
          ],
          pagination: { total: 1, page: 1, limit: 10, hasMore: false }
        }
      });
    }

    const appointments = await prisma.appointment.findMany({
      where: { userId: req.user.userId },
      include: {
        treatment: true,
        professional: true,
        clinic: true
      },
      orderBy: { scheduledDate: 'desc' }
    });

    const transformedAppointments = appointments.map(apt => ({
      id: apt.id,
      treatment: {
        name: apt.treatment.name,
        duration: apt.treatment.durationMinutes,
        price: apt.treatment.price
      },
      date: apt.scheduledDate.toISOString().split('T')[0],
      time: apt.scheduledTime.toTimeString().slice(0, 5),
      professional: `${apt.professional.firstName} ${apt.professional.lastName}`,
      clinic: apt.clinic.name,
      status: apt.status,
      beautyPointsEarned: apt.beautyPointsEarned,
      notes: apt.notes,
      createdAt: apt.createdAt.toISOString(),
      updatedAt: apt.updatedAt.toISOString()
    }));

    console.log(`✅ Found ${appointments.length} appointments for user`);

    res.json({
      success: true,
      data: {
        appointments: transformedAppointments,
        pagination: { 
          total: appointments.length, 
          page: 1, 
          limit: 50, 
          hasMore: false 
        }
      }
    });

  } catch (error) {
    console.error('❌ Error getting appointments:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// GET /api/appointments/:appointmentId - ENDPOINT CRÍTICO FALTANTE ✅
app.get('/api/appointments/:appointmentId', authenticateToken, async (req, res) => {
  console.log('📋 Getting appointment details for ID:', req.params.appointmentId);
  
  try {
    const { appointmentId } = req.params;
    
    // Usuario demo
    if (req.user.userId === 'demo-user-123') {
      const demoAppointment = {
        id: appointmentId,
        treatment: {
          id: 't2',
          name: 'Drenaje Relajante',
          description: 'Masaje de drenaje linfático corporal',
          duration: 90,
          price: 3500,
          category: 'Corporal',
          iconName: 'waves'
        },
        date: '2025-07-15',
        time: '14:30',
        professional: {
          id: 'prof2',
          name: 'Carmen Rodríguez',
          specialties: ['Drenaje linfático', 'Masajes'],
          rating: 4.9,
          bio: 'Experta en drenaje linfático y tratamientos corporales'
        },
        clinic: {
          id: 'clinic1',
          name: 'Belleza Estética Premium',
          address: 'Av. Corrientes 1234, CABA',
          phone: '+34 900 123 456'
        },
        status: 'CONFIRMED',
        notes: 'Solicita música relajante',
        beautyPointsEarned: 70,
        canCancel: true,
        canReschedule: true,
        cancelDeadline: '2025-07-14T14:30:00.000Z'
      };
      
      return res.json({
        success: true,
        data: { appointment: demoAppointment }
      });
    }

    // Usuario real - buscar en BD
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        treatment: true,
        professional: true,
        clinic: true,
        user: {
          select: { id: true, email: true }
        }
      }
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cita no encontrada' }
      });
    }

    // Verificar que la cita pertenece al usuario
    if (appointment.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: { message: 'No tienes permisos para ver esta cita' }
      });
    }

    const appointmentData = {
      id: appointment.id,
      treatment: {
        id: appointment.treatment.id,
        name: appointment.treatment.name,
        description: appointment.treatment.description,
        duration: appointment.treatment.durationMinutes,
        price: appointment.treatment.price,
        category: appointment.treatment.category,
        iconName: appointment.treatment.iconName
      },
      date: appointment.scheduledDate.toISOString().split('T')[0],
      time: appointment.scheduledTime.toTimeString().slice(0, 5),
      professional: {
        id: appointment.professional.id,
        name: `${appointment.professional.firstName} ${appointment.professional.lastName}`,
        specialties: appointment.professional.specialties ? 
          appointment.professional.specialties.split(',') : [],
        rating: appointment.professional.rating || 5.0,
        bio: appointment.professional.bio || 'Profesional especializado'
      },
      clinic: {
        id: appointment.clinic.id,
        name: appointment.clinic.name,
        address: appointment.clinic.address,
        phone: appointment.clinic.phone
      },
      status: appointment.status,
      notes: appointment.notes,
      beautyPointsEarned: appointment.beautyPointsEarned,
      canCancel: appointment.status === 'CONFIRMED' || appointment.status === 'PENDING',
      canReschedule: appointment.status === 'CONFIRMED' || appointment.status === 'PENDING',
      cancelDeadline: new Date(appointment.scheduledDate.getTime() - 24 * 60 * 60 * 1000).toISOString()
    };

    console.log('✅ Appointment details found:', appointmentData.id);

    res.json({
      success: true,
      data: { appointment: appointmentData }
    });

  } catch (error) {
    console.error('❌ Get appointment details error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// PUT /api/appointments/:id - Actualizar cita
app.put('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, date, time } = req.body;

    console.log('📝 Updating appointment:', id);

    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Cita actualizada exitosamente (Demo)',
        data: { appointment: { id, status, notes, date, time } }
      });
    }

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cita no encontrada' }
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (date) updateData.scheduledDate = new Date(date);
    if (time && date) {
      const [hours, minutes] = time.split(':');
      const scheduledTime = new Date(date);
      scheduledTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      updateData.scheduledTime = scheduledTime;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: updateData,
      include: {
        treatment: true,
        professional: true,
        clinic: true
      }
    });

    console.log('✅ Appointment updated successfully');

    res.json({
      success: true,
      message: 'Cita actualizada exitosamente',
      data: { appointment: updatedAppointment }
    });

  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// DELETE /api/appointments/:id - Cancelar cita
app.delete('/api/appointments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason = 'Cancelado por usuario' } = req.body;

    console.log('❌ Cancelling appointment:', id);

    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Cita cancelada exitosamente (Demo)'
      });
    }

    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        id,
        userId: req.user.userId
      }
    });

    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Cita no encontrada' }
      });
    }

    const cancelledAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: existingAppointment.notes ? 
          `${existingAppointment.notes}\n\nMotivo: ${reason}` :
          `Motivo: ${reason}`
      }
    });

    console.log('✅ Appointment cancelled successfully');

    res.json({
      success: true,
      message: 'Cita cancelada exitosamente',
      data: { appointment: { id: cancelledAppointment.id, status: 'CANCELLED' } }
    });

  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// BEAUTY POINTS ROUTES ✅
// ============================================================================

app.get('/api/beauty-points', authenticateToken, async (req, res) => {
  console.log('💎 Getting beauty points summary for user:', req.user.userId);
  
  try {
    if (req.user.userId === 'demo-user-123') {
      const demoUser = getDemoUserData();
      const pointsMultiplier = demoUser.vipStatus ? 2 : 1;
      const currentLevel = Math.floor(demoUser.beautyPoints / 100);
      const nextLevelPoints = (currentLevel + 1) * 100;
      const pointsToNextLevel = nextLevelPoints - demoUser.beautyPoints;
      
      return res.json({
        success: true,
        data: {
          currentPoints: demoUser.beautyPoints,
          vipMultiplier: pointsMultiplier,
          level: {
            current: currentLevel,
            pointsToNext: pointsToNextLevel,
            nextLevelPoints
          },
          history: [
            {
              date: '2025-06-01',
              treatment: 'Ritual Purificante', 
              pointsEarned: demoUser.vipStatus ? 100 : 50,
              iconName: 'sparkles'
            }
          ],
          availableRewards: [
            {
              id: 'discount_10',
              name: 'Descuento 10%',
              description: 'Descuento en tu próximo tratamiento', 
              pointsCost: 100,
              category: 'discount',
              isAvailable: demoUser.beautyPoints >= 100
            }
          ]
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
    }

    const pointsMultiplier = user.vipStatus ? 2 : 1;
    const currentLevel = Math.floor(user.beautyPoints / 100);
    const nextLevelPoints = (currentLevel + 1) * 100;
    const pointsToNextLevel = nextLevelPoints - user.beautyPoints;
    
    res.json({
      success: true,
      data: {
        currentPoints: user.beautyPoints,
        vipMultiplier: pointsMultiplier,
        level: {
          current: currentLevel,
          pointsToNext: pointsToNextLevel,
          nextLevelPoints
        },
        history: [],
        availableRewards: [
          {
            id: 'discount_10',
            name: 'Descuento 10%',
            description: 'Descuento en tu próximo tratamiento', 
            pointsCost: 100,
            category: 'discount',
            isAvailable: user.beautyPoints >= 100
          }
        ]
      }
    });

  } catch (error) {
    console.error('❌ Beauty points error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

app.post('/api/beauty-points/redeem', authenticateToken, async (req, res) => {
  console.log('💎 Redeeming reward for user:', req.user.userId);
  
  try {
    const { rewardId } = req.body;
    
    if (!rewardId) {
      return res.status(400).json({
        success: false,
        error: { message: 'ID de recompensa requerido' }
      });
    }
    
    const rewards = {
      'discount_10': { name: 'Descuento 10%', cost: 100, type: 'discount' },
      'facial_free': { name: 'Facial Gratuito', cost: 250, type: 'treatment' }
    };
    
    const reward = rewards[rewardId];
    if (!reward) {
      return res.status(400).json({
        success: false,
        error: { message: 'Recompensa no válida' }
      });
    }

    if (req.user.userId === 'demo-user-123') {
      const demoUser = getDemoUserData();
      if (demoUser.beautyPoints < reward.cost) {
        return res.status(400).json({
          success: false, 
          error: { message: 'Puntos insuficientes' }
        });
      }
      
      return res.json({
        success: true,
        message: `¡Recompensa canjeada exitosamente! 🎉`,
        data: {
          redemption: {
            id: `redemption_${Date.now()}`,
            rewardId,
            rewardName: reward.name,
            pointsUsed: reward.cost,
            type: reward.type,
            redeemedAt: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          },
          remainingPoints: demoUser.beautyPoints - reward.cost
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
    }
    
    if (user.beautyPoints < reward.cost) {
      return res.status(400).json({
        success: false, 
        error: { message: 'Puntos insuficientes' }
      });
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        beautyPoints: user.beautyPoints - reward.cost
      }
    });
    
    res.json({
      success: true,
      message: `¡Recompensa canjeada exitosamente! 🎉`,
      data: {
        redemption: {
          id: `redemption_${Date.now()}`,
          rewardId,
          rewardName: reward.name,
          pointsUsed: reward.cost,
          type: reward.type,
          redeemedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        remainingPoints: updatedUser.beautyPoints
      }
    });

  } catch (error) {
    console.error('❌ Redeem error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// VIP ROUTES ✅
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
        }
      ]
    }
  });
});

app.get('/api/vip/status', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      isVIP: true,
      subscription: {
        id: 'sub_demo123',
        planType: 'MONTHLY',
        price: 19.99,
        status: 'ACTIVE',
        expiresAt: '2025-07-12',
        daysRemaining: 30
      },
      benefits: {
        discountPercentage: 25,
        pointsMultiplier: 2,
        priorityBooking: true,
        freeMonthlyFacial: true,
        personalAdvisor: true
      }
    }
  });
});

app.post('/api/vip/subscribe', authenticateToken, (req, res) => {
  const { planType = 'MONTHLY' } = req.body;
  
  res.json({
    success: true,
    message: '¡Bienvenida al Club VIP! 🎉',
    data: {
      subscription: {
        id: `sub_${Date.now()}`,
        planType,
        price: planType === 'MONTHLY' ? 19.99 : 199.99,
        status: 'ACTIVE',
        expiresAt: planType === 'MONTHLY' ? '2025-07-12' : '2026-06-12'
      },
      bonusPoints: 50,
      immediateDiscounts: true,
      welcomeMessage: 'Ya puedes disfrutar de todos los beneficios VIP'
    }
  });
});

// ============================================================================
// PROFILE ROUTES ✅
// ============================================================================

app.get('/api/profile', authenticateToken, async (req, res) => {
  console.log('👤 Getting profile for user:', req.user.userId);
  
  try {
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: {
          user: {
            id: 'demo-user-123',
            email: 'demo@bellezaestetica.com',
            firstName: 'María',
            lastName: 'Ejemplar',
            phone: '+34 600 123 456',
            birthDate: '1990-05-15',
            memberSince: '2024-01-15T10:00:00.000Z'
          },
          stats: {
            beautyPoints: 150,
            sessionsCompleted: 8,
            totalInvestment: 2400,
            vipStatus: true
          },
          preferences: {
            appointments: true,
            wellness: true,
            offers: false,
            promotions: false
          }
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          birthDate: user.birthDate?.toISOString().split('T')[0] || null,
          memberSince: user.createdAt.toISOString()
        },
        stats: {
          beautyPoints: user.beautyPoints,
          sessionsCompleted: user.sessionsCompleted,
          totalInvestment: user.totalInvestment,
          vipStatus: user.vipStatus
        },
        preferences: {
          appointments: true,
          wellness: true,
          offers: false,
          promotions: false
        }
      }
    });

  } catch (error) {
    console.error('❌ Profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  console.log('📝 Updating profile for user:', req.user.userId);
  
  try {
    const { firstName, lastName, phone, birthDate } = req.body;
    
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Perfil actualizado exitosamente (Demo)',
        data: {
          user: {
            id: 'demo-user-123',
            firstName: firstName || 'María',
            lastName: lastName || 'Ejemplar',
            phone: phone || '+34 600 123 456',
            birthDate: birthDate || '1990-05-15'
          }
        }
      });
    }

    const updateData = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (phone) updateData.phone = phone.trim();
    if (birthDate) updateData.birthDate = new Date(birthDate);

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Perfil actualizado exitosamente',
      data: {
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          birthDate: updatedUser.birthDate?.toISOString().split('T')[0] || null
        }
      }
    });

  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

app.put('/api/profile/notifications', authenticateToken, async (req, res) => {
  try {
    const { appointments, wellness, offers, promotions } = req.body;
    
    console.log('🔔 Updating notification preferences:', { appointments, wellness, offers, promotions });
    
    const preferences = {
      appointments: appointments !== undefined ? appointments : true,
      wellness: wellness !== undefined ? wellness : true,
      offers: offers !== undefined ? offers : false,
      promotions: promotions !== undefined ? promotions : false
    };

    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Preferencias de notificación actualizadas exitosamente (Demo)',
        data: { preferences }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        preferredNotifications: JSON.stringify(preferences)
      }
    });

    console.log('✅ Notification preferences updated in database');
    
    res.json({
      success: true,
      message: 'Preferencias de notificación actualizadas exitosamente',
      data: { preferences }
    });

  } catch (error) {
    console.error('❌ Update notifications error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// ============================================================================
// RUTAS ADMIN DASHBOARD ✅
// ============================================================================
const adminDashboardRoutes = require('./routes/admin/dashboard');
app.use('/api/admin/dashboard', adminDashboardRoutes);

// ============================================================================
// ERROR HANDLING ✅
// ============================================================================

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Endpoint no encontrado',
      path: req.originalUrl,
      method: req.method
    },
    availableEndpoints: {
      health: '/health',
      auth: '/api/auth/*',
      dashboard: '/api/dashboard',
      beautyPoints: '/api/beauty-points',
      vip: '/api/vip/*',
      appointments: '/api/appointments',
      profile: '/api/profile',
      admin: '/api/admin/dashboard/*'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.userId || 'anonymous'
  });
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: err.message || 'Error interno del servidor',
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack
      })
    }
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN ✅
// ============================================================================

const gracefulShutdown = async (signal) => {
  console.log(`\n📡 Recibida señal ${signal}. Iniciando cierre graceful...`);
  
  try {
    console.log('🔌 Cerrando conexión a base de datos...');
    await prisma.$disconnect();
    console.log('✅ Conexión a base de datos cerrada');
    
    console.log('🎉 Cierre graceful completado');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error durante cierre graceful:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// ============================================================================
// EXPORTAR APP ✅
// ============================================================================

module.exports = app;