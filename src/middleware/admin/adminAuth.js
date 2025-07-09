// ============================================================================
// src/middleware/admin/adminAuth.js - AUTENTICACIÓN ADMIN
// ============================================================================
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Token de administrador requerido' }
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret-key');
    
    // Verificar si es admin de clínica
    const clinic = await prisma.clinic.findUnique({
      where: { id: decoded.clinicId || decoded.userId },
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionPlan: true
      }
    });

    if (!clinic) {
      return res.status(403).json({
        success: false,
        error: { message: 'Acceso de administrador no válido' }
      });
    }

    req.clinic = clinic;
    req.adminId = decoded.userId || decoded.clinicId;
    next();

  } catch (error) {
    console.error('❌ Admin auth error:', error);
    return res.status(403).json({
      success: false,
      error: { message: 'Token de administrador inválido' }
    });
  }
};

const checkSubscription = (requiredPlan = 'FREE') => {
  return (req, res, next) => {
    const planHierarchy = { 'FREE': 0, 'BASIC': 1, 'PREMIUM': 2, 'ENTERPRISE': 3 };
    
    const userPlan = req.clinic?.subscriptionPlan || 'FREE';
    const userLevel = planHierarchy[userPlan] || 0;
    const requiredLevel = planHierarchy[requiredPlan] || 0;

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        success: false,
        error: { 
          message: `Plan ${requiredPlan} requerido para esta funcionalidad`,
          currentPlan: userPlan,
          requiredPlan
        }
      });
    }

    next();
  };
};

module.exports = { authenticateAdmin, checkSubscription };