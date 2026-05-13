import React, { useState, useEffect } from 'react';
import './PaymentScreen.css';
import { ArrowLeft, CheckCircle, Smartphone } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { createPaymentOrder, verifyPayment, getPaymentStatus } from '../services/bookingService';

const PaymentScreen = ({ booking, parking, user, onPaymentSuccess, onBack }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState('');
  const [orderData, setOrderData] = useState(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [qrPayload, setQrPayload] = useState(null);
  const [verificationCode, setVerificationCode] = useState(null);
  const [ticketCountdown, setTicketCountdown] = useState(10);
  const [autoNavigateTimer, setAutoNavigateTimer] = useState(null);

  useEffect(() => {
    const loadRazorpayScript = () => new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
      document.body.appendChild(script);
    });

    loadRazorpayScript().catch((err) => {
      console.error('Razorpay script load error:', err);
      setError('Could not load payment gateway. Please try again later.');
    });
  }, []);

  useEffect(() => {
    if (!orderData || paymentStatus !== 'created') return;

    const interval = setInterval(async () => {
      try {
        const statusResult = await getPaymentStatus(booking.id);
        if (statusResult.status === 'paid') {
          const qr = statusResult.qrCode || statusResult.qr_code || null;
          if (qr) {
            setPaymentStatus('paid');
            setQrPayload(qr);
            setVerificationCode(statusResult.verificationCode || statusResult.verification_code || null);
          }
        }
      } catch (pollError) {
        console.warn('Payment status poll failed:', pollError.message);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orderData, paymentStatus, booking.id]);

  useEffect(() => {
    if (paymentStatus !== 'paid' || !qrPayload) return;

    setTicketCountdown(10);

    const countdown = setInterval(() => {
      setTicketCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(() => {
      onPaymentSuccess(qrPayload, verificationCode);
    }, 10000);

    setAutoNavigateTimer(timer);

    return () => {
      clearInterval(countdown);
      clearTimeout(timer);
    };
  }, [paymentStatus, qrPayload, verificationCode, onPaymentSuccess]);

  const handlePayment = async () => {
    setIsProcessing(true);
    setError('');

    if (!booking || !booking.id) {
      setError('Invalid booking data. Please try again.');
      setIsProcessing(false);
      return;
    }

    if (!window.Razorpay) {
      setError('Payment gateway is not ready. Please refresh and try again.');
      setIsProcessing(false);
      return;
    }

    try {
      setIsLoadingOrder(true);
      const order = await createPaymentOrder(booking.id, amount);
      setOrderData(order);
      setPaymentStatus('created');

      const options = {
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: parking?.name || 'ParkKaror',
        description: `Parking booking ${booking.id}`,
        order_id: order.orderId,
        method: {
          upi: true,
          card: true,
          netbanking: true,
          wallet: true,
          emi: true,
        },
        handler: async (response) => {
          try {
            setIsRedirecting(true);
            const verifyResult = await verifyPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              response.razorpay_signature,
              booking.id
            );

            const qr = verifyResult?.qrCode || verifyResult?.qr_code || null;
            if (qr) {
              setPaymentStatus('paid');
              setQrPayload(qr);
              setVerificationCode(verifyResult?.verificationCode || verifyResult?.verification_code || null);
            } else {
              setError(verifyResult.message || 'Payment succeeded but ticket generation failed.');
              setPaymentStatus('failed');
            }
          } catch (verifyError) {
            console.error('Payment verification error:', verifyError);
            setError(verifyError?.message || 'Payment verification failed.');
            setPaymentStatus('failed');
          } finally {
            setIsProcessing(false);
            setIsLoadingOrder(false);
          }
        },
        prefill: {
          contact: user?.phone_number || user?.phone || '',
          email: user?.email || ''
        },
        theme: {
          color: '#22c55e'
        },
        modal: {
          ondismiss: () => {
            if (paymentStatus !== 'paid') {
              setIsProcessing(false);
              setIsLoadingOrder(false);
              setError('Payment was cancelled or closed. You can try again.');
            }
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      console.error('Payment order error:', err);
      setError(err?.message || 'Could not start payment. Please try again.');
      setIsProcessing(false);
      setIsLoadingOrder(false);
    }
  };

  const upiId = parking?.upi_id || '';
  const amount = booking?.price || 0;
  const payeeName = parking?.owner_name || parking?.name || 'Parking Owner';
  const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=BOOK${booking?.id || 'UNKNOWN'}`;

  const handleViewTicket = () => {
    if (qrPayload) {
      if (autoNavigateTimer) {
        clearTimeout(autoNavigateTimer);
      }
      onPaymentSuccess(qrPayload, verificationCode);
    }
  };

  return (
    <div className="payment-screen">
      <header className="page-header">
        <button className="icon-btn" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>Complete Payment</h1>
        <div style={{ width: 24 }}></div>
      </header>

      <div className="payment-content">
        <div className="booking-summary">
          <h2>Booking Summary</h2>
          <div className="summary-item">
            <span>Location:</span>
            <span>{parking?.name || 'Parking Space'}</span>
          </div>
          <div className="summary-item">
            <span>Time Slot:</span>
            <span>{booking?.timeSlot || 'Selected Time'}</span>
          </div>
          <div className="summary-item">
            <span>Duration:</span>
            <span>{booking?.durationHours || 1} hour(s)</span>
          </div>
          <div className="summary-total">
            <span>Total Amount:</span>
            <span>₹{amount}</span>
          </div>
        </div>

        <div className="payment-methods" style={{ textAlign: 'center', marginTop: '20px' }}>
          <h2>Step 1: Pay with UPI QR</h2>
          <p style={{ color: '#666', marginBottom: '1rem', fontSize: '0.9rem' }}>
            Scan the QR code below with your UPI app and complete the payment. Ticket will be generated after Razorpay confirms the transaction.
          </p>
          {upiId ? (
            <div
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '16px',
                display: 'inline-block',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                marginBottom: '1rem'
              }}
            >
              <QRCodeCanvas
                value={upiUrl}
                size={200}
                level="H"
                includeMargin={true}
              />
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '8px', fontWeight: 'bold' }}>
                Scan to pay ₹{amount}
              </div>
            </div>
          ) : (
            <p style={{ color: '#d97706', marginBottom: '1rem' }}>
              Owner has not configured UPI yet. Razorpay checkout will still work for other payment methods.
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#3b82f6', marginBottom: '1rem' }}>
            <Smartphone size={20} />
            <span style={{ fontWeight: '500' }}>Payment via Razorpay verification</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2rem' }}>
            Owner contact: {parking?.owner_phone ? `+91 ${parking.owner_phone}` : 'Not available'}
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
          <h3 style={{ color: '#1f2937', marginBottom: '0.5rem', fontSize: '1rem' }}>Step 2: Pay with Razorpay</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0' }}>
            Complete the payment inside the Razorpay checkout popup. When payment succeeds, your ticket QR will be generated automatically.
          </p>
        </div>

        <button
          className="pay-now-btn"
          onClick={handlePayment}
          disabled={isProcessing || isLoadingOrder || paymentStatus === 'paid'}
          style={{ background: '#22c55e' }}
        >
          {paymentStatus === 'paid'
            ? 'Payment Completed'
            : isProcessing || isLoadingOrder
            ? 'Processing payment...'
            : `Pay ₹${amount}`}
        </button>

        {paymentStatus === 'paid' && qrPayload && (
          <div className="success-message" style={{ marginTop: '1.5rem', padding: '18px', borderRadius: '14px', background: '#ecfdf5', color: '#166534', boxShadow: '0 6px 18px rgba(16, 185, 129, 0.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', fontWeight: '700' }}>
              <CheckCircle size={20} color="#16a34a" />
              Payment successful!
            </div>
            <p style={{ margin: 0, color: '#166534', lineHeight: 1.5 }}>
              Your transaction has been confirmed and your ticket is ready. Tap below to view the QR ticket.
            </p>
            <button
              className="pay-now-btn"
              onClick={handleViewTicket}
              style={{ marginTop: '12px', background: '#059669' }}
            >
              View Ticket Now
            </button>
            <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#166534' }}>
              Opening ticket in {ticketCountdown} second{ticketCountdown === 1 ? '' : 's'}...
            </div>
          </div>
        )}

        <div className="payment-note" style={{ marginTop: '1rem' }}>
          <CheckCircle size={16} color="#22c55e" />
          <span>
            {paymentStatus === 'paid'
              ? 'Payment received. You can now view your ticket.'
              : orderData
              ? 'Waiting for payment confirmation from Razorpay...'
              : 'Razorpay will verify payment automatically once checkout completes.'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PaymentScreen;
