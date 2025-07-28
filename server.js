// ============================================================================
// server.js - SERVIDOR MEJORADO CON SOPORTE POSTGRESQL Y SQLITE
// ============================================================================
const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

let prisma;

// Función para inicializar la base de datos
const initDatabase = async () => {
  try {
    console.log('🔄 Inicializando base de datos...');
    
    // Verificar y configurar DATABASE_URL
    let dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      dbUrl = 'file:./dev.db';
      console.log('⚠️ DATABASE_URL no encontrada, usando SQLite por defecto');
    }
    
    // Determinar tipo de base de datos y configurar URL
    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
      console.log('🔄 Usando PostgreSQL...');
      // No modificar dbUrl para PostgreSQL
    } else {
      console.log('🔄 Usando SQLite...');
      
      // Crear directorio de datos si no existe (solo para SQLite)
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('📁 Directorio de datos creado');
      }
      
      // Asegurar prefijo file: para SQLite
      if (!dbUrl.startsWith('file:')) {
        dbUrl = `file:${dbUrl}`;
        console.log('🔧 Corrigiendo formato para SQLite');
      }
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
    console.log('✅ Conectado a la base de datos exitosamente');
    
    return prisma;
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    
    // Intentos de recuperación para errores comunes
    if (error.message.includes('protocol')) {
      console.log('🔧 Intentando corregir URL de base de datos...');
      const currentUrl = process.env.DATABASE_URL;
      if (currentUrl.includes('postgresql://') || currentUrl.includes('postgres://')) {
        // Para PostgreSQL, no agregar prefijo file:
        process.env.DATABASE_URL = currentUrl.replace('file:', '');
      } else {
        // Para SQLite, asegurar prefijo file:
        process.env.DATABASE_URL = `file:${currentUrl.replace('file:', '')}`;
      }
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

    // Inicializar base de datos
    console.log('🔍 Verificando conexión a base de datos...');
    await initDatabase();
    console.log('✅ Base de datos inicializada correctamente');

    // Usar el puerto proporcionado por la plataforma o 3000 por defecto
    const PORT = process.env.PORT || 3000;
    
    // Determinar tipo de base de datos para logging
    const dbType = process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 'SQLite';
    
    // Iniciar servidor
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🎉 ================================');
      console.log('   🚀 SERVIDOR INICIADO EXITOSAMENTE');
      console.log('🎉 ================================');
      console.log(`📡 Puerto: ${PORT}`);
      console.log(`🌐 URL Local: http://localhost:${PORT}`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ Base de datos: ${dbType}`);
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
      console.log('\n💡 Consejos para solucionar problemas de base de datos:');
      console.log('1. Verifica que DATABASE_URL tenga el formato correcto');
      console.log('2. Para SQLite: file:./dev.db');
      console.log('3. Para PostgreSQL: postgresql://user:pass@host:port/db');
      console.log('4. Ejecuta: npx prisma migrate dev');
      console.log('5. Verifica que no haya otros procesos usando la base de datos');
    }
    
    if (error.code === 'P1001') {
      console.log('\n💡 Consejos para solucionar problemas de conexión:');
      console.log('1. Verifica que la ruta de la base de datos sea accesible');
      console.log('2. Revisa permisos del directorio (SQLite)');
      console.log('3. Verifica credenciales de conexión (PostgreSQL)');
      console.log('4. Asegúrate de que el servidor esté disponible');
    }
    
    process.exit(1);
  }
};

// Verificar variables de entorno críticas
const checkEnvironment = () => {
  // DATABASE_URL es opcional (usaremos valor por defecto para SQLite)
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

# Verificar base de datos
npx prisma studio

# Verificar migraciones
npx prisma migrate status

# Para SQLite - Resetear base de datos
npx prisma migrate reset

# Para PostgreSQL - Aplicar schema
npx prisma db push

# Verificar permisos del directorio (SQLite)
ls -la ./data/

# Verificar archivo de base de datos (SQLite)
file ./dev.db

# Verificar contenido de la base de datos (SQLite)
sqlite3 ./dev.db ".tables"
*/