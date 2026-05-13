CREATE DATABASE IF NOT EXISTS parkaror;
USE parkaror;

-- 1. Users Table (Stores user profile, KYC info, and verification status)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    address TEXT,
    document_url VARCHAR(500), -- URL to the uploaded KYC document
    is_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(50) DEFAULT 'driver',
    upi_id VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_ifsc VARCHAR(20),
    bank_name VARCHAR(100),
    open_time TIME DEFAULT '08:00:00',
    close_time TIME DEFAULT '22:00:00',
    always_open BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Parking Spaces Table (Stores rental listings)
CREATE TABLE IF NOT EXISTS parking_spaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),  -- Auto-filled by geolocation
    longitude DECIMAL(11, 8), -- Auto-filled by geolocation
    total_slots INT NOT NULL,
    time_slot_duration INT NOT NULL, -- e.g., 1 or 2 (hours)
    system_price_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    min_duration_hours INT DEFAULT 1,
    max_duration_hours INT DEFAULT 24,
    availability_status VARCHAR(50) DEFAULT 'available', -- available, limited, unavailable
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2a. Parking Space Images Table
CREATE TABLE IF NOT EXISTS parking_space_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parking_space_id INT NOT NULL,
    image_url LONGTEXT NOT NULL, -- Base64 or URL
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
);

-- 2b. Amenities Table
CREATE TABLE IF NOT EXISTS amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 2c. Parking Space Amenities (Junction table)
CREATE TABLE IF NOT EXISTS parking_space_amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parking_space_id INT NOT NULL,
    amenity_id INT NOT NULL,
    UNIQUE KEY unique_parking_amenity (parking_space_id, amenity_id),
    FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE,
    FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
);

-- 2d. Features Table
CREATE TABLE IF NOT EXISTS features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 2e. Parking Space Features (Junction table)
CREATE TABLE IF NOT EXISTS parking_space_features (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parking_space_id INT NOT NULL,
    feature_id INT NOT NULL,
    UNIQUE KEY unique_parking_feature (parking_space_id, feature_id),
    FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE,
    FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
);

-- 3. Bookings Table (Stores user reservations)
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    parking_space_id INT NOT NULL,
    user_id INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    duration_hours INT NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, completed, cancelled
    payment_status VARCHAR(50) DEFAULT 'pending',
    qr_code VARCHAR(500),
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewee_id INT NOT NULL,
    rating TINYINT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_booking_reviewer_reviewee (booking_id, reviewer_id, reviewee_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
);
