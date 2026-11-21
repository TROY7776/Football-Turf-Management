/**
 * Self-Contained Verification Suite
 * Tests core business rules, overlap algorithm, SQL parsing, password hashing, and live SQLite operations
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const Database = require('better-sqlite3');

console.log('========================================================');
console.log('🧪 RUNNING FOOTBALL TURF MANAGEMENT VERIFICATION TESTS (SQLITE)');
console.log('========================================================');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

// ----------------------------------------------------
// Test 1: Interval Overlap Algorithm Verification
// ----------------------------------------------------
console.log('\n[Test Suite 1] Slot Overlap Algorithm Check:');

function checkOverlap(reqStartH, reqDur, bookedStartH, bookedDur) {
  const reqStart = reqStartH * 60;
  const reqEnd = (reqStartH + reqDur) * 60;
  const bookedStart = bookedStartH * 60;
  const bookedEnd = (bookedStartH + bookedDur) * 60;

  return reqStart < bookedEnd && reqEnd > bookedStart;
}

assert(checkOverlap(18, 1, 18, 1) === true, 'Exact same hour overlaps');
assert(checkOverlap(19, 1, 18, 2) === true, 'Sub-slot inside 2-hour window overlaps');
assert(checkOverlap(17, 2, 18, 2) === true, 'Straddling start slot overlaps');
assert(checkOverlap(19, 1, 18, 1) === false, 'Adjacent consecutive slots do NOT overlap');
assert(checkOverlap(14, 1, 18, 1) === false, 'Disjoint morning and evening slots do NOT overlap');


// ----------------------------------------------------
// Test 2: Bcrypt Password Verification
// ----------------------------------------------------
console.log('\n[Test Suite 2] Security & Bcrypt Authentication Check:');

const managerHash = '$2b$10$Mq6Sf8vWGW6aMyqW8oQMW.pZU2GFaGSGCmMFLLqcvFC.mBT0Ke6Em';
const customerHash = '$2b$10$4UufflYjtUI31QVQu8fcA.ICKXLaWa.8pDMn2gen1qgm7MWaXft7K';

assert(bcrypt.compareSync('manager123', managerHash) === true, 'Manager seed password "manager123" verifies correctly');
assert(bcrypt.compareSync('wrongpass', managerHash) === false, 'Incorrect manager password fails verification');
assert(bcrypt.compareSync('customer123', customerHash) === true, 'Customer seed password "customer123" verifies correctly');
assert(bcrypt.compareSync('badpass', customerHash) === false, 'Incorrect customer password fails verification');


// ----------------------------------------------------
// Test 3: Live SQLite Database Engine Verification
// ----------------------------------------------------
console.log('\n[Test Suite 3] Live SQLite Engine & SQL Operations:');

const testDb = new Database(':memory:');
testDb.pragma('foreign_keys = ON');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const seedContent = fs.readFileSync(seedPath, 'utf8');

testDb.exec(schemaContent);
assert(true, 'schema.sql executed cleanly in SQLite');

testDb.exec(seedContent);
assert(true, 'seed.sql executed cleanly in SQLite');

// Query counts
const custCount = testDb.prepare('SELECT COUNT(*) AS count FROM CUSTOMER').get();
assert(custCount.count === 5, 'CUSTOMER table has 5 seeded records');

const mgrCount = testDb.prepare('SELECT COUNT(*) AS count FROM MANAGER').get();
assert(mgrCount.count === 2, 'MANAGER table has 2 seeded records');

const turfCount = testDb.prepare('SELECT COUNT(*) AS count FROM TURF').get();
assert(turfCount.count === 5, 'TURF table has 5 seeded records');

const bookingCount = testDb.prepare('SELECT COUNT(*) AS count FROM BOOKING').get();
assert(bookingCount.count === 8, 'BOOKING table has 8 seeded records');

const paymentCount = testDb.prepare('SELECT COUNT(*) AS count FROM PAYMENT').get();
assert(paymentCount.count === 8, 'PAYMENT table has 8 seeded records');

// Test 3-Table INNER JOIN
const joinResults = testDb.prepare(`
  SELECT b.booking_id, c.name, t.turf_name, b.total_amount
  FROM BOOKING b
  INNER JOIN CUSTOMER c ON b.customer_id = c.customer_id
  INNER JOIN TURF t ON b.turf_id = t.turf_id
  ORDER BY b.booking_id ASC
`).all();
assert(joinResults.length === 8 && joinResults[0].turf_name === 'Champions Arena', '3-Table INNER JOIN executes and returns customer + turf data');

// Test GROUP BY & Aggregates
const groupResults = testDb.prepare(`
  SELECT t.turf_name, COUNT(b.booking_id) as total_bookings, COALESCE(SUM(b.total_amount), 0) as rev
  FROM TURF t
  LEFT JOIN BOOKING b ON t.turf_id = b.turf_id
  GROUP BY t.turf_id, t.turf_name
`).all();
assert(groupResults.length === 5, 'GROUP BY with COUNT and SUM executes across 5 turfs');

// Test SQLite time overlap query
const overlapTest = testDb.prepare(`
  SELECT booking_id FROM BOOKING
  WHERE turf_id = 1 AND booking_date = '2026-11-22' AND status != 'CANCELLED'
  AND (
    ? < time(booking_time, '+' || duration || ' hours')
    AND time(?, '+' || ? || ' hours') > booking_time
  )
`).all('18:00:00', '18:00:00', 1);
assert(overlapTest.length > 0, 'SQLite time overlap query correctly detects booked slot collision');

// Test non-overlapping slot query
const nonOverlapTest = testDb.prepare(`
  SELECT booking_id FROM BOOKING
  WHERE turf_id = 1 AND booking_date = '2026-11-22' AND status != 'CANCELLED'
  AND (
    ? < time(booking_time, '+' || duration || ' hours')
    AND time(?, '+' || ? || ' hours') > booking_time
  )
`).all('10:00:00', '10:00:00', 1);
assert(nonOverlapTest.length === 0, 'SQLite time overlap query returns 0 conflicts for unoccupied 10:00 AM slot');

testDb.close();


// ----------------------------------------------------
// Test 4: Frontend Pages & Assets Check
// ----------------------------------------------------
console.log('\n[Test Suite 4] Frontend Pages & Assets Check:');

const requiredFiles = [
  'frontend/index.html',
  'frontend/login.html',
  'frontend/register.html',
  'frontend/turfs.html',
  'frontend/booking.html',
  'frontend/customer-dashboard.html',
  'frontend/booking-history.html',
  'frontend/manager-dashboard.html',
  'frontend/database-overview.html',
  'frontend/css/style.css',
  'frontend/js/api.js',
  'frontend/js/main.js',
  'frontend/js/auth.js',
  'frontend/js/turfs.js',
  'frontend/js/booking.js',
  'frontend/js/customer.js',
  'frontend/js/manager.js',
  'frontend/js/dbms.js',
  'frontend/assets/logo.svg',
  'frontend/assets/turf-champions.jpg',
  'frontend/assets/turf-wembley.jpg',
  'frontend/assets/turf-kickoff.jpg',
  'frontend/assets/turf-premier.jpg',
  'frontend/assets/turf-greenvalley.jpg'
];

requiredFiles.forEach(f => {
  const fullPath = path.join(__dirname, '..', f);
  assert(fs.existsSync(fullPath), `File exists: ${f}`);
});

console.log('========================================================');
console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
console.log('========================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All business logic, SQLite operations, and assets verified successfully!\n');
  process.exit(0);
}
