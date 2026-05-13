# QR Code with Owner Phone Number - Implementation Guide

## Overview
The QR code system now includes the owner's phone number, enabling renters to directly contact the parking space owner for issues or assistance.

---

## How It Works

### 1. **Payment Flow → QR Generation**
```
User Books Parking
    ↓
Booking Created (status: pending_payment)
    ↓
Payment Screen Appears
    ↓
Razorpay Payment Processed
    ↓
Payment Verification with Signature Check
    ↓
QR Code Generated with Owner Info ✨
    ↓
QR Displayed to User with Owner Phone Badge
```

### 2. **QR Code Payload Structure**
When a QR is generated, it contains:
```json
{
  "bookingId": 123,
  "parkingId": 45,
  "userId": 67,
  "ownerId": 89,
  "ownerPhone": "+91-9876543210"
}
```

### 3. **Backend Processing** (`backend/server.js`)

**Payment Verification Endpoint** (`POST /api/payments/verify`):
- Validates Razorpay signature using SHA256 HMAC
- Updates booking payment status to "paid"
- Fetches parking owner details via SQL JOIN:
  ```sql
  SELECT b.id, b.parking_space_id, b.user_id, p.owner_id, u.phone_number as owner_phone
  FROM bookings b
  JOIN parking_spaces p ON b.parking_space_id = p.id
  JOIN users u ON p.owner_id = u.id
  WHERE b.id = ?
  ```
- Generates QR payload including `ownerPhone`
- Stores QR code in database
- Returns QR to frontend

---

## Frontend Display

### 4. **QR Code Component** (`src/components/QRCodeComponent.jsx`)
- Receives QR payload from payment verification
- Parses JSON to extract owner phone number
- Displays QR code using `qrcode.react` library
- Shows owner phone in attractive badge below QR

### 5. **Owner Badge Styling** (`src/components/QRCodeComponent.css`)
```css
.owner-info-badge {
  background: linear-gradient(135deg, #667eea → #764ba2);  /* Purple gradient */
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  box-shadow: 0 2px 6px rgba(102, 126, 234, 0.3);
}

.owner-phone {
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.5px;
}
```

**UI Result:**
```
┌─────────────┐
│  QR CODE    │
│   IMAGE     │
│             │
└─────────────┘
┌──────────────────────────┐
│ 📞 Owner: +91-9876543210 │  ← Purple gradient badge
└──────────────────────────┘
```

---

## QR Validation with Owner Verification

### 6. **Scanner Endpoints** (`backend/server.js`)

**QR Validation** (`POST /api/bookings/validate-qr`):
- Owner scans the QR code with their app
- Endpoint verifies booking validity
- Optional owner phone verification (prevents unauthorized access)
- Returns:
  - `valid: true/false`
  - Booking details
  - Owner phone for verification
  - Entry/Exit recording

**Request:**
```json
{
  "booking_id": 123,
  "parking_id": 45,
  "scan_type": "entry",
  "owner_phone": "+91-9876543210"  // Optional: Owner authentication
}
```

**Response (Valid Access):**
```json
{
  "valid": true,
  "message": "Gate Access Granted - Entry Recorded",
  "booking": { /* booking details */ },
  "ownerPhone": "+91-9876543210",
  "isEntry": true
}
```

---

## Use Cases

### **Renter Perspective:**
1. Books parking space
2. Completes payment through Razorpay
3. Receives QR code with owner's phone number
4. Can immediately contact owner if parking issues arise
5. Scans QR at entry → Gate opens
6. Scans QR at exit → Booking completes

### **Owner Perspective:**
1. Someone parks in their rental space
2. Owner receives booking notification
3. Owner can see booking details including renter info
4. Owner scans QR code (which contains their own phone for verification)
5. Gate system records entry/exit timestamps
6. Receives payment upon successful completion

---

## Database Schema

### Bookings Table
```sql
CREATE TABLE bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parking_space_id INT,
  user_id INT,
  start_time DATETIME,
  duration_hours INT,
  payment_status VARCHAR(50) DEFAULT 'pending',
  qr_code LONGTEXT,        -- Stores JSON with owner phone
  is_used BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  ...
  FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Parking Spaces Table
```sql
CREATE TABLE parking_spaces (
  id INT PRIMARY KEY AUTO_INCREMENT,
  owner_id INT,
  name VARCHAR(255),
  location VARCHAR(255),
  ...
  FOREIGN KEY (owner_id) REFERENCES users(id)
);
```

### Users Table
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  first_name VARCHAR(100),
  phone_number VARCHAR(20),           -- Owner's contact
  upi_id VARCHAR(100),                -- For payouts
  bank_account_number VARCHAR(50),    -- For payouts
  ...
);
```

---

## Payment & Payout Flow

### 7. **Complete Payment Journey**
```
1. User Books → Creates Booking (pending_payment)
                ↓
2. Payment Screen → Razorpay Checkout with User Details
                ↓
3. User Pays → Razorpay processes transaction
                ↓
4. Signature Verify → Backend cryptographically verifies payment
                ↓
5. Generate QR → Fetches owner phone, creates payload with owner info
                ↓
6. Store QR → Saves to booking.qr_code
                ↓
7. Return QR → Frontend receives QR with owner phone
                ↓
8. Display Badge → UI shows " 📞 Owner: +91-XXXXXXXXXX"
                ↓
9. Initiate Payout → Transfers funds to owner's UPI/Bank (Async)
```

---

## Testing

### **Test Scenarios**

#### Scenario 1: Verify Owner Phone in QR
1. Create booking with test data
2. Process payment with Razorpay test card: `4111111111111111`
3. Check QR code displays owner phone
4. Verify owner badge appears with correct phone number

#### Scenario 2: Verify Owner Phone Verification
1. Scan QR at parking entrance
2. System verifies owner phone matches database
3. Confirm access granted/denied accordingly

#### Scenario 3: Multiple Bookings Same Owner
1. Create multiple bookings at same parking space
2. Verify each QR shows correct owner phone
3. Test QR validation for each booking

---

## Razorpay Test Credentials

**Test Card:**
- Number: `4111111111111111`
- Expiry: `12/25`
- CVV: `123`

**Required .env Variables:**
```env
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
```

Get these from: https://dashboard.razorpay.com/app/keys (Test Mode)

---

## Troubleshooting

### Issue: Owner phone not showing in QR badge
**Solution:**
1. Check database: Verify parking_spaces.owner_id is set
2. Check users table: Verify owner's phone_number is not NULL
3. Check backend logs: Look for SQL JOIN errors
4. Test QR payload: Use browser console to inspect qrData

### Issue: QR validation fails with owner phone mismatch
**Solution:**
1. Verify scan is using correct owner phone number
2. Check database for owner phone value
3. Ensure phone formatting is consistent (with/without +91, etc.)

### Issue: Payment verification returns no owner data
**Solution:**
1. Ensure parking_space.owner_id is populated
2. Verify owner user exists in users table
3. Check SQL JOIN query syntax
4. Enable MySQL query logging for debugging

---

## Future Enhancements

1. **Direct Messaging** - In-app chat between renter and owner visible upon scan
2. **Emergency Contact** - Separate emergency phone for parking issues
3. **QR History** - Track all scans by owner and renter
4. **Phone Formatting** - Standardize phone display (e.g., +91-XXXX-XXXXX)
5. **Do Not Call Registry** - Respect privacy preferences
6. **Two-Factor Verification** - OTP verification for owner phone
7. **Whatsapp Integration** - Direct WhatsApp link in QR badge

---

## Key Files Modified

| File | Changes |
|------|---------|
| `backend/server.js` | Added owner phone to QR payload in `/api/payments/verify` endpoint |
| `src/components/QRCodeComponent.jsx` | Added parsing and display of owner phone in badge |
| `src/components/QRCodeComponent.css` | Added `.owner-info-badge` styling with purple gradient |
| `backend/server.js` | Enhanced `/api/bookings/validate-qr` with owner phone verification |

---

## Summary

✅ **Owner phone is now embedded in every QR code**
✅ **Beautiful badge displays below QR for user visibility**
✅ **Backend validates owner phone during QR scans**
✅ **Enables direct renter-to-owner communication**
✅ **Maintains security with signature verification**

The system is production-ready. Just add your Razorpay credentials to `.env` and test!
