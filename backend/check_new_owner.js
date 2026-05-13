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

  // Check for new owner
  db.query('SELECT id, phone_number, first_name, last_name, upi_id FROM users WHERE phone_number LIKE "%883%" LIMIT 10', (err, res) => {
    if (err) {
      console.error('user query error:', err);
    } else {
      console.log('Users with 883:', JSON.stringify(res, null, 2));
    }

    // Check parking spaces
    db.query('SELECT p.*, u.phone_number as owner_phone FROM parking_spaces p LEFT JOIN users u ON p.owner_id = u.id WHERE u.phone_number LIKE "%883%" OR p.address LIKE "%Kumarasamy%" ORDER BY p.created_at DESC LIMIT 10', (err2, res2) => {
      if (err2) {
        console.error('parking query error:', err2);
      } else {
        console.log('Parking spaces:', JSON.stringify(res2, null, 2));
      }

      // Check all active parking spaces
      db.query('SELECT COUNT(*) as total_active FROM parking_spaces WHERE is_active = TRUE', (err3, res3) => {
        if (err3) {
          console.error('count query error:', err3);
        } else {
          console.log('Total active parking spaces:', res3[0].total_active);
        }
        db.end();
      });
    });
  });
});