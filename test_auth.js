const http = require('http');
const app = require('./src/app');

const server = http.createServer(app);

server.listen(5003, async () => {
  console.log('[Auth Test] Test server started on port 5003');

  try {
    const testEmail = `auth_test_${Date.now()}@example.com`;
    const testPassword = 'password123';
    let userToken = '';

    // 1. Test Valid Registration
    console.log('\n--- 1. Testing Registration (POST /api/auth/register) ---');
    const regRes = await fetch('http://127.0.0.1:5003/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Auth User', email: testEmail, password: testPassword })
    });
    const regData = await regRes.json();
    console.log('Registration Status:', regRes.status);
    console.log('Registration Response (Password Hash Excluded):', regData);
    if (regRes.status !== 201 || !regData.token || regData.data.user.passwordHash || regData.data.user.password) {
      throw new Error('Registration failed or leaked password hash!');
    }
    userToken = regData.token;

    // 2. Test Invalid Email Registration
    console.log('\n--- 2. Testing Invalid Email Registration (Validation Error) ---');
    const invEmailRes = await fetch('http://127.0.0.1:5003/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Invalid User', email: 'invalid-email', password: 'password123' })
    });
    console.log('Invalid Email Status:', invEmailRes.status);
    if (invEmailRes.status !== 400) throw new Error('Expected 400 for invalid email');

    // 3. Test Short Password Registration
    console.log('\n--- 3. Testing Short Password Registration (Validation Error) ---');
    const shortPassRes = await fetch('http://127.0.0.1:5003/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Short User', email: 'short@example.com', password: '123' })
    });
    console.log('Short Password Status:', shortPassRes.status);
    if (shortPassRes.status !== 400) throw new Error('Expected 400 for short password');

    // 4. Test Valid Login
    console.log('\n--- 4. Testing Valid Login (POST /api/auth/login) ---');
    const loginRes = await fetch('http://127.0.0.1:5003/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword })
    });
    const loginData = await loginRes.json();
    console.log('Login Status:', loginRes.status);
    console.log('Login Response:', loginData);
    if (loginRes.status !== 200 || !loginData.token) throw new Error('Login failed!');

    // 5. Test Invalid Password Login
    console.log('\n--- 5. Testing Invalid Password Login ---');
    const invPassRes = await fetch('http://127.0.0.1:5003/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'wrongpassword' })
    });
    console.log('Invalid Password Login Status:', invPassRes.status);
    if (invPassRes.status !== 401) throw new Error('Expected 401 for wrong password');

    // 6. Test GET /api/auth/me (Protected Route with Valid Token)
    console.log('\n--- 6. Testing GET /api/auth/me (Authenticated) ---');
    const meRes = await fetch('http://127.0.0.1:5003/api/auth/me', {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    const meData = await meRes.json();
    console.log('/me Status:', meRes.status, meData);
    if (meRes.status !== 200 || meData.data.user.email !== testEmail) {
      throw new Error('/me request failed!');
    }

    // 7. Test Protected Route with Invalid Token
    console.log('\n--- 7. Testing Protected Route with Invalid Token ---');
    const invTokenRes = await fetch('http://127.0.0.1:5003/api/auth/me', {
      headers: { 'Authorization': 'Bearer invalid_token_xyz' }
    });
    console.log('Invalid Token Status:', invTokenRes.status);
    if (invTokenRes.status !== 401) throw new Error('Expected 401 for invalid token');

    // 8. Test Protected Route with Missing Token
    console.log('\n--- 8. Testing Protected Route with Missing Token ---');
    const noTokenRes = await fetch('http://127.0.0.1:5003/api/auth/me');
    console.log('Missing Token Status:', noTokenRes.status);
    if (noTokenRes.status !== 401) throw new Error('Expected 401 for missing token');

    console.log('\n========================================================================');
    console.log('  ✅ ALL AUTHENTICATION ENDPOINT TESTS PASSED SUCCESSFULLY!');
    console.log('========================================================================');
  } catch (err) {
    console.error('[Auth Test Error]', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
