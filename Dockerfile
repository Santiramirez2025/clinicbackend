# ---------- Build stage ----------
  FROM node:18-alpine AS builder

  WORKDIR /usr/src/app
  
  # Instalar herramientas necesarias
  RUN apk add --no-cache curl
  
  # Copiar archivos de dependencias
  COPY package*.json ./
  
  # Copiar schema de Prisma
  COPY prisma ./prisma/
  
  # Instalar TODAS las dependencias (incluyendo dev)
  RUN npm ci
  
  # Copiar todo el código fuente
  COPY . .
  
  # Generar cliente de Prisma
  RUN npx prisma generate
  
  # ---------- Production stage ----------
  FROM node:18-alpine AS production
  
  WORKDIR /usr/src/app
  
  # Instalar herramientas necesarias
  RUN apk add --no-cache curl
  
  # Copiar archivos de dependencias
  COPY package*.json ./
  
  # Copiar schema de Prisma
  COPY prisma ./prisma/
  
  # Instalar solo dependencias de producción
  RUN npm ci --only=production && npm cache clean --force
  
  # Copiar el Prisma Client generado y el código necesario desde el build
  COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
  COPY --from=builder /usr/src/app/prisma ./prisma
  COPY --from=builder /usr/src/app/src ./src
  COPY --from=builder /usr/src/app/app.js ./app.js
  COPY --from=builder /usr/src/app/server.js ./server.js
  
  # Copiar script de entrada
  COPY entrypoint.sh /usr/src/app/entrypoint.sh
  RUN chmod +x /usr/src/app/entrypoint.sh
  
  # Crear usuario sin permisos de root PRIMERO
  RUN addgroup -g 1001 -S nodejs && \
      adduser -S clinic -u 1001 -G nodejs
  
  # Crear directorio para la base de datos SQLite y asignar permisos
  RUN mkdir -p /usr/src/app/data && \
      chown -R clinic:nodejs /usr/src/app && \
      chmod -R 755 /usr/src/app/data && \
      chmod 755 /usr/src/app
  
  # Cambiar a usuario no root
  USER clinic
  
  # Exponer el puerto
  EXPOSE 3000
  
  # Healthcheck opcional (asegúrate de tener endpoint `/health`)
  HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
  
  # Comando de arranque
  ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
  CMD ["node", "server.js"]