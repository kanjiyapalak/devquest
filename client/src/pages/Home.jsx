import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { api } from '../api';
import CodeEditor from './CodeEditor';

const Home = () => {
  const [quest, setQuest] = useState(null);
  const [xpMeta, setXpMeta] = useState({ levelXP: null, xpPerProgram: 5, levelXPEarned: 0 });
  const location = useLocation();
  const params = useParams();
  const storageKey = params?.id ? `dq_codeQuest_${params.id}` : null;

  // Helpers to persist/restore quest between refreshes
  const saveQuest = (topicId, q, meta) => {
    try {
      if (!topicId || !q) return;
      const payload = {
        quest: {
          problem: q.problem || '',
          functionSignatures: q.functionSignatures || {},
          testCases: Array.isArray(q.testCases) ? q.testCases : [],
          level: q.level,
          topicId: q.topicId || topicId,
          title: q.title || '',
          raw: q.raw || '',
        },
        meta: { levelXP: meta?.levelXP ?? null, xpPerProgram: meta?.xpPerProgram ?? 5, levelXPEarned: meta?.levelXPEarned ?? 0 },
        savedAt: Date.now(),
      };
      localStorage.setItem(`dq_codeQuest_${topicId}`, JSON.stringify(payload));
    } catch {}
  };
  const loadQuest = (topicId) => {
    try {
      const raw = localStorage.getItem(`dq_codeQuest_${topicId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.quest || !parsed.quest.problem) return null;
      return parsed;
    } catch { return null; }
  };

  // If navigated from a coding topic, preload the generated quest
  useEffect(() => {
    const preload = location?.state?.codingQuest;
    if (preload) {
      setQuest({ ...preload });
      if (preload.levelXP != null) setXpMeta({ levelXP: preload.levelXP, xpPerProgram: preload.xpPerProgram || 5, levelXPEarned: preload.levelXPEarned || 0 });
      // Persist so refresh restores this exact problem
      saveQuest(preload.topicId || params.id, preload, { levelXP: preload.levelXP, xpPerProgram: preload.xpPerProgram, levelXPEarned: preload.levelXPEarned });
      // Clear state so refresh doesn’t duplicate
      window.history.replaceState({}, document.title);
    }
  }, [location?.state]);

  // If routed to /code/:id without state, generate coding quest on the fly
  useEffect(() => {
    const run = async () => {
      if (quest || !params?.id) return;
        // Try local restore first
        const restored = loadQuest(params.id);
        if (restored) {
          setQuest({ ...restored.quest });
          setXpMeta({ ...restored.meta });
          return;
        }
      try {
        const { data } = await api.post('/user/quests/start-coding', { topicId: params.id });
        if (data?.quest?.problem) {
          setQuest({ ...data.quest, level: data.level, topicId: data.topicId, title: data?.topic?.title });
          setXpMeta({ levelXP: data.levelXP, xpPerProgram: data.xpPerProgram, levelXPEarned: data.levelXPEarned || 0 });
            // Save freshly generated quest
            saveQuest(params.id, { ...data.quest, level: data.level, topicId: data.topicId, title: data?.topic?.title }, { levelXP: data.levelXP, xpPerProgram: data.xpPerProgram, levelXPEarned: data.levelXPEarned || 0 });
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Failed to start coding quest';
        alert(msg);
      }
    };
    run();
  }, [params?.id, quest]);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#ececec' }}>
      
      {/* LEFT - Question Panel */}
      <div style={{ flex: 1, background: 'linear-gradient(135deg,#f4f4f4 80%,#e0e7ff 100%)', padding: '40px 30px', overflowY: 'auto', boxShadow: '2px 0 8px #0001' }}>

        {quest && (
          <div key={JSON.stringify(quest)} style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px #0002', padding: '28px 24px', marginTop: '30px', maxWidth: 700 }}>
            
            {/* 📄 Problem Statement */}
            <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 20, color: '#2b2d42' }}>
              <span role="img" aria-label="doc">📄</span> Problem Statement
            </div>
            {xpMeta && xpMeta.levelXP != null && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ padding: '6px 10px', borderRadius: 999, background: '#ECFDF3', color: '#16A34A', border: '1px solid #A6F4C5', fontWeight: 700 }}>+{xpMeta.xpPerProgram} XP per program</span>
                <span style={{ padding: '6px 10px', borderRadius: 999, background: '#EEF2FF', color: '#4F46E5', border: '1px solid #C7D2FE', fontWeight: 700 }}>Level XP: {xpMeta.levelXPEarned}/{xpMeta.levelXP}</span>
              </div>
            )}
            <div style={{ fontSize: 18, color: '#222', marginBottom: 24, lineHeight: 1.6 }}>
              {quest.problem ? (
                // Preserve newlines from AI so it doesn't appear as a single paragraph
                <div style={{ whiteSpace: 'pre-line' }}>{quest.problem}</div>
              ) : (
                <span style={{ color: '#888', fontStyle: 'italic' }}>No problem statement available.</span>
              )}
            </div>

            {/* 🛠️ Function Signatures (All Languages) */}
            <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 12, color: '#2b2d42' }}>
              <span role="img" aria-label="gear">🛠️</span> Function Signatures
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
              {quest.functionSignatures && Object.keys(quest.functionSignatures).length > 0 ? (
                <>
                  {Object.entries(quest.functionSignatures).map(([lang, signature]) => (
                    <div key={lang} style={{ 
                      background: '#f5f5f7', 
                      padding: '12px 16px', 
                      borderRadius: '10px', 
                      fontFamily: 'monospace', 
                      whiteSpace: 'pre-wrap', 
                      color: '#333' 
                    }}>
                      <strong>{lang}:</strong> {signature}
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ color: '#888', fontStyle: 'italic' }}>
                  No function signatures available.
                </div>
              )}
            </div>

            {/* 📦 Example Test Cases */}
            <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 12, color: '#2b2d42' }}>
              <span role="img" aria-label="box">📦</span> Example Test Cases
            </div>

            {quest.testCases && quest.testCases.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {quest.testCases.map((tc, idx) => (
                  <div key={idx} style={{ background: '#f7f7fa', borderRadius: '10px', padding: '16px 20px', boxShadow: '0 1px 4px #0001' }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '10px' }}>
                      Test Case {idx + 1}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <b>Input:</b>
                      <pre style={{ margin: '6px 0 0', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', whiteSpace: 'pre-wrap' }}>{tc.input}</pre>
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <b>Expected Output:</b>
                      <pre style={{ margin: '6px 0 0', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', whiteSpace: 'pre-wrap' }}>{tc.expected}</pre>
                    </div>
                    {tc.explanation && (
                      <div>
                        <b>Explanation:</b>
                        <div style={{ marginTop: 6, color: '#444', whiteSpace: 'pre-line' }}>{tc.explanation}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <li style={{ color: '#888', fontStyle: 'italic' }}>No test cases available.</li>
            )}
          </div>
        )}
      </div>

  {/* RIGHT - Code Editor */}
  <div style={{ flex: 1.2, padding: '0', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <CodeEditor
          quest={quest}
          onQuestChange={(q) => {
            if (!q) return;
            // Set both quest (for left panel) and xp meta for chips
            setQuest({ ...q });
            if (q.levelXP != null) setXpMeta({ levelXP: q.levelXP, xpPerProgram: q.xpPerProgram || 5, levelXPEarned: q.levelXPEarned || 0 });
            // Persist the newly loaded quest so refresh keeps it
            saveQuest(q.topicId || params.id, q, { levelXP: q.levelXP, xpPerProgram: q.xpPerProgram, levelXPEarned: q.levelXPEarned });
          }}
        />
      </div>
    </div>
  );
};

export default Home;
