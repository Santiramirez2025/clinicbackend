// ============================================================================
// src/middleware/auth.middleware.js - MIDDLEWARE DE AUTENTICACIÓN
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Obtener usuario de la base de datos
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

    // Agregar usuario al request
    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expirado', 401));
    }
    next(error);
  }
};

// Requerir acceso VIP
const requireVIP = async (req, res, next) => {
  try {
    const user = req.user;
    
    if (!user.vipStatus) {
      // Verificar si tiene suscripción activa en base de datos
      const activeSubscription = await prisma.vipSubscription.findFirst({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          expiresAt: { gte: new Date() }
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

// Middleware para clínicas (diferente del de usuarios)
const verifyClinicToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de acceso requerido', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar clínica en lugar de usuario
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

    req.clinic = clinic;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expirado', 401));
    }
    next(error);
  }
};

module.exports = {
  verifyToken,
  requireVIP,
  verifyClinicToken
};