const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// SQLite database file path inside project directory
const dbDirectory = path.join(__dirname, '..', '..', 'database');
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const dbFilePath = process.env.SQLITE_DB_PATH || path.join(dbDirectory, 'turf.db');

let db = null;
let dbStatus = {
  connected: false,
  engine: 'SQLite 3 (better-sqlite3)',
  database: 'turf.db',
  dbPath: dbFilePath,
  error: null,
  lastChecked: null,
  config: {
    host: 'Local Project File',
    port: 'In-Process (Zero Setup Required)',
    database: 'turf.db',
    user: 'Embedded Engine'
  }
};

try {
  // Initialize SQLite database instance
  db = new Database(dbFilePath, {
    // verbose: process.env.NODE_ENV === 'development' ? console.log : null
  });

  // Enable Foreign Keys and WAL (Write-Ahead Logging) for superior concurrency and ACID guarantees
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  dbStatus.connected = true;
  dbStatus.error = null;
  dbStatus.lastChecked = new Date().toISOString();

  console.log(`✅ [SQLite Connected] Database active at: ${dbFilePath}`);

  // Auto-initialize schema & seed data if database is empty
  autoInitializeIfEmpty();
} catch (err) {
  dbStatus.connected = false;
  dbStatus.error = err.message;
  console.error('❌ Failed to initialize SQLite database:', err);
}

/**
 * Automatically creates tables and seeds sample data if database is brand new
 */
function autoInitializeIfEmpty() {
  if (!db) return;
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='CUSTOMER'").get();
    
    if (!tableCheck) {
      console.log('📦 Empty database detected. Auto-initializing schema from database/schema.sql...');
      const schemaPath = path.join(dbDirectory, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schemaSql);
        console.log('✅ SQLite tables created successfully: CUSTOMER, MANAGER, TURF, BOOKING, PAYMENT.');
      }

      const seedPath = path.join(dbDirectory, 'seed.sql');
      if (fs.existsSync(seedPath)) {
        console.log('🌱 Seeding initial sample data from database/seed.sql...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        db.exec(seedSql);
        console.log('✅ Initial seed data inserted (Managers, Customers, Turfs, Bookings, Payments).');
      }
    } else {
      console.log('📂 Existing SQLite database found. Persisted records preserved.');
    }
  } catch (err) {
    console.error('⚠️ Auto-initialization warning:', err.message);
  }
}

/**
 * Execute parameterized query with automatic SELECT vs DML routing
 */
function query(sql, params = []) {
  if (!db) {
    throw new Error('SQLite database is not initialized.');
  }

  const trimmed = sql.trim();
  const upper = trimmed.toUpperCase();

  // If query is a SELECT, PRAGMA, EXPLAIN, or WITH SELECT
  if (upper.startsWith('SELECT') || upper.startsWith('PRAGMA') || upper.startsWith('EXPLAIN') || upper.startsWith('WITH')) {
    const stmt = db.prepare(sql);
    return stmt.all(params);
  }

  // Otherwise it is an INSERT, UPDATE, DELETE, or DDL
  const stmt = db.prepare(sql);
  const info = stmt.run(params);
  return {
    insertId: info.lastInsertRowid,
    changes: info.changes,
    ...info
  };
}

/**
 * Execute an atomic transaction (supports both async and synchronous callbacks)
 */
async function withTransaction(callback) {
  if (!db) {
    throw new Error('SQLite database is not initialized.');
  }

  db.exec('BEGIN IMMEDIATE');
  try {
    const result = await callback({
      query: (sql, params = []) => query(sql, params),
      raw: db
    });
    db.exec('COMMIT');
    return result;
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch (_) {}
    throw err;
  }
}

/**
 * Get current health and status
 */
function getStatus() {
  return { ...dbStatus };
}

module.exports = {
  db,
  query,
  withTransaction,
  getStatus,
  dbConfig: {
    database: 'turf.db',
    host: 'Local File',
    port: 'In-Process'
  }
};
