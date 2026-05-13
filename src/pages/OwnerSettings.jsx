import React, { useState, useEffect } from 'react';
import './OwnerSettings.css';
import { ArrowLeft, Save, CreditCard } from 'lucide-react';
import { API_URL } from '../utils/constants';

const OwnerSettings = ({ user, onBack }) => {
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: user?.upi_id || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'success' | 'error' | ''
  const [errorMessage, setErrorMessage] = useState('');

  // Refresh user payment details from backend on mount
  useEffect(() => {
    const phone = user?.phone_number || user?.phone;
    if (!phone) return;

    fetch(`${API_URL}/users/${phone}`)
      .then(r => r.ok ? r.json() : Promise.reject('not found'))
      .then(data => {
        setPaymentDetails({ upiId: data.upi_id || '' });
      })
      .catch(() => {});
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('');
    setErrorMessage('');

    if (!paymentDetails.upiId || !paymentDetails.upiId.trim()) {
      setErrorMessage('Please enter your UPI ID before saving.');
      setSaveStatus('error');
      setIsSaving(false);
      return;
    }

    if (!user || (!user.id && !user.user_id)) {
      setSaveStatus('error');
      setIsSaving(false);
      return;
    }
    const userId = user.id || user.user_id;

    try {
      const response = await fetch(`${API_URL}/users/${userId}/payment-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upiId: paymentDetails.upiId,
        }),
      });

      if (response.ok) {
        setSaveStatus('success');
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="owner-settings-page">
      <header className="page-header">
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={24} /></button>
        <h1>Space Settings</h1>
        <div style={{ width: 24 }} />
      </header>

      {saveStatus === 'success' && (
        <div style={{
          margin: '0 16px 8px', padding: '12px 16px',
          background: '#dcfce7', border: '1px solid #86efac',
          borderRadius: '12px', color: '#166534', fontWeight: '600', fontSize: '14px',
        }}>
          ✅ Settings saved! Payments will go to your UPI ID.
        </div>
      )}
      {saveStatus === 'error' && (
        <div style={{
          margin: '0 16px 8px', padding: '12px 16px',
          background: '#fee2e2', border: '1px solid #fca5a5',
          borderRadius: '12px', color: '#991b1b', fontWeight: '600', fontSize: '14px',
        }}>
          ❌ {errorMessage || 'Failed to save. Check your connection and try again.'}
        </div>
      )}

      <div className="settings-section">
        <div className="section-title">
          <CreditCard size={20} color="#22c55e" />
          <h3>Payment Details</h3>
        </div>

        <div className="input-group">
          <label>UPI ID (for GPay, PhonePe, etc.) <span style={{ color: '#ef4444' }}>*</span></label>
          <input
            type="text"
            placeholder="yourname@upi"
            value={paymentDetails.upiId}
            onChange={e => setPaymentDetails({ upiId: e.target.value })}
          />
          <small style={{ display: 'block', marginTop: '8px', color: '#6b7280', fontSize: '13px' }}>
            UPI ID is required to receive payments. This is the only field needed for owner payout.
          </small>
        </div>
      </div>

      <button className="primary-btn save-settings-btn" onClick={handleSave} disabled={isSaving}>
        <Save size={18} />
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

export default OwnerSettings;
