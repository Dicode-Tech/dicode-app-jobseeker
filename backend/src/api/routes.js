const { getDb } = require('../db/database');
const { calculateMatchScore } = require('../matcher/scorer');

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
            COUNT(*) as total_jobs,
            COUNT(CASE WHEN m.match_score >= 70 THEN 1 END) as high_matches,
            COUNT(CASE WHEN m.favorited = 1 THEN 1 END) as favorited,
            COUNT(CASE WHEN m.status = 'applied' THEN 1 END) as applied,
            MAX(j.created_at) as last_update
          FROM jobs j
          LEFT JOIN job_matches m ON j.id = m.job_id
        `, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      db.close();
      return stats;
    } catch (error) {
      db.close();
      reply.code(500);
      return { error: error.message };
    }
  });
  
}

module.exports = routes;