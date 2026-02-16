const { getDb } = require('../db/database');
const { calculateMatchScore } = require('../matcher/scorer');
const { runScrapers, getAvailableSources, getScraperInfo } = require('../scrapers/orchestrator');

// Helper to save jobs to database
async function saveJobsToDatabase(jobs) {
  const db = getDb();
  let added = 0;
  let updated = 0;
  let processed = 0;
  
  try {
    for (const job of jobs) {
      processed++;
      
      // Calculate match score
      const { score, reasons } = calculateMatchScore(job);
      
      // Validate job data
      if (!job.external_id || !job.title || !job.url) {
        console.log(`[SaveJobs] Skipping invalid job #${processed}: missing required fields`);
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
              console.error(`[SaveJobs] DB error for job ${job.external_id}:`, err.message);
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
          await new Promise((resolve, reject) => {
            db.run(`
              INSERT INTO job_matches (job_id, match_score, match_reasons, status)
              VALUES (?, ?, ?, 'new')
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
      } catch (insertError) {
        console.error(`[SaveJobs] Failed to insert job ${job.external_id}:`, insertError.message);
      }
    }
    
    // Log scraper run
    db.run(`
      INSERT INTO scraper_logs (source, jobs_found, jobs_added, jobs_updated, started_at, finished_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, ['api_scrape', jobs.length, added, updated, Date.now() - 10000, Date.now()]);
    
    return { added, updated, processed };
  } finally {
    db.close();
  }
}

async function routes(fastify, options) {
  
  // Get all jobs with optional filtering
  fastify.get('/api/jobs', async (request, reply) => {
    const db = getDb();
    const { 
      minScore = 0, 
      status = 'all', 
      favorited,
      limit = 50,
      offset = 0,
      search
    } = request.query;
    
    try {
      let sql = `
        SELECT j.*, m.match_score, m.status, m.favorited, m.notes
        FROM jobs j
        LEFT JOIN job_matches m ON j.id = m.job_id
        WHERE 1=1
      `;
      const params = [];
      
      if (minScore > 0) {
        sql += ` AND (m.match_score >= ? OR m.match_score IS NULL)`;
        params.push(minScore);
      }
      
      if (status !== 'all') {
        sql += ` AND m.status = ?`;
        params.push(status);
      }
      
      if (favorited !== undefined) {
        sql += ` AND m.favorited = ?`;
        params.push(favorited === 'true' ? 1 : 0);
      }
      
      if (search) {
        sql += ` AND (j.title LIKE ? OR j.company LIKE ? OR j.description LIKE ?)`;
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }
      
      sql += ` ORDER BY m.match_score DESC, j.posted_at DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      const jobs = await new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      db.close();
      return { jobs, count: jobs.length };
    } catch (error) {
      db.close();
      reply.code(500);
      return { error: error.message };
    }
  });
  
  // Get single job
  fastify.get('/api/jobs/:id', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    
    try {
      const job = await new Promise((resolve, reject) => {
        db.get(`
          SELECT j.*, m.match_score, m.status, m.favorited, m.notes, m.match_reasons
          FROM jobs j
          LEFT JOIN job_matches m ON j.id = m.job_id
          WHERE j.id = ?
        `, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      db.close();
      
      if (!job) {
        reply.code(404);
        return { error: 'Job not found' };
      }
      
      return job;
    } catch (error) {
      db.close();
      reply.code(500);
      return { error: error.message };
    }
  });
  
  // Update job status
  fastify.patch('/api/jobs/:id', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const { status, favorited, notes } = request.body;
    
    try {
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE job_matches 
          SET status = COALESCE(?, status),
              favorited = COALESCE(?, favorited),
              notes = COALESCE(?, notes),
              updated_at = CURRENT_TIMESTAMP
          WHERE job_id = ?
        `, [status, favorited, notes, id], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
      
      db.close();
      return { success: true };
    } catch (error) {
      db.close();
      reply.code(500);
      return { error: error.message };
    }
  });
  
  // Get user profile
  fastify.get('/api/profile', async (request, reply) => {
    const userProfile = require('../config/userProfile');
    return userProfile;
  });
  
  // Get stats
  fastify.get('/api/stats', async (request, reply) => {
    const db = getDb();
    
    try {
      const stats = await new Promise((resolve, reject) => {
        db.get(`
          SELECT 
            (SELECT COUNT(*) FROM jobs) as total_jobs,
            (SELECT COUNT(*) FROM job_matches WHERE match_score >= 70) as high_matches,
            (SELECT COUNT(*) FROM job_matches WHERE favorited = 1) as favorited,
            (SELECT COUNT(*) FROM job_matches WHERE status = 'applied') as applied,
            (SELECT MAX(created_at) FROM jobs) as last_update
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      // Convert nulls to 0
      const result = {
        total_jobs: stats.total_jobs || 0,
        high_matches: stats.high_matches || 0,
        favorited: stats.favorited || 0,
        applied: stats.applied || 0,
        last_update: stats.last_update
      };
      
      db.close();
      return result;
    } catch (error) {
      db.close();
      reply.code(500);
      return { error: error.message };
    }
  });
  
  // Get total count for pagination
  fastify.get('/api/jobs/count', async (request, reply) => {
    const db = getDb();
    
    try {
      const count = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as total FROM jobs', (err, row) => {
          if (err) reject(err);
          else resolve(row?.total || 0);
        });
      });
      
      db.close();
      return { total: count };
    } catch (error) {
      db.close();
      reply.code(500);
      return { error: error.message };
    }
  });
  
  // Recalculate match scores for all jobs
  fastify.post('/api/jobs/recalculate-scores', async (request, reply) => {
    const db = getDb();
    
    try {
      // Get all jobs
      const jobs = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM jobs', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      
      console.log(`[Recalculate] Processing ${jobs.length} jobs...`);
      
      let updated = 0;
      let errors = 0;
      
      for (const job of jobs) {
        try {
          // Calculate match score
          const { score, reasons } = calculateMatchScore(job);
          
          // Insert or update match score
          await new Promise((resolve, reject) => {
            db.run(`
              INSERT INTO job_matches (job_id, match_score, match_reasons, status)
              VALUES (?, ?, ?, 'new')
              ON CONFLICT(job_id) DO UPDATE SET
                match_score = excluded.match_score,
                match_reasons = excluded.match_reasons,
                updated_at = CURRENT_TIMESTAMP
            `, [job.id, score, JSON.stringify(reasons)], (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          updated++;
          
          // Log progress every 50 jobs
          if (updated % 50 === 0) {
            console.log(`[Recalculate] Processed ${updated}/${jobs.length} jobs...`);
          }
        } catch (err) {
          console.error(`[Recalculate] Error for job ${job.id} (${job.title}):`, err.message);
          console.error(`[Recalculate] Stack:`, err.stack);
          errors++;
        }
      }
      
      db.close();
      
      return {
        message: 'Match scores recalculated',
        total_jobs: jobs.length,
        updated: updated,
        errors: errors
      };
    } catch (error) {
      db.close();
      reply.code(500);
      return { error: error.message };
    }
  });
  
  // ============== SCRAPING ENDPOINTS ==============
  
  // Get available scraper sources
  fastify.get('/api/scrape/sources', async (request, reply) => {
    try {
      const sources = getAvailableSources();
      const sourcesWithInfo = sources.map(name => ({
        name,
        ...getScraperInfo(name)
      }));
      return { sources: sourcesWithInfo };
    } catch (error) {
      reply.code(500);
      return { error: error.message };
    }
  });
  
  // Scrape jobs from all sources
  fastify.post('/api/scrape', async (request, reply) => {
    const { keywords = '', location = '', limit = 100 } = request.body || {};
    
    try {
      console.log(`[API /scrape] Starting scrape with keywords: "${keywords}", location: "${location}"`);
      
      const startTime = Date.now();
      const jobs = await runScrapers({
        sources: ['all'],
        keywords,
        location,
        limit
      });
      
      const duration = Date.now() - startTime;
      
      // Group jobs by source
      const bySource = {};
      jobs.forEach(job => {
        bySource[job.source] = (bySource[job.source] || 0) + 1;
      });
      
      // Save jobs to database
      console.log(`[API /scrape] Saving ${jobs.length} jobs to database...`);
      const saveResult = await saveJobsToDatabase(jobs);
      
      return {
        success: true,
        jobs_found: jobs.length,
        added: saveResult.added,
        updated: saveResult.updated,
        duration_ms: duration,
        by_source: bySource
      };
    } catch (error) {
      console.error('[API /scrape] Error:', error.message);
      reply.code(500);
      return { error: error.message };
    }
  });
  
  // Scrape jobs from specific sources
  fastify.post('/api/scrape/custom', async (request, reply) => {
    const { sources, keywords = '', location = '', limit = 100 } = request.body || {};
    
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      reply.code(400);
      return { error: 'Missing required field: sources (array of source names)' };
    }
    
    try {
      console.log(`[API /scrape/custom] Starting scrape with sources: ${sources.join(', ')}`);
      
      const startTime = Date.now();
      const jobs = await runScrapers({
        sources,
        keywords,
        location,
        limit
      });
      
      const duration = Date.now() - startTime;
      
      // Group jobs by source
      const bySource = {};
      jobs.forEach(job => {
        bySource[job.source] = (bySource[job.source] || 0) + 1;
      });
      
      // Save jobs to database
      console.log(`[API /scrape/custom] Saving ${jobs.length} jobs to database...`);
      const saveResult = await saveJobsToDatabase(jobs);
      
      return {
        success: true,
        jobs_found: jobs.length,
        added: saveResult.added,
        updated: saveResult.updated,
        duration_ms: duration,
        by_source: bySource
      };
    } catch (error) {
      console.error('[API /scrape/custom] Error:', error.message);
      reply.code(500);
      return { error: error.message };
    }
  });
  
  // Receive jobs from LinkedIn Chrome Extension
  fastify.post('/api/jobs/linkedin', async (request, reply) => {
    const { jobs } = request.body || {};
    
    if (!jobs || !Array.isArray(jobs) || jobs.length === 0) {
      reply.code(400);
      return { error: 'Missing required field: jobs (array of job objects)' };
    }
    
    try {
      console.log(`[API /jobs/linkedin] Received ${jobs.length} jobs from LinkedIn extension`);
      
      // Normalize LinkedIn jobs to match our schema
      const normalizedJobs = jobs.map(job => ({
        external_id: `linkedin_${job.jobId || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        source: 'linkedin',
        title: job.title || 'Unknown Position',
        company: job.company || 'Unknown Company',
        location: job.location || 'Remote/Unknown',
        description: job.description || '',
        url: job.jobUrl || job.url || '',
        salary_min: null,
        salary_max: null,
        salary_currency: null,
        job_type: 'full-time',
        remote: job.location?.toLowerCase().includes('remote') || false,
        tags: '',
        posted_at: new Date()
      }));
      
      // Save to database
      const saveResult = await saveJobsToDatabase(normalizedJobs);
      
      return {
        success: true,
        received: jobs.length,
        added: saveResult.added,
        updated: saveResult.updated,
        message: `Successfully processed ${jobs.length} LinkedIn jobs`
      };
    } catch (error) {
      console.error('[API /jobs/linkedin] Error:', error.message);
      reply.code(500);
      return { error: error.message };
    }
  });
  
}

module.exports = routes;