import React from 'react';
import './ParkingCard.css';

export default function ParkingCard({ parking, onSelect }) {
  return (
    <div className="parking-card-premium fade-in" onClick={() => onSelect(parking)}>
      <div className="card-image-box">
        <div className="price-tag">₹{parking.pricePerHour}/h</div>
        <div className="parking-icon">🅿️</div>
      </div>
      
      <div className="card-info-box">
        <div className="card-top-row">
          <h3 className="card-name">{parking.name}</h3>
          <div className="card-rating">
            <span className="star">★</span>
            <span>{parking.rating || 4.5}</span>
          </div>
        </div>
        
        <p className="card-address-text">{parking.address}</p>
        
        <div className="card-bottom-row">
          <div className="slots-badge">
            <span className="dot"></span>
            {parking.availableSlots} slots left
          </div>
          <div className="distance-info">
            0.8 km
          </div>
        </div>
      </div>
    </div>
  );
}
