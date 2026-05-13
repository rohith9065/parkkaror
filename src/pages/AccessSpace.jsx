import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode.react';
import './AccessSpace.css';

export default function AccessSpace({ booking, parking, user, onBack }) {
  const [accessCode, setAccessCode] = useState(null);
  const [accessStatus, setAccessStatus] = useState('pending'); // pending, active, expired
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes in seconds
  const [qrGenerated, setQrGenerated] = useState(false);

  useEffect(() => {
    // Generate unique access code on component mount
    const code = `ACC${booking?.id || 'BOOKING'}${Date.now()}`;
    setAccessCode(code);
    setQrGenerated(true);
    setAccessStatus('active');
  }, []);

  useEffect(() => {
    if (accessStatus !== 'active' || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setAccessStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [accessStatus, timeRemaining]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateAccessQR = () => {
    if (!booking || !parking) return null;

    const qrData = {
      type: 'access',
      bookingId: booking.id,
      parkingId: parking.id,
      accessCode: accessCode,
      userId: user?.id,
      timestamp: new Date().toISOString(),
      parkingName: parking.name,
      address: parking.address,
      validUntil: new Date(Date.now() + timeRemaining * 1000).toISOString()
    };

    return JSON.stringify(qrData);
  };

  const handlePrintQR = () => {
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(`
      <html>
        <head>
          <title>Parking Access QR</title>
          <style>
            body { text-align: center; padding: 20px; font-family: Arial; }
            .header { margin-bottom: 20px; }
            h1 { margin: 10px 0; }
            p { margin: 5px 0; color: #666; }
            img { max-width: 300px; margin: 20px 0; }
            .footer { margin-top: 20px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🅿️ Parking Access</h1>
            <p><strong>${parking.name}</strong></p>
            <p>${parking.address}</p>
          </div>
          <img id="qrImage" />
          <div class="footer">
            <p>Booking ID: ${booking.id}</p>
            <p>Valid for: 15 minutes</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `);

    // Get QR code canvas and convert to image
    setTimeout(() => {
      const canvas = document.querySelector('.access-qr-display canvas');
      if (canvas) {
        const img = printWindow.document.getElementById('qrImage');
        img.src = canvas.toDataURL();
        printWindow.print();
      }
    }, 500);
  };

  const handleDownloadQR = () => {
    const qrElement = document.querySelector('.access-qr-display canvas');
    if (qrElement) {
      const url = qrElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `parking-access-${booking.id}.png`;
      link.href = url;
      link.click();
    }
  };

  if (!booking || !parking) return null;

  return (
    <div className="access-space-screen fade-in">
      <div className="access-header-premium glass">
        <button className="back-btn-circle" onClick={onBack}>←</button>
        <h1>Access Space</h1>
        <div style={{ width: 40 }} />
      </div>

      <div className="access-scrollview">
        {/* Status Card */}
        <div className={`access-status-card ${accessStatus}`}>
          <div className="status-icon">
            {accessStatus === 'active' && '✓'}
            {accessStatus === 'pending' && '⏳'}
            {accessStatus === 'expired' && '✗'}
          </div>
          <div className="status-text">
            <h2>
              {accessStatus === 'active' && 'Access Active'}
              {accessStatus === 'pending' && 'Generating Access Code...'}
              {accessStatus === 'expired' && 'Access Expired'}
            </h2>
            <p>
              {accessStatus === 'active' && 'Show QR code to enter'}
              {accessStatus === 'pending' && 'Please wait...'}
              {accessStatus === 'expired' && 'Please generate new access code'}
            </p>
          </div>
        </div>

        {/* Location Info */}
        <div className="access-location-card shadow-sm">
          <h3>📍 Parking Location</h3>
          <div className="location-details">
            <div className="location-item">
              <span className="label">Name</span>
              <span className="value">{parking.name}</span>
            </div>
            <div className="location-item">
              <span className="label">Address</span>
              <span className="value">{parking.address}</span>
            </div>
            <div className="location-item">
              <span className="label">Booking ID</span>
              <span className="value">#{booking.id}</span>
            </div>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="access-qr-card shadow-sm">
          <h3>🔐 Your Access QR Code</h3>
          <p className="qr-instructions">Show this QR code at the parking entrance</p>
          
          <div className="access-qr-display">
            {qrGenerated && accessCode && (
              <QRCode 
                value={generateAccessQR()}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
                includeMargin={true}
              />
            )}
          </div>

          {/* Time Remaining */}
          <div className={`time-remaining ${accessStatus}`}>
            <span className="time-label">Valid for:</span>
            <span className="time-value">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        {/* Access Code Display */}
        <div className="access-code-card shadow-sm">
          <h3>🔑 Access Code</h3>
          <div className="code-display">
            <code>{accessCode}</code>
            <button 
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(accessCode);
                alert('Access code copied!');
              }}
            >
              📋 Copy
            </button>
          </div>
          <p className="code-help">Use this code if QR scanning fails</p>
        </div>

        {/* Parking Details */}
        <div className="access-details-card shadow-sm">
          <h3>📋 Booking Details</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Entry Time</span>
              <span className="detail-value">
                {new Date(booking.timeSlot).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Date</span>
              <span className="detail-value">
                {new Date(booking.timeSlot).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short'
                })}
              </span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Price</span>
              <span className="detail-value">₹{booking.price}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className="detail-value status-badge">{booking.status || 'Active'}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="access-actions">
          <button className="btn-action print-btn" onClick={handlePrintQR}>
            🖨️ Print QR
          </button>
          <button className="btn-action download-btn" onClick={handleDownloadQR}>
            ⬇️ Download QR
          </button>
        </div>

        {/* Instructions */}
        <div className="access-instructions-card">
          <h3>📌 Instructions</h3>
          <ol>
            <li>Show your QR code to the parking attendant</li>
            <li>If QR scanner not available, share your access code</li>
            <li>Entry will be validated within 15 minutes</li>
            <li>Keep the QR code visible for exit as well</li>
          </ol>
        </div>

        <button 
          className="btn-back-home"
          onClick={onBack}
          style={{ marginBottom: '20px' }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}
