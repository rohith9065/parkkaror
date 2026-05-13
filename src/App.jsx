import React, { useState, useEffect } from 'react';
import Splash from './pages/Splash';
import Auth from './pages/Auth';
import OTP from './pages/OTP';
import Home from './pages/Home';
import ParkingDetails from './pages/ParkingDetails';
import Ticket from './pages/Ticket';
import Scanner from './pages/Scanner';
import Profile from './pages/Profile';
import KYC from './pages/KYC';
import Dashboard from './pages/Dashboard';
import ListParking from './pages/ListParking';
import AddRentalSpace from './pages/AddRentalSpace';
import AccessSpace from './pages/AccessSpace';
import Report from './pages/Report';
import Bookings from './pages/Bookings';
import Payments from './pages/Payments';
import OwnerEarnings from './pages/OwnerEarnings';
import OwnerSettings from './pages/OwnerSettings';
import EditRentalSpace from './pages/EditRentalSpace';
import PaymentScreen from './components/PaymentScreen';

import { createBooking } from './services/bookingService';
import { API_URL } from './utils/constants';
import axios from 'axios';
import { sendPhoneOtp, verifyPhoneOtp } from './services/firebase';

function App() {
  const [appState, setAppState] = useState('splash');
  const [user, setUser] = useState(null);
  const [phone, setPhone] = useState('');
  const [loginRole, setLoginRole] = useState('driver');
  const [selectedParking, setSelectedParking] = useState(null);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [accessingSpaceBooking, setAccessingSpaceBooking] = useState(null);
  const [selectedSpace, setSelectedSpace] = useState(null);

  const handlePhoneSubmit = async (phoneNumber, role) => {
    setPhone(phoneNumber);
    setLoginRole(role);
    await sendPhoneOtp(phoneNumber, { role });
    setAppState('otp');
  };

  const handleOTPVerify = async (otpCode) => {
    const role = loginRole === 'owner' ? 'owner' : 'driver';
    const postLoginState = role === 'owner' ? 'dashboard' : 'home';
    const formattedPhone = `+91${phone}`;

    try {
      console.log(`🔐 Verifying OTP: phone=${formattedPhone}, role=${role}`);
      await verifyPhoneOtp(phone, otpCode);
    } catch (otpError) {
      throw otpError;
    }

    try {
      const response = await axios.get(`${API_URL}/users/${phone}`);
      if (response.data) {
        console.log(`✅ User found with ID: ${response.data.id}`);
        setUser({ ...response.data, role });
        setAppState(postLoginState);
        return;
      }

      throw new Error('User record not found');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        try {
          const createResponse = await axios.post(`${API_URL}/users/register`, {
            phone_number: phone,
            full_name: phone,
            address: '',
            document_url: '',
            role,
          });
          setUser({ ...createResponse.data.user, role });
          setAppState(postLoginState);
        } catch (createError) {
          console.error('Could not create user:', createError);
          alert('Could not create your account. Please try again.');
        }
      } else {
        console.error('Backend user lookup failed:', error);
        alert(error.message || 'Backend is not reachable. Please start the server and try again.');
      }
    }
  };

  const handleResendOtp = async () => {
    await sendPhoneOtp(phone, { role: loginRole });
  };

  const handleSelectParking = (parking) => {
    setSelectedParking(parking);
    setAppState('parkingDetails');
  };

  const handleBookParking = async (bookingData) => {
    try {
      const response = await createBooking({
        ...bookingData,
        userId: user.id
      });

      const booking = {
        id: response.bookingId,
        userId: user.id,
        parkingId: bookingData.parkingId,
        parkingName: bookingData.parkingName || selectedParking?.name || 'Selected Parking',
        address: bookingData.address || selectedParking?.address || 'Location Area',
        timeSlot: bookingData.timeSlot,
        durationHours: bookingData.durationHours,
        price: bookingData.price,
        status: 'pending_payment', // Explicitly set status
        qrCode: null, // Explicitly set to null - will be set after payment confirmation
        verificationCode: null
      };
      setCurrentBooking(booking);
      setAppState('payment');
    } catch (error) {
      console.error('Booking failed:', error);
      alert(error.message || 'Could not create booking. Please try again.');
    }
  };

  const handlePaymentSuccess = (qrCode, verificationCode) => {
    // Update booking with QR code
    setCurrentBooking(prev => ({
      ...prev,
      status: 'booked',
      qrCode: qrCode,
      verificationCode: verificationCode || prev?.verificationCode || null
    }));
    setAppState('ticket');
  };

  const handleNavigate = (page) => {
    setAppState(page);
  };

  const handleEditSpace = (space) => {
    setSelectedSpace(space);
    setAppState('editRentalSpace');
  };

  const handleLogout = () => {
    setUser(null);
    setLoginRole('driver');
    setAppState('auth');
  };

  const handleViewTicket = (booking) => {
    setCurrentBooking(booking);
    setAppState('ticket');
  };

  const componentMap = {
    splash: <Splash onComplete={() => setAppState('auth')} />,
    auth: <Auth onPhoneSubmit={handlePhoneSubmit} />,
    otp: <OTP phone={phone} onOTPVerify={handleOTPVerify} onResend={handleResendOtp} />,
    home: <Home user={user} onSelectParking={handleSelectParking} onNavigate={handleNavigate} />,
    parkingDetails: <ParkingDetails parking={selectedParking} onBook={handleBookParking} onBack={() => setAppState('home')} />,
    payment: <PaymentScreen
      booking={currentBooking}
      parking={selectedParking}
      user={user}
      onPaymentSuccess={handlePaymentSuccess}
      onBack={() => setAppState('parkingDetails')}
    />,
    ticket: <Ticket 
      booking={currentBooking} 
      parking={selectedParking} 
      onScan={() => setAppState('scanner')} 
      onBack={() => setAppState('home')}
      onAccessSpace={() => {
        setAccessingSpaceBooking(currentBooking);
        setAppState('accessSpace');
      }}
    />,
    scanner: <Scanner onBack={() => setAppState('home')} />,
    profile: <Profile user={user} onLogout={handleLogout} onNavigate={handleNavigate} />,
    kyc: <KYC user={user} onComplete={u => { setUser(u); setAppState('profile'); }} onBack={() => setAppState('profile')} />,
    dashboard: user?.role === 'owner'
      ? <Dashboard user={user} onBack={() => setAppState('home')} onNavigate={handleNavigate} onLogout={handleLogout} onEditSpace={handleEditSpace} />
      : <Home user={user} onSelectParking={handleSelectParking} onNavigate={handleNavigate} onLogout={handleLogout} />,
    report: <Report onBack={() => setAppState('profile')} onSubmit={() => {}} />,
    bookings: <Bookings user={user} onBack={() => setAppState('home')} onViewTicket={handleViewTicket} />,
    payments: <Payments user={user} onBack={() => setAppState('profile')} />,
    ownerEarnings: <OwnerEarnings user={user} onBack={() => setAppState('dashboard')} />,
    ownerSettings: <OwnerSettings user={user} onBack={() => setAppState('dashboard')} />,
    listParking: (
      <ListParking 
        onBack={() => setAppState('dashboard')} 
        onSubmit={async (data) => {
          try {
            await axios.post(`${API_URL}/parking/list`, { ...data, owner_id: user.id });
            setAppState('dashboard');
          } catch (e) {
            setAppState('dashboard'); // Fallback for success in demo
          }
        }} 
      />
    ),
    addRentalSpace: (
      <AddRentalSpace 
        user={user}
        onBack={() => setAppState('dashboard')}
        onSuccess={(msg) => {
          alert(msg);
          setAppState('dashboard');
        }}
      />
    ),
    editRentalSpace: selectedSpace ? (
      <EditRentalSpace
        space={selectedSpace}
        user={user}
        onBack={() => setAppState('dashboard')}
        onSuccess={(msg) => {
          alert(msg);
          setSelectedSpace(null);
          setAppState('dashboard');
        }}
      />
    ) : null,
    accessSpace: (
      <AccessSpace 
        booking={accessingSpaceBooking}
        parking={selectedParking}
        user={user}
        onBack={() => setAppState('home')}
      />
    )
  };

  return (
    <div className="app-container">
      {componentMap[appState] || componentMap.splash}
    </div>
  );
}

export default App;
