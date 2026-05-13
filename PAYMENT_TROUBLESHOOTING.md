# Payment Initiation Failed - Troubleshooting Guide

## ❌ Root Causes

### **1. CRITICAL: Missing Razorpay Credentials** 
Your `.env` file has placeholder credentials:
```
RAZORPAY_KEY_ID=your_razorpay_key_id          ❌ NOT SET
RAZORPAY_KEY_SECRET=your_razorpay_key_secret  ❌ NOT SET
```

**Why it fails:** Razorpay SDK requires real credentials to create payment orders.

---

## ✅ SOLUTION: Get and Add Razorpay Credentials

### **Step 1: Create Razorpay Account**
1. Go to https://dashboard.razorpay.com/
2. Sign up or log in
3. Complete KYC verification (can use Test mode without it)

### **Step 2: Get API Keys**
1. Go to **Settings** → **API Keys**
2. Copy your **Key ID** and **Key Secret**
   - Key ID: Starts with `rzp_test_` or `rzp_live_`
   - Key Secret: Longer alphanumeric string

### **Step 3: Update `.env` File**
```bash
# backend/.env
RAZORPAY_KEY_ID=rzp_test_your_actual_key_here
RAZORPAY_KEY_SECRET=your_actual_secret_key_here
```

**Example (Test Mode):**
```
RAZORPAY_KEY_ID=rzp_test_1DP5gbNptcWd8T
RAZORPAY_KEY_SECRET=aB12345cDeFgHiJkLmNoPqRsTuVwXyZ
```

### **Step 4: Restart Backend**
```bash
cd backend
# Stop the current server (Ctrl+C)
node server.js
```

---

## 🧪 Test the Payment Flow

### **Test Credentials (Sandbox Mode)**
Razorpay provides test cards for sandbox:

**Test Card (Success):**
- Number: `4111111111111111`
- Expiry: `12/25` (any future date)
- CVV: `123` (any 3 digits)

**Test Card (Failed):**
- Number: `4000000000000002`
- Expiry: `12/25`
- CVV: `123`

### **Test Steps**
1. Open app: http://localhost:5173
2. Create a booking
3. Click "Complete Payment"
4. Use test card to complete payment
5. Should see QR code after success ✅

---

## 🔍 Debugging - Check Backend Logs

When you try to pay, check backend terminal for messages:

**If credentials missing:**
```
⚠️ WARNING: Razorpay credentials not configured!
Add these to your .env file:
  RAZORPAY_KEY_ID=your_actual_key_id
  RAZORPAY_KEY_SECRET=your_actual_key_secret
```

**If payment creation fails:**
```
❌ Error creating Razorpay order: [error details]
```

**If successful:**
```
✅ Razorpay initialized successfully
```

---

## 🚨 Possible Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "Payment service unavailable" | Razorpay not initialized | Add credentials to .env |
| "Failed to create payment order" | Invalid API credentials | Verify Key ID & Secret from Razorpay dashboard |
| "Invalid order response" | Network or API issue | Check internet, verify credentials are correct |
| "Missing bookingId or amount" | Frontend not sending proper data | Check booking data structure |
| "Razorpay SDK not loaded" | HTML doesn't have SDK script | Verify index.html has Razorpay script tag |

---

## 📋 Checklist Before Payment

- [ ] `.env` file has real Razorpay credentials (not placeholders)
- [ ] Backend restarted after adding credentials
- [ ] Frontend is running: `npm run dev` (http://localhost:5173)
- [ ] Backend is running: `node server.js` (http://localhost:5000)
- [ ] Database has `payments` table
- [ ] index.html has `<script src="https://checkout.razorpay.com/v1/checkout.js"></script>`

---

## 🔐 Production vs Test Mode

### **Test Mode (Development)**
- Use: `rzp_test_xxx` credentials
- Test cards provided above
- No real money charged
- For development/testing

### **Live Mode (Production)**
- Use: `rzp_live_xxx` credentials  
- Real cards required
- Real transactions
- After going live on Razorpay

---

## 📞 Need Help?

### Check Logs
1. **Frontend Console:** Browser Developer Tools → Console tab
2. **Backend Logs:** Terminal running `node server.js`
3. **Network Tab:** Browser DevTools → Network tab → look for `/api/payments/create-order`

### Common Issues
- **"Razorpay is not defined"** → Razorpay SDK not loading. Check index.html
- **"Failed to fetch"** → Backend not running or wrong URL
- **"Payment verification failed"** → Backend couldn't verify the payment signature

---

## ✨ After Fix

Once credentials are added:
1. User books parking → Payment screen
2. Razorpay checkout opens ✅
3. User enters card details
4. Payment processed with Razorpay
5. Verification happens on backend
6. QR code displayed for entry
7. Payout initiated to owner's GPay

---

**Need real Razorpay credentials? Visit:** https://dashboard.razorpay.com/
