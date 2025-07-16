// ============================================================================
// server.js - SERVIDOR MEJORADO CON MANEJO DE ERRORES
// ============================================================================
const app = require('./app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Función para iniciar el servidor
const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor...\n');

    // Verificar conexión a la base de datos
    console.log('🔍 Verificando conexión a base de datos...');
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos PostgreSQL');

    // Usar el puerto proporcionado por la plataforma o 3000 por defecto
    const PORT = process.env.PORT || 3000;
    
    // Iniciar servidor
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🎉 ================================');
      console.log('   🚀 SERVIDOR INICIADO EXITOSAMENTE');
      console.log('🎉 ================================');
      console.log(`📡 Puerto: ${PORT}`);
      console.log(`🌐 URL Local: http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Hora de inicio: ${new Date().toLocaleString()}`);
      console.log('================================\n');
      
      console.log('📋 Endpoints de prueba:');
      console.log(`  GET  http://localhost:${PORT}/`);
      console.log(`  GET  http://localhost:${PORT}/health`);
      console.log(`  GET  http://localhost:${PORT}/api`);
      console.log(`  POST http://localhost:${PORT}/api/auth/demo-login`);
      console.log(`  GET  http://localhost:${PORT}/api/dashboard`);
      console.log('\n✨ Listo para recibir requests!\n');
    });

    // Manejo de errores del servidor
    server.on('error', (error) => {
      console.error('❌ Error del servidor:', error);
      if (error.code === 'EADDRINUSE') {
        console.log(`❌ Puerto ${PORT} ya está en uso`);
      }
      process.exit(1);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      console.log(`\n📴 Recibida señal ${signal}. Cerrando servidor...`);
      
      server.close(async () => {
        console.log('🔌 Servidor HTTP cerrado');
        
        try {
          await prisma.$disconnect();
          console.log('🗄️ Conexión a base de datos cerrada');
          console.log('👋 Servidor cerrado correctamente');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error cerrando conexión a base de datos:', error);
          process.exit(1);
        }
      });

      // Forzar cierre después de 10 segundos
      setTimeout(() => {
        console.log('⏰ Forzando cierre del servidor...');
        process.exit(1);
      }, 10000);
    };

    // Manejar señales de cierre
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Manejar errores no capturados
    process.on('uncaughtException', (error) => {
      console.error('💥 Error no capturado:', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 Promise rechazada no manejada:', reason);
      gracefulShutdown('unhandledRejection');
    });

  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Consejos para solucionar problemas de base de datos:');
      console.log('1. Verifica que PostgreSQL esté corriendo');
      console.log('2. Revisa tu DATABASE_URL en .env');
      console.log('3. Ejecuta: npx prisma migrate dev');
    }
    
    process.exit(1);
  }
};

// Verificar variables de entorno críticas
const checkEnvironment = () => {
  const required = ['DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Variables de entorno faltantes:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.log('\n💡 Configura las variables necesarias en tu plataforma de deploy');
    process.exit(1);
  }

  // Advertir sobre variables opcionales pero recomendadas
  const recommended = ['JWT_SECRET', 'NODE_ENV'];
  const missingRecommended = recommended.filter(key => !process.env[key]);
  
  if (missingRecommended.length > 0) {
    console.warn('⚠️  Variables recomendadas no configuradas:');
    missingRecommended.forEach(key => console.warn(`   - ${key}`));
    console.log('');
  }
};

// Inicializar
console.log('🏥 Clinic Backend SaaS - Iniciando...');
checkEnvironment();
startServer();

// ============================================================================
// COMANDOS ÚTILES DE DEPURACIÓN
// ============================================================================
/*
Si tienes problemas, prueba estos comandos:

# Ver qué está usando el puerto 3000
lsof -i :3000

# Matar proceso específico por PID
kill [PID]

# Matar todos los procesos Node.js
pkill -f node

# Verificar procesos corriendo
ps aux | grep node

# Ejecutar en puerto diferente
PORT=3001 npm run dev

# Verificar conexión a base de datos
npx prisma studio

# Verificar migraciones
npx prisma migrate status
*/