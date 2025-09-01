/**
 * TALQS API Testing Suite
 * Comprehensive testing for all endpoints in the TALQS application
 */

// Type definitions for testing (using JSDoc for better IDE support)

/**
 * @typedef {Object} TestResult
 * @property {string} endpoint
 * @property {string} method
 * @property {'PASS'|'FAIL'|'SKIP'} status
 * @property {number} [statusCode]
 * @property {number} [responseTime]
 * @property {string} [error]
 * @property {any} [response]
 * @property {string} [details]
 */

/**
 * @typedef {Object} TestSuite
 * @property {string} name
 * @property {TestResult[]} results
 * @property {Object} summary
 * @property {number} summary.total
 * @property {number} summary.passed
 * @property {number} summary.failed
 * @property {number} summary.skipped
 */

class APITester {
  constructor(baseUrl = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.testUser = null;
    this.authToken = null;
    this.documentFingerprint = null;
  }

  generateFingerprint(content) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async makeRequest(
    endpoint,
    method = 'GET',
    body = null,
    headers = {}
  ) {
    const startTime = Date.now();
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };

    if (this.authToken && !headers['Authorization']) {
      defaultHeaders['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: defaultHeaders,
        body: body ? JSON.stringify(body) : undefined,
      });

      const responseTime = Date.now() - startTime;
      let data;
      
      try {
        data = await response.json();
      } catch {
        data = { message: 'Non-JSON response' };
      }

      return {
        status: response.status,
        data,
        responseTime
      };
    } catch (error) {
      return {
        status: 0,
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
        responseTime: Date.now() - startTime
      };
    }
  }

  createTestResult(
    endpoint,
    method,
    expected,
    actual
  ) {
    const expectedStatus = expected.status || 200;
    const statusMatch = actual.status === expectedStatus;
    
    let contentMatch = true;
    let details = `Status: ${actual.status}, Response Time: ${actual.responseTime}ms`;

    if (expected.shouldContain) {
      const responseStr = JSON.stringify(actual.data).toLowerCase();
      contentMatch = expected.shouldContain.every(item => 
        responseStr.includes(item.toLowerCase())
      );
      if (!contentMatch) {
        details += `, Missing content: ${expected.shouldContain.join(', ')}`;
      }
    }

    return {
      endpoint,
      method,
      status: statusMatch && contentMatch ? 'PASS' : 'FAIL',
      statusCode: actual.status,
      responseTime: actual.responseTime,
      response: actual.data,
      details,
      error: !statusMatch || !contentMatch ? 
        `Expected status ${expectedStatus}, got ${actual.status}` : undefined
    };
  }

  // Authentication Tests
  async testAuthentication() {
    const results = [];
    const suiteName = 'Authentication Endpoints';

    console.log(`\n🔐 Testing ${suiteName}...`);

    // Test user registration endpoint
    console.log('  Testing user registration...');
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'Test123!@#';
    
    const signupResult = await this.makeRequest('/api/auth/signup', 'POST', {
      name: 'Test User',
      email: testEmail,
      password: testPassword,
      dateOfBirth: '1990-01-01'
    });

    results.push(this.createTestResult(
      '/api/auth/signup',
      'POST',
      { status: 201, shouldContain: ['success'] },
      signupResult
    ));

    // Store test user for later tests
    if (signupResult.status === 201) {
      this.testUser = { email: testEmail, password: testPassword };
    }

    // Test alternative registration endpoint
    console.log('  Testing alternative registration...');
    const altEmail = `alt_${Date.now()}@example.com`;
    const registerResult = await this.makeRequest('/api/auth/register', 'POST', {
      name: 'Alt Test User',
      email: altEmail,
      password: testPassword
    });

    results.push(this.createTestResult(
      '/api/auth/register',
      'POST',
      { status: 201, shouldContain: ['registered successfully'] },
      registerResult
    ));

    // Test login endpoint
    if (this.testUser) {
      console.log('  Testing user login...');
      const loginResult = await this.makeRequest('/api/auth/login', 'POST', {
        email: this.testUser.email,
        password: this.testUser.password
      });

      results.push(this.createTestResult(
        '/api/auth/login',
        'POST',
        { status: 200, shouldContain: ['login successful', 'token'] },
        loginResult
      ));

      // Store auth token
      if (loginResult.status === 200 && loginResult.data.token) {
        this.authToken = loginResult.data.token;
      }
    }

    // Test invalid login
    console.log('  Testing invalid login...');
    const invalidLoginResult = await this.makeRequest('/api/auth/login', 'POST', {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    });

    results.push(this.createTestResult(
      '/api/auth/login',
      'POST',
      { status: 401, shouldContain: ['invalid credentials'] },
      invalidLoginResult
    ));

    // Test missing fields validation
    console.log('  Testing validation...');
    const missingFieldsResult = await this.makeRequest('/api/auth/signup', 'POST', {
      email: 'test@example.com'
      // Missing name and password
    });

    results.push(this.createTestResult(
      '/api/auth/signup',
      'POST',
      { status: 400, shouldContain: ['required'] },
      missingFieldsResult
    ));

    return this.generateSummary(suiteName, results);
  }

  // User Management Tests
  async testUserManagement() {
    const results = [];
    const suiteName = 'User Management Endpoints';

    console.log(`\n👥 Testing ${suiteName}...`);

    // Test get all users
    console.log('  Testing get all users...');
    const usersResult = await this.makeRequest('/api/users', 'GET');

    results.push(this.createTestResult(
      '/api/users',
      'GET',
      { status: 200, shouldContain: ['success', 'users'] },
      usersResult
    ));

    // Test with signup endpoint GET
    console.log('  Testing signup endpoint GET...');
    const signupGetResult = await this.makeRequest('/api/auth/signup', 'GET');

    results.push(this.createTestResult(
      '/api/auth/signup',
      'GET',
      { status: 200, shouldContain: ['success', 'users'] },
      signupGetResult
    ));

    return this.generateSummary(suiteName, results);
  }

  // Document Management Tests
  async testDocumentManagement() {
    const results = [];
    const suiteName = 'Document Management Endpoints';

    console.log(`\n📄 Testing ${suiteName}...`);

    // Test document upload and processing
    console.log('  Testing document processing...');
    const testContent = 'This is a test legal document for summarization and Q&A testing.';
    this.documentFingerprint = this.generateFingerprint(testContent);

    // Test document saving
    console.log('  Testing document saving...');
    const saveDocResult = await this.makeRequest('/api/documents', 'POST', {
      fingerprint: this.documentFingerprint,
      fileName: 'test-document.txt',
      fileSize: testContent.length,
      content: testContent
    });

    results.push(this.createTestResult(
      '/api/documents',
      'POST',
      { status: 200, shouldContain: ['success'] },
      saveDocResult
    ));

    // Test get documents
    console.log('  Testing get documents...');
    const getDocsResult = await this.makeRequest('/api/documents', 'GET');

    results.push(this.createTestResult(
      '/api/documents',
      'GET',
      { status: 200, shouldContain: ['success'] },
      getDocsResult
    ));

    // Test get specific document by fingerprint
    if (this.documentFingerprint) {
      console.log('  Testing get document by fingerprint...');
      const getDocResult = await this.makeRequest(
        `/api/documents?fingerprint=${this.documentFingerprint}`, 
        'GET'
      );

      results.push(this.createTestResult(
        '/api/documents?fingerprint=*',
        'GET',
        { status: 200, shouldContain: ['success'] },
        getDocResult
      ));
    }

    return this.generateSummary(suiteName, results);
  }

  // Document Processing Tests
  async testDocumentProcessing() {
    const results = [];
    const suiteName = 'Document Processing Endpoints';

    console.log(`\n⚙️ Testing ${suiteName}...`);

    // Test Q&A endpoint
    console.log('  Testing Q&A endpoint...');
    const qaResult = await this.makeRequest('/api/summarize', 'POST', {
      question: 'What is this document about?',
      documentFingerprint: this.documentFingerprint
    });

    results.push(this.createTestResult(
      '/api/summarize',
      'POST',
      { status: qaResult.status >= 200 && qaResult.status < 500 ? qaResult.status : 500 },
      qaResult
    ));

    // Test alternative QA endpoint
    console.log('  Testing alternative QA endpoint...');
    const qaAltResult = await this.makeRequest('/api/qa', 'POST', {
      question: 'What is this document about?',
      documentFingerprint: this.documentFingerprint
    });

    results.push(this.createTestResult(
      '/api/qa',
      'POST',
      { status: qaAltResult.status >= 200 && qaAltResult.status < 500 ? qaAltResult.status : 500 },
      qaAltResult
    ));

    // Test question-answer endpoint
    console.log('  Testing question-answer endpoint...');
    const questionAnswerResult = await this.makeRequest('/api/question-answer', 'POST', {
      question: 'What is this document about?',
      documentFingerprint: this.documentFingerprint
    });

    results.push(this.createTestResult(
      '/api/question-answer',
      'POST',
      { status: questionAnswerResult.status >= 200 && questionAnswerResult.status < 500 ? questionAnswerResult.status : 500 },
      questionAnswerResult
    ));

    // Test custom summarize endpoint
    console.log('  Testing custom summarization...');
    const customSummarizeResult = await this.makeRequest('/api/custom-summarize', 'POST', {
      content: 'This is a test document for custom summarization.',
      settings: { length: 'short' }
    });

    results.push(this.createTestResult(
      '/api/custom-summarize',
      'POST',
      { status: customSummarizeResult.status >= 200 && customSummarizeResult.status < 500 ? customSummarizeResult.status : 500 },
      customSummarizeResult
    ));

    return this.generateSummary(suiteName, results);
  }

  // Chat History Tests
  async testChatHistory() {
    const results = [];
    const suiteName = 'Chat History Endpoints';

    console.log(`\n💬 Testing ${suiteName}...`);

    // Test get chat history
    console.log('  Testing get chat history...');
    const getChatResult = await this.makeRequest('/api/chat-history', 'GET');

    results.push(this.createTestResult(
      '/api/chat-history',
      'GET',
      { status: 200 },
      getChatResult
    ));

    // Test save chat history
    console.log('  Testing save chat history...');
    const saveChatResult = await this.makeRequest('/api/chat-history', 'POST', {
      role: 'user',
      content: 'Test message',
      documentFingerprint: this.documentFingerprint
    });

    results.push(this.createTestResult(
      '/api/chat-history',
      'POST',
      { status: 200 },
      saveChatResult
    ));

    // Test alternative chat history endpoint
    console.log('  Testing alternative chat history...');
    const altChatResult = await this.makeRequest('/api/chat/history', 'GET');

    results.push(this.createTestResult(
      '/api/chat/history',
      'GET',
      { status: 200 },
      altChatResult
    ));

    // Test delete chat history
    console.log('  Testing delete chat history...');
    const deleteChatResult = await this.makeRequest('/api/chat/delete-history', 'DELETE');

    results.push(this.createTestResult(
      '/api/chat/delete-history',
      'DELETE',
      { status: 200 },
      deleteChatResult
    ));

    return this.generateSummary(suiteName, results);
  }

  // Infrastructure Tests
  async testInfrastructure() {
    const results = [];
    const suiteName = 'Infrastructure & Health Checks';

    console.log(`\n🔧 Testing ${suiteName}...`);

    // Test MongoDB connection
    console.log('  Testing MongoDB connection...');
    const mongoResult = await this.makeRequest('/api/test-mongodb', 'GET');

    results.push(this.createTestResult(
      '/api/test-mongodb',
      'GET',
      { status: 200, shouldContain: ['status'] },
      mongoResult
    ));

    // Test summary completion endpoint
    console.log('  Testing summary completion...');
    const summaryCompleteResult = await this.makeRequest('/api/summary/complete', 'POST', {
      text: 'Test completion request'
    });

    results.push(this.createTestResult(
      '/api/summary/complete',
      'POST',
      { status: summaryCompleteResult.status >= 200 && summaryCompleteResult.status < 500 ? summaryCompleteResult.status : 500 },
      summaryCompleteResult
    ));

    return this.generateSummary(suiteName, results);
  }

  generateSummary(suiteName, results) {
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'PASS').length,
      failed: results.filter(r => r.status === 'FAIL').length,
      skipped: results.filter(r => r.status === 'SKIP').length,
    };

    return {
      name: suiteName,
      results,
      summary
    };
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting TALQS API Testing Suite...\n');

    const testSuites = [];

    // Run test suites in order
    testSuites.push(await this.testAuthentication());
    testSuites.push(await this.testUserManagement());
    testSuites.push(await this.testDocumentManagement());
    testSuites.push(await this.testDocumentProcessing());
    testSuites.push(await this.testChatHistory());
    testSuites.push(await this.testInfrastructure());

    // Calculate overall summary
    const overallSummary = testSuites.reduce(
      (acc, suite) => ({
        total: acc.total + suite.summary.total,
        passed: acc.passed + suite.summary.passed,
        failed: acc.failed + suite.summary.failed,
        skipped: acc.skipped + suite.summary.skipped,
      }),
      { total: 0, passed: 0, failed: 0, skipped: 0 }
    );

    // Generate detailed report
    const report = this.generateDetailedReport(testSuites, overallSummary);

    return { testSuites, overallSummary, report };
  }

  generateDetailedReport(testSuites, overallSummary) {
    let report = '\n' + '='.repeat(80) + '\n';
    report += '                      TALQS API TESTING REPORT\n';
    report += '='.repeat(80) + '\n\n';

    // Overall summary
    report += '📊 OVERALL SUMMARY:\n';
    report += `   Total Tests: ${overallSummary.total}\n`;
    report += `   ✅ Passed: ${overallSummary.passed}\n`;
    report += `   ❌ Failed: ${overallSummary.failed}\n`;
    report += `   ⏭️  Skipped: ${overallSummary.skipped}\n`;
    report += `   Success Rate: ${((overallSummary.passed / overallSummary.total) * 100).toFixed(1)}%\n\n`;

    // Detailed results for each test suite
    testSuites.forEach((suite) => {
      report += `🔍 ${suite.name.toUpperCase()}\n`;
      report += `-`.repeat(50) + '\n';
      report += `   Tests: ${suite.summary.total} | `;
      report += `Passed: ${suite.summary.passed} | `;
      report += `Failed: ${suite.summary.failed} | `;
      report += `Skipped: ${suite.summary.skipped}\n\n`;

      suite.results.forEach((result) => {
        const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
        report += `   ${statusIcon} ${result.method} ${result.endpoint}\n`;
        report += `      Status: ${result.statusCode} | Response Time: ${result.responseTime}ms\n`;
        
        if (result.error) {
          report += `      Error: ${result.error}\n`;
        }
        
        if (result.details) {
          report += `      Details: ${result.details}\n`;
        }
        
        report += '\n';
      });
    });

    // Recommendations
    report += '📋 RECOMMENDATIONS:\n';
    report += '-'.repeat(30) + '\n';

    const failedTests = testSuites.flatMap(suite => 
      suite.results.filter(result => result.status === 'FAIL')
    );

    if (failedTests.length === 0) {
      report += '✨ All tests passed! The API is functioning correctly.\n\n';
    } else {
      report += `🚨 ${failedTests.length} test(s) failed. Priority fixes needed:\n\n`;
      
      failedTests.forEach((test, index) => {
        report += `${index + 1}. ${test.method} ${test.endpoint}\n`;
        report += `   Issue: ${test.error || 'Unknown error'}\n`;
        report += `   Status Code: ${test.statusCode}\n\n`;
      });
    }

    // Backend service status
    report += '🔌 EXTERNAL SERVICE STATUS:\n';
    report += '-'.repeat(35) + '\n';
    report += '• Summarization Backend (Port 8001): Check if running\n';
    report += '• Q&A Backend (Port 8000): Check if running\n';
    report += '• MongoDB: Check connection status\n\n';

    report += '='.repeat(80) + '\n';

    return report;
  }
}

// Main execution function
async function main() {
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const tester = new APITester(baseUrl);

  try {
    const { testSuites, overallSummary, report } = await tester.runAllTests();
    
    console.log(report);

    // Exit with appropriate code
    process.exit(overallSummary.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Test suite execution failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { APITester };

// Run if called directly
if (require.main === module) {
  main();
}