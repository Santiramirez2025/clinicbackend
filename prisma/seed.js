// ============================================================================
// prisma/seed.js - ACTUALIZADO PARA NUEVO SCHEMA
// ============================================================================
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function seed() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Hashear passwords
    const adminHash = await bcrypt.hash('admin123', 10);
    const demoHash = await bcrypt.hash('demo123', 10);
    const profHash = await bcrypt.hash('prof123', 10);

    // 1. Crear clínica principal
    const clinic = await prisma.clinic.upsert({
      where: {
        email: "admin@bellezaestetica.com"
      },
      update: {},
      create: {
        name: "Belleza Estética Madrid Centro",
        slug: "madrid-centro", // ✅ CAMPO REQUERIDO
        email: "admin@bellezaestetica.com",
        passwordHash: adminHash,
        phone: "+34 911 234 567",
        address: "Calle Gran Vía 28, Madrid",
        city: "Madrid", // ✅ CAMPO REQUERIDO
        country: "ES",
        timezone: "Europe/Madrid",
        businessHours: JSON.stringify({
          monday: { open: '09:00', close: '20:00' },
          tuesday: { open: '09:00', close: '20:00' },
          wednesday: { open: '09:00', close: '20:00' },
          thursday: { open: '09:00', close: '20:00' },
          friday: { open: '09:00', close: '20:00' },
          saturday: { open: '10:00', close: '18:00' },
          sunday: { closed: true }
        }),
        subscriptionPlan: "PREMIUM",
        subscriptionExpiresAt: new Date("2026-08-10"),
        onboardingCompleted: true,
        isActive: true,
        isVerified: true,
        enableVipProgram: true,
        enableNotifications: true,
        enableOnlineBooking: true,
        enablePayments: true
      }
    });

    console.log(`✅ Clínica creada: ${clinic.name}`);

    // 2. Crear usuario demo
    const demoUser = await prisma.user.upsert({
      where: {
        email: "demo@bellezaestetica.com"
      },
      update: {},
      create: {
        email: "demo@bellezaestetica.com",
        passwordHash: demoHash,
        firstName: "María",
        lastName: "González",
        phone: "+34 600 123 456",
        primaryClinicId: clinic.id, // ✅ CAMPO REQUERIDO
        beautyPoints: 150,
        loyaltyTier: "SILVER",
        vipStatus: true,
        isActive: true,
        isVerified: true,
        onboardingCompleted: true,
        privacyAccepted: true,
        termsAccepted: true,
        marketingAccepted: true,
        emailNotifications: true,
        smsNotifications: false,
        marketingNotifications: true
      }
    });

    console.log(`✅ Usuario demo creado: ${demoUser.firstName} ${demoUser.lastName}`);

    // 3. Crear profesional
    const professional = await prisma.professional.upsert({
      where: {
        email: "ana.profesional@bellezaestetica.com"
      },
      update: {},
      create: {
        email: "ana.profesional@bellezaestetica.com",
        passwordHash: profHash,
        firstName: "Ana",
        lastName: "Martínez",
        clinicId: clinic.id,
        role: "PROFESSIONAL",
        phone: "+34 600 987 654",
        specialties: JSON.stringify(['Tratamientos Faciales', 'Hidratación', 'Limpieza Profunda']),
        bio: "Especialista en tratamientos faciales con 5 años de experiencia en belleza y estética",
        experience: 5,
        employmentType: "FULL_TIME",
        rating: 4.8,
        totalAppointments: 245,
        patientSatisfaction: 4.9,
        isActive: true,
        isVerified: true,
        onboardingCompleted: true,
        canManageSchedule: true,
        canViewReports: false,
        canManagePatients: false,
        canManageTreatments: false
      }
    });

    console.log(`✅ Profesional creado: ${professional.firstName} ${professional.lastName}`);

    // 4. Crear tratamientos
    const treatment1 = await prisma.treatment.create({
      data: {
        name: "Limpieza Facial Profunda",
        description: "Tratamiento completo de limpieza facial con extracción de puntos negros, hidratación y mascarilla nutritiva.",
        shortDescription: "Limpieza profunda de cutis",
        category: "facial",
        subcategory: "limpieza",
        durationMinutes: 60,
        price: 45.00,
        vipPrice: 36.00,
        iconName: "face-wash",
        color: "#FF6B9D",
        beautyPointsEarned: 15,
        clinicId: clinic.id,
        isActive: true,
        isFeatured: true,
        isPopular: true,
        tags: JSON.stringify(['limpieza', 'facial', 'puntos_negros', 'hidratacion'])
      }
    });

    const treatment2 = await prisma.treatment.create({
      data: {
        name: "Hidratación Facial Premium",
        description: "Tratamiento hidratante intensivo con ácido hialurónico, vitamina C y masaje facial relajante.",
        shortDescription: "Hidratación intensiva anti-edad",
        category: "facial",
        subcategory: "hidratacion",
        durationMinutes: 75,
        price: 65.00,
        vipPrice: 52.00,
        iconName: "droplet",
        color: "#4ECDC4",
        beautyPointsEarned: 20,
        clinicId: clinic.id,
        isActive: true,
        isVipExclusive: true,
        isFeatured: true,
        tags: JSON.stringify(['hidratacion', 'anti_edad', 'acido_hialuronico', 'vip'])
      }
    });

    console.log(`✅ Tratamientos creados: ${treatment1.name}, ${treatment2.name}`);

    // 5. Crear ofertas
    const offer = await prisma.offer.create({
      data: {
        clinicId: clinic.id,
        title: "20% OFF Primera Visita",
        description: "Descuento especial del 20% en tu primera cita. Válido para nuevas clientas.",
        shortDescription: "20% descuento primera cita",
        discountType: "PERCENTAGE",
        discountValue: 20,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        targetAudience: "NEW_CUSTOMERS",
        maxUsesPerUser: 1,
        treatmentIds: JSON.stringify([treatment1.id, treatment2.id]),
        category: "GENERAL",
        priority: 1,
        isActive: true,
        isFeatured: true,
        sendNotification: true
      }
    });

    console.log(`✅ Oferta creada: ${offer.title}`);

    // 6. Crear wellness tips
    await prisma.wellnessTip.createMany({
      data: [
        {
          clinicId: clinic.id,
          title: "Hidratación diaria para piel radiante",
          content: "Mantén tu piel hidratada bebiendo al menos 2 litros de agua al día y usando una crema hidratante adecuada para tu tipo de piel.",
          excerpt: "Tips de hidratación para una piel saludable",
          category: "skincare",
          iconName: "droplets",
          color: "#4ECDC4",
          isActive: true,
          priority: 1,
          tags: JSON.stringify(['hidratacion', 'cuidado_diario', 'piel_sana'])
        },
        {
          clinicId: clinic.id,
          title: "Protección solar: tu mejor aliado",
          content: "Usa protector solar SPF 30+ todos los días, incluso en días nublados. Es la mejor prevención contra el envejecimiento prematuro.",
          excerpt: "Importancia del protector solar diario",
          category: "skincare",
          iconName: "sun",
          color: "#FFE66D",
          isActive: true,
          priority: 2,
          tags: JSON.stringify(['proteccion_solar', 'anti_edad', 'prevencion'])
        }
      ]
    });

    console.log('✅ Wellness tips creados');

    // 7. Crear recompensa template
    const rewardTemplate = await prisma.rewardTemplate.create({
      data: {
        clinicId: clinic.id,
        name: "10% Descuento",
        description: "Descuento del 10% en cualquier tratamiento facial",
        shortDescription: "10% OFF tratamientos faciales",
        type: "DISCOUNT",
        value: 10,
        valueType: "PERCENTAGE",
        pointsCost: 100,
        marginCost: 5.00,
        validityDays: 30,
        maxUsesPerMonth: 5,
        maxUsesPerUser: 1,
        targetUserType: "ALL",
        iconName: "percent",
        color: "#FF6B9D",
        isActive: true,
        isFeatured: true,
        popularity: 0.8
      }
    });

    console.log(`✅ Reward template creado: ${rewardTemplate.name}`);

    console.log('\n🎉 ¡Seed completado exitosamente!');
    console.log('\n📧 Credenciales de acceso:');
    console.log('🏥 Admin Clínica: admin@bellezaestetica.com / admin123');
    console.log('👤 Usuario Demo: demo@bellezaestetica.com / demo123');
    console.log('👨‍⚕️ Profesional: ana.profesional@bellezaestetica.com / prof123');
    console.log(`\n🏪 Clínica: ${clinic.name} (${clinic.slug})`);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
}

async function main() {
  try {
    await seed();
  } catch (error) {
    console.error('❌ Error en main:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();