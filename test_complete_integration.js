const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('./src/app');
const env = require('./src/config/env');
const mlService = require('./src/services/mlService');

const server = http.createServer(app);
const TEST_PORT = 5005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

const sampleValidPayload = {
  age: 42,
  gender: 'Male',
  bmi: 27.5,
  children: 2,
  smoker: 'No',
  region: 'Northwest',
  occupation: 'Manager',
  annual_income_usd: 75000,
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

const resultsSummary = [];

function recordResult(testName, passed, details) {
  resultsSummary.push({ testName, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`[${icon}] ${testName}: ${details}`);
}

server.listen(TEST_PORT, async () => {
  console.log(`========================================================================`);
  console.log(`  InsureWise AI — Comprehensive E2E & Edge Case Integration Test Suite  `);
  console.log(`  Test Server running on ${BASE_URL}`);
  console.log(`========================================================================\n`);

  try {
    // ------------------------------------------------------------------------
    // 1. FASTAPI DIRECT ENDPOINTS
    // ------------------------------------------------------------------------
    console.log('--- 1. Testing FastAPI Direct Endpoints ---');
    try {
      const fastApiHealth = await fetch(`${env.ML_SERVICE_URL}/health`);
      const healthJson = await fastApiHealth.json();
      recordResult('FastAPI GET /health', fastApiHealth.status === 200 && healthJson.model_loaded === true, `Status ${fastApiHealth.status}, model_loaded=${healthJson.model_loaded}`);

      const fastApiPred = await fetch(`${env.ML_SERVICE_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleValidPayload)
      });
      const predJson = await fastApiPred.json();
      const hasPred = fastApiPred.status === 200 && typeof predJson.prediction === 'number' && predJson.explanation;
      recordResult('FastAPI POST /predict', hasPred, `Status ${fastApiPred.status}, Prediction: $${predJson.prediction}, SHAP features: ${Object.keys(predJson.explanation || {}).length}`);
    } catch (e) {
      recordResult('FastAPI Direct Test', false, `FastAPI connection error: ${e.message}`);
    }

    // ------------------------------------------------------------------------
    // 2. AUTHENTICATION & USER MANAGEMENT
    // ------------------------------------------------------------------------
    console.log('\n--- 2. Testing Authentication & Token Lifecycle ---');
    const userA_Email = `user_a_${Date.now()}@example.com`;
    const userB_Email = `user_b_${Date.now()}@example.com`;

    const regA_Res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User A', email: userA_Email, password: 'password123' })
    });
    const regA_Data = await regA_Res.json();
    const tokenA = regA_Data.token;
    recordResult('POST /api/auth/register (User A)', regA_Res.status === 201 && !!tokenA, `Status ${regA_Res.status}, JWT issued`);

    const loginA_Res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userA_Email, password: 'password123' })
    });
    const loginA_Data = await loginA_Res.json();
    recordResult('POST /api/auth/login (User A)', loginA_Res.status === 200 && !!loginA_Data.token, `Status ${loginA_Res.status}, JWT verified`);

    const regB_Res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'User B', email: userB_Email, password: 'password123' })
    });
    const regB_Data = await regB_Res.json();
    const tokenB = regB_Data.token;
    recordResult('POST /api/auth/register (User B)', regB_Res.status === 201 && !!tokenB, `Status ${regB_Res.status}, User B ready`);

    // ------------------------------------------------------------------------
    // 3. VALID PREDICTION E2E FLOW
    // ------------------------------------------------------------------------
    console.log('\n--- 3. Testing Valid End-to-End Prediction Flow ---');
    const e2eRes = await fetch(`${BASE_URL}/api/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify(sampleValidPayload)
    });
    const e2eData = await e2eRes.json();
    const validE2E = e2eRes.status === 201 && e2eData.status === 'success' && typeof e2eData.data.prediction === 'number' && e2eData.data.explanation;
    recordResult('POST /api/predictions (Valid Flow)', validE2E, `Status ${e2eRes.status}, Premium: $${e2eData.data?.prediction}, Model: ${e2eData.data?.modelVersion}`);
    const userA_PredId = e2eData.data?.id;

    // ------------------------------------------------------------------------
    // 4. INPUT VALIDATION EDGE CASES (Missing, Invalid Types, Invalid Values)
    // ------------------------------------------------------------------------
    console.log('\n--- 4. Testing Input Validation Edge Cases ---');

    // Missing Field
    const missingPayload = { ...sampleValidPayload };
    delete missingPayload.age;
    const missRes = await fetch(`${BASE_URL}/api/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify(missingPayload)
    });
    recordResult('POST /api/predictions (Missing Field)', missRes.status === 400, `Status ${missRes.status} (Expected 400 Bad Request)`);

    // Invalid Data Type
    const invTypePayload = { ...sampleValidPayload, bmi: 'not_a_number' };
    const invTypeRes = await fetch(`${BASE_URL}/api/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify(invTypePayload)
    });
    recordResult('POST /api/predictions (Invalid Data Type)', invTypeRes.status === 400, `Status ${invTypeRes.status} (Expected 400 Bad Request)`);

    // Invalid Feature Value / Format
    const invBpPayload = { ...sampleValidPayload, blood_pressure: 'invalid_bp_format' };
    const invBpRes = await fetch(`${BASE_URL}/api/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify(invBpPayload)
    });
    recordResult('POST /api/predictions (Invalid BP Format)', invBpRes.status === 400, `Status ${invBpRes.status} (Expected 400 Bad Request)`);

    // ------------------------------------------------------------------------
    // 5. AUTHENTICATION & JWT SECURITY EDGE CASES
    // ------------------------------------------------------------------------
    console.log('\n--- 5. Testing Authentication & JWT Security Edge Cases ---');

    // Missing Token
    const noTokRes = await fetch(`${BASE_URL}/api/auth/me`);
    recordResult('GET /api/auth/me (Missing Token)', noTokRes.status === 401, `Status ${noTokRes.status} (Expected 401 Unauthorized)`);

    // Invalid Token
    const invTokRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer bogus_token_string' }
    });
    recordResult('GET /api/auth/me (Invalid Token)', invTokRes.status === 401, `Status ${invTokRes.status} (Expected 401 Unauthorized)`);

    // Expired Token
    const expiredToken = jwt.sign({ id: 'dummy_id' }, env.JWT_SECRET, { expiresIn: '-1s' });
    const expTokRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    recordResult('GET /api/auth/me (Expired Token)', expTokRes.status === 401, `Status ${expTokRes.status} (Expected 401 Unauthorized)`);

    // ------------------------------------------------------------------------
    // 6. CROSS-USER DATA ISOLATION CONTROLS
    // ------------------------------------------------------------------------
    console.log('\n--- 6. Testing Cross-User Data Isolation ---');

    // User B attempts to query User A's prediction history
    const histB_Res = await fetch(`${BASE_URL}/api/predictions`, {
      headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const histB_Data = await histB_Res.json();
    const isolatedHistory = histB_Res.status === 200 && histB_Data.results === 0;
    recordResult('GET /api/predictions (User B Isolation)', isolatedHistory, `Status ${histB_Res.status}, User B sees ${histB_Data.results} items (Isolated)`);

    // User B attempts direct ID access to User A's prediction
    if (userA_PredId) {
      const getSingleB_Res = await fetch(`${BASE_URL}/api/predictions/${userA_PredId}`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
      });
      recordResult('GET /api/predictions/:id (Cross-User Access Block)', getSingleB_Res.status === 404 || getSingleB_Res.status === 403, `Status ${getSingleB_Res.status} (Blocked)`);
    }

    // ------------------------------------------------------------------------
    // 7. ML SERVICE UNAVAILABILITY & MALFORMED RESPONSE HANDLING
    // ------------------------------------------------------------------------
    console.log('\n--- 7. Testing ML Service Error Resiliency ---');

    // Simulate FastAPI Down (Point client to unused port)
    const origUrl = env.ML_SERVICE_URL;
    env.ML_SERVICE_URL = 'http://127.0.0.1:59999';
    mlService.client.defaults.baseURL = 'http://127.0.0.1:59999';

    const downRes = await fetch(`${BASE_URL}/api/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenA}` },
      body: JSON.stringify(sampleValidPayload)
    });
    const downJson = await downRes.json();
    recordResult('POST /api/predictions (FastAPI Unavailable)', downRes.status === 503, `Status ${downRes.status}, Message: "${downJson.message}"`);

    // Restore original ML_SERVICE_URL
    env.ML_SERVICE_URL = origUrl;
    mlService.client.defaults.baseURL = origUrl;

    // ------------------------------------------------------------------------
    // SUMMARY REPORT
    // ------------------------------------------------------------------------
    console.log('\n========================================================================');
    console.log('                 COMPLETE API TESTING REPORT SUMMARY                     ');
    console.log('========================================================================');
    const passedCount = resultsSummary.filter(r => r.passed).length;
    const totalCount = resultsSummary.length;
    console.log(`Total Scenarios Tested: ${totalCount}`);
    console.log(`Passed:                ${passedCount}`);
    console.log(`Failed:                ${totalCount - passedCount}`);
    console.log(`Overall Health Status: ${passedCount === totalCount ? '100% OPERATIONAL & VERIFIED' : 'ACTION REQUIRED'}`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('[E2E Test Execution Error]', err);
  } finally {
    server.close();
  }
});
