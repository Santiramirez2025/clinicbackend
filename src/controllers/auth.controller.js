// ============================================================================
// auth.controller.js - SINGLE CLINIC PRODUCTION READY v4.1 - FIXED
// src/controllers/auth.controller.js
// ============================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// Singleton de Prisma optimizado
let prisma;
try {
  if (global.prisma) {
    prisma = global.prisma;
  } else {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
      datasources: {
        db: { url: process.env.DATABASE_URL }
      },
      errorFormat: 'pretty'
    });
    global.prisma = prisma;
  }
} catch (error) {
  console.error('Prisma initialization error:', error);
  process.exit(1);
}

// Configuración JWT con validación
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';

if (!JWT_SECRET) {
  console.error('JWT_SECRET is required in environment variables');
  process.exit(1);
}

// Configuración de la clínica única
const CLINIC_CONFIG = {
  id: 'clinic-1',
  name: process.env.CLINIC_NAME || 'Belleza Estética',
  slug: 'belleza-estetica',
  email: process.env.CLINIC_EMAIL || 'info@bellezaestetica.com',
  phone: process.env.CLINIC_PHONE || '+34 900 123 456',
  city: process.env.CLINIC_CITY || 'Madrid',
  address: process.env.CLINIC_ADDRESS || 'Calle Principal 123',
  timezone: process.env.CLINIC_TIMEZONE || 'Europe/Madrid',
  features: {
    onlineBooking: true,
    vipProgram: true,
    payments: true,
    beautyPoints: true,
    notifications: true,
    reviews: true
  },
  businessHours: {
    monday: { open: '09:00', close: '20:00', enabled: true },
    tuesday: { open: '09:00', close: '20:00', enabled: true },
    wednesday: { open: '09:00', close: '20:00', enabled: true },
    thursday: { open: '09:00', close: '20:00', enabled: true },
    friday: { open: '09:00', close: '20:00', enabled: true },
    saturday: { open: '10:00', close: '18:00', enabled: true },
    sunday: { closed: true }
  }
};

// ============================================================================
// UTILITARIOS
// ============================================================================

const generateTokens = (payload) => {
  try {
    const accessToken = jwt.sign(
      {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: Math.random().toString(36).substring(2)
      }, 
      JWT_SECRET, 
      { 
        expiresIn: process.env.NODE_ENV === 'production' ? '4h' : '24h',
        issuer: 'belleza-estetica',
        audience: 'mobile-app'
      }
    );
    
    const refreshToken = jwt.sign(
      { 
        userId: payload.userId,
        type: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        jti: Math.random().toString(36).substring(2)
      },
      JWT_REFRESH_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'belleza-estetica' 
      }
    );
    
    return { accessToken, refreshToken };
  } catch (error) {
    console.error('Token generation error:', error);
    throw new Error('Failed to generate tokens');
  }
};

const hashPassword = async (password) => {
  try {
    const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
    return await bcrypt.hash(password, saltRounds);
  } catch (error) {
    console.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  if (!password || password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

// ============================================================================
// AUTH CONTROLLER CLASS
// ============================================================================

class AuthController {
  
  // ========================================================================
  // REGISTER - SIMPLIFICADO Y CORREGIDO
  // ========================================================================
  static async register(req, res) {
    try {
      const { firstName, lastName, email, password, phone, birthDate, skinType } = req.body;
      
      console.log('Registration attempt:', email);
      
      // Validaciones básicas
      if (!firstName?.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'firstName is required', code: 'VALIDATION_ERROR' }
        });
      }
      
      if (!lastName?.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'lastName is required', code: 'VALIDATION_ERROR' }
        });
      }
      
      if (!email?.trim()) {
        return res.status(400).json({
          success: false,
          error: { message: 'email is required', code: 'VALIDATION_ERROR' }
        });
      }
      
      if (!validateEmail(email)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid email format', code: 'VALIDATION_ERROR' }
        });
      }
      
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          error: { message: passwordValidation.message, code: 'VALIDATION_ERROR' }
        });
      }
      
      // Verificar usuario existente
      const existingUser = await prisma.user.findFirst({
        where: { email: email.toLowerCase().trim() }
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email already registered', code: 'EMAIL_EXISTS' }
        });
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Crear usuario con datos mínimos requeridos
      const user = await prisma.user.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          passwordHash,
          phone: phone?.trim() || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          skinType: skinType || 'NORMAL',
          beautyPoints: 100,
          loyaltyTier: 'BRONZE',
          vipStatus: false,
          role: 'CLIENT',
          hasAllergies: false,
          hasMedicalConditions: false,
          isActive: true,
          privacyAccepted: true,
          termsAccepted: true,
          dataProcessingConsent: true,
          gdprAcceptedAt: new Date()
        }
      });

      // Generar tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log('Registration successful:', user.email);

      // Respuesta con auto-login
      res.status(201).json({
        success: true,
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          role: user.role,
          userType: 'patient',
          beautyPoints: user.beautyPoints,
          vipStatus: user.vipStatus,
          loyaltyTier: user.loyaltyTier,
          skinType: user.skinType,
          hasAllergies: user.hasAllergies,
          hasMedicalConditions: user.hasMedicalConditions,
          memberSince: user.createdAt
        },
        data: {
          tokens: { 
            accessToken, 
            refreshToken, 
            tokenType: 'Bearer', 
            expiresIn: process.env.NODE_ENV === 'production' ? '4h' : '24h'
          },
          clinic: CLINIC_CONFIG,
          userType: 'patient'
        },
        message: 'Registration successful'
      });

    } catch (error) {
      console.error('Registration error:', error);
      
      // Manejo específico de errores de Prisma
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: { 
            message: 'Email already registered', 
            code: 'EMAIL_EXISTS',
            field: error.meta?.target?.[0] || 'email'
          }
        });
      }
      
      res.status(500).json({
        success: false,
        error: { 
          message: 'Registration failed', 
          code: 'REGISTRATION_ERROR'
        }
      });
    }
  }

  // ========================================================================
  // LOGIN PACIENTES - COMPLETAMENTE CORREGIDO
  // ========================================================================
  static async patientLogin(req, res) {
    try {
      const { email, password } = req.body;
      
      console.log('Login attempt:', email);
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Email and password are required', 
            code: 'MISSING_CREDENTIALS' 
          }
        });
      }

      // Query simplificada sin campos duplicados
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          isActive: true,
          role: {
            in: ['CLIENT', 'VIP_CLIENT']
          }
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { 
            message: 'Invalid credentials', 
            code: 'INVALID_CREDENTIALS' 
          }
        });
      }

      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: { 
            message: 'Invalid credentials', 
            code: 'INVALID_CREDENTIALS' 
          }
        });
      }

      // Actualizar estadísticas de login (sin fallar si hay error)
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lastLoginAt: new Date(),
            loginCount: { increment: 1 }
          }
        });
      } catch (updateError) {
        console.warn('Failed to update login stats:', updateError.message);
      }

      // Generar tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log('Login successful:', user.email);

      // Respuesta compatible con useLoginLogic
      res.status(200).json({
        success: true,
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone || null,
          role: user.role,
          userType: 'patient',
          beautyPoints: user.beautyPoints || 0,
          vipStatus: user.vipStatus || false,
          loyaltyTier: user.loyaltyTier || 'BRONZE',
          skinType: user.skinType || 'NORMAL',
          hasAllergies: user.hasAllergies || false,
          hasMedicalConditions: user.hasMedicalConditions || false,
          lastLogin: user.lastLoginAt,
          loginCount: user.loginCount || 0,
          memberSince: user.createdAt
        },
        data: {
          tokens: { 
            accessToken, 
            refreshToken, 
            tokenType: 'Bearer', 
            expiresIn: process.env.NODE_ENV === 'production' ? '4h' : '24h'
          },
          clinic: CLINIC_CONFIG,
          userType: 'patient'
        },
        message: 'Login successful'
      });

    } catch (error) {
      console.error('Login error:', error);
      console.error('Login error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta
      });
      
      res.status(500).json({
        success: false,
        error: { 
          message: 'Login failed', 
          code: 'LOGIN_ERROR'
        }
      });
    }
  }

  // ========================================================================
  // PROFESSIONAL LOGIN - IMPLEMENTACIÓN BÁSICA
  // ========================================================================
  static async professionalLogin(req, res) {
    try {
      const { email, password } = req.body;
      
      console.log('Professional login attempt:', email);
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Email and password are required', 
            code: 'MISSING_CREDENTIALS' 
          }
        });
      }

      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          isActive: true,
          role: 'PROFESSIONAL'
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { 
            message: 'Invalid credentials', 
            code: 'INVALID_CREDENTIALS' 
          }
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: { 
            message: 'Invalid credentials', 
            code: 'INVALID_CREDENTIALS' 
          }
        });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        userType: 'professional'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log('Professional login successful:', user.email);

      res.status(200).json({
        success: true,
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          role: user.role,
          userType: 'professional'
        },
        data: {
          tokens: { 
            accessToken, 
            refreshToken, 
            tokenType: 'Bearer', 
            expiresIn: process.env.NODE_ENV === 'production' ? '4h' : '24h'
          },
          clinic: CLINIC_CONFIG,
          userType: 'professional'
        },
        message: 'Professional login successful'
      });

    } catch (error) {
      console.error('Professional login error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Professional login failed', 
          code: 'PROFESSIONAL_LOGIN_ERROR'
        }
      });
    }
  }

  // ========================================================================
  // ADMIN LOGIN - IMPLEMENTACIÓN BÁSICA
  // ========================================================================
  static async adminLogin(req, res) {
    try {
      const { email, password } = req.body;
      
      console.log('Admin login attempt:', email);
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Email and password are required', 
            code: 'MISSING_CREDENTIALS' 
          }
        });
      }

      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          isActive: true,
          role: {
            in: ['MANAGER', 'ADMIN']
          }
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { 
            message: 'Invalid credentials', 
            code: 'INVALID_CREDENTIALS' 
          }
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: { 
            message: 'Invalid credentials', 
            code: 'INVALID_CREDENTIALS' 
          }
        });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        userType: 'admin'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log('Admin login successful:', user.email);

      res.status(200).json({
        success: true,
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone,
          role: user.role,
          userType: 'admin'
        },
        data: {
          tokens: { 
            accessToken, 
            refreshToken, 
            tokenType: 'Bearer', 
            expiresIn: process.env.NODE_ENV === 'production' ? '4h' : '24h'
          },
          clinic: CLINIC_CONFIG,
          userType: 'admin'
        },
        message: 'Admin login successful'
      });

    } catch (error) {
      console.error('Admin login error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Admin login failed', 
          code: 'ADMIN_LOGIN_ERROR'
        }
      });
    }
  }

  // ========================================================================
  // DEMO LOGIN - SOLO DESARROLLO
  // ========================================================================
  static async demoLogin(req, res) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: { message: 'Demo login not available in production', code: 'NOT_AVAILABLE' }
      });
    }

    try {
      const { type = 'patient' } = req.body;

      const demoUsers = {
        patient: {
          id: 'demo-patient-123',
          email: 'demo@bellezaestetica.com',
          firstName: 'Ana',
          lastName: 'García',
          name: 'Ana García',
          phone: '+34 600 123 456',
          role: 'CLIENT',
          userType: 'patient',
          beautyPoints: 1250,
          vipStatus: true,
          loyaltyTier: 'GOLD',
          skinType: 'NORMAL',
          hasAllergies: false,
          hasMedicalConditions: false,
          isDemo: true
        },
        professional: {
          id: 'demo-professional-456',
          email: 'professional@bellezaestetica.com',
          firstName: 'Carmen',
          lastName: 'López',
          name: 'Carmen López',
          phone: '+34 600 789 012',
          role: 'PROFESSIONAL',
          userType: 'professional',
          specialties: ['Facial', 'Anti-edad'],
          experience: 5,
          isDemo: true
        },
        admin: {
          id: 'demo-admin-789',
          email: 'admin@bellezaestetica.com',
          firstName: 'Admin',
          lastName: 'Usuario',
          name: 'Admin Usuario',
          phone: '+34 600 345 678',
          role: 'ADMIN',
          userType: 'admin',
          permissions: ['all'],
          isDemo: true
        }
      };

      const demoUser = demoUsers[type] || demoUsers.patient;

      const tokenPayload = {
        userId: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
        userType: demoUser.userType,
        isDemo: true
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log(`Demo login successful: ${demoUser.email} (${type})`);

      res.status(200).json({
        success: true,
        token: accessToken,
        user: demoUser,
        data: {
          tokens: { 
            accessToken, 
            refreshToken, 
            tokenType: 'Bearer', 
            expiresIn: '24h'
          },
          clinic: CLINIC_CONFIG,
          userType: demoUser.userType
        },
        message: `Demo ${type} login successful`
      });

    } catch (error) {
      console.error('Demo login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Demo login failed', code: 'DEMO_LOGIN_ERROR' }
      });
    }
  }

  // ========================================================================
  // CREAR USUARIO DE PRUEBA - SOLO DESARROLLO
  // ========================================================================
  static async createTestUser(req, res) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: { message: 'Test user creation not available in production', code: 'NOT_AVAILABLE' }
      });
    }

    try {
      const testEmail = `test${Date.now()}@test.com`;
      const testPassword = 'Test123456';
      const passwordHash = await hashPassword(testPassword);

      const testUser = await prisma.user.create({
        data: {
          firstName: 'Test',
          lastName: 'User',
          email: testEmail,
          passwordHash,
          beautyPoints: 100,
          loyaltyTier: 'BRONZE',
          vipStatus: false,
          role: 'CLIENT',
          isActive: true,
          privacyAccepted: true,
          termsAccepted: true,
          dataProcessingConsent: true,
          gdprAcceptedAt: new Date()
        }
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: testUser.id,
            email: testUser.email,
            password: testPassword // Solo en modo test!
          }
        },
        message: 'Test user created successfully'
      });

    } catch (error) {
      console.error('Error creating test user:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Failed to create test user', code: 'TEST_USER_ERROR' }
      });
    }
  }

  // ========================================================================
  // REFRESH TOKEN
  // ========================================================================
  static async refreshToken(req, res) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: { message: 'Refresh token is required', code: 'MISSING_REFRESH_TOKEN' }
        });
      }

      const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' }
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId, isActive: true }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'User not found or inactive', code: 'USER_NOT_FOUND' }
        });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        userType: user.role === 'PROFESSIONAL' ? 'professional' : 
                  user.role === 'ADMIN' || user.role === 'MANAGER' ? 'admin' : 'patient'
      };

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);

      res.status(200).json({
        success: true,
        data: {
          accessToken,
          refreshToken: newRefreshToken,
          tokenType: 'Bearer',
          expiresIn: process.env.NODE_ENV === 'production' ? '4h' : '24h'
        },
        message: 'Token refreshed successfully'
      });

    } catch (error) {
      console.error('Refresh token error:', error);
      
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' }
        });
      }

      res.status(500).json({
        success: false,
        error: { message: 'Token refresh failed', code: 'REFRESH_TOKEN_ERROR' }
      });
    }
  }

  // ========================================================================
  // VALIDATE SESSION
  // ========================================================================
  static async validateSession(req, res) {
    try {
      const user = req.user; // Del middleware de auth

      res.status(200).json({
        success: true,
        data: {
          authenticated: true,
          user: {
            id: user.id || user.userId,
            email: user.email,
            role: user.role,
            userType: user.userType
          }
        },
        message: 'Session is valid'
      });

    } catch (error) {
      console.error('Session validation error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Session validation failed', code: 'SESSION_VALIDATION_ERROR' }
      });
    }
  }

  // ========================================================================
  // LOGOUT
  // ========================================================================
  static async logout(req, res) {
    try {
      // En una implementación completa, aquí invalidarías el token
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Logout failed', code: 'LOGOUT_ERROR' }
      });
    }
  }
}

module.exports = AuthController;