// ============================================================================
// src/controllers/notifications.controller.js - NOTIFICACIONES COMPLETO ✅
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { AppError } = require('../utils/errors');
const { Expo } = require('expo-server-sdk');

const prisma = new PrismaClient();

// ============================================================================
// INICIALIZAR EXPO SDK PARA PUSH NOTIFICATIONS
// ============================================================================
const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN, // Token desde tu cuenta de Expo
  useFcmV1: true // Usar FCM v1 para Android
});

// ============================================================================
// CLASE CONTROLADOR DE NOTIFICACIONES
// ============================================================================
class NotificationsController {
  
  // ========================================================================
  // PUT /api/notifications/device-token - REGISTRAR TOKEN DE DISPOSITIVO
  // ========================================================================
  static async updateDeviceToken(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos de entrada inválidos', 400, errors.array());
      }

      const userId = req.user.id;
      const { pushToken, platform, deviceInfo } = req.body;

      console.log(`📱 Registrando token para usuario: ${userId}`);
      console.log(`Platform: ${platform}, Token: ${pushToken?.substring(0, 20)}...`);

      // Validar que el token sea válido para Expo
      if (!Expo.isExpoPushToken(pushToken)) {
        throw new AppError('Token de push inválido', 400);
      }

      // Actualizar usuario con token y información del dispositivo
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          pushToken,
          devicePlatform: platform,
          deviceInfo: JSON.stringify(deviceInfo),
          updatedAt: new Date()
        }
      });

      console.log(`✅ Token registrado para usuario: ${updatedUser.email}`);

      res.status(200).json({
        success: true,
        message: 'Token de dispositivo registrado exitosamente',
        data: {
          tokenRegistered: true,
          platform,
          userId
        }
      });

    } catch (error) {
      console.error('❌ Error registrando token:', error);
      next(error);
    }
  }

  // ========================================================================
  // PUT /api/notifications/settings - ACTUALIZAR CONFIGURACIÓN DE PUSH
  // ========================================================================
  static async updatePushSettings(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos de entrada inválidos', 400, errors.array());
      }

      const userId = req.user.id;
      const { pushEnabled, categories } = req.body;

      console.log(`⚙️ Actualizando configuración push para usuario: ${userId}`);

      const pushSettings = {
        enabled: pushEnabled !== undefined ? pushEnabled : true,
        categories: categories || {
          appointments: true,
          wellness: true,
          promotions: false,
          offers: false
        },
        updatedAt: new Date().toISOString()
      };

      await prisma.user.update({
        where: { id: userId },
        data: {
          pushSettings: JSON.stringify(pushSettings),
          updatedAt: new Date()
        }
      });

      console.log(`✅ Configuración push actualizada`);

      res.status(200).json({
        success: true,
        message: 'Configuración de notificaciones actualizada',
        data: { settings: pushSettings }
      });

    } catch (error) {
      console.error('❌ Error actualizando configuración:', error);
      next(error);
    }
  }

  // ========================================================================
  // POST /api/notifications/send - ENVIAR NOTIFICACIÓN PUSH
  // ========================================================================
  static async sendPushNotification(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError('Datos de entrada inválidos', 400, errors.array());
      }

      const { 
        userIds, 
        title, 
        body, 
        data, 
        category = 'general',
        priority = 'normal'
      } = req.body;

      console.log(`📤 Enviando notificación a ${userIds?.length || 'todos'} usuarios`);
      console.log(`Título: ${title}`);

      let targetUsers;

      if (userIds && Array.isArray(userIds)) {
        // Enviar a usuarios específicos
        targetUsers = await prisma.user.findMany({
          where: {
            id: { in: userIds },
            pushToken: { not: null }
          },
          select: {
            id: true,
            email: true,
            pushToken: true,
            pushSettings: true,
            preferredNotifications: true
          }
        });
      } else {
        // Enviar a todos los usuarios con token
        targetUsers = await prisma.user.findMany({
          where: {
            pushToken: { not: null }
          },
          select: {
            id: true,
            email: true,
            pushToken: true,
            pushSettings: true,
            preferredNotifications: true
          }
        });
      }

      console.log(`👥 Encontrados ${targetUsers.length} usuarios con token`);

      if (targetUsers.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No hay usuarios con tokens de push disponibles',
          data: { sent: 0, failed: 0 }
        });
      }

      // Filtrar usuarios según preferencias
      const filteredUsers = targetUsers.filter(user => {
        return this.shouldSendNotification(user, category);
      });

      console.log(`🎯 ${filteredUsers.length} usuarios después de filtrar preferencias`);

      // Preparar mensajes para Expo
      const messages = filteredUsers.map(user => ({
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data: {
          category,
          userId: user.id,
          ...data
        },
        priority: priority === 'high' ? 'high' : 'normal',
        channelId: this.getChannelId(category),
      }));

      // Enviar notificaciones en chunks
      const chunks = expo.chunkPushNotifications(messages);
      const results = {
        sent: 0,
        failed: 0,
        tickets: []
      };

      for (const chunk of chunks) {
        try {
          const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          results.tickets.push(...ticketChunk);
          
          // Contar éxitos y fallos
          ticketChunk.forEach(ticket => {
            if (ticket.status === 'ok') {
              results.sent++;
            } else {
              results.failed++;
              console.error('❌ Error en ticket:', ticket);
            }
          });

        } catch (error) {
          console.error('❌ Error enviando chunk:', error);
          results.failed += chunk.length;
        }
      }

      // Registrar notificaciones enviadas
      await this.logNotifications(filteredUsers, title, body, category, data);

      console.log(`✅ Notificaciones enviadas: ${results.sent}, Fallidas: ${results.failed}`);

      res.status(200).json({
        success: true,
        message: `Notificaciones procesadas: ${results.sent} enviadas, ${results.failed} fallidas`,
        data: {
          sent: results.sent,
          failed: results.failed,
          total: filteredUsers.length
        }
      });

    } catch (error) {
      console.error('❌ Error enviando notificaciones:', error);
      next(error);
    }
  }

  // ========================================================================
  // POST /api/notifications/appointment-reminder - RECORDATORIO DE CITA
  // ========================================================================
  static async sendAppointmentReminder(req, res, next) {
    try {
      const { appointmentId, reminderType = '24h' } = req.body;

      console.log(`📅 Enviando recordatorio de cita: ${appointmentId} (${reminderType})`);

      // Obtener información de la cita
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              pushToken: true,
              preferredNotifications: true
            }
          },
          treatment: {
            select: { name: true }
          },
          professional: {
            select: { firstName: true, lastName: true }
          },
          clinic: {
            select: { name: true }
          }
        }
      });

      if (!appointment) {
        throw new AppError('Cita no encontrada', 404);
      }

      if (!appointment.user.pushToken) {
        return res.status(200).json({
          success: true,
          message: 'Usuario no tiene token de push registrado',
          data: { sent: false }
        });
      }

      // Verificar preferencias de notificaciones
      const preferences = appointment.user.preferredNotifications 
        ? JSON.parse(appointment.user.preferredNotifications)
        : { appointments: true };

      if (!preferences.appointments) {
        return res.status(200).json({
          success: true,
          message: 'Usuario tiene deshabilitadas las notificaciones de citas',
          data: { sent: false }
        });
      }

      // Generar mensaje según tipo de recordatorio
      const { title, body } = this.generateAppointmentMessage(appointment, reminderType);

      // Enviar notificación
      const message = {
        to: appointment.user.pushToken,
        sound: 'default',
        title,
        body,
        data: {
          type: 'appointment',
          appointmentId: appointment.id,
          reminderType,
          userId: appointment.user.id
        },
        priority: 'high',
        channelId: 'appointments',
      };

      const tickets = await expo.sendPushNotificationsAsync([message]);
      const success = tickets[0]?.status === 'ok';

      // Registrar en log
      await prisma.notificationLog.create({
        data: {
          userId: appointment.user.id,
          type: 'appointment',
          title,
          body,
          delivered: success,
          data: JSON.stringify({
            appointmentId,
            reminderType,
            ticketId: tickets[0]?.id
          })
        }
      });

      console.log(`✅ Recordatorio enviado: ${success ? 'éxito' : 'falló'}`);

      res.status(200).json({
        success: true,
        message: success ? 'Recordatorio enviado exitosamente' : 'Error enviando recordatorio',
        data: {
          sent: success,
          ticketId: tickets[0]?.id
        }
      });

    } catch (error) {
      console.error('❌ Error enviando recordatorio:', error);
      next(error);
    }
  }

  // ========================================================================
  // GET /api/notifications/history - HISTORIAL DE NOTIFICACIONES
  // ========================================================================
  static async getNotificationHistory(req, res, next) {
    try {
      const userId = req.user.id;
      const { limit = 50, offset = 0, type } = req.query;

      console.log(`📋 Obteniendo historial de notificaciones para usuario: ${userId}`);

      const whereClause = { userId };
      if (type) {
        whereClause.type = type;
      }

      const [notifications, total] = await Promise.all([
        prisma.notificationLog.findMany({
          where: whereClause,
          orderBy: { sentAt: 'desc' },
          take: parseInt(limit),
          skip: parseInt(offset),
          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            sentAt: true,
            delivered: true,
            opened: true,
            data: true
          }
        }),
        prisma.notificationLog.count({ where: whereClause })
      ]);

      console.log(`✅ Encontradas ${notifications.length} notificaciones`);

      res.status(200).json({
        success: true,
        data: {
          notifications: notifications.map(notif => ({
            ...notif,
            data: notif.data ? JSON.parse(notif.data) : null
          })),
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: (parseInt(offset) + parseInt(limit)) < total
          }
        }
      });

    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      next(error);
    }
  }

  // ========================================================================
  // DELETE /api/notifications/token - ELIMINAR TOKEN DE DISPOSITIVO
  // ========================================================================
  static async removeDeviceToken(req, res, next) {
    try {
      const userId = req.user.id;

      console.log(`🗑️ Eliminando token para usuario: ${userId}`);

      await prisma.user.update({
        where: { id: userId },
        data: {
          pushToken: null,
          devicePlatform: null,
          deviceInfo: null,
          pushSettings: null,
          updatedAt: new Date()
        }
      });

      console.log(`✅ Token eliminado exitosamente`);

      res.status(200).json({
        success: true,
        message: 'Token de dispositivo eliminado exitosamente'
      });

    } catch (error) {
      console.error('❌ Error eliminando token:', error);
      next(error);
    }
  }

  // ========================================================================
  // MÉTODOS PRIVADOS DE UTILIDAD
  // ========================================================================

  // Verificar si debe enviar notificación según preferencias
  static shouldSendNotification(user, category) {
    try {
      // Verificar configuración push
      if (user.pushSettings) {
        const pushSettings = JSON.parse(user.pushSettings);
        if (!pushSettings.enabled) return false;
        if (pushSettings.categories && !pushSettings.categories[category]) return false;
      }

      // Verificar preferencias de notificaciones
      if (user.preferredNotifications) {
        const preferences = JSON.parse(user.preferredNotifications);
        
        switch (category) {
          case 'appointments':
            return preferences.appointments !== false;
          case 'wellness':
            return preferences.wellness !== false;
          case 'promotions':
            return preferences.promotions === true;
          case 'offers':
            return preferences.offers === true;
          default:
            return true;
        }
      }

      return true;
    } catch (error) {
      console.error('Error verificando preferencias:', error);
      return true; // Enviar por defecto si hay error
    }
  }

  // Obtener ID del canal de notificación
  static getChannelId(category) {
    switch (category) {
      case 'appointments':
        return 'appointments';
      case 'promotions':
      case 'offers':
        return 'promotions';
      case 'wellness':
        return 'wellness';
      default:
        return 'default';
    }
  }

  // Generar mensaje de recordatorio de cita
  static generateAppointmentMessage(appointment, reminderType) {
    const treatmentName = appointment.treatment.name;
    const professionalName = `${appointment.professional.firstName} ${appointment.professional.lastName}`;
    const appointmentDate = new Date(appointment.scheduledDate);
    const timeString = appointment.scheduledTime;

    switch (reminderType) {
      case '24h':
        return {
          title: '📅 Recordatorio de Cita',
          body: `Mañana tienes tu cita de ${treatmentName} a las ${timeString}`
        };
      case '2h':
        return {
          title: '⏰ Tu cita es pronto',
          body: `En 2 horas: ${treatmentName} con ${professionalName}`
        };
      case '30min':
        return {
          title: '🚗 Es hora de partir',
          body: `Tu cita de ${treatmentName} es en 30 minutos`
        };
      default:
        return {
          title: '📱 Recordatorio de Cita',
          body: `Tienes una cita de ${treatmentName} programada`
        };
    }
  }

  // Registrar notificaciones en la base de datos
  static async logNotifications(users, title, body, category, data) {
    try {
      const logs = users.map(user => ({
        userId: user.id,
        type: category,
        title,
        body,
        delivered: true, // Se asume entregada hasta confirmar lo contrario
        data: JSON.stringify(data)
      }));

      await prisma.notificationLog.createMany({
        data: logs,
        skipDuplicates: true
      });

      console.log(`📝 Registradas ${logs.length} notificaciones en log`);
    } catch (error) {
      console.error('❌ Error registrando notificaciones:', error);
    }
  }
}

module.exports = NotificationsController;