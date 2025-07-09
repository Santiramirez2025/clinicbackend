const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...');

  try {
    // ========================================================================
    // 1. CREAR CLÍNICAS DE PRUEBA
    // ========================================================================
    console.log('📍 Creando clínicas...');
    
    const clinicaBelleza = await prisma.clinic.upsert({
      where: { email: 'admin@bellezaestetica.com' },
      update: {},
      create: {
        name: 'Belleza Estética Premium',
        email: 'admin@bellezaestetica.com',
        passwordHash: await bcrypt.hash('admin123', 12),
        phone: '+54 11 4567-8900',
        address: 'Av. Santa Fe 1234, CABA, Buenos Aires',
        logoUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200',
        brandColors: JSON.stringify({
          primary: '#d4af37',
          secondary: '#f4e4bc',
          accent: '#8b7355'
        }),
        subscriptionPlan: 'PREMIUM',
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
        settings: JSON.stringify({
          workingHours: {
            monday: { start: '09:00', end: '18:00' },
            tuesday: { start: '09:00', end: '18:00' },
            wednesday: { start: '09:00', end: '18:00' },
            thursday: { start: '09:00', end: '18:00' },
            friday: { start: '09:00', end: '18:00' },
            saturday: { start: '09:00', end: '15:00' },
            sunday: { closed: true }
          }
        })
      }
    });

    // ========================================================================
    // 2. CREAR PROFESIONALES
    // ========================================================================
    console.log('👩‍⚕️ Creando profesionales...');

    const professional1 = await prisma.professional.upsert({
      where: { id: 'prof-ana-martinez' },
      update: {},
      create: {
        id: 'prof-ana-martinez',
        clinicId: clinicaBelleza.id,
        firstName: 'Ana',
        lastName: 'Martínez',
        specialties: JSON.stringify(['Tratamientos Faciales', 'Anti-aging', 'Hidratación']),
        avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
        bio: 'Especialista en cuidado facial con 10 años de experiencia.',
        rating: 4.9,
        availableHours: JSON.stringify({
          monday: ['09:00', '18:00'],
          tuesday: ['09:00', '18:00'],
          wednesday: ['09:00', '18:00'],
          thursday: ['09:00', '18:00'],
          friday: ['09:00', '18:00']
        })
      }
    });

    // ========================================================================
    // 3. CREAR TRATAMIENTOS
    // ========================================================================
    console.log('💆‍♀️ Creando tratamientos...');

    const treatment1 = await prisma.treatment.upsert({
      where: { id: 'treat-ritual-purificante' },
      update: {},
      create: {
        id: 'treat-ritual-purificante',
        clinicId: clinicaBelleza.id,
        name: 'Ritual Purificante',
        description: 'Limpieza facial profunda con extracción de comedones, mascarilla purificante y hidratación.',
        durationMinutes: 60,
        price: 2500,
        category: 'Facial',
        iconName: 'sparkles',
        isVipExclusive: false
      }
    });

    const treatment2 = await prisma.treatment.upsert({
      where: { id: 'treat-drenaje-relajante' },
      update: {},
      create: {
        id: 'treat-drenaje-relajante',
        clinicId: clinicaBelleza.id,
        name: 'Drenaje Relajante',
        description: 'Masaje de drenaje linfático corporal que elimina toxinas y proporciona relajación profunda.',
        durationMinutes: 90,
        price: 3500,
        category: 'Corporal',
        iconName: 'waves',
        isVipExclusive: false
      }
    });

    const treatment3 = await prisma.treatment.upsert({
      where: { id: 'treat-hidratacion-vip' },
      update: {},
      create: {
        id: 'treat-hidratacion-vip',
        clinicId: clinicaBelleza.id,
        name: 'Hidratación Premium VIP',
        description: 'Tratamiento facial exclusivo con ácido hialurónico, vitamina C y mascarilla de oro.',
        durationMinutes: 75,
        price: 4500,
        category: 'Facial',
        iconName: 'crown',
        isVipExclusive: true
      }
    });

    // ========================================================================
    // 4. CREAR USUARIO DEMO
    // ========================================================================
    console.log('👤 Creando usuario demo...');

    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@bellezaestetica.com' },
      update: {},
      create: {
        email: 'demo@bellezaestetica.com',
        passwordHash: await bcrypt.hash('demo123', 12),
        firstName: 'María',
        lastName: 'Ejemplar',
        phone: '+54 11 1234-5678',
        birthDate: new Date('1990-05-15'),
        skinType: 'MIXED',
        beautyPoints: 280,
        sessionsCompleted: 12,
        totalInvestment: 18500,
        vipStatus: true,
        preferredNotifications: JSON.stringify({
          appointments: true,
          wellness: true,
          offers: true,
          promotions: false
        }),
        // ✅ NUEVOS CAMPOS DE NOTIFICACIONES
        pushToken: null,
        devicePlatform: null,
        deviceInfo: null,
        pushSettings: JSON.stringify({
          appointments: true,
          wellness: true,
          offers: true,
          promotions: false
        }),
        lastNotificationSent: null
      }
    });

    // ========================================================================
    // 5. CREAR STRIPE CUSTOMER Y SUSCRIPCIÓN VIP
    // ========================================================================
    console.log('💎 Creando customer de Stripe...');

    const stripeCustomer = await prisma.stripeCustomer.upsert({
      where: { userId: demoUser.id },
      update: {},
      create: {
        userId: demoUser.id,
        stripeCustomerId: 'cus_demo_customer_123',
        email: demoUser.email,
        name: `${demoUser.firstName} ${demoUser.lastName}`,
        phone: demoUser.phone
      }
    });

    console.log('💎 Creando suscripción VIP...');

    await prisma.vipSubscription.upsert({
      where: { stripeSubscriptionId: 'sub_demo_subscription_123' },
      update: {},
      create: {
        userId: demoUser.id,
        stripeSubscriptionId: 'sub_demo_subscription_123',
        stripeCustomerId: stripeCustomer.stripeCustomerId,
        planType: 'MONTHLY',
        status: 'ACTIVE',
        price: 19.99,
        currency: 'EUR',
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // Hace 15 días
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // En 15 días
        cancelAtPeriodEnd: false
      }
    });

    // ========================================================================
    // 6. CREAR CITA DE EJEMPLO
    // ========================================================================
    console.log('📅 Creando citas de ejemplo...');

    await prisma.appointment.upsert({
      where: { id: 'appt-demo-123' },
      update: {},
      create: {
        id: 'appt-demo-123',
        userId: demoUser.id,
        clinicId: clinicaBelleza.id,
        professionalId: professional1.id,
        treatmentId: treatment1.id,
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // En 3 días
        scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // 2:00 PM
        durationMinutes: 60,
        status: 'CONFIRMED',
        beautyPointsEarned: 50,
        notes: 'Primera cita de prueba'
      }
    });

    // ========================================================================
    // 7. CREAR TIPS DE BIENESTAR
    // ========================================================================
    console.log('🌿 Creando tips de bienestar...');

    const tips = [
      {
        id: 'tip-hidratacion',
        title: 'Hidratación Matutina',
        content: 'Comienza tu día bebiendo un vaso de agua tibia con limón.',
        category: 'hidratacion',
        iconName: 'droplets'
      },
      {
        id: 'tip-proteccion',
        title: 'Protección Solar Diaria',
        content: 'Aplica protector solar todos los días, incluso en días nublados.',
        category: 'proteccion',
        iconName: 'sun'
      },
      {
        id: 'tip-descanso',
        title: 'Descanso Reparador',
        content: 'Duerme entre 7-8 horas diarias para que tu piel se regenere.',
        category: 'descanso',
        iconName: 'moon'
      }
    ];

    for (const tip of tips) {
      await prisma.wellnessTip.upsert({
        where: { id: tip.id },
        update: {},
        create: tip
      });
    }

    // ========================================================================
    // 8. CREAR LOG DE NOTIFICACIÓN DE EJEMPLO
    // ========================================================================
    console.log('🔔 Creando logs de notificaciones...');

    await prisma.notificationLog.upsert({
      where: { id: 'notif-demo-123' },
      update: {},
      create: {
        id: 'notif-demo-123',
        userId: demoUser.id,
        type: 'appointment',
        title: 'Recordatorio de cita',
        body: 'Tu cita de Ritual Purificante es mañana a las 14:00',
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hace 1 día
        delivered: true,
        opened: true,
        data: JSON.stringify({
          appointmentId: 'appt-demo-123',
          treatmentName: 'Ritual Purificante'
        }),
        pushToken: 'expo-push-token-demo',
        platform: 'ios'
      }
    });

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('\n🎉 ¡Seeding completado exitosamente!');
    console.log('================================================');
    console.log('📊 DATOS CREADOS:');
    console.log(`   🏥 Clínicas: 1`);
    console.log(`   👩‍⚕️ Profesionales: 1`);
    console.log(`   💆‍♀️ Tratamientos: 3`);
    console.log(`   👤 Usuario demo: 1`);
    console.log(`   🏦 Stripe Customer: 1`);
    console.log(`   💎 Suscripción VIP: 1`);
    console.log(`   📅 Citas: 1`);
    console.log(`   🌿 Tips: 3`);
    console.log(`   🔔 Notificaciones: 1`);
    console.log('================================================');
    
    console.log('\n🔑 CREDENCIALES DE PRUEBA:');
    console.log('📱 USUARIO DEMO:');
    console.log('   📧 Email: demo@bellezaestetica.com');
    console.log('   🔑 Password: demo123');
    console.log('   💎 Estado: VIP activo');
    console.log('   🔔 Notificaciones: Configuradas');
    
    console.log('\n🏥 CLÍNICA ADMIN:');
    console.log('   📧 Email: admin@bellezaestetica.com');
    console.log('   🔑 Password: admin123');
    
    console.log('\n🚀 ENDPOINTS LISTOS:');
    console.log('   POST /api/auth/demo-login');
    console.log('   GET  /api/dashboard');
    console.log('   GET  /api/vip/benefits');
    console.log('   GET  /api/profile');
    console.log('   PUT  /api/profile/notifications');

  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('💥 Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('\n👋 Conexión a base de datos cerrada');
  });