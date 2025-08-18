const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed completo para clínica estética española...');

  // Limpiar datos
  await prisma.patientConsent.deleteMany();
  await prisma.consentFormTemplate.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.treatment.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();

  // ============================================================================
  // 🏥 CREAR CLÍNICAS
  // ============================================================================
  const clinics = await Promise.all([
    prisma.clinic.create({
      data: {
        name: 'Clínica Madrid Centro',
        slug: 'madrid-centro',
        email: 'info@bellezaestetica.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        phone: '+34 91 123 4567',
        address: 'Calle Gran Vía, 28, Madrid',
        city: 'Madrid',
        country: 'ES',
        businessHours: JSON.stringify({
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '09:00', close: '16:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true }
        }),
        medicalLicense: 'CS-ES-001-2024',
        healthRegistration: 'RS-MAD-001',
        autonomousCommunity: 'Madrid',
        requiresDigitalSignature: false,
        allowsDirectBookingHighRisk: false,
        consultationMinimumTime: 30,
        isActive: true,
        isVerified: true,
        onboardingCompleted: true,
        enableVipProgram: true,
        enableOnlineBooking: true
      }
    }),
    prisma.clinic.create({
      data: {
        name: 'Estética Barcelona',
        slug: 'barcelona-centro',
        email: 'info@esteticabcn.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        phone: '+34 93 456 7890',
        address: 'Passeig de Gràcia, 15, Barcelona',
        city: 'Barcelona',
        country: 'ES',
        businessHours: JSON.stringify({
          monday: { open: '10:00', close: '19:00', closed: false },
          tuesday: { open: '10:00', close: '19:00', closed: false },
          wednesday: { open: '10:00', close: '19:00', closed: false },
          thursday: { open: '10:00', close: '19:00', closed: false },
          friday: { open: '10:00', close: '19:00', closed: false },
          saturday: { open: '10:00', close: '17:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true }
        }),
        isActive: true,
        isVerified: true,
        onboardingCompleted: true
      }
    }),
    prisma.clinic.create({
      data: {
        name: 'Valencia Wellness',
        slug: 'valencia-centro',
        email: 'hola@valenciawellness.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        phone: '+34 96 789 0123',
        address: 'Calle Colón, 42, Valencia',
        city: 'Valencia',
        country: 'ES',
        businessHours: JSON.stringify({
          monday: { open: '09:30', close: '18:30', closed: false },
          tuesday: { open: '09:30', close: '18:30', closed: false },
          wednesday: { open: '09:30', close: '18:30', closed: false },
          thursday: { open: '09:30', close: '18:30', closed: false },
          friday: { open: '09:30', close: '18:30', closed: false },
          saturday: { open: '10:00', close: '15:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true }
        }),
        isActive: true,
        isVerified: true,
        onboardingCompleted: true
      }
    })
  ]);

  const clinic = clinics[0]; // Usar Madrid Centro como principal

  // ============================================================================
  // 👨‍⚕️ CREAR PROFESIONALES DIVERSOS
  // ============================================================================
  const professionals = await Promise.all([
    prisma.professional.create({
      data: {
        clinicId: clinic.id,
        email: 'dra.garcia@bellezaestetica.com',
        passwordHash: await bcrypt.hash('prof123', 10),
        firstName: 'María',
        lastName: 'García',
        phone: '+34 666 100 200',
        licenseNumber: 'COL-28-001234',
        specialties: JSON.stringify(['Medicina Estética', 'Dermatología Cosmética']),
        certifications: JSON.stringify(['Mesoterapia', 'Rellenos Dérmicos', 'Toxina Botulínica']),
        experience: 8,
        bio: 'Especialista en medicina estética con más de 8 años de experiencia.',
        languages: JSON.stringify(['Español', 'Inglés']),
        employmentType: 'FULL_TIME',
        rating: 4.9,
        isActive: true,
        isVerified: true,
        onboardingCompleted: true,
        canManageSchedule: true
      }
    }),
    prisma.professional.create({
      data: {
        clinicId: clinic.id,
        email: 'carlos.rodriguez@bellezaestetica.com',
        passwordHash: await bcrypt.hash('prof123', 10),
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        phone: '+34 666 300 400',
        licenseNumber: 'COL-28-005678',
        specialties: JSON.stringify(['Fisioterapia Estética', 'Drenaje Linfático']),
        certifications: JSON.stringify(['Radiofrecuencia', 'Cavitación', 'Presoterapia']),
        experience: 5,
        bio: 'Fisioterapeuta especializado en tratamientos corporales no invasivos.',
        languages: JSON.stringify(['Español']),
        employmentType: 'FULL_TIME',
        rating: 4.7,
        isActive: true,
        isVerified: true,
        onboardingCompleted: true
      }
    }),
    prisma.professional.create({
      data: {
        clinicId: clinic.id,
        email: 'laura.martin@bellezaestetica.com',
        passwordHash: await bcrypt.hash('prof123', 10),
        firstName: 'Laura',
        lastName: 'Martín',
        phone: '+34 666 500 600',
        specialties: JSON.stringify(['Estética Facial', 'Micropigmentación']),
        certifications: JSON.stringify(['HydraFacial', 'Microblading', 'Laminado de Cejas']),
        experience: 6,
        bio: 'Esteticista especializada en tratamientos faciales y micropigmentación.',
        languages: JSON.stringify(['Español', 'Francés']),
        employmentType: 'PART_TIME',
        rating: 4.8,
        isActive: true,
        isVerified: true,
        onboardingCompleted: true
      }
    }),
    prisma.professional.create({
      data: {
        clinicId: clinic.id,
        email: 'ana.lopez@bellezaestetica.com',
        passwordHash: await bcrypt.hash('prof123', 10),
        firstName: 'Ana',
        lastName: 'López',
        phone: '+34 666 700 800',
        specialties: JSON.stringify(['Depilación Láser', 'Tratamientos Corporales']),
        certifications: JSON.stringify(['Láser Diodo', 'IPL', 'Criolipólisis']),
        experience: 4,
        bio: 'Técnica en depilación láser y tratamientos reductivos corporales.',
        languages: JSON.stringify(['Español', 'Inglés']),
        employmentType: 'FULL_TIME',
        rating: 4.6,
        isActive: true,
        isVerified: true,
        onboardingCompleted: true
      }
    })
  ]);

  // ============================================================================
  // 📋 PLANTILLAS DE CONSENTIMIENTO
  // ============================================================================
  const consentTemplates = await Promise.all([
    prisma.consentFormTemplate.create({
      data: {
        clinicId: clinic.id,
        name: 'Consentimiento Básico',
        description: 'Para tratamientos de bajo riesgo',
        title: 'Consentimiento Informado - Tratamiento Estético',
        content: '<p>Declaro que he sido informado/a sobre el tratamiento a realizar y acepto las condiciones.</p>',
        fields: JSON.stringify([
          { name: 'allergies', type: 'text', required: false, label: 'Alergias conocidas' },
          { name: 'medications', type: 'text', required: false, label: 'Medicamentos actuales' },
          { name: 'emergency_contact', type: 'text', required: true, label: 'Contacto de emergencia' }
        ]),
        consentType: 'SIMPLE',
        isActive: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.consentFormTemplate.create({
      data: {
        clinicId: clinic.id,
        name: 'Consentimiento Médico',
        description: 'Para medicina estética y tratamientos invasivos',
        title: 'Consentimiento Informado - Medicina Estética',
        content: '<p>Acepto el tratamiento de medicina estética tras haber sido informado/a de los riesgos y beneficios.</p>',
        fields: JSON.stringify([
          { name: 'medical_history', type: 'textarea', required: true, label: 'Historial médico' },
          { name: 'allergies', type: 'text', required: true, label: 'Alergias' },
          { name: 'medications', type: 'text', required: true, label: 'Medicamentos' },
          { name: 'pregnancy', type: 'radio', required: true, label: '¿Embarazada?', options: ['Sí', 'No'] }
        ]),
        consentType: 'MEDICAL',
        isActive: true,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    })
  ]);

  // ============================================================================
  // 💉 TRATAMIENTOS CLÁSICOS ESPAÑOLES
  // ============================================================================
  const treatments = await Promise.all([
    // FACIALES
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Limpieza Facial Profunda',
        description: 'Limpieza facial completa con extracción de comedones, exfoliación y mascarilla purificante.',
        shortDescription: 'Limpieza facial profunda con extracción',
        category: 'facial',
        subcategory: 'limpieza',
        riskLevel: 'LOW',
        requiresConsultation: false,
        consentType: 'SIMPLE',
        appointmentType: 'DIRECT',
        minimumAge: 14,
        durationMinutes: 75,
        price: 65.0,
        vipPrice: 52.0,
        iconName: 'face-clean',
        color: '#4CAF50',
        contraindications: JSON.stringify(['Acné severo activo', 'Heridas abiertas', 'Dermatitis']),
        sideEffects: JSON.stringify(['Enrojecimiento temporal', 'Ligera sensibilidad']),
        recoveryTime: '0-24 horas',
        consentFormRequired: true,
        consentFormTemplateId: consentTemplates[0].id,
        isActive: true,
        isFeatured: true,
        isPopular: true,
        beautyPointsEarned: 65,
        tags: JSON.stringify(['facial', 'limpieza', 'extracción']),
        sortOrder: 1
      }
    }),
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'HydraFacial MD',
        description: 'Tratamiento facial de hidratación profunda con tecnología patentada que limpia, extrae e hidrata.',
        shortDescription: 'Hidratación facial con tecnología avanzada',
        category: 'facial',
        subcategory: 'hidratacion',
        riskLevel: 'LOW',
        requiresConsultation: false,
        consentType: 'SIMPLE',
        appointmentType: 'DIRECT',
        minimumAge: 16,
        durationMinutes: 60,
        price: 120.0,
        vipPrice: 96.0,
        iconName: 'water-drop',
        color: '#2196F3',
        contraindications: JSON.stringify(['Embarazo', 'Piel muy sensible']),
        sideEffects: JSON.stringify(['Enrojecimiento mínimo']),
        recoveryTime: 'Inmediato',
        consentFormRequired: true,
        consentFormTemplateId: consentTemplates[0].id,
        isActive: true,
        isFeatured: true,
        beautyPointsEarned: 120,
        tags: JSON.stringify(['facial', 'hidratación', 'hydrafacial']),
        sortOrder: 2
      }
    }),
    
    // DEPILACIÓN
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Depilación Láser Diodo - Zona Pequeña',
        description: 'Depilación láser definitiva con tecnología diodo en zonas pequeñas (labio superior, barbilla, axilas).',
        shortDescription: 'Láser diodo en zona pequeña',
        category: 'depilacion',
        subcategory: 'laser',
        riskLevel: 'MEDIUM',
        requiresConsultation: true,
        consentType: 'INFORMED',
        appointmentType: 'CONSULTATION_TREATMENT',
        minimumAge: 18,
        durationMinutes: 30,
        price: 45.0,
        vipPrice: 36.0,
        iconName: 'laser',
        color: '#E91E63',
        contraindications: JSON.stringify(['Embarazo', 'Bronceado reciente', 'Medicación fotosensibilizante']),
        sideEffects: JSON.stringify(['Enrojecimiento temporal', 'Inflamación leve']),
        recoveryTime: '1-3 días',
        consentFormRequired: true,
        consentFormTemplateId: consentTemplates[1].id,
        digitalSignatureRequired: true,
        isActive: true,
        isPopular: true,
        beautyPointsEarned: 45,
        tags: JSON.stringify(['depilación', 'láser', 'zona pequeña']),
        sortOrder: 3
      }
    }),
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Depilación Láser Diodo - Piernas Completas',
        description: 'Depilación láser definitiva de piernas completas con tecnología diodo de última generación.',
        shortDescription: 'Láser diodo piernas completas',
        category: 'depilacion',
        subcategory: 'laser',
        riskLevel: 'MEDIUM',
        requiresConsultation: true,
        consentType: 'INFORMED',
        appointmentType: 'CONSULTATION_TREATMENT',
        minimumAge: 18,
        durationMinutes: 90,
        price: 180.0,
        vipPrice: 144.0,
        iconName: 'laser',
        color: '#E91E63',
        contraindications: JSON.stringify(['Embarazo', 'Bronceado reciente']),
        sideEffects: JSON.stringify(['Enrojecimiento temporal']),
        recoveryTime: '1-3 días',
        consentFormRequired: true,
        consentFormTemplateId: consentTemplates[1].id,
        digitalSignatureRequired: true,
        isActive: true,
        beautyPointsEarned: 180,
        tags: JSON.stringify(['depilación', 'láser', 'piernas']),
        sortOrder: 4
      }
    }),

    // MEDICINA ESTÉTICA
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Toxina Botulínica - Arrugas de Expresión',
        description: 'Aplicación de toxina botulínica para suavizar arrugas de expresión en frente, entrecejo y patas de gallo.',
        shortDescription: 'Bótox para arrugas de expresión',
        category: 'medicina-estetica',
        subcategory: 'toxina-botulinica',
        riskLevel: 'HIGH',
        requiresConsultation: true,
        requiresMedicalStaff: true,
        consentType: 'MEDICAL',
        appointmentType: 'CONSULTATION_SEPARATE',
        minimumAge: 25,
        durationMinutes: 45,
        price: 280.0,
        vipPrice: 224.0,
        iconName: 'syringe',
        color: '#9C27B0',
        contraindications: JSON.stringify(['Embarazo', 'Lactancia', 'Enfermedades neuromusculares']),
        sideEffects: JSON.stringify(['Hematomas leves', 'Dolor en zona aplicación', 'Cefalea temporal']),
        recoveryTime: '3-7 días',
        consentFormRequired: true,
        consentFormTemplateId: consentTemplates[1].id,
        digitalSignatureRequired: true,
        followUpRequired: true,
        isActive: true,
        isVipExclusive: true,
        beautyPointsEarned: 280,
        tags: JSON.stringify(['medicina estética', 'bótox', 'antiarrugas']),
        sortOrder: 5
      }
    }),
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Ácido Hialurónico - Relleno Labial',
        description: 'Aumento y perfilado de labios con ácido hialurónico de última generación.',
        shortDescription: 'Relleno labial con ácido hialurónico',
        category: 'medicina-estetica',
        subcategory: 'rellenos',
        riskLevel: 'HIGH',
        requiresConsultation: true,
        requiresMedicalStaff: true,
        consentType: 'MEDICAL',
        appointmentType: 'CONSULTATION_SEPARATE',
        minimumAge: 21,
        durationMinutes: 60,
        price: 350.0,
        vipPrice: 280.0,
        iconName: 'lips',
        color: '#FF5722',
        contraindications: JSON.stringify(['Embarazo', 'Lactancia', 'Herpes labial activo', 'Alergias al ácido hialurónico']),
        sideEffects: JSON.stringify(['Hinchazón', 'Hematomas', 'Asimetría temporal']),
        recoveryTime: '7-14 días',
        consentFormRequired: true,
        consentFormTemplateId: consentTemplates[1].id,
        digitalSignatureRequired: true,
        followUpRequired: true,
        isActive: true,
        isFeatured: true,
        isVipExclusive: true,
        beautyPointsEarned: 350,
        tags: JSON.stringify(['medicina estética', 'rellenos', 'labios']),
        sortOrder: 6
      }
    }),

    // CORPORALES
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Radiofrecuencia Corporal',
        description: 'Tratamiento reafirmante corporal con radiofrecuencia para mejorar la flacidez y celulitis.',
        shortDescription: 'Radiofrecuencia reafirmante corporal',
        category: 'corporal',
        subcategory: 'reafirmante',
        riskLevel: 'LOW',
        requiresConsultation: false,
        consentType: 'SIMPLE',
        appointmentType: 'DIRECT',
        minimumAge: 18,
        durationMinutes: 60,
        price: 95.0,
        vipPrice: 76.0,
        iconName: 'waves',
        color: '#FF9800',
        contraindications: JSON.stringify(['Embarazo', 'Marcapasos', 'Implantes metálicos']),
        sideEffects: JSON.stringify(['Enrojecimiento temporal', 'Sensación de calor']),
        recoveryTime: 'Inmediato',
        consentFormRequired: true,
        consentFormTemplateId: consentTemplates[0].id,
        isActive: true,
        beautyPointsEarned: 95,
        tags: JSON.stringify(['corporal', 'radiofrecuencia', 'reafirmante']),
        sortOrder: 7
      }
    }),
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Presoterapia',
        description: 'Drenaje linfático mecánico para mejorar la circulación y reducir la retención de líquidos.',
        shortDescription: 'Drenaje linfático con presoterapia',
        category: 'corporal',
        subcategory: 'drenaje',
        riskLevel: 'LOW',
        requiresConsultation: false,
        consentType: 'SIMPLE',
        appointmentType: 'DIRECT',
        minimumAge: 16,
        durationMinutes: 45,
        price: 55.0,
        vipPrice: 44.0,
        iconName: 'air',
        color: '#00BCD4',
        contraindications: JSON.stringify(['Trombosis', 'Insuficiencia cardíaca', 'Infecciones']),
        sideEffects: JSON.stringify(['Ligero mareo', 'Sensación de relajación']),
        recoveryTime: 'Inmediato',
        consentFormRequired: true,
        consentFormTemplateId: consentTemplates[0].id,
        isActive: true,
        beautyPointsEarned: 55,
        tags: JSON.stringify(['corporal', 'drenaje', 'presoterapia']),
        sortOrder: 8
      }
    }),

    // MANICURA Y PEDICURA
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Manicura Semipermanente',
        description: 'Manicura completa con esmaltado semipermanente de larga duración.',
        shortDescription: 'Manicura con esmaltado semipermanente',
        category: 'manicura',
        subcategory: 'semipermanente',
        riskLevel: 'LOW',
        requiresConsultation: false,
        consentType: 'SIMPLE',
        appointmentType: 'DIRECT',
        minimumAge: 14,
        durationMinutes: 75,
        price: 35.0,
        vipPrice: 28.0,
        iconName: 'hand',
        color: '#E1BEE7',
        contraindications: JSON.stringify(['Infecciones en uñas', 'Heridas en manos']),
        sideEffects: JSON.stringify(['Sequedad temporal']),
        recoveryTime: 'Inmediato',
        consentFormRequired: false,
        isActive: true,
        isPopular: true,
        beautyPointsEarned: 35,
        tags: JSON.stringify(['manicura', 'semipermanente', 'uñas']),
        sortOrder: 9
      }
    }),
    prisma.treatment.create({
      data: {
        clinicId: clinic.id,
        name: 'Pedicura Spa',
        description: 'Pedicura completa con exfoliación, masaje relajante y esmaltado.',
        shortDescription: 'Pedicura spa con masaje',
        category: 'pedicura',
        subcategory: 'spa',
        riskLevel: 'LOW',
        requiresConsultation: false,
        consentType: 'SIMPLE',
        appointmentType: 'DIRECT',
        minimumAge: 14,
        durationMinutes: 60,
        price: 40.0,
        vipPrice: 32.0,
        iconName: 'foot',
        color: '#8BC34A',
        contraindications: JSON.stringify(['Diabetes descompensada', 'Heridas en pies']),
        sideEffects: JSON.stringify(['Relajación']),
        recoveryTime: 'Inmediato',
        consentFormRequired: false,
        isActive: true,
        beautyPointsEarned: 40,
        tags: JSON.stringify(['pedicura', 'spa', 'relajante']),
        sortOrder: 10
      }
    })
  ]);

  // ============================================================================
  // 👤 USUARIOS DIVERSOS
  // ============================================================================
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
        beautyPoints: 350,
        loyaltyTier: 'GOLD',
        vipStatus: true,
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
        allergyDetails: JSON.stringify(['Látex', 'Níquel']),
        hasMedicalConditions: false,
        takingMedications: false,
        dataProcessingConsent: true,
        skinType: 'GRASA',
        beautyPoints: 150,
        loyaltyTier: 'SILVER',
        vipStatus: false,
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
        email: 'carmen@email.com',
        passwordHash: await bcrypt.hash('user123', 10),
        firstName: 'Carmen',
        lastName: 'Ruiz',
        phone: '+34 666 555 666',
        birthDate: new Date('1988-11-20'),
        gender: 'F',
        hasAllergies: false,
        hasMedicalConditions: true,
        medicalDetails: JSON.stringify(['Hipertensión controlada']),
        takingMedications: true,
        medicationDetails: JSON.stringify(['Enalapril 10mg']),
        dataProcessingConsent: true,
        skinType: 'SECA',
        beautyPoints: 85,
        loyaltyTier: 'BRONZE',
        vipStatus: false,
        isActive: true,
        isVerified: true,
        onboardingCompleted: true,
        privacyAccepted: true,
        termsAccepted: true,
        primaryClinicId: clinic.id
      }
    })
  ]);

  // ============================================================================
  // 📅 CITAS DE EJEMPLO
  // ============================================================================
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(15, 30, 0, 0);

  await Promise.all([
    prisma.appointment.create({
      data: {
        userId: users[0].id,
        clinicId: clinic.id,
        professionalId: professionals[0].id,
        treatmentId: treatments[0].id, // Limpieza facial
        appointmentType: 'DIRECT',
        scheduledDate: tomorrow,
        scheduledTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 75 * 60000), // +75 minutos
        durationMinutes: 75,
        status: 'CONFIRMED',
        originalPrice: 65.0,
        finalPrice: 52.0, // Precio VIP
        consentStatus: 'COMPLETED',
        bookingSource: 'APP',
        beautyPointsEarned: 65
      }
    }),
    prisma.appointment.create({
      data: {
        userId: users[1].id,
        clinicId: clinic.id,
        professionalId: professionals[3].id,
        treatmentId: treatments[2].id, // Depilación láser zona pequeña
        appointmentType: 'CONSULTATION_TREATMENT',
        scheduledDate: nextWeek,
        scheduledTime: nextWeek,
        endTime: new Date(nextWeek.getTime() + 30 * 60000),
        durationMinutes: 30,
        status: 'PENDING',
        originalPrice: 45.0,
        finalPrice: 45.0,
        consentStatus: 'PENDING',
        bookingSource: 'WEB',
        beautyPointsEarned: 45
      }
    })
  ]);

  // ============================================================================
  // 📋 CONSENTIMIENTOS DE EJEMPLO
  // ============================================================================
  await Promise.all([
    prisma.patientConsent.create({
      data: {
        userId: users[0].id,
        treatmentId: treatments[0].id,
        templateId: consentTemplates[0].id,
        isConsented: true,
        consentedAt: new Date(),
        formData: JSON.stringify({
          allergies: 'Ninguna',
          emergency_contact: '+34 666 999 888'
        }),
        status: 'APPROVED',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    }),
    prisma.patientConsent.create({
      data: {
        userId: users[1].id,
        treatmentId: treatments[2].id,
        templateId: consentTemplates[1].id,
        isConsented: false,
        formData: JSON.stringify({
          medical_history: 'Sin antecedentes relevantes',
          allergies: 'Látex, Níquel',
          medications: 'Ninguna',
          pregnancy: 'No'
        }),
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    })
  ]);

  console.log('\n✅ Seed completo terminado!');
  console.log('\n🏥 CLÍNICAS CREADAS:');
  clinics.forEach(clinic => {
    console.log(`  📍 ${clinic.name} (${clinic.slug})`);
    console.log(`     Email: ${clinic.email} / Contraseña: admin123`);
  });

  console.log('\n👨‍⚕️ PROFESIONALES CREADOS:');
  professionals.forEach(prof => {
    console.log(`  👩‍⚕️ ${prof.firstName} ${prof.lastName}`);
    console.log(`     Email: ${prof.email} / Contraseña: prof123`);
    console.log(`     Especialidades: ${JSON.parse(prof.specialties).join(', ')}`);
  });

  console.log('\n👤 USUARIOS CREADOS:');
  users.forEach(user => {
    console.log(`  👩 ${user.firstName} ${user.lastName}`);
    console.log(`     Email: ${user.email} / Contraseña: user123`);
    console.log(`     Tier: ${user.loyaltyTier} | VIP: ${user.vipStatus ? 'Sí' : 'No'} | Puntos: ${user.beautyPoints}`);
  });

  console.log('\n💉 TRATAMIENTOS CREADOS:');
  treatments.forEach((treatment, index) => {
    console.log(`  ${index + 1}. ${treatment.name} - ${treatment.price}€`);
    console.log(`     Categoría: ${treatment.category} | Riesgo: ${treatment.riskLevel} | Duración: ${treatment.durationMinutes}min`);
  });

  console.log('\n📊 RESUMEN:');
  console.log(`  🏥 ${clinics.length} clínicas`);
  console.log(`  👨‍⚕️ ${professionals.length} profesionales`);
  console.log(`  👤 ${users.length} usuarios`);
  console.log(`  💉 ${treatments.length} tratamientos`);
  console.log(`  📋 ${consentTemplates.length} plantillas de consentimiento`);
  console.log(`  📅 2 citas de ejemplo`);
  console.log(`  ✍️ 2 consentimientos de ejemplo`);

  console.log('\n🚀 ¡Base de datos lista para usar!');
  console.log('📱 Usuario de prueba principal: ana@email.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });