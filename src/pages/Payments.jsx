import React, { useState } from 'react';
import './Payments.css';
import { ArrowLeft, CreditCard, Wallet, Landmark, History, CheckCircle } from 'lucide-react';

const Payments = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('methods');

  const transactions = [
    { id: 'TXN001', date: '2026-03-24', amount: '₹120', status: 'Success', location: 'City Center Parking' },
    { id: 'TXN002', date: '2026-03-22', amount: '₹80', status: 'Success', location: 'Mall Parking' },
    { id: 'TXN003', date: '2026-03-18', amount: '₹150', status: 'Failed', location: 'Airport Parking' },
  ];

  return (
    <div className="payments-page">
      <header className="page-header">
        <button className="icon-btn" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>Payments</h1>
        <div style={{ width: 24 }}></div>
      </header>

      <div className="tabs-container">
        <button 
          className={`tab-btn ${activeTab === 'methods' ? 'active' : ''}`}
          onClick={() => setActiveTab('methods')}
        >
          Payment Methods
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Transaction History
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'methods' && (
          <div className="payment-methods">
            <div className="method-card">
              <div className="method-icon"><CreditCard size={24} color="#EAB308" /></div>
              <div className="method-details">
                <h3>Credit/Debit Card</h3>
                <p>**** **** **** 4242</p>
              </div>
              <CheckCircle size={20} color="#22c55e" />
            </div>
            
            <div className="method-card">
              <div className="method-icon"><Landmark size={24} color="#3b82f6" /></div>
              <div className="method-details">
                <h3>UPI</h3>
                <p>user@upi</p>
              </div>
            </div>

            <div className="method-card">
              <div className="method-icon"><Wallet size={24} color="#a855f7" /></div>
              <div className="method-details">
                <h3>Wallet Balance</h3>
                <p>₹450.00</p>
              </div>
            </div>

            <button className="primary-btn add-method-btn">
              + Add New Payment Method
            </button>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="transaction-list">
            {transactions.map(txn => (
              <div key={txn.id} className="transaction-card">
                <div className="txn-info">
                  <div className="txn-header">
                    <h4>{txn.location}</h4>
                    <span className="txn-amount">{txn.amount}</span>
                  </div>
                  <div className="txn-meta">
                    <span className="txn-date">{txn.date}</span>
                    <span className={`txn-status ${txn.status.toLowerCase()}`}>
                      {txn.status}
                    </span>
                  </div>
                  <div className="txn-id">ID: {txn.id}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Payments;
