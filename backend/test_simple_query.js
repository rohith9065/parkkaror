require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect(err => {
  if (err) {
    console.error('connect error', err);
    process.exit(1);
  }

  // Test simplified query
  const q = `SELECT p.*, u.phone_number as owner_phone,
    CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name)) as owner_name, u.upi_id
    FROM parking_spaces p
    LEFT JOIN users u ON p.owner_id = u.id
    WHERE p.is_active = TRUE`;

  db.query(q, (error, results) => {
    if (error) {
      console.error('sql error', error);
    } else {
      console.log('Simple query results:', JSON.stringify(results, null, 2));
    }
    db.end();
  });
});