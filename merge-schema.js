#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Merging Prisma schemas...');

// Schema base con configuración
const baseConfig = `// ============================================================================
// 🏥 BELLEZA ESTÉTICA - SCHEMA GENERADO AUTOMÁTICAMENTE v4.0
// ============================================================================
// ⚠️  NO EDITAR ESTE ARCHIVO DIRECTAMENTE
// Este archivo se genera automáticamente desde los módulos en /schemas/
// Para hacer cambios, edita los archivos individuales y ejecuta: node merge-schema.js
// ============================================================================

generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

`;

// Lista de archivos en orden de dependencia
const schemaFiles = [
  '01-base.prisma',
  '02-auth.prisma', 
  '03-clinic.prisma',
  '04-medical.prisma',
  '05-booking.prisma',
  '06-payment.prisma',
  '07-marketing.prisma',
  '08-reviews.prisma',
  '09-system.prisma'
];

let mergedContent = baseConfig;

// Procesar cada archivo
schemaFiles.forEach((fileName, index) => {
  const filePath = path.join('prisma', 'schemas', fileName);
  
  if (fs.existsSync(filePath)) {
    console.log(`✅ Procesando: ${fileName}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Limpiar el contenido (remover generator/datasource si existe)
    const cleanContent = content
      .replace(/generator\s+client\s*{[^}]*}/gs, '')
      .replace(/datasource\s+db\s*{[^}]*}/gs, '')
      .trim();
    
    if (cleanContent) {
      mergedContent += `\n// ============================================================================\n`;
      mergedContent += `// 📁 MÓDULO ${index + 1}: ${fileName.replace('.prisma', '').toUpperCase()}\n`;
      mergedContent += `// ============================================================================\n\n`;
      mergedContent += cleanContent + '\n';
    }
  } else {
    console.log(`⚠️  Archivo no encontrado: ${fileName}`);
  }
});

// Escribir el archivo final
const outputPath = path.join('prisma', 'schema.prisma');
fs.writeFileSync(outputPath, mergedContent, 'utf8');

console.log('\n🎉 Schema merged successfully!');
console.log(`📝 Archivo generado: ${outputPath}`);
console.log(`📦 Total módulos: ${schemaFiles.length}`);
console.log('\n🚀 Ahora puedes ejecutar: npx prisma generate');