require('dotenv').config();

console.log('🔍 Verificando configuración...\n');

const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter(key => !process.env[key]);

if (missing.length === 0) {
  console.log('✅ Todas las variables requeridas están presentes');
  console.log(`📁 Base de datos: ${process.env.DATABASE_URL}`);
  console.log(`🔑 JWT configurado: ${process.env.JWT_SECRET ? 'SÍ' : 'NO'}`);
  console.log(`🚀 Puerto: ${process.env.PORT || 3000}`);
} else {
  console.log('❌ Variables faltantes:', missing);
}

// Verificar archivo de base de datos
const fs = require('fs');
if (process.env.DATABASE_URL?.includes('file:')) {
  const dbFile = process.env.DATABASE_URL.replace('file:', '');
  if (fs.existsSync(dbFile)) {
    console.log('✅ Archivo de base de datos existe');
  } else {
    console.log('⚠️  Archivo de base de datos no existe (se creará)');
  }
}
