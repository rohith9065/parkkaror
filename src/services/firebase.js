import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, query, where, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD9CZe17T1Yuf3f-42u5P2OTZlYWgYhivM",
  authDomain: "parkkaror.firebaseapp.com",
  projectId: "parkkaror",
  storageBucket: "parkkaror.firebasestorage.app",
  messagingSenderId: "111258599967",
  appId: "1:111258599967:web:2a79d2dbfe8d29c8744b2a",
  measurementId: "G-DL0J3N8YQ6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentVerificationCode = null;

function formatPhone(phone) {
  const cleaned = String(phone || '').replace(/\D/g, '').slice(-10);
  return cleaned ? `+91${cleaned}` : '';
}

function getBrowserInfo() {
  const userAgent = navigator.userAgent;
  let browser = 'Unknown';

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Opera')) {
    browser = 'Opera';
  }

  return {
    browser,
    platform: navigator.platform,
    userAgent: userAgent.substring(0, 100) + '...'
  };
}

export async function sendPhoneOtp(phone, metadata = {}) {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) {
    throw new Error('Please enter a valid 10-digit phone number.');
  }

  try {
    // Generate a random 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    currentVerificationCode = verificationCode;

    // Get browser information
    const browserInfo = getBrowserInfo();

    // Create alert message with phone number and browser info
    const alertMessage = `
📱 VERIFICATION CODE ALERT

Phone Number: ${formattedPhone}
Browser: ${browserInfo.browser}
Platform: ${browserInfo.platform}

Your verification code is: ${verificationCode}

⚠️  This is a development alert. In production, this code would be sent via SMS.
    `.trim();

    // Show the alert
    alert(alertMessage);

    console.log('✅ Verification code generated and displayed:', verificationCode);
    return { phone: formattedPhone, data: { code: verificationCode }, metadata };
  } catch (error) {
    console.error('Alert verification error:', error);
    throw new Error('Failed to generate verification code.');
  }
}

export async function verifyPhoneOtp(phone, token) {
  const formattedPhone = formatPhone(phone);
  if (!formattedPhone) {
    throw new Error('Please enter a valid phone number.');
  }

  if (!token || String(token).trim().length < 6) {
    throw new Error('Please enter a valid 6-digit verification code.');
  }

  if (!currentVerificationCode) {
    throw new Error('No verification code requested. Please request a new code.');
  }

  try {
    console.log('Verifying code:', token, 'Expected:', currentVerificationCode);
    if (String(token).trim() !== currentVerificationCode) {
      throw new Error('Invalid verification code.');
    }

    // Clear the code after successful verification
    currentVerificationCode = null;
    console.log('✅ Verification successful');
    return { success: true };
  } catch (error) {
    console.error('Verification error:', error);
    throw error;
  }
}

export { db, collection, addDoc, getDocs, getDoc, doc, query, where, updateDoc, deleteDoc, setDoc };
