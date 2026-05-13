import React, { useState } from 'react';
import './Auth.css';

export default function Auth({ onPhoneSubmit }) {
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    if (!role) {
      setError('Please select a role');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onPhoneSubmit(phone, role);
    } catch (err) {
      setError(err?.message || 'Unable to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneInput = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    if (error) setError('');
  };

  return (
    <div className="auth-screen fade-in">
      <div className="auth-decor-gradient"></div>
      
      <div className="auth-container">
        <div className="auth-header-premium">
          <div className="app-icon-wrapper shadow-premium">
            <span className="app-icon">🅿️</span>
          </div>
          <h1>Welcome to <span className="brand-name">ParkKaror</span></h1>
          <p className="auth-subtitle">Best parking spots at your fingertips</p>
        </div>

        <div className={`auth-card glass ${role === 'owner' ? 'owner-card' : ''}`}>
          {!role ? (
            <div className="role-pick-wrap">
              <p className="role-pick-title">Choose Login Type</p>
              <button
                type="button"
                className="role-pick-btn"
                onClick={() => {
                  setRole('driver');
                  setError('');
                }}
              >
                🚗
                Continue as Driver
              </button>
              <button
                type="button"
                className="role-pick-btn owner"
                onClick={() => {
                  setRole('owner');
                  setError('');
                }}
              >
                🏠
                Continue as Owner
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form-premium">
              <div className="role-switch-group">
                <label>{role === 'owner' ? 'Owner Portal Login' : 'Driver Login'}</label>
                <button
                  type="button"
                  className="change-role-btn"
                  onClick={() => {
                    setRole('');
                    setPhone('');
                    setError('');
                  }}
                >
                  Change
                </button>
              </div>

              {role === 'owner' ? (
                <div className="role-banner owner">
                  <strong>Owner Login</strong>
                  <span>List and manage your parking spaces.</span>
                </div>
              ) : (
                <div className="role-banner driver">
                  <strong>Driver Login</strong>
                  <span>Use your personal number to find and book parking spaces.</span>
                </div>
              )}

              <div className="input-group-premium">
                <label>Phone Number</label>
                <div className={`phone-field ${error ? 'error' : ''}`}>
                  <span className="prefix">+91</span>
                  <input
                    type="tel"
                    placeholder="00000 00000"
                    value={phone}
                    onChange={handlePhoneInput}
                    autoFocus
                  />
                </div>
                {error && <p className="error-message-auth">{error}</p>}
              </div>

              <button type="submit" className="btn-auth-primary gradient-primary" disabled={loading}>
                {loading ? 'Sending OTP...' : role === 'owner' ? 'Continue to Owner Dashboard' : 'Continue to Driver App'}
              </button>
              <p className="auth-hint">
                {role === 'owner'
                  ? 'Owner login uses alert-based verification.'
                  : 'You will receive a verification code via alert.'}
              </p>
            </form>
          )}
        </div>

        <div className="auth-footer-premium">
          <p>By continuing, you agree to our <strong>Terms of Service</strong> and <strong>Privacy Policy</strong></p>
        </div>
      </div>
    </div>
  );
}
