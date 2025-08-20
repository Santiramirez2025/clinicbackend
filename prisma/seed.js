// prisma/seed.js - Seed script for initial data
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create System Configs
  console.log('⚙️ Creating system configs...');
  const systemConfigs = [
    {
      key: 'APP_VERSION',
      value: '1.0.0',
      type: 'STRING',
      description: 'Current app version',
      category: 'APP',
      isPublic: true,
      isEditable: false
    },
    {
      key: 'MAINTENANCE_MODE',
      value: 'false',
      type: 'BOOLEAN',
      description: 'Enable/disable maintenance mode',
      category: 'SYSTEM',
      isPublic: true,
      isEditable: true
    },
    {
      key: 'DEFAULT_VIP_DISCOUNT',
      value: '20',
      type: 'NUMBER',
      description: 'Default VIP discount percentage',
      category: 'PRICING',
      isPublic: false,
      isEditable: true
    },
    {
      key: 'BEAUTY_POINTS_PER_EURO',
      value: '10',
      type: 'NUMBER',
      description: 'Beauty points earned per euro spent',
      category: 'LOYALTY',
      isPublic: false,
      isEditable: true
    }
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: config,
      create: config
    });
  }

  // 2. Create Feature Flags
  console.log('🚩 Creating feature flags...');
  const featureFlags = [
    {
      name: 'VIP_PROGRAM',
      description: 'Enable VIP subscription program',
      isEnabled: true,
      environment: 'production'
    },
    {
      name: 'ADVANCED_BOOKING',
      description: 'Enable advanced booking features',
      isEnabled: true,
      environment: 'production',
      targetPercent: 100
    },
    {
      name: 'WELLNESS_TIPS',
      description: 'Show wellness tips in app',
      isEnabled: true,
      environment: 'production'
    },
    {
      name: 'DIGITAL_CONSENT',
      description: 'Enable digital consent forms',
      isEnabled: true,
      environment: 'production'
    },
    {
      name: 'REVIEW_SYSTEM',
      description: 'Enable appointment reviews',
      isEnabled: true,
      environment: 'production'
    }
  ];

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { name: flag.name },
      update: flag,
      create: flag
    });
  }

  // 3. Create Sample Clinic (for testing)
  console.log('🏥 Creating sample clinic...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const sampleClinic = await prisma.clinic.upsert({
    where: { email: 'demo@bellezaestetica.com' },
    update: {},
    create: {
      name: 'Belleza Estética Demo Clinic',
      slug: 'belleza-demo',
      email: 'demo@bellezaestetica.com',
      passwordHash: hashedPassword,
      phone: '+34 900 123 456',
      address: 'Calle de la Belleza, 123',
      city: 'Madrid',
      postalCode: '28001',
      country: 'ES',
      timezone: 'Europe/Madrid',
      businessHours: JSON.stringify({
        monday: { open: '09:00', close: '20:00', isOpen: true },
        tuesday: { open: '09:00', close: '20:00', isOpen: true },
        wednesday: { open: '09:00', close: '20:00', isOpen: true },
        thursday: { open: '09:00', close: '20:00', isOpen: true },
        friday: { open: '09:00', close: '20:00', isOpen: true },
        saturday: { open: '10:00', close: '18:00', isOpen: true },
        sunday: { open: '10:00', close: '16:00', isOpen: false }
      }),
      isActive: true,
      isVerified: true,
      onboardingCompleted: true,
      emailVerified: true,
      subscriptionPlan: 'PREMIUM',
      maxProfessionals: 10,
      maxPatients: 1000,
      enableVipProgram: true,
      enableNotifications: true,
      enableOnlineBooking: true,
      enablePayments: true
    }
  });

  console.log(`✅ Created clinic: ${sampleClinic.name} (ID: ${sampleClinic.id})`);

  // 4. Create Regional Config for Madrid
  await prisma.regionalConfig.upsert({
    where: { clinicId: sampleClinic.id },
    update: {},
    create: {
      clinicId: sampleClinic.id,
      autonomousCommunity: 'Madrid',
      requiresMedicalLicense: true,
      highRiskRequiresDoctor: true,
      mandatoryConsentTypes: JSON.stringify(['INFORMED', 'MEDICAL']),
      minimumConsultationTime: 30,
      allowedTreatmentTypes: JSON.stringify(['LOW', 'MEDIUM', 'HIGH']),
      restrictedTreatmentTypes: JSON.stringify(['MEDICAL']),
      requiredDocumentation: JSON.stringify(['ID', 'MEDICAL_HISTORY'])
    }
  });

  // 5. Create Consent Form Templates
  console.log('📋 Creating consent form templates...');
  const consentTemplates = [
    {
      clinicId: sampleClinic.id,
      name: 'Consentimiento Básico',
      description: 'Formulario de consentimiento para tratamientos de bajo riesgo',
      version: '1.0',
      title: 'Consentimiento para Tratamiento Estético',
      content: '<p>Por la presente, autorizo la realización del tratamiento estético...</p>',
      fields: JSON.stringify(['full_name', 'dni', 'signature', 'date']),
      isActive: true,
      isMandatory: true,
      consentType: 'SIMPLE',
      validFrom: new Date(),
      validUntil: new Date('2025-12-31'),
      requiresWitness: false,
      minimumAge: 18
    },
    {
      clinicId: sampleClinic.id,
      name: 'Consentimiento Informado',
      description: 'Formulario de consentimiento informado para tratamientos de riesgo medio-alto',
      version: '1.0',
      title: 'Consentimiento Informado para Tratamiento Estético',
      content: '<p>He sido informado/a detalladamente sobre...</p>',
      fields: JSON.stringify(['full_name', 'dni', 'medical_history', 'allergies', 'signature', 'date', 'witness_signature']),
      isActive: true,
      isMandatory: true,
      consentType: 'INFORMED',
      validFrom: new Date(),
      validUntil: new Date('2025-12-31'),
      requiresWitness: true,
      minimumAge: 18
    }
  ];

  for (const template of consentTemplates) {
    await prisma.consentFormTemplate.create({
      data: template
    });
  }

  // 6. Create Sample Treatments
  console.log('💉 Creating sample treatments...');
  const treatments = [
    {
      clinicId: sampleClinic.id,
      name: 'Limpieza Facial Básica',
      description: 'Limpieza facial profunda con extracción de impurezas',
      shortDescription: 'Limpieza facial completa',
      category: 'FACIAL',
      subcategory: 'LIMPIEZA',
      riskLevel: 'LOW',
      requiresConsultation: false,
      requiresMedicalStaff: false,
      consentType: 'SIMPLE',
      minimumAge: 16,
      durationMinutes: 60,
      price: 65.00,
      vipPrice: 52.00,
      iconName: 'facial-cleansing',
      color: '#E3F2FD',
      isActive: true,
      isFeatured: true,
      beautyPointsEarned: 65,
      appointmentType: 'DIRECT',
      allowSameDayConsultation: true
    },
    {
      clinicId: sampleClinic.id,
      name: 'Botox Facial',
      description: 'Aplicación de toxina botulínica para reducir arrugas de expresión',
      shortDescription: 'Tratamiento antiarrugas con botox',
      category: 'FACIAL',
      subcategory: 'INYECTABLE',
      riskLevel: 'HIGH',
      requiresConsultation: true,
      requiresMedicalStaff: true,
      consentType: 'INFORMED',
      minimumAge: 25,
      contraindications: JSON.stringify(['embarazo', 'lactancia', 'infecciones_activas']),
      sideEffects: JSON.stringify(['hematomas', 'inflamacion', 'asimetria_temporal']),
      recoveryTime: '2-3 días',
      followUpRequired: true,
      followUpDays: 14,
      durationMinutes: 45,
      price: 280.00,
      vipPrice: 224.00,
      iconName: 'botox',
      color: '#FFF3E0',
      isActive: true,
      isFeatured: true,
      isVipExclusive: false,
      beautyPointsEarned: 280,
      appointmentType: 'CONSULTATION_SEPARATE',
      consultationDuration: 30,
      allowSameDayConsultation: false
    },
    {
      clinicId: sampleClinic.id,
      name: 'Masaje Relajante',
      description: 'Masaje corporal relajante con aceites esenciales',
      shortDescription: 'Masaje relajante completo',
      category: 'CORPORAL',
      subcategory: 'MASAJE',
      riskLevel: 'LOW',
      requiresConsultation: false,
      requiresMedicalStaff: false,
      consentType: 'SIMPLE',
      minimumAge: 18,
      durationMinutes: 90,
      price: 85.00,
      vipPrice: 68.00,
      iconName: 'massage',
      color: '#F1F8E9',
      isActive: true,
      beautyPointsEarned: 85,
      appointmentType: 'DIRECT'
    }
  ];

  for (const treatment of treatments) {
    await prisma.treatment.create({
      data: treatment
    });
  }

  // 7. Create Sample Wellness Tips
  console.log('💡 Creating wellness tips...');
  const wellnessTips = [
    {
      clinicId: sampleClinic.id,
      title: 'Hidratación: La Clave de una Piel Radiante',
      content: 'Mantener la piel hidratada es fundamental para su salud y apariencia. Bebe al menos 8 vasos de agua al día...',
      excerpt: 'Descubre la importancia de la hidratación para tu piel',
      category: 'skincare',
      targetAge: '25-45',
      targetGender: 'ALL',
      iconName: 'water-drop',
      color: '#E3F2FD',
      isActive: true,
      isFeatured: true,
      priority: 1,
      difficulty: 'EASY',
      readTime: 3,
      publishedAt: new Date()
    },
    {
      clinicId: sampleClinic.id,
      title: 'Rutina de Cuidado Nocturno',
      content: 'Una rutina nocturna adecuada puede transformar tu piel mientras duermes...',
      excerpt: 'Aprende a crear la rutina nocturna perfecta',
      category: 'skincare',
      targetAge: '20-60',
      iconName: 'moon',
      color: '#F3E5F5',
      isActive: true,
      difficulty: 'MEDIUM',
      readTime: 5,
      publishedAt: new Date()
    }
  ];

  for (const tip of wellnessTips) {
    await prisma.wellnessTip.create({
      data: tip
    });
  }

  console.log('✅ Database seeding completed successfully!');
  console.log(`
📊 Created:
   • System configs and feature flags
   • Sample clinic: ${sampleClinic.name}
   • ${consentTemplates.length} consent form templates
   • ${treatments.length} sample treatments
   • ${wellnessTips.length} wellness tips
   
🚀 Your database is ready for development!
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });