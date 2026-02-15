/**
 * Test Suite for Job Scrapers
 * Tests all 4 sources: Adzuna, RemoteOK, Arbeitnow, WeWorkRemotely
 */

const axios = require('axios');
const cheerio = require('cheerio');

// Import scrapers
const AdzunaScraper = require('../src/scrapers/adzuna');
const RemoteOKScraper = require('../src/scrapers/remoteok');
const ArbeitnowScraper = require('../src/scrapers/arbeitnow');
const WeWorkRemotelyScraper = require('../src/scrapers/weworkremotely');

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

function validateJob(job, source) {
  const errors = [];
  
  // Required fields
  const requiredFields = ['external_id', 'title', 'company', 'url', 'description', 'posted_at'];
  for (const field of requiredFields) {
    if (job[field] === undefined || job[field] === null) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate field types and content
  if (job.external_id && typeof job.external_id !== 'string') {
    errors.push('external_id must be a string');
  }
  
  if (job.title && (typeof job.title !== 'string' || job.title.trim().length === 0)) {
    errors.push('title must be a non-empty string');
  }
  
  if (job.company && (typeof job.company !== 'string' || job.company.trim().length === 0)) {
    errors.push('company must be a non-empty string');
  }
  
  if (job.url && (typeof job.url !== 'string' || !job.url.startsWith('http'))) {
    errors.push('url must be a valid HTTP URL');
  }
  
  if (job.posted_at && !(job.posted_at instanceof Date) && isNaN(new Date(job.posted_at))) {
    errors.push('posted_at must be a valid date');
  }
  
  // Source field check
  if (job.source !== source) {
    errors.push(`source should be '${source}' but got '${job.source}'`);
  }
  
  return errors;
}

// ============ ADZUNA TESTS ============
async function testAdzuna() {
  console.log('\n📋 Testing Adzuna API...\n');
  
  const scraper = new AdzunaScraper();
  
  // Test 1: API connectivity
  try {
    const jobs = await scraper.searchJobs('software engineer', 'madrid', 1);
    logTest('Adzuna - API Connection', true, { jobsFound: jobs.length });
    
    // Test 2: Returns at least 1 job (if credentials exist)
    if (jobs.length > 0) {
      logTest('Adzuna - Returns Jobs', true, { count: jobs.length });
      
      // Test 3: Job structure validation
      const job = jobs[0];
      const errors = validateJob(job, 'adzuna');
      logTest('Adzuna - Job Structure', errors.length === 0, { 
        errors, 
        job: { 
          external_id: job.external_id, 
          title: job.title?.substring(0, 50),
          company: job.company
        } 
      });
      
      // Test 4: Specific fields
      logTest('Adzuna - Has salary fields', 
        job.salary_min !== undefined || job.salary_max !== undefined,
        { salary_min: job.salary_min, salary_max: job.salary_max }
      );
    } else {
      // No jobs might mean missing credentials
      const hasCredentials = process.env.ADZUNA_APP_ID && process.env.ADZUNA_API_KEY;
      logTest('Adzuna - Returns Jobs', false, { 
        reason: hasCredentials ? 'API returned no jobs' : 'Missing API credentials',
        hasCredentials 
      });
    }
  } catch (error) {
    logTest('Adzuna - API Connection', false, { error: error.message });
    logTest('Adzuna - Returns Jobs', false, { error: error.message });
    logTest('Adzuna - Job Structure', false, { error: error.message });
  }
}

// ============ REMOTEOK TESTS ============
async function testRemoteOK() {
  console.log('\n📋 Testing RemoteOK API...\n');
  
  const scraper = new RemoteOKScraper();
  
  // Test 1: API connectivity
  try {
    const jobs = await scraper.searchJobs();
    logTest('RemoteOK - API Connection', true, { jobsFound: jobs.length });
    
    // Test 2: Returns at least 1 job
    if (jobs.length > 0) {
      logTest('RemoteOK - Returns Jobs', true, { count: jobs.length });
      
      // Test 3: Job structure validation
      const job = jobs[0];
      const errors = validateJob(job, 'remoteok');
      logTest('RemoteOK - Job Structure', errors.length === 0, { 
        errors, 
        job: { 
          external_id: job.external_id, 
          title: job.title?.substring(0, 50),
          company: job.company
        } 
      });
      
      // Test 4: Has tags
      logTest('RemoteOK - Has tags', job.tags !== undefined, { tags: job.tags?.substring(0, 50) });
      
      // Test 5: All jobs are remote
      logTest('RemoteOK - All Jobs Remote', jobs.every(j => j.remote === true), { 
        remoteCount: jobs.filter(j => j.remote).length 
      });
    } else {
      logTest('RemoteOK - Returns Jobs', false, { reason: 'No jobs returned' });
    }
  } catch (error) {
    logTest('RemoteOK - API Connection', false, { error: error.message });
    logTest('RemoteOK - Returns Jobs', false, { error: error.message });
  }
}

// ============ ARBEITNOW TESTS ============
async function testArbeitnow() {
  console.log('\n📋 Testing Arbeitnow API...\n');
  
  const scraper = new ArbeitnowScraper();
  
  // Test 1: API connectivity
  try {
    const jobs = await scraper.searchJobs('software', '', 1);
    logTest('Arbeitnow - API Connection', true, { jobsFound: jobs.length });
    
    // Test 2: Returns at least 1 job
    if (jobs.length > 0) {
      logTest('Arbeitnow - Returns Jobs', true, { count: jobs.length });
      
      // Test 3: Job structure validation
      const job = jobs[0];
      const errors = validateJob(job, 'arbeitnow');
      logTest('Arbeitnow - Job Structure', errors.length === 0, { 
        errors, 
        job: { 
          external_id: job.external_id, 
          title: job.title?.substring(0, 50),
          company: job.company
        } 
      });
      
      // Test 4: Has remote field
      logTest('Arbeitnow - Has remote field', job.remote !== undefined, { remote: job.remote });
    } else {
      logTest('Arbeitnow - Returns Jobs', false, { reason: 'No jobs returned' });
    }
  } catch (error) {
    logTest('Arbeitnow - API Connection', false, { error: error.message });
    logTest('Arbeitnow - Returns Jobs', false, { error: error.message });
  }
}

// ============ WEWORKREMOTELY TESTS ============
async function testWeWorkRemotely() {
  console.log('\n📋 Testing WeWorkRemotely Scraper...\n');
  
  const scraper = new WeWorkRemotelyScraper();
  
  // Test 1: RSS feed connectivity
  try {
    const jobs = await scraper.searchJobs();
    logTest('WeWorkRemotely - RSS Connection', true, { jobsFound: jobs.length });
    
    // Test 2: Returns at least 1 job
    if (jobs.length > 0) {
      logTest('WeWorkRemotely - Returns Jobs', true, { count: jobs.length });
      
      // Test 3: Job structure validation
      const job = jobs[0];
      const errors = validateJob(job, 'weworkremotely');
      logTest('WeWorkRemotely - Job Structure', errors.length === 0, { 
        errors, 
        job: { 
          external_id: job.external_id, 
          title: job.title?.substring(0, 50),
          company: job.company
        } 
      });
      
      // Test 4: Has description with HTML
      const hasHtmlDescription = job.description && job.description.includes('<');
      logTest('WeWorkRemotely - Has HTML Description', hasHtmlDescription, { 
        descriptionLength: job.description?.length 
      });
      
      // Test 5: Has valid posted_at date
      const hasValidDate = job.posted_at instanceof Date && !isNaN(job.posted_at);
      logTest('WeWorkRemotely - Has Valid Date', hasValidDate, { 
        posted_at: job.posted_at?.toISOString() 
      });
    } else {
      logTest('WeWorkRemotely - Returns Jobs', false, { reason: 'No jobs returned' });
    }
  } catch (error) {
    logTest('WeWorkRemotely - RSS Connection', false, { error: error.message });
    logTest('WeWorkRemotely - Returns Jobs', false, { error: error.message });
  }
}

// ============ HTML SCRAPING TESTS (Direct) ============
async function testDirectHTMLScraping() {
  console.log('\n📋 Testing Direct HTML Scraping...\n');
  
  try {
    const url = 'https://weworkremotely.com/categories/programming';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 15000
    });
    
    logTest('HTML Scraping - HTTP Connection', true, { 
      status: response.status, 
      length: response.data?.length 
    });
    
    const $ = cheerio.load(response.data);
    
    // Check if expected elements exist
    const hasJobSections = $('section.jobs').length > 0;
    logTest('HTML Scraping - Has Job Sections', hasJobSections, { 
      sectionCount: $('section.jobs').length 
    });
    
    const hasJobItems = $('section.jobs li').length > 0;
    logTest('HTML Scraping - Has Job Items', hasJobItems, { 
      itemCount: $('section.jobs li').length 
    });
    
    // Check new selectors
    const hasNewSelectors = $('.new-listing__header__title').length > 0;
    logTest('HTML Scraping - New Selectors Work', hasNewSelectors, { 
      titleElements: $('.new-listing__header__title').length 
    });
    
  } catch (error) {
    logTest('HTML Scraping - HTTP Connection', false, { error: error.message });
    logTest('HTML Scraping - Has Job Sections', false, { error: error.message });
    logTest('HTML Scraping - Has Job Items', false, { error: error.message });
  }
}

// ============ RSS FEED TEST ============
async function testRSSFeed() {
  console.log('\n📋 Testing RSS Feed...\n');
  
  try {
    const url = 'https://weworkremotely.com/remote-jobs.rss';
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 15000
    });
    
    logTest('RSS Feed - HTTP Connection', true, { 
      status: response.status, 
      length: response.data?.length 
    });
    
    const $ = cheerio.load(response.data, { xmlMode: true });
    
    const hasItems = $('item').length > 0;
    logTest('RSS Feed - Has Items', hasItems, { itemCount: $('item').length });
    
    const hasPubDates = $('pubDate').length > 0;
    logTest('RSS Feed - Has PubDates', hasPubDates, { pubDateCount: $('pubDate').length });
    
    const hasTitles = $('item title').length > 0;
    logTest('RSS Feed - Has Titles', hasTitles, { titleCount: $('item title').length });
    
  } catch (error) {
    logTest('RSS Feed - HTTP Connection', false, { error: error.message });
    logTest('RSS Feed - Has Items', false, { error: error.message });
  }
}

// ============ MAIN TEST RUNNER ============
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         JOB SCRAPER TEST SUITE                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  const startTime = Date.now();
  
  await testAdzuna();
  await testRemoteOK();
  await testArbeitnow();
  await testWeWorkRemotely();
  await testDirectHTMLScraping();
  await testRSSFeed();
  
  const duration = Date.now() - startTime;
  
  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         TEST SUMMARY                                       ║');
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
        if (t.details?.reason) console.log(`   Reason: ${t.details.reason}`);
        if (t.details?.errors?.length) {
          t.details.errors.forEach(e => console.log(`   - ${e}`));
        }
      });
  }
  
  // Return results for programmatic use
  return {
    ...testResults,
    duration,
    successRate: (testResults.passed / testResults.tests.length) * 100,
    allPassed: testResults.failed === 0
  };
}

// Run if called directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      console.log('\n' + (results.allPassed ? '✅ All tests passed!' : '❌ Some tests failed'));
      process.exit(results.allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests, testResults };
