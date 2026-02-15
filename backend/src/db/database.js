const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/jobs.db');

function getDb() {
  return new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    }
  });
}

function initDb() {
  const db = getDb();
  
  db.serialize(() => {
    // Jobs table
    db.run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT UNIQUE,
        source TEXT NOT NULL,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        description TEXT,
        url TEXT NOT NULL,
        salary_min INTEGER,
        salary_max INTEGER,
        salary_currency TEXT,
        job_type TEXT,
        remote BOOLEAN,
        tags TEXT,
        posted_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // User profile table
    db.run(`
      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY,
        name TEXT,
        email TEXT,
        title TEXT,
        summary TEXT,
        skills TEXT,
        experience_years INTEGER,
        preferred_location TEXT,
        remote_preference TEXT,
        salary_min INTEGER,
        salary_max INTEGER,
        salary_currency TEXT,
        excluded_companies TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Job matches table (scored matches)
    db.run(`
      CREATE TABLE IF NOT EXISTS job_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id INTEGER NOT NULL,
        match_score INTEGER NOT NULL,
        match_reasons TEXT,
        status TEXT DEFAULT 'new',
        favorited BOOLEAN DEFAULT 0,
        applied BOOLEAN DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (job_id) REFERENCES jobs(id),
        UNIQUE(job_id)
      )
    `);

    // Scraping logs
    db.run(`
      CREATE TABLE IF NOT EXISTS scraper_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT NOT NULL,
        jobs_found INTEGER,
        jobs_added INTEGER,
        jobs_updated INTEGER,
        error TEXT,
        started_at DATETIME,
        finished_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  db.close();
  console.log('Database initialized');
}

module.exports = { getDb, initDb };