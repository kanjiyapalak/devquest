import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';
import './Dashboard.css';

const faqs = [
  {
    q: 'How do I start a quest?',
    a: 'Go to Dashboard or My Quests, pick a topic card, and click Start/Continue. We will generate MCQs for the current level. You earn 5 XP per correct answer and level up when you reach the level XP.'
  },
  {
    q: 'When do I get XP?',
    a: 'Topic XP and Global XP are added only when you pass a level. Failed attempts remain in Currently Running. Each correct MCQ gives 5 XP toward that level.'
  },
  {
    q: 'How are quests marked Running, Completed, or Remaining?',
    a: 'Running means you have progress but haven\'t completed the topic. Completed is awarded when you finish the final level or total topic XP reaches the topic threshold. Remaining are topics you have not started yet.'
  },
  {
    q: 'How do badges work?',
    a: 'On first-time topic completion, the server returns a badge payload. Click Claim Badge in the modal to store it. If you already claimed it earlier, it will say Already claimed.'
  },
  {
    q: 'Why didn\'t my Global XP increase after a submission?',
    a: 'Global XP increases only when a level is passed. If you failed, your attempt is tracked but XP won\'t increase.'
  },
  {
    q: 'What counts toward activity and streak?',
    a: 'Any quest submission (pass or fail) counts for the day. Streak continues if you submit every day. Missing a day resets the streak to 0. Active Days is the count of unique days you\'ve been active since you started.'
  },
  {
    q: 'Which AI models are used?',
    a: 'MCQs use the Hugging Face OpenAI Router. Coding quests use a Mistral-based model (Nemo Instruct) for generation and simple local runners for evaluation.'
  },
  {
    q: 'I get logged out unexpectedly. What should I do?',
    a: 'If your token expires or is invalid, the app redirects to Login automatically. Log back in and retry.'
  }
];

export default function Help() {
  const navigate = useNavigate();
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

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
          <button className="db-nav-item" onClick={() => navigate('/activity')}>📈 Activity</button>
          <button className="db-nav-item active" onClick={() => navigate('/help')}>❓ Help & FAQ</button>
          <button className="db-nav-item" onClick={handleLogout}>🚪 Logout</button>
        </nav>
        {/* Support quick card removed as requested */}
      </aside>

      <main className="db-main">
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-badge"><span className="badge-icon">❓</span><span>Help & FAQ</span></div>
            <h1 className="hero-title">Frequently Asked Questions</h1>
            <p className="hero-description">Learn how quests, XP, badges, and activity tracking work.</p>
          </div>
        </section>

        <section className="features-section">
          <div className="features-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {faqs.map((f, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, boxShadow: '0 10px 20px rgba(16,24,40,0.06)' }}>
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>{f.q}</div>
                <div style={{ color: '#334155', lineHeight: 1.6 }}>{f.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact/Support form removed per request */}
      </main>
    </div>
  );
}
