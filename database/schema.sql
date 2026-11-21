-- ====================================================================
-- Football Turf Management System - SQLite Database Schema
-- Database File: database/turf.db
-- Designed for College DBMS Mini-Project (SQLite / Zero-Setup Serverless)
-- ====================================================================

-- Enable Foreign Key Constraint Enforcement
PRAGMA foreign_keys = ON;

-- 1. Drop existing tables if recreating
DROP TABLE IF EXISTS PAYMENT;
DROP TABLE IF EXISTS BOOKING;
DROP TABLE IF EXISTS TURF;
DROP TABLE IF EXISTS MANAGER;
DROP TABLE IF EXISTS CUSTOMER;

-- 2. CUSTOMER Table
-- Represents registered customer users who can browse and book turfs
CREATE TABLE CUSTOMER (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
);

-- 3. MANAGER Table
-- Represents administrative users managing turfs, bookings, and records
CREATE TABLE MANAGER (
    manager_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
);

-- 4. TURF Table
-- Represents football turf facilities available for booking
CREATE TABLE TURF (
    turf_id INTEGER PRIMARY KEY AUTOINCREMENT,
    turf_name TEXT NOT NULL,
    location TEXT NOT NULL,
    price REAL NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
);

-- 5. BOOKING Table
-- Represents a reservation made by a customer for a specific turf and time slot
CREATE TABLE BOOKING (
    booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    turf_id INTEGER NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'PENDING')),
    total_amount REAL NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime')),
    CONSTRAINT fk_booking_customer FOREIGN KEY (customer_id) 
        REFERENCES CUSTOMER (customer_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_booking_turf FOREIGN KEY (turf_id) 
        REFERENCES TURF (turf_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
);

-- Indexes for fast lookup and concurrency slot overlap validation
CREATE INDEX IF NOT EXISTS idx_booking_turf_date ON BOOKING (turf_id, booking_date, status);
CREATE INDEX IF NOT EXISTS idx_booking_customer ON BOOKING (customer_id);

-- 6. PAYMENT Table
-- Represents payment transaction associated with each booking
CREATE TABLE PAYMENT (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL UNIQUE,
    amount REAL NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'PENDING', 'REFUNDED')),
    payment_date DATETIME DEFAULT (datetime('now', 'localtime')),
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) 
        REFERENCES BOOKING (booking_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);
