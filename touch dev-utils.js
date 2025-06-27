#!/usr/bin/env node
// ============================================================================
// dev-utils.js - UTILIDADES PARA DESARROLLO
// ============================================================================

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

const log = (color, ...args) => console.log(colors[color], ...args, colors.reset);

// Función para verificar puertos ocupados
async function checkPort(port = 3000) {
  try {
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    if (stdout.trim()) {
      const pids = stdout.trim().split('\n');
      log('yellow', `\n🔍 Puerto ${port} está ocupado por:`);
      
      for (const pid of pids) {
        try {
          const { stdout: processInfo } = await execAsync(`ps -p ${pid} -o pid,ppid,command --no-headers`);
          log('cyan', `   PID ${pid}: ${processInfo.trim()}`);
        } catch (error) {
          log('red', `   PID ${pid}: (proceso no encontrado)`);
        }
      }
      
      return pids;
    } else {
      log('green', `✅ Puerto ${port} está disponible`);
      return [];
    }
  } catch (error) {
    log('green', `✅ Puerto ${port} está disponible`);
    return [];
  }
}

// Función para matar procesos en un puerto
async function killPort(port = 3000) {
  try {
    log('yellow', `🔫 Intentando liberar puerto ${port}...`);
    await execAsync(`kill -9 $(lsof -ti:${port})`);
    log('green', `✅ Puerto ${port} liberado`);
  } catch (error) {
    log('cyan', `ℹ️  Puerto ${port} ya estaba libre`);
  }
}

// Función para verificar base de datos
async function checkDatabase() {
  try {
    log('blue', '🔍 Verificando conexión a base de datos...');
    
    // Verificar si Prisma puede conectar
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    log('green', '✅ Conexión a base de datos exitosa');
    
    // Verificar tablas
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    log('cyan', `📊 Tablas encontradas: ${tables.length}`);
    tables.slice(0, 5).forEach(table => {
      log('white', `   - ${table.table_name}`);
    });
    
    if (tables.length > 5) {
      log('white', `   ... y ${tables.length - 5} más`);
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    log('red', '❌ Error conectando a base de datos:');
    log('red', error.message);
    
    log('yellow', '\n💡 Posibles soluciones:');
    log('white', '1. Verifica que PostgreSQL esté corriendo');
    log('white', '2. Revisa tu DATABASE_URL en .env');
    log('white', '3. Ejecuta: npx prisma migrate dev');
    log('white', '4. Ejecuta: npx prisma generate');
  }
}

// Función para verificar variables de entorno
function checkEnvironment() {
  log('blue', '🔍 Verificando variables de entorno...');
  
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET'
  ];
  
  const optional = [
    'PORT',
    'NODE_ENV',
    'SENDGRID_API_KEY',
    'STRIPE_SECRET_KEY',
    'FRONTEND_URL'
  ];
  
  const missing = [];
  const present = [];
  
  required.forEach(key => {
    if (process.env[key]) {
      present.push(key);
    } else {
      missing.push(key);
    }
  });
  
  if (missing.length === 0) {
    log('green', '✅ Todas las variables requeridas están presentes');
  } else {
    log('red', '❌ Variables requeridas faltantes:');
    missing.forEach(key => log('red', `   - ${key}`));
  }
  
  log('cyan', `📋 Variables presentes: ${present.length}`);
  present.forEach(key => {
    const value = process.env[key];
    const preview = key.includes('SECRET') || key.includes('PASSWORD') ? 
      '*'.repeat(8) : 
      value.substring(0, 30) + (value.length > 30 ? '...' : '');
    log('white', `   ✓ ${key}=${preview}`);
  });
  
  const optionalPresent = optional.filter(key => process.env[key]);
  if (optionalPresent.length > 0) {
    log('cyan', `📋 Variables opcionales: ${optionalPresent.length}`);
    optionalPresent.forEach(key => log('white', `   ○ ${key}`));
  }
}

// Función para hacer setup completo
async function fullSetup() {
  log('blue', '🚀 Iniciando setup completo...\n');
  
  try {
    // 1. Verificar entorno
    checkEnvironment();
    
    // 2. Limpiar puerto
    await killPort(3000);
    await killPort(3001);
    
    // 3. Verificar base de datos
    await checkDatabase();
    
    // 4. Generar Prisma client
    log('blue', '🔧 Generando Prisma client...');
    await execAsync('npx prisma generate');
    log('green', '✅ Prisma client generado');
    
    // 5. Verificar migraciones
    log('blue', '🔧 Verificando migraciones...');
    try {
      const { stdout } = await execAsync('npx prisma migrate status');
      if (stdout.includes('Database schema is up to date')) {
        log('green', '✅ Base de datos actualizada');
      } else {
        log('yellow', '⚠️  Migraciones pendientes');
        log('white', 'Ejecuta: npx prisma migrate dev');
      }
    } catch (error) {
      log('yellow', '⚠️  No se pudieron verificar migraciones');
    }
    
    log('green', '\n🎉 Setup completado. Tu servidor debería iniciar correctamente ahora.');
    log('cyan', 'Ejecuta: npm run dev');
    
  } catch (error) {
    log('red', '❌ Error durante el setup:', error.message);
  }
}

// Función para mostrar ayuda
function showHelp() {
  log('cyan', '\n🛠️  DEV UTILS - Utilidades de Desarrollo');
  log('white', '=======================================\n');
  
  log('yellow', 'Comandos disponibles:');
  log('white', '  node dev-utils.js port [3000]     - Verificar puerto ocupado');
  log('white', '  node dev-utils.js kill [3000]     - Liberar puerto');
  log('white', '  node dev-utils.js db              - Verificar base de datos');
  log('white', '  node dev-utils.js env             - Verificar variables de entorno');
  log('white', '  node dev-utils.js setup           - Setup completo');
  log('white', '  node dev-utils.js help            - Mostrar esta ayuda\n');
  
  log('yellow', 'Ejemplos:');
  log('white', '  node dev-utils.js kill 3000       - Matar procesos en puerto 3000');
  log('white', '  node dev-utils.js port 3001       - Verificar puerto 3001');
  log('white', '  node dev-utils.js setup           - Hacer setup completo\n');
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const param = args[1];
  
  switch (command) {
    case 'port':
      await checkPort(param ? parseInt(param) : 3000);
      break;
      
    case 'kill':
      await killPort(param ? parseInt(param) : 3000);
      break;
      
    case 'db':
      await checkDatabase();
      break;
      
    case 'env':
      checkEnvironment();
      break;
      
    case 'setup':
      await fullSetup();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      if (!command) {
        // Ejecutar diagnóstico rápido por defecto
        log('blue', '🏥 Clinic Backend - Diagnóstico Rápido\n');
        await checkPort(3000);
        checkEnvironment();
        log('cyan', '\nPara más opciones: node dev-utils.js help');
      } else {
        log('red', `❌ Comando desconocido: ${command}`);
        showHelp();
      }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(error => {
    log('red', '💥 Error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  checkPort,
  killPort,
  checkDatabase,
  checkEnvironment,
  fullSetup
};