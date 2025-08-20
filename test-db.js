// test-db.js - Test database connection and basic operations
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test counting records in main tables
    const counts = await Promise.all([
      prisma.clinic.count(),
      prisma.user.count(),
      prisma.professional.count(),
      prisma.treatment.count(),
      prisma.appointment.count(),
    ]);
    
    console.log('📊 Current record counts:');
    console.log(`  Clinics: ${counts[0]}`);
    console.log(`  Users: ${counts[1]}`);
    console.log(`  Professionals: ${counts[2]}`);
    console.log(`  Treatments: ${counts[3]}`);
    console.log(`  Appointments: ${counts[4]}`);
    
    // Test a simple query with relations
    const clinicsWithUsers = await prisma.clinic.findMany({
      take: 5,
      include: {
        users: {
          take: 3,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        professionals: {
          take: 3,
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            users: true,
            professionals: true,
            treatments: true,
            appointments: true
          }
        }
      }
    });
    
    console.log(`\n🏥 Found ${clinicsWithUsers.length} clinics with their data`);
    
    clinicsWithUsers.forEach((clinic, index) => {
      console.log(`\n${index + 1}. ${clinic.name} (${clinic.slug})`);
      console.log(`   📧 ${clinic.email}`);
      console.log(`   👥 ${clinic._count.users} users, ${clinic._count.professionals} professionals`);
      console.log(`   💉 ${clinic._count.treatments} treatments, ${clinic._count.appointments} appointments`);
      console.log(`   ✅ Active: ${clinic.isActive}, Verified: ${clinic.isVerified}`);
    });
    
    // Test enum values
    console.log('\n🏷️  Testing enum values...');
    const enumTest = {
      riskLevels: ['LOW', 'MEDIUM', 'HIGH', 'MEDICAL'],
      userRoles: ['CLIENT', 'VIP_CLIENT', 'PROFESSIONAL', 'MANAGER', 'ADMIN'],
      appointmentStatuses: ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
    };
    
    Object.entries(enumTest).forEach(([key, values]) => {
      console.log(`   ${key}: ${values.join(', ')}`);
    });
    
    console.log('\n✅ All database tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    if (error.code === 'P1001') {
      console.error('🔗 Cannot connect to database. Check your DATABASE_URL in .env');
    } else if (error.code === 'P2021') {
      console.error('📋 Table does not exist. Run: npx prisma db push');
    } else {
      console.error('📝 Error details:', {
        code: error.code,
        message: error.message
      });
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testDatabaseConnection();