# ParkKaror

## 1. Title
ParkKaror - Smart Parking Rental System

## 2. Description
ParkKaror is a parking rental app for drivers and parking owners. It helps users find nearby parking, book a slot, and use QR-based access while owners can list spaces and manage bookings.

## 3. Major Modules Present
- Auth and OTP login
- Home and parking discovery
- Parking details and booking flow
- QR code generation and scanner
- Owner dashboard and parking listing
- Reports, bookings, and earnings pages
- Backend API and database scripts

## 4. Concepts Used
- React with Vite
- Component-based UI design
- Location-based search using Leaflet and browser geolocation
- QR code generation and verification
- Firebase integration for auth and data
- Razorpay for payments
- Responsive mobile-first layout

## 5. How to Run and Go With the Flow
1. Install frontend dependencies from the project root:
```bash
npm install
```

2. Start the frontend:
```bash
npm run dev
```

3. If you need the backend, install its dependencies first:
```bash
cd backend
npm install
npm run dev
```

4. Open the app in the browser from the Vite URL, usually `http://localhost:5173`.

5. Typical app flow:
- Login with OTP
- Find a parking space
- Check details and book a slot
- Complete payment if required
- Get the QR code ticket
- Scan QR at the parking entry
- Owners can add spaces and track bookings from their dashboard

