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

  const alterTableQueries = [
    `ALTER TABLE parking_spaces ADD COLUMN description TEXT`,
    `ALTER TABLE parking_spaces ADD COLUMN min_duration_hours INT DEFAULT 1`,
    `ALTER TABLE parking_spaces ADD COLUMN max_duration_hours INT DEFAULT 24`,
    `ALTER TABLE parking_spaces ADD COLUMN availability_status VARCHAR(50) DEFAULT 'available'`,
  ];

  let completed = 0;
  alterTableQueries.forEach((query, index) => {
    db.query(query, (err) => {
      if (err) {
        // Ignore error if column already exists
        if (err.message.includes('Duplicate column')) {
          console.log(`⚠️  Column already exists (statement ${index + 1})`);
        } else {
          console.error(`❌ Error executing alter query ${index}:`, err.message);
        }
      } else {
        console.log(`✓ Alter statement ${index + 1} executed`);
      }
      completed++;
      if (completed === alterTableQueries.length) {
        console.log('\n✅ Database schema updated successfully!');
        db.end();
        process.exit(0);
      }
    });
  });
});
