  import React, { useState, useEffect } from 'react';
  import ReactMarkdown from 'react-markdown';
  import { api } from '../api';
  import Editor from '@monaco-editor/react';
  import { useNavigate } from 'react-router-dom';

  // Helper function for section parsing
  function parseSection(raw, section) {
    try {
      const regex = new RegExp(section + ':([\s\S]*?)(?=\n[A-Z][a-zA-Z ]+:|$)', 'm');
      const match = raw && raw.match(regex);
      return match ? match[1].trim() : '';
    } catch {
      return '';
    }
  }

  // Helper to parse test cases from raw markdown
  function parseTestCasesFromRaw(raw) {
    if (!raw) return [];
    const tcBlock = raw.match(/Test Cases:([\s\S]*)/i)?.[1] || '';
    const tcRegex = /Input:\s*([\s\S]*?)\nExpected:\s*([\s\S]*?)\nExplanation:\s*([\s\S]*?)(?=\nInput:|$)/g;
    let testCases = [];
    let m;
    while ((m = tcRegex.exec(tcBlock)) !== null) {
      testCases.push({
        input: m[1].trim(),
        expected: m[2].trim(),
        explanation: m[3].trim()
      });
    }
    return testCases;
  }

  const boilerplate = {
    python: `def solution():\n    # Write your code here\n    pass`,
    cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your code here\n    return 0;\n}`,
    java: `public class Main {\n    public static void main(String[] args) {\n        // Write your code here\n    }\n}`
  };

  const CodeEditor = ({ quest, onQuestChange }) => {
    const notifyQuestChange = (q) => {
      try { if (typeof onQuestChange === 'function') onQuestChange(q); } catch {}
    };
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [language, setLanguage] = useState('python');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
    const isDark = theme === 'dark';
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitMsg, setSubmitMsg] = useState('');
    const [badge, setBadge] = useState(null);

    // --- Badge icon helpers (mirror logic from Profile/Quest) ---
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

    // Manage a local quest so we can load next program without reloading the page
    const [currentQuest, setCurrentQuest] = useState(quest);
    useEffect(() => { setCurrentQuest(quest); setResults([]); setActiveTab(0); }, [quest]);

    // Helper to decide if results are detailed (per test case)
  const isDetailedResults = results.length > 0 && typeof results[0] === 'object' && 'input' in results[0];

    // Always get test cases, fallback to parsing from raw if needed
    const testCases = (currentQuest?.testCases && currentQuest.testCases.length > 0)
      ? currentQuest.testCases
      : parseTestCasesFromRaw(currentQuest?.raw);

    // Always get the problem statement, fallback to parsing from raw if needed
    const problemStatement = (currentQuest?.problem && currentQuest.problem.trim())
      ? currentQuest.problem
      : parseSection(currentQuest?.raw, 'Problem') || '';

    useEffect(() => {
      setCode(boilerplate[language]);
    }, [language]);

    const handleRun = async () => {
      setLoading(true);
      try {
        // Ensure testCases inputs/expected are strings (JSON) for backend normalization
        const tcPayload = testCases.map(tc => ({
          input: typeof tc.input === 'string' ? tc.input : JSON.stringify(tc.input),
          expected: typeof tc.expected === 'string' ? tc.expected : JSON.stringify(tc.expected),
          explanation: tc.explanation
        }));
  const response = await api.post('/quest/evaluate', {
          code,
          testCases: tcPayload,
          language
        });
        setResults(response.data.results || []);
      } catch (err) {
        const errorMsg = err?.response?.data?.error || err.message || 'Code execution failed';
        setResults([`❌ Error: ${errorMsg}`]);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // All tests must pass and count must match
  const allPassed = isDetailedResults && testCases.length > 0 && results.length === testCases.length && results.every(r => r && r.passed);

    const handleSubmit = async () => {
      if (!allPassed || submitLoading) return;
      if (!currentQuest?.topicId || !currentQuest?.level) {
        setSubmitMsg('Missing topic or level info.');
        return;
      }
      setSubmitLoading(true);
      setSubmitMsg('');
      try {
        const correctCount = results.filter(r => r && r.passed).length;
        const payload = { topicId: currentQuest.topicId, level: currentQuest.level, correctCount, total: testCases.length, code, language };
        const { data } = await api.post('/user/quests/submit', payload);
        setSubmitMsg(data?.passed ? 'Level passed! Loading next level...' : 'Great! Loading next problem...');
        if (data?.badge) setBadge(data.badge);
        // Emit progress update for dashboard/MyQuests cards
        try {
          const update = { topicId: currentQuest.topicId, progress: data?.progress || {} };
          window.dispatchEvent(new CustomEvent('devquest:progress-updated', { detail: update }));
          sessionStorage.setItem('dq_last_progress_update', JSON.stringify(update));
        } catch {}
        // If completed all levels, stop here; else load next quest
        if (data?.progress?.completed) {
          setSubmitMsg('🎉 Congratulations! You completed all levels.');
        } else {
          // Fetch next quest (level remains the same until level XP threshold reached)
          try {
            const { data: next } = await api.post('/user/quests/start-coding', { topicId: currentQuest.topicId });
            if (next?.quest?.problem) {
              const nextQuest = {
                ...next.quest,
                level: next.level,
                topicId: next.topicId,
                title: next?.topic?.title,
                levelXP: next.levelXP,
                xpPerProgram: next.xpPerProgram,
                levelXPEarned: next.levelXPEarned || 0,
              };
              setCurrentQuest(nextQuest);
              // Inform parent (Home) so problem statement panel updates too
              notifyQuestChange(nextQuest);
              setResults([]);
              setActiveTab(0);
              setCode(boilerplate[language]);
            }
          } catch (e) {
            // non-fatal
          }
        }
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || 'Submission failed';
        setSubmitMsg(msg);
      } finally {
        setSubmitLoading(false);
      }
    };

    // Theming tokens
    const pageBg = isDark ? '#0F172A' : '#F7F8FC';
    const pageFg = isDark ? '#E5E7EB' : '#0f172a';
    const cardBg = isDark ? '#111827' : '#FFFFFF';
    const cardBorder = isDark ? 'rgba(255,255,255,0.06)' : '#e5e7eb';
    const accent = '#4f8cff';

    return (
      <div style={{ backgroundColor: pageBg, color: pageFg, height: '100%', padding: '20px' }}>
        {/* Problem Statement always visible above code editor */}


        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button onClick={() => navigate(-1)} style={{ padding:'6px 10px', borderRadius:8, border:`1px solid ${cardBorder}`, background:cardBg, color:pageFg, cursor:'pointer' }}>← Back</button>
          <h2 style={{ margin: 0 }}>🧪 Code Editor</h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: pageFg }}
            >
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg, color: pageFg }}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>

    {currentQuest && (
          <div style={{ marginBottom: 12, display:'flex', gap: 16, alignItems:'center', flexWrap:'wrap' }}>
      <span style={{ padding:'6px 10px', borderRadius:999, border:`1px solid ${cardBorder}`, background:cardBg }}>Topic: <b>{currentQuest.title || '—'}</b></span>
      <span style={{ padding:'6px 10px', borderRadius:999, border:`1px solid ${cardBorder}`, background:cardBg }}>Level: <b>{currentQuest.level ?? '—'}</b></span>
          </div>
        )}

        <Editor
          height="400px"
          language={language === 'cpp' ? 'cpp' : language}
          value={code}
          theme={isDark ? 'vs-dark' : 'light'}
          onChange={(value) => setCode(value || '')}
          options={{
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoSurround: 'languageDefined',
            bracketPairColorization: { enabled: true },
            fontSize: 16,
            minimap: { enabled: false },
            fontFamily: 'monospace',
          }}
        />

        <div style={{ display:'flex', gap:10, alignItems:'center', marginTop:10 }}>
          <button onClick={handleRun} disabled={loading} style={{ padding: '10px 14px', background: accent, color:'#fff', borderRadius:8, border:'none', fontWeight:700, fontSize:15, boxShadow:'0 6px 14px rgba(79,140,255,.25)' }}>
            {loading ? 'Running...' : 'Run Code'}
          </button>
          <button onClick={handleSubmit} disabled={!allPassed || submitLoading} title={!isDetailedResults ? 'Run code first' : (!allPassed ? 'All tests must pass' : 'Ready to submit')} style={{ padding: '10px 14px', background: allPassed ? '#12B76A' : '#64748B', color:'#fff', borderRadius:8, border:'none', fontWeight:700, fontSize:15, opacity: allPassed ? 1 : .7, cursor: allPassed ? 'pointer' : 'not-allowed' }}>
            {submitLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>

        {/* Test Cases Tabs */}
        <div style={{ marginTop: 38 }}>
          <h3 style={{ color: pageFg, fontWeight:800, fontSize:18, marginBottom:14 }}>🧪 Test Cases</h3>
          {testCases.length > 0 ? (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {testCases.map((tc, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(idx)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 999,
                      border: activeTab === idx ? `2px solid ${accent}` : `1px solid ${cardBorder}`,
                      background: activeTab === idx ? (isDark ? '#0B1220' : '#F7FAFF') : cardBg,
                      color: pageFg,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: activeTab === idx ? `0 2px 8px ${accent}22` : 'none',
                      outline: 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    Case {idx + 1}
                  </button>
                ))}
              </div>
              {/* Test case card */}
              <div style={{
                background: cardBg,
                color: pageFg,
                borderRadius: 12,
                padding: '18px 18px',
                boxShadow: '0 10px 20px rgba(16,24,40,0.10)',
                border: `1px solid ${cardBorder}`,
                minHeight: 140
              }}>
                <div style={{ display:'grid', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#64748B', textTransform:'uppercase', letterSpacing: .4 }}>Input</div>
                    <pre style={{ margin: 6, marginLeft: 0, background: isDark ? '#0B1220' : '#F8FAFC', color: pageFg, padding: '10px 12px', borderRadius: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', whiteSpace: 'pre-wrap', border:`1px solid ${cardBorder}` }}>{testCases[activeTab]?.input}</pre>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#64748B', textTransform:'uppercase', letterSpacing: .4 }}>Expected</div>
                    <pre style={{ margin: 6, marginLeft: 0, background: isDark ? '#0B1220' : '#F8FAFC', color: pageFg, padding: '10px 12px', borderRadius: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', whiteSpace: 'pre-wrap', border:`1px solid ${cardBorder}` }}>{testCases[activeTab]?.expected}</pre>
                  </div>
          {testCases[activeTab] && typeof testCases[activeTab].explanation === 'string' && testCases[activeTab].explanation.trim() && (
                    <div style={{ color: pageFg }}>
                      <div style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#64748B', textTransform:'uppercase', letterSpacing: .4, marginBottom: 6 }}>Explanation</div>
            <div style={{ whiteSpace: 'pre-line' }}>{testCases[activeTab]?.explanation}</div>
                    </div>
                  )}

                  {/* Show results if available */}
                  {isDetailedResults && results[activeTab] && (
                    <div style={{ marginTop: 4, display:'flex', gap: 16, alignItems:'center', flexWrap:'wrap' }}>
                      <div style={{ fontSize: 12, color: isDark ? '#CBD5E1' : '#64748B', textTransform:'uppercase', letterSpacing: .4 }}>Output</div>
                      <code style={{ background: isDark ? '#0B1220' : '#F8FAFC', padding: '6px 8px', borderRadius: 6, border:`1px solid ${cardBorder}` }}>{results[activeTab].output}</code>
                      <span style={{
                        padding:'6px 10px', borderRadius: 999,
                        background: results[activeTab].passed ? (isDark ? '#052E1C' : '#ECFDF3') : (isDark ? '#3B0A06' : '#FEF3F2'),
                        color: results[activeTab].passed ? '#12B76A' : '#F04438',
                        border: `1px solid ${results[activeTab].passed ? (isDark ? '#064E3B' : '#A6F4C5') : (isDark ? '#7A271A' : '#FECDCA')}`
                      }}>
                        {results[activeTab].passed ? 'Passed' : 'Failed'}
                      </span>
                      {results[activeTab].error && <div style={{ color: '#F04438' }}><b>Error:</b> {results[activeTab].error}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: '#888', fontSize: 16, padding: '20px 0', textAlign: 'center' }}>
              No test cases available.
            </div>
          )}
        </div>

        {submitMsg && (
          <div style={{ marginTop:12, color: '#A78BFA' }}>{submitMsg}</div>
        )}

        {/* AI Explanation Section */}
        {currentQuest && (
          <ExplainSection quest={currentQuest} code={code} />
        )}

        {badge && (
          <div style={{ marginTop:16, padding:12, border:`1px solid ${cardBorder}`, borderRadius:10, background:cardBg, display:'flex', gap:12, alignItems:'center' }}>
            <img
              src={(badge.imageUrl && badge.imageUrl.trim()) ? badge.imageUrl : badgeIconFor(badge.name)}
              alt={badge.name}
              style={{ width: 56, height: 56, borderRadius: 12, background:'#EEF2FF', objectFit:'cover' }}
              onError={(e)=>{ e.currentTarget.onerror=null; e.currentTarget.src = badgeSvgFallback(badge.name); }}
            />
            <div>
              <div style={{ fontWeight:700, marginBottom:6 }}>🏆 Badge Unlocked: {badge.name}</div>
              <div style={{ opacity:.9 }}>{badge.description}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- ExplainSection component ---
  const ExplainSection = ({ quest, code }) => {
    const [explanation, setExplanation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Always get a valid problem statement (robust fallback)
    let problemText = (quest?.problem && quest.problem.trim())
      ? quest.problem
      : parseSection(quest?.raw, 'Problem');
    if (!problemText || !problemText.trim()) {
      problemText = quest?.raw || '';
    }
    if (!problemText || !problemText.trim()) {
      problemText = 'No problem statement found.';
    }

    const handleExplain = async () => {
      setLoading(true);
      setError('');
      setExplanation('');
      try {
  const res = await api.post('/quest/explain', {
          code,
          problem: problemText
        });
        if (res.data && res.data.explanation) {
          setExplanation(res.data.explanation);
        } else {
          setError('No explanation could be generated. Please try again.');
        }
      } catch (e) {
        setError(
          e?.response?.data?.error ||
          e.message ||
          'Failed to generate explanation. Please check your connection and try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    return (
      <div style={{ marginTop: 32 }}>
        <button
          style={{ padding: '8px 18px', fontSize: 15, background: '#2b2d42', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', marginBottom: 12, fontWeight:700 }}
          onClick={handleExplain}
        >
          {loading ? 'Explaining...' : 'Explain My Code'}
        </button>

        {error && <div style={{ color: '#ff3c3c', marginBottom: 8 }}>{error}</div>}
        {explanation && (
          <div style={{ background:'#24253a', borderRadius:8, padding:'16px 14px', color:'#d2eaff', fontSize:16, marginTop: 8, boxShadow:'0 1px 8px #0002' }}>
            <ReactMarkdown>{explanation}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  };

  export default CodeEditor;
