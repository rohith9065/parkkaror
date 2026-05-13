const crypto = require('crypto');
const QRCode = require('qrcode');

const QR_SECRET = process.env.JWT_SECRET; // reuse or add QR_SECRET to .env

// Generate HMAC signature for a booking ID
const signBooking = (bookingId) => {
  return crypto.createHmac('sha256', QR_SECRET).update(String(bookingId)).digest('hex');
};

// Generate QR code data URL for a booking
const generateQRCode = async (bookingId) => {
  const signature = signBooking(bookingId);
  const payload = JSON.stringify({ bookingId, signature });
  return await QRCode.toDataURL(payload); // base64 PNG
};

// Verify a scanned QR payload string
const verifyQRPayload = (payloadString) => {
  const { bookingId, signature } = JSON.parse(payloadString);
  const expected = signBooking(bookingId);
  if (signature !== expected) throw new Error('Invalid QR signature');
  return bookingId;
};

module.exports = { generateQRCode, verifyQRPayload };
