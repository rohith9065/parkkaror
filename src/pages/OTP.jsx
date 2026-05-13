import React, { useState, useEffect } from 'react';
import './OTP.css';

export default function OTP({ phone, onOTPVerify, onResend }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Enter 6-digit verification code');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onOTPVerify(otp);
    } catch (err) {
      setError(err?.message || 'Invalid OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpInput = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(val);
    if (error) setError('');
    if (val.length === 6) {
      // Trigger auto-submit if desired, but here we just wait for button
    }
  };

  const handleResend = async () => {
    if (canResend) {
      setTimer(30);
      setCanResend(false);
      setOtp('');
      try {
        setLoading(true);
        await onResend();
      } catch (err) {
        setError(err?.message || 'Unable to resend OTP.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="otp-screen fade-in">
      <div className="auth-decor-gradient"></div>
      
      <div className="otp-container">
        <div className="otp-header-premium">
          <button className="back-btn-circle" onClick={() => window.history.back()}>←</button>
          <h1>Verification</h1>
          <p className="otp-subtitle">We've sent a 6-digit verification code via alert to</p>
          <div className="phone-display">{phone}</div>
        </div>

        <div className="otp-card glass">
          <form onSubmit={handleSubmit} className="otp-form-premium">
            <div className="otp-input-wrapper">
              <input
                type="tel"
                placeholder="000000"
                value={otp}
                onChange={handleOtpInput}
                autoFocus
                className="otp-input-field"
                maxLength="6"
              />
            </div>
            {error && <p className="error-message-otp">{error}</p>}

            <button type="submit" className="btn-auth-primary gradient-primary" disabled={otp.length !== 6 || loading}>
              {loading ? 'Verifying...' : 'Verify & Proceed'}
            </button>
          </form>

          <div className="resend-container">
            {canResend ? (
              <p>Didn't get the code? <button className="resend-link" onClick={handleResend}>Resend</button></p>
            ) : (
              <p>Resend code in <span className="timer-val">0:{timer < 10 ? `0${timer}` : timer}</span></p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
