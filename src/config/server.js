// ============================================================================
// src/config/server.js - CONFIGURACIÓN DEL SERVIDOR ✅
// ============================================================================

// ============================================================================
// ERROR HANDLING ✅
// ============================================================================
const setupErrorHandling = (app) => {
    // 404 Handler
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Endpoint no encontrado',
          path: req.originalUrl,
          method: req.method
        },
        availableEndpoints: {
          health: '/health',
          auth: '/api/auth/*',
          dashboard: '/api/dashboard',
          beautyPoints: '/api/beauty-points',
          vip: '/api/vip/*',
          appointments: '/api/appointments',
          profile: '/api/profile',
          admin: '/api/admin/*'
        }
      });
    });
  
    // Global Error Handler
    app.use((err, req, res, next) => {
      console.error('❌ Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.userId || 'anonymous'
      });
      
      res.status(err.statusCode || 500).json({
        success: false,
        error: {
          message: err.message || 'Error interno del servidor',
          code: err.code || 'INTERNAL_ERROR',
          ...(process.env.NODE_ENV === 'development' && { 
            stack: err.stack
          })
        }
      });
    });
  };
  
  // ============================================================================
  // GRACEFUL SHUTDOWN ✅
  // ============================================================================
  const gracefulShutdown = (prisma) => {
    const shutdown = async (signal) => {
      console.log(`\n📡 Recibida señal ${signal}. Iniciando cierre graceful...`);
      
      try {
        console.log('🔌 Cerrando conexión a base de datos...');
        await prisma.$disconnect();
        console.log('✅ Conexión a base de datos cerrada');
        
        console.log('🎉 Cierre graceful completado');
        process.exit(0);
        
      } catch (error) {
        console.error('❌ Error durante cierre graceful:', error);
        process.exit(1);
      }
    };
  
    // Signal handlers
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  
    // Error handlers
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    });
  
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });
  };
  
  module.exports = {
    setupErrorHandling,
    gracefulShutdown
  };