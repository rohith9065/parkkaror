const axios = require('axios');
require('dotenv').config();

console.log('\n🔍 PARKAROR PAYMENT SYSTEM DIAGNOSTICS\n');

// Check 1: Razorpay Credentials
console.log('1️⃣  RAZORPAY CREDENTIALS CHECK');
console.log('   Key ID:', process.env.RAZORPAY_KEY_ID);
console.log('   Key Secret:', process.env.RAZORPAY_KEY_SECRET ? '****' + process.env.RAZORPAY_KEY_SECRET.slice(-4) : 'NOT SET');

if (process.env.RAZORPAY_KEY_ID === 'your_razorpay_key_id') {
  console.log('   ❌ ERROR: Key ID is placeholder value!');
} else if (!process.env.RAZORPAY_KEY_ID) {
  console.log('   ❌ ERROR: Key ID not set!');
} else {
  console.log('   ✅ Key ID looks valid');
}

if (process.env.RAZORPAY_KEY_SECRET === 'your_razorpay_key_secret') {
  console.log('   ❌ ERROR: Secret is placeholder value!');
} else if (!process.env.RAZORPAY_KEY_SECRET) {
  console.log('   ❌ ERROR: Secret not set!');
} else {
  console.log('   ✅ Secret looks valid');
}

// Check 2: Backend Connection
console.log('\n2️⃣  BACKEND CONNECTION CHECK');
console.log('   Testing: http://localhost:5000/api/');

axios.get('http://localhost:5000/api/parking/all')
  .then((response) => {
    console.log('   ✅ Backend is running');
  })
  .catch((error) => {
    if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ ERROR: Backend not running!');
      console.log('      Start backend: cd backend && node server.js');
    } else {
      console.log('   ⚠️  Backend responded but with error:', error.message);
    }
  })
  .finally(() => {
    // Check 3: Razorpay SDK
    console.log('\n3️⃣  RAZORPAY SDK CHECK');
    console.log('   Checking if razorpay npm package is installed...');

    try {
      const Razorpay = require('razorpay');
      console.log('   ✅ Razorpay SDK installed');

      // Try to initialize
      try {
        const rp = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        console.log('   ✅ Razorpay initialized (will test API calls with real credentials)');
      } catch (err) {
        console.log('   ⚠️  Razorpay initialization issue:', err.message);
      }
    } catch (err) {
      console.log('   ❌ ERROR: Razorpay SDK not installed!');
      console.log('      Install: npm install razorpay');
    }

    // Check 4: Database
    console.log('\n4️⃣  DATABASE CHECK');
    const mysql = require('mysql2');
    const db = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    db.connect((err) => {
      if (err) {
        console.log('   ❌ ERROR: Database connection failed!');
        console.log('      ', err.message);
      } else {
        console.log('   ✅ Database connected');

        db.query('SHOW TABLES LIKE "payments"', (err, results) => {
          if (results && results.length > 0) {
            console.log('   ✅ Payments table exists');
          } else {
            console.log('   ❌ ERROR: Payments table not found!');
            console.log('      Run: node migrate-payments.js');
          }

          db.query('SHOW TABLES LIKE "bookings"', (err, results) => {
            if (results && results.length > 0) {
              console.log('   ✅ Bookings table exists');
            } else {
              console.log('   ❌ ERROR: Bookings table not found!');
            }

            console.log('\n📋 SUMMARY');
            console.log('   ✅ = Ready');
            console.log('   ❌ = Action Required');
            console.log('   ⚠️  = Warning\n');

            db.end();
          });
        });
      }
    });
  });
