// ============================================================================
// src/app.js - APLICACIÓN PRINCIPAL CON PRISMA INTEGRADO ✅
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
// MIDDLEWARES GLOBALES
// ============================================================================

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes, intenta más tarde.' }
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ============================================================================
// HELPERS Y UTILIDADES
// ============================================================================

const generateToken = (userId) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'default-secret-key',
    { expiresIn: '1h' }
  );
};

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    console.log('🔍 Token decoded, userId:', decoded.userId);
    
    // Si es el usuario demo, no buscar en BD
    if (decoded.userId === 'demo-user-123') {
      req.user = { userId: decoded.userId, email: 'demo@bellezaestetica.com', isDemo: true };
      return next();
    }
    
    // Para usuarios reales, buscar en BD
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado en BD:', decoded.userId);
      return res.status(403).json({ error: 'Usuario no encontrado' });
    }
    
    console.log('✅ Usuario encontrado:', user.email);
    req.user = { userId: user.id, email: user.email, isDemo: false };
    next();
  } catch (err) {
    console.error('❌ Token error:', err.message);
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// ============================================================================
// FUNCIONES DE DATOS DEMO
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
    date: '2025-06-15',
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
// RUTAS PRINCIPALES
// ============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected'
  });
});

app.get('/', (req, res) => {
  res.json({
    message: '🏥 Belleza Estética API',
    version: '1.0.0',
    status: 'active',
    database: 'Prisma + SQLite',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      dashboard: '/api/dashboard',
      beautyPoints: '/api/beauty-points',
      vip: '/api/vip/*',
      appointments: '/api/appointments',
      profile: '/api/profile'
    }
  });
});

// ============================================================================
// AUTH ROUTES - CON PRISMA INTEGRADO
// ============================================================================

// Demo Login (mantiene datos demo)
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
        expiresIn: '1h'
      }
    }
  });
});

// Login con Prisma
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

    // Verificar usuario demo primero
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
            expiresIn: '1h'
          }
        }
      });
    }

    // Buscar usuario real en BD
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Credenciales inválidas' }
      });
    }

    // Verificar contraseña
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
          expiresIn: '1h'
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

// Register con Prisma
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

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { message: 'Este email ya está registrado' }
      });
    }

    // Hash de la contraseña
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Crear usuario en BD
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

    console.log('✅ Usuario creado en BD:', newUser.id);

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
          expiresIn: '1h'
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

// Forgot Password con Prisma
app.post('/api/auth/forgot-password', async (req, res) => {
  console.log('🔑 Forgot password request received');
  
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email es requerido' }
      });
    }

    // Verificar si el usuario existe
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    // Siempre responder igual por seguridad (no revelar si el email existe)
    const resetToken = `reset_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    if (user) {
      // Crear token de recuperación en BD
      await prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          expiresAt,
          used: false
        }
      });
      
      console.log(`✅ Token de recuperación creado para: ${email}`);
    }

    res.status(200).json({
      success: true,
      message: 'Si existe una cuenta con ese email, recibirás las instrucciones de recuperación',
      data: {
        ...(process.env.NODE_ENV === 'development' && user && {
          resetToken,
          expiresAt,
          userFound: true
        })
      }
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// Verify Reset Token con Prisma
app.get('/api/auth/verify-reset-token/:token', async (req, res) => {
  console.log('🔍 Verify reset token request received');
  
  try {
    const { token } = req.params;
    
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });
    
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Token de recuperación inválido o expirado' }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token válido',
      data: {
        email: resetToken.user.email,
        firstName: resetToken.user.firstName
      }
    });

  } catch (error) {
    console.error('❌ Verify token error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// Reset Password con Prisma
app.post('/api/auth/reset-password', async (req, res) => {
  console.log('🔑 Reset password request received');
  
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Token y nueva contraseña son requeridos' }
      });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true }
    });
    
    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Token de recuperación inválido o expirado' }
      });
    }

    // Hash nueva contraseña
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña y marcar token como usado
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true }
      })
    ]);

    console.log(`✅ Contraseña actualizada para: ${resetToken.user.email}`);

    res.status(200).json({
      success: true,
      message: 'Contraseña actualizada exitosamente',
      data: {
        email: resetToken.user.email
      }
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// Refresh Token
app.post('/api/auth/refresh-token', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    return res.status(400).json({
      success: false,
      error: { message: 'Refresh token requerido' }
    });
  }

  // Simular renovación de token (mejorar en producción)
  const newToken = generateToken('demo-user-123');
  
  res.json({
    success: true,
    data: {
      tokens: {
        accessToken: newToken,
        refreshToken: `refresh_${newToken}`,
        expiresIn: '1h'
      }
    }
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  console.log('👋 Logout request received');
  
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

// ============================================================================
// DASHBOARD ROUTES - CON DATOS HÍBRIDOS (DEMO + PRISMA)
// ============================================================================

app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    // Si es usuario demo, usar datos demo
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: getDemoDashboard()
      });
    }

    // Para usuarios reales, buscar en BD
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
      featuredTreatments: getDemoDashboard().featuredTreatments, // Usar datos demo por ahora
      wellnessTip: getDemoDashboard().wellnessTip, // Usar datos demo por ahora
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
// BEAUTY POINTS ROUTES - CON PRISMA INTEGRADO
// ============================================================================

app.get('/api/beauty-points', authenticateToken, async (req, res) => {
  console.log('💎 Getting beauty points summary for user:', req.user.userId);
  
  try {
    // Si es usuario demo, usar datos demo
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
            },
            {
              date: '2025-05-15',
              treatment: 'Drenaje Relajante',
              pointsEarned: demoUser.vipStatus ? 140 : 70,
              iconName: 'waves'
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
            },
            {
              id: 'facial_free',
              name: 'Facial Gratuito',
              description: 'Limpieza facial básica sin costo',
              pointsCost: 250,
              category: 'treatment',
              isAvailable: demoUser.beautyPoints >= 250
            }
          ].filter(r => r.isAvailable),
          nextRewards: [
            {
              id: 'premium_treatment',
              name: 'Tratamiento Premium',
              description: 'Acceso a tratamiento exclusivo',
              pointsCost: 500,
              category: 'premium',
              isAvailable: false
            }
          ]
        }
      });
    }

    // Para usuarios reales
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
        history: [], // TODO: Implementar historial real de puntos
        availableRewards: [
          {
            id: 'discount_10',
            name: 'Descuento 10%',
            description: 'Descuento en tu próximo tratamiento', 
            pointsCost: 100,
            category: 'discount',
            isAvailable: user.beautyPoints >= 100
          },
          {
            id: 'facial_free',
            name: 'Facial Gratuito',
            description: 'Limpieza facial básica sin costo',
            pointsCost: 250,
            category: 'treatment',
            isAvailable: user.beautyPoints >= 250
          }
        ].filter(r => r.isAvailable),
        nextRewards: [
          {
            id: 'premium_treatment',
            name: 'Tratamiento Premium',
            description: 'Acceso a tratamiento exclusivo',
            pointsCost: 500,
            category: 'premium',
            isAvailable: false
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

// Canjear recompensa con Prisma
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
      'facial_free': { name: 'Facial Gratuito', cost: 250, type: 'treatment' },
      'massage_30min': { name: 'Masaje 30min', cost: 400, type: 'treatment' },
      'premium_treatment': { name: 'Tratamiento Premium', cost: 500, type: 'premium' }
    };
    
    const reward = rewards[rewardId];
    if (!reward) {
      return res.status(400).json({
        success: false,
        error: { message: 'Recompensa no válida' }
      });
    }

    // Para usuario demo, usar datos en memoria
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

    // Para usuarios reales
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
    
    // Actualizar puntos del usuario
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        beautyPoints: user.beautyPoints - reward.cost
      }
    });
    
    console.log(`✅ Reward redeemed: ${reward.name} for ${reward.cost} points`);
    
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
// RESTO DE RUTAS (MANTENER FUNCIONALIDAD EXISTENTE)
// ============================================================================

// VIP Routes (mantener como estaban)
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

app.get('/api/vip/testimonials', (req, res) => {
  res.json({
    success: true,
    data: {
      testimonials: [
        {
          id: 1,
          name: 'Ana García',
          age: 28,
          avatar: '👩🏻💼',
          comment: 'Los descuentos VIP me permiten cuidarme más seguido. ¡Increíble!',
          rating: 5
        },
        {
          id: 2,
          name: 'María Rodríguez',
          age: 35,
          avatar: '👩🏽🦰',
          comment: 'La asesoría personalizada cambió completamente mi rutina de belleza.',
          rating: 5
        }
      ]
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
// APPOINTMENTS ROUTES
// ============================================================================

app.get('/api/appointments/treatments', (req, res) => {
  res.json({
    success: true,
    data: {
      treatments: [
        {
          id: 't1',
          name: 'Ritual Purificante',
          description: 'Limpieza facial profunda con extracción de comedones',
          duration: 60,
          price: 2500,
          category: 'Facial',
          iconName: 'sparkles',
          isVipExclusive: false,
          clinic: 'Belleza Estética Premium'
        },
        {
          id: 't2',
          name: 'Drenaje Relajante',
          description: 'Masaje de drenaje linfático corporal',
          duration: 90,
          price: 3500,
          category: 'Corporal',
          iconName: 'waves',
          isVipExclusive: false,
          clinic: 'Belleza Estética Premium'
        },
        {
          id: 't3',
          name: 'Hidratación Premium VIP',
          description: 'Tratamiento facial exclusivo con ácido hialurónico',
          duration: 75,
          price: 4500,
          category: 'Facial',
          iconName: 'crown',
          isVipExclusive: true,
          clinic: 'Belleza Estética Premium'
        }
      ]
    }
  });
});

app.get('/api/appointments/availability', authenticateToken, (req, res) => {
  const { treatmentId, date } = req.query;

  if (!treatmentId || !date) {
    return res.status(400).json({
      success: false,
      error: { message: 'treatmentId y date son requeridos' }
    });
  }

  const availableSlots = [
    { time: '09:00', professionalId: 'prof1', professionalName: 'Ana Martínez' },
    { time: '10:00', professionalId: 'prof2', professionalName: 'Carmen Rodríguez' },
    { time: '14:00', professionalId: 'prof1', professionalName: 'Ana Martínez' },
    { time: '15:30', professionalId: 'prof2', professionalName: 'Carmen Rodríguez' }
  ];

  res.json({
    success: true,
    data: {
      date,
      treatment: { name: 'Ritual Purificante', duration: 60, price: 2500 },
      clinic: 'Belleza Estética Premium',
      availableSlots: availableSlots.map(slot => ({
        time: slot.time,
        availableProfessionals: [{
          id: slot.professionalId,
          name: slot.professionalName,
          specialties: ['Facial', 'Corporal'],
          rating: 4.9
        }]
      }))
    }
  });
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { treatmentId, date, time, professionalId, notes } = req.body;

    if (!treatmentId || !date || !time) {
      return res.status(400).json({
        success: false,
        error: { message: 'treatmentId, date y time son requeridos' }
      });
    }

    // Para usuario demo, responder con datos demo
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
        message: 'Cita creada exitosamente',
        data: { appointment: newAppointment }
      });
    }

    // TODO: Para usuarios reales, crear cita en BD
    // Necesitarías crear treatment, professional, clinic primero
    
    res.status(201).json({
      success: true,
      message: 'Cita creada exitosamente',
      data: { 
        appointment: {
          id: `apt_${Date.now()}`,
          treatment: { name: 'Tratamiento', duration: 60, price: 2500 },
          date,
          time,
          professional: 'Profesional',
          clinic: 'Clínica',
          status: 'PENDING',
          beautyPointsEarned: 50,
          notes: notes || null
        }
      }
    });

  } catch (error) {
    console.error('❌ Create appointment error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

app.get('/api/appointments', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      appointments: [
        {
          id: 'apt-123',
          treatment: { name: 'Drenaje Relajante', duration: 90, price: 3500 },
          date: '2025-06-15',
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
});

// ============================================================================
// PROFILE ROUTES - CON PRISMA INTEGRADO
// ============================================================================

app.get('/api/profile', authenticateToken, async (req, res) => {
  console.log('👤 Getting profile for user:', req.user.userId);
  
  try {
    // Usuario demo
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        data: {
          user: {
            id: 'demo-user-123',
            email: 'demo@bellezaestetica.com',
            firstName: 'María',
            lastName: 'Ejemplar',
            phone: '+54 11 1234-5678',
            avatarUrl: null,
            birthDate: '1990-05-15',
            skinType: 'MIXED',
            memberSince: '2024-01-15T10:00:00.000Z'
          },
          stats: {
            beautyPoints: 150,
            sessionsCompleted: 8,
            totalInvestment: 2400,
            vipStatus: true
          },
          skinProfile: {
            type: 'MIXED',
            currentFocus: ['Hidratación', 'Luminosidad'],
            specialist: 'Dra. Ana Martínez'
          },
          nextAppointment: {
            id: 'apt-123',
            treatment: 'Drenaje Relajante',
            date: '2025-06-15T00:00:00.000Z',
            time: '2025-06-15T14:30:00.000Z',
            professional: 'Carmen Rodríguez',
            clinic: 'Belleza Estética Premium'
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

    // Usuario real
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
          avatarUrl: user.avatarUrl,
          birthDate: user.birthDate?.toISOString().split('T')[0] || null,
          skinType: user.skinType,
          memberSince: user.createdAt.toISOString()
        },
        stats: {
          beautyPoints: user.beautyPoints,
          sessionsCompleted: user.sessionsCompleted,
          totalInvestment: user.totalInvestment,
          vipStatus: user.vipStatus
        },
        skinProfile: {
          type: user.skinType || 'UNKNOWN',
          currentFocus: ['Hidratación', 'Cuidado general'],
          specialist: 'Por asignar'
        },
        nextAppointment: null, // TODO: Buscar próxima cita
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
    const { firstName, lastName, phone, birthDate, skinType } = req.body;
    
    // Usuario demo
    if (req.user.userId === 'demo-user-123') {
      return res.json({
        success: true,
        message: 'Perfil actualizado exitosamente (Demo)',
        data: {
          user: {
            id: 'demo-user-123',
            firstName: firstName || 'María',
            lastName: lastName || 'Ejemplar',
            phone: phone || '+54 11 1234-5678',
            birthDate: birthDate || '1990-05-15',
            skinType: skinType || 'MIXED'
          }
        }
      });
    }

    // Usuario real
    const updateData = {};
    if (firstName) updateData.firstName = firstName.trim();
    if (lastName) updateData.lastName = lastName.trim();
    if (phone) updateData.phone = phone.trim();
    if (birthDate) updateData.birthDate = new Date(birthDate);
    if (skinType) updateData.skinType = skinType;

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
          birthDate: updatedUser.birthDate?.toISOString().split('T')[0] || null,
          skinType: updatedUser.skinType
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

app.put('/api/profile/change-password', authenticateToken, async (req, res) => {
  console.log('🔐 Changing password for user:', req.user.userId);
  
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Contraseña actual y nueva contraseña son requeridas' }
      });
    }

    // Usuario demo
    if (req.user.userId === 'demo-user-123') {
      if (currentPassword !== 'demo123') {
        return res.status(400).json({
          success: false,
          error: { message: 'Contraseña actual incorrecta' }
        });
      }
      
      return res.json({
        success: true,
        message: 'Contraseña actualizada exitosamente (Demo)'
      });
    }

    // Usuario real
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'Usuario no encontrado' }
      });
    }

    // Verificar contraseña actual
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: { message: 'Contraseña actual incorrecta' }
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: { message: 'La nueva contraseña debe tener al menos 6 caracteres' }
      });
    }

    // Hash nueva contraseña
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar contraseña
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    console.log('✅ Password changed successfully for user:', user.email);
    
    res.json({
      success: true,
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Error interno del servidor' }
    });
  }
});

// Otras rutas de profile (mantener funcionalidad demo)
app.get('/api/profile/stats', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      overview: {
        beautyPoints: 150,
        sessionsCompleted: 8,
        totalInvestment: 2400,
        vipStatus: true,
        memberSince: '2024-01-15T10:00:00.000Z',
        monthsActive: 6
      },
      monthlyActivity: [
        { month: '2025-01', count: 2, spent: 500 },
        { month: '2025-02', count: 3, spent: 750 },
        { month: '2025-03', count: 1, spent: 350 },
        { month: '2025-04', count: 2, spent: 600 }
      ],
      topTreatments: [
        { name: 'Ritual Purificante', iconName: 'sparkles', count: 4 },
        { name: 'Drenaje Relajante', iconName: 'waves', count: 3 },
        { name: 'Hidratación Premium', iconName: 'droplets', count: 1 }
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
          id: 'vip-member',
          name: 'Miembro VIP',
          description: 'Te uniste al club exclusivo',
          earned: true,
          iconName: 'crown'
        }
      ]
    }
  });
});

app.put('/api/profile/notifications', authenticateToken, (req, res) => {
  const { appointments, wellness, offers, promotions } = req.body;
  
  const preferences = {
    appointments: appointments !== undefined ? appointments : true,
    wellness: wellness !== undefined ? wellness : true,
    offers: offers !== undefined ? offers : false,
    promotions: promotions !== undefined ? promotions : false
  };
  
  res.json({
    success: true,
    message: 'Preferencias actualizadas exitosamente',
    data: { preferences }
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method,
    message: 'La ruta solicitada no existe en la API'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: err.message || 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// ============================================================================
// GRACEFUL SHUTDOWN
// ============================================================================

process.on('SIGINT', async () => {
  console.log('\n🔌 Cerrando conexión a base de datos...');
  await prisma.$disconnect();
  console.log('✅ Conexión cerrada correctamente');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔌 Cerrando conexión a base de datos...');
  await prisma.$disconnect();
  console.log('✅ Conexión cerrada correctamente');
  process.exit(0);
});

module.exports = app;