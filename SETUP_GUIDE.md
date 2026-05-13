# ParkKaror Setup Guide

Welcome to ParkKaror! This guide will help you get the parking rental app running and configured.

## 📱 Quick Start

### 1. Development Server is Running!
✅ The app is already running at: **http://localhost:5173/**

Open this URL in your browser to see the app.

### 2. Demo Walkthrough

**Test Credentials:**
- Phone: Any valid 10-digit number (e.g., 9876543210)
- OTP: Sent by Firebase SMS to that phone number

**User Flows to Try:**

**Flow 1: Driver Booking Parking**
1. Splash screen shows briefly
2. Enter phone number → Get OTP
3. Enter OTP (use 000000)
4. See map with nearby parking
5. Click parking card to view details
6. Select time slot
7. Click "Book Parking"
8. View booking ticket with QR code
9. Click "Scan QR at Entry" to test scanner

**Flow 2: Owner Features**
1. From Home page bottom nav
2. Click Dashboard (📊)
3. View parking spaces and earnings
4. Click "+ Add" to list new parking
5. Fill parking details and submit

**Flow 3: User Profile**
1. From Home page bottom nav
2. Click Profile (👤)
3. View trust score and verification status
4. Click "Complete KYC" to verify identity
5. Upload documents (any image)
6. View verification status

## 🔧 Configuration Guide

### Firebase Setup (Required for Production)

#### Step 1: Create Firebase Project
```
1. Visit: https://console.firebase.google.com
2. Click "Add project"
3. Project name: "ParkKaror"
4. Disable Google Analytics unless you want it
5. Create project
```

#### Step 2: Enable Phone Authentication
```
1. In your Firebase console, go to Authentication
2. Click "Get started"
3. Open the "Sign-in method" tab
4. Enable "Phone" as a sign-in provider
5. Save changes
```

#### Step 3: Add Firebase Web App
```
1. In Project Settings, select "Web" (</>)
2. Register a new app
3. Copy the Firebase config object
4. Paste it into `src/services/firebase.js` if needed
```

#### Step 4: Test Authentication
```
1. Start the app with `npm run dev`
2. Enter a valid phone number on the login screen
3. You should receive a Firebase SMS OTP
4. Enter the 4-digit code to log in
```

### Database Setup

**Note:** The app currently uses a local MySQL backend for user data and parking information. Firebase is used only for phone OTP authentication. User profiles, parking spaces, and bookings are stored in your local database.

If you want to migrate to Firebase for all data, you would need to:
1. Create Firestore collections (users, parkings, bookings, etc.)
2. Update the API endpoints to use Firestore instead of local MySQL
3. Modify the services to use Firebase client

For now, the setup focuses on Firebase OTP authentication while keeping your existing data architecture.

## 🗺️ Map Configuration

The app uses **Leaflet + OpenStreetMap** (no API key needed!)

### Default Location
Currently defaults to **Delhi, India**:
- Latitude: 28.7041
- Longitude: 77.1025

To change default location, edit `src/hooks/useLocation.js`:

```javascript
const defaultLocation = {
  latitude: 40.7128,  // New York
  longitude: -74.0060,
};
```

## 🎨 Customization

### Colors
Edit `src/index.css` CSS variables:

```css
:root {
  --primary: #FFC107;        /* Yellow */
  --primary-dark: #FFB300;   /* Dark Yellow */
  --black: #000000;          /* Black */
  --white: #FFFFFF;          /* White */
  --gray: #F5F5F5;           /* Light Gray */
  --gray-dark: #333333;      /* Dark Gray */
  --success: #4CAF50;        /* Green */
  --error: #F44336;          /* Red */
  --warning: #FF9800;        /* Orange */
}
```

### App Title
Edit `index.html`:
```html
<title>ParkKaror - Smart Parking Rental</title>
```

### Logo/Branding
Edit icons in page components (emoji currently used):
```javascript
<span className="logo-icon">🅿️</span>  // Change emoji
```

## 📂 Project Structure

```
parkaror/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/             # Full page components
│   ├── services/          # Firebase & API services
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Helper functions
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # React entry point
│   └── index.css          # Global styles
├── index.html             # HTML entry point
├── package.json           # Dependencies
├── vite.config.js         # Vite configuration
└── README.md              # Project documentation
```

## 🛠️ Available Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Fix vulnerable packages
npm audit fix
```

## 📊 Mock Data

The app comes with built-in mock data for testing:

### Mock Parking Data
Located in `src/utils/helpers.js` - `generateMockParkings()`
- Downtown Parking (28.7041, 77.1025)
- Mall Parking (28.6139, 77.2090)
- Residential Complex (28.5721, 77.0986)

### Mock Users
Auto-created on OTP login with:
- Name: "John Doe"
- Phone: Your entered number
- Role: "driver" (toggle to "owner" in code)
- Trust Score: 50
- Verified: false

### Mock Bookings
Auto-created with mock data for testing dashboard.

## 🐛 Troubleshooting

### Issue: App not loading
```
Solution:
1. Check if dev server is running (npm run dev)
2. Visit http://localhost:5173 in browser
3. Check browser console for errors
4. Clear browser cache (Ctrl+Shift+Delete)
```

### Issue: Map not showing
```
Solution:
1. Check internet connection (OpenStreetMap needs internet)
2. Make sure Leaflet CSS is loaded
3. Check browser console for errors
4. Try refreshing page
```

### Issue: Firebasenotconnected
```
Solution:
1. Verify Firebase config in src/services/firebase.js
2. Check Firestore security rules allow read/write
3. Verify Firebase projectExists and isproperly configured
4. Check browser console for detailed error
```

### Issue: Geolocation not working
```
Solution:
1. App automatically defaults to Delhi coordinates
2. Check browser location permission popup
3. Allow location access if prompted
4. Visit site over HTTPS in production
5. Use mock coordinates for testing
```

## 🚀 Deployment

### Option 1: Firebase Hosting (Recommended)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Build app
npm run build

# Initialize Firebase
firebase init hosting

# Deploy
firebase deploy
```

### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Option 3: Netlify

```bash
# Connect to Netlify
# Drag and drop dist/ folder at https://app.netlify.com
```

## 🔐 Security Notes

### Development (OK)
- Mock data is fine
- Test mode Firebase is acceptable
- HTTP localhost is OK

### Production (Must Do)
1. **Never commit real Firebase config** to public repos
2. **Enable Firebase security rules**:
   ```
   match /users/{document=**} {
     allow read, write: if request.auth != null;
   }
   ```
3. **Use environment variables** for sensitive data
4. **Enable HTTPS** for all connections
5. **Implement rate limiting** for OTP
6. **Hash passwords** and sensitive data
7. **Enable CORS** only for your domain

## 💡 Tips

- Test on mobile browsers (responsiveness)
- Use browser DevTools for debugging
- Check Network tab if API calls fail
- Use Console tab for error details
- Try disabling browser extensions if issues arise

## 📚 Documentation

- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [Firebase](https://firebase.google.com/docs)
- [Leaflet](https://leafletjs.com)
- [React-Leaflet](https://react-leaflet.js.org)

## 🎯 Next Steps

1. ✅ Application structure is set up
2. ⭕ Configure Firebase (follow steps above)
3. ⭕ Customize colors and branding
4. ⭕ Add payment integration (Razorpay)
5. ⭕ Implement real push notifications
6. ⭕ Add user ratings system
7. ⭕ Deploy to production

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review browser console errors
3. Check Firebase console for data
4. Try clearing browser cache
5. Restart development server

## 🎉 You're All Set!

The app is ready to use and customize. Start building your parking empire! 🚗🅿️
