// ============================================================================
// src/config/database.js - CONFIGURACIÓN DE BASE DE DATOS
// ============================================================================
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  errorFormat: 'pretty',
});

// Middleware para soft deletes (si lo implementas)
prisma.$use(async (params, next) => {
  // Interceptar operaciones de eliminación para soft delete
  if (params.action === 'delete') {
    params.action = 'update';
    params.args['data'] = { deletedAt: new Date() };
  }
  
  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    if (params.args.data != undefined) {
      params.args.data['deletedAt'] = new Date();
    } else {
      params.args['data'] = { deletedAt: new Date() };
    }
  }
  
  return next(params);
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;