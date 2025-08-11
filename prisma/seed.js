const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos de prueba...');

  // ============================================================================
  // 🔄 LIMPIAR DATOS EXISTENTES
  // ============================================================================
  console.log('🧹 Limpiando datos anteriores...');
  
  // Limpiar en orden correcto (relaciones)
  await prisma.appointment.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.clinic.deleteMany();
  
  console.log('✅ Datos anteriores eliminados');

  // ============================================================================
  // 🏥 CREAR CLÍNICA
  // ============================================================================
  console.log('📍 Creando clínica...');
  
  const clinic = await prisma.clinic.create({
    data: {
      name: 'Belleza Estética Madrid',
      slug: 'madrid-centro',
      email: 'info@bellezaesteticamadrid.com',
      passwordHash: await bcrypt.hash('clinic123', 10),
      phone: '+34 91 123 4567',
      address: 'Calle Serrano, 45',
      city: 'Madrid',
      country: 'ES',
      timezone: 'Europe/Madrid',
      businessHours: JSON.stringify({
        lunes: '9:00-20:00',
        martes: '9:00-20:00',
        miercoles: '9:00-20:00',
        jueves: '9:00-20:00',
        viernes: '9:00-20:00',
        sabado: '10:00-18:00',
        domingo: 'cerrado'
      }),
      subscriptionPlan: 'PREMIUM',
      maxProfessionals: 10,
      maxPatients: 500,
      enableVipProgram: true,
      enableNotifications: true,
      enableOnlineBooking: true,
      enablePayments: true,
      isActive: true,
      isVerified: true,
      onboardingCompleted: true
    }
  });

  console.log(`✅ Clínica creada: ${clinic.name} (${clinic.slug})`);

  // ============================================================================
  // 👨‍⚕️ CREAR PROFESIONAL
  // ============================================================================
  console.log('👨‍⚕️ Creando profesional...');
  
  const professional = await prisma.professional.create({
    data: {
      clinicId: clinic.id,
      email: 'maria.lopez@bellezaesteticamadrid.com',
      passwordHash: await bcrypt.hash('maria123', 10),
      role: 'PROFESSIONAL',
      firstName: 'María',
      lastName: 'López',
      phone: '+34 611 234 567',
      licenseNumber: 'EST-2024-001',
      specialties: JSON.stringify([
        'Tratamientos Faciales',
        'Depilación Láser',
        'Mesoterapia',
        'Radiofrecuencia'
      ]),
      certifications: JSON.stringify([
        'Certificación en Estética Avanzada',
        'Especialista en Láser Diodo',
        'Mesoterapia Facial'
      ]),
      experience: 8,
      bio: 'Especialista en tratamientos estéticos faciales con 8 años de experiencia. Certificada en las últimas técnicas de rejuvenecimiento y cuidado de la piel.',
      languages: JSON.stringify(['Español', 'Inglés']),
      employmentType: 'FULL_TIME',
      hourlyRate: 45.00,
      commissionRate: 15.0,
      availableHours: JSON.stringify({
        lunes: ['9:00-13:00', '15:00-19:00'],
        martes: ['9:00-13:00', '15:00-19:00'],
        miercoles: ['9:00-13:00', '15:00-19:00'],
        jueves: ['9:00-13:00', '15:00-19:00'],
        viernes: ['9:00-13:00', '15:00-19:00'],
        sabado: ['10:00-14:00']
      }),
      workingDays: JSON.stringify(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']),
      rating: 4.8,
      totalAppointments: 156,
      totalRevenue: 12480.00,
      patientSatisfaction: 4.9,
      permissions: JSON.stringify(['manage_appointments', 'view_patients', 'update_treatments']),
      canManageSchedule: true,
      canViewReports: false,
      canManagePatients: true,
      canManageTreatments: false,
      isActive: true,
      isVerified: true,
      onboardingCompleted: true
    }
  });

  console.log(`✅ Profesional creado: ${professional.firstName} ${professional.lastName}`);

  // ============================================================================
  // 💉 CREAR TRATAMIENTOS
  // ============================================================================
  console.log('💉 Creando tratamientos...');
  
  const treatments = [
    {
      name: 'Limpieza Facial Profunda',
      description: 'Limpieza facial completa con extracción de comedones, exfoliación y mascarilla hidratante. Incluye análisis de piel personalizado.',
      shortDescription: 'Limpieza facial completa',
      category: 'facial',
      subcategory: 'limpieza',
      durationMinutes: 60,
      price: 65.00,
      vipPrice: 52.00,
      preparationTime: 10,
      iconName: 'face-clean',
      color: '#4CAF50',
      contraindications: JSON.stringify(['Acné activo severo', 'Heridas abiertas', 'Rosácea en brote']),
      requirements: JSON.stringify(['No usar retinoides 48h antes', 'Piel limpia sin maquillaje']),
      aftercareInfo: 'Evitar sol directo 24h. Aplicar protector solar. No usar productos exfoliantes por 2 días.',
      isVipExclusive: false,
      requiresConsultation: false,
      maxSessionsPerMonth: 2,
      beautyPointsEarned: 65,
      isActive: true,
      isFeatured: true,
      isPopular: true,
      tags: JSON.stringify(['limpieza', 'higiene', 'piel grasa', 'comedones']),
      seoTitle: 'Limpieza Facial Profunda Madrid | Belleza Estética',
      seoDescription: 'Limpieza facial profunda en Madrid. Extracción de comedones y tratamiento personalizado.',
      sortOrder: 1
    },
    {
      name: 'Radiofrecuencia Facial Antiedad',
      description: 'Tratamiento no invasivo que estimula la producción de colágeno mediante ondas de radiofrecuencia. Reduce arrugas, flacidez y mejora la firmeza de la piel.',
      shortDescription: 'Antiedad con radiofrecuencia',
      category: 'facial',
      subcategory: 'antiedad',
      durationMinutes: 45,
      price: 120.00,
      vipPrice: 96.00,
      preparationTime: 15,
      iconName: 'anti-aging',
      color: '#FF9800',
      contraindications: JSON.stringify(['Embarazo', 'Marcapasos', 'Implantes metálicos en la zona', 'Cáncer activo']),
      requirements: JSON.stringify(['Consulta previa', 'Piel sin lesiones']),
      aftercareInfo: 'Hidratar bien la zona. Evitar calor extremo 24h. Usar protector solar.',
      isVipExclusive: false,
      requiresConsultation: true,
      maxSessionsPerMonth: 4,
      beautyPointsEarned: 120,
      isActive: true,
      isFeatured: true,
      isNew: false,
      tags: JSON.stringify(['antiedad', 'radiofrecuencia', 'lifting', 'firmeza']),
      sortOrder: 2
    },
    {
      name: 'Depilación Láser Diodo',
      description: 'Depilación láser de última generación con tecnología diodo. Segura y eficaz para todo tipo de piel, incluso bronceada.',
      shortDescription: 'Depilación láser definitiva',
      category: 'depilacion',
      subcategory: 'laser',
      durationMinutes: 30,
      price: 80.00,
      vipPrice: 64.00,
      preparationTime: 5,
      iconName: 'laser-hair',
      color: '#9C27B0',
      contraindications: JSON.stringify(['Embarazo', 'Medicación fotosensibilizante', 'Cáncer de piel', 'Herpes activo']),
      requirements: JSON.stringify(['Afeitar zona 24h antes', 'No depilación con cera 4 semanas antes', 'Evitar sol 2 semanas']),
      aftercareInfo: 'No exponer al sol 48h. Aplicar crema hidratante. Evitar perfumes en la zona.',
      isVipExclusive: false,
      requiresConsultation: false,
      maxSessionsPerMonth: 1,
      beautyPointsEarned: 80,
      isActive: true,
      isFeatured: false,
      isPopular: true,
      tags: JSON.stringify(['depilacion', 'laser', 'definitiva', 'diodo']),
      sortOrder: 3
    },
    {
      name: 'HydraFacial con Ácido Hialurónico',
      description: 'Tratamiento de hidratación intensiva que combina limpieza, exfoliación e hidratación profunda con ácido hialurónico de bajo peso molecular.',
      shortDescription: 'Hidratación facial intensiva',
      category: 'facial',
      subcategory: 'hidratacion',
      durationMinutes: 50,
      price: 95.00,
      vipPrice: 76.00,
      preparationTime: 10,
      iconName: 'hydration',
      color: '#2196F3',
      contraindications: JSON.stringify(['Alergia al ácido hialurónico', 'Heridas abiertas', 'Infecciones activas']),
      requirements: JSON.stringify(['Piel limpia', 'No usar productos activos 24h antes']),
      aftercareInfo: 'Hidratar regularmente. Usar protector solar. Evitar ejercicio intenso 4h.',
      isVipExclusive: false,
      requiresConsultation: false,
      maxSessionsPerMonth: 3,
      beautyPointsEarned: 95,
      isActive: true,
      isFeatured: true,
      isNew: false,
      tags: JSON.stringify(['hidratacion', 'acido hialuronico', 'hydrafacial', 'luminosidad']),
      sortOrder: 4
    },
    {
      name: 'Mesoterapia Facial Vitamínica',
      description: 'Inyección de vitaminas, minerales y ácido hialurónico para revitalizar y rejuvenecer la piel del rostro. Mejora textura, luminosidad y firmeza.',
      shortDescription: 'Mesoterapia revitalizante',
      category: 'facial',
      subcategory: 'mesoterapia',
      durationMinutes: 40,
      price: 150.00,
      vipPrice: 120.00,
      preparationTime: 15,
      iconName: 'mesotherapy',
      color: '#E91E63',
      contraindications: JSON.stringify(['Embarazo', 'Lactancia', 'Anticoagulantes', 'Alergia a componentes']),
      requirements: JSON.stringify(['Consulta médica previa', 'No aspirinas 5 días antes', 'Consentimiento informado']),
      aftercareInfo: 'No masajear zona 24h. Evitar maquillaje 6h. Aplicar hielo si hay inflamación.',
      isVipExclusive: false,
      requiresConsultation: true,
      maxSessionsPerMonth: 2,
      beautyPointsEarned: 150,
      isActive: true,
      isFeatured: false,
      isNew: true,
      tags: JSON.stringify(['mesoterapia', 'vitaminas', 'revitalizante', 'inyectable']),
      sortOrder: 5
    },
    {
      name: 'Peeling Químico Glycolic',
      description: 'Peeling con ácido glicólico para renovar la piel, reducir manchas, cicatrices de acné y mejorar la textura general.',
      shortDescription: 'Renovación con ácido glicólico',
      category: 'facial',
      subcategory: 'peeling',
      durationMinutes: 35,
      price: 85.00,
      vipPrice: 68.00,
      preparationTime: 10,
      iconName: 'chemical-peel',
      color: '#FFC107',
      contraindications: JSON.stringify(['Embarazo', 'Herpes activo', 'Uso de retinoides', 'Piel muy sensible']),
      requirements: JSON.stringify(['Preparación previa 15 días', 'Test de sensibilidad', 'Protector solar obligatorio']),
      aftercareInfo: 'No exposición solar 7 días. Hidratar intensamente. No exfoliar hasta descamación completa.',
      isVipExclusive: false,
      requiresConsultation: true,
      maxSessionsPerMonth: 1,
      beautyPointsEarned: 85,
      isActive: true,
      isFeatured: false,
      isPopular: false,
      tags: JSON.stringify(['peeling', 'acido glicolico', 'manchas', 'renovacion']),
      sortOrder: 6
    },
    {
      name: 'Tratamiento Corporal Reafirmante',
      description: 'Tratamiento corporal con radiofrecuencia y cavitación para reafirmar tejidos, reducir celulitis y mejorar contorno corporal.',
      shortDescription: 'Reafirmante corporal integral',
      category: 'corporal',
      subcategory: 'reafirmante',
      durationMinutes: 75,
      price: 110.00,
      vipPrice: 88.00,
      preparationTime: 10,
      iconName: 'body-firming',
      color: '#607D8B',
      contraindications: JSON.stringify(['Embarazo', 'Marcapasos', 'Varices severas', 'Trombosis']),
      requirements: JSON.stringify(['Consulta previa', 'Hidratación abundante pre-tratamiento']),
      aftercareInfo: 'Beber mucha agua. Realizar drenaje linfático suave. Evitar calor intenso 24h.',
      isVipExclusive: true,
      requiresConsultation: true,
      maxSessionsPerMonth: 2,
      beautyPointsEarned: 110,
      isActive: true,
      isFeatured: true,
      isNew: false,
      tags: JSON.stringify(['corporal', 'reafirmante', 'celulitis', 'contorno']),
      sortOrder: 7
    }
  ];

  const createdTreatments = [];
  for (const treatmentData of treatments) {
    const treatment = await prisma.treatment.create({
      data: {
        ...treatmentData,
        clinicId: clinic.id
      }
    });
    createdTreatments.push(treatment);
    console.log(`   ✅ ${treatment.name} - €${treatment.price}`);
  }

  // ============================================================================
  // 👥 CREAR USUARIOS DE PRUEBA
  // ============================================================================
  console.log('👥 Creando usuarios de prueba...');
  
  const users = [
    {
      email: 'ana.garcia@example.com',
      firstName: 'Ana',
      lastName: 'García',
      phone: '+34 612 345 678',
      birthDate: new Date('1988-05-15'),
      gender: 'F',
      skinType: 'mixta',
      allergies: JSON.stringify(['Níquel']),
      medicalConditions: JSON.stringify([]),
      treatmentPreferences: JSON.stringify(['Tratamientos faciales', 'Depilación láser']),
      beautyPoints: 250,
      totalInvestment: 340.00,
      sessionsCompleted: 3,
      loyaltyTier: 'SILVER',
      vipStatus: false,
      emailNotifications: true,
      smsNotifications: false,
      marketingNotifications: true,
      isActive: true,
      isVerified: true,
      onboardingCompleted: true,
      privacyAccepted: true,
      termsAccepted: true,
      marketingAccepted: true
    },
    {
      email: 'carmen.rodriguez@example.com',
      firstName: 'Carmen',
      lastName: 'Rodríguez',
      phone: '+34 623 456 789',
      birthDate: new Date('1982-09-22'),
      gender: 'F',
      skinType: 'seca',
      allergies: JSON.stringify([]),
      medicalConditions: JSON.stringify(['Rosácea leve']),
      treatmentPreferences: JSON.stringify(['Hidratación facial', 'Mesoterapia']),
      beautyPoints: 850,
      totalInvestment: 1240.00,
      sessionsCompleted: 8,
      loyaltyTier: 'GOLD',
      vipStatus: true,
      emailNotifications: true,
      smsNotifications: true,
      marketingNotifications: true,
      isActive: true,
      isVerified: true,
      onboardingCompleted: true,
      privacyAccepted: true,
      termsAccepted: true,
      marketingAccepted: true
    },
    {
      email: 'lucia.martin@example.com',
      firstName: 'Lucía',
      lastName: 'Martín',
      phone: '+34 634 567 890',
      birthDate: new Date('1995-03-08'),
      gender: 'F',
      skinType: 'grasa',
      allergies: JSON.stringify(['Parabenos']),
      medicalConditions: JSON.stringify([]),
      treatmentPreferences: JSON.stringify(['Limpieza facial', 'Peeling químico']),
      beautyPoints: 120,
      totalInvestment: 150.00,
      sessionsCompleted: 1,
      loyaltyTier: 'BRONZE',
      vipStatus: false,
      emailNotifications: true,
      smsNotifications: false,
      marketingNotifications: false,
      isActive: true,
      isVerified: true,
      onboardingCompleted: true,
      privacyAccepted: true,
      termsAccepted: true,
      marketingAccepted: false
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.create({
      data: {
        ...userData,
        passwordHash: await bcrypt.hash('demo123', 10),
        primaryClinicId: clinic.id
      }
    });
    createdUsers.push(user);
    console.log(`   ✅ ${user.firstName} ${user.lastName} (${user.loyaltyTier})`);
  }

  // ============================================================================
  // 📅 CREAR CITAS DE EJEMPLO
  // ============================================================================
  console.log('📅 Creando citas de ejemplo...');
  
  // Cita pasada (completada)
  const pastAppointment = await prisma.appointment.create({
    data: {
      userId: createdUsers[0].id,
      clinicId: clinic.id,
      professionalId: professional.id,
      treatmentId: createdTreatments[0].id, // Limpieza facial
      scheduledDate: new Date('2025-01-15'),
      scheduledTime: new Date('2025-01-15T10:00:00Z'),
      endTime: new Date('2025-01-15T11:00:00Z'),
      durationMinutes: 60,
      status: 'COMPLETED',
      priority: 'NORMAL',
      notes: 'Primera visita - piel mixta con tendencia grasa en zona T',
      professionalNotes: 'Respondió muy bien al tratamiento. Recomendar rutina domiciliaria.',
      originalPrice: 65.00,
      finalPrice: 65.00,
      discountApplied: 0,
      beautyPointsEarned: 65,
      beautyPointsUsed: 0,
      reminderSent: true,
      confirmationSent: true,
      followUpSent: true,
      bookingSource: 'APP',
      isFirstVisit: true,
      confirmedAt: new Date('2025-01-14T09:00:00Z'),
      startedAt: new Date('2025-01-15T10:00:00Z'),
      completedAt: new Date('2025-01-15T11:00:00Z')
    }
  });

  // Cita próxima (confirmada)
  const upcomingAppointment = await prisma.appointment.create({
    data: {
      userId: createdUsers[1].id,
      clinicId: clinic.id,
      professionalId: professional.id,
      treatmentId: createdTreatments[1].id, // Radiofrecuencia
      scheduledDate: new Date('2025-08-15'),
      scheduledTime: new Date('2025-08-15T16:00:00Z'),
      endTime: new Date('2025-08-15T16:45:00Z'),
      durationMinutes: 45,
      status: 'CONFIRMED',
      priority: 'NORMAL',
      notes: 'Segunda sesión de radiofrecuencia - continuar tratamiento antiedad',
      originalPrice: 120.00,
      finalPrice: 96.00, // Precio VIP
      discountApplied: 24.00,
      beautyPointsEarned: 120,
      beautyPointsUsed: 0,
      reminderSent: false,
      confirmationSent: true,
      followUpSent: false,
      bookingSource: 'APP',
      isFirstVisit: false,
      confirmedAt: new Date('2025-08-10T14:30:00Z')
    }
  });

  console.log(`   ✅ Cita pasada: ${pastAppointment.status}`);
  console.log(`   ✅ Cita próxima: ${upcomingAppointment.status}`);

  // ============================================================================
  // 🎁 CREAR OFERTAS ESPECIALES
  // ============================================================================
  console.log('🎁 Creando ofertas especiales...');
  
  const offers = [
    {
      title: 'Primera Visita 50% Descuento',
      description: 'Descuento especial del 50% en tu primera limpieza facial. Válido para nuevos clientes.',
      shortDescription: '50% OFF primera visita',
      terms: 'Válido solo para nuevos clientes. No acumulable con otras ofertas. Cita previa necesaria.',
      discountType: 'PERCENTAGE',
      discountValue: 50.0,
      originalPrice: 65.00,
      finalPrice: 32.50,
      validFrom: new Date('2025-08-01'),
      validUntil: new Date('2025-12-31'),
      targetAudience: 'NEW_CUSTOMERS',
      treatmentIds: JSON.stringify([createdTreatments[0].id]),
      maxUses: 100,
      maxUsesPerUser: 1,
      currentUses: 0,
      imageUrl: null,
      backgroundColor: '#4CAF50',
      textColor: '#FFFFFF',
      priority: 1,
      category: 'GENERAL',
      sendNotification: true,
      isActive: true,
      isFeatured: true,
      autoApply: false,
      code: 'PRIMERA50'
    },
    {
      title: 'Pack 3 Sesiones Radiofrecuencia',
      description: 'Ahorra €60 comprando un pack de 3 sesiones de radiofrecuencia facial. Resultados visibles garantizados.',
      shortDescription: 'Pack 3 sesiones',
      terms: 'Válido por 6 meses desde la compra. Las sesiones deben espaciarse mínimo 15 días.',
      discountType: 'FIXED_AMOUNT',
      discountValue: 60.0,
      originalPrice: 360.00,
      finalPrice: 300.00,
      validFrom: new Date('2025-08-01'),
      validUntil: new Date('2026-02-28'),
      targetAudience: 'ALL',
      treatmentIds: JSON.stringify([createdTreatments[1].id]),
      maxUses: 50,
      maxUsesPerUser: 2,
      currentUses: 0,
      imageUrl: null,
      backgroundColor: '#FF9800',
      textColor: '#FFFFFF',
      priority: 1,
      category: 'VIP',
      sendNotification: true,
      isActive: true,
      isFeatured: true,
      autoApply: false,
      code: 'PACK3RF'
    }
  ];

  for (const offerData of offers) {
    const offer = await prisma.offer.create({
      data: {
        ...offerData,
        clinicId: clinic.id
      }
    });
    console.log(`   ✅ ${offer.title} - ${offer.discountValue}% OFF`);
  }

  // ============================================================================
  // ✨ RESUMEN FINAL
  // ============================================================================
  console.log('\n🎉 ¡Seed completado exitosamente!');
  console.log('=====================================');
  console.log(`🏥 Clínica: ${clinic.name}`);
  console.log(`👨‍⚕️ Profesionales: 1`);
  console.log(`💉 Tratamientos: ${createdTreatments.length}`);
  console.log(`👥 Usuarios: ${createdUsers.length}`);
  console.log(`📅 Citas: 2`);
  console.log(`🎁 Ofertas: ${offers.length}`);
  console.log('=====================================');
  console.log('\n📱 Credenciales de prueba:');
  console.log('👤 USUARIOS:');
  console.log('   Email: ana.garcia@example.com');
  console.log('   Email: carmen.rodriguez@example.com (VIP)');
  console.log('   Email: lucia.martin@example.com');
  console.log('   Password: demo123');
  console.log('\n👨‍⚕️ PROFESIONAL:');
  console.log('   Email: maria.lopez@bellezaesteticamadrid.com');
  console.log('   Password: maria123');
  console.log('\n🏥 CLÍNICA:');
  console.log('   Slug: madrid-centro');
  console.log('   Email: info@bellezaesteticamadrid.com');
  console.log('   Password: clinic123');
  console.log('\n🚀 ¡Tu app está lista para testing!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });