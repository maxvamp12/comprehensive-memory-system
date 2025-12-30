const request = require('request');

// Test JWT authentication endpoints
const testUrl = 'http://192.168.68.71:3000';

console.log('=== TESTING JWT AUTHENTICATION ===');

// Test 1: Health Check
console.log('\n1. Testing Health Endpoint:');
request.get(`${testUrl}/health`, (error, response, body) => {
  if (error) {
    console.log('❌ Health check failed:', error.message);
  } else {
    console.log('✅ Health check successful:', JSON.parse(body).status);
  }
});

// Test 2: Login with valid credentials
console.log('\n2. Testing Login Endpoint:');
const loginData = {
  email: 'admin@memory-service.com',
  password: 'password'
};

request.post({
  url: `${testUrl}/api/auth/login`,
  json: true,
  body: loginData
}, (error, response, body) => {
  if (error) {
    console.log('❌ Login failed:', error.message);
  } else if (response.statusCode === 200) {
    console.log('✅ Login successful');
    console.log('Token received:', body.token ? 'Yes' : 'No');
    if (body.token) {
      console.log('User role:', body.user.role);
      console.log('Token expires in:', body.expires_in);
      
      // Test 3: Access protected endpoint with token
      console.log('\n3. Testing Protected Endpoint with Token:');
      request.get(`${testUrl}/api/memory`, {
        headers: {
          'Authorization': `Bearer ${body.token}`
        }
      }, (error, response, body) => {
        if (error) {
          console.log('❌ Protected access failed:', error.message);
        } else if (response.statusCode === 200) {
          console.log('✅ Protected access successful');
          console.log('User authenticated:', JSON.parse(body).user ? 'Yes' : 'No');
        } else {
          console.log('❌ Protected access failed:', response.statusCode, body);
        }
      });
    }
  } else {
    console.log('❌ Login failed:', response.statusCode, body);
  }
});

// Test 4: Access protected endpoint without token
console.log('\n4. Testing Protected Endpoint without Token:');
request.get(`${testUrl}/api/memory`, (error, response, body) => {
  if (error) {
    console.log('❌ Access failed:', error.message);
  } else {
    console.log('Response status:', response.statusCode);
    if (response.statusCode !== 200) {
      console.log('✅ Correctly rejected unauthorized access');
    } else {
      console.log('❌ Unauthorized access should have been rejected');
    }
  }
});

setTimeout(() => {
  console.log('\n=== JWT AUTHENTICATION TEST COMPLETED ===');
}, 3000);
