import React, { useState } from 'react';
import QRCode from 'qrcode.react';
import './QRCodeComponent.css';

export default function QRCodeComponent({ bookingData, size = 200 }) {
  const [copied, setCopied] = useState(false);

  const rawQrCode = bookingData?.qrCode || bookingData?.qr_code || null;

  const tryParseJson = (value) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const resolvePayloadObject = () => {
    if (!rawQrCode) {
      return {
        type: 'parkaror_ticket',
        version: 1,
        bookingId: bookingData?.id,
        parkingId: bookingData?.parkingId || bookingData?.parking_space_id,
        userId: bookingData?.userId || bookingData?.user_id,
        scanCode: bookingData?.verificationCode || bookingData?.verification_code || null,
        issuedAt: new Date().toISOString(),
      };
    }

    if (typeof rawQrCode === 'string') {
      const parsed = tryParseJson(rawQrCode);
      if (parsed && typeof parsed === 'object') {
        return {
          type: 'parkaror_ticket',
          version: 1,
          bookingId: parsed.bookingId || parsed.booking_id || bookingData?.id,
          parkingId: parsed.parkingId || parsed.parking_id || bookingData?.parkingId || bookingData?.parking_space_id,
          userId: parsed.userId || parsed.user_id || bookingData?.userId || bookingData?.user_id,
          scanCode: parsed.scanCode || parsed.scan_code || parsed.verificationCode || parsed.verification_code || parsed.secureCode || parsed.secure_code || bookingData?.verificationCode || bookingData?.verification_code || null,
          issuedAt: parsed.issuedAt || new Date().toISOString(),
        };
      }
      return {
        type: 'parkaror_ticket',
        version: 1,
        bookingId: bookingData?.id,
        parkingId: bookingData?.parkingId || bookingData?.parking_space_id,
        userId: bookingData?.userId || bookingData?.user_id,
        scanCode: bookingData?.verificationCode || bookingData?.verification_code || null,
        issuedAt: new Date().toISOString(),
      };
    }

    return {
      type: 'parkaror_ticket',
      version: 1,
      bookingId: rawQrCode.bookingId || rawQrCode.booking_id || bookingData?.id,
      parkingId: rawQrCode.parkingId || rawQrCode.parking_id || bookingData?.parkingId || bookingData?.parking_space_id,
      userId: rawQrCode.userId || rawQrCode.user_id || bookingData?.userId || bookingData?.user_id,
      scanCode: rawQrCode.scanCode || rawQrCode.scan_code || rawQrCode.verificationCode || rawQrCode.verification_code || rawQrCode.secureCode || rawQrCode.secure_code || bookingData?.verificationCode || bookingData?.verification_code || null,
      issuedAt: rawQrCode.issuedAt || new Date().toISOString(),
    };
  };

  const payloadObject = resolvePayloadObject();
  const qrPayload = JSON.stringify(payloadObject);
  const qrData = payloadObject;

  const handleCopyCode = () => {
    if (qrData.scanCode) {
      navigator.clipboard.writeText(qrData.scanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="qr-code-container">
      <div style={{ marginBottom: '12px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
        📲 Scan this with owner's phone to approve entry
      </div>
      <div className="qr-code-wrapper">
        <QRCode 
          value={qrPayload} 
          size={size}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          includeMargin={true}
        />
      </div>
      <p className="qr-instructions">QR Code for Entry Approval</p>
      
      {qrData.scanCode && (
        <div style={{
          background: '#f0f9ff',
          border: '2px solid #0ea5e9',
          borderRadius: '12px',
          padding: '12px 16px',
          margin: '12px 0',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#0369a1', fontWeight: '600', textTransform: 'uppercase' }}>Secure Payment Code</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', fontFamily: 'monospace', color: '#0c4a6e', letterSpacing: '2px' }}>{qrData.scanCode}</p>
            <button
              onClick={handleCopyCode}
              style={{
                background: copied ? '#10b981' : '#0ea5e9',
                color: 'white',
                border: 'none',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#0369a1' }}>Owner will need this code to grant entry</p>
        </div>
      )}
    </div>
  );
}
