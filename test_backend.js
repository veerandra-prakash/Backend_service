const http = require('http');
const app = require('./src/app');

const server = http.createServer(app);

server.listen(5002, async () => {
  console.log('[Test] Server started on port 5002');

  try {
    // Test 1: GET /health
    console.log('\n--- TEST 1: GET /health ---');
    const healthRes = await fetch('http://127.0.0.1:5002/health');
    const healthData = await healthRes.json();
    console.log('Health Status:', healthRes.status, healthData);
    if (healthRes.status !== 200 || healthData.status !== 'ok') {
      throw new Error('Health check failed');
    }

    // Test 2: POST /api/auth/register
    console.log('\n--- TEST 2: POST /api/auth/register ---');
    const regPayload = {
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      password: 'password123'
    };
    const regRes = await fetch('http://127.0.0.1:5002/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });
    const regData = await regRes.json();
    console.log('Register Status:', regRes.status);
    const token = regData.token;

    // Test 3: POST /api/predictions (Proxying to FastAPI)
    console.log('\n--- TEST 3: POST /api/predictions ---');
    const predPayload = {
      age: 40,
      gender: 'Male',
      bmi: 28.5,
      children: 2,
      smoker: 'No',
      region: 'Northwest',
      occupation: 'Engineer',
      annual_income_usd: 85000,
      exercise_level: 'Moderate',
      chronic_diseases: 1,
      doctor_visits_per_year: 5,
      hospitalizations_last_year: 0,
      alcohol_consumption_per_week: 4,
      insurance_plan: 'Standard',
      blood_pressure: '128/82',
      diabetes: 'No',
      cholesterol: 205,
      sleep_hours: 7.0,
      stress_level: 5.5,
      marital_status: 'Married'
    };

    const predRes = await fetch('http://127.0.0.1:5002/api/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(predPayload)
    });

    const predData = await predRes.json();
    console.log('Prediction Status:', predRes.status);
    console.log('Prediction Result:', predData.data ? {
      prediction: predData.data.prediction,
      modelVersion: predData.data.modelVersion,
      explanationCount: Object.keys(predData.data.explanation || {}).length
    } : predData);

    if (predRes.status === 201 && predData.data && predData.data.prediction) {
      console.log('\n✅ ALL BACKEND TESTS PASSED PERFECTLY!');
    } else {
      console.error('\n❌ Prediction failed', predData);
    }
  } catch (err) {
    console.error('[Test Error]', err);
  } finally {
    server.close();
  }
});
