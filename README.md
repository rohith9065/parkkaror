# ParkKaror - Smart Parking Rental System

A modern, mobile-first web application for booking and managing parking spaces using location-based discovery, QR code access, and trust scoring.

## Features

- 🚗 **Location-Based Parking Discovery** - Find nearby parking spaces using Leaflet maps
- 🔐 **Phone OTP Authentication** - Secure Firebase phone verification
- 🎫 **QR Code Booking** - Generate and scan QR codes for entry
- 👤 **User Profiles** - Complete user management with trust scores
- 📊 **Owner Dashboard** - Manage parking spaces and bookings
- 🛡️ **KYC Verification** - Document upload and verification
- ⚠️ **Reporting System** - Report fraudulent users and listings
- 💳 **Booking System** - Easy parking reservation with time slots

## Tech Stack

- **Frontend**: React 18 + Vite
- **Maps**: Leaflet + OpenStreetMap
- **Authentication**: Firebase Phone OTP
- **Database**: Firebase Firestore (ready to configure)
- **QR Codes**: qrcode.react
- **Styling**: CSS3 with custom design system

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ParkingCard.jsx
│   ├── QRCodeComponent.jsx
│   ├── TrustBadge.jsx
│   └── UploadBox.jsx
├── pages/              # Page components
│   ├── Splash.jsx
│   ├── Auth.jsx
│   ├── OTP.jsx
│   ├── Home.jsx
│   ├── ParkingDetails.jsx
│   ├── Ticket.jsx
│   ├── Scanner.jsx
│   ├── Profile.jsx
│   ├── KYC.jsx
│   ├── Dashboard.jsx
│   ├── ListParking.jsx
│   ├── Report.jsx
│   └── Bookings.jsx
├── services/           # Firebase and API services
│   ├── firebase.js
│   ├── parkingService.js
│   ├── bookingService.js
│   └── userService.js
├── hooks/             # Custom React hooks
│   └── useLocation.js
├── utils/             # Utility functions
│   └── helpers.js
├── App.jsx           # Main app component
└── index.css         # Global styles
```

## Installation

1. Clone the repository
```bash
cd parkaror
```

2. Install dependencies
```bash
npm install
```

3. Configure Firebase
- Create a Firebase project at https://console.firebase.google.com
- Add a web app under Project Settings → Your apps
- Enable Phone authentication in Authentication → Sign-in method
- Update `src/services/firebase.js` with your Firebase config if needed

## Running the App

Development server (starts at http://localhost:5173):
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Usage

### For Drivers
1. Launch app → Get OTP → Login
2. View nearby parking on map
3. Select parking space
4. Choose time slot
5. Receive QR code ticket
6. Scan QR at parking entrance

### For Parking Owners
1. Register as owner
2. Add parking space listing
3. Set price and availability
4. View bookings on dashboard
5. Earn money from bookings

## Demo Credentials

For testing without Firebase:
- **Phone**: Any 10-digit number (e.g., 9876543210)
- **OTP**: 000000

## Getting Started with Firebase

### Step 1: Create Firebase Project
1. Go to https://console.firebase.google.com
2. Click "Create Project"
3. Enter project name: "ParkKaror"
4. Enable Google Analytics (optional)
5. Click "Create"

### Step 2: Set Up Authentication
1. In Firebase Console → Authentication
2. Click "Get Started"
3. Select "Phone" as sign-in method
4. Enable it

### Step 3: Create Firestore Database
1. In Firebase Console → Firestore Database
2. Click "Create Database"
3. Start in test mode
4. Choose region (closest to your users)
5. Click "Create"

### Step 4: Get Firebase Config
1. In Firebase Console → Project Settings
2. Copy your config object
3. Paste into `src/services/firebase.js`

Example Firebase config:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Database Schema

### Users Collection
```
{
  id: string (auto)
  name: string
  phone: string
  role: "driver" | "owner"
  trustScore: number (0-100)
  verified: boolean
  aadhaarImage: string (base64)
  licenseImage: string (base64)
  createdAt: timestamp
}
```

### Parkings Collection
```
{
  id: string (auto)
  ownerId: string
  name: string
  address: string
  latitude: number
  longitude: number
  pricePerHour: number
  totalSlots: number
  availableSlots: number
  images: string[]
  rating: number
  createdAt: timestamp
}
```

### Bookings Collection
```
{
  id: string (auto)
  userId: string
  parkingId: string
  timeSlot: string (ISO timestamp)
  status: "confirmed" | "completed" | "cancelled"
  qrCode: string
  price: number
  createdAt: timestamp
}
```

## Features in Detail

### Geolocation
Uses browser's built-in Geolocation API. Defaults to Delhi coordinates if permission denied.

### QR Code System
- Generated after booking confirmation
- Contains: bookingId, parkingId, timestamp
- Validated at parking entrance

### Trust Score
Calculated based on:
- Identity verification (+25)
- Successful bookings (+5 each)
- Reports against user (-10 each)
- Maximum: 100 points

### Distance Calculation
Uses Haversine formula to calculate distance from user's current location to parking spaces.

## Customization

### Colors
Edit CSS variables in `src/index.css`:
```css
:root {
  --primary: #FFC107;      /* Yellow */
  --primary-dark: #FFB300;
  --black: #000000;
  --white: #FFFFFF;
  --gray: #F5F5F5;
  --success: #4CAF50;
  --error: #F44336;
}
```

### Mock Data
Generated in `src/utils/helpers.js`:
- `generateMockParkings()` - Sample parking locations
- `generateTimeSlots()` - Available time slots
- `generateMockQRCode()` - Test QR data

## Mobile Optimization

- Mobile-first responsive design
- Max width: 420px
- Touch-friendly UI
- Bottom navigation bar
- Smooth animations

## Environment Variables

Create `.env` file (currently using mock data, no env vars needed):

```
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project
```

## Troubleshooting

### Maps not loading
- Check if Leaflet CSS is loaded in `index.html`
- Verify internet connection
- Clear browser cache

### Firebase connection errors
- Verify Firebase config is correct
- Check if Firestore rules allow read/write
- Test mode allows all read/write operations

### Geolocation not working
- App defaults to Delhi coordinates
- Check browser location permissions
- HTTPS required in production

## Development

Watch mode with HMR:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Security Note

- **Do NOT** commit Firebase config with real credentials to public repos
- Use environment variables for sensitive data
- Enable Firestore security rules for production
- Implement rate limiting for OTP requests
- Hash sensitive data in database

## License

MIT License - Feel free to use for personal and commercial projects

## Support

For issues and feature requests, contact support@parkaror.com

## Future Enhancements

- [ ] Payment integration (Razorpay/Stripe)
- [ ] Real-time booking notifications
- [ ] Multiple language support
- [ ] Advanced search filters
- [ ] Parking reviews and ratings
- [ ] Driver rating system
- [ ] Emergency support chat
- [ ] Insurance integration
- [ ] Monthly parking plans
- [ ] Corporate parking packages
