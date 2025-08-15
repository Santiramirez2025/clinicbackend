const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed básico...');

  // Limpiar datos
  await prisma.patientConsent.deleteMany();
  await prisma.consentFormTemplate.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();

  // Crear clínica
  const clinic = await prisma.clinic.create({
    data: {
      name: 'Belleza Estética Madrid',
      slug: 'madrid-centro',
      email: 'info@bellezaestetica.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      phone: '+34 915 555 123',
      address: 'Calle Gran Vía, 45',
      city: 'Madrid',
      country: 'ES',
      businessHours: JSON.stringify({
        monday: { open: '09:00', close: '20:00', closed: false },
        tuesday: { open: '09:00', close: '20:00', closed: false },
        wednesday: { open: '09:00', close: '20:00', closed: false },
        thursday: { open: '09:00', close: '20:00', closed: false },
        friday: { open: '09:00', close: '20:00', closed: false },
        saturday: { open: '10:00', close: '18:00', closed: false },
        sunday: { open: '00:00', close: '00:00', closed: true }
      }),
      requiresDigitalSignature: true,
      isActive: true,
      isVerified: true,
      onboardingCompleted: true
    }
  });

  // Crear profesional
  const professional = await prisma.professional.create({
    data: {
      clinicId: clinic.id,
      email: 'maria@bellezaestetica.com',
      passwordHash: await bcrypt.hash('prof123', 10),
      firstName: 'María',
      lastName: 'López',
      phone: '+34 666 789 123',
      specialties: JSON.stringify(['Estética Facial', 'Depilación']),
      isActive: true,
      isVerified: true,
      onboardingCompleted: true
    }
  });

  // Crear plantilla de consentimiento básica
  const consentTemplate = await prisma.consentFormTemplate.create({
    data: {
      clinicId: clinic.id,
      name: 'Consentimiento Básico',
      title: 'Consentimiento para Tratamiento Estético',
      content: '<p>Acepto el tratamiento estético propuesto.</p>',
      fields: JSON.stringify([
        { name: 'allergies', type: 'text', required: false, label: 'Alergias' },
        { name: 'emergency_contact', type: 'text', required: true, label: 'Contacto emergencia' }
      ]),
      consentType: 'SIMPLE',
      isActive: true,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  });

  // Crear tratamientos básicos
  const treatments = await Promise.all([
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Limpieza Facial',
        description: 'Limpieza facial profunda',
        shortDescription: 'Limpieza facial',
        category: 'facial',
        subcategory: 'limpieza',
        riskLevel: 'LOW',
        requiresConsultation: false,
        consentType: 'SIMPLE',
        appointmentType: 'DIRECT',
        minimumAge: 16,
        durationMinutes: 60,
        price: 65.0,
        vipPrice: 52.0,
        iconName: 'face-clean',
        color: '#4CAF50',
        contraindications: JSON.stringify(['Acné severo', 'Heridas abiertas']),
        consentFormRequired: true,
        consentFormTemplateId: consentTemplate.id,
        digitalSignatureRequired: false,
        isActive: true,
        beautyPointsEarned: 65,
        tags: JSON.stringify(['facial', 'limpieza']),
        sortOrder: 1
      }
    }),
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Depilación Láser',
        description: 'Depilación láser definitiva',
        shortDescription: 'Depilación láser',
        category: 'depilacion',
        subcategory: 'laser',
        riskLevel: 'MEDIUM',
        requiresConsultation: true,
        consentType: 'INFORMED',
        appointmentType: 'CONSULTATION_TREATMENT',
        minimumAge: 18,
        durationMinutes: 45,
        price: 80.0,
        vipPrice: 64.0,
        iconName: 'laser',
        color: '#E91E63',
        contraindications: JSON.stringify(['Embarazo', 'Bronceado reciente']),
        consentFormRequired: true,
        consentFormTemplateId: consentTemplate.id,
        digitalSignatureRequired: true,
        isActive: true,
        beautyPointsEarned: 80,
        tags: JSON.stringify(['depilacion', 'laser']),
        sortOrder: 2
      }
    })
  ]);

  // Crear usuarios
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'ana@email.com',
        passwordHash: await bcrypt.hash('user123', 10),
        firstName: 'Ana',
        lastName: 'García',
        phone: '+34 666 111 222',
        birthDate: new Date('1985-03-15'),
        gender: 'F',
        hasAllergies: false,
        hasMedicalConditions: false,
        takingMedications: false,
        dataProcessingConsent: true,
        skinType: 'MIXTA',
        beautyPoints: 150,
        loyaltyTier: 'SILVER',
        isActive: true,
        isVerified: true,
        onboardingCompleted: true,
        privacyAccepted: true,
        termsAccepted: true,
        primaryClinicId: clinic.id
      }
    }),
    prisma.user.create({
      data: {
        email: 'laura@email.com',
        passwordHash: await bcrypt.hash('user123', 10),
        firstName: 'Laura',
        lastName: 'Martín',
        phone: '+34 666 333 444',
        birthDate: new Date('1992-07-08'),
        gender: 'F',
        hasAllergies: true,
        allergyDetails: JSON.stringify(['Látex']),
        hasMedicalConditions: false,
        takingMedications: false,
        dataProcessingConsent: true,
        skinType: 'GRASA',
        beautyPoints: 85,
        loyaltyTier: 'BRONZE',
        isActive: true,
        isVerified: true,
        onboardingCompleted: true,
        privacyAccepted: true,
        termsAccepted: true,
        primaryClinicId: clinic.id
      }
    })
  ]);

  // Crear algunos consentimientos
  await prisma.patientConsent.create({
    data: {
      userId: users[0].id,
      treatmentId: treatments[0].id,
      templateId: consentTemplate.id,
      isConsented: true,
      consentedAt: new Date(),
      status: 'APPROVED',
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  });

  // Crear una cita de ejemplo
  await prisma.appointment.create({
    data: {
      userId: users[0].id,
      clinicId: clinic.id,
      professionalId: professional.id,
      treatmentId: treatments[0].id,
      appointmentType: 'DIRECT',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      scheduledTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 11 * 60 * 60 * 1000),
      durationMinutes: 60,
      status: 'CONFIRMED',
      originalPrice: 65.0,
      finalPrice: 65.0,
      consentStatus: 'COMPLETED',
      bookingSource: 'APP'
    }
  });

  console.log('\n✅ Seed completado!');
  console.log('🏥 Clínica:', clinic.email, '/ admin123');
  console.log('👨‍⚕️ Profesional:', professional.email, '/ prof123');
  console.log('👤 Usuarios:');
  users.forEach(user => console.log(`  ${user.email} / user123`));
  console.log('💉 Tratamientos:', treatments.length);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });