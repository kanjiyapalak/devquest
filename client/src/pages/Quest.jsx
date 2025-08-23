import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Quest() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { topic, level, questions: initialQuestions = [], topicId } = state || {};

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // idx -> selected option string
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null); // { passed, earnedXP, progress }
  const [loading, setLoading] = useState(false);
  const [qs, setQs] = useState(initialQuestions);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimStatus, setClaimStatus] = useState(null); // { message, userBadge }

  useEffect(() => {
    // If navigated directly without state, go back to dashboard
    if (!state || !Array.isArray(initialQuestions) || initialQuestions.length === 0) {
      navigate('/home');
    }
  }, [state, initialQuestions, navigate]);

  const current = useMemo(() => qs[index] || {}, [qs, index]);

  const total = qs.length;
  const canPrev = index > 0;
  const canNext = index < total - 1;

  function onSelect(option) {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [index]: option }));
  }

  function goPrev() { if (canPrev) setIndex((i) => i - 1); }
  function goNext() { if (canNext) setIndex((i) => i + 1); }

  async function onSubmit() {
    if (submitted || !topicId) return;
    const correctCount = qs.reduce((acc, q, i) => acc + (answers[i] && String(answers[i]) === String(q.correctAnswer) ? 1 : 0), 0);
    setSubmitted(true);
    try {
      setLoading(true);
      const { data } = await api.post('/user/quests/submit', {
        topicId,
        level,
        correctCount,
        total,
      });
      setResult(data);
    } catch (e) {
      console.error('Submit failed', e);
      setResult({ passed: false });
    } finally {
      setLoading(false);
    }
  }

  const { score, correctCount } = useMemo(() => {
    if (!submitted) return { score: 0, correctCount: 0 };
    let ok = 0;
    qs.forEach((q, i) => {
      if (answers[i] && String(answers[i]) === String(q.correctAnswer)) ok += 1;
    });
    return { correctCount: ok, score: ok * 5 };
  }, [submitted, answers, qs]);

  async function retryLevel() {
    if (!topicId) return;
    try {
      setLoading(true);
      setSubmitted(false);
      setResult(null);
      setAnswers({});
      setIndex(0);
      // regenerate questions for same topic/level (backend uses currentLevel; if not passed, it stays the same)
      const { data } = await api.post('/user/quests/start', { topicId });
      // expect data.questions
      const newQs = Array.isArray(data?.questions) ? data.questions : [];
      setQs(newQs);
    } catch (e) {
      console.error('Retry failed', e);
    } finally {
      setLoading(false);
    }
  }

  // Simple local badge claim to avoid undefined handler; integrate with backend later if needed
  async function claimBadge() {
    try {
      setClaimLoading(true);
  const { data } = await api.post('/user/badges/claim', { topicId });
  setClaimStatus({ userBadge: true, message: data?.alreadyHad ? 'Already claimed' : 'Badge claimed' });
    } catch (e) {
      setClaimStatus({ userBadge: false, message: e?.message || 'Failed to claim badge' });
    } finally {
      setClaimLoading(false);
    }
  }

  // --- Badge icon helpers (consistent with Profile.jsx) ---
  const badgeIconFor = (name = '') => {
    const n = String(name || '').toLowerCase();
    if (/(javascript|js)/.test(n)) return '/badges/js.png';
    if (/(c\+\+|cpp)/.test(n)) return '/badges/cpp.png';
    if (/(python|py)/.test(n)) return '/badges/python.png';
    if (/(css)/.test(n)) return '/badges/css.png';
    if (/(array)/.test(n)) return '/badges/js.png';
    if (/(string)/.test(n)) return '/badges/cpp.png';
    return 'https://dummyimage.com/96x96/7F56D9/ffffff&text=%F0%9F%8F%86';
  };

  const badgeSvgFallback = (name = 'Badge') => {
    const short = (() => {
      const n = String(name || '').toLowerCase();
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f7fb' }}>
      <div style={{ maxWidth: 860, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 6px 24px rgba(16,24,40,0.08)', width: '100%', padding: 24 }}>
        {/* Local styles for badge animation */}
        <style>{`
          @keyframes spin360 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => navigate('/home')} style={{ background: 'transparent', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>← Back</button>
          <div style={{ fontSize: 14, color: '#667085' }}>{topic ? `${topic}` : 'Quest'} • Level {level || 1}</div>
        </div>

        {/* Progress */}
        <div style={{ margin: '8px 0 20px' }}>
          <div style={{ fontSize: 14, color: '#667085', marginBottom: 6 }}>Question {index + 1} of {total}</div>
          <div style={{ height: 8, background: '#eef2f7', borderRadius: 999 }}>
            <div style={{ width: `${total ? ((index + 1) / total) * 100 : 0}%`, height: '100%', background: '#7F56D9', borderRadius: 999, transition: 'width .25s ease' }} />
          </div>
        </div>

        {/* Question Card */}
        <div style={{ border: '1px solid #eef2f7', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{current?.question || '—'}</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {(current?.options || []).map((opt, idx) => {
              const selected = answers[index] === opt;
              const isCorrect = submitted && current?.correctAnswer === opt;
              const isWrong = submitted && selected && !isCorrect;
              return (
                <button
                  key={idx}
                  onClick={() => onSelect(opt)}
                  disabled={submitted}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid',
                    borderColor: isCorrect ? '#12B76A' : isWrong ? '#F04438' : selected ? '#7F56D9' : '#e5e7eb',
                    background: isCorrect ? '#ECFDF3' : isWrong ? '#FEF3F2' : selected ? '#F4EBFF' : '#fff',
                    cursor: submitted ? 'default' : 'pointer',
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>

        {/* Nav + Submit */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <div>
            <button onClick={goPrev} disabled={!canPrev} style={{ marginRight: 8, padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: canPrev ? 'pointer' : 'not-allowed' }}>Previous</button>
            <button onClick={goNext} disabled={!canNext} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: canNext ? 'pointer' : 'not-allowed' }}>Next</button>
          </div>
          <div>
            {!submitted ? (
              <button onClick={onSubmit} style={{ padding: '10px 16px', borderRadius: 8, background: '#7F56D9', color: '#fff', border: 'none', cursor: 'pointer' }}>Submit</button>
            ) : (
              <button onClick={() => navigate('/home')} style={{ padding: '10px 16px', borderRadius: 8, background: '#111827', color: '#fff', border: 'none', cursor: 'pointer' }}>Close</button>
            )}
          </div>
        </div>

        {/* Score */}
        {submitted && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: '#F9FAFB', border: '1px solid #eef2f7' }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Your Result</div>
            <div style={{ color: '#667085' }}>Correct: {correctCount} / {total} • Score: {score} XP</div>
          </div>
        )}

        {/* Modal: pass/fail popup */}
        {submitted && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
            <div style={{ width: 420, background: '#fff', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', padding: 20 }}>
              {result?.passed ? (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Congratulations! 🎉</div>
                  <div style={{ color: '#667085', marginBottom: 16 }}>You passed Level {level}.</div>

                  {/* If topic just completed now, show badge with rotation and claim CTA */}
                  {result?.justCompleted && result?.badge && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                      <img
                        src={(result.badge.imageUrl && result.badge.imageUrl.trim()) ? result.badge.imageUrl : badgeIconFor(result.badge.name)}
                        alt={result.badge.name}
                        style={{ width: 96, height: 96, borderRadius: '50%', animation: 'spin360 2s linear infinite', background: '#EEF2FF', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = badgeSvgFallback(result.badge.name); }}
                      />
                      <div style={{ fontWeight: 700 }}>{result.badge.name}</div>
                      <div style={{ color: '#667085', fontSize: 14, textAlign: 'center' }}>{result.badge.description}</div>
                      {result.userAlreadyHasBadge || claimStatus?.userBadge ? (
                        <div style={{ color: '#12B76A', fontWeight: 600 }}>Badge claimed</div>
                      ) : (
                        <button onClick={claimBadge} disabled={claimLoading} style={{ padding: '10px 14px', borderRadius: 8, background: '#7F56D9', color: '#fff', border: 'none', cursor: 'pointer' }}>
                          {claimLoading ? 'Claiming...' : 'Claim Badge'}
                        </button>
                      )}
                      {claimStatus && !claimStatus.userBadge && (
                        <div style={{ color: '#F04438', fontSize: 12 }}>{claimStatus.message}</div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => navigate('/home')} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>Close</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Not Passed</div>
                  <div style={{ color: '#667085', marginBottom: 16 }}>You are not able to pass to Level {Number(level) + 1}. You can retry this level.</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <button onClick={retryLevel} disabled={loading} style={{ padding: '10px 14px', borderRadius: 8, background: '#7F56D9', color: '#fff', border: 'none', cursor: 'pointer' }}>
                      {loading ? 'Retrying...' : 'Retry'}
                    </button>
                    <button onClick={() => navigate('/home')} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
