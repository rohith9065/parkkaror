import React, { useState } from 'react';
import './Report.css';

export default function Report({ onBack, onSubmit }) {
  const [formData, setFormData] = useState({
    reportedUserId: '',
    reason: '',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.reportedUserId && formData.reason && formData.description) {
      onSubmit(formData);
      setSubmitted(true);
      setTimeout(() => {
        onBack();
      }, 2000);
    }
  };

  if (submitted) {
    return (
      <div className="report-screen">
        <div className="report-success">
          <div className="success-icon">✓</div>
          <h2>Report Submitted</h2>
          <p>Thank you for reporting. Our team will review it shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-screen">
      <div className="report-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <h1>Report User</h1>
      </div>

      <div className="report-content">
        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-group">
            <label>User ID to Report</label>
            <input
              type="text"
              placeholder="Enter user ID"
              value={formData.reportedUserId}
              onChange={(e) => setFormData({ ...formData, reportedUserId: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Reason for Report</label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              required
            >
              <option value="">Select a reason</option>
              <option value="suspicious">Suspicious Activity</option>
              <option value="fraud">Fraudulent Listing</option>
              <option value="damage">Property Damage</option>
              <option value="harassment">Harassment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Provide details about the issue"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="5"
              required
            />
          </div>

          <div className="report-disclaimer">
            <p>
              ⚠️ Please report only genuine issues. False reports may result in action against your account.
            </p>
          </div>

          <button type="submit" className="btn btn-primary btn-block">
            Submit Report
          </button>
        </form>
      </div>
    </div>
  );
}
