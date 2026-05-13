import React, { useEffect } from 'react';
import './Splash.css';

export default function Splash({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="splash-screen fade-in">
      <div className="splash-decor-top"></div>
      <div className="splash-decor-bottom"></div>
      
      <div className="splash-content">
        <div className="splash-logo-container transition-all">
          <div className="logo-pulse"></div>
          <span className="logo-emoji-premium">🅿️</span>
        </div>
        <h1 className="logo-title-premium">Park<span className="accent-text">Karor</span></h1>
        <p className="splash-tagline-premium">Smart Parking simplified</p>
      </div>

      <div className="splash-loading-indicator">
        <div className="loading-bar">
          <div className="loading-progress"></div>
        </div>
      </div>
    </div>
  );
}
