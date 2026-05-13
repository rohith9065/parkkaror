import React, { useState } from 'react';
import './UserManagement.css';
import { ArrowLeft, Search, Shield, UserX, CheckCircle, Mail, Phone } from 'lucide-react';

const UserManagement = ({ user, onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const users = [
    { id: '1', name: 'Rohith Kumar', phone: '9876543210', email: 'rohith@example.com', status: 'Active', trust: 95 },
    { id: '2', name: 'Aarav Sharma', phone: '8765432109', email: 'aarav@example.com', status: 'Blocked', trust: 30 },
    { id: '3', name: 'Priya Patel', phone: '7654321098', email: 'priya@example.com', status: 'Active', trust: 88 }
  ];

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.phone.includes(searchTerm)
  );

  return (
    <div className="admin-page">
      <header className="page-header">
        <button className="icon-btn" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>User Management</h1>
        <div style={{ width: 24 }}></div>
      </header>

      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <Search size={20} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="users-list">
        {filteredUsers.map(u => (
          <div key={u.id} className="admin-card">
            <div className="user-profile-header">
              <div className="user-avatar">{u.name.charAt(0)}</div>
              <div className="user-basic-info">
                <h3>{u.name}</h3>
                <span className={`status-badge ${u.status.toLowerCase()}`}>{u.status}</span>
              </div>
            </div>
            
            <div className="user-contact-details">
              <div className="contact-row">
                <Phone size={14} color="var(--text-secondary)" />
                <span>{u.phone}</span>
              </div>
              <div className="contact-row">
                <Mail size={14} color="var(--text-secondary)" />
                <span>{u.email}</span>
              </div>
              <div className="contact-row">
                <Shield size={14} color="var(--accent-primary)" />
                <span>Trust Score: {u.trust}/100</span>
              </div>
            </div>

            <div className="admin-card-actions">
              {u.status === 'Active' ? (
                <button className="action-btn block-btn">
                  <UserX size={16} /> Block User
                </button>
              ) : (
                <button className="action-btn unblock-btn">
                  <CheckCircle size={16} /> Unblock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;
