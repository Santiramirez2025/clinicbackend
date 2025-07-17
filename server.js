// ============================================================================
// server.js - SERVIDOR MEJORADO CON MANEJO DE ERRORES PARA SQLITE
// ============================================================================
const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

let prisma;

// Función para inicializar la base de datos SQLite
const initDatabase = async () => {
  try {
    console.log('🔄 Inicializando base de datos SQLite...');
    
    // Crear directorio de datos si no existe
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('📁 Directorio de datos creado');
    }
    
    // Verificar y corregir DATABASE_URL si es necesario
    let dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      dbUrl = 'file:./dev.db';
      console.log('⚠️ DATABASE_URL no encontrada, usando valor por defecto');
    }
    
    // Asegurar que la URL tiene el prefijo correcto para SQLite
    if (!dbUrl.startsWith('file:')) {
      dbUrl = `file:${dbUrl}`;
      console.log('🔧 Corrigiendo formato de DATABASE_URL para SQLite');
    }
    
    // Actualizar variable de entorno
    process.env.DATABASE_URL = dbUrl;
    
    console.log('🔍 Usando DATABASE_URL:', dbUrl);
    
    // Inicializar Prisma Client
    prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: dbUrl
        }
      }
    });
    
    // Probar conexión
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos SQLite');
    
    return prisma;
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    
    // Intentos de recuperación para errores comunes
    if (error.message.includes('protocol')) {
      console.log('🔧 Intentando corregir URL de base de datos...');
      process.env.DATABASE_URL = `file:${process.env.DATABASE_URL.replace('file:', '')}`;
      return initDatabase();
    }
    
    if (error.message.includes('permission') || error.message.includes('EACCES')) {
      console.log('🔧 Error de permisos detectado, verificando directorio...');
      const dbPath = path.dirname(process.env.DATABASE_URL.replace('file:', ''));
      try {
        fs.chmodSync(dbPath, 0o755);
        console.log('✅ Permisos de directorio corregidos');
        return initDatabase();
      } catch (chmodError) {
        console.log('⚠️ No se pudieron corregir permisos:', chmodError.message);
      }
    }
    
    throw error;
  }
};

// Función para iniciar el servidor
const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor...\n');

    // Inicializar base de datos SQLite
    console.log('🔍 Verificando conexión a base de datos...');
    await initDatabase();
    console.log('✅ Base de datos SQLite inicializada correctamente');

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
      console.log(`🗄️ Base de datos: SQLite`);
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
          if (prisma) {
            await prisma.$disconnect();
            console.log('🗄️ Conexión a base de datos cerrada');
          }
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
    
    if (error.code === 'P1012') {
      console.log('\n💡 Consejos para solucionar problemas de SQLite:');
      console.log('1. Verifica que DATABASE_URL tenga formato: file:./dev.db');
      console.log('2. Asegúrate de que el directorio tenga permisos de escritura');
      console.log('3. Ejecuta: npx prisma migrate dev');
      console.log('4. Verifica que no haya otros procesos usando la base de datos');
    }
    
    if (error.code === 'P1001') {
      console.log('\n💡 Consejos para solucionar problemas de conexión:');
      console.log('1. Verifica que la ruta de la base de datos sea accesible');
      console.log('2. Revisa permisos del directorio');
      console.log('3. Asegúrate de que el archivo no esté siendo usado por otro proceso');
    }
    
    process.exit(1);
  }
};

// Verificar variables de entorno críticas
const checkEnvironment = () => {
  // Para SQLite, DATABASE_URL es opcional (usaremos valor por defecto)
  const recommended = ['DATABASE_URL'];
  const missing = recommended.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn('⚠️  Variables recomendadas no configuradas:');
    missing.forEach(key => console.warn(`   - ${key} (se usará valor por defecto)`));
    console.log('');
  }

  // Advertir sobre variables opcionales pero recomendadas
  const optional = ['JWT_SECRET', 'NODE_ENV'];
  const missingOptional = optional.filter(key => !process.env[key]);
  
  if (missingOptional.length > 0) {
    console.warn('⚠️  Variables opcionales no configuradas:');
    missingOptional.forEach(key => console.warn(`   - ${key}`));
    console.log('');
  }
};

// Inicializar
console.log('🏥 Clinic Backend SaaS - Iniciando...');
checkEnvironment();
startServer();

// ============================================================================
// COMANDOS ÚTILES DE DEPURACIÓN PARA SQLITE
// ============================================================================
/*
Si tienes problemas con SQLite, prueba estos comandos:

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

# Verificar base de datos SQLite
npx prisma studio

# Verificar migraciones
npx prisma migrate status

# Resetear base de datos SQLite
npx prisma migrate reset

# Verificar permisos del directorio
ls -la ./data/

# Verificar archivo de base de datos
file ./dev.db

# Verificar contenido de la base de datos
sqlite3 ./dev.db ".tables"
*/