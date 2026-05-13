// Calculate distance using Haversine formula
export function calculateDistance(lat1, lon1, lat2, lon2) {
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

// Format distance for display
export function formatDistance(distance) {
  if (distance < 1) {
    return Math.round(distance * 1000) + ' m';
  }
  return distance.toFixed(1) + ' km';
}

// Format price
export function formatPrice(price) {
  return '₹' + price.toFixed(2);
}

export function normalizeDateTimeString(dateTime) {
  if (!dateTime || typeof dateTime !== 'string') return dateTime;
  const trimmed = dateTime.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed.replace(' ', 'T')}Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(trimmed)) {
    return `${trimmed}Z`;
  }
  return trimmed;
}

// Format date
export function formatDate(date) {
  const d = new Date(normalizeDateTimeString(date));
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

// Format time
export function formatTime(time) {
  const d = new Date(normalizeDateTimeString(time));
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Generate time slots from real bookings data (used in driver view)
function parseHour(time, fallback) {
  if (!time) return fallback;
  if (typeof time === 'number') return time;
  const hour = parseInt(String(time).split(':')[0], 10);
  return isNaN(hour) ? fallback : hour;
}

export function generateTimeSlotsForSpace(existingBookings = [], totalCapacity = 1, openTime = '06:00', closeTime = '22:00', alwaysOpen = false) {
  const slots = [];
  const now = new Date();
  const openHour = alwaysOpen ? 0 : parseHour(openTime, 6);
  const closeHour = alwaysOpen ? 24 : parseHour(closeTime, 22);

  for (let day = 0; day < 2; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);

    for (let hour = openHour; hour < closeHour; hour++) {
      const slotTime = new Date(date);
      slotTime.setHours(hour, 0, 0, 0);

      if (slotTime <= now) continue;

      const overlapping = existingBookings.filter(b => {
        const bStart = new Date(normalizeDateTimeString(b.start_time));
        const bEnd = new Date(bStart.getTime() + (b.duration_hours || 1) * 3600000);
        return slotTime >= bStart && slotTime < bEnd;
      }).length;

      const availableCount = Math.max(0, totalCapacity - overlapping);
      slots.push({
        time: slotTime.toISOString(),
        available: availableCount > 0,
        availableCount,
        totalCapacity,
        isBooked: availableCount === 0,
      });
    }
  }

  return slots;
}

