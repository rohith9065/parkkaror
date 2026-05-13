const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const Razorpay = require('razorpay');
const crypto = require('crypto');

dotenv.config();

// Initialize Razorpay
let razorpay = null;

if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id') {
  console.warn('⚠️  WARNING: Razorpay credentials not configured!');
  console.warn('Add these to your .env file:');
  console.warn('  RAZORPAY_KEY_ID=your_actual_key_id');
  console.warn('  RAZORPAY_KEY_SECRET=your_actual_key_secret');
} else {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('✅ Razorpay initialized successfully');
}

const app = express();
app.use(cors());
// Increase payload size limit to handle large image uploads (100MB)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

const ENTRY_SCAN_PRE_GRACE_MINUTES = 15;
const ENTRY_SCAN_POST_GRACE_MINUTES = 60;

app.use((req, res, next) => {
  console.log('✅ Incoming request:', req.method, req.originalUrl);
  next();
});

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

  // Ensure long base64 image values are not truncated by GROUP_CONCAT
  db.query('SET SESSION group_concat_max_len = 10000000', (groupErr) => {
    if (groupErr) {
      console.error('Error setting group_concat_max_len:', groupErr);
    } else {
      console.log('✅ group_concat_max_len set for image loading');
    }
  });

  const createReviewsTable = `
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
    ) ENGINE=InnoDB;
  `;

  db.query(createReviewsTable, (reviewErr) => {
    if (reviewErr) {
      console.error('❌ Error creating reviews table:', reviewErr);
    } else {
      console.log('✅ Reviews table is ready');
    }
  });
});

function buildSecureTicketPayload(booking) {
  const scanCode = crypto.randomBytes(3).toString('hex').toUpperCase();
  const payload = {
    version: 1,
    bookingId: booking.id,
    parkingId: booking.parking_space_id,
    userId: booking.user_id,
    ownerId: booking.owner_id,
    ownerPhone: booking.owner_phone,
    scanCode,
    scan_code: scanCode,
    verificationCode: scanCode,
    verification_code: scanCode,
    secureCode: scanCode,
    secure_code: scanCode,
    issuedAt: new Date().toISOString()
  };

  return { payload, scanCode };
}

function normalizeBookingId(rawBookingId) {
  if (rawBookingId === undefined || rawBookingId === null) return null;

  if (typeof rawBookingId === 'number') {
    return Number.isFinite(rawBookingId) ? rawBookingId : null;
  }

  let value = String(rawBookingId).trim();
  if (!value) return null;

  if (value.startsWith('BOOK')) value = value.replace('BOOK', '');
  if (value.includes('_')) value = value.split('_').pop();

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function tryParseJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseBookingDateAsUTC(dateTimeString) {
  if (!dateTimeString || typeof dateTimeString !== 'string') return null;
  let normalized = dateTimeString.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    // Treat MySQL DATETIME strings as local server time rather than forcing UTC.
    normalized = normalized.replace(' ', 'T');
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(normalized)) {
    // Keep timezone-less ISO as local time too.
    normalized = normalized;
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function extractQrPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const nested = payload.payload || payload.qrCode || payload.qr_code || payload.data || null;
  if (nested) {
    const normalized = tryParseJson(nested);
    if (normalized && typeof normalized === 'object') return extractQrPayload(normalized);
  }
  return payload;
}

// 1. User Registration / KYC
app.post('/api/users/register', (req, res) => {
  const { phone_number, full_name, address, document_url, role, upi_id } = req.body;
  const nameParts = (full_name || 'User').split(' ');
  const first_name = nameParts[0];
  const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
  
  const query = 'INSERT INTO users (phone_number, first_name, last_name, address, document_url, is_verified, role, upi_id) VALUES (?, ?, ?, ?, ?, TRUE, ?, ?) ON DUPLICATE KEY UPDATE first_name = ?, last_name = ?, address = ?, document_url = ?, role = ?, upi_id = COALESCE(?, upi_id)';
  
  db.query(query, [phone_number, first_name, last_name, address, document_url, role, upi_id, first_name, last_name, address, document_url, role, upi_id], (err, result) => {
    if (err) {
      console.error('Error registering user:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    // Fetch the updated user and rating summary, then return it
    db.query('SELECT * FROM users WHERE phone_number = ?', [phone_number], (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.length === 0) return res.status(500).json({ error: 'User not found after registration' });
      const user = results[0];
      db.query('SELECT COUNT(*) AS reviewCount, ROUND(AVG(rating), 1) AS averageRating FROM reviews WHERE reviewee_id = ?', [user.id], (summaryErr, summaryResults) => {
        if (summaryErr) {
          console.error('❌ Error fetching rating summary after registration:', summaryErr);
          return res.status(500).json({ error: 'Database error' });
        }
        const summary = summaryResults[0] || { reviewCount: 0, averageRating: 0 };
        res.json({
          message: 'User registered successfully',
          user: {
            ...user,
            reviewCount: summary.reviewCount || 0,
            averageRating: summary.averageRating || 0
          }
        });
      });
    });
  });
});

// 2. Fetch User by Phone
app.get('/api/users/:phone', (req, res) => {
  const phone = req.params.phone;
  console.log(`\n👤 Login Request: phone = ${phone}`);
  
  const query = 'SELECT * FROM users WHERE phone_number = ?';
  db.query(query, [phone], (err, results) => {
    if (err) {
      console.error('❌ Error fetching user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (results.length === 0) {
      console.log(`⚠️ User not found for phone: ${phone}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = results[0];
    db.query('SELECT COUNT(*) AS reviewCount, ROUND(AVG(rating), 1) AS averageRating FROM reviews WHERE reviewee_id = ?', [user.id], (summaryErr, summaryResults) => {
      if (summaryErr) {
        console.error('❌ Error fetching rating summary for user:', summaryErr);
        return res.status(500).json({ error: 'Database error' });
      }
      const summary = summaryResults[0] || { reviewCount: 0, averageRating: 0 };
      console.log(`✅ User found: ID=${user.id}, Name=${user.first_name}, Role=${user.role}`);
      res.json({
        ...user,
        reviewCount: summary.reviewCount || 0,
        averageRating: summary.averageRating || 0
      });
    });
  });
});

// 2a. Submit a new review
app.post('/api/reviews', (req, res) => {
  const { reviewer_id, reviewee_id, booking_id, rating, comment } = req.body;
  const normalizedRating = parseInt(rating, 10);

  if (!reviewer_id || !reviewee_id || !booking_id || isNaN(normalizedRating)) {
    return res.status(400).json({ error: 'Missing required review fields' });
  }
  if (normalizedRating < 1 || normalizedRating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const bookingQuery = `
    SELECT b.user_id AS driver_id, p.owner_id AS owner_id
    FROM bookings b
    JOIN parking_spaces p ON b.parking_space_id = p.id
    WHERE b.id = ?
  `;

  db.query(bookingQuery, [booking_id], (bookingErr, bookingResults) => {
    if (bookingErr) {
      console.error('❌ Error validating booking for review:', bookingErr);
      return res.status(500).json({ error: 'Database error' });
    }
    if (bookingResults.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const { driver_id, owner_id } = bookingResults[0];
    const reviewerId = parseInt(reviewer_id, 10);
    const revieweeId = parseInt(reviewee_id, 10);

    const validDriverOwnerPair = (
      (reviewerId === driver_id && revieweeId === owner_id) ||
      (reviewerId === owner_id && revieweeId === driver_id)
    );

    if (!validDriverOwnerPair) {
      return res.status(400).json({ error: 'Review must be between the driver and owner for this booking' });
    }

    const insertReviewQuery = 'INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?)';
    db.query(insertReviewQuery, [booking_id, reviewerId, revieweeId, normalizedRating, comment || null], (insertErr, insertResult) => {
      if (insertErr) {
        console.error('❌ Error saving review:', insertErr);
        if (insertErr.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ error: 'Review already submitted for this booking' });
        }
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        message: 'Rating submitted successfully',
        review: {
          id: insertResult.insertId,
          booking_id,
          reviewer_id: reviewerId,
          reviewee_id: revieweeId,
          rating: normalizedRating,
          comment: comment || '',
          created_at: new Date().toISOString()
        }
      });
    });
  });
});

// 2b. Fetch reviews for a user
app.get('/api/users/:id/reviews', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

  const query = `
    SELECT r.id, r.booking_id, r.rating, r.comment, r.created_at,
      CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name)) AS reviewer_name,
      u.phone_number AS reviewer_phone
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.reviewee_id = ?
    ORDER BY r.created_at DESC
  `;

  db.query(query, [userId], (err, rows) => {
    if (err) {
      console.error('❌ Error fetching reviews for user:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ reviews: rows });
  });
});

// 3. List Parking Space
app.post('/api/parking/list', (req, res) => {
  try {
    const {
      owner_id, name, address, latitude, longitude, total_slots,
      description, min_duration, max_duration, price_per_hour,
      availability_status, amenities, features, images, owner_name, owner_phone,
      upi_id
    } = req.body;
    
    console.log('📝 Received parking data:', { owner_id, name, total_slots, amenities, features, imageCount: images?.length || 0 });
    
    // Validate required fields
    if (!owner_id || !name || !address || !total_slots) {
      return res.status(400).json({ error: 'Missing required fields: owner_id, name, address, total_slots' });
    }
    
    // Convert numeric values
    const ownerId = parseInt(owner_id, 10);
    const slots = parseInt(total_slots, 10);
    const minDuration = parseInt(min_duration, 10) || 1;
    const maxDuration = parseInt(max_duration, 10) || 24;
    const pricePerHour = parseFloat(price_per_hour) || 50.00;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(ownerId) || isNaN(slots)) {
      return res.status(400).json({ error: 'Invalid input: owner_id and total_slots must be valid numbers' });
    }
    
    // First, ensure the user exists in the database
    const userCheckQuery = 'SELECT id FROM users WHERE id = ?';
    db.query(userCheckQuery, [ownerId], (err, results) => {
      if (err) {
        console.error('Error checking user:', err);
        return res.status(500).json({ error: 'Database error', details: err.message });
      }
      
      // If user doesn't exist, create them
      if (results.length === 0) {
        const nameParts = (owner_name || 'Owner').split(' ');
        const first_name = nameParts[0];
        const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
        
        const userInsertQuery = `INSERT INTO users (id, first_name, last_name, phone_number, role, is_verified) 
                                 VALUES (?, ?, ?, ?, 'owner', TRUE)`;
        db.query(userInsertQuery, [ownerId, first_name, last_name, owner_phone || 'unknown'], (err) => {
          if (err) {
            console.error('Error creating user:', err);
            // Continue anyway - might already exist
          }
          insertParkingSpace();
        });
      } else {
        insertParkingSpace();
      }
    });

    function insertParkingSpace() {
      // Insert parking space
      const parkingQuery = `INSERT INTO parking_spaces 
        (owner_id, name, description, address, latitude, longitude, total_slots, 
         time_slot_duration, system_price_per_hour, min_duration_hours, max_duration_hours, 
         availability_status, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, TRUE)`;
      
      db.query(parkingQuery, 
        [ownerId, name, description, address, lat, lng, slots, pricePerHour, minDuration, maxDuration, availability_status || 'available'], 
        (err, result) => {
          if (err) {
            console.error('❌ Error creating parking space:', err);
            return res.status(500).json({ error: 'Database error', details: err.message });
          }
          
          const parkingId = result.insertId;
          console.log('✅ Parking space created with ID:', parkingId);

          // If owner provided a UPI ID, update it on their profile
          if (upi_id && upi_id.trim()) {
            db.query(
              'UPDATE users SET upi_id = ? WHERE id = ?',
              [upi_id.trim(), ownerId],
              (upiErr) => { if (upiErr) console.error('Error updating owner UPI ID:', upiErr); }
            );
          }

          // Return success immediately
          res.json({ message: 'Parking space listed successfully', parkingId: parkingId });

          // Process images, amenities, and features asynchronously (don't block response)
          setImmediate(() => {
            processAmenities(parkingId, amenities);
            processFeatures(parkingId, features);
            processImages(parkingId, images);
          });
        }
      );
    }
  } catch (error) {
    console.error('❌ Error in /api/parking/list:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// 3b. Update Owner Payment Details
app.post('/api/users/:id/payment-details', (req, res) => {
  const userId = req.params.id;
  const { upiId } = req.body;

  console.log('📥 Update payment details request:', { userId, upiId });

  const query = `
    UPDATE users
    SET upi_id = ?
    WHERE id = ?
  `;

  db.query(query, [
    upiId || null,
    userId
  ], (err, result) => {
    if (err) {
      console.error('Error updating payment details:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (result && result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'Payment details updated successfully', affectedRows: result.affectedRows });
  });
});

// Helper function to process amenities
function processAmenities(parkingId, amenities) {
  if (!amenities || amenities.length === 0) return;
  
  amenities.forEach(amenityName => {
    const amenityQuery = 'INSERT IGNORE INTO amenities (name) VALUES (?)';
    db.query(amenityQuery, [amenityName], (err, result) => {
      if (err) {
        console.error('Error inserting amenity:', err);
        return;
      }
      
      const linkQuery = `INSERT IGNORE INTO parking_space_amenities (parking_space_id, amenity_id) 
        SELECT ?, id FROM amenities WHERE name = ?`;
      db.query(linkQuery, [parkingId, amenityName], (err) => {
        if (err) {
          console.error('Error linking amenity:', err);
        }
      });
    });
  });
}

// Helper function to process features
function processFeatures(parkingId, features) {
  if (!features || features.length === 0) return;
  
  features.forEach(featureName => {
    const featureQuery = 'INSERT IGNORE INTO features (name) VALUES (?)';
    db.query(featureQuery, [featureName], (err, result) => {
      if (err) {
        console.error('Error inserting feature:', err);
        return;
      }
      
      const linkQuery = `INSERT IGNORE INTO parking_space_features (parking_space_id, feature_id) 
        SELECT ?, id FROM features WHERE name = ?`;
      db.query(linkQuery, [parkingId, featureName], (err) => {
        if (err) {
          console.error('Error linking feature:', err);
        }
      });
    });
  });
}

// Helper function to process images
function processImages(parkingId, images) {
  if (!images || images.length === 0) return;
  
  images.forEach((imageUrl, index) => {
    // Skip if image is too large (more than 1MB)
    if (imageUrl.length > 1048576) {
      console.warn(`⚠️  Image ${index} too large (${(imageUrl.length / 1024 / 1024).toFixed(2)}MB), skipping`);
      return;
    }
    
    const imageQuery = 'INSERT INTO parking_space_images (parking_space_id, image_url) VALUES (?, ?)';
    db.query(imageQuery, [parkingId, imageUrl], (err) => {
      if (err) {
        console.error(`Error saving image ${index}:`, err);
      } else {
        console.log(`✅ Image ${index} saved for parking ${parkingId}`);
      }
    });
  });
}

// 4. Fetch Owner Dashboard Data (with all details)
app.get('/api/dashboard/:ownerId', (req, res) => {
  const ownerId = parseInt(req.params.ownerId, 10);
  
  console.log(`\n📊 Dashboard Request: ownerId = ${ownerId}`);
  
  if (isNaN(ownerId)) {
    console.log('❌ Invalid owner ID');
    return res.status(400).json({ error: 'Invalid owner ID' });
  }
  
  const parkingsQuery = `
    SELECT p.*, 
      u.upi_id,
      GROUP_CONCAT(DISTINCT a.name) as amenities,
      GROUP_CONCAT(DISTINCT f.name) as features,
      GROUP_CONCAT(DISTINCT psi.image_url SEPARATOR '||') as images
    FROM parking_spaces p
    LEFT JOIN users u ON p.owner_id = u.id
    LEFT JOIN parking_space_amenities psa ON p.id = psa.parking_space_id
    LEFT JOIN amenities a ON psa.amenity_id = a.id
    LEFT JOIN parking_space_features psf ON p.id = psf.parking_space_id
    LEFT JOIN features f ON psf.feature_id = f.id
    LEFT JOIN parking_space_images psi ON p.id = psi.parking_space_id
    WHERE p.owner_id = ?
    GROUP BY p.id
  `;
  
  const bookingsQuery = `
    SELECT b.*, p.name as parkingName FROM bookings b 
    JOIN parking_spaces p ON b.parking_space_id = p.id 
    WHERE p.owner_id = ? 
    ORDER BY b.created_at DESC
  `;
  
  db.query(parkingsQuery, [ownerId], (err, parkings) => {
    if (err) {
      console.error('❌ Error fetching parkings:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    console.log(`✅ Found ${parkings.length} parking spaces for owner ${ownerId}`);
    
    // Parse amenities, features, and images
    const formattedParkings = parkings.map(p => ({
      ...p,
      amenities: p.amenities ? p.amenities.split(',') : [],
      features: p.features ? p.features.split(',') : [],
      images: p.images ? p.images.split('||').filter(url => url) : []
    }));
    
    db.query(bookingsQuery, [ownerId], (err, bookings) => {
      if (err) {
        console.error('❌ Error fetching bookings:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      console.log(`✅ Found ${bookings.length} bookings for owner ${ownerId}`);
      
      const earnings = bookings
        .filter(b => b.payment_status ? b.payment_status === 'paid' : (b.status === 'completed' || b.status === 'confirmed'))
        .reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);
      console.log(`💰 Total earnings: ${earnings}`);
      console.log('📤 Sending response...\n');
      res.json({ parkings: formattedParkings, bookings, earnings });
    });
  });
});

// 5. Fetch All Active Parking Spaces (for Home/Driver Dashboard)
// Optional: filter by proximity if lat/lng provided
app.get('/api/parking/all', (req, res) => {
  const { lat, lng, radius = 50 } = req.query; // radius in km
  
  let query = `
    SELECT p.*, 
      u.phone_number as owner_phone,
      CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name)) as owner_name,
      u.upi_id,
      GROUP_CONCAT(DISTINCT a.name) as amenities,
      GROUP_CONCAT(DISTINCT f.name) as features,
      GROUP_CONCAT(DISTINCT psi.image_url SEPARATOR '||') as images,
      ( 6371 * acos( cos( radians(?) ) * cos( radians( latitude ) ) * cos( radians( longitude ) - radians(?) ) + sin( radians(?) ) * sin( radians( latitude ) ) ) ) AS distance
    FROM parking_spaces p
    LEFT JOIN users u ON p.owner_id = u.id
    LEFT JOIN parking_space_amenities psa ON p.id = psa.parking_space_id
    LEFT JOIN amenities a ON psa.amenity_id = a.id
    LEFT JOIN parking_space_features psf ON p.id = psf.parking_space_id
    LEFT JOIN features f ON psf.feature_id = f.id
    LEFT JOIN parking_space_images psi ON p.id = psi.parking_space_id
    WHERE p.is_active = TRUE
  `;
  let params = [lat, lng, lat];

  if (!lat || !lng) {
    query = `
      SELECT p.*, 
        u.phone_number as owner_phone,
        CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name)) as owner_name,
        u.upi_id,
        GROUP_CONCAT(DISTINCT a.name) as amenities,
        GROUP_CONCAT(DISTINCT f.name) as features,
        GROUP_CONCAT(DISTINCT psi.image_url SEPARATOR '||') as images
      FROM parking_spaces p
      LEFT JOIN users u ON p.owner_id = u.id
      LEFT JOIN parking_space_amenities psa ON p.id = psa.parking_space_id
      LEFT JOIN amenities a ON psa.amenity_id = a.id
      LEFT JOIN parking_space_features psf ON p.id = psf.parking_space_id
      LEFT JOIN features f ON psf.feature_id = f.id
      LEFT JOIN parking_space_images psi ON p.id = psi.parking_space_id
      WHERE p.is_active = TRUE
      GROUP BY p.id
    `;
    params = [];
  } else {
    query += ' GROUP BY p.id HAVING distance < ? ORDER BY distance';
    params.push(radius);
  }

  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching parkings:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    // Parse amenities, features, and images for each parking space
    const formattedResults = results.map(p => ({
      ...p,
      amenities: p.amenities ? p.amenities.split(',') : [],
      features: p.features ? p.features.split(',') : [],
      images: p.images ? p.images.split('||').filter(url => url) : []
    }));

    res.json(formattedResults);
  });
});

// 6. Create a Booking
app.post('/api/bookings/create', (req, res) => {
  const { parking_space_id, user_id, start_time, duration_hours, total_price } = req.body;

  // Convert string IDs to integers
  const parkingId = parseInt(parking_space_id, 10);
  const userId = parseInt(user_id, 10);
  const hours = parseInt(duration_hours, 10);
  const price = parseFloat(total_price);

  // Validate conversions
  if (isNaN(parkingId) || isNaN(userId) || isNaN(hours) || isNaN(price)) {
    return res.status(400).json({ error: 'Invalid input: IDs and price must be valid numbers' });
  }

  // Convert ISO datetime to MySQL format
  let sqlDateTime = start_time;
  if (start_time.includes('T')) {
    // ISO format: 2026-04-10T01:00:00.000Z → 2026-04-10 01:00:00
    const date = new Date(start_time);
    sqlDateTime = date.toISOString().slice(0, 19).replace('T', ' ');
  }

  const spaceQuery = `
    SELECT p.total_slots
    FROM parking_spaces p
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = ? AND p.is_active = TRUE AND p.availability_status != 'unavailable'
  `;

  db.query(spaceQuery, [parkingId], (spaceErr, spaces) => {
    if (spaceErr) {
      console.error('Error checking parking space:', spaceErr);
      return res.status(500).json({ error: 'Database error', details: spaceErr.message });
    }
    if (spaces.length === 0) {
      return res.status(404).json({ error: 'Parking space is not available' });
    }

    const space = spaces[0];
    const requestStart = new Date(sqlDateTime.replace(' ', 'T'));
    const requestEnd = new Date(requestStart.getTime() + hours * 3600000);

    const alwaysOpen = true;
    const openHour = 8;
    const closeHour = 22;
    const requestEndHour = requestEnd.getHours() + (requestEnd.getMinutes() > 0 ? 1 : 0);

    if (!alwaysOpen && (requestStart.getHours() < openHour || requestEndHour > closeHour)) {
      return res.status(409).json({ error: 'Selected time is outside owner availability hours' });
    }

    const overlapQuery = `
      SELECT COUNT(*) as bookedCount
      FROM bookings
      WHERE parking_space_id = ?
        AND payment_status IN ('paid', 'pending')
        AND (status IS NULL OR status != 'cancelled')
        AND start_time < DATE_ADD(?, INTERVAL ? HOUR)
        AND DATE_ADD(start_time, INTERVAL duration_hours HOUR) > ?
    `;

    db.query(overlapQuery, [parkingId, sqlDateTime, hours, sqlDateTime], (overlapErr, overlapRows) => {
      if (overlapErr) {
        console.error('Error checking slot availability:', overlapErr);
        return res.status(500).json({ error: 'Database error', details: overlapErr.message });
      }

      if ((overlapRows[0]?.bookedCount || 0) >= space.total_slots) {
        return res.status(409).json({ error: 'This slot is already booked' });
      }

      const query = 'INSERT INTO bookings (parking_space_id, user_id, start_time, duration_hours, total_price, payment_status) VALUES (?, ?, ?, ?, ?, ?)';

      db.query(query, [parkingId, userId, sqlDateTime, hours, price, 'pending'], (err, result) => {
        if (err) {
          console.error('Error creating booking:', err);
          return res.status(500).json({ error: 'Database error', details: err.message });
        }

        const bookingId = result.insertId;
        res.json({ message: 'Booking created, awaiting payment', bookingId: bookingId, paymentRequired: true });
      });
    });
  });
});

// 4b. Fetch Driver Bookings
app.get('/api/users/:id/bookings', (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });

  const query = `
    SELECT b.*, p.name as parkingName, p.address, p.owner_id, u.phone_number as owner_phone, u.upi_id
    FROM bookings b
    JOIN parking_spaces p ON b.parking_space_id = p.id
    JOIN users u ON p.owner_id = u.id
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `;

  db.query(query, [userId], (err, bookings) => {
    if (err) {
      console.error('Error fetching user bookings:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ bookings });
  });
});

// 6b. Fetch single parking space
app.get('/api/parking/:id', (req, res) => {
  const parkingId = parseInt(req.params.id, 10);
  if (isNaN(parkingId)) return res.status(400).json({ error: 'Invalid parking ID' });

  const query = `
    SELECT p.*,
      u.phone_number as owner_phone,
      CONCAT(TRIM(u.first_name), ' ', TRIM(u.last_name)) as owner_name,
      u.upi_id,
      GROUP_CONCAT(DISTINCT a.name) as amenities,
      GROUP_CONCAT(DISTINCT f.name) as features,
      GROUP_CONCAT(DISTINCT psi.image_url SEPARATOR '||') as images
    FROM parking_spaces p
    LEFT JOIN users u ON p.owner_id = u.id
    LEFT JOIN parking_space_amenities psa ON p.id = psa.parking_space_id
    LEFT JOIN amenities a ON psa.amenity_id = a.id
    LEFT JOIN parking_space_features psf ON p.id = psf.parking_space_id
    LEFT JOIN features f ON psf.feature_id = f.id
    LEFT JOIN parking_space_images psi ON p.id = psi.parking_space_id
    WHERE p.id = ?
    GROUP BY p.id
  `;

  db.query(query, [parkingId], (err, results) => {
    if (err) {
      console.error('Error fetching parking:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) return res.status(404).json({ error: 'Parking space not found' });
    const p = results[0];
    res.json({
      ...p,
      amenities: p.amenities ? p.amenities.split(',') : [],
      features: p.features ? p.features.split(',') : [],
      images: p.images ? p.images.split('||').filter(url => url) : []
    });
  });
});

// 7. Create Razorpay Order
app.post('/api/payments/create-order', (req, res) => {
  const { bookingId, amount } = req.body;

  // Validate inputs
  if (!bookingId || !amount) {
    return res.status(400).json({ error: 'Missing bookingId or amount' });
  }

  // Check if Razorpay is initialized
  if (!razorpay) {
    return res.status(503).json({ 
      error: 'Payment service unavailable',
      message: 'Razorpay credentials not configured. Contact support.' 
    });
  }

  const options = {
    amount: amount * 100, // Razorpay expects amount in paisa
    currency: 'INR',
    receipt: `booking_${bookingId}`,
  };

  razorpay.orders.create(options, (err, order) => {
    if (err) {
      console.error('❌ Error creating Razorpay order:', err);
      
      // Check if it's an authentication error
      if (err.statusCode === 401 || err.description === 'Authentication failed') {
        return res.status(401).json({ 
          error: 'Razorpay authentication failed',
          details: 'Invalid API Key or Secret. Please check your Razorpay credentials in .env file.',
          hint: 'Visit https://dashboard.razorpay.com/app/keys to get correct credentials'
        });
      }

      return res.status(500).json({ 
        error: 'Failed to create payment order',
        details: err.message || 'Unknown error' 
      });
    }

    if (!order || !order.id) {
      console.error('❌ Invalid order response from Razorpay:', order);
      return res.status(500).json({ 
        error: 'Invalid response from payment gateway',
        details: 'Order creation failed - no order ID returned' 
      });
    }

    // Save payment record
    const query = 'INSERT INTO payments (booking_id, razorpay_order_id, amount) VALUES (?, ?, ?)';
    db.query(query, [bookingId, order.id, amount], (dbErr) => {
      if (dbErr) {
        console.error('❌ Error saving payment record:', dbErr);
        return res.status(500).json({ 
          error: 'Database error',
          details: 'Failed to save payment record' 
        });
      }

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID
      });
    });
  });
});

// 8. Verify Payment
app.post('/api/payments/verify', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;
  const normalizedBookingId = normalizeBookingId(bookingId);

  if (!normalizedBookingId) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  const sign = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSign = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(sign.toString())
    .digest('hex');

  if (razorpay_signature === expectedSign) {
    // Payment verified, update booking and generate QR
    const updateBookingQuery = 'UPDATE bookings SET payment_status = ?, status = ? WHERE id = ?';
    const updatePaymentQuery = 'UPDATE payments SET razorpay_payment_id = ?, status = ? WHERE booking_id = ?';

    db.query(updateBookingQuery, ['paid', 'booked', normalizedBookingId], (err1, bookingUpdateResult) => {
      if (err1) {
        console.error('Error updating booking:', err1);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!bookingUpdateResult || bookingUpdateResult.affectedRows === 0) {
        return res.status(404).json({ error: 'Booking not found' });
      }

      db.query(updatePaymentQuery, [razorpay_payment_id, 'captured_pending_scan', normalizedBookingId], (err2) => {
        if (err2) {
          console.error('Error updating payment:', err2);
          return res.status(500).json({ error: 'Database error' });
        }

        // Generate QR code now that payment is confirmed
        // Fetch booking details with parking and owner info
        db.query(`
          SELECT 
            b.id, b.parking_space_id, b.user_id,
            p.owner_id,
            u.phone_number as owner_phone
          FROM bookings b
          JOIN parking_spaces p ON b.parking_space_id = p.id
          JOIN users u ON p.owner_id = u.id
          WHERE b.id = ?
        `, [normalizedBookingId], (err4, results) => {
          if (err4 || results.length === 0) {
            console.error('Error fetching booking details:', err4);
            return res.status(500).json({ error: 'Database error' });
          }

          const booking = results[0];
          const { payload, scanCode } = buildSecureTicketPayload(booking);
          const qrPayload = JSON.stringify(payload);

          db.query('UPDATE bookings SET qr_code = ? WHERE id = ?', [qrPayload, normalizedBookingId], (err5) => {
            if (err5) console.error('Error saving QR code:', err5);
            res.json({
              success: true,
              message: 'Payment verified. Show this QR to owner for entry scan.',
              qrCode: qrPayload,
              verificationCode: scanCode
            });
          });
        });
      });
    });
  } else {
    res.status(400).json({ error: 'Payment verification failed' });
  }
});

// 9. Check Razorpay payment status for a booking
app.get('/api/payments/status/:bookingId', (req, res) => {
  const bookingId = normalizeBookingId(req.params.bookingId);
  if (!bookingId) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  const query = 'SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1';
  db.query(query, [bookingId], (err, payments) => {
    if (err) {
      console.error('Error fetching payment:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!payments || payments.length === 0) {
      return res.status(404).json({ error: 'No payment order found for this booking' });
    }

    const payment = payments[0];
    if (!payment.razorpay_order_id) {
      return res.status(400).json({ error: 'No Razorpay order ID found for this payment' });
    }

    if (!razorpay) {
      return res.status(503).json({ error: 'Razorpay service unavailable' });
    }

    razorpay.orders.fetch(payment.razorpay_order_id, (fetchErr, order) => {
      if (fetchErr) {
        console.error('Error fetching Razorpay order:', fetchErr);
        return res.status(500).json({ error: 'Failed to fetch order status', details: fetchErr.message });
      }

      const status = order.status || 'created';
      const amountPaid = order.amount_paid || 0;
      const isPaid = status === 'paid' || amountPaid >= order.amount;

      if (isPaid && payment.status !== 'captured_pending_scan') {
        const updateBookingQuery = 'UPDATE bookings SET payment_status = ?, status = ? WHERE id = ?';
        const updatePaymentQuery = 'UPDATE payments SET status = ? WHERE id = ?';

        db.query(updateBookingQuery, ['paid', 'booked', bookingId], (updateErr) => {
          if (updateErr) {
            console.error('Error updating booking payment status:', updateErr);
          }

          db.query(updatePaymentQuery, ['captured_pending_scan', payment.id], (paymentErr) => {
            if (paymentErr) {
              console.error('Error updating payment record:', paymentErr);
            }

            // Generate QR if not already created
            db.query('SELECT qr_code, parking_space_id, user_id FROM bookings WHERE id = ?', [bookingId], (qrErr, qrResults) => {
              if (qrErr || qrResults.length === 0) {
                console.error('Error fetching booking for QR generation:', qrErr);
                return res.status(500).json({ error: 'Database error' });
              }

              const booking = qrResults[0];
              if (booking.qr_code) {
                return res.json({ status: 'paid', qrCode: booking.qr_code });
              }

              db.query(`
                SELECT b.id, b.parking_space_id, b.user_id,
                  p.owner_id,
                  u.phone_number as owner_phone
                FROM bookings b
                JOIN parking_spaces p ON b.parking_space_id = p.id
                JOIN users u ON p.owner_id = u.id
                WHERE b.id = ?
              `, [bookingId], (detailsErr, detailsResults) => {
                if (detailsErr || detailsResults.length === 0) {
                  console.error('Error fetching booking details:', detailsErr);
                  return res.status(500).json({ error: 'Database error' });
                }

                const bookingDetails = detailsResults[0];
                const { payload, scanCode } = buildSecureTicketPayload(bookingDetails);
                const qrPayload = JSON.stringify(payload);

                db.query('UPDATE bookings SET qr_code = ? WHERE id = ?', [qrPayload, bookingId], (saveErr) => {
                  if (saveErr) console.error('Error saving QR code:', saveErr);
                  res.json({ status: 'paid', qrCode: qrPayload, verificationCode: scanCode });
                });
              });
            });
          });
        });
      } else {
        res.json({ status, amountPaid, amount: order.amount, order });
      }
    });
  });
});

// 10. Process payout to owner
app.post('/api/payments/payout', (req, res) => {
  const { bookingId, ownerId } = req.body;

  // Get owner payment details
  const ownerQuery = 'SELECT upi_id, bank_account_number, bank_ifsc FROM users WHERE id = ?';
  db.query(ownerQuery, [ownerId], (err, ownerResults) => {
    if (err || ownerResults.length === 0) {
      console.error('Error fetching owner details:', err);
      return res.status(500).json({ error: 'Owner details not found' });
    }

    const owner = ownerResults[0];
    if (!owner.upi_id && !owner.bank_account_number) {
      return res.status(400).json({ error: 'Owner payment details not configured' });
    }

    // Get booking amount
    const bookingQuery = 'SELECT total_price FROM bookings WHERE id = ?';
    db.query(bookingQuery, [bookingId], (err2, bookingResults) => {
      if (err2 || bookingResults.length === 0) {
        console.error('Error fetching booking:', err2);
        return res.status(500).json({ error: 'Booking not found' });
      }

      const amount = bookingResults[0].total_price;

      // In a real implementation, you would:
      // 1. Create a Razorpay contact for the owner
      // 2. Create a fund account (UPI or bank)
      // 3. Initiate a payout transfer

      // For now, just log the payout
      console.log(`💰 Payout initiated: ₹${amount} to owner ${ownerId} via ${owner.upi_id || 'bank transfer'}`);

      // Update payment record
      const updateQuery = 'UPDATE payments SET status = ? WHERE booking_id = ?';
      db.query(updateQuery, ['payout_initiated', bookingId], (err3) => {
        if (err3) console.error('Error updating payment status:', err3);
        res.json({ success: true, message: 'Payout initiated successfully' });
      });
    });
  });
});

// 9b. Confirm Manual UPI Payment
app.post('/api/payments/confirm-manual', (req, res) => {
  const { bookingId } = req.body;
  const normalizedBookingId = normalizeBookingId(bookingId);

  if (!normalizedBookingId) {
    return res.status(400).json({ error: 'Invalid booking ID' });
  }

  const updateBookingQuery = 'UPDATE bookings SET payment_status = ?, status = ? WHERE id = ?';

  db.query(updateBookingQuery, ['paid', 'booked', normalizedBookingId], (err1, bookingUpdateResult) => {
    if (err1) {
      console.error('Error updating booking:', err1);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!bookingUpdateResult || bookingUpdateResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    db.query(
      'INSERT INTO payments (booking_id, amount, status) SELECT id, total_price, ? FROM bookings WHERE id = ? AND NOT EXISTS (SELECT 1 FROM payments WHERE booking_id = ?) LIMIT 1',
      ['captured_pending_scan', normalizedBookingId, normalizedBookingId],
      (paymentInsertErr) => {
        if (paymentInsertErr) {
          console.error('Error creating payment record:', paymentInsertErr);
          return res.status(500).json({ error: 'Database error' });
        }

        db.query('UPDATE payments SET status = ? WHERE booking_id = ?', ['captured_pending_scan', normalizedBookingId], (paymentUpdateErr) => {
          if (paymentUpdateErr) {
            console.error('Error updating payment status:', paymentUpdateErr);
            return res.status(500).json({ error: 'Database error' });
          }

          // Fetch booking details with parking and owner info to generate QR code
          db.query(`
            SELECT 
              b.id, b.parking_space_id, b.user_id,
              p.owner_id,
              u.phone_number as owner_phone
            FROM bookings b
            JOIN parking_spaces p ON b.parking_space_id = p.id
            JOIN users u ON p.owner_id = u.id
            WHERE b.id = ?
          `, [normalizedBookingId], (err4, results) => {
            if (err4 || results.length === 0) {
              console.error('Error fetching booking details:', err4);
              return res.status(500).json({ error: 'Database error' });
            }

            const booking = results[0];
            const { payload, scanCode } = buildSecureTicketPayload(booking);
            const qrPayload = JSON.stringify(payload);

            db.query('UPDATE bookings SET qr_code = ? WHERE id = ?', [qrPayload, normalizedBookingId], (err5) => {
              if (err5) console.error('Error saving QR code:', err5);

              console.log(`✅ Manual payment confirmed for booking ${normalizedBookingId}`);
              res.json({
                success: true,
                message: 'Payment confirmed. Show this QR to owner for entry scan.',
                qrCode: qrPayload,
                verificationCode: scanCode
              });
            });
          });
        });
      }
    );
  });
});

// 10. Validate a Booking QR Code (for Owner's Scanner)
app.post('/api/bookings/validate-qr', (req, res) => {
  const { booking_id, parking_id, scan_type, owner_phone, scan_code } = req.body;
  
  console.log(`\n🔐 QR Validation Request:`, { booking_id, parking_id, scan_type, scan_code });
  
  // Extract number if it has a BOOK prefix or demo suffix
  let idToSearch = booking_id;
  if (typeof booking_id === 'string') {
    if (booking_id.startsWith('BOOK')) idToSearch = booking_id.replace('BOOK', '');
    else if (booking_id.includes('_')) idToSearch = booking_id.split('_')[1];
  }
  
  // Convert to integer
  idToSearch = parseInt(idToSearch, 10);
  console.log(`📌 Extracted booking ID: ${idToSearch} (type: ${typeof idToSearch})`);
  
  if (isNaN(idToSearch)) {
    console.log(`❌ Invalid booking ID format: ${booking_id}`);
    return res.status(400).json({ error: 'Invalid booking ID format' });
  }

  const query = `
    SELECT 
      b.*, 
      p.name as parkingName, 
      u.first_name, u.last_name,
      o.phone_number as owner_phone
    FROM bookings b 
    JOIN parking_spaces p ON b.parking_space_id = p.id 
    JOIN users u ON b.user_id = u.id
    JOIN users o ON p.owner_id = o.id
    WHERE b.id = ?
  `;
  
  db.query(query, [idToSearch], (err, results) => {
    if (err) {
      console.error(`❌ Database error looking up booking ${idToSearch}:`, err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (results.length === 0) {
      console.log(`❌ Booking not found: ID ${idToSearch}`);
      return res.json({ 
        valid: false, 
        message: `Booking ID ${idToSearch} not found. Please check the QR code and try again.` 
      });
    }
    
    const booking = results[0];
    console.log(`✅ Booking found:`, { id: booking.id, status: booking.payment_status, used: booking.is_used });
    
    let savedQrPayload = null;

    try {
      savedQrPayload = extractQrPayload(tryParseJson(booking.qr_code));
      console.log(`📋 QR Payload parsed:`, savedQrPayload);
    } catch (parseErr) {
      console.warn(`⚠️ Could not parse QR payload:`, parseErr.message);
      savedQrPayload = null;
    }
    
    // Verify owner's phone number matches if provided (for owner scanning)
    if (owner_phone && booking.owner_phone !== owner_phone) {
      console.log(`❌ Owner phone mismatch: expected ${booking.owner_phone}, got ${owner_phone}`);
      return res.json({ 
        valid: false, 
        message: 'Access Denied - Owner phone mismatch',
        booking 
      });
    }
    
    const bookingStartDate = parseBookingDateAsUTC(booking.start_time);
    if (!bookingStartDate) {
      console.warn('⚠️ Could not parse booking.start_time as UTC:', booking.start_time);
    }
    const startTime = bookingStartDate ? bookingStartDate.getTime() : new Date(booking.start_time).getTime();
    const bookingEndTime = startTime + (booking.duration_hours * 3600000);
    const scanWindowStart = startTime - (ENTRY_SCAN_PRE_GRACE_MINUTES * 60000);
    const scanWindowEnd = bookingEndTime + (ENTRY_SCAN_POST_GRACE_MINUTES * 60000);
    const now = Date.now();
    const isBeforeWindow = now < scanWindowStart;
    const isExpired = now > scanWindowEnd;

    console.log(`⏱️ Scan window for booking ${idToSearch}:`, {
      startTime: new Date(scanWindowStart).toISOString(),
      endTime: new Date(scanWindowEnd).toISOString(),
      now: new Date(now).toISOString()
    });

    if (isBeforeWindow) {
      return res.json({
        valid: false,
        message: `Access Denied - Scan too early. Entry opens ${ENTRY_SCAN_PRE_GRACE_MINUTES} minutes before the booking time.`,
        booking,
        scanWindowStart,
        scanWindowEnd
      });
    }

    if (booking.payment_status !== 'paid') {
      console.log(`❌ Payment not completed: status=${booking.payment_status}`);
      return res.json({ valid: false, message: 'Access Denied - Payment not completed', booking });
    }
    
    if (isExpired) {
      return res.json({
        valid: false,
        message: `Access Denied - Booking has expired. QR scan is allowed until ${ENTRY_SCAN_POST_GRACE_MINUTES} minutes after the booking ends.`,
        booking,
        scanWindowStart,
        scanWindowEnd
      });
    }

    if (scan_type === 'entry') {
      if (booking.is_used) {
        console.log(`❌ Entry already used for booking ${idToSearch}`);
        return res.json({ valid: false, message: 'Access Denied - QR already used for entry', booking });
      }

      const expectedCode = savedQrPayload
        ? String(savedQrPayload.scanCode || savedQrPayload.scan_code || savedQrPayload.verificationCode || savedQrPayload.verification_code || savedQrPayload.secureCode || savedQrPayload.secure_code || '').toUpperCase().replace(/\s+/g, '')
        : '';
      const providedCode = scan_code ? String(scan_code).toUpperCase().replace(/\s+/g, '') : '';

      console.log(`🔐 Entry Scan Code Validation:`);
      console.log(`   Expected: '${expectedCode}' (${expectedCode.length} chars)`);
      console.log(`   Provided: '${providedCode}' (${providedCode.length} chars)`);
      console.log(`   QR Payload exists: ${!!savedQrPayload}`);
      console.log(`   Match: ${expectedCode === providedCode}`);

      if (!expectedCode) {
        console.log(`⚠️ QR code has no security code embedded`);
        return res.json({ valid: false, message: 'Error: QR code missing security code. Payment may not have completed properly.', booking });
      }
      
      if (!providedCode) {
        console.log(`⚠️ No security code was provided by owner`);
        return res.json({ valid: false, message: 'Secure payment code not provided. Owner must scan the QR code fully or paste the code.', booking });
      }
      
      if (expectedCode !== providedCode) {
        console.log(`❌ Code mismatch: Expected '${expectedCode}' but got '${providedCode}'`);
        return res.json({ 
          valid: false, 
          message: `Code mismatch. Expected: ${expectedCode} | Got: ${providedCode}`, 
          booking,
          expectedCode,
          providedCode
        });
      }
      
      console.log(`✅ Code match! Approving entry...`);
      db.query('UPDATE bookings SET is_used = TRUE, status = "parked_scanning" WHERE id = ?', [idToSearch], (err2) => {
        if (err2) {
          console.error('❌ Error updating booking:', err2);
          return res.status(500).json({ error: 'Database update failed' });
        }
        console.log(`✅ Entry approved for booking ${idToSearch}`);
        res.json({ 
          valid: true, 
          message: 'Driver Verified - You can now enter. Status: Parked Scanning', 
          booking,
          ownerPhone: booking.owner_phone,
          isEntry: true,
          status: 'parked_scanning'
        });
      });
    } else { // Exit
      if (booking.status === 'completed') {
        return res.json({ valid: false, message: 'Error - Vehicle has already exited', booking });
      }
      
      db.query('UPDATE bookings SET status = "completed" WHERE id = ?', [idToSearch], (err3) => {
        if (err3) console.error(err3);
        res.json({ 
          valid: true, 
          message: 'Driver Verified - Exit Approved. Safe Travels!', 
          booking,
          ownerPhone: booking.owner_phone,
          isEntry: false,
          status: 'completed'
        });
      });
    }
  });
});

// 11. Update a Parking Space (owner edit)
app.put('/api/parking/:id', (req, res) => {
  const parkingId = parseInt(req.params.id, 10);
  if (isNaN(parkingId)) return res.status(400).json({ error: 'Invalid parking ID' });

  const {
    name, description, address, latitude, longitude,
    price_per_hour, availability_status, total_slots, min_duration, max_duration,
    amenities, features, upi_id, owner_id
  } = req.body;

  const updateQuery = `UPDATE parking_spaces SET
    name = ?, description = ?, address = ?,
    latitude = ?, longitude = ?,
    system_price_per_hour = ?, availability_status = ?, total_slots = ?,
    min_duration_hours = ?, max_duration_hours = ?
    WHERE id = ?`;

  db.query(updateQuery, [
    name, description || '', address,
    parseFloat(latitude) || 0, parseFloat(longitude) || 0,
    parseFloat(price_per_hour) || 50,
    availability_status || 'available',
    parseInt(total_slots, 10) || 1,
    parseInt(min_duration, 10) || 1,
    parseInt(max_duration, 10) || 24,
    parkingId
  ], (err) => {
    if (err) {
      console.error('Error updating parking:', err);
      return res.status(500).json({ error: 'Database error', details: err.message });
    }

    if (upi_id && upi_id.trim() && owner_id) {
      db.query('UPDATE users SET upi_id = ? WHERE id = ?',
        [upi_id.trim(), parseInt(owner_id, 10)],
        (upiErr) => { if (upiErr) console.error('UPI update error:', upiErr); }
      );
    }

    db.query('DELETE FROM parking_space_amenities WHERE parking_space_id = ?', [parkingId], () => {
      if (amenities && amenities.length > 0) processAmenities(parkingId, amenities);
    });

    db.query('DELETE FROM parking_space_features WHERE parking_space_id = ?', [parkingId], () => {
      if (features && features.length > 0) processFeatures(parkingId, features);
    });

    res.json({ success: true, message: 'Parking space updated successfully' });
  });
});

// 12. Get booked slots for a parking space (driver view)
app.get('/api/parking/:id/slots', (req, res) => {
  const parkingId = parseInt(req.params.id, 10);
  if (isNaN(parkingId)) return res.status(400).json({ error: 'Invalid parking ID' });

  db.query(`
    SELECT p.total_slots
    FROM parking_spaces p
    JOIN users u ON p.owner_id = u.id
    WHERE p.id = ?
  `, [parkingId], (err, spaces) => {
    if (err || spaces.length === 0) return res.status(404).json({ error: 'Parking space not found' });

    const totalSlots = spaces[0].total_slots;

    db.query(`
      SELECT start_time, duration_hours
      FROM bookings
      WHERE parking_space_id = ?
        AND payment_status IN ('paid', 'pending')
        AND (status IS NULL OR status != 'cancelled')
        AND start_time >= NOW()
        AND start_time <= DATE_ADD(NOW(), INTERVAL 3 DAY)
    `, [parkingId], (err2, bookings) => {
      if (err2) return res.status(500).json({ error: 'Database error' });
      res.json({
        bookings,
        totalSlots,
        openTime: '08:00',
        closeTime: '22:00',
        alwaysOpen: true
      });
    });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
