-- 1. TRACK GLOBAL SECTORS & TENANTS
CREATE TABLE institutions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sector_type VARCHAR(20) NOT NULL, -- 'SCHOOL', 'ESTATE', 'CHURCH'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. UNIVERSAL AUTHENTICATED USERS
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    institution_id INT REFERENCES institutions(id) ON DELETE CASCADE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- For your hashed credentials
    role VARCHAR(20) NOT NULL,       -- 'TEACHER', 'RESIDENT', 'GUARD', 'ADMIN'
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL
);

-- 3. EXPANDED RESIDENTIAL GATE PASS MODULE
CREATE TABLE visitor_bookings (
    id SERIAL PRIMARY KEY,
    institution_id INT REFERENCES institutions(id) ON DELETE CASCADE,
    resident_id INT REFERENCES users(id) ON DELETE CASCADE,
    visitor_name VARCHAR(100) NOT NULL,
    visitor_phone VARCHAR(20) NOT NULL,
    visitor_nin VARCHAR(20),
    vehicle_reg VARCHAR(20),
    guest_count INT DEFAULT 1,
    transport_mode VARCHAR(20), -- 'WALKING', 'PERSONAL_VEHICLE', 'UBER'
    pass_code VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'INSIDE', 'EXITED'
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_in_at TIMESTAMP,
    checked_out_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    institution_id INT REFERENCES institutions(id) ON DELETE CASCADE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, 
    role VARCHAR(20) NOT NULL,       -- 'TEACHER', 'RESIDENT', 'GUARD', 'ADMIN'
    name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL
);
-- ==========================================
-- INDUSTRIAL RESIDENTIAL ESTATE CORRIDOR TABLES
-- ==========================================

-- 1. Extend or check your institutions table to ensure it supports multiple sectors
-- (Your existing code already has 'institutions', we will just use it!)

-- 2. Create the Expanded Visitor Bookings Table
CREATE TABLE IF NOT EXISTS visitor_bookings (
    id SERIAL PRIMARY KEY,
    institution_id INT REFERENCES institutions(id) ON DELETE CASCADE,
    resident_id INT REFERENCES users(id) ON DELETE CASCADE,
    visitor_name VARCHAR(100) NOT NULL,
    visitor_phone VARCHAR(20) NOT NULL,
    visitor_nin VARCHAR(20) NOT NULL,
    vehicle_reg VARCHAR(20),
    guest_count INT DEFAULT 1,
    transport_mode VARCHAR(30) NOT NULL, -- 'WALKING', 'PERSONAL_VEHICLE', 'UBER'
    pass_code VARCHAR(15) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'INSIDE', 'EXITED'
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checked_in_at TIMESTAMP,
    checked_out_at TIMESTAMP
);