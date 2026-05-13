import React, { useState } from 'react';
import './ListParking.css';

export default function ListParking({ onBack, onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    timeSlotDuration: '1',
    totalSlots: '',
    images: []
  });

  const [locationStatus, setLocationStatus] = useState('');

  const handleGetLocation = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation not supported');
      return;
    }

    setLocationStatus('Locating...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocationStatus('Location pinned ✓');
      },
      () => setLocationStatus('Failed to get location')
    );
  };

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    const imageUrls = await Promise.all(files.map(fileToDataUrl));
    setFormData(prev => ({ ...prev, images: [...prev.images, ...imageUrls] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.name && formData.address && formData.totalSlots) {
      onSubmit(formData);
    }
  };

  return (
    <div className="list-parking-screen fade-in">
      <div className="list-parking-header-premium glass shadow-sm">
        <button className="back-btn-circle" onClick={onBack}>←</button>
        <h1>List Your Space</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="list-parking-scrollview">
        <div className="list-intro">
          <h2>Earn with ParkKaror</h2>
          <p>Provide accurate details to help drivers find your spot easily.</p>
        </div>

        <form onSubmit={handleSubmit} className="list-parking-form-premium">
          <div className="list-section-card shadow-sm">
            <h3>Spot Information</h3>
            <div className="form-group-premium">
              <label>PARKING NAME</label>
              <input
                type="text"
                placeholder="e.g. My Home Garage"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group-premium">
              <label>FULL ADDRESS</label>
              <textarea
                placeholder="Complete address with locality"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="form-group-premium">
              <label>PARKING IMAGES (OPTIONAL)</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                style={{marginBottom: '10px'}}
              />
              {formData.images.length > 0 && (
                <div style={{display: 'flex', gap: '8px', overflowX: 'auto', marginTop: '10px'}}>
                  {formData.images.map((img, i) => (
                    <img key={i} src={img} alt="parking preview" style={{width: 60, height: 60, objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)'}} />
                  ))}
                </div>
              )}
            </div>

            <button type="button" className="btn-location-premium" onClick={handleGetLocation}>
              <span className="loc-icon">📍</span>
              {locationStatus || 'Fetch Current Coordinates'}
            </button>
          </div>

          <div className="list-section-card shadow-sm">
            <h3>Availability & Slots</h3>
            <div className="form-row">
              <div className="form-group-premium">
                <label>TOTAL SLOTS</label>
                <input
                  type="number"
                  placeholder="e.g. 5"
                  value={formData.totalSlots}
                  onChange={(e) => setFormData({ ...formData, totalSlots: e.target.value })}
                  required
                />
              </div>
              <div className="form-group-premium">
                <label>SLOT DURATION</label>
                <select
                  value={formData.timeSlotDuration}
                  onChange={(e) => setFormData({ ...formData, timeSlotDuration: e.target.value })}
                >
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="4">4 Hours</option>
                </select>
              </div>
            </div>
          </div>

          <div className="system-notice-card">
            <span className="info-badge">Smart Logic</span>
            <p>Our algorithm automatically calculates the best hourly rate based on your location and demand.</p>
          </div>

          <button type="submit" className="btn-auth-primary gradient-primary">
            Submit Listing
          </button>
          
          <div style={{ height: 40 }} />
        </form>
      </div>
    </div>
  );
}
