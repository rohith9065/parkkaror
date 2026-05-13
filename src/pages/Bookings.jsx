import React, { useState, useEffect } from 'react';
import { getBookingsByUserId, submitReview } from '../services/bookingService';
import ReviewForm from '../components/ReviewForm';
import './Bookings.css';

export default function Bookings({ user, onBack, onViewTicket }) {
  const [activeTab, setActiveTab] = useState('active');
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reviewingBooking, setReviewingBooking] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        if (user?.id) {
          const userBookings = await getBookingsByUserId(user.id);
          // Also load rental space names for display
          let rentalSpaces = [];
          try {
            rentalSpaces = JSON.parse(localStorage.getItem('parkaror_rental_spaces') || '[]');
          } catch {}

          const enriched = userBookings.map(b => {
            const space = rentalSpaces.find(s => s.id === b.parkingId);
            return {
              ...b,
              parkingName: b.parkingName || space?.name || 'Parking Space',
              address: b.address || space?.address || 'Location',
            };
          });
          setBookings(enriched);
        }
      } catch (error) {
        console.error('Error loading bookings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBookings();
  }, [user]);

  const filteredBookings = bookings.filter(b => 
    activeTab === 'active' 
      ? (b.status === 'confirmed' || b.status === 'booked' || b.status === 'active' || b.status === 'parked' || b.status === 'pending_payment') 
      : b.status === 'completed'
  );

  return (
    <div className="bookings-screen fade-in">
      <div className="bookings-header-premium glass shadow-sm">
        <button className="back-btn-circle" onClick={onBack}>←</button>
        <h1>My Bookings</h1>
      </div>

      <div className="bookings-tabs shadow-sm">
        <button 
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Upcoming ({bookings.filter(b => b.status === 'confirmed' || b.status === 'booked' || b.status === 'active' || b.status === 'parked' || b.status === 'pending_payment').length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          History ({bookings.filter(b => b.status === 'completed').length})
        </button>
      </div>

      <div className="bookings-scrollview">
        {isLoading ? (
          <div className="empty-bookings">
            <p>Loading bookings...</p>
          </div>
        ) : filteredBookings.length > 0 ? (
          <div className="bookings-list-premium">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="booking-card-premium">
                <div className="booking-card-header">
                  <div className="booking-card-title">
                    <span className="parking-icon-small">🅿️</span>
                    <h3>{booking.parkingName}</h3>
                  </div>
                  <span className={`status-badge status-${booking.status}`}>
                    {booking.status}
                  </span>
                </div>

                <div className="booking-card-body">
                  <div className="booking-info-item">
                    <span className="info-label">📍 ADDRESS</span>
                    <span className="info-value text-truncate">{booking.address}</span>
                  </div>
                  <div className="booking-info-row">
                    <div className="booking-info-item">
                      <span className="info-label">🕒 TIME</span>
                      <span className="info-value">
                        {booking.timeSlot ? new Date(booking.timeSlot).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                      </span>
                    </div>
                    <div className="booking-info-item">
                      <span className="info-label">💰 PRICE</span>
                      <span className="info-value">₹{booking.price}</span>
                    </div>
                  </div>
                </div>

                <div className="booking-card-footer">
                  {(booking.status === 'confirmed' || booking.status === 'booked' || booking.status === 'active' || booking.status === 'parked') ? (
                    <button
                      className="btn-view-ticket gradient-primary"
                      onClick={() => onViewTicket(booking)}
                    >
                      Show QR Entry Pass
                    </button>
                  ) : (
                    <button className="btn-rebook" onClick={() => onBack()}>
                      Book Again
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-bookings">
            <div className="empty-icon">📅</div>
            <h3>No {activeTab === 'active' ? 'upcoming' : 'past'} bookings</h3>
            <p>Your parking history will appear here.</p>
            <button className="btn-start-exploring gradient-primary" onClick={onBack}>
              Explore Nearby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
