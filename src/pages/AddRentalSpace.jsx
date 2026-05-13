import React, { useState, useRef } from 'react';
import { addRentalSpace } from '../services/parkingService';
import './AddRentalSpace.css';

export default function AddRentalSpace({ user, onBack, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    latitude: '',
    longitude: '',
    pricePerHour: '',
    availability: 'available',
    maxDuration: '24',
    minDuration: '1',
    totalCapacity: '',
    upiId: user?.upi_id || '',
    amenities: [],
    features: [],
    images: []
  });

  const [locationStatus, setLocationStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [activeStep, setActiveStep] = useState(1);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const amenitiesList = ['CCTV', '24/7 Security', 'EV Charging', 'Covered', 'Lighting', 'Water Supply'];
  const featuresList = ['Gated', 'Wheelchair Access', 'Monthly Discount', 'Insurance'];

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Compress image aggressively
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set smaller max dimensions for better compression
        const maxWidth = 600;
        const maxHeight = 450;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress as JPEG with 0.5 quality (more aggressive compression)
        const compressed = canvas.toDataURL('image/jpeg', 0.5);
        console.log(`📸 Image compressed: ${(file.size / 1024).toFixed(2)}KB → ${(compressed.length / 1024).toFixed(2)}KB`);
        resolve(compressed);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

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

  const handleAmenityToggle = (amenity) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const handleFeatureToggle = (feature) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }));
  };

  const handleCameraCapture = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      const imageDataUrls = await Promise.all(files.map(fileToDataUrl));
      setFormData(prev => ({ ...prev, images: [...prev.images, ...imageDataUrls] }));
    } catch (err) {
      setError('Could not capture photo. Please try again.');
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    try {
      const imageDataUrls = await Promise.all(files.map(fileToDataUrl));
      setFormData(prev => ({ ...prev, images: [...prev.images, ...imageDataUrls] }));
    } catch (err) {
      setError('Could not upload selected image(s). Please try again.');
    }
  };

  const handleRemoveImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.address || !formData.pricePerHour || !formData.totalCapacity) {
      setError('Please fill all required fields');
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      setError('Please set location');
      return;
    }

    if (!formData.upiId || !formData.upiId.trim()) {
      setError('Please enter your UPI ID to receive payments');
      return;
    }

    if (formData.images.length === 0) {
      setError('Please add at least one photo of your space');
      return;
    }

    setIsSubmitting(true);
    try {
      // Ensure we have a numeric owner ID
      let ownerId = user.id;
      if (typeof ownerId === 'string' && ownerId.includes('_')) {
        // Extract numeric part or convert to a number
        const numericId = parseInt(ownerId.split('_')[1], 10);
        if (!isNaN(numericId)) {
          ownerId = numericId;
        } else {
          setError('Invalid user ID. Please log in again.');
          setIsSubmitting(false);
          return;
        }
      }

      const spaceData = {
        ...formData,
        ownerId: ownerId,
        ownerName: user.name,
        ownerPhone: user.phone_number || user.phone || '',
        upiId: formData.upiId.trim(),
        type: 'rental',
        createdAt: new Date().toISOString(),
      };

      console.log('📤 Submitting rental space data:', spaceData);
      await addRentalSpace(spaceData);
      console.log('✅ Rental space added successfully');
      
      setFormData({
        name: '',
        description: '',
        address: '',
        latitude: '',
        longitude: '',
        pricePerHour: '',
        availability: 'available',
        maxDuration: '24',
        minDuration: '1',
        totalCapacity: '',
        upiId: '',
        amenities: [],
        features: [],
        images: []
      });
      
      if (onSuccess) {
        onSuccess('Rental space added successfully!');
      }
    } catch (err) {
      console.error('❌ Error adding rental space:', err);
      setError(err.message || 'Failed to add rental space');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalSteps = 3;

  return (
    <div className="add-rental-space-screen fade-in">
      <div className="rental-header-premium glass shadow-sm">
        <button className="back-btn-circle" onClick={onBack}>←</button>
        <h1>Add Rental Space</h1>
        <div style={{ width: 40 }} />
      </div>

      {/* Step Indicator */}
      <div className="step-indicator-bar">
        {[1, 2, 3].map(step => (
          <div key={step} className="step-indicator-wrap">
            <div 
              className={`step-dot ${activeStep >= step ? 'active' : ''} ${activeStep === step ? 'current' : ''}`}
              onClick={() => setActiveStep(step)}
            >
              {step}
            </div>
            <span className="step-label">
              {step === 1 ? 'Photos' : step === 2 ? 'Details' : 'Extras'}
            </span>
          </div>
        ))}
        <div className="step-line" style={{ width: `${((activeStep - 1) / (totalSteps - 1)) * 100}%` }} />
      </div>

      <div className="rental-scrollview">
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="rental-form-premium">
          
          {/* STEP 1: Photos */}
          {activeStep === 1 && (
            <div className="step-content fade-in">
              <div className="rental-section-card shadow-sm photo-section">
                <h3>📸 Capture Your Space</h3>
                <p className="section-subtitle">Take clear photos of your parking space to attract drivers</p>
                
                {/* Camera & Gallery Buttons */}
                <div className="photo-action-buttons">
                  <button 
                    type="button" 
                    className="photo-action-btn camera-btn"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <span className="photo-btn-icon">📷</span>
                    <span className="photo-btn-text">Take Photo</span>
                    <span className="photo-btn-hint">Open camera</span>
                  </button>
                  
                  <button 
                    type="button" 
                    className="photo-action-btn gallery-btn"
                    onClick={() => galleryInputRef.current?.click()}
                  >
                    <span className="photo-btn-icon">🖼️</span>
                    <span className="photo-btn-text">Upload Photo</span>
                    <span className="photo-btn-hint">From gallery</span>
                  </button>
                </div>

                {/* Hidden file inputs */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  style={{ display: 'none' }}
                  id="camera-input"
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleGalleryUpload}
                  style={{ display: 'none' }}
                  id="gallery-input"
                />

                {/* Image Previews */}
                {formData.images.length > 0 ? (
                  <div className="photo-preview-section">
                    <div className="photo-count-badge">
                      {formData.images.length} photo{formData.images.length > 1 ? 's' : ''} added
                    </div>
                    <div className="image-preview-grid-enhanced">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="image-preview-card">
                          <img src={img} alt={`Space photo ${idx + 1}`} />
                          <button 
                            type="button" 
                            className="remove-image-btn"
                            onClick={() => handleRemoveImage(idx)}
                          >
                            ✕
                          </button>
                          {idx === 0 && <span className="primary-badge">Cover</span>}
                        </div>
                      ))}
                      <button 
                        type="button" 
                        className="add-more-photo-btn"
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <span>+</span>
                        <span className="add-more-text">Add More</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="empty-photos-placeholder">
                    <div className="empty-photo-icon">📸</div>
                    <p>No photos yet</p>
                    <span>Add photos to showcase your space</span>
                  </div>
                )}
              </div>

              <button 
                type="button" 
                className="step-nav-btn next-btn"
                onClick={() => {
                  if (formData.images.length === 0) {
                    setError('Please add at least one photo');
                    return;
                  }
                  setError('');
                  setActiveStep(2);
                }}
              >
                Continue to Details →
              </button>
            </div>
          )}

          {/* STEP 2: Details - Price, Availability, Location */}
          {activeStep === 2 && (
            <div className="step-content fade-in">
              {/* Basic Info */}
              <div className="rental-section-card shadow-sm">
                <h3>📍 Basic Information</h3>
                
                <div className="form-group-premium">
                  <label>SPACE NAME *</label>
                  <input
                    type="text"
                    placeholder="e.g. Downtown Luxury Parking"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group-premium">
                  <label>DESCRIPTION</label>
                  <textarea
                    placeholder="Describe your rental space..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows="3"
                  />
                </div>

                <div className="form-group-premium">
                  <label>ADDRESS *</label>
                  <input
                    type="text"
                    placeholder="Full address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                        (position) => {
                          setFormData(prev => ({
                            ...prev,
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                          }));
                          setLocationStatus('Coordinates mapped');
                        },
                        (error) => {
                          console.warn('Geolocation failed:', error);
                          setLocationStatus('Could not get location');
                        },
                        { timeout: 5000 }
                      );
                    } else {
                      setLocationStatus('Geolocation not supported');
                    }
                  }}
                >
                  📍 {locationStatus || 'Get Current Location'}
                </button>
              </div>

              {/* Pricing & Availability */}
              <div className="rental-section-card shadow-sm pricing-card">
                <h3>💰 Pricing & Availability</h3>
                
                <div className="price-input-hero">
                  <label>PRICE PER HOUR</label>
                  <div className="price-input-wrap">
                    <span className="currency-symbol">₹</span>
                    <input
                      type="number"
                      placeholder="50"
                      value={formData.pricePerHour}
                      onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                      className="price-hero-input"
                      required
                    />
                    <span className="per-hour-label">/hr</span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group-premium">
                    <label>TOTAL CAPACITY *</label>
                    <input
                      type="number"
                      placeholder="5"
                      value={formData.totalCapacity}
                      onChange={(e) => setFormData({ ...formData, totalCapacity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group-premium">
                    <label>MIN DURATION (hrs)</label>
                    <input
                      type="number"
                      placeholder="1"
                      value={formData.minDuration}
                      onChange={(e) => setFormData({ ...formData, minDuration: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group-premium">
                  <label>MAX DURATION (hrs)</label>
                  <input
                    type="number"
                    placeholder="24"
                    value={formData.maxDuration}
                    onChange={(e) => setFormData({ ...formData, maxDuration: e.target.value })}
                  />
                </div>

                {/* UPI ID for Payments */}
                <div className="form-group-premium">
                  <label>UPI ID (TO RECEIVE PAYMENTS) *</label>
                  <input
                    type="text"
                    placeholder="e.g. yourname@upi or 9876543210@paytm"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    required
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                    Drivers will pay to this UPI ID when booking your space
                  </small>
                </div>

                {/* Availability Toggle */}
                <div className="availability-selector">
                  <label>AVAILABILITY STATUS *</label>
                  <div className="availability-options">
                    {[
                      { value: 'available', label: 'Available', icon: '🟢', color: '#10B981' },
                      { value: 'limited', label: 'Limited', icon: '🟡', color: '#F59E0B' },
                      { value: 'unavailable', label: 'Unavailable', icon: '🔴', color: '#EF4444' }
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

              <div className="step-nav-row">
                <button 
                  type="button" 
                  className="step-nav-btn back-step-btn"
                  onClick={() => setActiveStep(1)}
                >
                  ← Photos
                </button>
                <button 
                  type="button" 
                  className="step-nav-btn next-btn"
                  onClick={() => {
                    if (!formData.name || !formData.address || !formData.pricePerHour || !formData.totalCapacity) {
                      setError('Please fill all required fields');
                      return;
                    }
                    if (!formData.latitude || !formData.longitude) {
                      setError('Please set your location');
                      return;
                    }
                    if (!formData.upiId || !formData.upiId.trim()) {
                      setError('Please enter your UPI ID to receive payments');
                      return;
                    }
                    setError('');
                    setActiveStep(3);
                  }}
                >
                  Extras →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Amenities & Features */}
          {activeStep === 3 && (
            <div className="step-content fade-in">
              {/* Preview Summary */}
              <div className="rental-section-card shadow-sm preview-summary-card">
                <h3>👁️ Preview</h3>
                <div className="preview-mini-card">
                  {formData.images[0] && (
                    <img src={formData.images[0]} alt="Preview" className="preview-mini-img" />
                  )}
                  <div className="preview-mini-info">
                    <span className="preview-mini-name">{formData.name || 'Unnamed Space'}</span>
                    <span className="preview-mini-addr">{formData.address || 'No address'}</span>
                    <div className="preview-mini-meta">
                      <span className="preview-mini-price">₹{formData.pricePerHour || '0'}/hr</span>
                      <span className={`preview-mini-avail avail-${formData.availability}`}>
                        {formData.availability === 'available' ? '🟢' : formData.availability === 'limited' ? '🟡' : '🔴'} {formData.availability}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div className="rental-section-card shadow-sm">
                <h3>🎁 Amenities</h3>
                <div className="amenities-grid">
                  {amenitiesList.map((amenity) => (
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

              {/* Features */}
              <div className="rental-section-card shadow-sm">
                <h3>✨ Special Features</h3>
                <div className="features-grid">
                  {featuresList.map((feature) => (
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

              <div className="step-nav-row">
                <button 
                  type="button" 
                  className="step-nav-btn back-step-btn"
                  onClick={() => setActiveStep(2)}
                >
                  ← Details
                </button>
                <button
                  type="submit"
                  className="step-nav-btn submit-final-btn"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? '⏳ Publishing...' : '🚀 Publish Space'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
