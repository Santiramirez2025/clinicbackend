// ============================================================================
// src/services/notification.service.js - SERVICIO DE NOTIFICACIONES MEJORADO
// ============================================================================

const EmailService = require('./email.service');

class NotificationService {
  
  // ========================================================================
  // PUSH NOTIFICATIONS
  // ========================================================================
  
  /**
   * Envía notificación push a un usuario específico
   * @param {string} userId - ID del usuario
   * @param {string} title - Título de la notificación
   * @param {string} message - Mensaje de la notificación
   * @param {object} data - Datos adicionales
   * @returns {Promise<object>} Resultado del envío
   */
  static async sendPushNotification(userId, title, message, data = {}) {
    try {
      const notification = {
        userId,
        title,
        message,
        data,
        timestamp: new Date().toISOString(),
        type: data.type || 'general'
      };

      // En desarrollo, mostrar en consola con formato mejorado
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n📱 PUSH NOTIFICATION ENVIADA');
        console.log('================================');
        console.log(`👤 Usuario: ${userId}`);
        console.log(`📢 Título: ${title}`);
        console.log(`💬 Mensaje: ${message}`);
        console.log(`🏷️ Tipo: ${data.type || 'general'}`);
        console.log(`⏰ Timestamp: ${notification.timestamp}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 Data extra:`, JSON.stringify(data, null, 2));
        }
        console.log('================================\n');
      }

      // En producción, aquí integrarías con Firebase Cloud Messaging
      if (process.env.NODE_ENV === 'production' && process.env.FCM_SERVER_KEY) {
        // Simulación de envío a FCM
        const fcmResult = await this.sendToFirebase(userId, notification);
        return fcmResult;
      }

      // Simular envío exitoso
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        messageId,
        userId,
        title,
        message,
        timestamp: notification.timestamp,
        platform: 'development'
      };

    } catch (error) {
      console.error('❌ Error enviando push notification:', error.message);
      return {
        success: false,
        error: error.message,
        userId,
        title,
        message
      };
    }
  }

  /**
   * Simulación de envío a Firebase (para producción)
   */
  static async sendToFirebase(userId, notification) {
    // En producción real, aquí usarías el SDK de Firebase Admin
    console.log(`🚀 Enviando a Firebase para usuario: ${userId}`);
    
    // Simular latencia de red
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      success: true,
      messageId: `fcm_${Date.now()}`,
      platform: 'firebase',
      ...notification
    };
  }

  // ========================================================================
  // RECORDATORIOS DE CITAS
  // ========================================================================

  /**
   * Programa recordatorio de cita
   * @param {object} appointment - Objeto de la cita
   * @returns {Promise<object>} Resultado de la programación
   */
  static async scheduleAppointmentReminder(appointment) {
    try {
      const appointmentDate = new Date(appointment.scheduledDate);
      const reminderTime = new Date(appointmentDate);
      reminderTime.setDate(reminderTime.getDate() - 1); // 24 horas antes
      
      const now = new Date();
      const timeUntilReminder = reminderTime.getTime() - now.getTime();
      
      const reminderInfo = {
        appointmentId: appointment.id,
        userId: appointment.userId || appointment.user?.id,
        reminderTime: reminderTime.toISOString(),
        appointmentDate: appointmentDate.toISOString(),
        treatmentName: appointment.treatment?.name || 'Tratamiento',
        userName: appointment.user?.firstName || 'Cliente',
        timeUntilReminder: Math.max(0, timeUntilReminder),
        status: timeUntilReminder > 0 ? 'scheduled' : 'expired'
      };

      console.log('\n⏰ RECORDATORIO DE CITA PROGRAMADO');
      console.log('===================================');
      console.log(`📅 Cita: ${reminderInfo.treatmentName}`);
      console.log(`👤 Cliente: ${reminderInfo.userName}`);
      console.log(`⏰ Recordatorio para: ${reminderTime.toLocaleString('es-AR')}`);
      console.log(`📍 Fecha de cita: ${appointmentDate.toLocaleString('es-AR')}`);
      console.log(`⏳ Tiempo hasta recordatorio: ${Math.round(timeUntilReminder / (1000 * 60 * 60))} horas`);
      console.log(`📊 Estado: ${reminderInfo.status}`);
      console.log('===================================\n');

      // En desarrollo, simular el recordatorio si es dentro de 5 minutos
      if (timeUntilReminder > 0 && timeUntilReminder <= 5 * 60 * 1000) {
        console.log('🔔 Simulando recordatorio inmediato (desarrollo)...');
        setTimeout(async () => {
          await this.sendAppointmentReminder(appointment);
        }, 2000); // Enviar en 2 segundos para testing
      }

      // En producción, aquí programarías con cron jobs o bull queue
      if (process.env.NODE_ENV === 'production') {
        // Ejemplo: await this.scheduleWithCron(reminderTime, appointment);
        console.log('📋 Recordatorio programado en sistema de colas de producción');
      }

      return {
        scheduled: true,
        ...reminderInfo
      };

    } catch (error) {
      console.error('❌ Error programando recordatorio:', error.message);
      return {
        scheduled: false,
        error: error.message,
        appointmentId: appointment.id
      };
    }
  }

  /**
   * Envía recordatorio de cita (ejecutado por el scheduler)
   */
  static async sendAppointmentReminder(appointment) {
    try {
      const userId = appointment.userId || appointment.user?.id;
      const treatmentName = appointment.treatment?.name || 'Tratamiento';
      const userName = appointment.user?.firstName || 'Cliente';
      
      // Enviar push notification
      await this.sendPushNotification(
        userId,
        '⏰ Recordatorio de Cita',
        `Hola ${userName}, tienes una cita mañana: ${treatmentName}`,
        {
          type: 'appointment_reminder',
          appointmentId: appointment.id,
          treatmentName,
          scheduledDate: appointment.scheduledDate,
          scheduledTime: appointment.scheduledTime
        }
      );

      // Enviar email recordatorio
      await EmailService.sendAppointmentReminder(appointment);

      console.log(`✅ Recordatorio enviado para cita: ${treatmentName} - ${userName}`);
      
      return {
        success: true,
        appointmentId: appointment.id,
        userId,
        channels: ['push', 'email']
      };

    } catch (error) {
      console.error('❌ Error enviando recordatorio:', error.message);
      return {
        success: false,
        error: error.message,
        appointmentId: appointment.id
      };
    }
  }

  // ========================================================================
  // TIPS DE BIENESTAR
  // ========================================================================

  /**
   * Envía tip de bienestar aleatorio
   * @param {string} userId - ID del usuario
   * @param {string} skinType - Tipo de piel (opcional)
   * @returns {Promise<object>} Resultado del envío
   */
  static async sendWellnessTip(userId, skinType = null) {
    try {
      const tips = this.getWellnessTips(skinType);
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      
      const result = await this.sendPushNotification(
        userId,
        '🌿 Tip de belleza del día',
        randomTip.message,
        {
          type: 'wellness_tip',
          category: randomTip.category,
          skinType,
          tipId: randomTip.id
        }
      );

      return {
        ...result,
        tip: randomTip
      };

    } catch (error) {
      console.error('❌ Error enviando tip de bienestar:', error.message);
      return {
        success: false,
        error: error.message,
        userId
      };
    }
  }

  /**
   * Obtiene tips de bienestar, opcionalmente filtrados por tipo de piel
   */
  static getWellnessTips(skinType = null) {
    const allTips = [
      {
        id: 'hydration_1',
        message: 'Bebe al menos 8 vasos de agua al día para mantener tu piel hidratada 💧',
        category: 'hydration',
        skinTypes: ['all']
      },
      {
        id: 'sun_protection_1',
        message: 'Aplica protector solar todos los días, ¡incluso en días nublados! ☀️',
        category: 'protection',
        skinTypes: ['all']
      },
      {
        id: 'sleep_1',
        message: 'Duerme 7-8 horas para que tu piel se regenere naturalmente 😴',
        category: 'rest',
        skinTypes: ['all']
      },
      {
        id: 'nutrition_1',
        message: 'Come frutas ricas en antioxidantes como berries y naranjas 🍓',
        category: 'nutrition',
        skinTypes: ['all']
      },
      {
        id: 'cleansing_1',
        message: 'Limpia tu rostro suavemente dos veces al día 🧼',
        category: 'cleansing',
        skinTypes: ['all']
      },
      {
        id: 'oily_specific_1',
        message: 'Para piel grasa: usa productos oil-free y evita sobre-limpiar 🫧',
        category: 'cleansing',
        skinTypes: ['OILY', 'MIXED']
      },
      {
        id: 'dry_specific_1',
        message: 'Para piel seca: aplica crema hidratante mientras tu piel está húmeda 🧴',
        category: 'hydration',
        skinTypes: ['DRY']
      },
      {
        id: 'sensitive_specific_1',
        message: 'Para piel sensible: usa productos sin fragancia y testa siempre 🌸',
        category: 'care',
        skinTypes: ['SENSITIVE']
      },
      {
        id: 'exercise_1',
        message: 'El ejercicio mejora la circulación y da brillo natural a tu piel ✨',
        category: 'lifestyle',
        skinTypes: ['all']
      },
      {
        id: 'stress_1',
        message: 'Reduce el estrés con meditación - tu piel te lo agradecerá 🧘‍♀️',
        category: 'wellness',
        skinTypes: ['all']
      }
    ];

    // Filtrar por tipo de piel si se especifica
    if (skinType && skinType !== 'all') {
      return allTips.filter(tip => 
        tip.skinTypes.includes('all') || tip.skinTypes.includes(skinType)
      );
    }

    return allTips;
  }

  // ========================================================================
  // NOTIFICACIONES VIP
  // ========================================================================

  /**
   * Notifica sobre expiración de membresía VIP
   * @param {string} userId - ID del usuario
   * @param {number} daysRemaining - Días restantes
   * @returns {Promise<object>} Resultado del envío
   */
  static async notifyVIPExpiration(userId, daysRemaining) {
    try {
      let message = '';
      let urgency = 'low';

      if (daysRemaining <= 1) {
        message = `🚨 ¡Tu membresía VIP expira HOY! Renueva ahora para no perder tus beneficios.`;
        urgency = 'critical';
      } else if (daysRemaining <= 3) {
        message = `⚠️ ¡Tu membresía VIP expira en ${daysRemaining} días! Renueva para seguir disfrutando tus beneficios.`;
        urgency = 'high';
      } else if (daysRemaining <= 7) {
        message = `💎 Tu membresía VIP expira en ${daysRemaining} días. ¿Quieres renovar?`;
        urgency = 'medium';
      } else if (daysRemaining <= 14) {
        message = `👑 Tu membresía VIP expira en ${daysRemaining} días. Considera renovar pronto.`;
        urgency = 'low';
      }

      if (message) {
        const result = await this.sendPushNotification(
          userId,
          '👑 Membresía VIP',
          message,
          {
            type: 'vip_expiration',
            daysRemaining,
            urgency,
            action: 'renew_vip'
          }
        );

        return {
          ...result,
          daysRemaining,
          urgency
        };
      }

      return {
        success: false,
        reason: 'No notification needed',
        daysRemaining
      };

    } catch (error) {
      console.error('❌ Error enviando notificación VIP:', error.message);
      return {
        success: false,
        error: error.message,
        userId,
        daysRemaining
      };
    }
  }

  // ========================================================================
  // NOTIFICACIONES PROMOCIONALES
  // ========================================================================

  /**
   * Envía notificación de oferta especial
   */
  static async sendPromotionalOffer(userId, offer) {
    try {
      const result = await this.sendPushNotification(
        userId,
        `🎉 ${offer.title}`,
        offer.message,
        {
          type: 'promotional_offer',
          offerId: offer.id,
          validUntil: offer.validUntil,
          discount: offer.discount
        }
      );

      return result;
    } catch (error) {
      console.error('❌ Error enviando oferta promocional:', error.message);
      return {
        success: false,
        error: error.message,
        userId,
        offerId: offer.id
      };
    }
  }

  /**
   * Notifica sobre puntos de belleza obtenidos
   */
  static async notifyBeautyPointsEarned(userId, points, treatmentName) {
    try {
      const result = await this.sendPushNotification(
        userId,
        '💎 ¡Beauty Points Ganados!',
        `Has ganado ${points} puntos con tu tratamiento: ${treatmentName}`,
        {
          type: 'beauty_points_earned',
          points,
          treatmentName
        }
      );

      return result;
    } catch (error) {
      console.error('❌ Error notificando beauty points:', error.message);
      return {
        success: false,
        error: error.message,
        userId,
        points
      };
    }
  }

  // ========================================================================
  // UTILIDADES
  // ========================================================================

  /**
   * Envía múltiples notificaciones a diferentes usuarios
   */
  static async sendBulkNotifications(notifications) {
    const results = [];
    
    for (const notification of notifications) {
      try {
        const result = await this.sendPushNotification(
          notification.userId,
          notification.title,
          notification.message,
          notification.data
        );
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          userId: notification.userId
        });
      }
    }

    return {
      total: notifications.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Programa notificación para envío futuro
   */
  static async scheduleNotification(userId, title, message, sendAt, data = {}) {
    const delay = new Date(sendAt).getTime() - Date.now();
    
    if (delay <= 0) {
      return await this.sendPushNotification(userId, title, message, data);
    }

    console.log(`📅 Notificación programada para: ${new Date(sendAt).toLocaleString('es-AR')}`);
    
    // En desarrollo, simular con setTimeout
    if (process.env.NODE_ENV !== 'production') {
      setTimeout(async () => {
        await this.sendPushNotification(userId, title, message, data);
      }, Math.min(delay, 30000)); // Máximo 30 segundos para testing
    }

    return {
      scheduled: true,
      userId,
      title,
      message,
      sendAt,
      delay
    };
  }

  /**
   * Método de testing para verificar el servicio
   */
  static async testNotificationService() {
    console.log('\n🧪 TESTING NOTIFICATION SERVICE');
    console.log('================================');
    
    const testUserId = 'test-user-123';
    
    // Test 1: Push notification básica
    console.log('1. Testing push notification...');
    await this.sendPushNotification(testUserId, 'Test', 'Notification test message');
    
    // Test 2: Wellness tip
    console.log('2. Testing wellness tip...');
    await this.sendWellnessTip(testUserId, 'MIXED');
    
    // Test 3: VIP expiration
    console.log('3. Testing VIP expiration...');
    await this.notifyVIPExpiration(testUserId, 3);
    
    console.log('================================');
    console.log('✅ Testing completado\n');
  }
}

module.exports = NotificationService;