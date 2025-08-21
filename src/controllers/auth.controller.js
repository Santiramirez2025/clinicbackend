// ============================================================================
// auth.controller.js - SIN SEED DATA, REGISTRO DIRECTO ✅
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

class AuthController {
  // ========================================================================
  // REGISTER - SIN SEED DATA, DIRECTO ✅
  // ========================================================================
  static async register(req, res) {
    try {
      const { firstName, lastName, email, password, phone, clinicSlug } = req.body;
      
      console.log(`📝 Direct register attempt: ${email}`);
      
      // Validaciones básicas
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Todos los campos son requeridos', code: 'MISSING_FIELDS' }
        });
      }
      
      // ✅ SIN SEED DATA - VERIFICAR USUARIO EXISTENTE DIRECTAMENTE
      console.log('🔍 Checking if user exists...');
      
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true } // Solo campos básicos
      });

      if (existingUser) {
        console.log('❌ User already exists');
        return res.status(409).json({
          success: false,
          error: { message: 'Email ya registrado', code: 'EMAIL_EXISTS' }
        });
      }

      console.log('🔍 Looking for any available clinic...');
      
      // ✅ BUSCAR CUALQUIER CLÍNICA ACTIVA SIN ESPECIFICAR CAMPOS COMPLEJOS
      const clinic = await prisma.clinic.findFirst({
        where: { isActive: true },
        select: { id: true, name: true, slug: true, city: true },
        orderBy: { createdAt: 'asc' }
      });

      if (!clinic) {
        console.log('❌ No clinics available');
        return res.status(400).json({
          success: false,
          error: { message: 'No hay clínicas disponibles', code: 'NO_CLINICS_AVAILABLE' }
        });
      }

      console.log(`✅ Found clinic: ${clinic.name}`);

      // Hash de la contraseña
      console.log('🔒 Hashing password...');
      const passwordHash = await bcrypt.hash(password, 12);

      console.log('💾 Creating user with minimal fields...');

      // ✅ CREAR USUARIO CON SOLO CAMPOS BÁSICOS MÍNIMOS
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          passwordHash,
          phone: phone || null,
          primaryClinicId: clinic.id,
          // ✅ SOLO CAMPOS BÁSICOS QUE SEGURAMENTE EXISTEN
          beautyPoints: 100,
          loyaltyTier: 'BRONZE',
          vipStatus: false,
          isActive: true,
          privacyAccepted: true,
          termsAccepted: true
          // ❌ NO INCLUIR CAMPOS QUE PUEDEN NO EXISTIR
        },
        select: {
          // ✅ SOLO SELECCIONAR CAMPOS BÁSICOS
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          beautyPoints: true,
          vipStatus: true,
          loyaltyTier: true,
          primaryClinicId: true
        }
      });

      console.log(`✅ User created: ${user.email}`);

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'patient',
        clinicId: user.primaryClinicId,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log(`✅ Registration successful: ${user.email}`);

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
        message: 'Usuario registrado exitosamente'
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      
      // ✅ MANEJO ESPECÍFICO DE ERRORES PRISMA
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: { 
            message: 'Email ya registrado', 
            code: 'EMAIL_EXISTS',
            field: error.meta?.target?.[0] || 'email'
          }
        });
      }
      
      if (error.code === 'P2025') {
        return res.status(404).json({
          success: false,
          error: { message: 'Clínica no encontrada', code: 'CLINIC_NOT_FOUND' }
        });
      }
      
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error interno del servidor', 
          code: 'INTERNAL_ERROR',
          details: error.message
        }
      });
    }
  }

  // ========================================================================
  // LOGIN SIMPLIFICADO ✅
  // ========================================================================
  static async patientLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      console.log(`🏃‍♀️ Simple login: ${email}`);
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email y contraseña requeridos', code: 'MISSING_FIELDS' }
        });
      }

      // ✅ BUSCAR USUARIO CON CAMPOS BÁSICOS
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
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
          primaryClinicId: true
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }
        });
      }

      // Verificar contraseña
      if (!user.passwordHash || !await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Contraseña incorrecta', code: 'INVALID_CREDENTIALS' }
        });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'patient',
        clinicId: user.primaryClinicId,
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
            role: 'patient',
            beautyPoints: user.beautyPoints,
            vipStatus: user.vipStatus,
            loyaltyTier: user.loyaltyTier,
            primaryClinicId: user.primaryClinicId
          },
          tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
          userType: 'patient'
        },
        message: 'Login exitoso'
      });

    } catch (error) {
      console.error('❌ Login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
      });
    }
  }

  // ========================================================================
  // MÉTODOS BÁSICOS ✅
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
    res.status(501).json({
      success: false,
      error: { message: 'Demo login not implemented yet', code: 'NOT_IMPLEMENTED' }
    });
  }

  static async validateSession(req, res) {
    res.status(200).json({
      success: true,
      data: { authenticated: true },
      message: 'Session validation not fully implemented'
    });
  }

  static async refreshToken(req, res) {
    res.status(501).json({
      success: false,
      error: { message: 'Refresh token not implemented yet', code: 'NOT_IMPLEMENTED' }
    });
  }

  static async logout(req, res) {
    res.status(200).json({
      success: true,
      message: 'Sesión cerrada exitosamente'
    });
  }
}

module.exports = AuthController;