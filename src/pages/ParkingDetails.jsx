import React, { useState, useEffect } from 'react';
import { generateTimeSlotsForSpace } from '../utils/helpers';
import { API_URL } from '../utils/constants';
import './ParkingDetails.css';

export default function ParkingDetails({ parking, onBook, onBack }) {
  const [selectedTime, setSelectedTime] = useState(null);
  const [duration, setDuration] = useState(1);
  const [errors, setErrors] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  const isRental = parking?.source === 'rental';
  const minDuration = parseInt(parking?.minDuration || parking?.min_duration_hours || 1, 10);
  const maxDuration = parseInt(parking?.maxDuration || parking?.max_duration_hours || 24, 10);
  const totalCapacity = parseInt(parking?.totalCapacity || parking?.total_slots || 1, 10);
  const pricePerHour = parseFloat(parking?.pricePerHour || parking?.system_price_per_hour || 0);
  const openTime = parking?.open_time || '06:00';
  const closeTime = parking?.close_time || '22:00';
  const alwaysOpen = parking?.always_open === true || parking?.always_open === 1 || parking?.always_open === '1';

  // Clamp initial duration to space limits
  useEffect(() => {
    setDuration(minDuration);
  }, [minDuration]);

  // Fetch real booked slots from backend
  useEffect(() => {
    if (!parking) { setSlotsLoading(false); return; }

    const parkingId = parseInt(parking.id, 10);

    if (isNaN(parkingId)) {
      // Local parking fallback uses the owner's configured hours when available.
      setSlots(generateTimeSlotsForSpace([], totalCapacity, openTime, closeTime, alwaysOpen));
      setSlotsLoading(false);
      return;
    }

    fetch(`${API_URL}/parking/${parkingId}/slots`)
      .then(r => r.ok ? r.json() : Promise.reject('not found'))
      .then(data => {
        setSlots(generateTimeSlotsForSpace(
          data.bookings || [],
          data.totalSlots || totalCapacity,
          data.openTime || openTime,
          data.closeTime || closeTime,
          data.alwaysOpen === true || data.alwaysOpen === 1 || data.alwaysOpen === '1'
        ));
      })
      .catch(() => {
        setSlots(generateTimeSlotsForSpace([], totalCapacity, openTime, closeTime, alwaysOpen));
      })
      .finally(() => setSlotsLoading(false));
  }, [parking, totalCapacity, openTime, closeTime, alwaysOpen]);

  const handleBook = () => {
    if (!selectedTime) {
      setErrors('Please select a time slot');
      return;
    }
    onBook({
      parkingId: parking.id,
      parkingName: parking.name,
      address: parking.address,
      timeSlot: selectedTime,
      durationHours: duration,
      price: pricePerHour * duration,
    });
  };

  if (!parking) return null;

  const availStatus = parking.availability_status || parking.availability || 'available';
  const totalPrice = pricePerHour * duration;

  // Show today vs tomorrow label
  const todayStr = new Date().toDateString();
  const tomorrowStr = new Date(Date.now() + 86400000).toDateString();
  let lastDayLabel = '';

  return (
    <div className="parking-details-screen fade-in">
      <div className="details-header-premium glass">
        <button className="back-btn-circle" onClick={onBack}>←</button>
        <h1>Details</h1>
        <button className="share-btn">🔗</button>
      </div>

      <div className="details-scrollview">
        {/* Hero Image */}
        <div
          className="details-hero"
          style={isRental && parking.images?.[0]
            ? { backgroundImage: `url(${parking.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : {}}
        >
          <div className="hero-image-overlay" />
          <div className="hero-parking-label">
            <span className={`badge-available ${availStatus === 'limited' ? 'limited' : availStatus === 'unavailable' ? 'unavailable' : ''}`}>
              {availStatus === 'available' ? '● Available Now' : availStatus === 'limited' ? '● Limited Slots' : '● Unavailable'}
            </span>
            {isRental && <span className="badge-rental">📷 Owner Space</span>}
          </div>
        </div>

        {/* Photo gallery */}
        {isRental && parking.images && parking.images.length > 1 && (
          <div className="detail-photos-scroll">
            {parking.images.map((img, idx) => (
              <img key={idx} src={img} alt={`Space ${idx + 1}`} className="detail-photo-thumb" />
            ))}
          </div>
        )}

        <div className="details-main-content">
          <div className="details-title-row">
            <div>
              <h2 className="details-name">{parking.name}</h2>
              <p className="details-address">📍 {parking.address}</p>
            </div>
            <div className="details-rating-box shadow-sm">
              <span className="star">★</span>
              <span className="rating-val">{parking.rating || '4.8'}</span>
            </div>
          </div>

          {/* Features/Amenities */}
          <div className="features-horizontal-scroll">
            {isRental && parking.amenities && parking.amenities.length > 0 ? (
              parking.amenities.map((amenity, idx) => (
                <div key={idx} className="feature-chip">
                  <span className="feature-icon">✓</span>
                  <span>{amenity}</span>
                </div>
              ))
            ) : (
              <>
                <div className="feature-chip"><span className="feature-icon">📹</span><span>CCTV</span></div>
                <div className="feature-chip"><span className="feature-icon">🛡️</span><span>Secure</span></div>
                <div className="feature-chip"><span className="feature-icon">🚗</span><span>Covered</span></div>
                <div className="feature-chip"><span className="feature-icon">⚡</span><span>EV Charging</span></div>
              </>
            )}
          </div>

          <div className="details-description-section">
            <h3 className="section-title">About this spot</h3>
            <p className="description-text">
              {parking.description || 'Premium parking space with high-end security and easy access. Located in a prime area with 24/7 surveillance.'}
            </p>
          </div>

          {/* Capacity info */}
          {isRental && (
            <div className="rental-capacity-info">
              <div className="capacity-item">
                <span className="cap-label">Total Slots</span>
                <span className="cap-value">{totalCapacity}</span>
              </div>
              <div className="capacity-item">
                <span className="cap-label">Min Duration</span>
                <span className="cap-value">{minDuration}h</span>
              </div>
              <div className="capacity-item">
                <span className="cap-label">Max Duration</span>
                <span className="cap-value">{maxDuration}h</span>
              </div>
            </div>
          )}

          {/* Duration Selector */}
          <div style={{ margin: '16px 0 4px' }}>
            <h3 className="section-title" style={{ marginBottom: '10px' }}>How long will you park?</h3>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 6, 8, 12, 24]
                .filter(h => h >= minDuration && h <= maxDuration)
                .map(h => (
                  <button
                    key={h}
                    onClick={() => setDuration(h)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '20px',
                      border: `2px solid ${duration === h ? '#7C3AED' : '#e5e7eb'}`,
                      background: duration === h ? '#7C3AED' : '#fff',
                      color: duration === h ? '#fff' : '#374151',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {h}h — ₹{pricePerHour * h}
                  </button>
                ))}
            </div>
          </div>

          {/* Time Slot Picker */}
          <div className="time-picker-section">
            <div className="section-header-inline">
              <h3 className="section-title">Select Entry Time</h3>
            </div>

            {slotsLoading ? (
              <p style={{ color: '#6b7280', fontSize: '13px', padding: '12px 0' }}>Loading available slots...</p>
            ) : (
              <div className="time-grid-premium">
                {slots.slice(0, 14).map((slot, idx) => {
                  const slotDate = new Date(slot.time).toDateString();
                  let dayLabel = null;
                  if (slotDate !== lastDayLabel) {
                    lastDayLabel = slotDate;
                    dayLabel = slotDate === todayStr ? 'Today' : slotDate === tomorrowStr ? 'Tomorrow' : slotDate;
                  }
                  return (
                    <React.Fragment key={idx}>
                      {dayLabel && (
                        <div style={{
                          width: '100%', fontSize: '11px', fontWeight: '800',
                          color: '#7C3AED', textTransform: 'uppercase',
                          letterSpacing: '1px', padding: '8px 0 4px',
                          flexBasis: '100%',
                        }}>
                          {dayLabel}
                        </div>
                      )}
                      <button
                        className={`time-chip ${selectedTime === slot.time ? 'selected' : ''} ${slot.isBooked ? 'disabled' : ''}`}
                        onClick={() => !slot.isBooked && setSelectedTime(slot.time)}
                        disabled={slot.isBooked}
                        style={slot.isBooked ? { opacity: 0.5, cursor: 'not-allowed', fontSize: '11px' } : {}}
                      >
                        <div>{new Date(slot.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                        {slot.isBooked
                          ? <div style={{ fontSize: '9px', color: '#ef4444', fontWeight: '700' }}>BOOKED</div>
                          : totalCapacity > 1
                            ? <div style={{ fontSize: '9px', color: '#10b981', fontWeight: '600' }}>{slot.availableCount} left</div>
                            : null}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            )}
            {errors && <p className="error-message-small">{errors}</p>}
          </div>

          <div style={{ height: '120px' }} />
        </div>
      </div>

      <div className="sticky-booking-bar glass">
        <div className="price-summary">
          <span className="price-label">₹{pricePerHour}/hr × {duration}h</span>
          <span className="price-amount">₹{totalPrice}</span>
        </div>
        <button
          className="btn-book-now gradient-primary"
          onClick={handleBook}
          disabled={availStatus === 'unavailable'}
        >
          {availStatus === 'unavailable' ? 'Unavailable' : 'Book & Get QR Code'}
        </button>
      </div>
    </div>
  );
}
