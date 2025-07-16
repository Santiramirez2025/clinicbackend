// ============================================================================
// src/controllers/auth.controller.js - CONTROLADOR COMPLETO CON ADMIN LOGIN ✅
// ============================================================================
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { AppError } = require('../utils/errors');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');

const prisma = new PrismaClient();

// Email service con manejo de errores
const EmailService = {
  sendWelcome: (user) => Promise.resolve(),
  sendPasswordReset: (user, token) => Promise.resolve(),
  sendPasswordResetConfirmation: (user) => Promise.resolve()
};

class AuthController {
  // ========================================================================
  // LOGIN TRADICIONAL ✅
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
          vipSubscriptions: {
            where: {
              status: 'ACTIVE',
              currentPeriodEnd: { gte: new Date() }
            }
          }
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

      // Actualizar estado VIP
      const hasActiveVIP = user.vipSubscriptions.length > 0;
      if (user.vipStatus !== hasActiveVIP) {
        await prisma.user.update({
          where: { id: user.id },
          data: { vipStatus: hasActiveVIP }
        });
      }

      // Generar tokens
      const { accessToken, refreshToken } = generateTokens(user.id);

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
            avatarUrl: user.avatarUrl,
            vipStatus: hasActiveVIP,
            beautyPoints: user.beautyPoints,
            sessionsCompleted: user.sessionsCompleted
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '1h'
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }

  // ========================================================================
  // DEMO LOGIN ✅
  // ========================================================================
  static async demoLogin(req, res, next) {
    try {
      console.log('🎭 Iniciando demo login...');

      // Usuario demo predefinido
      let demoUser = await prisma.user.findUnique({
        where: { email: 'demo@bellezaestetica.com' },
        include: {
          vipSubscriptions: {
            where: {
              status: 'ACTIVE',
              currentPeriodEnd: { gte: new Date() }
            }
          }
        }
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
            beautyPoints: 150,
            sessionsCompleted: 8,
            totalInvestment: 2400.00,
            vipStatus: true,
            preferredNotifications: JSON.stringify({
              appointments: true,
              wellness: true,
              offers: true,
              promotions: true
            })
          }
        });

        // Crear suscripción VIP demo
        await prisma.vipSubscription.create({
          data: {
            userId: demoUser.id,
            stripeSubscriptionId: 'sub_demo_' + demoUser.id,
            stripeCustomerId: 'cus_demo_' + demoUser.id,
            planType: 'MONTHLY',
            price: 19.99,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          }
        });

        // Recargar usuario con suscripciones
        demoUser = await prisma.user.findUnique({
          where: { id: demoUser.id },
          include: {
            vipSubscriptions: {
              where: {
                status: 'ACTIVE',
                currentPeriodEnd: { gte: new Date() }
              }
            }
          }
        });
      }

      // Generar tokens
      const { accessToken, refreshToken } = generateTokens(demoUser.id);

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
            vipStatus: demoUser.vipStatus,
            beautyPoints: demoUser.beautyPoints,
            sessionsCompleted: demoUser.sessionsCompleted,
            isDemo: true
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '1h'
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en demo login:', error);
      next(error);
    }
  }

  // ========================================================================
  // ⭐ ADMIN LOGIN - NUEVO MÉTODO ✅
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

      // Si no existe, crear clínica demo
      if (!clinic) {
        if (email.toLowerCase() === 'admin@bellezaestetica.com') {
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
        } else {
          console.log(`❌ Clínica no encontrada: ${email}`);
          throw new AppError('Credenciales de administrador inválidas', 401);
        }
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

      // Respuesta exitosa
      res.status(200).json({
        success: true,
        message: 'Login de administrador exitoso',
        data: {
          user: {
            id: clinic.id,
            email: clinic.email,
            firstName: 'Admin',
            lastName: clinic.name,
            role: 'admin',
            plan: clinic.subscriptionPlan,
            beautyPoints: 0,
            sessionsCompleted: 0,
            vipStatus: true
          },
          tokens: {
            accessToken: adminToken,
            refreshToken: adminToken, // Usar el mismo token por simplicidad
            expiresIn: '24h'
          },
          clinic: {
            id: clinic.id,
            name: clinic.name,
            plan: clinic.subscriptionPlan,
            expiresAt: clinic.subscriptionExpiresAt
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en admin login:', error);
      next(error);
    }
  }

  // ========================================================================
  // REGISTRO DE USUARIO ✅
  // ========================================================================
  static async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Errores de validación:', errors.array());
        
        // Mapear errores a mensajes más amigables
        const friendlyErrors = errors.array().map(error => {
          switch (error.path) {
            case 'firstName':
              return 'El nombre no es válido';
            case 'lastName':
              return 'El apellido no es válido';
            case 'email':
              return 'El formato del email no es válido';
            case 'phone':
              return 'El formato del teléfono no es válido';
            case 'password':
              return 'La contraseña debe tener al menos 6 caracteres';
            default:
              return error.msg;
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

      console.log(`🔐 Intento de registro para: ${email}`);

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

      // Preparar preferencias de notificación con valores por defecto
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
          phone: phone.trim(),
          beautyPoints: 20, // Puntos de bienvenida
          preferredNotifications: JSON.stringify(defaultPreferences)
        }
      });

      console.log(`✅ Usuario creado exitosamente: ${email} (ID: ${newUser.id})`);

      // Enviar email de bienvenida en background (no bloquear respuesta)
      EmailService.sendWelcome(newUser).catch(error => {
        console.error('⚠️ Error enviando email de bienvenida:', error);
        // No lanzar error, el registro fue exitoso
      });

      // Generar tokens
      const { accessToken, refreshToken } = generateTokens(newUser.id);

      res.status(201).json({
        success: true,
        message: 'Usuario registrado exitosamente',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            beautyPoints: newUser.beautyPoints,
            sessionsCompleted: 0,
            vipStatus: false
          },
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: '1h'
          }
        }
      });

    } catch (error) {
      console.error('❌ Error en registro:', error);
      next(error);
    }
  }

  // ========================================================================
  // FORGOT PASSWORD - SOLICITAR RECUPERACIÓN ✅
  // ========================================================================
  static async forgotPassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Email inválido', 400, errors.array());
      }

      const { email } = req.body;
      
      console.log(`🔑 Solicitud de recuperación para: ${email}`);

      // Buscar usuario
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      // ⚠️ Por seguridad, siempre respondemos OK aunque el usuario no exista
      if (!user) {
        console.log(`⚠️ Usuario no encontrado: ${email}, pero respondemos OK por seguridad`);
        
        res.status(200).json({
          success: true,
          message: 'Si existe una cuenta con ese email, recibirás las instrucciones de recuperación'
        });
        return;
      }

      // Invalidar tokens existentes no usados
      await prisma.passwordResetToken.updateMany({
        where: { 
          userId: user.id,
          used: false,
          expiresAt: { gte: new Date() }
        },
        data: { used: true }
      });

      // Generar nuevo token de recuperación
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Guardar token en la base de datos
      await prisma.passwordResetToken.create({
        data: {
          token: resetToken,
          userId: user.id,
          expiresAt
        }
      });

      // Enviar email de recuperación en background
      EmailService.sendPasswordReset(user, resetToken).catch(error => {
        console.error('⚠️ Error enviando email de recuperación:', error);
        // No lanzar error, el token fue creado exitosamente
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
  // VERIFICAR TOKEN DE RECUPERACIÓN ✅
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
  // RESETEAR CONTRASEÑA ✅
  // ========================================================================
  static async resetPassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos inválidos', 400, errors.array());
      }

      const { token, newPassword } = req.body;

      console.log(`🔑 Reseteando contraseña con token: ${token.substring(0, 10)}...`);

      // Buscar token válido
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token },
        include: { user: true }
      });

      if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
        console.log(`❌ Token inválido para reset`);
        throw new AppError('Token de recuperación inválido o expirado', 400);
      }

      // Hash de nueva contraseña
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Actualizar contraseña y marcar token como usado en transacción
      await prisma.$transaction([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash }
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { used: true }
        }),
        // Invalidar todos los otros tokens del usuario por seguridad
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

      // Enviar email de confirmación en background
      EmailService.sendPasswordResetConfirmation(resetToken.user).catch(error => {
        console.error('⚠️ Error enviando confirmación:', error);
        // No lanzar error, el reset fue exitoso
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
  // REFRESH TOKEN ✅
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
            expiresIn: '1h'
          }
        }
      });

    } catch (error) {
      console.error('❌ Error renovando token:', error);
      next(error);
    }
  }

  // ========================================================================
  // LOGOUT ✅
  // ========================================================================
  static async logout(req, res, next) {
    try {
      console.log('👋 Logout ejecutado');
      
      // En una implementación real con Redis, aquí invalidarías el token
      // await redisClient.del(`token:${req.user.id}`);
      
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
  // CHANGE PASSWORD (Para usuarios autenticados) ✅
  // ========================================================================
  static async changePassword(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos inválidos', 400, errors.array());
      }

      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id; // Del middleware de auth

      console.log(`🔑 Cambio de contraseña para usuario: ${userId}`);

      // Obtener usuario actual
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 404);
      }

      // Verificar contraseña actual
      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidCurrentPassword) {
        console.log('❌ Contraseña actual incorrecta');
        throw new AppError('Contraseña actual incorrecta', 400);
      }

      // Hash de nueva contraseña
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Actualizar contraseña
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
  // VALIDATE SESSION - Verificar si el usuario está autenticado ✅
  // ========================================================================
  static async validateSession(req, res, next) {
    try {
      const userId = req.user.id; // Del middleware de auth

      // Obtener datos actualizados del usuario
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          vipSubscriptions: {
            where: {
              status: 'ACTIVE',
              currentPeriodEnd: { gte: new Date() }
            }
          }
        }
      });

      if (!user) {
        throw new AppError('Sesión inválida', 401);
      }

      // Actualizar estado VIP si es necesario
      const hasActiveVIP = user.vipSubscriptions.length > 0;
      if (user.vipStatus !== hasActiveVIP) {
        await prisma.user.update({
          where: { id: user.id },
          data: { vipStatus: hasActiveVIP }
        });
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            vipStatus: hasActiveVIP,
            beautyPoints: user.beautyPoints,
            sessionsCompleted: user.sessionsCompleted
          }
        }
      });

    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;