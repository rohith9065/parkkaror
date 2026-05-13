const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL database');
});

// Migration: Add payment fields
const migrationQueries = [
  // Add payment_status to bookings table
  `ALTER TABLE bookings ADD COLUMN payment_status VARCHAR(50) DEFAULT 'pending'`,

  // Add payment fields to users table
  `ALTER TABLE users ADD COLUMN upi_id VARCHAR(100)`,
  `ALTER TABLE users ADD COLUMN bank_account_number VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN bank_ifsc VARCHAR(20)`,
  `ALTER TABLE users ADD COLUMN bank_name VARCHAR(100)`,
  `ALTER TABLE users ADD COLUMN open_time TIME DEFAULT '08:00:00'`,
  `ALTER TABLE users ADD COLUMN close_time TIME DEFAULT '22:00:00'`,
  `ALTER TABLE users ADD COLUMN always_open BOOLEAN DEFAULT FALSE`,

  // Add payment tracking table
  `CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  )`
];

console.log('Running payment migration...');

migrationQueries.forEach((query, index) => {
  db.query(query, (err, result) => {
    if (err) {
      console.error(`Error in migration ${index + 1}:`, err);
    } else {
      console.log(`Migration ${index + 1} completed successfully`);
    }

    if (index === migrationQueries.length - 1) {
      console.log('All migrations completed');
      db.end();
    }
  });
});
