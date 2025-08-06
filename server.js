// ============================================================================
// server.js - SERVIDOR PARA PRODUCCIÓN EN RENDER
// ============================================================================
const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

// Promisificar exec para usar async/await
const execAsync = util.promisify(exec);

let prisma;

// Función para ejecutar migraciones automáticamente
const runMigrations = async () => {
  try {
    console.log('🔄 Ejecutando migraciones de base de datos...');
    
    if (process.env.DATABASE_URL?.startsWith('postgresql')) {
      console.log('📊 Ejecutando migraciones de PostgreSQL...');
      
      // Intentar primero migrate deploy (para producción)
      try {
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
        console.log('✅ Migraciones ejecutadas correctamente');
        if (stdout) console.log('📋 Output:', stdout);
        if (stderr) console.log('⚠️ Warnings:', stderr);
      } catch (deployError) {
        console.log('⚠️ migrate deploy falló, intentando db push...');
        console.log('🔍 Error:', deployError.message);
        
        // Si migrate deploy falla, usar db push como respaldo
        const { stdout: pushStdout, stderr: pushStderr } = await execAsync('npx prisma db push --accept-data-loss');
        console.log('✅ Schema sincronizado con db push');
        if (pushStdout) console.log('📋 Output:', pushStdout);
        if (pushStderr) console.log('⚠️ Warnings:', pushStderr);
      }
    } else {
      console.log('📊 Ejecutando migraciones de SQLite...');
      
      // Para SQLite, usar db push es más confiable
      const { stdout, stderr } = await execAsync('npx prisma db push');
      console.log('✅ Schema de SQLite sincronizado');
      if (stdout) console.log('📋 Output:', stdout);
      if (stderr) console.log('⚠️ Warnings:', stderr);
    }
    
    // Generar cliente Prisma después de migraciones
    console.log('🔄 Generando cliente Prisma...');
    const { stdout: genStdout } = await execAsync('npx prisma generate');
    console.log('✅ Cliente Prisma generado');
    if (genStdout) console.log('📋 Generated:', genStdout);
    
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message);
    
    // Información adicional de debugging
    if (error.code) console.log('🔍 Código de error:', error.code);
    if (error.stdout) console.log('📤 Stdout:', error.stdout);
    if (error.stderr) console.log('📥 Stderr:', error.stderr);
    
    // Dar consejos específicos según el error
    if (error.message.includes('Environment variable not found: DATABASE_URL')) {
      console.log('💡 Asegúrate de que DATABASE_URL esté configurada');
    }
    
    if (error.message.includes('Migration engine error')) {
      console.log('💡 Problema con el motor de migraciones');
      console.log('   - Verifica que la base de datos esté accesible');
      console.log('   - Revisa los permisos de la base de datos');
    }
    
    throw error;
  }
};

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
      // Para PostgreSQL, mantener la URL original sin modificaciones
      console.log('🔍 Usando DATABASE_URL:', dbUrl.substring(0, 30) + '...');
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
      
      // Solo actualizar variable de entorno para SQLite
      process.env.DATABASE_URL = dbUrl;
      console.log('🔍 Usando DATABASE_URL:', dbUrl);
    }
    
    // Ejecutar migraciones ANTES de inicializar Prisma Client
    await runMigrations();
    
    // Inicializar Prisma Client
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    
    // Probar conexión
    await prisma.$connect();
    console.log('✅ Conectado a la base de datos exitosamente');
    
    // Verificar que las tablas existan haciendo una consulta simple
    try {
      // Intentar contar usuarios (ajusta según tu schema)
      const userCount = await prisma.user?.count() || 0;
      console.log(`👥 Usuarios en la base de datos: ${userCount}`);
    } catch (queryError) {
      console.log('⚠️ No se pudo consultar la tabla de usuarios:', queryError.message);
      console.log('💡 Esto puede ser normal si es la primera vez que se ejecuta');
    }
    
    return prisma;
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error.message);
    
    // Solo manejar errores de permisos para SQLite
    if (error.message.includes('permission') || error.message.includes('EACCES')) {
      console.log('🔧 Error de permisos detectado, verificando directorio...');
      try {
        const dbPath = path.dirname(process.env.DATABASE_URL.replace('file:', ''));
        if (fs.existsSync(dbPath)) {
          fs.chmodSync(dbPath, 0o755);
          console.log('✅ Permisos de directorio corregidos');
          return initDatabase();
        }
      } catch (chmodError) {
        console.log('⚠️ No se pudieron corregir permisos:', chmodError.message);
      }
    }
    
    // Para errores de conexión a PostgreSQL, dar consejos útiles
    if (error.code === 'P1001') {
      console.log('\n💡 Error de conexión a PostgreSQL:');
      console.log('1. Verifica que la base de datos esté activa en Render');
      console.log('2. Revisa que DATABASE_URL sea correcta');
      console.log('3. Asegúrate de que la DB esté en la misma región');
      console.log('4. Confirma que el puerto 5432 esté en la URL');
    }
    
    // Para errores de validación de schema
    if (error.code === 'P1012') {
      console.log('\n💡 Error de validación de schema:');
      console.log('1. Verifica que DATABASE_URL tenga el formato correcto');
      console.log('2. Para PostgreSQL: postgresql://user:pass@host:port/db');
      console.log('3. Para SQLite: file:./database.db');
    }
    
    throw error;
  }
};

// Función para iniciar el servidor
const startServer = async () => {
  try {
    console.log('🚀 Iniciando servidor...\n');

    // Inicializar base de datos (incluye migraciones automáticas)
    console.log('🔍 Verificando conexión a base de datos...');
    await initDatabase();
    console.log('✅ Base de datos inicializada correctamente');

    // Usar el puerto proporcionado por Render
    const PORT = process.env.PORT || 3000;
    
    // Determinar tipo de base de datos para logging
    const dbType = process.env.DATABASE_URL?.startsWith('postgresql') ? 'PostgreSQL' : 'SQLite';
    
    // Iniciar servidor
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🎉 ================================');
      console.log('   🚀 SERVIDOR INICIADO EXITOSAMENTE');
      console.log('🎉 ================================');
      console.log(`📡 Puerto: ${PORT}`);
      console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️ Base de datos: ${dbType}`);
      console.log(`⏰ Hora de inicio: ${new Date().toLocaleString()}`);
      console.log('================================\n');
      
      if (process.env.NODE_ENV !== 'production') {
        console.log('📋 Endpoints disponibles:');
        console.log(`  GET  /health`);
        console.log(`  GET  /api`);
        console.log(`  POST /api/auth/demo-login`);
        console.log(`  GET  /api/dashboard`);
        console.log('\n✨ Listo para recibir requests!\n');
      }
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
      console.log('\n💡 Problema con el schema de la base de datos');
      console.log('1. Ejecuta: npx prisma db push');
      console.log('2. Verifica que el schema.prisma sea válido');
    }
    
    if (error.code === 'P1001') {
      console.log('\n💡 No se puede conectar a la base de datos');
      console.log('1. Verifica que DATABASE_URL sea correcta');
      console.log('2. Asegúrate de que la DB esté activa');
      console.log('3. Revisa la configuración de red');
    }
    
    if (error.message.includes('Migration')) {
      console.log('\n💡 Error en migraciones automáticas');
      console.log('1. Verifica que el schema.prisma sea válido');
      console.log('2. Revisa los logs de las migraciones arriba');
      console.log('3. Considera ejecutar manualmente: npx prisma db push');
    }
    
    process.exit(1);
  }
};

// Verificar variables de entorno críticas
const checkEnvironment = () => {
  if (process.env.NODE_ENV === 'production') {
    const required = ['DATABASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('❌ Variables de entorno faltantes para producción:');
      missing.forEach(key => console.error(`   - ${key}`));
      process.exit(1);
    }
  }

  // Variables recomendadas
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
