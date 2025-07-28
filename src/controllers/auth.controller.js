// ============================================================================
// src/controllers/auth.controller.js - CONTROLADOR COMPLETO PARA PRODUCCIÓN ✅
// ============================================================================
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const fetch = require('node-fetch'); // Para verificar tokens de Google

const prisma = new PrismaClient();

// Configurar cliente OAuth de Google
const googleClient = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

// ============================================================================
// UTILIDADES JWT
// ============================================================================
const generateTokens = (userId, additionalPayload = {}) => {
  const tokenPayload = {
    userId,
    type: 'access',
    ...additionalPayload
  };

  const accessToken = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    { 
      expiresIn: '24h',
      issuer: 'clinica-estetica',
      audience: 'mobile-app'
    }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { 
      expiresIn: '30d',
      issuer: 'clinica-estetica'
    }
  );

  return { accessToken, refreshToken };
};

const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
};

// ============================================================================
// EMAIL SERVICE MOCK (Reemplazar con servicio real)
// ============================================================================
const EmailService = {
  sendWelcome: (user) => Promise.resolve(),
  sendPasswordReset: (user, token) => Promise.resolve(),
  sendPasswordResetConfirmation: (user) => Promise.resolve()
};

// ============================================================================
// ERROR HANDLING
// ============================================================================
class AppError extends Error {
  constructor(message, statusCode, validationErrors = null) {
    super(message);
    this.statusCode = statusCode;
    this.validationErrors = validationErrors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class AuthController {
  // ========================================================================
  // 🔐 LOGIN TRADICIONAL ✅
  // ========================================================================
  static async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos de entrada inválidos', 400, errors.array());
      }

      const { email, password } = req.body;

      console.log(`🔐 Intento de login para: ${email}`);

      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          clinic: true,
        }
      });

      if (!user) {
        console.log(`❌ Usuario no encontrado: ${email}`);
        throw new AppError('Credenciales inválidas', 401);
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        console.log(`❌ Contraseña incorrecta para: ${email}`);
        throw new AppError('Credenciales inválidas', 401);
      }

      // Actualizar último login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      // Generar tokens
      const { accessToken, refreshToken } = generateTokens(user.id, {
        email: user.email,
        role: user.role,
        authProvider: user.authProvider || 'email',
        isEmailVerified: user.isEmailVerified || false
      });

      console.log(`✅ Login exitoso para: ${email}`);

      // Respuesta exitosa
      res.status(200).json({
        success: true,
        message: 'Login exitoso',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`,
            profilePicture: user.profilePicture,
            phone: user.phone,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            authProvider: user.authProvider || 'email',
            registrationDate: user.registrationDate,
            lastLogin: user.lastLogin,
            clinic: user.clinic ? {
              id: user.clinic.id,
              name: user.clinic.name,
            } : null,
          },
          tokens: {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: '24h',
          },
          authProvider: user.authProvider || 'email',
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // ========================================================================
  // 🔐 GOOGLE LOGIN ✅
  // ========================================================================
  static async googleLogin(req, res, next) {
    try {
      const {
        googleId,
        email,
        firstName,
        lastName,
        name,
        picture,
        verified_email,
        googleAccessToken,
        googleIdToken,
        authProvider,
        platform
      } = req.body;

      console.log('🔐 Google login attempt for:', email);

      // ✅ 1. VALIDAR TOKEN DE GOOGLE
      let googleUserInfo;
      try {
        // Verificar el ID token con Google
        if (googleIdToken) {
          const ticket = await googleClient.verifyIdToken({
            idToken: googleIdToken,
            audience: process.env.GOOGLE_CLIENT_ID,
          });
          googleUserInfo = ticket.getPayload();
        } else {
          // Verificar access token
          const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${googleAccessToken}`);
          if (!response.ok) {
            throw new Error('Token de Google inválido');
          }
          googleUserInfo = await response.json();
        }

        // Verificar que el email coincida
        if (googleUserInfo.email !== email) {
          throw new Error('Email no coincide con token de Google');
        }

      } catch (error) {
        console.error('❌ Error validando token de Google:', error);
        return res.status(401).json({
          success: false,
          error: {
            message: 'Token de Google inválido',
            code: 'INVALID_GOOGLE_TOKEN'
          }
        });
      }

      // ✅ 2. BUSCAR O CREAR USUARIO
      let user;
      
      try {
        // 2a. Buscar usuario existente por email
        user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: {
            clinic: true,
          }
        });

        if (user) {
          // Usuario existente - actualizar información de Google
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: googleId,
              profilePicture: picture,
              authProvider: 'google',
              lastLogin: new Date(),
              isEmailVerified: verified_email || true,
              // Actualizar nombre si no tenía
              firstName: user.firstName || firstName,
              lastName: user.lastName || lastName,
            },
            include: {
              clinic: true,
            }
          });

          console.log('✅ Usuario existente actualizado:', user.email);

        } else {
          // 2b. Crear nuevo usuario
          user = await prisma.user.create({
            data: {
              googleId: googleId,
              email: email.toLowerCase(),
              firstName: firstName || name?.split(' ')[0] || 'Usuario',
              lastName: lastName || name?.split(' ').slice(1).join(' ') || 'Google',
              profilePicture: picture,
              authProvider: 'google',
              isEmailVerified: verified_email || true,
              registrationDate: new Date(),
              lastLogin: new Date(),
              // Campos requeridos por el schema
              phone: null, // Se puede actualizar después
              skinType: null,
              role: 'user',
              isActive: true,
            },
            include: {
              clinic: true,
            }
          });

          console.log('✅ Nuevo usuario creado:', user.email);

          // Crear perfil inicial si existe la tabla
          try {
            await prisma.userProfile.create({
              data: {
                userId: user.id,
                beautyPoints: 0,
                totalSessions: 0,
                isVip: false,
                preferences: {
                  notifications: true,
                  promotions: true,
                  reminders: true,
                }
              }
            });
          } catch (profileError) {
            console.log('⚠️ No se pudo crear perfil inicial (tabla no existe o error):', profileError.message);
            // No lanzar error, el usuario se creó exitosamente
          }
        }

      } catch (dbError) {
        console.error('❌ Error en base de datos:', dbError);
        return res.status(500).json({
          success: false,
          error: {
            message: 'Error interno del servidor',
            code: 'DATABASE_ERROR'
          }
        });
      }

      // ✅ 3. GENERAR TOKENS JWT
      const { accessToken, refreshToken } = generateTokens(user.id, {
        email: user.email,
        role: user.role,
        authProvider: 'google',
        isEmailVerified: user.isEmailVerified,
      });

      // ✅ 4. PREPARAR RESPUESTA
      const responseData = {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName} ${user.lastName}`,
          profilePicture: user.profilePicture,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          authProvider: user.authProvider,
          registrationDate: user.registrationDate,
          lastLogin: user.lastLogin,
          clinic: user.clinic ? {
            id: user.clinic.id,
            name: user.clinic.name,
          } : null,
        },
        tokens: {
          accessToken,
          refreshToken,
          tokenType: 'Bearer',
          expiresIn: '24h',
        },
        authProvider: 'google',
      };

      // ✅ 5. LOG DE ÉXITO Y RESPUESTA
      console.log(`✅ Google login successful for user: ${user.email} (ID: ${user.id})`);

      res.status(200).json({
        success: true,
        data: responseData,
        message: 'Autenticación con Google exitosa'
      });

    } catch (error) {
      console.error('❌ Error general en Google login:', error);
      
      res.status(500).json({
        success: false,
        error: {
          message: 'Error interno del servidor',
          code: 'INTERNAL_SERVER_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        }
      });
    }
  }

  // ========================================================================
  // 🎭 DEMO LOGIN ✅
  // ========================================================================
  static async demoLogin(req, res, next) {
    try {
      console.log('🎭 Iniciando demo login...');

      // Usuario demo predefinido
      let demoUser = await prisma.user.findUnique({
        where: { email: 'demo@bellezaestetica.com' },
        include: { clinic: true }
      });

      // Si no existe, crear usuario demo
      if (!demoUser) {
        console.log('🔧 Creando usuario demo...');
        
        demoUser = await prisma.user.create({
          data: {
            email: 'demo@bellezaestetica.com',
            passwordHash: await bcrypt.hash('demo123', 12),
            firstName: 'María',
            lastName: 'Demo',
            phone: '+54 11 1234-5678',
            skinType: 'MIXED',
            role: 'user',
            authProvider: 'demo',
            isEmailVerified: true,
            isActive: true,
            registrationDate: new Date(),
            lastLogin: new Date(),
          },
          include: { clinic: true }
        });
      } else {
        // Actualizar último login
        await prisma.user.update({
          where: { id: demoUser.id },
          data: { lastLogin: new Date() }
        });
      }

      // Generar tokens
      const { accessToken, refreshToken } = generateTokens(demoUser.id, {
        email: demoUser.email,
        role: demoUser.role,
        authProvider: 'demo',
        isEmailVerified: true
      });

      console.log('✅ Demo login exitoso');

      res.status(200).json({
        success: true,
        message: 'Bienvenida a la experiencia demo',
        data: {
          user: {
            id: demoUser.id,
            email: demoUser.email,
            firstName: demoUser.firstName,
            lastName: demoUser.lastName,
            name: `${demoUser.firstName} ${demoUser.lastName}`,
            phone: demoUser.phone,
            role: demoUser.role,
            authProvider: 'demo',
            isDemo: true
          },
          tokens: {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: '24h',
          },
          authProvider: 'demo'
        }
      });

    } catch (error) {
      console.error('❌ Error en demo login:', error);
      next(error);
    }
  }

  // ========================================================================
  // 👑 ADMIN LOGIN ✅
  // ========================================================================
  static async adminLogin(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos de entrada inválidos', 400, errors.array());
      }

      const { email, password } = req.body;

      console.log(`👑 Intento de admin login para: ${email}`);

      // Buscar clínica admin
      let clinic = await prisma.clinic.findUnique({
        where: { email: email.toLowerCase() }
      });

      // Si no existe, crear clínica demo para desarrollo
      if (!clinic && email.toLowerCase() === 'admin@bellezaestetica.com') {
        console.log('🔧 Creando clínica demo...');
        
        const passwordHash = await bcrypt.hash('admin123', 12);
        
        clinic = await prisma.clinic.create({
          data: {
            name: 'Belleza Estética Premium',
            email: 'admin@bellezaestetica.com',
            passwordHash,
            phone: '+34 91 123 4567',
            address: 'Calle Serrano 123, Madrid',
            subscriptionPlan: 'PREMIUM',
            subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
            settings: JSON.stringify({
              timezone: 'Europe/Madrid',
              currency: 'EUR',
              language: 'es',
              notifications: {
                email: true,
                sms: true,
                push: true
              }
            }),
            brandColors: JSON.stringify({
              primary: '#8b5cf6',
              secondary: '#06b6d4',
              accent: '#f59e0b'
            })
          }
        });
        
        console.log('✅ Clínica demo creada exitosamente');
      }

      if (!clinic) {
        console.log(`❌ Clínica no encontrada: ${email}`);
        throw new AppError('Credenciales de administrador inválidas', 401);
      }

      // Verificar contraseña
      const isValidPassword = await bcrypt.compare(password, clinic.passwordHash);
      if (!isValidPassword) {
        console.log(`❌ Contraseña incorrecta para admin: ${email}`);
        throw new AppError('Credenciales de administrador inválidas', 401);
      }

      // Generar token JWT para admin
      const adminToken = jwt.sign(
        { 
          clinicId: clinic.id,
          email: clinic.email,
          role: 'admin',
          plan: clinic.subscriptionPlan
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log(`✅ Admin login exitoso para: ${email}`);

      res.status(200).json({
        success: true,
        message: 'Login de administrador exitoso',
        data: {
          user: {
            id: clinic.id,
            email: clinic.email,
            firstName: 'Admin',
            lastName: clinic.name,
            name: `Admin ${clinic.name}`,
            role: 'admin',
            plan: clinic.subscriptionPlan,
            authProvider: 'admin'
          },
          tokens: {
            accessToken: adminToken,
            refreshToken: adminToken,
            tokenType: 'Bearer',
            expiresIn: '24h',
          },
          clinic: {
            id: clinic.id,
            name: clinic.name,
            plan: clinic.subscriptionPlan,
            expiresAt: clinic.subscriptionExpiresAt
          },
          authProvider: 'admin'
        }
      });

    } catch (error) {
      console.error('❌ Error en admin login:', error);
      next(error);
    }
  }

  // ========================================================================
  // 📝 REGISTRO DE USUARIO ✅
  // ========================================================================
  static async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Errores de validación:', errors.array());
        
        const friendlyErrors = errors.array().map(error => {
          switch (error.path) {
            case 'firstName': return 'El nombre no es válido';
            case 'lastName': return 'El apellido no es válido';
            case 'email': return 'El formato del email no es válido';
            case 'phone': return 'El formato del teléfono no es válido';
            case 'password': return 'La contraseña debe tener al menos 6 caracteres';
            default: return error.msg;
          }
        });
        
        throw new AppError(friendlyErrors[0], 400, friendlyErrors);
      }

      const { 
        firstName, 
        lastName, 
        email, 
        phone, 
        password, 
        notificationPreferences 
      } = req.body;

      console.log(`📝 Intento de registro para: ${email}`);

      // Verificar si el email ya existe
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        console.log(`❌ Email ya registrado: ${email}`);
        throw new AppError('Este email ya está registrado', 409);
      }

      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(password, 12);

      // Preparar preferencias de notificación
      const defaultPreferences = {
        appointments: true,
        wellness: true,
        offers: false,
        promotions: false,
        ...notificationPreferences
      };

      // Crear usuario
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone?.trim(),
          role: 'user',
          authProvider: 'email',
          isEmailVerified: false,
          isActive: true,
          registrationDate: new Date(),
          lastLogin: new Date(),
          preferredNotifications: JSON.stringify(defaultPreferences)
        }
      });

      console.log(`✅ Usuario creado exitosamente: ${email} (ID: ${newUser.id})`);

      // Enviar email de bienvenida en background
      EmailService.sendWelcome(newUser).catch(error => {
        console.error('⚠️ Error enviando email de bienvenida:', error);
      });

      // Generar tokens
      const { accessToken, refreshToken } = generateTokens(newUser.id, {
        email: newUser.email,
        role: newUser.role,
        authProvider: 'email',
        isEmailVerified: false
      });

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            name: `${newUser.firstName} ${newUser.lastName}`,
            phone: newUser.phone,
            role: newUser.role,
            authProvider: 'email',
            isEmailVerified: false
          },
          tokens: {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: '24h',
          },
          authProvider: 'email'
        }
      });

    } catch (error) {
      console.error('❌ Error en registro:', error);
      next(error);
    }
  }

  // ========================================================================
  // 🔑 FORGOT PASSWORD ✅
  // ========================================================================
  static async forgotPassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Email inválido', 400, errors.array());
      }

      const { email } = req.body;
      
      console.log(`🔑 Solicitud de recuperación para: ${email}`);

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      // Por seguridad, siempre respondemos OK
      if (!user) {
        console.log(`⚠️ Usuario no encontrado: ${email}, pero respondemos OK por seguridad`);
        
        res.status(200).json({
          success: true,
          message: 'Si existe una cuenta con ese email, recibirás las instrucciones de recuperación'
        });
        return;
      }

      // Invalidar tokens existentes
      await prisma.passwordResetToken.updateMany({
        where: { 
          userId: user.id,
          used: false,
          expiresAt: { gte: new Date() }
        },
        data: { used: true }
      });

      // Generar nuevo token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          expiresAt
        }
      });

      // Enviar email en background
      EmailService.sendPasswordReset(user, resetToken).catch(error => {
        console.error('⚠️ Error enviando email de recuperación:', error);
      });

      console.log(`✅ Token de recuperación creado para: ${email}`);

      res.status(200).json({
        success: true,
        message: 'Si existe una cuenta con ese email, recibirás las instrucciones de recuperación',
        data: {
          // En desarrollo, incluir el token para testing
          ...(process.env.NODE_ENV === 'development' && { 
            resetToken,
            expiresAt,
            userFound: true
          })
        }
      });

    } catch (error) {
      console.error('❌ Error en forgot password:', error);
      next(error);
    }
  }

  // ========================================================================
  // 🔍 VERIFICAR TOKEN DE RECUPERACIÓN ✅
  // ========================================================================
  static async verifyResetToken(req, res, next) {
    try {
      const { token } = req.params;

      console.log(`🔍 Verificando token: ${token.substring(0, 10)}...`);

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
        console.log(`❌ Token inválido o expirado`);
        throw new AppError('Token de recuperación inválido o expirado', 400);
      }

      console.log(`✅ Token válido para usuario: ${resetToken.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Token válido',
        data: {
          email: resetToken.user.email,
          firstName: resetToken.user.firstName
        }
      });

    } catch (error) {
      console.error('❌ Error verificando token:', error);
      next(error);
    }
  }

  // ========================================================================
  // 🔄 RESETEAR CONTRASEÑA ✅
  // ========================================================================
  static async resetPassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos inválidos', 400, errors.array());
      }

      const { token, newPassword } = req.body;

      console.log(`🔑 Reseteando contraseña con token: ${token.substring(0, 10)}...`);

      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
        console.log(`❌ Token inválido para reset`);
        throw new AppError('Token de recuperación inválido o expirado', 400);
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Actualizar contraseña y marcar token como usado
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash }
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true }
        }),
        prisma.passwordResetToken.updateMany({
          where: { 
            userId: resetToken.userId,
            used: false,
            id: { not: resetToken.id }
          },
          data: { used: true }
        })
      ]);

      console.log(`✅ Contraseña actualizada para: ${resetToken.user.email}`);

      EmailService.sendPasswordResetConfirmation(resetToken.user).catch(error => {
        console.error('⚠️ Error enviando confirmación:', error);
      });

      res.status(200).json({
        success: true,
        message: 'Contraseña actualizada exitosamente',
        data: {
          email: resetToken.user.email
        }
      });

    } catch (error) {
      console.error('❌ Error reseteando contraseña:', error);
      next(error);
    }
  }

  // ========================================================================
  // 🔄 REFRESH TOKEN ✅
  // ========================================================================
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token requerido', 400);
      }

      console.log('🔄 Renovando token...');

      const decoded = verifyRefreshToken(refreshToken);
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);

      console.log('✅ Token renovado exitosamente');

      res.status(200).json({
        success: true,
        data: {
          tokens: {
            accessToken,
            refreshToken: newRefreshToken,
            tokenType: 'Bearer',
            expiresIn: '24h',
          }
        }
      });

    } catch (error) {
      console.error('❌ Error renovando token:', error);
      next(error);
    }
  }

  // ========================================================================
  // 👋 LOGOUT ✅
  // ========================================================================
  static async logout(req, res, next) {
    try {
      console.log('👋 Logout ejecutado');
      
      res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      console.error('❌ Error en logout:', error);
      next(error);
    }
  }

  // ========================================================================
  // 🔒 CHANGE PASSWORD ✅
  // ========================================================================
  static async changePassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos inválidos', 400, errors.array());
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;

      console.log(`🔑 Cambio de contraseña para usuario: ${userId}`);

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidCurrentPassword) {
        console.log('❌ Contraseña actual incorrecta');
        throw new AppError('Contraseña actual incorrecta', 400);
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      });

      console.log(`✅ Contraseña cambiada para usuario: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });

    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      next(error);
    }
  }

  // ========================================================================
  // ✅ VALIDATE SESSION ✅
  // ========================================================================
  static async validateSession(req, res, next) {
    try {
      const userId = req.user.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          clinic: true,
        }
      });

      if (!user) {
        throw new AppError('Sesión inválida', 401);
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`,
            profilePicture: user.profilePicture,
            phone: user.phone,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            authProvider: user.authProvider,
            clinic: user.clinic ? {
              id: user.clinic.id,
              name: user.clinic.name,
            } : null,
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // ========================================================================
  // 📧 VERIFY EMAIL (Opcional) ✅
  // ========================================================================
  static async verifyEmail(req, res, next) {
    try {
      const { token } = req.params;

      console.log(`📧 Verificando email con token: ${token.substring(0, 10)}...`);

      // Buscar token de verificación
      const verificationToken = await prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!verificationToken || verificationToken.used || verificationToken.expiresAt < new Date()) {
        console.log(`❌ Token de verificación inválido o expirado`);
        throw new AppError('Token de verificación inválido o expirado', 400);
      }

      // Actualizar usuario y marcar token como usado
      await prisma.$transaction([
        prisma.user.update({
          where: { id: verificationToken.userId },
          data: { isEmailVerified: true }
        }),
        prisma.emailVerificationToken.update({
          where: { id: verificationToken.id },
          data: { used: true }
        })
      ]);

      console.log(`✅ Email verificado para: ${verificationToken.user.email}`);

      res.status(200).json({
        success: true,
        message: 'Email verificado exitosamente',
        data: {
          email: verificationToken.user.email,
          verified: true
        }
      });

    } catch (error) {
      console.error('❌ Error verificando email:', error);
      next(error);
    }
  }

  // ========================================================================
  // 📧 RESEND EMAIL VERIFICATION ✅
  // ========================================================================
  static async resendEmailVerification(req, res, next) {
    try {
      const userId = req.user?.id || req.body.userId;
      const email = req.body.email;

      console.log(`📧 Reenviando verificación de email para: ${email || userId}`);

      let user;
      if (userId) {
        user = await prisma.user.findUnique({ where: { id: userId } });
      } else if (email) {
        user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      }

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      if (user.isEmailVerified) {
        return res.status(200).json({
          success: true,
          message: 'El email ya está verificado'
        });
      }

      // Invalidar tokens existentes
      await prisma.emailVerificationToken.updateMany({
        where: { 
          userId: user.id,
          used: false,
          expiresAt: { gte: new Date() }
        },
        data: { used: true }
      });

      // Generar nuevo token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

      await prisma.emailVerificationToken.create({
        data: {
          token: verificationToken,
          userId: user.id,
          expiresAt
        }
      });

      // Enviar email en background
      EmailService.sendEmailVerification(user, verificationToken).catch(error => {
        console.error('⚠️ Error enviando email de verificación:', error);
      });

      console.log(`✅ Token de verificación creado para: ${user.email}`);

      res.status(200).json({
        success: true,
        message: 'Email de verificación enviado',
        data: {
          // En desarrollo, incluir el token para testing
          ...(process.env.NODE_ENV === 'development' && { 
            verificationToken,
            expiresAt
          })
        }
      });

    } catch (error) {
      console.error('❌ Error reenviando verificación:', error);
      next(error);
    }
  }

  // ========================================================================
  // 🔍 CHECK EMAIL AVAILABILITY ✅
  // ========================================================================
  static async checkEmailAvailability(req, res, next) {
    try {
      const { email } = req.query;

      if (!email) {
        throw new AppError('Email requerido', 400);
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      res.status(200).json({
        success: true,
        data: {
          email,
          available: !existingUser,
          message: existingUser ? 'Este email ya está registrado' : 'Email disponible'
        }
      });

    } catch (error) {
      console.error('❌ Error verificando disponibilidad de email:', error);
      next(error);
    }
  }

  // ========================================================================
  // 📱 VERIFY PHONE (Opcional) ✅
  // ========================================================================
  static async verifyPhone(req, res, next) {
    try {
      const { phone, code } = req.body;
      const userId = req.user.id;

      console.log(`📱 Verificando teléfono: ${phone} para usuario: ${userId}`);

      // Buscar código de verificación
      const verificationCode = await prisma.phoneVerificationCode.findUnique({
        where: { 
          phone_code: {
            phone,
            code
          }
        },
        include: { user: true }
      });

      if (!verificationCode || 
          verificationCode.used || 
          verificationCode.expiresAt < new Date() ||
          verificationCode.userId !== userId) {
        console.log(`❌ Código de verificación inválido`);
        throw new AppError('Código de verificación inválido o expirado', 400);
      }

      // Actualizar usuario y marcar código como usado
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { 
            phone,
            isPhoneVerified: true 
          }
        }),
        prisma.phoneVerificationCode.update({
          where: { id: verificationCode.id },
          data: { used: true }
        })
      ]);

      console.log(`✅ Teléfono verificado para usuario: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Teléfono verificado exitosamente',
        data: {
          phone,
          verified: true
        }
      });

    } catch (error) {
      console.error('❌ Error verificando teléfono:', error);
      next(error);
    }
  }

  // ========================================================================
  // 🔄 REFRESH USER DATA ✅
  // ========================================================================
  static async refreshUserData(req, res, next) {
    try {
      const userId = req.user.id;

      console.log(`🔄 Actualizando datos de usuario: ${userId}`);

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          clinic: true,
        }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`,
            profilePicture: user.profilePicture,
            phone: user.phone,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            authProvider: user.authProvider,
            registrationDate: user.registrationDate,
            lastLogin: user.lastLogin,
            clinic: user.clinic ? {
              id: user.clinic.id,
              name: user.clinic.name,
            } : null,
          }
        }
      });

    } catch (error) {
      console.error('❌ Error actualizando datos de usuario:', error);
      next(error);
    }
  }
}

// ============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES ✅
// ============================================================================
const errorHandler = (error, req, res, next) => {
  console.error('🔥 Error capturado:', error);

  // Error de validación de Prisma
  if (error.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: {
        message: 'Este email ya está registrado',
        code: 'DUPLICATE_EMAIL'
      }
    });
  }

  // Error operacional (AppError)
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code || 'OPERATIONAL_ERROR',
        validationErrors: error.validationErrors
      }
    });
  }

  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token inválido',
        code: 'INVALID_TOKEN'
      }
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      }
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    error: {
      message: 'Error interno del servidor',
      code: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }
  });
};

// ============================================================================
// EXPORTAR MÓDULO ✅
// ============================================================================
module.exports = {
  AuthController,
  AppError,
  errorHandler,
  generateTokens,
  verifyRefreshToken
};