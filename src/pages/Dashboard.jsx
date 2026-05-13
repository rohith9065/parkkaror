import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/constants';
import { getRentalSpacesByOwnerId } from '../services/parkingService';
import { getAllLocalBookings } from '../services/bookingService';
import { normalizeDateTimeString } from '../utils/helpers';
import './Dashboard.css';

export default function Dashboard({ user, onBack, onNavigate, onLogout, onEditSpace }) {
  const [rentalSpaces, setRentalSpaces] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Extract numeric user ID
        let userId = user.id;
        console.log('📌 User ID raw:', user.id);
        if (typeof userId === 'string' && userId.includes('_')) {
          const numericId = parseInt(userId.split('_')[1], 10);
          if (!isNaN(numericId)) {
            userId = numericId;
          }
        }
        console.log('📌 User ID parsed:', userId);
        
        // Try backend first
        try {
          console.log(`🔍 Fetching dashboard data from: ${API_URL}/dashboard/${userId}`);
          const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
          const apiCall = axios.get(`${API_URL}/dashboard/${userId}`);
          const response = await Promise.race([apiCall, timeout]);
          console.log('✅ Dashboard response received:', response.data);
          const data = response.data;
          setRentalSpaces(data.parkings || []);
          console.log('✅ Parkings loaded:', data.parkings?.length || 0);
          
          const backendBookings = (data.bookings || []).map(b => ({
            ...b,
            parkingName: b.parkingName || 'Parking Space',
            price: b.total_price || b.price,
            timeSlot: normalizeDateTimeString(b.start_time || b.timeSlot),
            status: b.payment_status === 'paid' ? (b.status || 'confirmed') : 'pending_payment',
          }));
          setBookings(backendBookings);
          console.log('✅ Bookings loaded:', backendBookings.length);
          setEarnings(data.earnings || 0);
        } catch (err) {
          console.warn('⚠️ Backend error:', err.message);
          // Fallback: load bookings from localStorage that are for this owner's spaces
          const localBookings = getAllLocalBookings();
          const ownerSpaces = await getRentalSpacesByOwnerId(userId);
          const ownerSpaceIds = ownerSpaces.map(s => s.id);
          
          const ownerBookings = localBookings.filter(b => ownerSpaceIds.includes(b.parkingId));
          const mappedBookings = ownerBookings.map(b => {
            const space = ownerSpaces.find(s => s.id === b.parkingId);
            return {
              ...b,
              parkingName: space?.name || b.parkingName || 'Rental Space',
              price: b.price,
              timeSlot: b.timeSlot,
            };
          });
          
          setBookings(mappedBookings);
          const totalEarnings = mappedBookings
            .filter(b => b.status === 'completed' || b.status === 'confirmed' || b.status === 'active')
            .reduce((sum, b) => sum + (parseFloat(b.price) || 0), 0);
          setEarnings(totalEarnings);
        }
      } catch (error) {
        console.error("❌ Dashboard data fetch failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    let refreshTimer;
    if (user?.id) {
      fetchDashboardData();
      refreshTimer = setInterval(fetchDashboardData, 15000);
    }
    else setIsLoading(false);
    return () => {
      if (refreshTimer) clearInterval(refreshTimer);
    };
  }, [user]);

  useEffect(() => {
    const fetchOwnerRentalSpaces = async () => {
      if (!user?.id || user?.role !== 'owner') {
        setRentalSpaces([]);
        return;
      }

      try {
        // Extract numeric user ID
        let userId = user.id;
        if (typeof userId === 'string' && userId.includes('_')) {
          const numericId = parseInt(userId.split('_')[1], 10);
          if (!isNaN(numericId)) {
            userId = numericId;
          }
        }

        const spaces = await getRentalSpacesByOwnerId(userId);
        setRentalSpaces(spaces || []);
      } catch (error) {
        console.error('Rental spaces fetch failed:', error);
        setRentalSpaces([]);
      }
    };

    fetchOwnerRentalSpaces();
  }, [user]);

  const getAvailabilityConfig = (status) => {
    switch (status) {
      case 'available':
        return { label: 'Available', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '🟢' };
      case 'limited':
        return { label: 'Limited', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '🟡' };
      case 'unavailable':
        return { label: 'Unavailable', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: '🔴' };
      default:
        return { label: 'Available', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '🟢' };
    }
  };

  const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'active' || b.status === 'parked');
  const completedBookings = bookings.filter(b => b.status === 'completed');

  return (
    <div className="dashboard-screen fade-in">
      {/* Image Lightbox */}
      {selectedImage && (
        <div className="image-lightbox" onClick={() => setSelectedImage(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setSelectedImage(null)}>✕</button>
            <img src={selectedImage} alt="Space preview" />
          </div>
        </div>
      )}

      <div className="dashboard-header-premium glass">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="back-btn-circle" onClick={onBack}>←</button>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Owner Hub</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="scan-shortcut-btn" onClick={() => onNavigate('scanner')}>
            📷 Scan
          </button>
          <button 
            onClick={onLogout}
            style={{ 
              background: '#FEE2E2', 
              color: '#EF4444', 
              border: 'none', 
              padding: '8px 14px', 
              borderRadius: '20px', 
              fontSize: '13px', 
              fontWeight: '700',
              cursor: 'pointer' 
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-scrollview">          {/* UPI ID Warning */}
          {user?.role === 'owner' && (!user?.upi_id || user.upi_id.trim() === '') && (
            <div style={{
              margin: '0 16px 16px',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
              border: '1px solid #f59e0b',
              borderRadius: '12px',
              color: '#92400e',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span>Please set up your UPI ID in Settings to receive payments from bookings.</span>
              <button 
                onClick={() => onNavigate('ownerSettings')}
                style={{
                  marginLeft: 'auto',
                  background: '#f59e0b',
                  color: '#92400e',
                  border: 'none',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Set UPI ID
              </button>
            </div>
          )}
        <div className="dashboard-earnings-section">
          <div className="earnings-main-card gradient-secondary shadow-premium">
            <span className="card-label">Total Earnings</span>
            <div className="revenue-main">₹{earnings.toLocaleString()}</div>
            <div className="revenue-footer">
              <span className="revenue-trend">{bookings.length} total bookings</span>
            </div>
          </div>
          <div className="earnings-stats-row">
            <div className="mini-stat shadow-sm">
              <span className="mini-label">Active Bookings</span>
              <span className="mini-val">{activeBookings.length}</span>
            </div>
            <div className="mini-stat shadow-sm">
              <span className="mini-label">Completed</span>
              <span className="mini-val">{completedBookings.length}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-content-main">
          {user?.role === 'owner' && (
            <>
              <div className="section-header-premium">
                <h2>Owner Tools</h2>
              </div>
              <div className="owner-tools-grid">
                <button className="owner-tool-btn" onClick={() => onNavigate('ownerEarnings')}>
                  <span className="tool-icon">💰</span>
                  <span className="tool-label">Earnings</span>
                </button>
                <button className="owner-tool-btn" onClick={() => onNavigate('ownerSettings')}>
                  <span className="tool-icon">⚙️</span>
                  <span className="tool-label">Settings</span>
                </button>
                <button className="owner-tool-btn" onClick={() => onNavigate('scanner')}>
                  <span className="tool-icon">📱</span>
                  <span className="tool-label">Scanner</span>
                </button>
                <button className="owner-tool-btn" onClick={() => {
                  // Scroll to rental spaces section
                  const element = document.querySelector('.rental-spaces-grid');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}>
                  <span className="tool-icon">🏠</span>
                  <span className="tool-label">Manage Spaces</span>
                </button>
                <button className="owner-tool-btn highlight" onClick={() => onNavigate('addRentalSpace')}>
                  <span className="tool-icon">📷</span>
                  <span className="tool-label">Add Space</span>
                </button>
              </div>
            </>
          )}

          {/* Rental Spaces - Enhanced with prominent photos */}
          {user?.role === 'owner' && (
            <>
              <div className="section-header-premium">
                <h2>Your Rental Spaces</h2>
                <button 
                  className="btn-add-new-spot btn-add-rental"
                  onClick={() => user?.is_verified ? onNavigate('addRentalSpace') : onNavigate('kyc')}
                >
                  📷 Upload Space
                </button>
              </div>

              <div className="rental-spaces-grid">
                {rentalSpaces.length > 0 ? (
                  rentalSpaces.map((space) => {
                    const pricePerHour = space.system_price_per_hour || space.pricePerHour || 0;
                    const totalCapacity = space.total_slots || space.totalCapacity || 0;
                    const availStatus = space.availability_status || space.availability || 'available';
                    const availConfig = getAvailabilityConfig(availStatus);
                    const spaceBookings = bookings.filter(b => b.parkingId === space.id || b.parking_space_id === space.id);
                    return (
                      <div key={space.id} className="rental-card-premium shadow-sm" style={{ position: 'relative' }}>
                        <div className="rental-card-image-section">
                          {space.images && space.images.length > 0 ? (
                            <>
                              <img 
                                className="rental-card-hero-img" 
                                src={space.images[0]} 
                                alt={space.name}
                                onClick={() => setSelectedImage(space.images[0])}
                              />
                              {space.images.length > 1 && (
                                <div className="rental-card-image-count">
                                  📷 {space.images.length} photos
                                </div>
                              )}
                              {space.images.length > 1 && (
                                <div className="rental-card-thumbs">
                                  {space.images.slice(1, 4).map((img, idx) => (
                                    <img 
                                      key={idx} 
                                      src={img} 
                                      alt={`${space.name} ${idx + 2}`}
                                      className="rental-thumb-mini"
                                      onClick={() => setSelectedImage(img)}
                                    />
                                  ))}
                                  {space.images.length > 4 && (
                                    <div className="rental-thumb-more">
                                      +{space.images.length - 4}
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="rental-card-no-image">
                              <span>📷</span>
                              <span>No photos</span>
                            </div>
                          )}

                          {onEditSpace && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditSpace(space); }}
                              style={{
                                position: 'absolute', top: 8, right: 8, zIndex: 10,
                                background: 'rgba(0,0,0,0.65)', color: '#fff',
                                border: 'none', borderRadius: '12px',
                                padding: '5px 12px', fontSize: '12px',
                                fontWeight: '700', cursor: 'pointer',
                              }}
                            >
                              ✏️ Edit
                            </button>
                          )}
                          <div className="rental-price-badge">
                            ₹{pricePerHour}<span>/hr</span>
                          </div>

                          <div 
                            className="rental-avail-badge"
                            style={{ 
                              background: availConfig.bg,
                              color: availConfig.color,
                              borderColor: availConfig.color
                            }}
                          >
                            {availConfig.icon} {availConfig.label}
                          </div>
                        </div>

                        <div className="rental-card-info">
                          <div className="rental-card-title-row">
                            <span className="rental-card-name">{space.name}</span>
                          </div>
                          <span className="rental-card-addr">📍 {space.address}</span>
                          
                          <div className="rental-card-meta-row">
                            <div className="rental-meta-item">
                              <span className="meta-icon">🚗</span>
                              <span>{totalCapacity} slots</span>
                            </div>
                            <div className="rental-meta-item">
                              <span className="meta-icon">📅</span>
                              <span>{spaceBookings.length} bookings</span>
                            </div>
                            {space.amenities && space.amenities.length > 0 && (
                              <div className="rental-amenities-preview">
                                {space.amenities.slice(0, 2).map((a, i) => (
                                  <span key={i} className="amenity-tag">{a}</span>
                                ))}
                                {space.amenities.length > 2 && (
                                  <span className="amenity-tag more">+{space.amenities.length - 2}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-rental-card">
                    <div className="empty-rental-icon">📸</div>
                    <h3>No Rental Spaces Yet</h3>
                    <p>Take photos of your available parking space and upload them with price and availability details</p>
                    <button 
                      className="btn-upload-first" 
                      onClick={() => onNavigate('addRentalSpace')}
                    >
                      📷 Upload Your First Space
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="section-header-premium">
            <h2>Bookings</h2>
            <span className="view-all-link" onClick={() => onNavigate('bookings')}>View all</span>
          </div>

          <div className="recent-dashboard-bookings">
            {bookings.length > 0 ? (
              bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="dash-booking-row">
                  <div className="dash-booking-info">
                    <span className="db-name">{booking.parkingName}</span>
                    <span className="db-time">
                      {booking.timeSlot ? new Date(booking.timeSlot).toLocaleString('en-IN', { 
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                      }) : 'N/A'}
                    </span>
                  </div>
                  <div className={`db-status status-${booking.status}`}>
                    {booking.status}
                  </div>
                  <div className="db-price">₹{booking.price}</div>
                </div>
              ))
            ) : (
              <p className="no-bookings-dash">No bookings yet. Spaces will appear here when drivers book.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
