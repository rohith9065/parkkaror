import { useState, useEffect } from 'react';

export function useLocation() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          // Use Delhi as default location for demo
          setLocation({
            latitude: 28.7041,
            longitude: 77.1025,
          });
          setError(error.message);
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
      // Use Delhi as default location for demo
      setLocation({
        latitude: 28.7041,
        longitude: 77.1025,
      });
      setLoading(false);
    }
  }, []);

  return { location, error, loading };
}
