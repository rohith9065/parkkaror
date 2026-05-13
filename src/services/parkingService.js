import { db, collection, addDoc, getDocs, getDoc, doc, query, where, updateDoc } from './firebase';

const API_BASE_URL = 'http://localhost:5000/api';

// Add new parking listing
export async function addParkingListing(parkingData) {
  try {
    const docRef = await addDoc(collection(db, 'parkings'), {
      ...parkingData,
      createdAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding parking:', error);
    throw error;
  }
}

// Get all parkings
export async function getAllParkings() {
  try {
    const querySnapshot = await getDocs(collection(db, 'parkings'));
    const parkings = [];
    querySnapshot.forEach((doc) => {
      parkings.push({ id: doc.id, ...doc.data() });
    });
    return parkings;
  } catch (error) {
    console.error('Error getting parkings:', error);
    throw error;
  }
}

// Get parking by ID
export async function getParkingById(parkingId) {
  try {
    const docRef = doc(db, 'parkings', parkingId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Parking not found');
    }
  } catch (error) {
    console.error('Error getting parking:', error);
    throw error;
  }
}

// Get parkings by owner ID
export async function getParkingsByOwnerId(ownerId) {
  try {
    const q = query(collection(db, 'parkings'), where('ownerId', '==', ownerId));
    const querySnapshot = await getDocs(q);
    const parkings = [];
    querySnapshot.forEach((doc) => {
      parkings.push({ id: doc.id, ...doc.data() });
    });
    return parkings;
  } catch (error) {
    console.error('Error getting parkings:', error);
    throw error;
  }
}

// Update parking
export async function updateParking(parkingId, updateData) {
  try {
    const docRef = doc(db, 'parkings', parkingId);
    await updateDoc(docRef, updateData);
    return parkingId;
  } catch (error) {
    console.error('Error updating parking:', error);
    throw error;
  }
}

// Get nearby parkings (within 5km)
export async function getNearbyParkings(userLat, userLng, radiusKm = 5) {
  try {
    const allParkings = await getAllParkings();
    const nearbyParkings = allParkings.filter((parking) => {
      const distance = calculateDistance(userLat, userLng, parking.latitude, parking.longitude);
      return distance <= radiusKm;
    });
    return nearbyParkings.sort((a, b) => {
      const distA = calculateDistance(userLat, userLng, a.latitude, a.longitude);
      const distB = calculateDistance(userLat, userLng, b.latitude, b.longitude);
      return distA - distB;
    });
  } catch (error) {
    console.error('Error getting nearby parkings:', error);
    throw error;
  }
}

// Haversine formula to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// --- LocalStorage helpers for rental spaces fallback ---
function getLocalRentalSpaces() {
  try {
    return JSON.parse(localStorage.getItem('parkaror_rental_spaces') || '[]');
  } catch { return []; }
}

function saveLocalRentalSpaces(spaces) {
  localStorage.setItem('parkaror_rental_spaces', JSON.stringify(spaces));
}

// Add new rental space listing
export async function addRentalSpace(rentalSpaceData) {
  try {
    const response = await fetch(`${API_BASE_URL}/parking/list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner_id: rentalSpaceData.ownerId,
        owner_name: rentalSpaceData.ownerName || 'Owner',
        owner_phone: rentalSpaceData.ownerPhone || 'unknown',
        upi_id: rentalSpaceData.upiId || '',
        name: rentalSpaceData.name,
        description: rentalSpaceData.description,
        address: rentalSpaceData.address,
        latitude: parseFloat(rentalSpaceData.latitude),
        longitude: parseFloat(rentalSpaceData.longitude),
        total_slots: parseInt(rentalSpaceData.totalCapacity, 10),
        min_duration: parseInt(rentalSpaceData.minDuration, 10) || 1,
        max_duration: parseInt(rentalSpaceData.maxDuration, 10) || 24,
        price_per_hour: parseFloat(rentalSpaceData.pricePerHour),
        availability_status: rentalSpaceData.availability || 'available',
        amenities: rentalSpaceData.amenities || [],
        features: rentalSpaceData.features || [],
        images: rentalSpaceData.images || [], // Array of base64 image URLs
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || 'Failed to add rental space');
    }

    const result = await response.json();
    return result.parkingId;
  } catch (error) {
    console.error('Error adding rental space:', error);
    throw error;
  }
}

// Get all rental spaces
export async function getAllRentalSpaces() {
  try {
    const response = await fetch(`${API_BASE_URL}/parking/all`);
    if (!response.ok) {
      throw new Error('Failed to fetch rental spaces');
    }
    const spaces = await response.json();
    return spaces;
  } catch (error) {
    console.error('Error getting rental spaces:', error);
    return getLocalRentalSpaces(); // Fallback to localStorage
  }
}

// Get rental spaces by owner ID
export async function getRentalSpacesByOwnerId(ownerId) {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/${ownerId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch rental spaces');
    }
    const data = await response.json();
    return data.parkings || [];
  } catch (error) {
    console.error('Error getting rental spaces:', error);
    // Fallback to localStorage
    const allSpaces = getLocalRentalSpaces();
    return allSpaces.filter(s => s.ownerId === ownerId);
  }
}

// Get rental space by ID
export async function getRentalSpaceById(spaceId) {
  try {
    const numericId = parseInt(spaceId, 10);
    if (!isNaN(numericId)) {
      const response = await fetch(`${API_BASE_URL}/parking/${numericId}`);
      if (!response.ok) throw new Error('Rental space not found');
      return await response.json();
    }

    const docRef = doc(db, 'rentalSpaces', spaceId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
    throw new Error('Rental space not found');
  } catch (error) {
    console.error('Error getting rental space:', error);
    throw error;
  }
}

// Update rental space
export async function updateRentalSpace(spaceId, updateData) {
  try {
    const numericId = parseInt(spaceId, 10);
    if (!isNaN(numericId)) {
      const response = await fetch(`${API_BASE_URL}/parking/${numericId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to update rental space');
      }
      return spaceId;
    }

    const docRef = doc(db, 'rentalSpaces', spaceId);
    await updateDoc(docRef, updateData);
    return spaceId;
  } catch (error) {
    console.error('Error updating rental space:', error);
    throw error;
  }
}

// Get nearby rental spaces (within 5km)
export async function getNearbyRentalSpaces(userLat, userLng, radiusKm = 5) {
  try {
    const allSpaces = await getAllRentalSpaces();
    const nearbySpaces = allSpaces.filter((space) => {
      const distance = calculateDistance(userLat, userLng, space.latitude, space.longitude);
      return distance <= radiusKm && space.isActive;
    });
    return nearbySpaces.sort((a, b) => {
      const distA = calculateDistance(userLat, userLng, a.latitude, a.longitude);
      const distB = calculateDistance(userLat, userLng, b.latitude, b.longitude);
      return distA - distB;
    });
  } catch (error) {
    console.error('Error getting nearby rental spaces:', error);
    throw error;
  }
}
