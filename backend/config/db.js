const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'football_turf_management',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  waitForConnections: true,
  queueLimit: 0,
  dateStrings: true // Return date/time as strings to prevent timezone shifts
};

let pool = null;
let dbStatus = {
  connected: false,
  error: null,
  lastChecked: null,
  config: {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user
  }
};

try {
  pool = mysql.createPool(dbConfig);
} catch (err) {
  dbStatus.error = err.message;
}

/**
 * Test database connectivity on boot
 */
async function testConnection() {
  dbStatus.lastChecked = new Date().toISOString();
  if (!pool) {
    dbStatus.connected = false;
    dbStatus.error = 'MySQL pool was not created';
    return false;
  }
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1 + 1 AS test');
    connection.release();
    dbStatus.connected = true;
    dbStatus.error = null;
    console.log(`✅ [MySQL Connected] Successfully connected to "${dbConfig.database}" at ${dbConfig.host}:${dbConfig.port}`);
    return true;
  } catch (err) {
    dbStatus.connected = false;
    dbStatus.error = `${err.code || 'ERR'}: ${err.message}`;
    console.warn(`⚠️ [MySQL Warning] Cannot connect to MySQL at ${dbConfig.host}:${dbConfig.port}`);
    console.warn(`   Reason: ${err.message}`);
    console.warn(`   Ensure MySQL Server is running and run: npm run db:init`);
    return false;
  }
}

/**
 * Execute parameterized query with automatic pool connection release
 */
async function query(sql, params = []) {
  if (!pool) {
    throw new Error('Database pool not initialized. Please ensure MySQL is running.');
  }
  const [results, fields] = await pool.execute(sql, params);
  return results;
}

/**
 * Execute raw multi-line query (for DDL/schema inspections)
 */
async function rawQuery(sql, params = []) {
  if (!pool) {
    throw new Error('Database pool not initialized. Please ensure MySQL is running.');
  }
  const [results, fields] = await pool.query(sql, params);
  return { results, fields };
}

/**
 * Execute an atomic transaction with automatic rollback on error
 */
async function withTransaction(callback) {
  if (!pool) {
    throw new Error('Database pool not initialized. Please ensure MySQL is running.');
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

/**
 * Get current health and connection status
 */
function getStatus() {
  return { ...dbStatus };
}

module.exports = {
  pool,
  query,
  rawQuery,
  withTransaction,
  testConnection,
  getStatus,
  dbConfig
};
