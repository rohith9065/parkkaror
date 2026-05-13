import React from 'react';
import './TrustBadge.css';

export default function TrustBadge({ score }) {
  let level = 'low';
  let label = 'New User';
  
  if (score >= 75) {
    level = 'high';
    label = 'Verified';
  } else if (score >= 50) {
    level = 'medium';
    label = 'Trusted';
  }

  return (
    <div className={`trust-badge trust-${level}`}>
      <span className="badge-icon">✓</span>
      <div className="badge-content">
        <span className="badge-label">{label}</span>
        <span className="badge-score">{score}/100</span>
      </div>
    </div>
  );
}
