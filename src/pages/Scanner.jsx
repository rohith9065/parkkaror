import React, { useState } from 'react';
import { validateQR } from '../services/bookingService';
import './Scanner.css';

const normalizeDateTimeString = (dateTime) => {
  if (!dateTime || typeof dateTime !== 'string') return dateTime;
  const trimmed = dateTime.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(' ', 'T')}Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}Z`;
  }
  return trimmed;
};

const tryParseJson = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const tryParseLooseJson = (value) => {
  if (typeof value !== 'string') return null;
  let normalized = value.trim();
  normalized = normalized.replace(/\r?\n/g, ' ');
  normalized = normalized.replace(/'/g, '"');
  normalized = normalized.replace(/([\{,\s])([A-Za-z0-9_]+)\s*:/g, '$1"$2":');
  normalized = normalized.replace(/,\s*([}\]])/g, '$1');
  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
};

const normalizeScannedText = (text) => {
  if (typeof text !== 'string') return text;
  let trimmed = text.trim();
  if (!trimmed) return trimmed;

  // Remove surrounding quotes if entire payload is wrapped in quotes
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // decode URL-encoded payload from scanners or lenses
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded && decoded !== trimmed) {
      trimmed = decoded.trim();
    }
  } catch {
    // ignore decode failures
  }

  // Extract the first JSON object if extra text is present
  const jsonMatch = trimmed.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  // Normalize common Google Lens line separators
  trimmed = trimmed.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
  return trimmed;
};

export default function Scanner({ onBack }) {
  const [result, setResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanType, setScanType] = useState('entry');

  const handleScan = async (e) => {
    e.preventDefault();
    const input = manualCode.trim();
    if (!input) return;

    setLoading(true);
    try {
      let qrData = {};
      let parseSuccess = false;
      
      console.log('📥 Raw input:', input.substring(0, 100) + (input.length > 100 ? '...' : ''));
      
      // Try to parse as JSON first
      try {
        const normalizedInput = normalizeScannedText(input);
        let parsed = tryParseJson(input) ?? tryParseJson(normalizedInput) ?? tryParseLooseJson(input) ?? tryParseLooseJson(normalizedInput);

        if (typeof parsed === 'string') {
          parsed = tryParseJson(parsed) ?? tryParseLooseJson(parsed) ?? parsed;
        }

        if (parsed === null || parsed === undefined) {
          throw new Error('Unable to parse scanned QR payload as JSON');
        }

        console.log('✅ Parsed as JSON:', parsed);

        const unwrapPayload = (value) => {
          if (typeof value === 'string') {
            const parsedValue = tryParseJson(value);
            return parsedValue !== null ? parsedValue : value;
          }
          return value;
        };

        const payload = (parsed && typeof parsed === 'object') ? (
          parsed.payload ? unwrapPayload(parsed.payload) :
          parsed.qrCode ? unwrapPayload(parsed.qrCode) :
          parsed.qr_code ? unwrapPayload(parsed.qr_code) :
          parsed.data ? unwrapPayload(parsed.data) :
          parsed
        ) : parsed;

        const scanCode = payload.scanCode || payload.scan_code || payload.code || payload.verificationCode || payload.verification_code || payload.secureCode || payload.secure_code || null;

        qrData = {
          bookingId: payload.bookingId || payload.id || payload.booking_id || parsed.bookingId || parsed.id || parsed.booking_id,
          parkingId: payload.parkingId || payload.parking_space_id || payload.parking_id || parsed.parkingId || parsed.parking_space_id || parsed.parking_id,
          scanCode,
          userId: payload.userId || payload.user_id || parsed.userId || parsed.user_id
        };
        parseSuccess = true;

        console.log('✅ Extracted QR data:', qrData);
      } catch (parseErr) {
        console.warn('⚠️ Not JSON. Treating entire input as booking ID.', parseErr);
        qrData = { bookingId: input, parkingId: null, scanCode: null };
      }

      // Validate we have at least a booking ID
      if (!qrData.bookingId) {
        console.error('❌ Missing bookingId after parsing/fallback');
        setResult({ 
          valid: false, 
          message: 'Invalid input. Please ensure you pasted the complete QR code or a valid booking ID.' 
        });
        setLoading(false);
        return;
      }

      console.log('📤 Sending to backend:', { qrData, scanType });
      const validationResult = await validateQR(qrData, scanType);
      console.log('📥 Backend response:', validationResult);
      
      setResult(validationResult);
    } catch (error) {
      console.error('❌ Scanner error:', error);
      const msg = error.response?.data?.message || error.message || 'Validation failed. Check logs.';
      setResult({ 
        valid: false, 
        message: msg
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scanner-screen fade-in">
      <div className="scanner-header-premium glass">
        <button className="back-btn-circle" onClick={onBack}>←</button>
        <h1>Entry Scanner</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="scanner-scrollview">
        {!result ? (
          <div className="scanner-main-card">
            <div className="scanner-visual">
              <div className="scanner-frame-premium">
                <div className="scanner-line"></div>
                <div className="corner tl"></div>
                <div className="corner tr"></div>
                <div className="corner bl"></div>
                <div className="corner br"></div>
              </div>
              <div className="scanner-hint">Align QR code inside the frame</div>
            </div>

            <div className="manual-entry-section">
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '16px' }}>
                <button
                  type="button"
                  style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid var(--accent-primary)', background: scanType === 'entry' ? 'var(--accent-primary)' : 'transparent', color: scanType === 'entry' ? '#000' : 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => setScanType('entry')}
                >
                  ENTRY SCAN
                </button>
                <button
                  type="button"
                  style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #ef4444', background: scanType === 'exit' ? '#ef4444' : 'transparent', color: scanType === 'exit' ? '#fff' : '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                  onClick={() => setScanType('exit')}
                >
                  EXIT SCAN
                </button>
              </div>

              <form onSubmit={handleScan} className="manual-scan-form">
                <div className="input-group-premium">
                  <input
                    type="text"
                    placeholder="Paste full ticket JSON from QR code"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="manual-input-box"
                  />
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#64748b', lineHeight: '1.6' }}>
                  ✓ Scan customer's ticket QR code or paste the full JSON payload<br/>
                  ✓ System automatically extracts the secure payment code<br/>
                  ✓ Entry is approved only if payment code matches
                </p>
                <button type="submit" className="btn-auth-primary gradient-primary" disabled={loading || !manualCode}>
                  {loading ? 'Validating...' : 'Verify Entry'}
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="scanner-result-card fade-in">
            <div className={`result-status-header ${result.valid ? 'success' : 'error'}`}>
              <div className="result-icon-large">
                {result.valid ? '✓' : '✗'}
              </div>
              <h2>{result.valid ? (result.isEntry ? 'Entry Granted' : 'Exit Approved') : 'Access Denied'}</h2>
            </div>

            <div className="result-body-card">
              <p className="result-msg">{result.message}</p>
              
              {/* Owner Phone Display */}
              {result.ownerPhone && (
                <div className="owner-contact-info" style={{
                  backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  border: '2px solid #667eea',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '24px' }}>📞</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Owner Contact</p>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#333' }}>{result.ownerPhone}</p>
                  </div>
                </div>
              )}

              {result.booking && (
                <div className="result-grid">
                  <div className="res-item">
                    <span className="res-label">BOOKING ID</span>
                    <span className="res-val">{result.booking.id}</span>
                  </div>
                  {result.isEntry ? (
                    <div className="res-item">
                      <span className="res-label">ENTRY TIME</span>
                      <span className="res-val">
                        {new Date(normalizeDateTimeString(result.booking.start_time) || new Date()).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="res-item">
                        <span className="res-label">TOTAL DURATION</span>
                        <span className="res-val">{result.booking.duration_hours || result.booking.durationHours}h</span>
                      </div>
                      <div className="res-item">
                        <span className="res-label">FINAL BILLING</span>
                        <span className="res-val" style={{ color: '#eab308', fontWeight: 'bold' }}>₹{result.booking.total_price || result.booking.finalPrice}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button className="btn-scan-again shadow-sm" onClick={() => { setResult(null); setManualCode(''); }}>
                Scan Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
