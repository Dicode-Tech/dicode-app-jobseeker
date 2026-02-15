require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const static = require('@fastify/static');
const path = require('path');
const cron = require('node-cron');

const { initDb } = require('./db/database');
const routes = require('./api/routes');
const { runScrapers: runScrapersOrch, getAvailableSources, getScraperInfo } = require('./scrapers/orchestrator');
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
  await executeScraperRun();
});

async function executeScraperRun(options = {}) {
  const { getDb } = require('./db/database');
  const db = getDb();
  
  const { sources = ['all'], keywords = '', location = '' } = options;
  
  try {
    console.log(`[Scraper] Starting scrape with sources: ${sources.join(', ')}`);
    const logStart = Date.now();
    
    // Use orchestrator to fetch jobs from multiple sources
    const uniqueJobs = await runScrapersOrch({
      sources,
      keywords,
      location,
      limit: 200,
      onProgress: (source, found, processed, error) => {
        if (error) {
          console.error(`[Scraper] ${source} error: ${error}`);
        } else {
          console.log(`[Scraper] ${source}: ${found} jobs found`);
        }
      }
    });
    
    console.log(`[Scraper] Total unique jobs to process: ${uniqueJobs.length}`);
    
    let added = 0;
    let updated = 0;
    let processedCount = 0;
    
    for (const job of uniqueJobs) {
      processedCount++;
      
      // Calculate match score
      const { score, reasons } = calculateMatchScore(job);
      
      // Validate job data
      if (!job.external_id || !job.title || !job.url) {
        console.log(`[Scraper] Skipping invalid job #${processedCount}: missing required fields`);
        continue;
      }
      
      // Insert or update job
      try {
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
            if (err) {
              console.error(`[Scraper] DB error for job ${job.external_id}:`, err.message);
              reject(err);
            } else {
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
          try {
            await new Promise((resolve, reject) => {
              db.run(`
                INSERT INTO job_matches (job_id, match_score, match_reasons, status)
                VALUES (?, ?, ?, 'new')
                ON CONFLICT(job_id) DO UPDATE SET
                  match_score = excluded.match_score,
                  match_reasons = excluded.match_reasons,
                  updated_at = CURRENT_TIMESTAMP
              `, [jobId, score, JSON.stringify(reasons)], (err) => {
                if (err) {
                  console.error(`[Scraper] Match score error for job ${jobId}:`, err.message);
                  reject(err);
                } else {
                  resolve();
                }
              });
            });
          } catch (matchErr) {
            console.error(`[Scraper] Failed to save match score:`, matchErr.message);
          }
        }
      } catch (insertError) {
        console.error(`[Scraper] Failed to insert job ${job.external_id}:`, insertError.message);
      }
    }
    
    console.log(`[Scraper] Processed ${processedCount} jobs, added: ${added}, updated: ${updated}`);
    
    // Log scraper run (aggregate for all sources)
    db.run(`
      INSERT INTO scraper_logs (source, jobs_found, jobs_added, jobs_updated, started_at, finished_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [sources.join(','), uniqueJobs.length, added, updated, logStart, Date.now()]);
    
    console.log(`[Scraper] Completed: ${uniqueJobs.length} found, ${added} added, ${updated} updated`);
    
    return { found: uniqueJobs.length, added, updated };
    
  } catch (error) {
    console.error('[Scraper] Error:', error);
    
    db.run(`
      INSERT INTO scraper_logs (source, jobs_found, jobs_added, jobs_updated, error, finished_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [sources.join(','), 0, 0, 0, error.message, Date.now()]);
    
    throw error;
  } finally {
    db.close();
  }
}

// Note: Scraping endpoints are now defined in ./api/routes.js

// Debug/test endpoint
fastify.get('/api/test/scrape', async (request, reply) => {
  const AdzunaScraper = require('./scrapers/adzuna');
  const scraper = new AdzunaScraper();
  
  console.log('[TEST] Testing Adzuna scraper...');
  console.log('[TEST] ADZUNA_APP_ID:', process.env.ADZUNA_APP_ID ? 'SET' : 'NOT SET');
  
  const jobs = await scraper.searchJobs('software engineer', 'madrid');
  
  return {
    env_check: {
      app_id_set: !!process.env.ADZUNA_APP_ID,
      api_key_set: !!process.env.ADZUNA_API_KEY
    },
    jobs_found: jobs.length,
    sample_jobs: jobs.slice(0, 3).map(j => ({ title: j.title, company: j.company }))
  };
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