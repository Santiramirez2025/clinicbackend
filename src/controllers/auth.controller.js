// ============================================================================
// src/controllers/auth.controller.js - FINAL CORREGIDO PARA USUARIOS REALES ✅
// ============================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const JWT_SECRET = process.env.JWT_SECRET || 'belleza-secret-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'belleza-refresh-2024';

// ============================================================================
// UTILITARIOS
// ============================================================================
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: '24h',
    issuer: 'belleza-estetica',
    audience: 'mobile-app'
  });
  
  const refreshToken = jwt.sign(
    { 
      userId: payload.userId || payload.professionalId || payload.clinicId, 
      type: 'refresh' 
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d', issuer: 'belleza-estetica' }
  );
  
  return { accessToken, refreshToken };
};

// ============================================================================
// SEED DATA FUNCTION - SOLO CAMPOS BÁSICOS QUE EXISTEN ✅
// ============================================================================
const ensureSeedData = async () => {
  try {
    console.log('🌱 Verificando datos iniciales...');

    // 1. Crear clínica por defecto si no existe
    let clinic = await prisma.clinic.findUnique({
      where: { slug: 'madrid-centro' }
    });

    if (!clinic) {
      console.log('🏥 Creando clínica por defecto...');
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      clinic = await prisma.clinic.create({
        data: {
          name: 'Clínica Madrid Centro',
          slug: 'madrid-centro',
          email: 'madrid-centro@bellezaestetica.com',
          passwordHash: hashedPassword,
          phone: '+34 91 123 4567',
          address: 'Calle Gran Vía, 28, Madrid',
          city: 'Madrid',
          country: 'ES',
          timezone: 'Europe/Madrid',
          isActive: true,
          isVerified: true,
          onboardingCompleted: true,
          enableOnlineBooking: true,
          subscriptionPlan: 'PREMIUM'
        }
      });
    }

    // 2. Crear usuario paciente por defecto si no existe
    let user = await prisma.user.findUnique({
      where: { email: 'ana@email.com' }
    });

    if (!user) {
      console.log('👤 Creando usuario paciente por defecto...');
      const hashedPassword = await bcrypt.hash('password123', 12);
      
      user = await prisma.user.create({
        data: {
          firstName: 'Ana',
          lastName: 'García',
          email: 'ana@email.com',
          passwordHash: hashedPassword,
          phone: '+34 600 123 456',
          primaryClinicId: clinic.id,
          beautyPoints: 150,
          loyaltyTier: 'GOLD',
          vipStatus: true,
          isActive: true,
          isVerified: true,
          onboardingCompleted: true,
          privacyAccepted: true,
          termsAccepted: true,
          emailNotifications: true,
          smsNotifications: false,
          marketingNotifications: true,
          dataProcessingConsent: true
        }
      });
    }

    console.log('✅ Datos iniciales verificados/creados');
    return { clinic, user };

  } catch (error) {
    console.error('❌ Error creating seed data:', error);
    throw error;
  }
};

class AuthController {
  // ========================================================================
  // PATIENT LOGIN ✅
  // ========================================================================
  static async patientLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      console.log(`🏃‍♀️ Patient login: ${email} at ${clinicSlug || 'any'}`);
      
      // Asegurar datos iniciales
      await ensureSeedData();
      
      // Validaciones básicas
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email y contraseña requeridos', code: 'MISSING_FIELDS' }
        });
      }

      // Buscar usuario en la base de datos
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          isActive: true
        },
        include: { 
          primaryClinic: true
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }
        });
      }

      // Verificar clínica si se especifica
      if (clinicSlug && user.primaryClinic?.slug !== clinicSlug) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario no pertenece a esta clínica', code: 'WRONG_CLINIC' }
        });
      }

      // Verificar contraseña
      if (!user.passwordHash || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Contraseña incorrecta', code: 'INVALID_CREDENTIALS' }
        });
      }

      // Actualizar último login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() }
      });

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'patient',
        clinicId: user.primaryClinicId,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log(`✅ Patient login successful: ${user.email}`);

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
            role: 'patient',
            avatarUrl: user.avatarUrl,
            beautyPoints: user.beautyPoints,
            vipStatus: user.vipStatus,
            loyaltyTier: user.loyaltyTier,
            primaryClinicId: user.primaryClinicId,
            clinic: user.primaryClinic ? {
              id: user.primaryClinic.id,
              name: user.primaryClinic.name,
              slug: user.primaryClinic.slug,
              city: user.primaryClinic.city,
              address: user.primaryClinic.address,
              phone: user.primaryClinic.phone
            } : null
          },
          tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
          userType: 'patient'
        },
        message: 'Login exitoso'
      });

    } catch (error) {
      console.error('❌ Patient login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
      });
    }
  }

  // ========================================================================
  // PROFESSIONAL LOGIN ✅
  // ========================================================================
  static async professionalLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      console.log(`👨‍⚕️ Professional login: ${email} at ${clinicSlug || 'any'}`);
      
      await ensureSeedData();
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email y contraseña requeridos', code: 'MISSING_FIELDS' }
        });
      }
      
      const professional = await prisma.professional.findFirst({
        where: {
          email: email.toLowerCase(),
          isActive: true
        },
        include: { clinic: true }
      });

      if (!professional) {
        return res.status(401).json({
          success: false,
          error: { message: 'Profesional no encontrado', code: 'PROFESSIONAL_NOT_FOUND' }
        });
      }

      // Verificar clínica si se especifica
      if (clinicSlug && professional.clinic?.slug !== clinicSlug) {
        return res.status(401).json({
          success: false,
          error: { message: 'Profesional no pertenece a esta clínica', code: 'WRONG_CLINIC' }
        });
      }

      // Verificar contraseña
      if (!professional.passwordHash || !await bcrypt.compare(password, professional.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Contraseña incorrecta', code: 'INVALID_CREDENTIALS' }
        });
      }

      // Actualizar último login
      await prisma.professional.update({
        where: { id: professional.id },
        data: { lastLoginAt: new Date() }
      });

      const tokenPayload = {
        professionalId: professional.id,
        email: professional.email,
        role: professional.role,
        clinicId: professional.clinicId,
        userType: 'professional'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

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
            role: professional.role,
            licenseNumber: professional.licenseNumber,
            specialties: professional.specialties ? JSON.parse(professional.specialties) : [],
            experience: professional.experience,
            rating: professional.rating,
            avatarUrl: professional.avatarUrl,
            clinic: professional.clinic
          },
          tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
          userType: 'professional'
        },
        message: 'Login exitoso'
      });

    } catch (error) {
      console.error('❌ Professional login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
      });
    }
  }

  // ========================================================================
  // ADMIN LOGIN ✅
  // ========================================================================
  static async adminLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      console.log(`👨‍💼 Admin login: ${email} at ${clinicSlug || 'any'}`);
      
      await ensureSeedData();
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email y contraseña requeridos', code: 'MISSING_FIELDS' }
        });
      }
      
      // Buscar clínica (los admins son las clínicas en tu schema)
      const clinic = await prisma.clinic.findFirst({
        where: {
          email: email.toLowerCase(),
          isActive: true,
          ...(clinicSlug && { slug: clinicSlug })
        }
      });

      if (!clinic) {
        return res.status(401).json({
          success: false,
          error: { message: 'Administrador no encontrado', code: 'ADMIN_NOT_FOUND' }
        });
      }

      // Verificar contraseña de clínica
      if (!clinic.passwordHash || !await bcrypt.compare(password, clinic.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Contraseña incorrecta', code: 'INVALID_CREDENTIALS' }
        });
      }

      const tokenPayload = {
        clinicId: clinic.id,
        email: clinic.email,
        role: 'admin',
        userType: 'admin'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      res.status(200).json({
        success: true,
        data: {
          admin: {
            id: clinic.id,
            email: clinic.email,
            name: clinic.name,
            phone: clinic.phone,
            role: 'admin',
            clinic: {
              id: clinic.id,
              name: clinic.name,
              slug: clinic.slug,
              city: clinic.city,
              subscriptionPlan: clinic.subscriptionPlan,
              maxProfessionals: clinic.maxProfessionals,
              maxPatients: clinic.maxPatients
            }
          },
          tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
          userType: 'admin'
        },
        message: 'Login exitoso'
      });

    } catch (error) {
      console.error('❌ Admin login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
      });
    }
  }

  // ========================================================================
  // DEMO LOGIN ✅
  // ========================================================================
  static async demoLogin(req, res) {
    try {
      // Asegurar datos iniciales
      const { user, clinic } = await ensureSeedData();

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'patient',
        clinicId: user.primaryClinicId,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

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
            role: 'patient',
            beautyPoints: user.beautyPoints,
            vipStatus: user.vipStatus,
            loyaltyTier: user.loyaltyTier,
            clinic: {
              id: clinic.id,
              name: clinic.name,
              slug: clinic.slug,
              city: clinic.city
            }
          },
          tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
          userType: 'patient'
        },
        message: 'Demo login exitoso'
      });

    } catch (error) {
      console.error('❌ Demo login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error en demo login', code: 'DEMO_LOGIN_ERROR' }
      });
    }
  }

  // ========================================================================
  // REGISTER - SOLO CAMPOS BÁSICOS ✅
  // ========================================================================
  static async register(req, res) {
    try {
      const { firstName, lastName, email, password, phone, clinicSlug } = req.body;
      
      console.log(`📝 Registering user: ${email} at clinic: ${clinicSlug || 'auto'}`);
      
      // Asegurar datos iniciales
      await ensureSeedData();
      
      // Validaciones básicas
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Todos los campos son requeridos', code: 'MISSING_FIELDS' }
        });
      }
      
      // Verificar si el email ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email ya registrado', code: 'EMAIL_EXISTS' }
        });
      }

      // Buscar clínica
      let clinic = null;
      
      if (clinicSlug) {
        clinic = await prisma.clinic.findUnique({ 
          where: { slug: clinicSlug, isActive: true } 
        });
      } else {
        clinic = await prisma.clinic.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        });
      }

      if (!clinic) {
        return res.status(400).json({
          success: false,
          error: { message: 'No hay clínicas disponibles', code: 'NO_CLINICS_AVAILABLE' }
        });
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(password, 12);

      // ✅ CREAR USUARIO SOLO CON CAMPOS BÁSICOS QUE SABEMOS QUE EXISTEN
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          passwordHash,
          phone: phone || null,
          primaryClinicId: clinic.id,
          beautyPoints: 100, // Bonus de registro
          loyaltyTier: 'BRONZE',
          vipStatus: false,
          isActive: true,
          isVerified: false,
          onboardingCompleted: false,
          privacyAccepted: true,
          termsAccepted: true,
          emailNotifications: true,
          smsNotifications: false,
          marketingNotifications: true,
          dataProcessingConsent: true
        },
        include: { primaryClinic: true }
      });

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'patient',
        clinicId: user.primaryClinicId,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log(`✅ User registered successfully: ${user.email}`);

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
            role: 'patient',
            beautyPoints: user.beautyPoints,
            vipStatus: user.vipStatus,
            loyaltyTier: user.loyaltyTier,
            clinic: user.primaryClinic
          },
          tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
          userType: 'patient'
        },
        message: 'Usuario registrado exitosamente'
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
      });
    }
  }

  // ========================================================================
  // VALIDATE SESSION ✅
  // ========================================================================
  static async validateSession(req, res) {
    try {
      const { userId, professionalId, clinicId } = req.user;
      
      let userData = null;
      let userType = 'unknown';

      if (userId) {
        userData = await prisma.user.findUnique({
          where: { id: userId },
          include: { primaryClinic: true }
        });
        userType = 'patient';
      } else if (professionalId) {
        userData = await prisma.professional.findUnique({
          where: { id: professionalId },
          include: { clinic: true }
        });
        userType = 'professional';
      } else if (clinicId) {
        userData = await prisma.clinic.findUnique({
          where: { id: clinicId }
        });
        userType = 'admin';
      }

      if (!userData) {
        return res.status(404).json({
          success: false,
          error: { message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }
        });
      }

      res.status(200).json({
        success: true,
        data: { 
          user: userData, 
          userType, 
          authenticated: true,
          isActive: userData.isActive !== false
        },
        message: 'Sesión válida'
      });

    } catch (error) {
      console.error('❌ Error validating session:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
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
        return res.status(401).json({
          success: false,
          error: { message: 'Refresh token requerido', code: 'REFRESH_TOKEN_REQUIRED' }
        });
      }

      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      
      let userData = null;
      let tokenPayload = {};

      if (decoded.userId) {
        userData = await prisma.user.findUnique({ 
          where: { id: decoded.userId, isActive: true } 
        });
        
        if (userData) {
          tokenPayload = {
            userId: userData.id,
            email: userData.email,
            role: 'patient',
            clinicId: userData.primaryClinicId,
            userType: 'patient'
          };
        }
      }

      if (!userData) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario no válido', code: 'INVALID_USER' }
        });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);

      res.status(200).json({
        success: true,
        data: {
          tokens: {
            accessToken,
            refreshToken: newRefreshToken,
            tokenType: 'Bearer',
            expiresIn: '24h'
          }
        },
        message: 'Token renovado exitosamente'
      });

    } catch (error) {
      console.error('❌ Refresh token error:', error);
      res.status(401).json({
        success: false,
        error: { message: 'Refresh token inválido', code: 'INVALID_REFRESH_TOKEN' }
      });
    }
  }

  // ========================================================================
  // LOGOUT ✅
  // ========================================================================
  static async logout(req, res) {
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  }
}

module.exports = AuthController;