import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import './LandingPage.css';
import './Dashboard.css';

function Heatmap({ items = [], days = 50 }) {
  // items: [{ date, count }]
  const counts = items.map(i => Number(i.count || 0));
  const max = Math.max(1, ...counts);
  const cols = 10; // 10 x 5 grid for 50 days
  const rows = Math.ceil(days / cols);
  const cell = 14;
  const gap = 4;
  const palette = ['#e8f5e9', '#c8e6c9', '#a5d6a7', '#66bb6a', '#2e7d32'];

  const level = (c) => {
    if (c <= 0) return 0;
    const idx = Math.min(palette.length - 1, Math.ceil((c / max) * (palette.length - 1)));
    return idx;
  };

  const width = cols * cell + (cols - 1) * gap;
  const height = rows * cell + (rows - 1) * gap;

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 10px 20px rgba(16,24,40,0.06)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, color: '#0f172a' }}>Last {days} Days</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 12 }}>
          <span>Less</span>
          {palette.map((p, i) => (
            <span key={i} style={{ width: 14, height: 10, background: p, display: 'inline-block', borderRadius: 3 }} />
          ))}
          <span>More</span>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        <svg width={width} height={height}>
          {items.map((it, idx) => {
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const x = c * (cell + gap);
            const y = r * (cell + gap);
            const lvl = level(Number(it.count || 0));
            const d = new Date(it.date);
            const title = `${d.toDateString()} — ${it.count} submission${Number(it.count) === 1 ? '' : 's'}`;
            return (
              <g key={idx} transform={`translate(${x},${y})`}>
                <rect width={cell} height={cell} rx={3} ry={3} fill={palette[lvl]}>
                  <title>{title}</title>
                </rect>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function Activity() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ activeDays: 0, totalActivities: 0, dailyAverage: 0, currentStreak: 0, bestStreak: 0, lastSubmissionAt: null });
  const [heatmap, setHeatmap] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');

        const [s, h] = await Promise.all([
          api.get('/user/activity/summary'),
          api.get('/user/activity/heatmap?days=50'),
        ]);
        setSummary(s?.data || {});
        setHeatmap((h?.data?.items || []).slice(0, 50));
      } catch (e) {
        if (e?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(e?.response?.data?.message || 'Failed to load activity');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const cards = useMemo(() => ([
    { label: 'Active Days', value: summary.activeDays, bg: '#EEF2FF', color: '#4F46E5' },
    { label: 'Total Activities', value: summary.totalActivities, bg: '#ECFDF3', color: '#16A34A' },
    { label: 'Daily Average', value: Number(summary.dailyAverage || 0).toFixed(1), bg: '#F5F3FF', color: '#7F56D9' },
    { label: 'Current Streak', value: summary.currentStreak, bg: '#FFF7ED', color: '#EA580C' },
  ]), [summary]);

  return (
    <div className="db-layout">
      {/* Sidebar */}
      <aside className="db-sidebar">
        <div className="db-brand" onClick={() => navigate('/')}> 
          <div className="logo-icon">⚡</div>
          <span className="logo-text">DevQuest</span>
        </div>
        <nav className="db-nav">
          <button className="db-nav-item" onClick={() => navigate('/home')}>🏠 Dashboard</button>
          <button className="db-nav-item" onClick={() => navigate('/my-quests')}>📑 My Quests</button>
          <button className="db-nav-item active" onClick={() => navigate('/activity')}>📈 Activity</button>
          <button className="db-nav-item" onClick={() => navigate('/profile')}>👤 Profile</button>
          <button className="db-nav-item" onClick={() => navigate('/help')}>❓ Help & FAQ</button>
        </nav>
        <div className="db-quick">
          <div className="db-quick-title">Highlights</div>
          <div className="db-quick-row"><span>Best Streak</span><b>{summary.bestStreak || 0}</b></div>
          <div className="db-quick-row"><span>Last Submission</span><b>{summary.lastSubmissionAt ? new Date(summary.lastSubmissionAt).toLocaleDateString() : '—'}</b></div>
        </div>
      </aside>

      {/* Main */}
      <main className="db-main">
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-badge">
              <span className="badge-icon">📈</span>
              <span>Your Activity</span>
            </div>
            <h1 className="hero-title">Stay on your <span className="gradient-text">streak</span></h1>
            <p className="hero-description">One submission a day keeps the streak alive. Miss a day and it resets to zero.</p>

            <div className="hero-metrics">
              {cards.map((c, i) => (
                <div className="hero-metric" key={i} style={{ background: '#fff' }}>
                  <div className="num" style={{ color: c.color }}>{c.value}</div>
                  <div className="lbl">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Error */}
        {error && (
          <section className="features-section">
            <div className="features-container">
              <div className="section-subtitle" style={{ color: '#ef4444' }}>{error}</div>
            </div>
          </section>
        )}

        {/* Heatmap */}
        <section className="features-section">
          <div className="features-container">
            <Heatmap items={heatmap} days={50} />
          </div>
        </section>

        {/* Additional info */}
        <section className="features-section">
          <div className="features-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>Streaks</div>
              <div className="section-subtitle">Best Streak: <b>{summary.bestStreak || 0}</b> days</div>
              <div className="section-subtitle">Current Streak: <b>{summary.currentStreak || 0}</b> days</div>
              <div className="section-subtitle">Last Submission: <b>{summary.lastSubmissionAt ? new Date(summary.lastSubmissionAt).toLocaleString() : '—'}</b></div>
            </div>
            <div className="card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <div className="section-title" style={{ marginBottom: 8 }}>How it works</div>
              <ul className="section-subtitle" style={{ lineHeight: 1.9 }}>
                <li>Do at least one submission per day to keep your streak.</li>
                <li>Missing a day resets your streak to 0.</li>
                <li>Submitting quizzes adds to Total Activities; XP is tracked separately.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
