// ============================================================================
// test-api.js - SCRIPT DE TESTING RÁPIDO
// ============================================================================

const BASE_URL = 'http://localhost:3000';
let ACCESS_TOKEN = '';

// Función helper para hacer requests
async function makeRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(ACCESS_TOKEN && { 'Authorization': `Bearer ${ACCESS_TOKEN}` }),
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    console.log(`\n${options.method || 'GET'} ${endpoint}`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('✅ Success');
      if (data.data) {
        console.log('📊 Data preview:', JSON.stringify(data.data, null, 2).substring(0, 200) + '...');
      }
    } else {
      console.log('❌ Error');
      console.log('📄 Response:', JSON.stringify(data, null, 2));
    }
    
    return { response, data };
  } catch (error) {
    console.log(`\n${options.method || 'GET'} ${endpoint}`);
    console.log('💥 Network Error:', error.message);
    return { error };
  }
}

// Tests principales
async function runTests() {
  console.log('🚀 COMENZANDO TESTS DE API');
  console.log('=====================================');

  // 1. Health Check
  console.log('\n🏥 1. HEALTH CHECK');
  await makeRequest('/health');

  // 2. Demo Login
  console.log('\n🔐 2. DEMO LOGIN');
  const { data: loginData } = await makeRequest('/api/auth/demo-login', {
    method: 'POST'
  });
  
  if (loginData?.data?.tokens?.accessToken) {
    ACCESS_TOKEN = loginData.data.tokens.accessToken;
    console.log('🎫 Token obtenido y guardado');
  }

  // 3. Dashboard
  console.log('\n🏠 3. DASHBOARD');
  await makeRequest('/api/dashboard');

  // 4. Beauty Points
  console.log('\n💎 4. BEAUTY POINTS');
  await makeRequest('/api/dashboard/beauty-points');

  // 5. VIP Benefits (público)
  console.log('\n✨ 5. VIP BENEFITS');
  await makeRequest('/api/vip/benefits');

  // 6. VIP Status
  console.log('\n👑 6. VIP STATUS');
  await makeRequest('/api/vip/status');

  // 7. VIP Testimonials
  console.log('\n🗣️ 7. VIP TESTIMONIALS');
  await makeRequest('/api/vip/testimonials');

  // 8. My Appointments
  console.log('\n📅 8. MY APPOINTMENTS');
  await makeRequest('/api/appointments');

  // 9. Profile
  console.log('\n👤 9. PROFILE');
  await makeRequest('/api/profile');

  // 10. Profile Stats
  console.log('\n📊 10. PROFILE STATS');
  await makeRequest('/api/profile/stats');

  // 11. Profile History
  console.log('\n📜 11. PROFILE HISTORY');
  await makeRequest('/api/profile/history');

  // 12. Test de endpoint no existente
  console.log('\n❌ 12. ENDPOINT NO EXISTENTE');
  await makeRequest('/api/no-existe');

  // 13. Test sin autenticación
  console.log('\n🚫 13. SIN AUTENTICACIÓN');
  const tempToken = ACCESS_TOKEN;
  ACCESS_TOKEN = '';
  await makeRequest('/api/dashboard');
  ACCESS_TOKEN = tempToken;

  console.log('\n🎉 TESTS COMPLETADOS');
  console.log('=====================================');
}

// Script para probar registro de usuario
async function testUserRegistration() {
  console.log('\n📝 TESTING REGISTRO DE USUARIO');
  console.log('=====================================');

  const newUser = {
    email: `test${Date.now()}@email.com`,
    password: 'password123',
    firstName: 'Usuario',
    lastName: 'Prueba',
    phone: '+54 11 9999-8888'
  };

  const { data, response } = await makeRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(newUser)
  });

  if (response?.ok) {
    console.log('✅ Usuario registrado exitosamente');
    console.log('📧 Email:', newUser.email);
    
    // Intentar login con el nuevo usuario
    const loginResult = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: newUser.email,
        password: newUser.password
      })
    });

    if (loginResult.response?.ok) {
      console.log('✅ Login exitoso con nuevo usuario');
    }
  }
}

// Script para probar creación de cita
async function testAppointmentCreation() {
  console.log('\n📅 TESTING CREACIÓN DE CITA');
  console.log('=====================================');

  // Primero necesitamos hacer login
  if (!ACCESS_TOKEN) {
    const { data: loginData } = await makeRequest('/api/auth/demo-login', {
      method: 'POST'
    });
    if (loginData?.data?.tokens?.accessToken) {
      ACCESS_TOKEN = loginData.data.tokens.accessToken;
    }
  }

  // Datos de cita de prueba
  const appointmentData = {
    treatmentId: 'clxxx-treatment-id', // En producción usarías un ID real
    date: '2025-06-20',
    time: '15:30',
    notes: 'Cita de prueba desde API testing'
  };

  await makeRequest('/api/appointments', {
    method: 'POST',
    body: JSON.stringify(appointmentData)
  });
}

// Script para probar funcionalidades VIP
async function testVIPFeatures() {
  console.log('\n👑 TESTING FUNCIONALIDADES VIP');
  console.log('=====================================');

  // Login como usuario demo (que es VIP)
  if (!ACCESS_TOKEN) {
    const { data: loginData } = await makeRequest('/api/auth/demo-login', {
      method: 'POST'
    });
    if (loginData?.data?.tokens?.accessToken) {
      ACCESS_TOKEN = loginData.data.tokens.accessToken;
    }
  }

  // Test VIP offers (require VIP access)
  console.log('\n🎁 VIP OFFERS');
  await makeRequest('/api/vip/offers');

  // Test VIP subscription (should fail - already subscribed)
  console.log('\n💳 VIP SUBSCRIPTION (should fail - already VIP)');
  await makeRequest('/api/vip/subscribe', {
    method: 'POST',
    body: JSON.stringify({ planType: 'MONTHLY' })
  });
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--register')) {
    await testUserRegistration();
  } else if (args.includes('--appointments')) {
    await testAppointmentCreation();
  } else if (args.includes('--vip')) {
    await testVIPFeatures();
  } else if (args.includes('--all')) {
    await runTests();
    await testUserRegistration();
    await testVIPFeatures();
  } else {
    await runTests();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}