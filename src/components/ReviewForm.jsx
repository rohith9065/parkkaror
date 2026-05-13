import React, { useState } from 'react';
import './ReviewForm.css';

export default function ReviewForm({ title, buttonLabel, onSubmit, onCancel, disabled }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onSubmit({ rating, comment: comment.trim() });
      setComment('');
      setRating(5);
    } catch (submitError) {
      setError(submitError?.message || 'Unable to submit rating.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="review-form-header">
        <h3>{title}</h3>
        {onCancel && (
          <button type="button" className="review-cancel-btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      <div className="review-stars-row">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            type="button"
            key={star}
            className={`review-star ${rating >= star ? 'selected' : ''}`}
            onClick={() => setRating(star)}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write a quick note about your experience (optional)"
        rows={4}
        disabled={submitting || disabled}
      />
      {error && <p className="review-error">{error}</p>}
      <button type="submit" className="review-submit-btn" disabled={submitting || disabled}>
        {submitting ? 'Submitting...' : buttonLabel || 'Submit Rating'}
      </button>
    </form>
  );
}
