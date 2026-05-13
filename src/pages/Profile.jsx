import React from 'react';
import TrustBadge from '../components/TrustBadge';
import './Profile.css';

export default function Profile({ user, onLogout, onNavigate }) {
  if (!user) return null;

  return (
    <div className="profile-screen fade-in">
      <div className="profile-header-premium shadow-sm glass">
        <button className="back-btn-circle" onClick={() => onNavigate('home')}>←</button>
        <h1>My Account</h1>
        <button className="settings-icon-btn">⚙️</button>
      </div>

      <div className="profile-scrollview">
        <div className="profile-hero-section">
          <div className="profile-avatar-wrapper shadow-premium">
            <div className="avatar-placeholder">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <button className="edit-avatar-badge">✎</button>
          </div>
          <h2 className="profile-display-name">{user.full_name || user.name || 'User'}</h2>
          <p className="profile-display-phone">{user.phone_number || user.phone}</p>
          
          <div className="trust-badge-container-premium">
            <TrustBadge score={user.trustScore || (user.is_verified ? 75 : 50)} />
          </div>
        </div>

        <div className="profile-main-card">
          <div className="profile-stats-row">
            <div className="stat-box">
              <span className="stat-val">12</span>
              <span className="stat-lab">Bookings</span>
            </div>
            <div className="stat-box">
              <span className="stat-val">4.9</span>
              <span className="stat-lab">Rating</span>
            </div>
            <div className="stat-box">
              <span className="stat-val">2.1k</span>
              <span className="stat-lab">Points</span>
            </div>
          </div>

          <div className="profile-menu-section">
            <h3 className="menu-group-title">Account Settings</h3>
            <div className="menu-item-premium" onClick={() => onNavigate('kyc')}>
              <div className="menu-icon-box blue">📸</div>
              <div className="menu-text-box">
                <span className="menu-title">KYC & Verification</span>
                <span className="menu-subtitle">{user.is_verified ? 'Verified Account' : 'Action Required'}</span>
              </div>
              <span className="menu-arrow">›</span>
            </div>

            <div className="menu-item-premium" onClick={() => onNavigate('bookings')}>
              <div className="menu-icon-box green">📅</div>
              <div className="menu-text-box">
                <span className="menu-title">Booking History</span>
                <span className="menu-subtitle">View past & active bookings</span>
              </div>
              <span className="menu-arrow">›</span>
            </div>

            {user.role === 'owner' && (
              <div className="menu-item-premium" onClick={() => onNavigate('dashboard')}>
                <div className="menu-icon-box purple">📊</div>
                <div className="menu-text-box">
                  <span className="menu-title">Owner Dashboard</span>
                  <span className="menu-subtitle">Earnings & listed parking</span>
                </div>
                <span className="menu-arrow">›</span>
              </div>
            )}

            {user.role === 'owner' && (
              <div className="menu-item-premium" onClick={() => onNavigate('addRentalSpace')}>
                <div className="menu-icon-box green">🏠</div>
                <div className="menu-text-box">
                  <span className="menu-title">Add Rental Space</span>
                  <span className="menu-subtitle">Upload photo, set price & availability</span>
                </div>
                <span className="menu-arrow">›</span>
              </div>
            )}

            <div className="menu-item-premium" onClick={() => onNavigate('payments')}>
              <div className="menu-icon-box" style={{backgroundColor: 'rgba(234, 179, 8, 0.2)', color: '#eab308'}}>💳</div>
              <div className="menu-text-box">
                <span className="menu-title">Payments & Wallet</span>
                <span className="menu-subtitle">Manage payment methods & history</span>
              </div>
              <span className="menu-arrow">›</span>
            </div>

            <h3 className="menu-group-title">Support</h3>
            <div className="menu-item-premium" onClick={() => onNavigate('report')}>
              <div className="menu-icon-box red">⚠️</div>
              <div className="menu-text-box">
                <span className="menu-title">Help & Support</span>
                <span className="menu-subtitle">Report a problem</span>
              </div>
              <span className="menu-arrow">›</span>
            </div>

            <div className="menu-item-premium" onClick={onLogout}>
              <div className="menu-icon-box gray">🚪</div>
              <div className="menu-text-box">
                <span className="menu-title">Logout</span>
                <span className="menu-subtitle">Sign out of your account</span>
              </div>
              <span className="menu-arrow">›</span>
            </div>
          </div>
        </div>
        
        <div className="profile-footer-version">
          ParkKaror v1.4.2
        </div>
      </div>
    </div>
  );
}
