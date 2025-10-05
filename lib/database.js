const sqlite3 = require('sqlite3');
const { promisify } = require('util');

const db = new sqlite3.Database('./database/app.db');

// Promisify database methods
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

// Initialize database tables
async function initDB() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      folder_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      size INTEGER,
      pages INTEGER,
      status TEXT DEFAULT 'processing',
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES folders (id) ON DELETE CASCADE
    )
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      content TEXT NOT NULL,
      page_number INTEGER,
      chunk_index INTEGER,
      FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
    )
  `);
}

module.exports = { db, dbRun, dbGet, dbAll, initDB };