#!/bin/sh

# Create data directory if it doesn't exist
mkdir -p /usr/src/app/data

# Set proper permissions
chmod 755 /usr/src/app/data

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Start the application
exec "$@"
