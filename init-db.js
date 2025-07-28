// init-db.js - Script para inicializar la base de datos
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function initDatabase() {
  console.log('🔄 Inicializando base de datos...');
  
  try {
    // Solo crear directorio de datos para SQLite
    if (process.env.DATABASE_URL.startsWith('file:')) {
      const dataDir = path.join(__dirname, 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('📁 Directorio de datos creado');
      }
      
      const dbPath = path.join(__dirname, 'dev.db');
      console.log('🔍 Verificando ruta de base de datos:', dbPath);
    } else {
      console.log('🔍 Usando base de datos PostgreSQL externa');
    }
    
    // Inicializar Prisma Client
    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    
    // Probar conexión
    await prisma.$connect();
    console.log('✅ Conexión a base de datos establecida');
    
    // Ejecutar migraciones si es necesario
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const migrate = spawn('npx', ['prisma', 'migrate', 'deploy'], {
        stdio: 'inherit',
        env: { ...process.env }
      });
      
      migrate.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Migraciones ejecutadas correctamente');
          resolve(prisma);
        } else {
          console.log('⚠️ No se pudieron ejecutar migraciones, continuando...');
          resolve(prisma);
        }
      });
      
      migrate.on('error', (error) => {
        console.log('⚠️ Error en migraciones:', error.message);
        resolve(prisma);
      });
    });
    
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    
    // ✅ LÓGICA CORREGIDA: Solo modificar URLs SQLite
    if (error.message.includes('protocol')) {
      console.log('🔧 Verificando URL de base de datos...');
      
      // NO modificar URLs PostgreSQL
      if (process.env.DATABASE_URL.startsWith('postgresql://') || 
          process.env.DATABASE_URL.startsWith('postgres://')) {
        console.log('⚠️ Error de conexión PostgreSQL - verificar credenciales');
        throw error; // No modificar URLs PostgreSQL
      }
      
      // Solo añadir 'file:' para SQLite
      if (!process.env.DATABASE_URL.startsWith('file:')) {
        console.log('🔧 Corrigiendo formato para SQLite...');
        process.env.DATABASE_URL = `file:${process.env.DATABASE_URL}`;
        console.log('🔄 Reintentando conexión...');
        return initDatabase();
      }
    }
    
    throw error;
  }
}

module.exports = { initDatabase };