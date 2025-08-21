// ============================================================================
// auth.controller.js - ESPECÍFICO PARA RAILWAY PRODUCTION ✅
// ============================================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

// ✅ CONFIGURACIÓN ESPECÍFICA PARA RAILWAY
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

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
  // REGISTER - OPTIMIZADO PARA RAILWAY ✅
  // ========================================================================
  static async register(req, res) {
    let isProduction = process.env.NODE_ENV === 'production';
    
    try {
      const { firstName, lastName, email, password, phone, clinicSlug } = req.body;
      
      if (isProduction) {
        console.log(`📝 Railway register: ${email}`);
      } else {
        console.log('🔥 === RAILWAY REGISTER DEBUG ===');
        console.log('📥 Body:', JSON.stringify(req.body, null, 2));
      }
      
      // Validaciones básicas
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Todos los campos son requeridos', code: 'MISSING_FIELDS' }
        });
      }
      
      // ✅ PASO 1: VERIFICAR USUARIO EXISTENTE (RAILWAY SAFE)
      let existingUser;
      try {
        existingUser = await prisma.$queryRaw`
          SELECT id, email FROM users WHERE email = ${email.toLowerCase()} LIMIT 1
        `;
      } catch (queryError) {
        console.error('❌ Raw query failed, trying Prisma method:', queryError.message);
        
        // Fallback a método Prisma normal
        existingUser = await prisma.user.findFirst({
          where: { email: email.toLowerCase() },
          select: { id: true, email: true }
        });
      }
      
      if (existingUser && existingUser.length > 0) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email ya registrado', code: 'EMAIL_EXISTS' }
        });
      }
      
      // ✅ PASO 2: BUSCAR CLÍNICA (RAILWAY SAFE)
      let clinic;
      try {
        if (clinicSlug) {
          clinic = await prisma.$queryRaw`
            SELECT id, name, slug, city FROM clinics 
            WHERE slug = ${clinicSlug} AND is_active = true 
            LIMIT 1
          `;
          clinic = clinic[0] || null;
        }
        
        if (!clinic) {
          clinic = await prisma.$queryRaw`
            SELECT id, name, slug, city FROM clinics 
            WHERE is_active = true 
            ORDER BY created_at ASC 
            LIMIT 1
          `;
          clinic = clinic[0] || null;
        }
      } catch (clinicError) {
        console.error('❌ Clinic query failed, trying Prisma method:', clinicError.message);
        
        // Fallback a método Prisma normal
        clinic = await prisma.clinic.findFirst({
          where: { isActive: true },
          select: { id: true, name: true, slug: true, city: true },
          orderBy: { createdAt: 'asc' }
        });
      }

      if (!clinic) {
        return res.status(400).json({
          success: false,
          error: { message: 'No hay clínicas disponibles', code: 'NO_CLINICS_AVAILABLE' }
        });
      }

      // ✅ PASO 3: HASH PASSWORD
      const passwordHash = await bcrypt.hash(password, 12);

      // ✅ PASO 4: CREAR USUARIO (RAILWAY SAFE - RAW SQL)
      let user;
      try {
        // Usar SQL raw para máxima compatibilidad con Railway
        const userId = await prisma.$queryRaw`
          INSERT INTO users (
            id, email, password_hash, first_name, last_name, phone, primary_clinic_id,
            beauty_points, loyalty_tier, vip_status, is_active, is_verified, 
            onboarding_completed, privacy_accepted, terms_accepted,
            email_notifications, sms_notifications, marketing_notifications,
            data_processing_consent, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), 
            ${email.toLowerCase()}, 
            ${passwordHash}, 
            ${firstName}, 
            ${lastName}, 
            ${phone || null}, 
            ${clinic.id},
            100,
            'BRONZE',
            false,
            true,
            false,
            false,
            true,
            true,
            true,
            false,
            true,
            true,
            NOW(),
            NOW()
          ) RETURNING id, email, first_name, last_name, phone, beauty_points, vip_status, loyalty_tier, primary_clinic_id
        `;
        
        user = userId[0];
        
      } catch (insertError) {
        console.error('❌ Raw insert failed, trying Prisma method:', insertError.message);
        
        // Fallback a método Prisma normal
        user = await prisma.user.create({
          data: {
            firstName,
            lastName,
            email: email.toLowerCase(),
            passwordHash,
            phone: phone || null,
            primaryClinicId: clinic.id,
            beautyPoints: 100,
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
          select: {
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
      }

      // ✅ PASO 5: GENERAR TOKENS
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'patient',
        clinicId: user.primary_clinic_id || user.primaryClinicId,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      if (isProduction) {
        console.log(`✅ Railway user created: ${user.email}`);
      } else {
        console.log('🎉 Registration completed successfully');
      }

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name || user.firstName,
            lastName: user.last_name || user.lastName,
            name: `${user.first_name || user.firstName} ${user.last_name || user.lastName}`,
            phone: user.phone,
            role: 'patient',
            beautyPoints: user.beauty_points || user.beautyPoints,
            vipStatus: user.vip_status || user.vipStatus,
            loyaltyTier: user.loyalty_tier || user.loyaltyTier,
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
      console.error('❌ Railway registration error:', error);
      
      // ✅ MANEJO ESPECÍFICO DE ERRORES RAILWAY
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
          error: { message: 'Registro no encontrado', code: 'NOT_FOUND' }
        });
      }
      
      // Error genérico para Railway
      res.status(500).json({
        success: false,
        error: { 
          message: 'Error interno del servidor', 
          code: 'INTERNAL_ERROR',
          ...(process.env.NODE_ENV !== 'production' && { 
            details: error.message,
            stack: error.stack 
          })
        }
      });
    }
  }

  // ========================================================================
  // LOGIN SIMPLIFICADO PARA RAILWAY ✅
  // ========================================================================
  static async patientLogin(req, res) {
    try {
      const { email, password, clinicSlug } = req.body;
      
      console.log(`🏃‍♀️ Railway login: ${email}`);
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: { message: 'Email y contraseña requeridos', code: 'MISSING_FIELDS' }
        });
      }

      // ✅ BUSCAR USUARIO CON RAW SQL PARA RAILWAY
      let user;
      try {
        user = await prisma.$queryRaw`
          SELECT 
            id, email, first_name, last_name, phone, password_hash,
            beauty_points, loyalty_tier, vip_status, primary_clinic_id
          FROM users 
          WHERE email = ${email.toLowerCase()} AND is_active = true 
          LIMIT 1
        `;
        user = user[0] || null;
      } catch (queryError) {
        // Fallback a Prisma normal
        user = await prisma.user.findFirst({
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
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }
        });
      }

      // Verificar contraseña
      const passwordField = user.password_hash || user.passwordHash;
      if (!passwordField || !await bcrypt.compare(password, passwordField)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Contraseña incorrecta', code: 'INVALID_CREDENTIALS' }
        });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'patient',
        clinicId: user.primary_clinic_id || user.primaryClinicId,
        userType: 'patient'
      };

      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      console.log(`✅ Railway login successful: ${user.email}`);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name || user.firstName,
            lastName: user.last_name || user.lastName,
            name: `${user.first_name || user.firstName} ${user.last_name || user.lastName}`,
            phone: user.phone,
            role: 'patient',
            beautyPoints: user.beauty_points || user.beautyPoints,
            vipStatus: user.vip_status || user.vipStatus,
            loyaltyTier: user.loyalty_tier || user.loyaltyTier,
            primaryClinicId: user.primary_clinic_id || user.primaryClinicId
          },
          tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
          userType: 'patient'
        },
        message: 'Login exitoso'
      });

    } catch (error) {
      console.error('❌ Railway login error:', error);
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