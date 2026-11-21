const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  multipleStatements: true
};

async function initializeDatabase() {
  console.log('========================================================');
  console.log('⚽ FOOTBALL TURF MANAGEMENT SYSTEM - DATABASE INITIALIZER');
  console.log('========================================================');
  console.log(`Connecting to MySQL at ${DB_CONFIG.host}:${DB_CONFIG.port} as user "${DB_CONFIG.user}"...`);

  let connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected to MySQL Server successfully.');

    // 1. Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    console.log(`Reading schema from: ${schemaPath}`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing database schema creation (DDL)...');
    await connection.query(schemaSql);
    console.log('✅ Database "football_turf_management" and all tables created successfully:');
    console.log('   - CUSTOMER (PK customer_id, unique email)');
    console.log('   - MANAGER (PK manager_id, unique email)');
    console.log('   - TURF (PK turf_id, name, location, price)');
    console.log('   - BOOKING (PK booking_id, FK customer_id, FK turf_id)');
    console.log('   - PAYMENT (PK payment_id, FK booking_id, amount, status)');

    // 2. Read and execute seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    console.log(`Reading sample data from: ${seedPath}`);
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log('Executing seed data insertion (DML)...');
    await connection.query(seedSql);
    console.log('✅ Sample data seeded successfully:');
    console.log('   - 2 Managers (manager@turf.com / admin@turf.com, password: manager123)');
    console.log('   - 5 Customers (password: customer123)');
    console.log('   - 5 Football Turfs');
    console.log('   - 8 Sample Bookings');
    console.log('   - 8 Matching Payment Records');
    console.log('========================================================');
    console.log('🎉 DATABASE SETUP COMPLETE! You can now start the application:');
    console.log('   npm start');
    console.log('========================================================');
  } catch (err) {
    console.error('\n❌ DATABASE INITIALIZATION FAILED!');
    console.error(`Error Code: ${err.code || 'UNKNOWN'}`);
    console.error(`Message: ${err.message}`);
    console.log('\nTroubleshooting Checklist:');
    console.log('1. Verify that your local MySQL Server service is running.');
    console.log('2. Check your .env file credentials (DB_HOST, DB_USER, DB_PASSWORD, DB_PORT).');
    console.log('3. If your MySQL root account has a password, update DB_PASSWORD in .env.');
    console.log('4. Ensure port 3306 is not blocked or using a non-standard port.');
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;
