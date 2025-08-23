import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import './QuestCard.css';

const QuestCard = ({ topic, progress }) => {
  const safeTotalXP = Number(topic?.totalXP || 0);
  const earnedXP = Number(progress?.totalTopicXP || 0);
  const levelsPassed = Number(progress?.passedLevels || 0);
  const totalLevels = Number(topic?.levels?.length || 0);
  const isCompleted = !!progress?.completed;
  // Consider any earned XP as running so UI reflects partial progress immediately
  const isRunning = !!progress && !isCompleted && (earnedXP > 0 || levelsPassed > 0 || (progress?.currentLevel ?? 1) > 1);

  const getProgressPercentage = () => {
    if (isCompleted) return 100;
    // Prefer XP-based progress for smooth feedback; fallback to levels when totalXP isn't defined
    if (safeTotalXP > 0) {
      return Math.min(100, Math.round((earnedXP / safeTotalXP) * 100));
    }
    if (totalLevels > 0) {
      return Math.min(100, Math.round((levelsPassed / totalLevels) * 100));
    }
    return 0;
  };

  const percent = getProgressPercentage();
  const categoryLabel = (() => {
    const c = String(topic?.category || 'general').toLowerCase();
    if (c === 'dsa') return 'DSA';
    return 'General';
  })();

  function deriveTagFromTitle(title = '') {
    const t = title.toLowerCase();
    const map = [
      { k: 'string', v: 'String' },
      { k: 'strings', v: 'String' },
      { k: 'array', v: 'Array' },
      { k: 'arrays', v: 'Array' },
      { k: 'linked list', v: 'Linked List' },
      { k: 'tree', v: 'Tree' },
      { k: 'graph', v: 'Graph' },
      { k: 'stack', v: 'Stack' },
      { k: 'queue', v: 'Queue' },
      { k: 'hash', v: 'Hash' },
      { k: 'dp', v: 'DP' },
      { k: 'dynamic programming', v: 'DP' },
      { k: 'greedy', v: 'Greedy' },
      { k: 'sorting', v: 'Sorting' },
      { k: 'search', v: 'Searching' },
      { k: 'math', v: 'Math' }
    ];
    for (const { k, v } of map) {
      if (t.includes(k)) return v;
    }
    return null;
  }

  const topicTag = topic?.tag || deriveTagFromTitle(topic?.title) || ((topic?.questionType || 'mcq').toLowerCase() === 'coding' ? 'Coding' : 'MCQ');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    try {
      setLoading(true);
      const qtype = String(topic?.questionType || '').toLowerCase();
      const category = String(topic?.category || '').toLowerCase();
      if (qtype === 'coding' || category === 'dsa') {
        const { data } = await api.post('/user/quests/start-coding', { topicId: topic._id });
        const { quest, level, topicId: tid, topic: tmeta } = data || {};
        if (!quest?.problem) throw new Error('No coding quest generated');
  // Navigate to dedicated code route with preloaded quest in state
  navigate(`/code/${tid}`, { state: { codingQuest: { ...quest, level, topicId: tid, title: tmeta?.title || topic?.title } } });
      } else {
        const { data } = await api.post('/user/quests/start', { topicId: topic._id });
        const { questions, level, topicId, topic: tmeta } = data || {};
        if (!Array.isArray(questions) || questions.length === 0) throw new Error('No questions generated');
        navigate(`/quest/${topicId}`, { state: { topic: tmeta?.title || topic?.title, level, questions, topicId } });
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Unable to start quest';
      alert(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="qc-card">
      <div className="qc-header">
        <h3 className="qc-title">{topic?.title || topic?.name}</h3>
        <p className="qc-desc">{topic?.description}</p>
        <div className="qc-badges">
          <span className="qc-badge category">{categoryLabel}</span>
          <span className="qc-badge tag">{topicTag}</span>
        </div>
      </div>

      <div className="qc-progress">
        <div className="qc-progress-row">
          <span>Progress</span>
          <span>{percent}%</span>
        </div>
        <div className="qc-progress-bar">
          <div className="qc-progress-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <div className="qc-metrics">
        <div className="qc-metric">
          <div className="qc-metric-icon">🏅</div>
          <div className="qc-metric-text">
            <div className="qc-metric-value">{earnedXP}</div>
            <div className="qc-metric-label">XP Earned</div>
          </div>
        </div>

        <div className="qc-metric">
          <div className="qc-metric-icon">📈</div>
          <div className="qc-metric-text">
            <div className="qc-metric-value">{safeTotalXP}</div>
            <div className="qc-metric-label">Total XP</div>
          </div>
        </div>
      </div>

      {isCompleted ? (
        <button
          onClick={() => navigate(`/review/${topic._id}`)}
          className={`qc-button completed`}
        >
          Review Quest
        </button>
      ) : (
        <button
          onClick={handleStart}
          disabled={loading}
          className={`qc-button ${isRunning ? 'continue' : 'start'}`}
        >
          {loading ? 'Preparing…' : isRunning ? 'Continue Quest' : 'Start Quest'}
        </button>
      )}
    </article>
  );
};

export default QuestCard;
