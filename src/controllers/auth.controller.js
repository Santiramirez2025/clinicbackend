// ============================================================================
// auth.controller.js - ESPECÍFICO PARA RAILWAY PRODUCTION ✅ CORREGIDO
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
// DATOS SEED PARA PRODUCCIÓN
// ============================================================================
const ensureSeedData = async () => {
  try {
    console.log('🌱 Ensuring seed data exists...');
    
    // ✅ VERIFICAR SI EXISTE CLÍNICA
    let clinic = await prisma.clinic.findFirst({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    
    if (!clinic) {
      console.log('🏥 Creating default clinic...');
      clinic = await prisma.clinic.create({
        data: {
          name: 'Belleza Estética Madrid',
          slug: 'belleza-madrid',
          email: 'info@bellezamadrid.com',
          passwordHash: await bcrypt.hash('admin123', 12),
          phone: '+34 91 555 0123',
          address: 'Calle Gran Vía, 28, Madrid',
          city: 'Madrid',
          postalCode: '28013',
          country: 'ES',
          timezone: 'Europe/Madrid',
          businessHours: JSON.stringify({
            monday: { open: '09:00', close: '20:00', enabled: true },
            tuesday: { open: '09:00', close: '20:00', enabled: true },
            wednesday: { open: '09:00', close: '20:00', enabled: true },
            thursday: { open: '09:00', close: '20:00', enabled: true },
            friday: { open: '09:00', close: '20:00', enabled: true },
            saturday: { open: '10:00', close: '18:00', enabled: true },
            sunday: { open: '10:00', close: '16:00', enabled: false }
          }),
          isActive: true,
          isVerified: true,
          emailVerified: true,
          onboardingCompleted: true
        },
        select: { id: true, name: true }
      });
      console.log(`✅ Default clinic created: ${clinic.name}`);
    }
    
    // ✅ VERIFICAR SI EXISTE PROFESIONAL
    let professional = await prisma.professional.findFirst({
      where: { clinicId: clinic.id, isActive: true },
      select: { id: true, email: true }
    });
    
    if (!professional) {
      console.log('👨‍⚕️ Creating default professional...');
      professional = await prisma.professional.create({
        data: {
          clinicId: clinic.id,
          email: 'doctor@bellezamadrid.com',
          passwordHash: await bcrypt.hash('doctor123', 12),
          firstName: 'Dr. María',
          lastName: 'García',
          phone: '+34 91 555 0124',
          licenseNumber: 'COL123456',
          specialties: JSON.stringify(['Medicina Estética', 'Dermatología']),
          experience: 10,
          bio: 'Especialista en medicina estética con más de 10 años de experiencia.',
          languages: JSON.stringify(['es', 'en']),
          hourlyRate: 150.00,
          isActive: true,
          isVerified: true,
          emailVerified: true,
          onboardingCompleted: true
        },
        select: { id: true, email: true }
      });
      console.log(`✅ Default professional created: ${professional.email}`);
    }
    
    console.log('✅ Seed data verification completed');
    return { clinic, professional };
    
  } catch (error) {
    console.error('❌ Error creating seed data:', error);
    throw error;
  }
};

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
  // REGISTER - CORREGIDO PARA CAMPO ALLERGIES ✅
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
      
      // ✅ PASO 1: ASEGURAR DATOS SEED
      const { clinic } = await ensureSeedData();
      
      // ✅ PASO 2: VERIFICAR USUARIO EXISTENTE
      const existingUser = await prisma.user.findFirst({
        where: { 
          email: email.toLowerCase() 
        },
        select: { 
          id: true, 
          email: true 
        }
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: { message: 'Email ya registrado', code: 'EMAIL_EXISTS' }
        });
      }
      
      // ✅ PASO 3: BUSCAR CLÍNICA ESPECÍFICA SI SE PROPORCIONA
      let targetClinic = clinic;
      if (clinicSlug) {
        const specificClinic = await prisma.clinic.findFirst({
          where: { 
            slug: clinicSlug, 
            isActive: true 
          },
          select: { 
            id: true, 
            name: true, 
            slug: true, 
            city: true 
          }
        });
        
        if (specificClinic) {
          targetClinic = specificClinic;
        }
      }

      // ✅ PASO 4: HASH PASSWORD
      const passwordHash = await bcrypt.hash(password, 12);

      // ✅ PASO 5: CREAR USUARIO (CORREGIDO - SIN CAMPO ALLERGIES)
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          passwordHash,
          phone: phone || null,
          primaryClinicId: targetClinic.id,
          
          // ✅ CAMPOS MÉDICOS CORREGIDOS
          hasAllergies: false,
          allergyDetails: null,
          hasMedicalConditions: false,
          medicalDetails: null,
          takingMedications: false,
          medicationDetails: null,
          
          // Configuración por defecto
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
          dataProcessingConsent: true,
          gdprAcceptedAt: new Date()
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
          primaryClinicId: true,
          hasAllergies: true,
          hasMedicalConditions: true
        }
      });

      // ✅ PASO 6: GENERAR TOKENS
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'CLIENT',
        clinicId: user.primaryClinicId,
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
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone,
            role: 'CLIENT',
            beautyPoints: user.beautyPoints,
            vipStatus: user.vipStatus,
            loyaltyTier: user.loyaltyTier,
            hasAllergies: user.hasAllergies,
            hasMedicalConditions: user.hasMedicalConditions,
            clinic: {
              id: targetClinic.id,
              name: targetClinic.name,
              slug: targetClinic.slug,
              city: targetClinic.city
            }
          },
          tokens: { 
            accessToken, 
            refreshToken, 
            tokenType: 'Bearer', 
            expiresIn: '24h' 
          },
          userType: 'patient'
        },
        message: 'Usuario registrado exitosamente'
      });

    } catch (error) {
      console.error('❌ Registration error:', error);
      
      // ✅ MANEJO ESPECÍFICO DE ERRORES
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
      
      // Error genérico
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
  // LOGIN PACIENTES ✅
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

      // ✅ BUSCAR USUARIO
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
          primaryClinicId: true,
          hasAllergies: true,
          hasMedicalConditions: true
        }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: { message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }
        });
      }

      // Verificar contraseña
      if (!await bcrypt.compare(password, user.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Contraseña incorrecta', code: 'INVALID_CREDENTIALS' }
        });
      }

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: 'CLIENT',
        clinicId: user.primaryClinicId,
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
            firstName: user.firstName,
            lastName: user.lastName,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone,
            role: 'CLIENT',
            beautyPoints: user.beautyPoints,
            vipStatus: user.vipStatus,
            loyaltyTier: user.loyaltyTier,
            primaryClinicId: user.primaryClinicId,
            hasAllergies: user.hasAllergies,
            hasMedicalConditions: user.hasMedicalConditions
          },
          tokens: { 
            accessToken, 
            refreshToken, 
            tokenType: 'Bearer', 
            expiresIn: '24h' 
          },
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
  // MÉTODOS ADICIONALES ✅
  // ========================================================================
  static async professionalLogin(req, res) {
    try {
      const { email, password } = req.body;
      
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
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              slug: true,
              city: true
            }
          }
        }
      });

      if (!professional || !await bcrypt.compare(password, professional.passwordHash)) {
        return res.status(401).json({
          success: false,
          error: { message: 'Credenciales inválidas', code: 'INVALID_CREDENTIALS' }
        });
      }

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
            role: professional.role,
            clinic: professional.clinic
          },
          tokens: { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: '24h' },
          userType: 'professional'
        },
        message: 'Login profesional exitoso'
      });

    } catch (error) {
      console.error('❌ Professional login error:', error);
      res.status(500).json({
        success: false,
        error: { message: 'Error interno del servidor', code: 'INTERNAL_ERROR' }
      });
    }
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