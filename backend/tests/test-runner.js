/**
 * Test Runner - Runs all test suites
 */

const { runAllTests: runScraperTests } = require('./test-scrapers');

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           JOBSEEKER BACKEND TEST RUNNER                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
  
  const results = {
    scrapers: null,
    orchestrator: null,
    api: null,
    timestamp: new Date().toISOString()
  };
  
  let allPassed = true;
  
  // Run scraper tests
  try {
    console.log('▶ Running Scraper Tests...\n');
    results.scrapers = await runScraperTests();
    if (!results.scrapers.allPassed) allPassed = false;
  } catch (error) {
    console.error('❌ Scraper tests failed with error:', error.message);
    results.scrapers = { error: error.message, allPassed: false };
    allPassed = false;
  }
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           FINAL SUMMARY                                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  
  if (allPassed) {
    console.log('\n✅ ALL TESTS PASSED!\n');
  } else {
    console.log('\n❌ SOME TESTS FAILED\n');
  }
  
  return { results, allPassed };
}

// Run if called directly
if (require.main === module) {
  runAllTests()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner error:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };
