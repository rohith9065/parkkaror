import React, { useEffect, useState } from 'react';
import './OwnerManagement.css';
import { ArrowLeft, CheckCircle, FileText, MapPin, XCircle } from 'lucide-react';
import { API_URL } from '../utils/constants';

const OwnerManagement = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('pending');
  const [listings, setListings] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/parking/all`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load listings')))
      .then(data => {
        setListings((data || []).map(space => ({
          id: space.id,
          owner: space.owner_name?.trim() || space.owner_phone || 'Owner',
          location: space.name || space.address,
          slots: space.total_slots || 0,
          status: space.is_active ? 'Active' : 'Pending Verification',
          docs: 'Verified',
        })));
      })
      .catch(() => setListings([]));
  }, []);

  const displayListings = activeTab === 'pending' 
    ? listings.filter(l => l.status === 'Pending Verification')
    : listings.filter(l => l.status === 'Active');

  return (
    <div className="admin-page">
      <header className="page-header">
        <button className="icon-btn" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>Owner & Listing Management</h1>
        <div style={{ width: 24 }}></div>
      </header>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Approval ({listings.filter(l=>l.status==='Pending Verification').length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          Active Listings
        </button>
      </div>

      <div className="users-list">
        {displayListings.map(l => (
          <div key={l.id} className="admin-card">
            <div className="user-profile-header">
              <div className="user-basic-info">
                <h3>{l.location}</h3>
                <span className={`status-badge ${l.status === 'Active' ? 'active' : 'pending'}`}>{l.status}</span>
              </div>
            </div>
            
            <div className="user-contact-details">
              <div className="contact-row">
                <MapPin size={14} color="var(--text-secondary)" />
                <span>Owner: {l.owner}</span>
              </div>
              <div className="contact-row">
                <CheckCircle size={14} color="var(--text-secondary)" />
                <span>Slots: {l.slots}</span>
              </div>
              <div className="contact-row">
                <FileText size={14} color={l.docs === 'Verified' ? "var(--accent-primary)" : "#ef4444"} />
                <span>Documents: {l.docs}</span>
              </div>
            </div>

            {l.status === 'Pending Verification' && (
              <div className="admin-card-actions">
                <button className="action-btn block-btn">
                  <XCircle size={16} /> Reject
                </button>
                <button className="action-btn approve-btn primary-btn">
                  <CheckCircle size={16} /> Approve Listing
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default OwnerManagement;
