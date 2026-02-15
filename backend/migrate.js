// Migration script to add updated_at column to job_matches
const { getDb } = require('./src/db/database');

const db = getDb();

db.serialize(() => {
  // Check if updated_at column exists
  db.all("PRAGMA table_info(job_matches)", (err, rows) => {
    if (err) {
      console.error('Error checking table:', err);
      db.close();
      return;
    }
    
    const hasUpdatedAt = rows.some(col => col.name === 'updated_at');
    
    if (hasUpdatedAt) {
      console.log('Column updated_at already exists in job_matches');
      db.close();
      return;
    }
    
    // Add the column
    db.run(`
      ALTER TABLE job_matches 
      ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    `, (err) => {
      if (err) {
        console.error('Error adding column:', err);
      } else {
        console.log('Successfully added updated_at column to job_matches');
      }
      db.close();
    });
  });
});
