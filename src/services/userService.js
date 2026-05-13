import { db, collection, addDoc, getDocs, getDoc, doc, query, where, updateDoc, setDoc } from './firebase';

const API_BASE_URL = 'http://localhost:5000/api';

// Create user profile
export async function createUserProfile(userId, userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: userData.phone,
        full_name: userData.name || userData.fullName,
        address: userData.address || '',
        document_url: userData.documentUrl || '',
        role: userData.role || 'driver',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create user profile');
    }

    const result = await response.json();
    return result.user.id;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

// Get user profile
export async function getUserProfile(phone) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${phone}`);
    if (!response.ok) {
      throw new Error('User not found');
    }
    const user = await response.json();
    return { id: user.id, ...user };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(userId, updateData) {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, updateData);
    return userId;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Update user verification
export async function updateUserVerification(userId, aadhaarImage, licenseImage) {
  try {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, {
      aadhaarImage,
      licenseImage,
      verified: true,
      trustScore: 75,
    });
    return userId;
  } catch (error) {
    console.error('Error updating verification:', error);
    throw error;
  }
}

// Search user by phone
export async function getUserByPhone(phone) {
  try {
    const q = query(collection(db, 'users'), where('phone', '==', phone));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }
    const userDoc = querySnapshot.docs[0];
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Report user
export async function reportUser(reporterId, reportedUserId, reason, description) {
  try {
    const docRef = await addDoc(collection(db, 'reports'), {
      reporterId,
      reportedUserId,
      reason,
      description,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error reporting user:', error);
    throw error;
  }
}

// Calculate trust score
export function calculateTrustScore(user) {
  let score = 50;
  
  if (user.verified) score += 25;
  if (user.successfulBookings) score += Math.min(user.successfulBookings * 5, 20);
  if (user.reportsAgainst) score -= Math.min(user.reportsAgainst * 10, 40);
  
  return Math.max(0, Math.min(100, score));
}
