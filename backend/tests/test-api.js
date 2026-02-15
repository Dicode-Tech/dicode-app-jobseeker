/**
 * API Endpoint Tests
 * Tests all scraping and job API endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TIMEOUT = 30000;

// Test results collector
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = {}) {
  const result = { name, passed, details, timestamp: new Date().toISOString() };
  testResults.tests.push(result);
  if (passed) {
    testResults.passed++;
    console.log(`✅ PASS: ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ FAIL: ${name}`);
    if (details.error) console.log(`   Error: ${details.error}`);
  }
  return result;
}

// Helper to make API calls
async function apiCall(method, endpoint, data = null) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const response = await axios({
      method,
      url,
      data,
      timeout: TIMEOUT,
      validateStatus: () => true // Don't throw on error status
    });
    return { success: response.status < 400, status: response.status, data: response.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test 1: Check if server is running
async function testServerRunning() {
  console.log('\n📋 Testing Server Connection...\n');
  
  try {
    // Try to connect to the server
    const response = await axios.get(`${BASE_URL}/api/stats`, { 
      timeout: 5000,
      validateStatus: () => true 
    });
    logTest('Server - Running', true, { status: response.status });
    return true;
  } catch (error) {
    logTest('Server - Running', false, { 
      error: 'Server not running. Start with: npm run dev' 
    });
    return false;
  }
}

// Test 2: GET /api/scrape/sources
async function testScrapeSources() {
  console.log('\n📋 Testing GET /api/scrape/sources...\n');
  
  const result = await apiCall('GET', '/api/scrape/sources');
  
  logTest('GET /api/scrape/sources - Success', result.success, { status: result.status });
  
  if (result.success && result.data) {
    const hasSources = Array.isArray(result.data.sources);
    logTest('GET /api/scrape/sources - Returns Sources Array', hasSources, { 
      count: result.data.sources?.length 
    });
    
    if (hasSources && result.data.sources.length > 0) {
      const first = result.data.sources[0];
      logTest('GET /api/scrape/sources - Has Required Fields', 
        first.name && first.description !== undefined, 
        { firstSource: first.name }
      );
    }
  }
}

// Test 3: POST /api/scrape (default all sources)
async function testScrapeAll() {
  console.log('\n📋 Testing POST /api/scrape (all sources)...\n');
  
  const result = await apiCall('POST', '/api/scrape', {
    keywords: 'javascript',
    limit: 10
  });
  
  logTest('POST /api/scrape - Success', result.success, { status: result.status });
  
  if (result.success && result.data) {
    logTest('POST /api/scrape - Returns Jobs', 
      result.data.jobs !== undefined, 
      { jobsCount: result.data.jobs?.length }
    );
    
    logTest('POST /api/scrape - Has Duration', 
      result.data.duration_ms !== undefined,
      { duration: result.data.duration_ms }
    );
    
    logTest('POST /api/scrape - Has By Source', 
      result.data.by_source !== undefined,
      { bySource: result.data.by_source }
    );
  }
}

// Test 4: POST /api/scrape/custom (specific sources)
async function testScrapeCustom() {
  console.log('\n📋 Testing POST /api/scrape/custom (specific sources)...\n');
  
  const result = await apiCall('POST', '/api/scrape/custom', {
    sources: ['remoteok', 'weworkremotely'],
    keywords: 'react',
    limit: 10
  });
  
  logTest('POST /api/scrape/custom - Success', result.success, { status: result.status });
  
  if (result.success && result.data) {
    logTest('POST /api/scrape/custom - Returns Jobs', 
      result.data.jobs !== undefined,
      { jobsCount: result.data.jobs?.length }
    );
  }
}

// Test 5: POST /api/scrape/custom (validation)
async function testScrapeCustomValidation() {
  console.log('\n📋 Testing POST /api/scrape/custom (validation)...\n');
  
  // Test missing sources
  const result = await apiCall('POST', '/api/scrape/custom', {
    keywords: 'test'
    // missing sources
  });
  
  logTest('POST /api/scrape/custom - Validates Missing Sources', 
    result.status === 400,
    { status: result.status }
  );
}

// Test 6: GET /api/jobs
async function testGetJobs() {
  console.log('\n📋 Testing GET /api/jobs...\n');
  
  const result = await apiCall('GET', '/api/jobs?limit=5');
  
  logTest('GET /api/jobs - Success', result.success, { status: result.status });
  
  if (result.success && result.data) {
    logTest('GET /api/jobs - Returns Jobs Array', 
      Array.isArray(result.data.jobs),
      { count: result.data.jobs?.length }
    );
    
    logTest('GET /api/jobs - Has Count', 
      result.data.count !== undefined,
      { count: result.data.count }
    );
  }
}

// Test 7: GET /api/jobs with query params
async function testGetJobsWithParams() {
  console.log('\n📋 Testing GET /api/jobs with query params...\n');
  
  const result = await apiCall('GET', '/api/jobs?search=software&limit=3');
  
  logTest('GET /api/jobs with search - Success', result.success, { status: result.status });
  
  if (result.success && result.data) {
    logTest('GET /api/jobs with search - Returns Filtered Results', 
      Array.isArray(result.data.jobs),
      { count: result.data.jobs?.length }
    );
  }
}

// Test 8: GET /api/jobs/count
async function testGetJobsCount() {
  console.log('\n📋 Testing GET /api/jobs/count...\n');
  
  const result = await apiCall('GET', '/api/jobs/count');
  
  logTest('GET /api/jobs/count - Success', result.success, { status: result.status });
  
  if (result.success && result.data) {
    logTest('GET /api/jobs/count - Returns Total', 
      typeof result.data.total === 'number',
      { total: result.data.total }
    );
  }
}

// Test 9: GET /api/stats
async function testGetStats() {
  console.log('\n📋 Testing GET /api/stats...\n');
  
  const result = await apiCall('GET', '/api/stats');
  
  logTest('GET /api/stats - Success', result.success, { status: result.status });
  
  if (result.success && result.data) {
    logTest('GET /api/stats - Has Required Fields',
      result.data.total_jobs !== undefined && 
      result.data.high_matches !== undefined,
      { stats: result.data }
    );
  }
}

// Test 10: GET /api/profile
async function testGetProfile() {
  console.log('\n📋 Testing GET /api/profile...\n');
  
  const result = await apiCall('GET', '/api/profile');
  
  logTest('GET /api/profile - Success', result.success, { status: result.status });
}

// Main test runner
async function runAPITests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         API ENDPOINT TEST SUITE                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  
  // First check if server is running
  const serverRunning = await testServerRunning();
  
  if (!serverRunning) {
    console.log('\n⚠️  Server not running. Please start it with: npm run dev');
    console.log('   Then run this test again.\n');
    return { allPassed: false, tests: testResults.tests };
  }
  
  // Run all API tests
  await testScrapeSources();
  await testScrapeAll();
  await testScrapeCustom();
  await testScrapeCustomValidation();
  await testGetJobs();
  await testGetJobsWithParams();
  await testGetJobsCount();
  await testGetStats();
  await testGetProfile();
  
  const duration = Date.now() - startTime;
  
  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         API TEST SUMMARY                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\nTotal Tests: ${testResults.tests.length}`);
  console.log(`Passed: ${testResults.passed} ✅`);
  console.log(`Failed: ${testResults.failed} ❌`);
  console.log(`Duration: ${duration}ms`);
  console.log(`Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(1)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n--- Failed Tests ---');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`❌ ${t.name}`);
        if (t.details?.error) console.log(`   Error: ${t.details.error}`);
      });
  }
  
  return {
    ...testResults,
    duration,
    successRate: (testResults.passed / testResults.tests.length) * 100,
    allPassed: testResults.failed === 0
  };
}

// Run if called directly
if (require.main === module) {
  runAPITests()
    .then(results => {
      console.log('\n' + (results.allPassed ? '✅ All API tests passed!' : '❌ Some API tests failed'));
      process.exit(results.allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('API test runner error:', error);
      process.exit(1);
    });
}

module.exports = { runAPITests, testResults };
