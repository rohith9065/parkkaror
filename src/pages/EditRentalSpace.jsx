import React, { useState } from 'react';
import { API_URL } from '../utils/constants';
import './AddRentalSpace.css';

export default function EditRentalSpace({ space, user, onBack, onSuccess }) {
  const amenitiesList = ['CCTV', '24/7 Security', 'EV Charging', 'Covered', 'Lighting', 'Water Supply'];
  const featuresList = ['Gated', 'Wheelchair Access', 'Monthly Discount', 'Insurance'];

  const [formData, setFormData] = useState({
    name: space.name || '',
    description: space.description || '',
    address: space.address || '',
    latitude: space.latitude || '',
    longitude: space.longitude || '',
    pricePerHour: space.system_price_per_hour || space.pricePerHour || '',
    availability: space.availability_status || space.availability || 'available',
    maxDuration: space.max_duration_hours || space.maxDuration || '24',
    minDuration: space.min_duration_hours || space.minDuration || '1',
    totalCapacity: space.total_slots || space.totalCapacity || '',
    upiId: user?.upi_id || space.upi_id || '',
    amenities: Array.isArray(space.amenities) ? space.amenities : [],
    features: Array.isArray(space.features) ? space.features : [],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');

  const handleAmenityToggle = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleFeatureToggle = (feature) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.address || !formData.pricePerHour) {
      setError('Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      let ownerId = user.id;
      if (typeof ownerId === 'string' && ownerId.includes('_')) {
        const n = parseInt(ownerId.split('_')[1], 10);
        if (!isNaN(n)) ownerId = n;
      }

      const response = await fetch(`${API_URL}/parking/${space.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          address: formData.address,
          latitude: formData.latitude,
          longitude: formData.longitude,
          price_per_hour: parseFloat(formData.pricePerHour),
          availability_status: formData.availability,
          total_slots: parseInt(formData.totalCapacity, 10) || 1,
          min_duration: parseInt(formData.minDuration, 10) || 1,
          max_duration: parseInt(formData.maxDuration, 10) || 24,
          amenities: formData.amenities,
          features: formData.features,
          upi_id: formData.upiId.trim(),
          owner_id: ownerId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.details || err.error || 'Update failed');
      }

      if (onSuccess) onSuccess('Space updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update space');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-rental-space-screen fade-in">
      <div className="rental-header-premium glass shadow-sm">
        <button className="back-btn-circle" onClick={onBack}>←</button>
        <h1>Edit Space</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="rental-scrollview">
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="rental-form-premium">
          <div className="step-content fade-in">

            <div className="rental-section-card shadow-sm">
              <h3>📍 Basic Information</h3>

              <div className="form-group-premium">
                <label>SPACE NAME *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group-premium">
                <label>DESCRIPTION</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  rows="3"
                />
              </div>

              <div className="form-group-premium">
                <label>ADDRESS *</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>

              <button
                type="button"
                className="btn-location-get"
                onClick={() => {
                  if (navigator.geolocation) {
                    setLocationStatus('Getting location...');
                    navigator.geolocation.getCurrentPosition(
                      pos => {
                        setFormData(prev => ({
                          ...prev,
                          latitude: pos.coords.latitude,
                          longitude: pos.coords.longitude,
                        }));
                        setLocationStatus('Location updated ✓');
                      },
                      () => setLocationStatus('Could not get location')
                    );
                  }
                }}
              >
                📍 {locationStatus || 'Update Location'}
              </button>
            </div>

            <div className="rental-section-card shadow-sm pricing-card">
              <h3>💰 Pricing & Capacity</h3>

              <div className="price-input-hero">
                <label>PRICE PER HOUR</label>
                <div className="price-input-wrap">
                  <span className="currency-symbol">₹</span>
                  <input
                    type="number"
                    value={formData.pricePerHour}
                    onChange={e => setFormData({ ...formData, pricePerHour: e.target.value })}
                    className="price-hero-input"
                    required
                  />
                  <span className="per-hour-label">/hr</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group-premium">
                  <label>TOTAL CAPACITY</label>
                  <input
                    type="number"
                    value={formData.totalCapacity}
                    onChange={e => setFormData({ ...formData, totalCapacity: e.target.value })}
                  />
                </div>
                <div className="form-group-premium">
                  <label>MIN DURATION (hrs)</label>
                  <input
                    type="number"
                    value={formData.minDuration}
                    onChange={e => setFormData({ ...formData, minDuration: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-premium">
                <label>MAX DURATION (hrs)</label>
                <input
                  type="number"
                  value={formData.maxDuration}
                  onChange={e => setFormData({ ...formData, maxDuration: e.target.value })}
                />
              </div>

              <div className="form-group-premium">
                <label>UPI ID (TO RECEIVE PAYMENTS)</label>
                <input
                  type="text"
                  placeholder="yourname@upi"
                  value={formData.upiId}
                  onChange={e => setFormData({ ...formData, upiId: e.target.value })}
                />
                <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                  Drivers will pay to this UPI ID when booking your space
                </small>
              </div>

              <div className="availability-selector">
                <label>AVAILABILITY STATUS</label>
                <div className="availability-options">
                  {[
                    { value: 'available', label: 'Available', icon: '🟢', color: '#10B981' },
                    { value: 'limited', label: 'Limited', icon: '🟡', color: '#F59E0B' },
                    { value: 'unavailable', label: 'Unavailable', icon: '🔴', color: '#EF4444' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`avail-option ${formData.availability === opt.value ? 'selected' : ''}`}
                      style={{ '--avail-color': opt.color }}
                      onClick={() => setFormData({ ...formData, availability: opt.value })}
                    >
                      <span className="avail-icon">{opt.icon}</span>
                      <span className="avail-label">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rental-section-card shadow-sm">
              <h3>🎁 Amenities</h3>
              <div className="amenities-grid">
                {amenitiesList.map(amenity => (
                  <div
                    key={amenity}
                    className={`amenity-chip ${formData.amenities.includes(amenity) ? 'selected' : ''}`}
                    onClick={() => handleAmenityToggle(amenity)}
                  >
                    <span className="chip-check">{formData.amenities.includes(amenity) ? '✓' : '+'}</span>
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rental-section-card shadow-sm">
              <h3>✨ Special Features</h3>
              <div className="features-grid">
                {featuresList.map(feature => (
                  <div
                    key={feature}
                    className={`feature-chip ${formData.features.includes(feature) ? 'selected' : ''}`}
                    onClick={() => handleFeatureToggle(feature)}
                  >
                    <span className="chip-check">{formData.features.includes(feature) ? '✓' : '+'}</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="step-nav-btn submit-final-btn"
              disabled={isSubmitting}
              style={{ margin: '0 0 40px 0' }}
            >
              {isSubmitting ? '⏳ Saving...' : '✅ Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
