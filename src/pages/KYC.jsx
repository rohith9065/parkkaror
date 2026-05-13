import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/constants';
import UploadBox from '../components/UploadBox';
import './KYC.css';

export default function KYC({ user, onComplete, onBack }) {
  const [firstName, setFirstName] = useState(user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user?.full_name?.split(' ')[1] || user?.name?.split(' ')[1] || '');
  const [address, setAddress] = useState(user?.address || '');
  const [aadhaar, setAadhaar] = useState('');
  const [license, setLicense] = useState('');
  const [selfie, setSelfie] = useState('');
  const [upiId, setUpiId] = useState(user?.upi_id || '');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (firstName && lastName && address && aadhaar && (user?.role === 'owner' || license) && selfie) {
      setIsSubmitting(true);
      
      try {
        const fullName = `${firstName} ${lastName}`;
        const response = await axios.post(`${API_URL}/users/register`, {
          phone_number: user.phone_number || user.phone,
          full_name: fullName,
          address: address,
          document_url: JSON.stringify({ aadhaar, license, selfie }),
          role: user.role,
          upi_id: upiId || null
        });

        if (response.data.user) {
          setSubmitted(true);
          setIsSubmitting(false);
          setTimeout(() => {
            onComplete(response.data.user);
          }, 3000);
        }
      } catch (error) {
        console.error('KYC submission error:', error);
        alert('Failed to submit. Please check your connection.');
        setIsSubmitting(false);
      }
    } else {
      alert("Please complete all sections.");
    }
  };

  if (submitted) {
    return (
      <div className="kyc-screen fade-in">
        <div className="kyc-success-hero">
          <div className="success-lottie">
            <div className="success-circle-anim"></div>
            <span className="success-check-anim">✓</span>
          </div>
          <h1>Verification Sent!</h1>
          <p>We're reviewing your profile. You'll be notified within 2 hours.</p>
          <div className="kyc-status-stepper">
            <div className="step active">Submitted</div>
            <div className="step">Reviewing</div>
            <div className="step">Verified</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kyc-screen fade-in">
      <div className="kyc-header-premium glass shadow-sm">
        <button className="back-btn-circle" onClick={onBack}>←</button>
        <h1>Complete Profile</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="kyc-scrollview">
        <div className="kyc-intro">
          <div className="kyc-badge-premium">🛡️ Verified Account</div>
          <h2>Join the community</h2>
          <p>Complete your KYC to start listing or booking spaces securely.</p>
        </div>

        <form onSubmit={handleSubmit} className="kyc-form-premium">
          <div className="kyc-section-card shadow-sm">
            <h3>Personal Information</h3>
            <div className="form-row">
              <div className="form-group-premium">
                <label>FIRST NAME</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Rohith" required />
              </div>
              <div className="form-group-premium">
                <label>LAST NAME</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Kumar" required />
              </div>
            </div>
            <div className="form-group-premium">
              <label>RESIDENTIAL ADDRESS</label>
              <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter full address" required />
            </div>
            
            {user?.role === 'owner' && (
              <div className="form-group-premium" style={{marginTop: '1rem'}}>
                <label>UPI ID (For receiving payments)</label>
                <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="e.g. mobile@ybl or username@paytm" />
                <span style={{fontSize: '0.8rem', color: '#666', marginTop: '4px'}}>Highly recommended so drivers can pay you securely.</span>
              </div>
            )}
          </div>

          <div className="kyc-section-card shadow-sm">
            <h3>Identity Documents</h3>
            <p className="section-hint">Upload clear photos of your originals</p>
            
            <UploadBox title="Aadhaar Card (Front)" onUpload={setAadhaar} preview={aadhaar} />
            <UploadBox title="Selfie with Aadhaar" onUpload={setSelfie} preview={selfie} />
            
            {user?.role === 'driver' ? (
              <UploadBox title="Driving License" onUpload={setLicense} preview={license} />
            ) : (
              <UploadBox title="Property / RC Document" onUpload={setLicense} preview={license} />
            )}
          </div>

          <div className="kyc-security-tag">
            <span className="lock-icon">🔒</span>
            Your data is stored securely using bank-grade encryption.
          </div>

          <button type="submit" className="btn-auth-primary gradient-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Verifying...' : 'Submit Documents'}
          </button>
          
          <div style={{ height: 40 }} />
        </form>
      </div>
    </div>
  );
}
