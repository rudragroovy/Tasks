const assert = require('assert');

const API_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Verification Tests ---');
  let token = '';
  let patientId = '';

  try {
    // 1. Register
    console.log('Testing /auth/register...');
    const registerData = {
      name: 'Test Patient',
      email: `test_${Date.now()}@example.com`,
      password: 'password123',
      role: 'PATIENT'
    };
    const regRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registerData)
    });
    const regData = await regRes.json();
    assert.ok(regData.token, 'Token should be returned on register');
    token = regData.token;
    patientId = regData.user.id;
    console.log('✅ Register passed');

    // 2. Login
    console.log('Testing /auth/login...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: registerData.email, password: 'password123' })
    });
    const loginData = await loginRes.json();
    assert.ok(loginData.token, 'Token should be returned on login');
    console.log('✅ Login passed');

    // 3. Me
    console.log('Testing /auth/me...');
    const meRes = await fetch(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const meData = await meRes.json();
    assert.equal(meData.email, registerData.email, 'Emails should match');
    console.log('✅ Me passed');

    // 4. Get Doctors
    console.log('Testing /appointments/doctors...');
    const docRes = await fetch(`${API_URL}/appointments/doctors`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const docData = await docRes.json();
    assert.ok(Array.isArray(docData), 'Should return array of doctors');
    console.log(`✅ Get Doctors passed. Found ${docData.length} doctors`);

    // 5. Create Appointment (If we have a doctor)
    if (docData.length > 0) {
      console.log('Testing POST /appointments...');
      const doctorId = docData[0].userId;
      const apptRes = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          doctorId,
          aiSummary: JSON.stringify({ summary: 'Test pain', status: 'complete', suggested_specialization: 'Cardiologist' })
        })
      });
      const apptData = await apptRes.json();
      assert.ok(apptData.id, 'Appointment ID should be returned');
      assert.equal(apptData.status, 'PENDING', 'Status should be PENDING');
      console.log('✅ Create Appointment passed');
    } else {
      console.log('⚠️ Skipping appointment test, no doctors found');
    }

    // 6. Test AI
    console.log('Testing /ai/symptoms...');
    const aiRes = await fetch(`${API_URL}/ai/symptoms`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        text: 'I have a very bad headache and chest pain for 3 days.'
      })
    });
    const aiData = await aiRes.json();
    if (aiData.error) {
      console.log('⚠️ AI returned error (Expected if GEMINI_API_KEY is dummy):', aiData.error);
    } else {
      assert.ok(aiData.status, 'AI response should have a status');
      console.log(`✅ AI passed (Status: ${aiData.status})`);
    }

    console.log('--- All Tests Passed Successfully ---');
  } catch (error) {
    console.error('❌ Test failed!', error);
    process.exit(1);
  }
}

runTests();
