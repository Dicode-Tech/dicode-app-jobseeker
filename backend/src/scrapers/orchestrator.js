/**
 * Job Scraper Orchestrator
 * Manages multiple job sources and coordinates scraping
 */
const AdzunaScraper = require('./adzuna');
const RemoteOKScraper = require('./remoteok');
const ArbeitnowScraper = require('./arbeitnow');
const WeWorkRemotelyScraper = require('./weworkremotely');
const RemotiveScraper = require('./remotive');
const HimalayasScraper = require('./himalayas');
const WorkingNomadsScraper = require('./workingnomads');

// Registry of available scrapers
const SCRAPER_REGISTRY = {
  adzuna: AdzunaScraper,
  remoteok: RemoteOKScraper,
  arbeitnow: ArbeitnowScraper,
  weworkremotely: WeWorkRemotelyScraper,
  remotive: RemotiveScraper,
  himalayas: HimalayasScraper,
  workingnomads: WorkingNomadsScraper,
  all: [AdzunaScraper, RemoteOKScraper, ArbeitnowScraper, WeWorkRemotelyScraper, RemotiveScraper, HimalayasScraper, WorkingNomadsScraper]
};

/**
 * Run scrapers based on configuration
 * @param {Object} options - Scraping options
 * @param {string[]} options.sources - Array of source names ['adzuna', 'remoteok'] or ['all']
 * @param {string} options.keywords - Search keywords
 * @param {string} options.location - Location filter
 * @param {number} options.limit - Max jobs per source
 * @param {Function} options.onProgress - Progress callback (source, found, processed)
 * @returns {Promise<Array>} - Array of all scraped jobs
 */
async function runScrapers(options = {}) {
  const {
    sources = ['all'],
    keywords = '',
    location = '',
    limit = 100,
    onProgress = () => {}
  } = options;

  // Determine which scrapers to run
  let scraperClasses = [];
  
  if (sources.includes('all')) {
    scraperClasses = SCRAPER_REGISTRY.all;
  } else {
    scraperClasses = sources
      .map(name => SCRAPER_REGISTRY[name])
      .filter(Boolean);
  }

  if (scraperClasses.length === 0) {
    console.warn('[Orchestrator] No valid scrapers specified');
    return [];
  }

  console.log(`[Orchestrator] Running ${scraperClasses.length} scraper(s): ${sources.join(', ')}`);
  
  const allJobs = [];
  
  for (const ScraperClass of scraperClasses) {
    const scraper = new ScraperClass();
    const sourceName = scraper.source || ScraperClass.name;
    
    try {
      console.log(`[Orchestrator] Starting ${sourceName}...`);
      
      // Different scrapers have different optimal search strategies
      let jobs = [];
      
      if (sourceName === 'adzuna') {
        // Adzuna: Multiple keyword + location combos
        const searchKeywords = keywords ? [keywords] : [
          'software engineer', 'desarrollador', 'programador', 
          'tech lead', 'engineering manager', 'cto', 'vp engineering'
        ];
        const locations = location ? [location] : ['madrid', 'barcelona', 'valencia', 'españa'];
        
        for (const kw of searchKeywords.slice(0, 3)) {
          for (const loc of locations.slice(0, 2)) {
            const found = await scraper.searchJobs(kw, loc);
            jobs = jobs.concat(found);
            await delay(500); // Be nice to APIs
          }
        }
      } else if (sourceName === 'remoteok') {
        // RemoteOK: All jobs, filter by keywords/tags
        const tags = keywords ? keywords.split(/[\s,]+/) : ['software', 'engineering'];
        jobs = await scraper.searchJobs(keywords, '', tags);
      } else if (sourceName === 'arbeitnow') {
        // Arbeitnow: Direct search
        jobs = await scraper.searchJobs(keywords, location, 1);
        // Get page 2 if needed
        if (jobs.length < limit / 2) {
          const page2 = await scraper.searchJobs(keywords, location, 2);
          jobs = jobs.concat(page2);
        }
      } else if (sourceName === 'weworkremotely') {
        // WeWorkRemotely: RSS-based, filter by keywords
        jobs = await scraper.searchJobs(keywords);
      } else if (sourceName === 'remotive') {
        // Remotive: Public API with category filtering
        jobs = await scraper.searchJobs(keywords, location, limit);
      } else if (sourceName === 'himalayas') {
        // Himalayas: JSON API with pagination
        jobs = await scraper.searchJobs(keywords, location, limit);
      } else if (sourceName === 'workingnomads') {
        // Working Nomads: JSON API, all remote
        jobs = await scraper.searchJobs(keywords, location, limit);
      } else {
        // Generic fallback
        jobs = await scraper.searchJobs(keywords, location);
      }
      
      // Deduplicate within this source
      const uniqueJobs = jobs.filter((job, index, self) => 
        index === self.findIndex(j => j.external_id === job.external_id)
      );
      
      console.log(`[Orchestrator] ${sourceName}: ${uniqueJobs.length} unique jobs`);
      onProgress(sourceName, uniqueJobs.length, uniqueJobs.length);
      
      allJobs.push(...uniqueJobs);
      
    } catch (error) {
      console.error(`[Orchestrator] Error in ${sourceName}:`, error.message);
      onProgress(sourceName, 0, 0, error.message);
    }
  }

  // Global deduplication across all sources
  const globallyUnique = allJobs.filter((job, index, self) => 
    index === self.findIndex(j => j.external_id === job.external_id)
  );

  console.log(`[Orchestrator] Total: ${globallyUnique.length} unique jobs from ${scraperClasses.length} source(s)`);
  return globallyUnique.slice(0, limit);
}

/**
 * Get list of available scraper sources
 * @returns {string[]} - Array of source names
 */
function getAvailableSources() {
  return Object.keys(SCRAPER_REGISTRY).filter(k => k !== 'all');
}

/**
 * Get scraper info
 * @param {string} sourceName - Name of the source
 * @returns {Object|null} - Scraper info or null
 */
function getScraperInfo(sourceName) {
  const sources = {
    adzuna: {
      name: 'Adzuna',
      description: 'Job search engine for Spain and Europe',
      requiresAuth: true,
      locations: ['Spain', 'UK', 'Germany', 'France', 'Europe'],
      jobTypes: ['All types']
    },
    remoteok: {
      name: 'RemoteOK',
      description: 'Remote jobs from companies worldwide',
      requiresAuth: false,
      locations: ['Remote/Global'],
      jobTypes: ['Remote only']
    },
    arbeitnow: {
      name: 'Arbeitnow',
      description: 'European tech jobs (GitHub Jobs alternative)',
      requiresAuth: false,
      locations: ['Europe', 'Germany', 'Remote EU'],
      jobTypes: ['Tech/Software']
    },
    weworkremotely: {
      name: 'We Work Remotely',
      description: 'Curated remote jobs from top companies',
      requiresAuth: false,
      locations: ['Remote/Global'],
      jobTypes: ['Remote only', 'Programming', 'Design', 'DevOps']
    },
    remotive: {
      name: 'Remotive',
      description: 'Remote jobs from vetted tech companies',
      requiresAuth: false,
      locations: ['Remote/Global', 'USA', 'Europe', 'Worldwide'],
      jobTypes: ['Remote only', 'Software Development', 'Marketing', 'Design']
    },
    himalayas: {
      name: 'Himalayas',
      description: 'Tech-focused remote jobs with company profiles',
      requiresAuth: false,
      locations: ['Remote/Global', 'USA', 'Europe', 'APAC'],
      jobTypes: ['Remote only', 'Tech', 'Engineering', 'Product']
    },
    workingnomads: {
      name: 'Working Nomads',
      description: 'Fully remote jobs for digital nomads',
      requiresAuth: false,
      locations: ['Remote/Global', 'Anywhere'],
      jobTypes: ['Remote only', 'Development', 'Design', 'Marketing', 'Writing']
    }
  };
  
  return sources[sourceName] || null;
}

// Helper
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  runScrapers,
  getAvailableSources,
  getScraperInfo,
  SCRAPER_REGISTRY
};
