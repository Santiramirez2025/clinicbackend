FROM node:18-alpine

# Crear directorio de la app
WORKDIR /usr/src/app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Generar Prisma client
RUN npx prisma generate

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S clinic -u 1001

# Cambiar ownership
RUN chown -R clinic:nodejs /usr/src/app
USER clinic

# Exponer puerto
EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Comando de inicio
CMD ["node", "server.js"]