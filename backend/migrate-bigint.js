const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) {
    console.error('Connection error:', err);
    process.exit(1);
  }
  console.log('Connected to MySQL');

  // Don't try to do complex migrations - just recreate the tables with BIGINT
  const dropAndRecreate = `
    DROP TABLE IF EXISTS bookings;
    DROP TABLE IF EXISTS parking_space_features;
    DROP TABLE IF EXISTS parking_space_amenities;
    DROP TABLE IF EXISTS parking_space_images;
    DROP TABLE IF EXISTS parking_spaces;
    DROP TABLE IF EXISTS users;

    CREATE TABLE users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone_number VARCHAR(20) UNIQUE NOT NULL,
      address TEXT,
      document_url VARCHAR(500),
      is_verified BOOLEAN DEFAULT FALSE,
      role VARCHAR(50) DEFAULT 'driver',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE parking_spaces (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      owner_id BIGINT NOT NULL,
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

    CREATE TABLE parking_space_images (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      parking_space_id BIGINT NOT NULL,
      image_url LONGTEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
    );

    CREATE TABLE amenities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    );

    CREATE TABLE parking_space_amenities (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parking_space_id BIGINT NOT NULL,
      amenity_id INT NOT NULL,
      UNIQUE KEY unique_parking_amenity (parking_space_id, amenity_id),
      FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE,
      FOREIGN KEY (amenity_id) REFERENCES amenities(id) ON DELETE CASCADE
    );

    CREATE TABLE features (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL
    );

    CREATE TABLE parking_space_features (
      id INT AUTO_INCREMENT PRIMARY KEY,
      parking_space_id BIGINT NOT NULL,
      feature_id INT NOT NULL,
      UNIQUE KEY unique_parking_feature (parking_space_id, feature_id),
      FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE,
      FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE
    );

    CREATE TABLE bookings (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      parking_space_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
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

    INSERT INTO amenities (name) VALUES 
    ('CCTV'), ('24/7 Security'), ('EV Charging'), ('Covered'), ('Lighting'), ('Water Supply');

    INSERT INTO features (name) VALUES 
    ('Gated'), ('Wheelchair Access'), ('Monthly Discount'), ('Insurance');
  `;

  const statements = dropAndRecreate.split(';').filter(s => s.trim());
  let completed = 0;
  
  statements.forEach((stmt, index) => {
    db.query(stmt + ';', (err) => {
      if (err) {
        console.error(`❌ Error at statement ${index}:`, err.message);
      } else {
        console.log(`✓ Statement ${index + 1} executed`);
      }
      completed++;
      if (completed === statements.length) {
        console.log('\n✅ Database recreated with BIGINT IDs! All data cleared.');
        db.end();
        process.exit(0);
      }
    });
  });
});
