// ============================================================================
// auth.controller.js - SINGLE CLINIC PRODUCTION READY v4.0 - FIXED
// ============================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

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
  console.error('JWT_SECRET is required in environment variables');
  process.exit(1);
}

// Configuración de la clínica única
const CLINIC_CONFIG = {
  name: process.env.CLINIC_NAME || 'Belleza Estética',
  slug: 'belleza-estetica',
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
      userId: payload.userId || payload.professionalId,
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
};

const hashPassword = async (password) => {
  const saltRounds = process.env.NODE_ENV === 'production' ? 12 : 10;
  return await bcrypt.hash(password, saltRounds);
};

// ============================================================================
// ENSURE CLINIC EXISTS - SINGLE CLINIC HELPER
// ============================================================================
const ensureClinicExists = async () => {
  try {
    // Buscar clínica existente
    let clinic = await prisma.clinic.findFirst({
      where: { 
        OR: [
          { slug: CLINIC_CONFIG.slug },
          { email: CLINIC_CONFIG.email }
        ]
      }
    });

    // Si no existe, crearla
    if (!clinic) {
      console.log('Creating default clinic for single clinic setup...');
      
      clinic = await prisma.clinic.create({
        data: {
          name: CLINIC_CONFIG.name,
          slug: CLINIC_CONFIG.slug,
          email: CLINIC_CONFIG.email,
          passwordHash: await hashPassword('admin123'), // Default admin password
          phone: CLINIC_CONFIG.phone,
          address: CLINIC_CONFIG.address,
          city: CLINIC_CONFIG.city,
          postalCode: '28001',
          country: 'ES',
          timezone: CLINIC_CONFIG.timezone,
          businessHours: JSON.stringify({
            monday: { open: '09:00', close: '20:00', enabled: true },
            tuesday: { open: '09:00', close: '20:00', enabled: true },
            wednesday: { open: '09:00', close: '20:00', enabled: true },
            thursday: { open: '09:00', close: '20:00', enabled: true },
            friday: { open: '09:00', close: '20:00', enabled: true },
            saturday: { open: '10:00', close: '18:00', enabled: true },
            sunday: { closed: true }
          }),
          isActive: true,
          isVerified: true,
          emailVerified: true,
          onboardingCompleted: true,
          subscriptionPlan: 'PREMIUM',
          enableOnlineBooking: true,
          enableVipProgram: true,
          enablePayments: true
        }
      });
      
      console.log(`Clinic created: ${clinic.name} (${clinic.id})`);
    }

    return clinic;
  } catch (error) {
    console.error('Error ensuring clinic exists:', error);
    throw error;
  }
};

// ============================================================================
// AUTH CONTROLLER CLASS
// ============================================================================
class AuthController {
  
  // ========================================================================
  // REGISTER - FIXED FOR SINGLE CLINIC WITH primaryClinic
  // ========================================================================
  static async register(req, res) {
    try {
      const { firstName, lastName, email, password, phone, birthDate, skinType } = req.body;
      
      console.log(`Registration attempt: ${email}`);
      
      // Validaciones
      const validationErrors = [];
      
      if (!firstName?.trim()) validationErrors.push('firstName is required');
      if (!lastName?.trim()) validationErrors.push('lastName is required');
      if (!email?.trim()) validationErrors.push('email is required');
      if (!password) validationErrors.push('password is required');
      
      // Validación de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (email && !emailRegex.test(email)) {
        validationErrors.push('email format is invalid');
      }
      
      // Validación de contraseña (debe coincidir con frontend)
      if (password) {
        if (password.length < 8) validationErrors.push('password must be at least 8 characters');
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
          validationErrors.push('password must contain uppercase, lowercase and number');
        }
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
      
      // PASO 1: Asegurar que existe la clínica
      const clinic = await ensureClinicExists();
      
      // PASO 2: Verificar usuario existente
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

      // PASO 3: Hash password
      const passwordHash = await hashPassword(password);

      // PASO 4: Crear usuario con clínica asociada
      const user = await prisma.user.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          passwordHash,
          phone: phone?.trim() || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          skinType: skinType || 'NORMAL',
          
          // FIXED: Conectar con clínica única
          primaryClinicId: clinic.id,
          
          // Configuración por defecto
          beautyPoints: 100,
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
          isVerified: false,
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
          createdAt: true,
          primaryClinic: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              phone: true,
              email: true,
              address: true
            }
          }
        }
      });

      // PASO 5: Generar tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log(`Registration successful: ${user.email}`);

      // PASO 6: Respuesta con auto-login
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
          clinic: {
            id: user.primaryClinic.id,
            name: user.primaryClinic.name,
            city: user.primaryClinic.city,
            phone: user.primaryClinic.phone,
            email: user.primaryClinic.email,
            address: user.primaryClinic.address,
            features: {
              onlineBooking: true,
              vipProgram: true,
              payments: true,
              beautyPoints: true
            }
          },
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
          code: 'REGISTRATION_ERROR',
          ...(process.env.NODE_ENV !== 'production' && { 
            details: error.message 
          })
        }
      });
    }
  }

  // ========================================================================
  // LOGIN PACIENTES - OPTIMIZADO
  // ========================================================================
  static async patientLogin(req, res) {
    try {
      const { email, password } = req.body;
      
      console.log(`Login attempt: ${email}`);
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { 
            message: 'Email and password are required', 
            code: 'MISSING_CREDENTIALS' 
          }
        });
      }

      // Buscar usuario activo con clínica
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
          createdAt: true,
          primaryClinic: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true,
              phone: true,
              email: true,
              address: true
            }
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

      console.log(`Login successful: ${user.email}`);

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
          clinic: {
            id: user.primaryClinic.id,
            name: user.primaryClinic.name,
            city: user.primaryClinic.city,
            phone: user.primaryClinic.phone,
            email: user.primaryClinic.email,
            address: user.primaryClinic.address,
            features: {
              onlineBooking: true,
              vipProgram: true,
              payments: true,
              beautyPoints: true
            }
          },
          userType: 'patient'
        },
        message: 'Login successful'
      });

    } catch (error) {
      console.error('Login error:', error);
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
  // OTROS MÉTODOS (PROFESSIONAL, ADMIN, etc.)
  // ========================================================================
  static async professionalLogin(req, res) {
    res.status(501).json({
      success: false,
      error: { message: 'Professional login not implemented yet', code: 'NOT_IMPLEMENTED' }
    });
  }

  static async adminLogin(req, res) {
    res.status(501).json({
      success: false,
      error: { message: 'Admin login not implemented yet', code: 'NOT_IMPLEMENTED' }
    });
  }

  static async demoLogin(req, res) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        error: { message: 'Demo login not available in production', code: 'NOT_AVAILABLE' }
      });
    }

    try {
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
      console.error('Demo login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Demo login failed', code: 'DEMO_LOGIN_ERROR' }
      });
    }
  }

  static async refreshToken(req, res) {
    res.status(501).json({
      success: false,
      error: { message: 'Refresh token not implemented yet', code: 'NOT_IMPLEMENTED' }
    });
  }

  static async validateSession(req, res) {
    try {
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
      console.error('Session validation error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Session validation failed', code: 'SESSION_VALIDATION_ERROR' }
      });
    }
  }

  static async logout(req, res) {
    try {
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