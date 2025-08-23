import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import './LandingPage.css';
import './Dashboard.css';

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userXP, setUserXP] = useState(0);
  const [stats, setStats] = useState({ completed: 0, running: 0, completionRate: 0, streak: 0 });
  const [badges, setBadges] = useState({ earned: [], claimable: [] });
  const [xpByTopic, setXpByTopic] = useState([]);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  // Format a nicer display name (Title Case). Fallback to email local-part.
  const displayName = useMemo(() => {
    const raw = (user?.name && String(user.name).trim()) || (user?.email ? String(user.email).split('@')[0] : '') || 'User';
    return raw
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }, [user]);

  // Map a badge name to a friendly icon. This ensures CSS/JS/C++/Python/Array/String look consistent.
  const badgeIconFor = (name = '') => {
    const n = name.toLowerCase();
    if (/(javascript|js)/.test(n)) return '/badges/js.png';
    if (/(c\+\+|cpp)/.test(n)) return '/badges/cpp.png';
    if (/(python|py)/.test(n)) return '/badges/python.png';
    if (/(css)/.test(n)) return '/badges/css.png';
    if (/(array)/.test(n)) return '/badges/js.png'; // array badge: reuse JS style
    if (/(string)/.test(n)) return '/badges/cpp.png'; // string badge: reuse C++ style
    return 'https://dummyimage.com/96x96/7F56D9/ffffff&text=%F0%9F%8F%86';
  };

  // Safe, one-shot SVG fallback to avoid blinking loops when images fail
  const badgeSvgFallback = (name = 'Badge') => {
    const short = (() => {
      const n = name.toLowerCase();
      if (/(javascript|js)/.test(n)) return 'JS';
      if (/(c\+\+|cpp)/.test(n)) return 'C++';
      if (/(python|py)/.test(n)) return 'PY';
      if (/(css)/.test(n)) return 'CSS';
      if (/(array)/.test(n)) return 'ARR';
      if (/(string)/.test(n)) return 'STR';
      return '★';
    })();
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='96' height='96'>
      <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop offset='0' stop-color='#EEF2FF'/><stop offset='1' stop-color='#EDE9FE'/></linearGradient></defs>
      <rect rx='16' ry='16' width='96' height='96' fill='url(#g)' />
      <text x='48' y='56' font-size='28' font-family='Inter,Segoe UI,Arial' text-anchor='middle' fill='#4338CA' font-weight='800'>${short}</text>
    </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  };

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

        // sections => compute completed/running and per-topic XP
        const { data: sections } = await api.get('/user/topics/sections');
        const completed = sections.completed || [];
        const running = sections.running || [];
        setStats(s => ({
          ...s,
          completed: completed.length,
          running: running.length,
          completionRate: (completed.length + running.length) > 0 ? Math.round((completed.length / (completed.length + running.length)) * 100) : 0
        }));

        // Activity for streak
        try {
          const { data: activity } = await api.get('/user/activity/summary');
          setStats(s => ({ ...s, streak: Number(activity?.currentStreak || 0) }));
        } catch {}

        // Badges
        try {
          const { data: b } = await api.get('/user/badges');
          setBadges({ earned: b?.earned || [], claimable: b?.claimable || [] });
        } catch {}

        // XP by Topic (from running + completed progress.totalTopicXP)
        const items = [...running, ...completed]
          .filter(t => t && t.title)
          .map(t => ({ title: t.title, xp: Number(t?.progress?.totalTopicXP || 0), totalXP: Number(t?.totalXP || 0) }))
          .sort((a, b) => b.xp - a.xp);
        setXpByTopic(items);
      } catch (err) {
        if (err?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(err?.response?.data?.message || 'Failed to load profile');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const cards = useMemo(() => ([
    { label: 'Completed Quests', value: stats.completed, color: '#16A34A' },
    { label: 'In Progress', value: stats.running, color: '#3B82F6' },
    { label: 'Completion Rate', value: `${stats.completionRate}%`, color: '#7F56D9' },
    { label: 'Current Streak (days)', value: stats.streak, color: '#EA580C' },
  ]), [stats]);

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
          <button className="db-nav-item active" onClick={() => navigate('/profile')}>👤 Profile</button>
          <button className="db-nav-item" onClick={() => navigate('/activity')}>📈 Activity</button>
          <button className="db-nav-item" onClick={() => navigate('/help')}>❓ Help & FAQ</button>
        </nav>
        <div className="db-quick">
          <div className="db-quick-title">Quick Stats</div>
          <div className="db-quick-row"><span>Total XP:</span><b>{userXP}</b></div>
          <div className="db-quick-row"><span>Streak:</span><b>{stats.streak} days</b></div>
        </div>
      </aside>

      {/* Main */}
      <main className="db-main">
        {error && <div className="section-subtitle" style={{ color: '#ef4444' }}>{error}</div>}
        {/* Header card */}
        <section className="hero-section">
          <div className="hero-container">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
              <div style={{ width: 64, height: 64, borderRadius: 999, background: '#3B82F6', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 26 }}>
                {String(user?.name || 'U').trim().toUpperCase().charAt(0)}
              </div>
              <div>
                <h1 className="hero-title" style={{ marginBottom: 4, letterSpacing: '-0.02em' }}>{displayName}</h1>
                <div style={{ color: '#dbeafe' }}>{user?.email || ''}</div>
              </div>
              <div className="hero-badge" style={{ marginLeft: 'auto' }}>
                <span className="badge-icon">⭐</span>
                <span>{userXP} XP</span>
                <span style={{ margin: '0 6px' }}>•</span>
                <span className="badge-icon">🏅</span>
                <span>{badges.earned.length} Badges</span>
              </div>
            </div>

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

  {/* KPI cards now mirror Activity style inside the hero */}

        {/* Badges */}
        <section className="features-section">
          <div className="features-container">
            <h2 className="section-title">Your Badges</h2>
            {badges.earned.length === 0 && <div className="section-subtitle">No badges yet</div>}
            <div className="features-grid">
              {badges.earned.map((b) => {
                const icon = b.imageUrl && b.imageUrl.trim() ? b.imageUrl : badgeIconFor(b.name);
                return (
                  <div key={b.id} className="qc-card" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
                    <img
                      src={icon}
                      alt={b.name}
                      style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', background: '#EEF2FF' }}
                      onError={(e)=>{ e.currentTarget.onerror = null; e.currentTarget.src = badgeSvgFallback(b.name); }}
                    />
                    <div>
                      <div style={{ fontWeight: 800 }}>{b.name}</div>
                      <div style={{ color: '#64748b' }}>{b.description}</div>
                      {b.earnedAt && <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Earned: {new Date(b.earnedAt).toLocaleDateString()}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
            {badges.claimable.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <h3 className="section-title" style={{ fontSize: 18 }}>Claimable</h3>
                <div className="features-grid">
                  {badges.claimable.map((b) => {
                    const icon = b.imageUrl && b.imageUrl.trim() ? b.imageUrl : badgeIconFor(b.name);
                    return (
                      <div key={b.id} className="qc-card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                        <img
                          src={icon}
                          alt={b.name}
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', background: '#EEF2FF' }}
                          onError={(e)=>{ e.currentTarget.onerror = null; e.currentTarget.src = badgeSvgFallback(b.name); }}
                        />
                        <div>
                          <div style={{ fontWeight: 800 }}>{b.name}</div>
                          <div style={{ color: '#64748b' }}>{b.description}</div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <button className="qc-button" onClick={async () => {
                            try {
                              alert('Open a completed topic to claim its badge.');
                            } catch {}
                          }}>Claim</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* XP by Topic */}
        <section className="features-section">
          <div className="features-container">
            <h2 className="section-title">XP by Topic</h2>
            <div>
              {xpByTopic.map((x) => {
                const pct = x.totalXP > 0 ? Math.min(100, Math.round((x.xp / x.totalXP) * 100)) : 0;
                return (
                  <div key={x.title} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 260, fontWeight: 700 }}>{x.title}</div>
                    <div style={{ flex: 1, height: 10, background: '#f1f5f9', borderRadius: 999 }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: 'linear-gradient(90deg,#3b82f6,#7c3aed)' }} />
                    </div>
                    <div style={{ width: 90, textAlign: 'right', color: '#64748b', fontWeight: 700 }}>{x.xp} XP</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
