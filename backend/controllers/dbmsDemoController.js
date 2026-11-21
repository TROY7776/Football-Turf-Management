const db = require('../config/db');

/**
 * Get high-level database overview for examiner
 */
async function getDatabaseOverview(req, res) {
  try {
    // 1. Get database status
    const status = db.getStatus();

    // 2. Count records in each table
    const [custCount] = await db.query('SELECT COUNT(*) AS count FROM CUSTOMER');
    const [mgrCount] = await db.query('SELECT COUNT(*) AS count FROM MANAGER');
    const [turfCount] = await db.query('SELECT COUNT(*) AS count FROM TURF');
    const [bookingCount] = await db.query('SELECT COUNT(*) AS count FROM BOOKING');
    const [paymentCount] = await db.query('SELECT COUNT(*) AS count FROM PAYMENT');

    // 3. Table schema metadata from information_schema
    const tablesMetadata = await db.query(`
      SELECT 
        TABLE_NAME, 
        ENGINE, 
        TABLE_ROWS, 
        CREATE_TIME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = ?
      ORDER BY TABLE_NAME ASC
    `, [db.dbConfig.database]);

    return res.json({
      success: true,
      databaseName: db.dbConfig.database,
      dbStatus: status,
      counts: {
        customers: custCount.count,
        managers: mgrCount.count,
        turfs: turfCount.count,
        bookings: bookingCount.count,
        payments: paymentCount.count
      },
      tables: tablesMetadata
    });
  } catch (err) {
    console.error('Error in DBMS overview:', err);
    return res.status(500).json({ success: false, error: 'Database overview error: ' + err.message });
  }
}

/**
 * Get actual records from a specified table (passwords masked)
 */
async function getTableData(req, res) {
  try {
    const tableName = (req.params.table || '').toUpperCase();
    const allowedTables = ['CUSTOMER', 'MANAGER', 'TURF', 'BOOKING', 'PAYMENT'];

    if (!allowedTables.includes(tableName)) {
      return res.status(400).json({
        success: false,
        error: `Invalid table name. Allowed tables: ${allowedTables.join(', ')}`
      });
    }

    const rows = await db.query(`SELECT * FROM ${tableName} ORDER BY 1 ASC LIMIT 100`);

    // Mask passwords for sensitive tables
    const sanitizedRows = rows.map(row => {
      const copy = { ...row };
      if ('password_hash' in copy) {
        copy.password_hash = '$2b$10$********************* [SECURED BCRYPT HASH]';
      }
      return copy;
    });

    // Get column descriptions
    const columns = await db.query(`
      SELECT 
        COLUMN_NAME, 
        COLUMN_TYPE, 
        IS_NULLABLE, 
        COLUMN_KEY, 
        COLUMN_DEFAULT, 
        EXTRA
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION ASC
    `, [db.dbConfig.database, tableName]);

    return res.json({
      success: true,
      tableName,
      columns,
      totalRows: sanitizedRows.length,
      records: sanitizedRows
    });
  } catch (err) {
    console.error('Error fetching table records:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch table records: ' + err.message });
  }
}

/**
 * Execute DBMS Concepts Demonstration Queries
 */
async function runSqlDemo(req, res) {
  try {
    const { demoKey, customSql } = req.body;

    let sqlQuery = '';
    let explanation = '';
    let concept = '';

    switch (demoKey) {
      case 'INNER_JOIN':
        concept = '3-Table INNER JOIN';
        explanation = 'Demonstrates combining CUSTOMER, BOOKING, and TURF tables based on Customer_ID and Turf_ID foreign key relationships to retrieve unified booking details.';
        sqlQuery = `
SELECT 
  b.booking_id AS \`Booking ID\`,
  c.name AS \`Customer Name\`,
  c.phone AS \`Phone\`,
  t.turf_name AS \`Turf Facility\`,
  t.location AS \`Location\`,
  b.booking_date AS \`Date\`,
  b.booking_time AS \`Slot Time\`,
  b.duration AS \`Duration (Hours)\`,
  b.status AS \`Status\`,
  b.total_amount AS \`Amount (INR)\`
FROM BOOKING b
INNER JOIN CUSTOMER c ON b.customer_id = c.customer_id
INNER JOIN TURF t ON b.turf_id = t.turf_id
ORDER BY b.booking_id DESC;
        `.trim();
        break;

      case 'GROUP_BY_AGGREGATE':
        concept = 'GROUP BY & Aggregate Functions (COUNT, SUM, AVG)';
        explanation = 'Groups bookings by football turf to compute total reservations count, total hours occupied, and total revenue generated per facility.';
        sqlQuery = `
SELECT 
  t.turf_name AS \`Turf Name\`,
  t.location AS \`Location\`,
  COUNT(b.booking_id) AS \`Total Bookings\`,
  COALESCE(SUM(b.duration), 0) AS \`Total Hours Booked\`,
  COALESCE(SUM(CASE WHEN b.status != 'CANCELLED' THEN b.total_amount ELSE 0 END), 0) AS \`Net Revenue (INR)\`,
  COALESCE(AVG(CASE WHEN b.status != 'CANCELLED' THEN b.total_amount ELSE NULL END), 0) AS \`Avg Booking Value (INR)\`
FROM TURF t
LEFT JOIN BOOKING b ON t.turf_id = b.turf_id
GROUP BY t.turf_id, t.turf_name, t.location
ORDER BY \`Net Revenue (INR)\` DESC;
        `.trim();
        break;

      case 'ORDER_BY':
        concept = 'ORDER BY Multi-Column Sorting';
        explanation = 'Demonstrates deterministic sorting by date (descending), total amount (descending), and time slot (ascending).';
        sqlQuery = `
SELECT 
  booking_id AS \`Booking ID\`,
  customer_id AS \`Customer ID\`,
  turf_id AS \`Turf ID\`,
  booking_date AS \`Date\`,
  booking_time AS \`Time\`,
  duration AS \`Hours\`,
  total_amount AS \`Amount (INR)\`,
  status AS \`Status\`
FROM BOOKING
ORDER BY booking_date DESC, total_amount DESC, booking_time ASC;
        `.trim();
        break;

      case 'AGGREGATE_FUNCTIONS':
        concept = 'Statistical Aggregate Functions (COUNT, SUM, MIN, MAX, AVG)';
        explanation = 'Calculates global revenue metrics across all completed and paid customer transactions in the PAYMENT table.';
        sqlQuery = `
SELECT 
  COUNT(*) AS \`Total Paid Transactions\`,
  SUM(amount) AS \`Total Revenue Collected (INR)\`,
  MIN(amount) AS \`Lowest Booking Amount (INR)\`,
  MAX(amount) AS \`Highest Booking Amount (INR)\`,
  AVG(amount) AS \`Average Transaction Value (INR)\`
FROM PAYMENT
WHERE payment_status = 'PAID';
        `.trim();
        break;

      case 'PK_FK_RELATIONSHIPS':
        concept = 'Referential Integrity & 4-Table Relationship Navigation';
        explanation = 'Examines Primary Key (PK) to Foreign Key (FK) linkages across all 4 core entities: CUSTOMER(PK) -> BOOKING(FK), TURF(PK) -> BOOKING(FK), and BOOKING(PK) -> PAYMENT(FK).';
        sqlQuery = `
SELECT 
  c.customer_id AS \`Customer PK\`,
  c.name AS \`Customer\`,
  b.booking_id AS \`Booking PK\`,
  b.customer_id AS \`Booking->Customer FK\`,
  t.turf_id AS \`Turf PK\`,
  b.turf_id AS \`Booking->Turf FK\`,
  t.turf_name AS \`Turf Name\`,
  p.payment_id AS \`Payment PK\`,
  p.booking_id AS \`Payment->Booking FK\`,
  p.amount AS \`Amount\`,
  p.payment_status AS \`Payment Status\`
FROM CUSTOMER c
INNER JOIN BOOKING b ON c.customer_id = b.customer_id
INNER JOIN TURF t ON b.turf_id = t.turf_id
INNER JOIN PAYMENT p ON b.booking_id = p.booking_id
ORDER BY b.booking_id ASC;
        `.trim();
        break;

      case 'SELECT_FILTER':
        concept = 'Relational Selection & Projection with Predicates';
        explanation = 'Demonstrates selecting turfs located in specific areas or with competitive pricing below a threshold.';
        sqlQuery = `
SELECT 
  turf_id AS \`Turf ID\`,
  turf_name AS \`Turf Name\`,
  location AS \`Location\`,
  price AS \`Hourly Rate (INR)\`
FROM TURF
WHERE price <= 1500.00
ORDER BY price ASC;
        `.trim();
        break;

      case 'INSERT_DEMO':
        concept = 'Data Manipulation Language (DML) - INSERT';
        explanation = 'Illustrates the exact INSERT statement executed during customer booking creation with parameter binding.';
        sqlQuery = `
-- Concept Demo: INSERT query syntax executed by the system
-- INSERT INTO BOOKING (customer_id, turf_id, booking_date, booking_time, duration, status, total_amount)
-- VALUES (1, 1, '2026-11-25', '19:00:00', 2, 'CONFIRMED', 2400.00);

-- Query to verify the most recently inserted bookings in the database:
SELECT 
  booking_id AS \`Booking ID\`,
  customer_id AS \`Customer ID\`,
  turf_id AS \`Turf ID\`,
  booking_date AS \`Date\`,
  booking_time AS \`Slot\`,
  duration AS \`Duration\`,
  status AS \`Status\`,
  total_amount AS \`Amount\`
FROM BOOKING 
ORDER BY booking_id DESC 
LIMIT 5;
        `.trim();
        break;

      case 'UPDATE_DEMO':
        concept = 'Data Manipulation Language (DML) - UPDATE';
        explanation = 'Demonstrates UPDATE query syntax used to transition booking status and reflect state changes.';
        sqlQuery = `
-- Concept Demo: UPDATE query syntax executed by turf manager
-- UPDATE BOOKING SET status = 'COMPLETED' WHERE booking_id = 1;

-- Query showing all statuses currently stored in the BOOKING table:
SELECT 
  status AS \`Booking Status\`, 
  COUNT(*) AS \`Record Count\` 
FROM BOOKING 
GROUP BY status;
        `.trim();
        break;

      case 'DELETE_DEMO':
        concept = 'Data Manipulation Language (DML) - Safe DELETE & Constraints';
        explanation = 'Demonstrates referential integrity constraint checks before deletion to protect operational records.';
        sqlQuery = `
-- Concept Demo: Referential integrity check performed before deleting a turf
-- Checks if active bookings depend on the turf
SELECT 
  t.turf_id AS \`Turf ID\`,
  t.turf_name AS \`Turf Name\`,
  COUNT(b.booking_id) AS \`Active Dependent Bookings\`
FROM TURF t
LEFT JOIN BOOKING b ON t.turf_id = b.turf_id AND b.status = 'CONFIRMED'
GROUP BY t.turf_id, t.turf_name;
        `.trim();
        break;

      case 'CUSTOM':
        if (!customSql || !customSql.trim()) {
          return res.status(400).json({ success: false, error: 'Custom SQL query cannot be empty.' });
        }
        const trimmed = customSql.trim();
        const upper = trimmed.toUpperCase();
        // Allow read-only exploration for safety
        if (!upper.startsWith('SELECT') && !upper.startsWith('EXPLAIN') && !upper.startsWith('DESCRIBE') && !upper.startsWith('SHOW')) {
          return res.status(400).json({
            success: false,
            error: 'For safety during examiner demonstrations, only SELECT, EXPLAIN, DESCRIBE, and SHOW queries are permitted in the interactive runner.'
          });
        }
        concept = 'Interactive Examiner Query';
        explanation = 'Live dynamic SQL query executed directly against MySQL.';
        sqlQuery = trimmed;
        break;

      default:
        return res.status(400).json({ success: false, error: 'Unknown demoKey requested.' });
    }

    const startTime = Date.now();
    const results = await db.query(sqlQuery);
    const executionTimeMs = Date.now() - startTime;

    return res.json({
      success: true,
      concept,
      explanation,
      sqlQuery,
      executionTimeMs,
      rowCount: Array.isArray(results) ? results.length : 0,
      results: Array.isArray(results) ? results : [results]
    });
  } catch (err) {
    console.error('Error running SQL demo:', err);
    return res.status(500).json({
      success: false,
      error: 'SQL Execution Error: ' + err.message
    });
  }
}

module.exports = {
  getDatabaseOverview,
  getTableData,
  runSqlDemo
};
