// ============================================================================
// 🔐 AUTH CONTROLLER CORREGIDO PARA SCHEMA PRISMA
// src/controllers/auth.controller.js
// ============================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================================================
// UTILIDADES
// ============================================================================
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', { 
    expiresIn: '24h',
    issuer: 'belleza-estetica',
    audience: 'mobile-app'
  });
  
  const refreshToken = jwt.sign(
    { 
      userId: payload.userId || payload.professionalId, 
      type: 'refresh' 
    },
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    { expiresIn: '30d', issuer: 'belleza-estetica' }
  );
  
  return { accessToken, refreshToken };
};

class AuthController {
  // ========================================================================
  // PATIENT LOGIN - CORREGIDO PARA SCHEMA
  // ========================================================================
  static async patientLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      console.log(`🏃‍♀️ Patient login: ${email} at ${clinicSlug || 'any'}`);
      
      // Buscar usuario con clínica relacionada
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          isActive: true
        },
        include: { 
          primaryClinic: true  // ✅ CORREGIDO: usar primaryClinic según schema
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Usuario no encontrado',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Verificar clínica si se especifica
      if (clinicSlug && user.primaryClinic.slug !== clinicSlug) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Usuario no pertenece a esta clínica',
            code: 'WRONG_CLINIC'
          }
        });
      }

      // Verificar contraseña
      if (!user.passwordHash || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }
        });
      }

      // Actualizar último login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() } // ✅ CORREGIDO: campo correcto
      });

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'patient',
        clinicId: user.primaryClinicId, // ✅ CORREGIDO: campo correcto
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
            avatarUrl: user.avatarUrl, // ✅ CORREGIDO: campo correcto
            beautyPoints: user.beautyPoints, // ✅ Incluir beauty points
            vipStatus: user.vipStatus, // ✅ Incluir VIP status
            loyaltyTier: user.loyaltyTier, // ✅ Incluir loyalty tier
            clinic: user.primaryClinic
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
  // PROFESSIONAL LOGIN - CORREGIDO PARA SCHEMA
  // ========================================================================
  static async professionalLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      console.log(`👨‍⚕️ Professional login: ${email} at ${clinicSlug || 'any'}`);
      
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
      if (clinicSlug && professional.clinic.slug !== clinicSlug) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Profesional no pertenece a esta clínica',
            code: 'WRONG_CLINIC'
          }
        });
      }

      // Verificar contraseña
      if (!professional.passwordHash || !await bcrypt.compare(password, professional.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }
        });
      }

      // Actualizar último login
      await prisma.professional.update({
        where: { id: professional.id },
        data: { lastLoginAt: new Date() } // ✅ CORREGIDO: campo correcto
      });

      const tokenPayload = {
        professionalId: professional.id,
        email: professional.email,
        role: professional.role || 'PROFESSIONAL', // ✅ CORREGIDO: usar role del schema
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
            licenseNumber: professional.licenseNumber, // ✅ CORREGIDO: campo correcto
            specialties: professional.specialties ? JSON.parse(professional.specialties) : [], // ✅ Parse JSON
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
  // ADMIN LOGIN - USANDO CLINIC TABLE COMO ADMIN
  // ========================================================================
  static async adminLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      console.log(`👨‍💼 Admin login: ${email} at ${clinicSlug || 'any'}`);
      
      // En tu schema, los admins son las clínicas mismas
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
          error: { message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }
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
              subscriptionPlan: clinic.subscriptionPlan
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
  // DEMO LOGIN - SIMPLIFICADO
  // ========================================================================
  static async demoLogin(req, res) {
    try {
      const demoUser = {
        id: 'demo-user-123',
        email: 'demo@bellezaestetica.com',
        firstName: 'Demo',
        lastName: 'User',
        role: 'patient',
        clinicId: 'madrid-centro'
      };

      const tokenPayload = {
        userId: demoUser.id,
        email: demoUser.email,
        role: 'patient',
        clinicId: demoUser.clinicId,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      res.status(200).json({
        success: true,
        data: {
          user: {
            ...demoUser,
            name: `${demoUser.firstName} ${demoUser.lastName}`,
            phone: '+34 123 456 789',
            beautyPoints: 1250,
            vipStatus: true,
            loyaltyTier: 'GOLD',
            avatarUrl: null,
            clinic: {
              id: 'madrid-centro',
              name: 'Clínica Madrid Centro',
              slug: 'madrid-centro',
              city: 'Madrid'
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
  // REGISTER - CORREGIDO PARA SCHEMA
  // ========================================================================
  static async register(req, res) {
    try {
      const { firstName, lastName, email, password, phone, clinicSlug } = req.body;
      
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
      let primaryClinicId = null;
      let clinic = null;
      
      if (clinicSlug) {
        clinic = await prisma.clinic.findUnique({ 
          where: { slug: clinicSlug, isActive: true } 
        });
        
        if (!clinic) {
          return res.status(404).json({
            success: false,
            error: { message: 'Clínica no encontrada', code: 'CLINIC_NOT_FOUND' }
          });
        }
        primaryClinicId = clinic.id;
      } else {
        // Si no se especifica clínica, usar la primera activa
        clinic = await prisma.clinic.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' }
        });
        
        if (clinic) {
          primaryClinicId = clinic.id;
        }
      }

      if (!primaryClinicId) {
        return res.status(400).json({
          success: false,
          error: { message: 'No hay clínicas disponibles', code: 'NO_CLINICS_AVAILABLE' }
        });
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(password, 12);

      // Crear usuario con campos correctos del schema
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          passwordHash,
          phone,
          primaryClinicId, // ✅ CORREGIDO: usar primaryClinicId
          beautyPoints: 100, // ✅ Bonus de registro
          loyaltyTier: 'BRONZE', // ✅ Tier inicial
          vipStatus: false,
          isActive: true,
          isVerified: false,
          onboardingCompleted: false,
          privacyAccepted: true,
          termsAccepted: true,
          emailNotifications: true,
          smsNotifications: false,
          marketingNotifications: true
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
  // REFRESH TOKEN
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

      const decoded = jwt.verify(
        refreshToken, 
        process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret'
      );
      
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
      } else if (decoded.professionalId) {
        userData = await prisma.professional.findUnique({ 
          where: { id: decoded.professionalId, isActive: true } 
        });
        
        if (userData) {
          tokenPayload = {
            professionalId: userData.id,
            email: userData.email,
            role: userData.role,
            clinicId: userData.clinicId,
            userType: 'professional'
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
  // LOGOUT
  // ========================================================================
  static async logout(req, res) {
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  }

  // ========================================================================
  // VALIDATE SESSION - CORREGIDO
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
}

module.exports = AuthController;