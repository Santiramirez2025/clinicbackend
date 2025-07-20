const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mapeo de emojis a iconName para Lucide React
const emojiToIconMap = {
  '💉': 'syringe',
  '💋': 'heart',
  '💧': 'droplets',
  '🧪': 'flask-conical',
  '🔬': 'microscope',
  '🩸': 'activity',
  '🧵': 'threads',
  '👁️': 'eye',
  '👃': 'user',
  '🏋️‍♀️': 'dumbbell'
};

const getMockTreatments = () => [
  {
    id: 't-botox',
    name: 'Botox 3 zonas',
    category: 'Medicina Estética',
    duration: 45,
    durationMinutes: 45,
    price: 299,
    emoji: '💉',
    description: 'Infiltración de toxina botulínica para arrugas en frente, entrecejo y patas de gallo.',
    isVipExclusive: true,
    clinic: 'Clínica Bellezza Alicante',
  },
  {
    id: 't-hialuronico',
    name: 'Ácido Hialurónico (1 vial)',
    category: 'Medicina Estética',
    duration: 45,
    durationMinutes: 45,
    price: 240,
    emoji: '💋',
    description: 'Relleno dérmico para labios, surcos nasogenianos o pómulos con resultados naturales.',
    isVipExclusive: false,
    clinic: 'Clínica Bellezza Alicante',
  },
  {
    id: 't-mesoterapia',
    name: 'Mesoterapia Facial',
    category: 'Facial',
    duration: 30,
    durationMinutes: 30,
    price: 150,
    emoji: '💧',
    description: 'Revitalización profunda mediante microinyecciones de vitaminas y ácido hialurónico.',
    isVipExclusive: false,
    clinic: 'Clínica Bellezza Alicante',
  },
  {
    id: 't-peeling',
    name: 'Peeling Químico',
    category: 'Facial',
    duration: 30,
    durationMinutes: 30,
    price: 120,
    emoji: '🧪',
    description: 'Tratamiento despigmentante y rejuvenecedor con ácidos específicos según el tipo de piel.',
    isVipExclusive: false,
    clinic: 'Clínica Bellezza Alicante',
  },
  {
    id: 't-microneedling',
    name: 'Microneedling + Radiofrecuencia',
    category: 'Facial',
    duration: 60,
    durationMinutes: 60,
    price: 150,
    emoji: '🔬',
    description: 'Estimulación de colágeno con micropunciones + radiofrecuencia para reafirmar y rejuvenecer.',
    isVipExclusive: true,
    clinic: 'Clínica Bellezza Alicante',
  },
  {
    id: 't-prp-dermapen',
    name: 'PRP + Dermapen',
    category: 'Facial',
    duration: 75,
    durationMinutes: 75,
    price: 380,
    emoji: '🩸',
    description: 'Regeneración facial con plasma rico en plaquetas e inducción con Dermapen.',
    isVipExclusive: true,
    clinic: 'Clínica Bellezza Alicante',
  },
  {
    id: 't-hilos-tensores',
    name: 'Hilos Tensores Faciales',
    category: 'Medicina Estética',
    duration: 60,
    durationMinutes: 60,
    price: 420,
    emoji: '🧵',
    description: 'Lifting sin cirugía con hilos reabsorbibles para redefinir el óvalo facial.',
    isVipExclusive: true,
    clinic: 'Clínica Bellezza Alicante',
  },
  {
    id: 't-blefaroplastia',
    name: 'Blefaroplastia (cirugía de párpados)',
    category: 'Cirugía Estética',
    duration: 90,
    durationMinutes: 90,
    price: 4500,
    emoji: '👁️',
    description: 'Cirugía estética para rejuvenecer los párpados superiores e inferiores.',
    isVipExclusive: false,
    clinic: 'Clínica Bellezza Alicante',
  },
  {
    id: 't-rinoplastia',
    name: 'Rinoplastia',
    category: 'Cirugía Estética',
    duration: 120,
    durationMinutes: 120,
    price: 6000,
    emoji: '👃',
    description: 'Corrección estética y/o funcional de la nariz bajo anestesia local o general.',
    isVipExclusive: false,
    clinic: 'Clínica Bellezza Alicante',
  },
  {
    id: 't-liposuccion',
    name: 'Liposucción',
    category: 'Cirugía Estética',
    duration: 120,
    durationMinutes: 120,
    price: 5000,
    emoji: '🏋️‍♀️',
    description: 'Extracción de grasa localizada en abdomen, muslos o brazos con resultados visibles.',
    isVipExclusive: true,
    clinic: 'Clínica Bellezza Alicante',
  },
];

async function seed() {
  try {
    console.log('🌱 Iniciando seed de la base de datos...');

    // 1. Crear o encontrar la clínica
    const clinic = await prisma.clinic.upsert({
      where: { email: 'info@clinicabellezza.com' },
      update: {},
      create: {
        name: 'Clínica Bellezza Alicante',
        email: 'info@clinicabellezza.com',
        passwordHash: '$2b$10$example.hash.here', // En producción usar bcrypt real
        phone: '+34 965 123 456',
        address: 'Av. Maisonnave, 25, 03003 Alicante',
        logoUrl: 'https://example.com/logo.jpg',
        brandColors: JSON.stringify({
          primary: '#FF6B9D',
          secondary: '#4ECDC4',
          accent: '#FFE66D'
        }),
        subscriptionPlan: 'PREMIUM',
        subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
        settings: JSON.stringify({
          allowOnlineBooking: true,
          autoConfirmAppointments: false,
          sendReminders: true
        })
      }
    });

    console.log(`✅ Clínica creada: ${clinic.name}`);

    // 2. Crear algunos profesionales
    const professionals = await Promise.all([
      prisma.professional.upsert({
        where: { id: 'prof-dr-martinez' },
        update: {},
        create: {
          id: 'prof-dr-martinez',
          clinicId: clinic.id,
          firstName: 'Ana',
          lastName: 'Martínez',
          specialties: 'Medicina Estética, Cirugía Plástica',
          avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400',
          bio: 'Especialista en medicina estética con más de 15 años de experiencia.',
          rating: 4.9,
          availableHours: JSON.stringify({
            monday: ['09:00', '18:00'],
            tuesday: ['09:00', '18:00'],
            wednesday: ['09:00', '18:00'],
            thursday: ['09:00', '18:00'],
            friday: ['09:00', '16:00']
          }),
          isActive: true
        }
      }),
      prisma.professional.upsert({
        where: { id: 'prof-dr-garcia' },
        update: {},
        create: {
          id: 'prof-dr-garcia',
          clinicId: clinic.id,
          firstName: 'Carlos',
          lastName: 'García',
          specialties: 'Dermatología, Tratamientos Faciales',
          avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
          bio: 'Dermatólogo especializado en tratamientos no invasivos y cuidado de la piel.',
          rating: 4.8,
          availableHours: JSON.stringify({
            monday: ['10:00', '19:00'],
            tuesday: ['10:00', '19:00'],
            wednesday: ['10:00', '19:00'],
            thursday: ['10:00', '19:00'],
            friday: ['10:00', '17:00']
          }),
          isActive: true
        }
      })
    ]);

    console.log(`✅ ${professionals.length} profesionales creados`);

    // 3. Crear los tratamientos
    const treatmentsData = getMockTreatments();
    const createdTreatments = [];

    for (const treatmentData of treatmentsData) {
      const treatment = await prisma.treatment.upsert({
        where: { id: treatmentData.id },
        update: {
          name: treatmentData.name,
          description: treatmentData.description,
          durationMinutes: treatmentData.durationMinutes,
          price: treatmentData.price,
          category: treatmentData.category,
          iconName: emojiToIconMap[treatmentData.emoji] || 'star',
          isVipExclusive: treatmentData.isVipExclusive,
          isActive: true
        },
        create: {
          id: treatmentData.id,
          clinicId: clinic.id,
          name: treatmentData.name,
          description: treatmentData.description,
          durationMinutes: treatmentData.durationMinutes,
          price: treatmentData.price,
          category: treatmentData.category,
          iconName: emojiToIconMap[treatmentData.emoji] || 'star',
          isVipExclusive: treatmentData.isVipExclusive,
          isActive: true
        }
      });

      createdTreatments.push(treatment);
      console.log(`  ✅ Tratamiento: ${treatment.name} (${treatment.price}€)`);
    }

    // 4. Crear algunos wellness tips
    const wellnessTips = [
      {
        id: 'tip-hidratacion',
        title: 'Hidratación diaria',
        content: 'Bebe al menos 8 vasos de agua al día para mantener tu piel hidratada desde el interior.',
        category: 'Cuidado de la Piel',
        iconName: 'droplets'
      },
      {
        id: 'tip-proteccion-solar',
        title: 'Protección solar',
        content: 'Usa protector solar SPF 30+ todos los días, incluso en invierno y días nublados.',
        category: 'Prevención',
        iconName: 'sun'
      },
      {
        id: 'tip-limpieza',
        title: 'Rutina de limpieza',
        content: 'Limpia tu rostro dos veces al día con productos adecuados para tu tipo de piel.',
        category: 'Cuidado de la Piel',
        iconName: 'sparkles'
      },
      {
        id: 'tip-ejercicio',
        title: 'Ejercicio regular',
        content: 'El ejercicio mejora la circulación y ayuda a mantener una piel radiante y saludable.',
        category: 'Bienestar',
        iconName: 'activity'
      }
    ];

    for (const tip of wellnessTips) {
      await prisma.wellnessTip.upsert({
        where: { 
          id: tip.id 
        },
        update: {},
        create: tip
      });
    }

    console.log(`✅ ${wellnessTips.length} consejos de bienestar creados`);

    // 5. Crear algunas ofertas de ejemplo
    const offers = [
      {
        id: 'offer-botox-promo',
        title: '20% OFF en Botox',
        description: 'Descuento especial en tratamiento de Botox para nuevos clientes',
        terms: 'Válido solo para primeras consultas. No acumulable con otras ofertas.',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        originalPrice: 299,
        finalPrice: 239.2,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        targetAudience: 'NEW_CUSTOMERS',
        treatmentIds: JSON.stringify(['t-botox']),
        maxUses: 50,
        maxUsesPerUser: 1,
        category: 'MEDICINA_ESTETICA',
        priority: 1
      },
      {
        id: 'offer-facial-combo',
        title: 'Pack Facial Rejuvenecedor',
        description: 'Mesoterapia + Peeling químico con 30% de descuento',
        terms: 'Los tratamientos deben realizarse en un plazo máximo de 2 meses.',
        discountType: 'PERCENTAGE',
        discountValue: 30,
        originalPrice: 270,
        finalPrice: 189,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 días
        targetAudience: 'ALL',
        treatmentIds: JSON.stringify(['t-mesoterapia', 't-peeling']),
        maxUses: 25,
        maxUsesPerUser: 1,
        category: 'FACIAL',
        priority: 2
      }
    ];

    for (const offer of offers) {
      await prisma.offer.upsert({
        where: { id: offer.id },
        update: {},
        create: {
          ...offer,
          clinicId: clinic.id
        }
      });
    }

    console.log(`✅ ${offers.length} ofertas creadas`);

    // 6. Crear algunas reward templates
    const rewardTemplates = [
      {
        id: 'reward-discount-10',
        name: '10% Descuento',
        description: 'Descuento del 10% en cualquier tratamiento facial',
        type: 'DISCOUNT',
        value: 10,
        pointsCost: 500,
        marginCost: 15.0,
        conditions: JSON.stringify({
          minTreatmentPrice: 100,
          excludeCategories: ['Cirugía Estética']
        }),
        targetUserType: 'ALL',
        popularity: 0.8
      },
      {
        id: 'reward-free-consultation',
        name: 'Consulta Gratuita',
        description: 'Consulta de valoración gratuita con nuestros especialistas',
        type: 'FREE_SERVICE',
        value: 50,
        pointsCost: 200,
        marginCost: 50.0,
        conditions: JSON.stringify({
          newCustomersOnly: true
        }),
        targetUserType: 'NEW',
        popularity: 0.9
      },
      {
        id: 'reward-vip-upgrade',
        name: 'Upgrade a VIP',
        description: 'Tratamiento VIP gratuito: Microneedling + Radiofrecuencia',
        type: 'UPGRADE',
        value: 150,
        pointsCost: 1000,
        marginCost: 75.0,
        conditions: JSON.stringify({
          requiresAppointment: true,
          minLoyaltyPoints: 500
        }),
        targetUserType: 'VIP',
        minLoyaltyScore: 500,
        popularity: 0.6
      }
    ];

    for (const template of rewardTemplates) {
      await prisma.rewardTemplate.upsert({
        where: {
          id: template.id
        },
        update: {},
        create: {
          ...template,
          clinicId: clinic.id
        }
      });
    }

    console.log(`✅ ${rewardTemplates.length} plantillas de recompensas creadas`);

    console.log('\n🎉 Seed completado exitosamente!');
    console.log('\n📊 Resumen:');
    console.log(`  • 1 clínica: ${clinic.name}`);
    console.log(`  • ${professionals.length} profesionales`);
    console.log(`  • ${createdTreatments.length} tratamientos`);
    console.log(`  • ${wellnessTips.length} consejos de bienestar`);
    console.log(`  • ${offers.length} ofertas promocionales`);
    console.log(`  • ${rewardTemplates.length} plantillas de recompensas`);
    
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    throw error;
  }
}

// Función para limpiar la base de datos (opcional)
async function cleanDatabase() {
  console.log('🧹 Limpiando base de datos...');
  
  // Orden importante debido a las relaciones FK
  await prisma.rewardRedemption.deleteMany();
  await prisma.rewardAnalytics.deleteMany();
  await prisma.rewardTemplate.deleteMany();
  await prisma.offerRedemption.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.wellnessTip.deleteMany();
  await prisma.notificationLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.stripeCustomer.deleteMany();
  await prisma.vipSubscription.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.webhookEvent.deleteMany();
  
  console.log('✅ Base de datos limpiada');
}

// Ejecutar el seed
async function main() {
  try {
    // Descomenta la línea siguiente si quieres limpiar antes de hacer seed
    // await cleanDatabase();
    
    await seed();
  } catch (error) {
    console.error('❌ Error en main:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = { seed, cleanDatabase };