import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import QuestCard from '../components/QuestCard';
import './LandingPage.css';
import './Dashboard.css';

function ProgressGraph({ items = [] }) {
  const width = 860; // container width
  const barH = 22;
  const gap = 10;
  const pad = 12;
  const height = items.length * (barH + gap) + pad * 2;
  const labelW = 240;
  const chartW = width - labelW - pad * 2;

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 10px 20px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #eef2f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 800, color: '#0f172a' }}>Progress</div>
        <div style={{ color: '#64748b', fontSize: 12 }}>Percent complete per running topic</div>
      </div>
      {items.length === 0 ? (
        <div style={{ padding: 16, color: '#64748b' }}>No running quests yet</div>
      ) : (
        <svg width={width} height={height} style={{ display: 'block' }}>
          {items.map((it, idx) => {
            const y = pad + idx * (barH + gap);
            const pct = Math.max(0, Math.min(100, Math.round(((it.progress?.totalTopicXP || 0) / (it.totalXP || 1)) * 100)));
            const barW = Math.round((pct / 100) * chartW);
            return (
              <g key={it._id || idx} transform={`translate(${pad}, ${y})`}>
                <text x={0} y={barH - 6} fill="#0f172a" style={{ fontSize: 12, fontWeight: 600 }}>{(it.title || 'Topic').slice(0, 26)}</text>
                <rect x={labelW} y={0} width={chartW} height={barH} fill="#f1f5f9" rx={8} />
                <rect x={labelW} y={0} width={barW} height={barH} fill="#7F56D9" rx={8} />
                <text x={labelW + chartW - 38} y={barH - 6} fill="#64748b" style={{ fontSize: 12 }}>{`${pct}%`}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export default function MyQuests() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [running, setRunning] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [userXP, setUserXP] = useState(0);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');

        await api.get('/user/me').catch(() => {});
        try {
          const xpRes = await api.get('/user/xp');
          setUserXP(Number(xpRes?.data?.totalXP || 0));
        } catch {}

        const { data } = await api.get('/user/topics/sections');
        setRunning(data.running || []);
        setCompleted(data.completed || []);
      } catch (err) {
        if (err?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(err?.response?.data?.message || 'Failed to load quests');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  // Apply progress update to local state (running/completed)
  const applyProgressUpdate = (u) => {
    if (!u || !u.topicId || !u.progress) return;
    const { topicId, progress: p } = u;
    let changed = false;
    // Update in running
    setRunning((prev) => {
      const idx = prev.findIndex(t => String(t._id) === String(topicId));
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], progress: { ...(next[idx].progress || {}), ...p } };
        changed = true;
        // Move to completed if finished
        if (p.completed) {
          setCompleted((pc) => [{ ...next[idx] }, ...pc]);
          next.splice(idx, 1);
        }
        return next;
      }
      return prev;
    });
    // If not in running, move from remaining (not present in MyQuests state)
    if (changed && p.passedLevels) {
      api.get('/user/xp').then((xpRes) => setUserXP(Number(xpRes?.data?.totalXP || 0))).catch(() => {});
    }
  };

  useEffect(() => {
    const onUpdate = (e) => applyProgressUpdate(e?.detail);
    window.addEventListener('devquest:progress-updated', onUpdate);
    try {
      const raw = sessionStorage.getItem('dq_last_progress_update');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.topicId) applyProgressUpdate(parsed);
        sessionStorage.removeItem('dq_last_progress_update');
      }
    } catch {}
    return () => window.removeEventListener('devquest:progress-updated', onUpdate);
  }, []);

  const filterBySearch = (list) => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((t) =>
      (t.title || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q)
    );
  };

  const stats = useMemo(() => ({
    completed: completed.length,
    running: running.length,
  }), [completed, running]);

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
          <button className="db-nav-item active" onClick={() => navigate('/my-quests')}>📑 My Quests</button>
          <button className="db-nav-item" onClick={() => navigate('/profile')}>👤 Profile</button>
          <button className="db-nav-item" onClick={() => navigate('/activity')}>📈 Activity</button>
          <button className="db-nav-item" onClick={() => navigate('/help')}>❓ Help & FAQ</button>
        </nav>
        <div className="db-quick">
          <div className="db-quick-title">Quick Stats</div>
          <div className="db-quick-row"><span>Total XP</span><b>{userXP}</b></div>
          <div className="db-quick-row"><span>Completed</span><b>{stats.completed}</b></div>
        </div>
      </aside>

      {/* Main content */}
      <main className="db-main">
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-badge">
              <span className="badge-icon">📑</span>
              <span>My Quests</span>
            </div>
            <h1 className="hero-title">Track your <span className="gradient-text">progress</span></h1>
            <p className="hero-description">See your current and completed quests with a quick progress view.</p>

            <div className="hero-metrics">
              <div className="hero-metric"><div className="num">{userXP}</div><div className="lbl">Total XP</div></div>
              <div className="hero-metric"><div className="num">{stats.running}</div><div className="lbl">Running</div></div>
              <div className="hero-metric"><div className="num">{stats.completed}</div><div className="lbl">Completed</div></div>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="db-search-panel">
          <div className="db-search-box">
            <span className="db-search-icon">🔎</span>
            <input className="db-search-input" placeholder="Search my quests..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </section>

        {/* Progress graph */}
        <section className="features-section">
          <div className="features-container">
            <ProgressGraph items={filterBySearch(running)} />
          </div>
        </section>

        {/* Running */}
        <section className="features-section">
          <div className="features-container">
            <h2 className="section-title">Currently Running</h2>
            {loading && <div className="section-subtitle">Loading...</div>}
            {error && <div className="section-subtitle" style={{ color: '#ef4444' }}>{error}</div>}
            {!loading && filterBySearch(running).length === 0 && (
              <div className="section-subtitle">No running quests</div>
            )}
            <div className="features-grid">
              {filterBySearch(running).map((t) => (
                <QuestCard key={t._id} topic={t} progress={t.progress} />
              ))}
            </div>
          </div>
        </section>

        {/* Completed */}
        <section className="features-section">
          <div className="features-container">
            <h2 className="section-title">Completed Quests</h2>
            {!loading && filterBySearch(completed).length === 0 && (
              <div className="section-subtitle">No completed quests yet</div>
            )}
            <div className="features-grid">
              {filterBySearch(completed).map((t) => (
                <QuestCard key={t._id} topic={t} progress={t.progress} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
