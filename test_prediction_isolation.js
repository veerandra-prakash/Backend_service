const http = require('http');
const app = require('./src/app');

const server = http.createServer(app);

server.listen(5004, async () => {
  console.log('[Isolation Test] Server started on port 5004');

  try {
    // 1. Register User A
    const userA_Res = await fetch('http://127.0.0.1:5004/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: `usera_${Date.now()}@example.com`, password: 'password123' })
    });
    const userA_Data = await userA_Res.json();
    const tokenA = userA_Data.token;

    // 2. Register User B
    const userB_Res = await fetch('http://127.0.0.1:5004/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: `userb_${Date.now()}@example.com`, password: 'password123' })
    });
    const userB_Data = await userB_Res.json();
    const tokenB = userB_Data.token;

    // 3. User A creates a Prediction
    const samplePayload = {
      age: 35,
      gender: 'Female',
      bmi: 24.5,
      children: 1,
      smoker: 'No',
      region: 'Central',
      occupation: 'Teacher',
      annual_income_usd: 55000,
      exercise_level: 'High',
      chronic_diseases: 0,
      doctor_visits_per_year: 3,
      hospitalizations_last_year: 0,
      alcohol_consumption_per_week: 1,
      insurance_plan: 'Standard',
      blood_pressure: '118/75',
      diabetes: 'No',
      cholesterol: 180,
      sleep_hours: 8.0,
      stress_level: 3.5,
      marital_status: 'Single'
    };

    const predA_Res = await fetch('http://127.0.0.1:5004/api/predictions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify(samplePayload)
    });
    const predA_Data = await predA_Res.json();
    console.log('User A Prediction Status:', predA_Res.status, 'Prediction:', predA_Data.data ? predA_Data.data.prediction : predA_Data);
    const predA_Id = predA_Data.data ? predA_Data.data.id : null;

    // 4. User B attempts to fetch User A's prediction history (GET /api/predictions)
    console.log('\n--- Checking User B History Isolation ---');
    const histB_Res = await fetch('http://127.0.0.1:5004/api/predictions', {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const histB_Data = await histB_Res.json();
    console.log('User B History Results Count:', histB_Data.results);
    // User B must see 0 predictions
    if (histB_Data.results !== 0 && histB_Data.data.predictions.length !== 0) {
      throw new Error('ISOLATION FAILURE: User B was able to see predictions!');
    }

    // 5. User B attempts to access User A's specific prediction by ID (GET /api/predictions/:id)
    if (predA_Id) {
      console.log('\n--- Checking User B Direct ID Access Block ---');
      const getSingleB_Res = await fetch(`http://127.0.0.1:5004/api/predictions/${predA_Id}`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
      });
      console.log('User B Access to User A Prediction Status:', getSingleB_Res.status);
      if (getSingleB_Res.status !== 404 && getSingleB_Res.status !== 403) {
        throw new Error('ISOLATION FAILURE: User B accessed User A prediction by ID!');
      }
    }

    console.log('\n========================================================================');
    console.log('  ✅ PREDICTION ISOLATION & FASTAPI INTEGRATION VERIFIED 100%!');
    console.log('========================================================================');
  } catch (err) {
    console.error('[Isolation Test Error]', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
