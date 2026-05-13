import axios from 'axios';
import { API_URL } from '../utils/constants';

// --- LocalStorage helpers for bookings fallback ---
function getLocalBookings() {
  try {
    return JSON.parse(localStorage.getItem('parkaror_bookings') || '[]');
  } catch { return []; }
}

function saveLocalBookings(bookings) {
  localStorage.setItem('parkaror_bookings', JSON.stringify(bookings));
}

function toServiceError(error, fallbackMessage) {
  const message = error?.response?.data?.message || error?.response?.data?.error || fallbackMessage;
  return new Error(message);
}

function normalizeDateTimeString(dateTime) {
  if (!dateTime || typeof dateTime !== 'string') return dateTime;
  const trimmed = dateTime.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(' ', 'T')}Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}Z`;
  }
  return trimmed;
}

function normalizeBookingIdForApi(rawBookingId) {
  if (rawBookingId === undefined || rawBookingId === null) return rawBookingId;
  if (typeof rawBookingId === 'number') return rawBookingId;

  let value = String(rawBookingId).trim();
  if (!value) return rawBookingId;

  if (value.startsWith('BOOK')) value = value.replace('BOOK', '');
  if (value.includes('_')) value = value.split('_').pop();

  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? rawBookingId : parsed;
}

// Create booking
export async function createBooking(bookingData) {
  try {
    const response = await axios.post(`${API_URL}/bookings/create`, {
      parking_space_id: bookingData.parkingId,
      user_id: bookingData.userId,
      start_time: bookingData.timeSlot,
      duration_hours: bookingData.durationHours || 1,
      total_price: bookingData.price
    });
    return response.data;
  } catch (error) {
    throw toServiceError(error, 'Could not create booking. Please try again.');
  }
}

// Validate QR via backend (Entry or Exit)
export async function validateQR(qrData, scanType) {
  try {
    const normalizedBookingId = normalizeBookingIdForApi(qrData.bookingId);
    const response = await axios.post(`${API_URL}/bookings/validate-qr`, {
      booking_id: normalizedBookingId,
      parking_id: qrData.parkingId,
      scan_type: scanType,
      scan_code: qrData.scanCode || qrData.verificationCode || qrData.secureCode || qrData.secure_code || null
    });
    return response.data;
  } catch (error) {
    throw toServiceError(error, 'Unable to validate booking QR.');
  }
}

// Get bookings by user ID - with localStorage fallback
export async function getBookingsByUserId(userId) {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
    const apiCall = axios.get(`${API_URL}/users/${userId}/bookings`);
    const response = await Promise.race([apiCall, timeout]);
    return (response.data.bookings || []).map(b => ({
      ...b,
      qrCode: b.qrCode || b.qr_code || null,
      verificationCode: b.verificationCode || b.verification_code || null,
      parkingId: b.parking_space_id || b.parkingId,
      timeSlot: normalizeDateTimeString(b.start_time || b.timeSlot),
      price: b.total_price || b.price,
      status: b.payment_status === 'paid' ? (b.status || 'confirmed') : 'pending_payment',
      paymentStatus: b.payment_status,
    }));
  } catch (error) {
    console.warn('Backend unavailable, loading bookings from local:', error.message);
    const allBookings = getLocalBookings();
    return allBookings.filter(b => b.userId === userId);
  }
}

// Get bookings for a specific parking space (for owner dashboard)
export function getBookingsForParking(parkingId) {
  const allBookings = getLocalBookings();
  return allBookings.filter(b => b.parkingId === parkingId);
}

// Get all local bookings (for owner to see across all their spaces)
export function getAllLocalBookings() {
  return getLocalBookings();
}

// Create Razorpay order
export async function createPaymentOrder(bookingId, amount) {
  // Validate inputs
  if (!bookingId || !amount || amount <= 0) {
    throw new Error('Invalid booking ID or amount');
  }

  const normalizedBookingId = normalizeBookingIdForApi(bookingId);

  try {
    const response = await axios.post(`${API_URL}/payments/create-order`, {
      bookingId: normalizedBookingId,
      amount
    });

    // Check if response has required fields
    if (!response.data || !response.data.orderId) {
      console.error('Invalid payment response:', response.data);
      throw new Error(response.data?.error || 'Invalid payment response from server');
    }

    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.error 
      || error.response?.data?.message 
      || error.message 
      || 'Failed to create payment order';
    
    console.error('Error creating payment order:', errorMessage);
    throw new Error(errorMessage);
  }
}

// Verify payment
export async function verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId) {
  const normalizedBookingId = normalizeBookingIdForApi(bookingId);

  try {
    const response = await axios.post(`${API_URL}/payments/verify`, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId: normalizedBookingId
    });
    return response.data;
  } catch (error) {
    console.error('Error verifying payment:', error);
    throw error;
  }
}

export async function getPaymentStatus(bookingId) {
  const normalizedBookingId = normalizeBookingIdForApi(bookingId);
  try {
    const response = await axios.get(`${API_URL}/payments/status/${normalizedBookingId}`);
    return response.data;
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw toServiceError(error, 'Unable to check payment status');
  }
}

// Confirm Manual Payment
export async function confirmManualPayment(bookingId) {
  const normalizedBookingId = normalizeBookingIdForApi(bookingId);

  try {
    const response = await axios.post(`${API_URL}/payments/confirm-manual`, {
      bookingId: normalizedBookingId
    });
    return response.data;
  } catch (error) {
    console.error('Error confirming manual payment:', error);
    throw toServiceError(error, 'Failed to confirm payment. Please try again.');
  }
}

export async function submitReview({ reviewerId, revieweeId, bookingId, rating, comment }) {
  const normalizedBookingId = normalizeBookingIdForApi(bookingId);
  try {
    const response = await axios.post(`${API_URL}/reviews`, {
      reviewer_id: reviewerId,
      reviewee_id: revieweeId,
      booking_id: normalizedBookingId,
      rating,
      comment
    });
    return response.data;
  } catch (error) {
    throw toServiceError(error, 'Unable to submit review');
  }
}

export async function getUserReviews(userId) {
  const normalizedUserId = normalizeBookingIdForApi(userId);
  try {
    const response = await axios.get(`${API_URL}/users/${normalizedUserId}/reviews`);
    return response.data;
  } catch (error) {
    throw toServiceError(error, 'Unable to load user reviews');
  }
}
