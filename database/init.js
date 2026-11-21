const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'turf.db');
const schemaPath = path.join(__dirname, 'schema.sql');
const seedPath = path.join(__dirname, 'seed.sql');

function initializeSQLite() {
  console.log('========================================================');
  console.log('⚽ FOOTBALL TURF MANAGEMENT - SQLITE DATABASE INITIALIZER');
  console.log('========================================================');
  console.log(`Database File: ${dbPath}`);

  // If previous database exists, remove it for a clean re-init
  if (fs.existsSync(dbPath)) {
    console.log('Removing old database file for fresh reset...');
    fs.unlinkSync(dbPath);
    // Remove WAL files if present
    if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
    if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');
  }

  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');

  console.log('Executing SQLite Schema Creation (DDL)...');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  console.log('✅ SQLite Tables Created: CUSTOMER, MANAGER, TURF, BOOKING, PAYMENT.');

  console.log('Executing Seed Data Insertion (DML)...');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  db.exec(seedSql);
  console.log('✅ Sample Data Seeded: Managers, Customers, Turfs, Bookings, Payments.');

  db.close();
  console.log('========================================================');
  console.log('🎉 SQLite Database Ready! Start the application with:');
  console.log('   npm start');
  console.log('========================================================');
}

if (require.main === module) {
  initializeSQLite();
}

module.exports = initializeSQLite;
