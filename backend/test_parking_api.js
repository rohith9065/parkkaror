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

  // Test the exact query from /api/parking/all
  const q = `SELECT p.*,
    u.phone_number as owner_phone,
    CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name)) as owner_name,
    u.upi_id,
    GROUP_CONCAT(DISTINCT a.name) as amenities,
    GROUP_CONCAT(DISTINCT f.name) as features,
    GROUP_CONCAT(DISTINCT psi.image_url) as images
  FROM parking_spaces p
  LEFT JOIN users u ON p.owner_id = u.id
  LEFT JOIN parking_space_amenities psa ON p.id = psa.parking_space_id
  LEFT JOIN amenities a ON psa.amenity_id = a.id
  LEFT JOIN parking_space_features psf ON p.id = psf.parking_space_id
  LEFT JOIN features f ON psf.feature_id = f.id
  LEFT JOIN parking_space_images psi ON p.id = psi.parking_space_id
  WHERE p.is_active = TRUE
  GROUP BY p.id`;

  db.query(q, (error, results) => {
    if (error) {
      console.error('sql error', error);
    } else {
      console.log('API parking/all results:', JSON.stringify(results, null, 2));
    }
    db.end();
  });
});