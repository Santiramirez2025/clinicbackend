// ============================================================================
// 🔐 SINGLE CLINIC AUTH CONTROLLER - PRODUCTION READY v4.0 ✅
// src/controllers/auth.controller.js - OPTIMIZED FOR SINGLE CLINIC
// ============================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// ============================================================================
// CONFIGURACIÓN OPTIMIZADA PARA SINGLE CLINIC
// ============================================================================

// Singleton de Prisma
let prisma;
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

// Configuración JWT con validación
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is required in environment variables');
  process.exit(1);
}

// Configuración de la clínica única
const CLINIC_CONFIG = {
  name: process.env.CLINIC_NAME || 'Belleza Estética',
  email: process.env.CLINIC_EMAIL || 'info@bellezaestetica.com',
  phone: process.env.CLINIC_PHONE || '+34 900 123 456',
  city: process.env.CLINIC_CITY || 'Madrid',
  address: process.env.CLINIC_ADDRESS || 'Calle Principal 123',
  timezone: process.env.CLINIC_TIMEZONE || 'Europe/Madrid'
};

// ============================================================================
// UTILITARIOS
// ============================================================================
const generateTokens = (payload) => {
  const accessToken = jwt.sign(
    {
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      jti: Math.random().toString(36).substring(2) // Unique token ID
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
      userId: payload.userId || payload.professionalId,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      jti: Math.random().toString(36).substring(2)
    },
    JWT_REFRESH_SECRET,
    { 
      expiresIn: '7d', // Reduced from 30d for security
      issuer: 'belleza-estetica' 
    }
  );
  
  return { accessToken, refreshToken };
};

const hashPassword = async (password) => {
  const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
  return await bcrypt.hash(password, saltRounds);
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// ============================================================================
// AUTH CONTROLLER CLASS
// ============================================================================
class AuthController {
  
  // ========================================================================
  // REGISTER - OPTIMIZADO PARA SINGLE CLINIC ✅
  // ========================================================================
  static async register(req, res) {
    try {
      const { firstName, lastName, email, password, phone, birthDate, skinType } = req.body;
      
      console.log(`📝 Registration attempt: ${email}`);
      
      // Validaciones mejoradas
      const validationErrors = [];
      
      if (!firstName?.trim()) validationErrors.push('firstName is required');
      if (!lastName?.trim()) validationErrors.push('lastName is required');
      if (!email?.trim()) validationErrors.push('email is required');
      if (!password) validationErrors.push('password is required');
      
      if (email && !validateEmail(email)) {
        validationErrors.push('email format is invalid');
      }
      
      if (password && !validatePassword(password)) {
        validationErrors.push('password must be at least 8 characters with uppercase, lowercase and number');
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Validation failed', 
            code: 'VALIDATION_ERROR',
            details: validationErrors
          }
        });
      }
      
      // Verificar usuario existente
      const existingUser = await prisma.user.findFirst({
        where: { 
          email: email.toLowerCase().trim()
        },
        select: { id: true, email: true }
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: { 
            message: 'Email already registered', 
            code: 'EMAIL_EXISTS' 
          }
        });
      }
      
      // Hash password
      const passwordHash = await hashPassword(password);

      // Crear usuario para single clinic
      const user = await prisma.user.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          passwordHash,
          phone: phone?.trim() || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          skinType: skinType || 'NORMAL',
          
          // Configuración por defecto para single clinic
          beautyPoints: 100, // Puntos de bienvenida
          loyaltyTier: 'BRONZE',
          vipStatus: false,
          role: 'CLIENT',
          
          // Estados médicos por defecto
          hasAllergies: false,
          allergyDetails: null,
          hasMedicalConditions: false,
          medicalDetails: null,
          takingMedications: false,
          medicationDetails: null,
          
          // Configuración inicial
          isActive: true,
          isVerified: false, // Requiere verificación de email
          onboardingCompleted: false,
          
          // Consentimientos GDPR
          privacyAccepted: true,
          termsAccepted: true,
          dataProcessingConsent: true,
          gdprAcceptedAt: new Date(),
          
          // Preferencias de notificación
          emailNotifications: true,
          smsNotifications: false,
          marketingNotifications: true
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          beautyPoints: true,
          vipStatus: true,
          loyaltyTier: true,
          role: true,
          skinType: true,
          birthDate: true,
          hasAllergies: true,
          hasMedicalConditions: true,
          isActive: true,
          createdAt: true
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

      console.log(`✅ User registered successfully: ${user.email}`);

      // Respuesta optimizada
      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone,
            role: user.role,
            beautyPoints: user.beautyPoints,
            vipStatus: user.vipStatus,
            loyaltyTier: user.loyaltyTier,
            skinType: user.skinType,
            hasAllergies: user.hasAllergies,
            hasMedicalConditions: user.hasMedicalConditions,
            isActive: user.isActive,
            memberSince: user.createdAt
          },
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
      console.error('❌ Registration error:', error);
      
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
          code: 'REGISTRATION_ERROR',
          ...(process.env.NODE_ENV !== 'production' && { 
            details: error.message 
          })
        }
      });
    }
  }

  // ========================================================================
  // LOGIN PACIENTES - OPTIMIZADO ✅
  // ========================================================================
  static async patientLogin(req, res) {
    try {
      const { email, password, rememberMe = false } = req.body;
      
      console.log(`🔑 Login attempt: ${email}`);
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Email and password are required', 
            code: 'MISSING_CREDENTIALS' 
          }
        });
      }

      // Buscar usuario activo
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          isActive: true
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          passwordHash: true,
          beautyPoints: true,
          loyaltyTier: true,
          vipStatus: true,
          role: true,
          skinType: true,
          hasAllergies: true,
          hasMedicalConditions: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true
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

      // Actualizar estadísticas de login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 }
        }
      }).catch(err => console.warn('Failed to update login stats:', err));

      // Generar tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log(`✅ Login successful: ${user.email}`);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone,
            role: user.role,
            beautyPoints: user.beautyPoints,
            vipStatus: user.vipStatus,
            loyaltyTier: user.loyaltyTier,
            skinType: user.skinType,
            hasAllergies: user.hasAllergies,
            hasMedicalConditions: user.hasMedicalConditions,
            lastLogin: user.lastLoginAt,
            loginCount: user.loginCount,
            memberSince: user.createdAt
          },
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
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Login failed', 
          code: 'LOGIN_ERROR',
          ...(process.env.NODE_ENV !== 'production' && { 
            details: error.message 
          })
        }
      });
    }
  }

  // ========================================================================
  // LOGIN PROFESIONALES ✅
  // ========================================================================
  static async professionalLogin(req, res) {
    try {
      const { email, password } = req.body;
      
      console.log(`👨‍⚕️ Professional login attempt: ${email}`);
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Email and password are required', 
            code: 'MISSING_CREDENTIALS' 
          }
        });
      }

      const professional = await prisma.professional.findFirst({
        where: {
          email: email.toLowerCase().trim(),
          isActive: true
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          passwordHash: true,
          role: true,
          licenseNumber: true,
          specialties: true,
          experience: true,
          rating: true,
          bio: true,
          schedule: true,
          lastLoginAt: true,
          createdAt: true
        }
      });

      if (!professional || !await bcrypt.compare(password, professional.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { 
            message: 'Invalid credentials', 
            code: 'INVALID_CREDENTIALS' 
          }
        });
      }

      // Actualizar último login
      await prisma.professional.update({
        where: { id: professional.id },
        data: { lastLoginAt: new Date() }
      }).catch(err => console.warn('Failed to update professional login:', err));

      const tokenPayload = {
        professionalId: professional.id,
        email: professional.email,
        role: professional.role || 'PROFESSIONAL',
        userType: 'professional'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log(`✅ Professional login successful: ${professional.email}`);

      res.status(200).json({
        success: true,
        data: {
          professional: {
            id: professional.id,
            email: professional.email,
            firstName: professional.firstName,
            lastName: professional.lastName,
            name: `${professional.firstName} ${professional.lastName}`,
            phone: professional.phone,
            role: professional.role || 'PROFESSIONAL',
            licenseNumber: professional.licenseNumber,
            specialties: professional.specialties ? 
              (typeof professional.specialties === 'string' ? 
                JSON.parse(professional.specialties) : professional.specialties) : [],
            experience: professional.experience,
            rating: professional.rating,
            bio: professional.bio,
            schedule: professional.schedule,
            lastLogin: professional.lastLoginAt,
            joinedAt: professional.createdAt
          },
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
      console.error('❌ Professional login error:', error);
      res.status(500).json({
        success: false,
        error: { 
          message: 'Professional login failed', 
          code: 'PROFESSIONAL_LOGIN_ERROR',
          ...(process.env.NODE_ENV !== 'production' && { 
            details: error.message 
          })
        }
      });
    }
  }

  // ========================================================================
  // DEMO LOGIN PARA DESARROLLO ✅
  // ========================================================================
  static async demoLogin(req, res) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: { message: 'Demo login not available in production', code: 'NOT_AVAILABLE' }
      });
    }

    try {
      console.log('🎭 Demo login request');

      const demoUser = {
        id: 'demo-user-123',
        email: 'demo@bellezaestetica.com',
        firstName: 'Ana',
        lastName: 'García',
        name: 'Ana García',
        phone: '+34 600 123 456',
        role: 'CLIENT',
        beautyPoints: 1250,
        vipStatus: true,
        loyaltyTier: 'GOLD',
        skinType: 'NORMAL',
        hasAllergies: false,
        hasMedicalConditions: false,
        isDemo: true
      };

      const tokenPayload = {
        userId: demoUser.id,
        email: demoUser.email,
        role: demoUser.role,
        userType: 'patient',
        isDemo: true
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      res.status(200).json({
        success: true,
        data: {
          user: demoUser,
          tokens: { 
            accessToken, 
            refreshToken, 
            tokenType: 'Bearer', 
            expiresIn: '24h'
          },
          clinic: CLINIC_CONFIG,
          userType: 'patient'
        },
        message: 'Demo login successful'
      });

    } catch (error) {
      console.error('❌ Demo login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Demo login failed', code: 'DEMO_LOGIN_ERROR' }
      });
    }
  }

  // ========================================================================
  // REFRESH TOKEN ✅
  // ========================================================================
  static async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: { message: 'Refresh token required', code: 'MISSING_REFRESH_TOKEN' }
        });
      }

      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' }
        });
      }

      // Buscar usuario
      let userData = null;
      let tokenPayload = {};

      if (decoded.userId.startsWith('demo-')) {
        // Usuario demo
        tokenPayload = {
          userId: decoded.userId,
          email: 'demo@bellezaestetica.com',
          role: 'CLIENT',
          userType: 'patient',
          isDemo: true
        };
      } else {
        // Usuario real - verificar existencia y estado
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true
          }
        });

        if (!user || !user.isActive) {
          return res.status(401).json({
            success: false,
            error: { message: 'User not found or inactive', code: 'USER_INACTIVE' }
          });
        }

        tokenPayload = {
          userId: user.id,
          email: user.email,
          role: user.role,
          userType: 'patient'
        };
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);

      res.status(200).json({
        success: true,
        data: {
          tokens: {
            accessToken,
            refreshToken: newRefreshToken,
            tokenType: 'Bearer',
            expiresIn: process.env.NODE_ENV === 'production' ? '4h' : '24h'
          }
        },
        message: 'Token refreshed successfully'
      });

    } catch (error) {
      console.error('❌ Refresh token error:', error);
      
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid or expired refresh token', code: 'INVALID_REFRESH_TOKEN' }
        });
      }

      res.status(500).json({
        success: false,
        error: { message: 'Token refresh failed', code: 'REFRESH_ERROR' }
      });
    }
  }

  // ========================================================================
  // ADMIN LOGIN (SIMPLE) ✅
  // ========================================================================
  static async adminLogin(req, res) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email and password required', code: 'MISSING_CREDENTIALS' }
        });
      }

      // Simple admin login (should be enhanced with proper admin table)
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@bellezaestetica.com';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

      if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid admin credentials', code: 'INVALID_CREDENTIALS' }
        });
      }

      const tokenPayload = {
        userId: 'admin-1',
        email: adminEmail,
        role: 'ADMIN',
        userType: 'admin'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      res.status(200).json({
        success: true,
        data: {
          admin: {
            id: 'admin-1',
            email: adminEmail,
            name: 'Administrator',
            role: 'ADMIN'
          },
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
      console.error('❌ Admin login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Admin login failed', code: 'ADMIN_LOGIN_ERROR' }
      });
    }
  }

  // ========================================================================
  // VALIDAR SESIÓN ✅
  // ========================================================================
  static async validateSession(req, res) {
    try {
      // El middleware verifyToken ya validó el token y adjuntó req.user
      res.status(200).json({
        success: true,
        data: {
          authenticated: true,
          user: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            role: req.user.role,
            userType: req.user.userType
          }
        },
        message: 'Session is valid'
      });

    } catch (error) {
      console.error('❌ Session validation error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Session validation failed', code: 'SESSION_VALIDATION_ERROR' }
      });
    }
  }

  // ========================================================================
  // LOGOUT ✅
  // ========================================================================
  static async logout(req, res) {
    try {
      // En una implementación completa, aquí invalidarías el token en una blacklist
      // Para esta implementación simple, solo confirmamos el logout
      
      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('❌ Logout error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Logout failed', code: 'LOGOUT_ERROR' }
      });
    }
  }
}

module.exports = AuthController;