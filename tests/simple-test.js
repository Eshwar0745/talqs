#!/usr/bin/env node

/**
 * Simple TALQS API Test Runner
 * Performs basic validation of key endpoints
 */

const BASE_URL = 'http://localhost:3000';

async function testEndpoint(endpoint, method = 'GET', body = null) {
  const startTime = Date.now();
  
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const responseTime = Date.now() - startTime;
    
    let data;
    try {
      data = await response.json();
    } catch {
      data = { message: 'Non-JSON response' };
    }
    
    return {
      endpoint,
      method,
      status: response.status,
      responseTime,
      data,
      success: response.status < 400
    };
  } catch (error) {
    return {
      endpoint,
      method,
      status: 0,
      responseTime: Date.now() - startTime,
      data: { error: error.message },
      success: false
    };
  }
}

async function runSimpleTests() {
  console.log('🚀 TALQS API Simple Test Suite\n');
  console.log('==============================\n');
  
  const results = [];
  
  // Test MongoDB health
  console.log('🔧 Testing MongoDB connection...');
  const mongoTest = await testEndpoint('/api/test-mongodb');
  results.push(mongoTest);
  console.log(`   ${mongoTest.success ? '✅' : '❌'} MongoDB Status: ${mongoTest.status} (${mongoTest.responseTime}ms)`);
  
  // Test user registration
  console.log('\n🔐 Testing Authentication...');
  const testEmail = `test_${Date.now()}@example.com`;
  const signupTest = await testEndpoint('/api/auth/signup', 'POST', {
    name: 'Test User',
    email: testEmail,
    password: 'Test123!@#'
  });
  results.push(signupTest);
  console.log(`   ${signupTest.success ? '✅' : '❌'} Signup: ${signupTest.status} (${signupTest.responseTime}ms)`);
  
  // Test user login
  const loginTest = await testEndpoint('/api/auth/login', 'POST', {
    email: testEmail,
    password: 'Test123!@#'
  });
  results.push(loginTest);
  console.log(`   ${loginTest.success ? '✅' : '❌'} Login: ${loginTest.status} (${loginTest.responseTime}ms)`);
  
  // Test user listing
  console.log('\n👥 Testing User Management...');
  const usersTest = await testEndpoint('/api/users');
  results.push(usersTest);
  console.log(`   ${usersTest.success ? '✅' : '❌'} Users List: ${usersTest.status} (${usersTest.responseTime}ms)`);
  
  // Test document endpoints
  console.log('\n📄 Testing Document Management...');
  const docsTest = await testEndpoint('/api/documents');
  results.push(docsTest);
  console.log(`   ${docsTest.success ? '✅' : '❌'} Documents: ${docsTest.status} (${docsTest.responseTime}ms)`);
  
  // Test missing endpoints
  console.log('\n⚙️ Testing Missing Endpoints...');
  const qaTest = await testEndpoint('/api/qa', 'POST', { question: 'test' });
  results.push(qaTest);
  console.log(`   ${qaTest.status === 404 ? '⚠️' : qaTest.success ? '✅' : '❌'} Q&A Endpoint: ${qaTest.status} (expected 404)`);
  
  // Generate summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success && r.status !== 404).length;
  const missing = results.filter(r => r.status === 404).length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Missing: ${missing}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);
  
  // Detailed findings
  console.log('\n🔍 Detailed Findings:');
  console.log('=====================');
  
  results.forEach(result => {
    const icon = result.success ? '✅' : result.status === 404 ? '⚠️' : '❌';
    console.log(`${icon} ${result.method} ${result.endpoint}`);
    console.log(`   Status: ${result.status} | Time: ${result.responseTime}ms`);
    
    if (result.data.error) {
      console.log(`   Error: ${result.data.error}`);
    } else if (result.data.message && result.status >= 400) {
      console.log(`   Message: ${result.data.message}`);
    }
    console.log();
  });
  
  return results;
}

// Run tests
runSimpleTests().catch(console.error);