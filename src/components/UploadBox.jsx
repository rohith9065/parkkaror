import React from 'react';
import './UploadBox.css';

export default function UploadBox({ title, onUpload, preview }) {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="upload-box">
      <label htmlFor="upload-input" className="upload-label">
        {preview ? (
          <div className="upload-preview">
            <img src={preview} alt={title} />
            <span className="upload-overlay">Change</span>
          </div>
        ) : (
          <div className="upload-placeholder">
            <span className="upload-icon">📸</span>
            <span className="upload-text">{title}</span>
          </div>
        )}
      </label>
      <input
        id="upload-input"
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="upload-input"
      />
    </div>
  );
}
