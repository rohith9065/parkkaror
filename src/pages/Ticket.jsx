import React, { useState, useMemo } from 'react';
import QRCodeComponent from '../components/QRCodeComponent';
import './Ticket.css';

export default function Ticket({ booking, parking, onBack, onAccessSpace }) {
  const [jsonCopied, setJsonCopied] = useState(false);
  if (!booking) return null;

  const resolvedParking = parking || {
    name: booking?.parkingName || 'Parking Space',
    address: booking?.address || 'Location Area'
  };

  const bookingIdDisplay = (() => {
    if (booking?.id === null || booking?.id === undefined) return 'N/A';
    if (typeof booking.id === 'string') {
      const parts = booking.id.split('_');
      return parts.length > 1 ? parts[1] : booking.id;
    }
    return String(booking.id);
  })();

  const qrPayloadString = useMemo(() => {
    const rawQrCode = booking.qrCode || booking.qr_code || null;
    if (rawQrCode) {
      if (typeof rawQrCode === 'string') {
        try {
          const parsed = JSON.parse(rawQrCode);
          return JSON.stringify(parsed);
        } catch {
          return JSON.stringify({ rawPayload: rawQrCode, bookingId: booking.id });
        }
      }
      return JSON.stringify(rawQrCode);
    }
    return JSON.stringify({
      bookingId: booking.id,
      parkingId: booking.parkingId || booking.parking_space_id,
      userId: booking.userId || booking.user_id,
      timestamp: new Date().toISOString(),
    });
  }, [booking]);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(qrPayloadString);
    setJsonCopied(true);
    setTimeout(() => setJsonCopied(false), 2000);
  };
  return (
    <div className="ticket-screen fade-in">
      <div className="ticket-header-premium glass">
        <button className="back-btn-circle" onClick={onBack}>✕</button>
        <h1>Entry Pass</h1>
      </div>

      <div className="ticket-container">
        <div className="ticket-card-premium shadow-premium">
          <div className="ticket-top">
            <div className="parking-badge">✓ CONFIRMED</div>
            <h2 className="parking-name-large">{resolvedParking.name}</h2>
            <p className="parking-address-small">📍 {resolvedParking.address}</p>
          </div>

          <div className="ticket-divider">
            <div className="divider-left"></div>
            <div className="divider-line"></div>
            <div className="divider-right"></div>
          </div>

          <div className="ticket-bottom">
            <div className="ticket-grid">
              <div className="grid-item">
                <span className="grid-label">DATE & TIME</span>
                <span className="grid-value">
                  {new Date(booking.timeSlot).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="grid-item">
                <span className="grid-label">BOOKING ID</span>
                <span className="grid-value">#{bookingIdDisplay}</span>
              </div>
              <div className="grid-item">
                <span className="grid-label">PRICE</span>
                <span className="grid-value">₹{booking.price}</span>
              </div>
              <div className="grid-item">
                <span className="grid-label">VEHICLE</span>
                <span className="grid-value">Registered</span>
              </div>
            </div>

            <div className="qr-container-premium">
              <QRCodeComponent bookingData={booking} size={200} />
            </div>

            <div style={{ margin: '16px 0', textAlign: 'center' }}>
              <button
                onClick={handleCopyJson}
                style={{
                  background: jsonCopied ? '#16a34a' : '#0f172a',
                  color: 'white',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {jsonCopied ? 'Copied JSON' : 'Copy Ticket JSON'}
              </button>
              <p style={{ marginTop: '8px', fontSize: '12px', color: '#475569' }}>
                Copy the exact QR payload JSON for Google Lens or manual entry.
              </p>
              <pre style={{
                marginTop: '12px',
                padding: '14px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                textAlign: 'left',
                overflowX: 'auto',
                fontSize: '12px',
                color: '#0f172a'
              }}>
                {qrPayloadString}
              </pre>
            </div>

            <div className="entry-instructions">
              <h3 style={{ margin: '16px 0 12px', fontSize: '14px', fontWeight: '600', color: '#333' }}>✅ Next Steps:</h3>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#555', lineHeight: '1.8' }}>
                <li>Show this QR code to the parking owner</li>
                <li>Owner will scan the QR using the ParkKaror app scanner</li>
                <li>Owner matches the secure code to approve your entry</li>
                <li>Gate opens for your vehicle entry</li>
              </ol>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button 
            className="btn btn-primary btn-block" 
            style={{ flex: 1 }}
            onClick={() => onAccessSpace && onAccessSpace()}
          >
            🔓 Access Space
          </button>
          <button className="btn btn-secondary btn-block" style={{ flex: 1 }} onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
