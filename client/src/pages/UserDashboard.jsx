import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import QuestCard from '../components/QuestCard';
import './LandingPage.css';
import './Dashboard.css';

export default function UserDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [running, setRunning] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [remaining, setRemaining] = useState([]);
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

        // Ensure user in state
        await api.get('/user/me').catch(() => {});

        // Fetch global XP from UserGlobalXP
        try {
          const xpRes = await api.get('/user/xp');
          setUserXP(Number(xpRes?.data?.totalXP || 0));
        } catch {}

        const { data } = await api.get('/user/topics/sections');
        setRunning(data.running || []);
        setCompleted(data.completed || []);
        setRemaining(data.remaining || []);
      } catch (err) {
        if (err?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(err?.response?.data?.message || 'Failed to load dashboard');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  // Apply progress update to local state (running/completed/remaining)
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
        // Move to completed if just finished
        if (p.completed) {
          setCompleted((pc) => [{ ...next[idx] }, ...pc]);
          next.splice(idx, 1);
        }
        return next;
      }
      return prev;
    });
    // If not in running, check remaining -> move to running
    setRemaining((prev) => {
      const idx = prev.findIndex(t => String(t._id) === String(topicId));
      if (idx !== -1) {
        const topic = prev[idx];
        setRunning((r) => [{ ...topic, progress: p }, ...r]);
        const next = [...prev];
        next.splice(idx, 1);
        changed = true;
        return next;
      }
      return prev;
    });
    // Optionally refresh Total XP (only increments when a level is passed)
    if (changed && p.passedLevels) {
      api.get('/user/xp').then((xpRes) => setUserXP(Number(xpRes?.data?.totalXP || 0))).catch(() => {});
    }
  };

  // Listen for progress updates dispatched from CodeEditor
  useEffect(() => {
    const onUpdate = (e) => applyProgressUpdate(e?.detail);
    window.addEventListener('devquest:progress-updated', onUpdate);
    // Apply any queued update from sessionStorage (in case event fired before mount)
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
    streakDays: 0,
    completed: completed.length,
  }), [completed]);

  return (
    <div className="db-layout">
      {/* Sidebar */}
      <aside className="db-sidebar">
        <div className="db-brand" onClick={() => navigate('/')}> 
          <div className="logo-icon">⚡</div>
          <span className="logo-text">DevQuest</span>
        </div>
        <nav className="db-nav">
          <button className="db-nav-item active" onClick={() => navigate('/dashboard')}>🏠 Dashboard</button>
          <button className="db-nav-item" onClick={() => navigate('/my-quests')}>📑 My Quests</button>
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
        {/* Hero (reuse LandingPage styles for visual parity) */}
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-badge">
              <span className="badge-icon">✨</span>
              <span>Welcome back{user?.name ? `, ${user.name}` : ''}!</span>
            </div>
            <h1 className="hero-title">Continue your <span className="gradient-text">learning journey</span></h1>
            <p className="hero-description">You have quests waiting for you. Pick up where you left off.</p>

            <div className="hero-metrics">
              <div className="hero-metric"><div className="num">{userXP}</div><div className="lbl">Total XP</div></div>
              <div className="hero-metric"><div className="num">0</div><div className="lbl">Day Streak</div></div>
              <div className="hero-metric"><div className="num">{stats.completed}</div><div className="lbl">Completed</div></div>
            </div>
          </div>
        </section>

        {/* Search panel without filters */}
        <section className="db-search-panel">
          <div className="db-search-box">
            <span className="db-search-icon">🔍</span>
            <input
              className="db-search-input"
              placeholder="Search topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        {/* Sections */}
        <section className="features-section">
          <div className="features-container">
            <h2 className="section-title">Currently Running</h2>
            {loading && <div className="section-subtitle">Loading...</div>}
            {error && <div className="section-subtitle" style={{color: '#ef4444'}}>{error}</div>}
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

        <section className="features-section">
          <div className="features-container">
            <h2 className="section-title">Remaining Quests</h2>
            {!loading && filterBySearch(remaining).length === 0 && (
              <div className="section-subtitle">You're all caught up! 🎉</div>
            )}
            <div className="features-grid">
              {filterBySearch(remaining).map((t) => (
                <QuestCard key={t._id} topic={t} progress={t.progress} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
