require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const static = require('@fastify/static');
const path = require('path');
const cron = require('node-cron');

const { initDb } = require('./db/database');
const routes = require('./api/routes');
const AdzunaScraper = require('./scrapers/adzuna');
const { calculateMatchScore } = require('./matcher/scorer');

// Initialize database
initDb();

// Register plugins
fastify.register(cors, { origin: true });
fastify.register(routes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  fastify.register(static, {
    root: path.join(__dirname, '../frontend/dist'),
    prefix: '/'
  });
}

// Scheduled job scraping (runs daily at 8 AM)
cron.schedule('0 8 * * *', async () => {
  console.log('Running scheduled job scraping...');
  await runScrapers();
});

async function runScrapers() {
  const { getDb } = require('./db/database');
  const db = getDb();
  
  const scrapers = [
    new AdzunaScraper()
  ];
  
  const searchKeywords = ['head of engineering', 'cto', 'vp engineering', 'director engineering'];
  const locations = ['remote', 'Spain', 'Valencia', 'Madrid', 'Barcelona'];
  
  for (const scraper of scrapers) {
    try {
      console.log(`Running scraper: ${scraper.constructor.name}`);
      const logStart = Date.now();
      
      let allJobs = [];
      for (const keyword of searchKeywords.slice(0, 2)) {
        for (const location of locations.slice(0, 2)) {
          const jobs = await scraper.searchJobs(keyword, location);
          allJobs = allJobs.concat(jobs);
        }
      }
      
      // Remove duplicates by external_id
      const uniqueJobs = allJobs.filter((job, index, self) => 
        index === self.findIndex(j => j.external_id === job.external_id)
      );
      
      let added = 0;
      let updated = 0;
      
      for (const job of uniqueJobs) {
        // Calculate match score
        const { score, reasons } = calculateMatchScore(job);
        
        // Insert or update job
        await new Promise((resolve, reject) => {
          const stmt = db.prepare(`
            INSERT INTO jobs (
              external_id, source, title, company, location, description,
              url, salary_min, salary_max, salary_currency, job_type, remote,
              tags, posted_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(external_id) DO UPDATE SET
              updated_at = CURRENT_TIMESTAMP,
              salary_min = COALESCE(excluded.salary_min, salary_min),
              salary_max = COALESCE(excluded.salary_max, salary_max)
          `);
          
          stmt.run([
            job.external_id,
            job.source,
            job.title,
            job.company,
            job.location,
            job.description,
            job.url,
            job.salary_min,
            job.salary_max,
            job.salary_currency,
            job.job_type,
            job.remote ? 1 : 0,
            job.tags,
            job.posted_at
          ], function(err) {
            if (err) reject(err);
            else {
              if (this.changes > 0) {
                if (this.lastID) added++;
                else updated++;
              }
              resolve();
            }
            stmt.finalize();
          });
        });
        
        // Get job ID for match scoring
        const jobId = await new Promise((resolve, reject) => {
          db.get('SELECT id FROM jobs WHERE external_id = ?', [job.external_id], (err, row) => {
            if (err) reject(err);
            else resolve(row?.id);
          });
        });
        
        if (jobId) {
          // Insert or update match score
          await new Promise((resolve, reject) => {
            db.run(`
              INSERT INTO job_matches (job_id, match_score, match_reasons)
              VALUES (?, ?, ?)
              ON CONFLICT(job_id) DO UPDATE SET
                match_score = excluded.match_score,
                match_reasons = excluded.match_reasons,
                updated_at = CURRENT_TIMESTAMP
            `, [jobId, score, JSON.stringify(reasons)], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        }
      }
      
      // Log scraper run
      db.run(`
        INSERT INTO scraper_logs (source, jobs_found, jobs_added, jobs_updated, started_at, finished_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [scraper.constructor.name, uniqueJobs.length, added, updated, logStart, Date.now()]);
      
      console.log(`Scraper completed: ${uniqueJobs.length} found, ${added} added, ${updated} updated`);
      
    } catch (error) {
      console.error('Scraper error:', error);
      
      db.run(`
        INSERT INTO scraper_logs (source, jobs_found, jobs_added, jobs_updated, error, finished_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [scraper.constructor.name, 0, 0, 0, error.message, Date.now()]);
    }
  }
  
  db.close();
}

// Manual trigger endpoint
fastify.post('/api/scrape', async (request, reply) => {
  await runScrapers();
  return { message: 'Scraping completed' };
});

// Start server
const start = async () => {
  try {
    const PORT = process.env.PORT || 3001;
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();