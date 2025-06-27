// ============================================================================
// src/services/email.service.js - SERVICIO DE EMAIL CORREGIDO
// ============================================================================

class EmailService {
  // Método principal para enviar emails
  static async sendEmail(to, subject, text, html) {
    const msg = {
      to,
      from: {
        email: process.env.FROM_EMAIL || 'noreply@bellezaestetica.com',
        name: 'Belleza Estética'
      },
      subject,
      text,
      html
    };

    try {
      // En desarrollo, solo loguear el email
      if (process.env.NODE_ENV === 'production' && process.env.SENDGRID_API_KEY) {
        // Solo usar SendGrid si está configurado y en producción
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        await sgMail.send(msg);
        console.log(`📧 Email enviado (producción) a: ${to}`);
      } else {
        // Modo desarrollo - solo mostrar en consola
        console.log('\n📧 EMAIL ENVIADO (MODO DESARROLLO)');
        console.log('===================================');
        console.log(`📬 Para: ${to}`);
        console.log(`📋 Asunto: ${subject}`);
        console.log(`📄 Contenido HTML: ${html ? 'Incluido' : 'No incluido'}`);
        console.log('===================================\n');
      }
      
      return { success: true, messageId: `msg_${Date.now()}` };
    } catch (error) {
      console.error('❌ Error enviando email:', error.message);
      // No lanzar error para evitar que falle la aplicación
      return { success: false, error: error.message };
    }
  }

  // Email de bienvenida
  static async sendWelcome(user) {
    const subject = '¡Bienvenida a Belleza Estética! 🌸';
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #d4af37, #f4e4bc); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            ¡Bienvenida ${user.firstName}! 🌸
          </h1>
        </div>
        
        <div style="padding: 30px; background: #ffffff;">
          <p style="font-size: 16px; line-height: 1.6; color: #333;">
            Nos encanta tenerte en nuestra comunidad de belleza y bienestar.
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d4af37;">
            <p style="margin: 0 0 10px 0; font-weight: bold; color: #d4af37;">
              🎁 Regalo de Bienvenida
            </p>
            <p style="margin: 0; color: #555;">
              Hemos agregado <strong>20 Beauty Points</strong> a tu cuenta para que comiences tu viaje de belleza.
            </p>
          </div>

          <div style="background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #d4af37; margin-top: 0;">¿Qué puedes hacer ahora?</h3>
            <ul style="color: #555; line-height: 1.8;">
              <li>📅 Reservar tu primera cita</li>
              <li>💎 Acumular Beauty Points con cada visita</li>
              <li>🌿 Recibir tips de bienestar personalizados</li>
              <li>✨ Considerar nuestra membresía VIP exclusiva</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://bellezaestetica.com'}" 
               style="background: linear-gradient(135deg, #d4af37, #f4e4bc); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
              Comenzar mi experiencia ✨
            </a>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
          <p style="margin: 0; color: #666; font-size: 14px;">
            ¿Tienes preguntas? Responde a este email o visita nuestro centro.
          </p>
        </div>
      </div>
    `;

    return await this.sendEmail(user.email, subject, '', html);
  }

  // Confirmación de cita
  static async sendAppointmentConfirmation(appointment) {
    const subject = '✅ Cita confirmada - Belleza Estética';
    const appointmentDate = new Date(appointment.scheduledDate).toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const appointmentTime = new Date(appointment.scheduledTime).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #28a745, #34ce57); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ ¡Cita Confirmada!</h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="color: #333; font-size: 16px;">
            Hola ${appointment.user?.firstName || 'estimada cliente'}, tu cita ha sido confirmada exitosamente.
          </p>
          
          <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="color: #28a745; margin-top: 0;">📋 Detalles de tu cita:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Tratamiento:</td>
                <td style="padding: 8px 0; color: #333;">${appointment.treatment?.name || 'No especificado'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Fecha:</td>
                <td style="padding: 8px 0; color: #333;">${appointmentDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Hora:</td>
                <td style="padding: 8px 0; color: #333;">${appointmentTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Duración:</td>
                <td style="padding: 8px 0; color: #333;">${appointment.durationMinutes || 60} minutos</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Profesional:</td>
                <td style="padding: 8px 0; color: #333;">${appointment.professional?.firstName || ''} ${appointment.professional?.lastName || ''}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Clínica:</td>
                <td style="padding: 8px 0; color: #333;">${appointment.clinic?.name || 'Belleza Estética'}</td>
              </tr>
              ${appointment.beautyPointsEarned > 0 ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #555;">Beauty Points:</td>
                <td style="padding: 8px 0; color: #d4af37; font-weight: bold;">${appointment.beautyPointsEarned} puntos 💎</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #1976d2; font-size: 14px;">
              ⏰ <strong>Recordatorio:</strong> Recibirás un recordatorio 24 horas antes de tu cita.
            </p>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail(appointment.user?.email || 'demo@bellezaestetica.com', subject, '', html);
  }

  // Bienvenida VIP
  static async sendVIPWelcome(user, subscription) {
    const subject = '👑 ¡Bienvenida al Club VIP! - Belleza Estética';
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #d4af37, #f4e4bc); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
            👑 ¡Bienvenida al Club VIP!
          </h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #333;">
            ¡Hola ${user.firstName}! Ahora eres parte de nuestro exclusivo Club VIP. 🎉
          </p>
          
          <div style="background: linear-gradient(135deg, #d4af37, #f4e4bc); padding: 25px; border-radius: 10px; color: #333; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #8b4513;">✨ Tus beneficios VIP incluyen:</h3>
            <ul style="line-height: 1.8; margin: 0;">
              <li>🏷 <strong>25% de descuento</strong> en todos los tratamientos</li>
              <li>⭐ <strong>Puntos dobles</strong> en cada cita</li>
              <li>📅 <strong>Acceso prioritario</strong> a los mejores horarios</li>
              <li>💆‍♀️ <strong>Facial gratuito</strong> cada 3 meses</li>
              <li>👩‍⚕️ <strong>Asesoría personalizada</strong> con especialistas</li>
              <li>🎁 <strong>Regalo especial</strong> en tu cumpleaños</li>
            </ul>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #d4af37; margin: 20px 0;">
            <p style="margin: 0; color: #8b4513;">
              🎁 <strong>Bono de Bienvenida:</strong> Hemos agregado <strong>50 Beauty Points extra</strong> a tu cuenta.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/vip" 
               style="background: linear-gradient(135deg, #d4af37, #f4e4bc); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
              Explorar beneficios VIP 👑
            </a>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail(user.email, subject, '', html);
  }

  // Recordatorio de cita
  static async sendAppointmentReminder(appointment) {
    const subject = '⏰ Recordatorio: Tu cita es mañana';
    const appointmentDate = new Date(appointment.scheduledDate).toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    const appointmentTime = new Date(appointment.scheduledTime).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #007bff, #0056b3); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Recordatorio de Cita</h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #333;">
            ¡Hola ${appointment.user?.firstName || 'estimada cliente'}! Te recordamos que tienes una cita mañana.
          </p>
          
          <div style="background: #e3f2fd; padding: 25px; border-radius: 10px; border-left: 4px solid #007bff; margin: 20px 0;">
            <h3 style="color: #007bff; margin-top: 0;">📋 Detalles de tu cita:</h3>
            <p><strong>Tratamiento:</strong> ${appointment.treatment?.name || 'No especificado'}</p>
            <p><strong>Fecha:</strong> ${appointmentDate}</p>
            <p><strong>Hora:</strong> ${appointmentTime}</p>
            <p><strong>Profesional:</strong> ${appointment.professional?.firstName || ''} ${appointment.professional?.lastName || ''}</p>
            <p><strong>Clínica:</strong> ${appointment.clinic?.name || 'Belleza Estética'}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #8b4513; font-size: 14px;">
              ⚠️ <strong>Importante:</strong> Si necesitas cancelar o reprogramar, hazlo al menos 24 horas antes para evitar penalizaciones.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/appointments" 
               style="background: #007bff; 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      font-weight: bold;
                      display: inline-block;">
              Gestionar cita
            </a>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail(appointment.user?.email || 'demo@bellezaestetica.com', subject, '', html);
  }

  // Actualización de cita
  static async sendAppointmentUpdate(appointment) {
    const subject = '📝 Cita modificada - Belleza Estética';
    // Reutilizar el template de confirmación
    return await this.sendAppointmentConfirmation(appointment);
  }

  // Cancelación de cita
  static async sendAppointmentCancellation(appointment, penaltyApplied = false) {
    const subject = '❌ Cita cancelada - Belleza Estética';
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">❌ Cita Cancelada</h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #333;">
            Tu cita ha sido cancelada exitosamente.
          </p>
          
          ${penaltyApplied ? `
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0; color: #8b4513;">
                <strong>⚠️ Aviso:</strong> Se aplicó una penalización por cancelación tardía (menos de 24 horas).
              </p>
            </div>
          ` : `
            <div style="background: #d1edff; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin: 20px 0;">
              <p style="margin: 0; color: #0056b3;">
                ✅ Cancelación realizada sin penalización.
              </p>
            </div>
          `}
          
          <p style="color: #555; text-align: center; margin: 30px 0;">
            Esperamos verte pronto. Puedes reservar una nueva cita cuando gustes.
          </p>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background: #28a745; 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      font-weight: bold;
                      display: inline-block;">
              Reservar nueva cita
            </a>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail(appointment.user?.email || 'demo@bellezaestetica.com', subject, '', html);
  }

  // Invitación
  static async sendInvitation(inviter, inviteeEmail, personalMessage = '', invitationId) {
    const subject = `${inviter.firstName} te invita a Belleza Estética 💐`;
    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #d4af37, #f4e4bc); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💐 ¡Tienes una invitación especial!</h1>
        </div>
        
        <div style="padding: 30px; background: white;">
          <p style="font-size: 16px; color: #333;">
            <strong>${inviter.firstName} ${inviter.lastName || ''}</strong> te ha invitado a unirte a Belleza Estética.
          </p>
          
          ${personalMessage ? `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; font-style: italic; border-left: 4px solid #d4af37; margin: 20px 0;">
              <p style="margin: 0; color: #555;">
                "${personalMessage}"
              </p>
            </div>
          ` : ''}
          
          <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">
              🎁 Al registrarte con esta invitación, tanto tú como ${inviter.firstName} recibirán <strong>50 Beauty Points de regalo</strong>.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/register?invitation=${invitationId}" 
               style="background: linear-gradient(135deg, #d4af37, #f4e4bc); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 25px; 
                      font-weight: bold;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
              Aceptar invitación 🌸
            </a>
          </div>
        </div>
      </div>
    `;

    return await this.sendEmail(inviteeEmail, subject, '', html);
  }

  // Método para testing/desarrollo
  static async sendTestEmail(to = 'test@example.com') {
    const subject = '🧪 Email de Prueba - Belleza Estética';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #d4af37;">🧪 Email de Prueba</h1>
        <p>Este es un email de prueba para verificar que el servicio de email funciona correctamente.</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-AR')}</p>
        <p><strong>Estado:</strong> ✅ Funcionando correctamente</p>
      </div>
    `;

    return await this.sendEmail(to, subject, '', html);
  }
}

module.exports = EmailService;