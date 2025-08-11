const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================================================
// UTILIDADES
// ============================================================================
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { 
    expiresIn: '24h',
    issuer: 'clinica-estetica',
    audience: 'mobile-app'
  });
  
  const refreshToken = jwt.sign(
    { userId: payload.userId || payload.professionalId || payload.adminId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d', issuer: 'clinica-estetica' }
  );
  
  return { accessToken, refreshToken };
};

class AuthController {
  // ========================================================================
  // PATIENT LOGIN
  // ========================================================================
  static async patientLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      console.log(`🏃‍♀️ Patient login: ${email} at ${clinicSlug || 'any'}`);
      
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          isActive: true,
          ...(clinicSlug && { clinic: { slug: clinicSlug } })
        },
        include: { clinic: true, userProfile: true }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            message: clinicSlug ? 'Usuario no encontrado en esta clínica' : 'Usuario no encontrado',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      if (user.role && ['admin', 'professional'].includes(user.role)) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Use el login correspondiente a su rol',
            code: 'WRONG_USER_TYPE'
          }
        });
      }

      if (!user.passwordHash || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role || 'patient',
        clinicId: user.clinicId,
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
            role: user.role || 'patient',
            profilePicture: user.profilePicture,
            isEmailVerified: user.isEmailVerified,
            clinic: user.clinic,
            profile: user.userProfile
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
  // PROFESSIONAL LOGIN
  // ========================================================================
  static async professionalLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      const professional = await prisma.professional.findFirst({
        where: {
          email: email.toLowerCase(),
          isActive: true,
          ...(clinicSlug && { clinic: { slug: clinicSlug } })
        },
        include: { clinic: true, specialties: true }
      });

      if (!professional) {
        return res.status(401).json({
          success: false,
          error: { message: 'Profesional no encontrado', code: 'PROFESSIONAL_NOT_FOUND' }
        });
      }

      if (!professional.passwordHash || !await bcrypt.compare(password, professional.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }
        });
      }

      await prisma.professional.update({
        where: { id: professional.id },
        data: { lastLogin: new Date() }
      });

      const tokenPayload = {
        professionalId: professional.id,
        email: professional.email,
        role: 'professional',
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
            role: 'professional',
            license: professional.license,
            specialization: professional.specialization,
            clinic: professional.clinic,
            specialties: professional.specialties
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
  // ADMIN LOGIN
  // ========================================================================
  static async adminLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      const admin = await prisma.admin.findFirst({
        where: {
          email: email.toLowerCase(),
          isActive: true,
          ...(clinicSlug && { clinic: { slug: clinicSlug } })
        },
        include: { clinic: true }
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          error: { message: 'Administrador no encontrado', code: 'ADMIN_NOT_FOUND' }
        });
      }

      if (!admin.passwordHash || !await bcrypt.compare(password, admin.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }
        });
      }

      await prisma.admin.update({
        where: { id: admin.id },
        data: { lastLogin: new Date() }
      });

      const tokenPayload = {
        adminId: admin.id,
        email: admin.email,
        role: 'admin',
        clinicId: admin.clinicId,
        userType: 'admin'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      res.status(200).json({
        success: true,
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            name: admin.name || `${admin.firstName} ${admin.lastName}`,
            phone: admin.phone,
            role: 'admin',
            permissions: admin.permissions,
            clinic: admin.clinic
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
  // DEMO LOGIN
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
            profilePicture: null,
            isEmailVerified: true,
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
  // REGISTER
  // ========================================================================
  static async register(req, res) {
    try {
      const { firstName, lastName, email, password, phone, clinicSlug } = req.body;
      
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email ya registrado', code: 'EMAIL_EXISTS' }
        });
      }

      let clinicId = null;
      if (clinicSlug) {
        const clinic = await prisma.clinic.findUnique({ where: { slug: clinicSlug } });
        if (!clinic) {
          return res.status(404).json({
            success: false,
            error: { message: 'Clínica no encontrada', code: 'CLINIC_NOT_FOUND' }
          });
        }
        clinicId = clinic.id;
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          passwordHash,
          phone,
          clinicId,
          role: 'patient',
          isActive: true,
          registrationDate: new Date(),
          authProvider: 'local'
        },
        include: { clinic: true }
      });

      // Crear perfil inicial
      try {
        await prisma.userProfile.create({
          data: {
            userId: user.id,
            beautyPoints: 0,
            totalSessions: 0,
            isVip: false,
            preferences: { notifications: true, promotions: true, reminders: true }
          }
        });
      } catch (profileError) {
        console.log('⚠️ No se pudo crear perfil inicial');
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'patient',
        clinicId: user.clinicId,
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
            clinic: user.clinic
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

      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      let userData = null;
      let tokenPayload = {};

      if (decoded.userId) {
        userData = await prisma.user.findUnique({ where: { id: decoded.userId } });
        tokenPayload = {
          userId: userData.id,
          email: userData.email,
          role: userData.role || 'patient',
          clinicId: userData.clinicId,
          userType: 'patient'
        };
      }

      if (!userData || !userData.isActive) {
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
  // VALIDATE SESSION
  // ========================================================================
  static async validateSession(req, res) {
    try {
      const { userId, professionalId, adminId } = req.user;
      
      let userData = null;
      let userType = 'unknown';

      if (userId) {
        userData = await prisma.user.findUnique({
          where: { id: userId },
          include: { clinic: true, userProfile: true }
        });
        userType = 'patient';
      } else if (professionalId) {
        userData = await prisma.professional.findUnique({
          where: { id: professionalId },
          include: { clinic: true, specialties: true }
        });
        userType = 'professional';
      } else if (adminId) {
        userData = await prisma.admin.findUnique({
          where: { id: adminId },
          include: { clinic: true }
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
        data: { user: userData, userType, authenticated: true },
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