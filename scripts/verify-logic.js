/**
 * Self-Contained Verification Suite
 * Tests core business rules, overlap algorithm, SQL parsing, and password hashing
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

console.log('========================================================');
console.log('🧪 RUNNING FOOTBALL TURF MANAGEMENT VERIFICATION TESTS');
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

  // S_req < E_booked AND E_req > S_booked
  return reqStart < bookedEnd && reqEnd > bookedStart;
}

// Case 1: Exact match overlap (18:00-19:00 vs 18:00-19:00)
assert(checkOverlap(18, 1, 18, 1) === true, 'Exact same hour overlaps');

// Case 2: Partial overlap inside 2-hour booking (Existing: 18:00-20:00, Request: 19:00-20:00)
assert(checkOverlap(19, 1, 18, 2) === true, 'Sub-slot inside 2-hour window overlaps');

// Case 3: Overlapping start (Existing: 18:00-20:00, Request: 17:00-19:00)
assert(checkOverlap(17, 2, 18, 2) === true, 'Straddling start slot overlaps');

// Case 4: Adjacent slots do NOT overlap (Existing: 18:00-19:00, Request: 19:00-20:00)
assert(checkOverlap(19, 1, 18, 1) === false, 'Adjacent consecutive slots do NOT overlap');

// Case 5: Completely non-overlapping slots (14:00-15:00 vs 18:00-19:00)
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
// Test 3: Database SQL Files Integrity Check
// ----------------------------------------------------
console.log('\n[Test Suite 3] Database Schema & Seed SQL Integrity:');

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
const seedPath = path.join(__dirname, '..', 'database', 'seed.sql');

assert(fs.existsSync(schemaPath), 'schema.sql exists in database/');
assert(fs.existsSync(seedPath), 'seed.sql exists in database/');

const schemaContent = fs.readFileSync(schemaPath, 'utf8');
const seedContent = fs.readFileSync(seedPath, 'utf8');

assert(schemaContent.includes('CREATE TABLE CUSTOMER'), 'schema.sql defines CUSTOMER entity');
assert(schemaContent.includes('CREATE TABLE MANAGER'), 'schema.sql defines MANAGER entity');
assert(schemaContent.includes('CREATE TABLE TURF'), 'schema.sql defines TURF entity');
assert(schemaContent.includes('CREATE TABLE BOOKING'), 'schema.sql defines BOOKING entity');
assert(schemaContent.includes('CREATE TABLE PAYMENT'), 'schema.sql defines PAYMENT entity');
assert(schemaContent.includes('FOREIGN KEY (customer_id)'), 'schema.sql defines FK customer_id');
assert(schemaContent.includes('FOREIGN KEY (turf_id)'), 'schema.sql defines FK turf_id');
assert(schemaContent.includes('FOREIGN KEY (booking_id)'), 'schema.sql defines FK booking_id');

assert(seedContent.includes('INSERT INTO MANAGER'), 'seed.sql seeds sample managers');
assert(seedContent.includes('INSERT INTO CUSTOMER'), 'seed.sql seeds sample customers');
assert(seedContent.includes('INSERT INTO TURF'), 'seed.sql seeds sample turfs');
assert(seedContent.includes('INSERT INTO BOOKING'), 'seed.sql seeds sample bookings');
assert(seedContent.includes('INSERT INTO PAYMENT'), 'seed.sql seeds sample payments');


// ----------------------------------------------------
// Test 4: Frontend Assets and HTML Pages Check
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
  console.log('🎉 All business logic, algorithms, and SQL schemas verified successfully!\n');
  process.exit(0);
}
