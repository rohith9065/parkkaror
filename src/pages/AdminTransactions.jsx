import React from 'react';
import './AdminTransactions.css';
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

const AdminTransactions = ({ user, onBack }) => {
  const transactions = [
    { id: 'TXN-9821', user: 'Rohith K.', amount: '₹120', status: 'Success', date: '24 Mar 2026', type: 'Payment' },
    { id: 'TXN-9820', user: 'Aarav S.', amount: '₹250', status: 'Refund Pending', date: '23 Mar 2026', type: 'Refund Request' },
    { id: 'TXN-9819', user: 'Priya P.', amount: '₹80', status: 'Failed', date: '23 Mar 2026', type: 'Payment' },
    { id: 'TXN-9818', user: 'Suresh M.', amount: '₹100', status: 'Refunded', date: '22 Mar 2026', type: 'Refunded' }
  ];

  return (
    <div className="admin-page">
      <header className="page-header">
        <button className="icon-btn" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1>Transactions Overview</h1>
        <div style={{ width: 24 }}></div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <p>Total Revenue</p>
            <h4 style={{color: 'white'}}>₹8,45,200</h4>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-info">
            <p>Pending Refunds</p>
            <h4 style={{color: '#eab308'}}>₹1,250</h4>
          </div>
        </div>
      </div>

      <h3 className="section-heading">Recent Transactions</h3>
      
      <div className="transaction-list">
        {transactions.map(txn => (
          <div key={txn.id} className="transaction-card">
            <div className="txn-info">
              <div className="txn-header">
                <h4>{txn.user} <span className="txn-type">({txn.type})</span></h4>
                <span className="txn-amount">{txn.amount}</span>
              </div>
              <div className="txn-meta">
                <span className="txn-date">{txn.date} | ID: {txn.id}</span>
              </div>
            </div>
            
            <div className="txn-actions">
              <span className={`txn-status ${txn.status === 'Success' || txn.status === 'Refunded' ? 'success' : txn.status === 'Failed' ? 'failed' : 'pending'}`}>
                {txn.status}
              </span>
              
              {txn.status === 'Refund Pending' && (
                <button className="action-btn process-refund-btn">
                  <RefreshCw size={14} /> Process Refund
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminTransactions;
