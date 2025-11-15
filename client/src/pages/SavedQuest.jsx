import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';

export default function SavedQuest() {
  const navigate = useNavigate();
  const params = useParams();
  const { state } = useLocation();
  const questId = state?.questId || params.id;
  const [quest, setQuest] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (!questId) return;
        const { data } = await api.get(`/user/quests/item/${questId}`);
        setQuest(data);
      } catch (e) {
        setError(e?.response?.data?.message || 'Failed to load quest');
      }
    };
    load();
  }, [questId]);

  const isCoding = quest?.type === 'coding';
  const mcqs = quest?.quest?.mcqQuestions || [];
  const coding = quest?.quest || {};

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f7fb' }}>
      <div style={{ maxWidth: 860, margin: '40px auto', background: '#fff', borderRadius: 12, boxShadow: '0 6px 24px rgba(16,24,40,0.08)', width: '100%', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <button onClick={() => navigate('/my-quests')} style={{ background: 'transparent', border: '1px solid #e5e7eb', padding: '8px 12px', borderRadius: 8, cursor: 'pointer' }}>← Back</button>
          <div style={{ fontSize: 14, color: '#667085' }}>{quest?.title || 'Saved Quest'} • Level {quest?.level}</div>
        </div>
        {error && <div style={{ color: '#ef4444', marginBottom: 12 }}>{error}</div>}

        {isCoding ? (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Problem</div>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>{coding.problem}</pre>
            <div style={{ fontSize: 18, fontWeight: 700, margin: '16px 0 8px' }}>Function Signatures</div>
            <pre style={{ whiteSpace: 'pre-wrap', background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>{
              Object.entries(coding.functionSignatures || {}).map(([k,v]) => `${k}: ${v}`).join('\n')
            }</pre>
            <div style={{ fontSize: 18, fontWeight: 700, margin: '16px 0 8px' }}>Test Cases</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {(coding.testCases || []).map((tc, idx) => (
                <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>Case {idx + 1}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#0f172a' }}>Input: {tc.input}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#0f172a' }}>Expected: {tc.expected}</div>
                  <div style={{ marginTop: 6, color: '#475569' }}>{tc.explanation}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Questions</div>
            {(mcqs || []).length === 0 && <div style={{ color: '#64748b' }}>No questions available</div>}
            <div style={{ display: 'grid', gap: 12 }}>
              {mcqs.map((q, idx) => (
                <div key={idx} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{idx + 1}. {q.question}</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {(q.options || []).map((o, j) => (
                      <li key={j} style={{ color: o === q.correctAnswer ? '#0ea5e9' : '#0f172a' }}>{o}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
