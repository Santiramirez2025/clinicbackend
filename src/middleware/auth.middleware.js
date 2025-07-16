// ============================================================================
// src/middleware/auth.middleware.js - MIDDLEWARE DE AUTENTICACIÓN FINAL ✅
// ============================================================================
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { AppError } = require('../utils/errors');

const prisma = new PrismaClient();

// Verificar token JWT
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de acceso requerido', 401);
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new AppError('Token de acceso requerido', 401);
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    console.log('🔍 Token decodificado:', decoded);

    // ✅ MANEJAR DIFERENTES TIPOS DE TOKENS
    
    // 1. TOKEN DE ADMIN/CLÍNICA
    if (decoded.role === 'admin' && decoded.clinicId) {
      console.log('👑 Token de admin detectado');
      
      const clinic = await prisma.clinic.findUnique({
        where: { id: decoded.clinicId },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionPlan: true
        }
      });

      if (!clinic) {
        throw new AppError('Clínica no encontrada', 401);
      }

      // Crear objeto user compatible con admin
      req.user = {
        id: clinic.id,
        userId: clinic.id,
        email: clinic.email,
        firstName: 'Admin',
        lastName: clinic.name,
        vipStatus: true,
        role: 'admin',
        clinic: clinic
      };
      
      req.clinic = clinic;
      return next();
    }
    
    // 2. USUARIO DEMO
    if (decoded.userId === 'demo-user-123') {
      console.log('🎭 Token demo detectado');
      req.user = { 
        id: decoded.userId, 
        userId: decoded.userId,
        email: 'demo@bellezaestetica.com', 
        firstName: 'María',
        lastName: 'Demo',
        vipStatus: true,
        role: 'demo'
      };
      return next();
    }
    
    // 3. USUARIO NORMAL
    if (decoded.userId) {
      console.log('👤 Token de usuario normal detectado');
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          vipStatus: true
        }
      });

      if (!user) {
        throw new AppError('Usuario no encontrado', 401);
      }

      req.user = {
        ...user,
        userId: user.id,
        role: 'patient'
      };
      return next();
    }
    
    // 4. TOKEN SIN ESTRUCTURA RECONOCIDA
    console.error('❌ Token sin estructura reconocida:', decoded);
    throw new AppError('Token inválido', 401);

  } catch (error) {
    console.error('❌ Error en verifyToken:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expirado', 401));
    }
    next(error);
  }
};

// ✅ Middleware opcional - Para endpoints públicos que pueden usar auth
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // Si no hay token, continuar sin usuario
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }

    // Verificar token si existe
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    // TOKEN DE ADMIN/CLÍNICA
    if (decoded.role === 'admin' && decoded.clinicId) {
      const clinic = await prisma.clinic.findUnique({
        where: { id: decoded.clinicId },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionPlan: true
        }
      });

      req.user = clinic ? {
        id: clinic.id,
        userId: clinic.id,
        email: clinic.email,
        firstName: 'Admin',
        lastName: clinic.name,
        vipStatus: true,
        role: 'admin',
        clinic: clinic
      } : null;
      
      req.clinic = clinic;
      return next();
    }
    
    // Usuario demo
    if (decoded.userId === 'demo-user-123') {
      req.user = { 
        id: decoded.userId, 
        userId: decoded.userId,
        email: 'demo@bellezaestetica.com', 
        firstName: 'María',
        lastName: 'Demo',
        vipStatus: true,
        role: 'demo'
      };
      return next();
    }
    
    // Usuario real
    if (decoded.userId) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          vipStatus: true
        }
      });

      req.user = user ? {
        ...user,
        userId: user.id,
        role: 'patient'
      } : null;
      return next();
    }

    req.user = null;
    next();

  } catch (error) {
    // Si hay error con el token, continuar sin usuario
    console.log('⚠️ Optional auth error (continuing without user):', error.message);
    req.user = null;
    next();
  }
};

// Requerir acceso VIP
const requireVIP = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user) {
      throw new AppError('Autenticación requerida', 401);
    }
    
    // Los admins siempre tienen acceso VIP
    if (user.role === 'admin') {
      return next();
    }
    
    if (!user.vipStatus) {
      // Verificar si tiene suscripción activa en base de datos
      const activeSubscription = await prisma.vipSubscription.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          currentPeriodEnd: { gte: new Date() }
        }
      });

      if (!activeSubscription) {
        throw new AppError('Acceso VIP requerido', 403);
      }

      // Actualizar estado VIP si es necesario
      await prisma.user.update({
        where: { id: user.id },
        data: { vipStatus: true }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ✅ MIDDLEWARE ESPECÍFICO PARA RUTAS DE ADMIN DASHBOARD
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token de administrador requerido' }
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token de administrador requerido' }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    console.log('🔍 Admin token decoded:', decoded);
    
    // ✅ VALIDACIÓN FLEXIBLE DE ADMIN
    const isValidAdmin = decoded.role === 'admin' || 
                        decoded.isAdmin === true ||
                        decoded.clinicId; // Si tiene clinicId, asumimos que es admin
    
    if (!isValidAdmin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Acceso de administrador requerido' }
      });
    }
    
    // ✅ BUSCAR O CREAR CLÍNICA
    let clinic = null;
    
    if (decoded.clinicId) {
      // Admin tiene clínica específica
      clinic = await prisma.clinic.findUnique({
        where: { id: decoded.clinicId },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true
        }
      });
    }
    
    // Si no tiene clínica, crear una por defecto
    if (!clinic) {
      console.log('🏥 Creating/finding default clinic for admin');
      
      clinic = await prisma.clinic.upsert({
        where: { 
          email: decoded.email || 'admin@bellezaestetica.com' 
        },
        update: {},
        create: {
          name: 'Belleza Estética Premium',
          email: decoded.email || 'admin@bellezaestetica.com',
          subscriptionPlan: 'PREMIUM',
          isActive: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          subscriptionPlan: true,
          subscriptionExpiresAt: true
        }
      });
    }

    if (!clinic) {
      return res.status(500).json({
        success: false,
        error: { message: 'Error configurando clínica de administrador' }
      });
    }

    req.clinic = clinic;
    req.user = {
      id: decoded.userId || clinic.id,
      userId: decoded.userId || clinic.id,
      email: decoded.email || clinic.email,
      firstName: 'Admin',
      lastName: clinic.name,
      vipStatus: true,
      role: 'admin',
      clinic: clinic
    };
    
    console.log('✅ Admin autenticado:', clinic.name);
    next();

  } catch (error) {
    console.error('❌ Error en authenticateAdmin:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token inválido' }
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { message: 'Token expirado' }
      });
    }
    
    return res.status(500).json({
      success: false,
      error: { message: 'Error de autenticación de administrador' }
    });
  }
};

// Middleware para clínicas (compatible con el anterior)
const verifyClinicToken = authenticateAdmin;

module.exports = {
  verifyToken,
  optionalAuth,
  requireVIP,
  verifyClinicToken,
  authenticateAdmin
};