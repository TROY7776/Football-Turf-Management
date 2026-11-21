-- ====================================================================
-- Football Turf Management System - Database Schema
-- Database: football_turf_management
-- Designed for College DBMS Mini-Project
-- ====================================================================

-- 1. Create Database if not exists
CREATE DATABASE IF NOT EXISTS football_turf_management;
USE football_turf_management;

-- 2. Drop tables in reverse order of foreign key dependency if re-running
DROP TABLE IF EXISTS PAYMENT;
DROP TABLE IF EXISTS BOOKING;
DROP TABLE IF EXISTS TURF;
DROP TABLE IF EXISTS MANAGER;
DROP TABLE IF EXISTS CUSTOMER;

-- 3. CUSTOMER Table
-- Represents registered customer users who can browse and book turfs
CREATE TABLE CUSTOMER (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. MANAGER Table
-- Represents administrative users managing turfs, bookings, and records
CREATE TABLE MANAGER (
    manager_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TURF Table
-- Represents football turf facilities available for booking
CREATE TABLE TURF (
    turf_id INT AUTO_INCREMENT PRIMARY KEY,
    turf_name VARCHAR(100) NOT NULL,
    location VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BOOKING Table
-- Represents a reservation made by a customer for a specific turf and time slot
CREATE TABLE BOOKING (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    turf_id INT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration INT NOT NULL DEFAULT 1,
    status ENUM('CONFIRMED', 'CANCELLED', 'COMPLETED', 'PENDING') NOT NULL DEFAULT 'CONFIRMED',
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_customer FOREIGN KEY (customer_id) 
        REFERENCES CUSTOMER (customer_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_booking_turf FOREIGN KEY (turf_id) 
        REFERENCES TURF (turf_id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes for fast lookup and overlap checking
CREATE INDEX idx_booking_turf_date ON BOOKING (turf_id, booking_date, status);
CREATE INDEX idx_booking_customer ON BOOKING (customer_id);

-- 7. PAYMENT Table
-- Represents payment transaction associated with each booking
CREATE TABLE PAYMENT (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('PAID', 'PENDING', 'REFUNDED') NOT NULL DEFAULT 'PAID',
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) 
        REFERENCES BOOKING (booking_id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
