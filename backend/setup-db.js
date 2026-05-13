const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL');

  const schema = `
    CREATE DATABASE IF NOT EXISTS parkaror;
    USE parkaror;

    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        address TEXT,
        document_url VARCHAR(500),
        is_verified BOOLEAN DEFAULT FALSE,
        role VARCHAR(50) DEFAULT 'driver',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parking_spaces (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        address TEXT NOT NULL,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        total_slots INT NOT NULL,
        time_slot_duration INT NOT NULL,
        system_price_per_hour DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
        min_duration_hours INT DEFAULT 1,
        max_duration_hours INT DEFAULT 24,
        availability_status VARCHAR(50) DEFAULT 'available',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS parking_space_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parking_space_id INT NOT NULL,
        image_url LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS amenities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parking_space_amenities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parking_space_id INT NOT NULL,
        amenity_id INT NOT NULL,
        UNIQUE KEY unique_parking_amenity (parking_space_id, amenity_id),
        FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE,
        FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS features (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS parking_space_features (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parking_space_id INT NOT NULL,
        feature_id INT NOT NULL,
        UNIQUE KEY unique_parking_feature (parking_space_id, feature_id),
        FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE,
        FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parking_space_id INT NOT NULL,
        user_id INT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        duration_hours INT NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'confirmed',
        qr_code VARCHAR(500),
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id BIGINT NOT NULL,
        reviewer_id BIGINT NOT NULL,
        reviewee_id BIGINT NOT NULL,
        rating TINYINT NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_booking_reviewer_reviewee (booking_id, reviewer_id, reviewee_id),
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    INSERT IGNORE INTO amenities (name) VALUES 
    ('CCTV'),
    ('24/7 Security'),
    ('EV Charging'),
    ('Covered'),
    ('Lighting'),
    ('Water Supply');

    INSERT IGNORE INTO features (name) VALUES 
    ('Gated'),
    ('Wheelchair Access'),
    ('Monthly Discount'),
    ('Insurance');
  `;

  // Execute each statement separately
  const statements = schema.split(';').filter(s => s.trim());
  
  let completed = 0;
  statements.forEach((stmt, index) => {
    db.query(stmt + ';', (err) => {
      if (err) {
        console.error(`Error executing statement ${index}:`, err.message);
      } else {
        console.log(`✓ Statement ${index + 1} executed`);
      }
      completed++;
      if (completed === statements.length) {
        console.log('\n✅ Database schema setup complete!');
        db.end();
        process.exit(0);
      }
    });
  });
});
