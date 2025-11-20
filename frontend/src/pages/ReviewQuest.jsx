import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import './LandingPage.css';
import './Dashboard.css';

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #eef2f7' }}>
      <div style={{ color: '#64748b' }}>{label}</div>
      <div style={{ color: '#0f172a', fontWeight: 600 }}>{value ?? '-'}</div>
    </div>
  );
}

export default function ReviewQuest() {
  const { id } = useParams(); // topicId
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        if (!token) return navigate('/login');
        const { data } = await api.get(`/user/quests/${id}/review`);
        setData(data);
      } catch (e) {
        if (e?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(e?.response?.data?.message || 'Failed to load review');
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const progress = data?.progress;
  const topic = data?.topic;

  function fmt(dt) {
    if (!dt) return '-';
    const d = new Date(dt);
    return d.toLocaleString();
  }

  const totalLvls = Array.isArray(topic?.levels) ? topic.levels.length : 0;

  return (
    <div className="db-layout">
      <aside className="db-sidebar">
        <div className="db-brand" onClick={() => navigate('/')}> 
          <div className="logo-icon">⚡</div>
          <span className="logo-text">DevQuest</span>
        </div>
        <nav className="db-nav">
          <button className="db-nav-item" onClick={() => navigate('/home')}>🏠 Dashboard</button>
          <button className="db-nav-item" onClick={() => navigate('/my-quests')}>📑 My Quests</button>
          <button className="db-nav-item" onClick={() => navigate('/profile')}>👤 Profile</button>
          <button className="db-nav-item" onClick={() => navigate('/activity')}>📈 Activity</button>
          <button className="db-nav-item" onClick={() => navigate('/help')}>❓ Help & FAQ</button>
          <button className="db-nav-item" onClick={handleLogout}>🚪 Logout</button>
        </nav>
      </aside>

      <main className="db-main">
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-badge"><span className="badge-icon">🧾</span><span>Quest Review</span></div>
            <h1 className="hero-title">{topic?.title || 'Quest'}</h1>
            <p className="hero-description">Completion time, level-by-level summary, and total XP.</p>
          </div>
        </section>

        <section className="features-section">
          <div className="features-container">
            {loading && <div className="section-subtitle">Loading...</div>}
            {error && <div className="section-subtitle" style={{ color: '#ef4444' }}>{error}</div>}
            {data && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
                {/* Summary card */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, boxShadow: '0 10px 20px rgba(16,24,40,0.06)' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Overview</div>
                  <InfoRow label="Total Topic XP" value={progress?.totalTopicXP} />
                  <InfoRow label="Levels Passed" value={`${progress?.passedLevels || 0} / ${totalLvls || '-'}`} />
                  <InfoRow label="Current Level" value={progress?.currentLevel} />
                  <InfoRow label="Completed" value={progress?.completed ? 'Yes' : 'No'} />
                  <InfoRow label="Completed At" value={fmt(progress?.completedAt)} />
                  <InfoRow label="Last Submission" value={fmt(progress?.lastSubmissionAt)} />
                  <InfoRow label="First Started" value={fmt(progress?.createdAt)} />
                  <InfoRow label="Last Updated" value={fmt(progress?.updatedAt)} />
                </div>

                {/* Meta card */}
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, boxShadow: '0 10px 20px rgba(16,24,40,0.06)' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Topic</div>
                  <div style={{ color: '#0f172a', fontWeight: 600, marginBottom: 6 }}>{topic?.title}</div>
                  <div style={{ color: '#334155', whiteSpace: 'pre-line' }}>{topic?.description}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {data && (
          <section className="features-section">
            <div className="features-container">
              <h2 className="section-title">Level Details</h2>
              {Array.isArray(progress?.levels) && progress.levels.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                  {progress.levels.sort((a,b)=>a.level-b.level).map((lv) => (
                    <div key={lv.level} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>Level {lv.level}</div>
                        <span className="qc-badge" style={{ background: lv.passed ? '#ECFDF3' : '#FEF3F2', color: lv.passed ? '#027A48' : '#B42318' }}>{lv.passed ? 'Passed' : 'Not Passed'}</span>
                      </div>
                      <div style={{ color: '#334155' }}>Best XP Earned: <b>{lv.xpEarned}</b></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="section-subtitle">No level attempts yet.</div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
