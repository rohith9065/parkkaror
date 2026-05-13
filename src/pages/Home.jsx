import React, { useState, useEffect } from 'react';
import { getAllRentalSpaces } from '../services/parkingService';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useLocation } from '../hooks/useLocation';
import ParkingCard from '../components/ParkingCard';
import './Home.css';

// Helper component to recenter map
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 14, { animate: true });
  }, [center, map]);
  return null;
}

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const customMarkerIcon = L.divIcon({
  html: `<div class="premium-marker"><div class="marker-dot"></div><div class="marker-pulse"></div></div>`,
  className: 'custom-div-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const parkingMarkerIcon = (price) => L.divIcon({
  html: `<div class="parking-marker-premium"><span>₹${price}</span></div>`,
  className: 'custom-div-icon',
  iconSize: [50, 30],
  iconAnchor: [25, 30],
});

const rentalMarkerIcon = (price) => L.divIcon({
  html: `<div class="rental-marker-premium"><span>₹${price}</span></div>`,
  className: 'custom-div-icon',
  iconSize: [56, 34],
  iconAnchor: [28, 34],
});

export default function Home({ user, onSelectParking, onNavigate, onLogout }) {
  const { location, loading } = useLocation();
  const [rentalSpaces, setRentalSpaces] = useState([]);
  const [allSpots, setAllSpots] = useState([]);
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListView, setIsListView] = useState(false);

  // Fetch live owner rental spaces from backend with local fallback
  useEffect(() => {
    const fetchRentalSpaces = async () => {
      try {
        const spaces = await getAllRentalSpaces();
        const available = (spaces || []).filter(s => {
          const status = s.availability_status || s.availability || 'available';
          return status !== 'unavailable' && s.is_active !== false && s.isActive !== false;
        });
        const mapped = available.map(s => ({
          ...s,
          pricePerHour: parseFloat(s.system_price_per_hour || s.pricePerHour) || 50,
          availableSlots: parseInt(s.total_slots || s.totalCapacity, 10) || 0,
          totalSlots: parseInt(s.total_slots || s.totalCapacity, 10) || 0,
          latitude: parseFloat(s.latitude),
          longitude: parseFloat(s.longitude),
          source: 'rental',
          rating: 'New',
        }));
        setRentalSpaces(mapped);
      } catch (error) {
        console.warn("Rental spaces fetch error:", error.message);
        setRentalSpaces([]);
      }
    };
    fetchRentalSpaces();
  }, [location]);

  // Combine all spots
  useEffect(() => {
    const combined = [...rentalSpaces];
    setAllSpots(combined);
    setFilteredSpots(combined);
  }, [rentalSpaces]);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredSpots(allSpots);
    } else {
      const filtered = allSpots.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(query.toLowerCase()) ||
          (p.address || '').toLowerCase().includes(query.toLowerCase())
      );
      setFilteredSpots(filtered);
    }
  };

  if (loading) {
    return (
      <div className="home-screen flex-center">
        <div className="loader-container">
          <div className="loader"></div>
          <p>Locating you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-screen fade-in">
      <div className="home-overlay search-overlay glass" style={{ flexDirection: 'column', padding: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>ParkKaror</h2>
          <button 
            onClick={onLogout}
            style={{ 
              background: '#FEE2E2', 
              color: '#EF4444', 
              border: 'none', 
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: '700',
              cursor: 'pointer' 
            }}
          >
            Logout
          </button>
        </div>
        <div className="search-container" style={{ width: '100%' }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Where do you want to park?"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input-premium"
          />
        </div>
      </div>

      <div className="map-view">
        <MapContainer 
          center={location ? [location.latitude, location.longitude] : [28.7041, 77.1025]} 
          zoom={14} 
          className="leaflet-map"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          />
          
          {location && (
            <>
              <RecenterMap center={[location.latitude, location.longitude]} />
              <Marker position={[location.latitude, location.longitude]} icon={customMarkerIcon}>
                <Popup>You are here</Popup>
              </Marker>
            </>
          )}

          {filteredSpots.map((spot) => {
            if (!spot.latitude || !spot.longitude || isNaN(spot.latitude) || isNaN(spot.longitude)) return null;
            const isRental = spot.source === 'rental';
            return (
              <Marker
                key={spot.id}
                position={[spot.latitude, spot.longitude]}
                icon={isRental ? rentalMarkerIcon(spot.pricePerHour) : parkingMarkerIcon(spot.pricePerHour)}
              >
                <Popup>
                  <div className="marker-popup-premium">
                    {isRental && spot.images && spot.images[0] && (
                      <img src={spot.images[0]} alt={spot.name} style={{width:'100%', height:'80px', objectFit:'cover', borderRadius:'8px', marginBottom:'8px'}} />
                    )}
                    <strong>{spot.name}</strong>
                    <p>₹{spot.pricePerHour}/hr</p>
                    {isRental && <span style={{fontSize:'10px', color:'#10B981', fontWeight:'bold'}}>📷 OWNER SPACE</span>}
                    <p style={{fontSize:'11px', color:'#64748B'}}>{spot.availableSlots} slots available</p>
                    <button 
                      className="popup-book-btn"
                      onClick={() => onSelectParking(spot)}
                    >
                      {isRental ? 'Book This Space' : 'View Details'}
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className={`bottom-sheet ${isListView ? 'expanded' : ''}`}>
        <div className="sheet-handle" onClick={() => setIsListView(!isListView)}></div>
        
        <div className="sheet-header">
          <h3>{searchQuery ? `Results for "${searchQuery}"` : 'Nearby Parking Spots'}</h3>
          <span className="results-count">{filteredSpots.length} found</span>
        </div>

        <div className="sheet-scrollable">
          {filteredSpots.length > 0 ? (
            filteredSpots.map((spot) => (
              <ParkingCard
                key={spot.id}
                parking={spot}
                onSelect={(p) => onSelectParking(p)}
              />
            ))
          ) : (
            <div className="empty-state-container">
              <p>No parking found in this area.</p>
              <button 
                className="btn btn-secondary btn-small"
                onClick={() => handleSearch('')}
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="bottom-nav-premium glass">
        <button className="nav-item active" onClick={() => onNavigate('home')}>
          <div className="nav-icon">🏠</div>
          <span>Explore</span>
        </button>
        <button className="nav-item" onClick={() => onNavigate('bookings')}>
          <div className="nav-icon">📅</div>
          <span>Bookings</span>
        </button>
        <button className="nav-item" onClick={() => onNavigate('profile')}>
          <div className="nav-icon">👤</div>
          <span>Account</span>
        </button>
      </nav>
    </div>
  );
}
