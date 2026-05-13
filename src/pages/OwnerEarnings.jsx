import React, { useState, useEffect } from 'react';
import './OwnerEarnings.css';
import { ArrowLeft, TrendingUp, PieChart, Banknote } from 'lucide-react';
import { API_URL } from '../utils/constants';
import { normalizeDateTimeString } from '../utils/helpers';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const OwnerEarnings = ({ user, onBack }) => {
  const [data, setData] = useState({ total: 0, today: 0, week: 0, month: 0, recentBookings: [] });
  const [chartBars, setChartBars] = useState(Array(7).fill(0));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      if (!user?.id) { setIsLoading(false); return; }

      let userId = user.id;
      if (typeof userId === 'string' && userId.includes('_')) {
        const n = parseInt(userId.split('_')[1], 10);
        if (!isNaN(n)) userId = n;
      }

      try {
        const res = await fetch(`${API_URL}/dashboard/${userId}`);
        if (!res.ok) throw new Error('Failed');
        const json = await res.json();

        const bookings = json.bookings || [];
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7); weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const paid = bookings.filter(b =>
          b.payment_status ? b.payment_status === 'paid' : (
            b.status === 'completed' ||
            b.status === 'confirmed'
          )
        );

        const sum = (arr) => arr.reduce((s, b) => s + parseFloat(b.total_price || 0), 0);

        const todayEarnings = sum(paid.filter(b => new Date(normalizeDateTimeString(b.start_time || b.created_at)) >= todayStart));
        const weekEarnings = sum(paid.filter(b => new Date(normalizeDateTimeString(b.start_time || b.created_at)) >= weekStart));
        const monthEarnings = sum(paid.filter(b => new Date(normalizeDateTimeString(b.start_time || b.created_at)) >= monthStart));

        // 7-day bar chart — index 6 = today, 0 = 6 days ago
        const dayTotals = Array(7).fill(0);
        paid.forEach(b => {
          const d = new Date(normalizeDateTimeString(b.start_time || b.created_at));
          const daysAgo = Math.floor((now - d) / 86400000);
          if (daysAgo >= 0 && daysAgo < 7) {
            dayTotals[6 - daysAgo] += parseFloat(b.total_price || 0);
          }
        });
        const maxDay = Math.max(...dayTotals, 1);
        setChartBars(dayTotals.map(v => Math.max(4, Math.round((v / maxDay) * 100))));

        setData({
          total: json.earnings || 0,
          today: todayEarnings,
          week: weekEarnings,
          month: monthEarnings,
          recentBookings: paid.slice(0, 5),
        });
      } catch (err) {
        console.error('Earnings fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEarnings();
    const refreshTimer = setInterval(fetchEarnings, 15000);
    return () => clearInterval(refreshTimer);
  }, [user]);

  const fmt = (n) => Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (isLoading) {
    return (
      <div className="earnings-page">
        <header className="page-header">
          <button className="icon-btn" onClick={onBack}><ArrowLeft size={24} /></button>
          <h1>My Earnings</h1>
          <div style={{ width: 24 }} />
        </header>
        <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading earnings...</div>
      </div>
    );
  }

  return (
    <div className="earnings-page">
      <header className="page-header">
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={24} /></button>
        <h1>My Earnings</h1>
        <div style={{ width: 24 }} />
      </header>

      <div className="earnings-summary">
        <div className="total-balance">
          <p>Total Earnings</p>
          <h2>₹{fmt(data.total)}</h2>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><TrendingUp size={24} color="#eab308" /></div>
          <div className="stat-info">
            <p>Today</p>
            <h4>₹{fmt(data.today)}</h4>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><PieChart size={24} color="#3b82f6" /></div>
          <div className="stat-info">
            <p>This Week</p>
            <h4>₹{fmt(data.week)}</h4>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Banknote size={24} color="#22c55e" /></div>
          <div className="stat-info">
            <p>This Month</p>
            <h4>₹{fmt(data.month)}</h4>
          </div>
        </div>
      </div>

      <div className="revenue-chart-placeholder">
        <h3>7-Day Revenue Trend</h3>
        <div className="chart-box">
          {chartBars.map((h, i) => (
            <div key={i} className="bar" style={{ height: `${h}%` }} title={`Day ${i + 1}`} />
          ))}
        </div>
        <div className="chart-labels">
          {Array(7).fill(0).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return <span key={i}>{DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1]}</span>;
          })}
        </div>
      </div>

      <div className="recent-payouts">
        <h3>Recent Bookings</h3>
        {data.recentBookings.length > 0 ? (
          <div className="payout-list">
            {data.recentBookings.map((b, i) => (
              <div key={i} className="payout-item">
                <div className="payout-info">
                  <span className="payout-date">
                    {new Date(normalizeDateTimeString(b.start_time || b.created_at)).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </span>
                  <span className="payout-id">{b.parkingName || 'Parking Space'} — {b.payment_status}</span>
                </div>
                <span className="payout-amount">₹{fmt(b.total_price || 0)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '20px' }}>
            No completed bookings yet. Earnings will appear here once drivers pay.
          </p>
        )}
      </div>
    </div>
  );
};

export default OwnerEarnings;
