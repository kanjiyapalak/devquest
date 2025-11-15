import express from 'express';
import { auth } from '../middleware/auth.js';
import UserGlobalXP from '../models/UserGlobalXP.js';
import UserTopicProgress from '../models/UserTopicProgress.js';
import Topic from '../models/Topic.js';
import Badge from '../models/Badge.js';
import UserBadge from '../models/UserBadge.js';
import UserActivity from '../models/UserActivity.js';
import UserCodingSubmission from '../models/UserCodingSubmission.js';
// Generated quests persistence removed – we no longer store generated MCQ/coding content
import UserMCQSubmission from '../models/UserMCQSubmission.js';
import OpenAI from 'openai';
import { InferenceClient } from '@huggingface/inference';
import dotenv from 'dotenv';
dotenv.config();

const router = express.Router();

// GET /api/user/me - basic profile for logged-in user
router.get('/me', auth, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role || 'user'
    });
  } catch (err) {
    console.error('User /me error:', err);
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// GET /api/user/xp - total XP for logged-in user
router.get('/xp', auth, async (req, res) => {
  try {
    const xpDoc = await UserGlobalXP.findOne({ userId: req.user._id });
    res.json({ totalXP: xpDoc?.totalXP || 0 });
  } catch (err) {
    console.error('XP fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch user XP' });
  }
});

// GET /api/user/topics/sections - running, completed, remaining topics for user
router.get('/topics/sections', auth, async (req, res) => {
  try {
    // All user progress
    const progress = await UserTopicProgress.find({ userId: req.user._id })
      .populate('topicId', 'title description category questionType totalXP levels');

    const running = [];
    const completed = [];
    const progressedTopicIds = new Set();

    for (const p of progress) {
      if (!p.topicId) continue; // in case of dangling refs
      progressedTopicIds.add(String(p.topicId._id));
      // Reconcile completion if admin changed levels/totalXP BEFORE building response
      try {
        const totalLevels = Array.isArray(p.topicId.levels) ? p.topicId.levels.length : 0;
        const shouldBeCompleted = totalLevels > 0
          ? Number(p.passedLevels || 0) >= totalLevels
          : (Number(p.topicId.totalXP || 0) > 0 && Number(p.totalTopicXP || 0) >= Number(p.topicId.totalXP));
        if (!!p.completed !== !!shouldBeCompleted) {
          p.completed = !!shouldBeCompleted;
          if (p.completed) {
            p.completedAt = p.completedAt || new Date();
          } else {
            p.completedAt = null;
            // Re-open at next unpassed level (bounded)
            const next = totalLevels > 0 ? Math.min(Math.max(Number(p.passedLevels || 0) + 1, 1), totalLevels) : Math.max(Number(p.passedLevels || 0) + 1, 1);
            p.currentLevel = next;
          }
          await p.save();
        }
      } catch {}

      const base = {
        _id: p.topicId._id,
        title: p.topicId.title,
        description: p.topicId.description,
        category: p.topicId.category,
        questionType: p.topicId.questionType,
        totalXP: p.topicId.totalXP,
      };
      const withProgress = {
        ...base,
        progress: {
          currentLevel: p.currentLevel,
          totalTopicXP: p.totalTopicXP,
          passedLevels: p.passedLevels,
          completed: p.completed,
        },
      };

      if (p.completed) {
        completed.push(withProgress);
      } else {
        // Consider any existing progress as running (even if level not yet passed)
        running.push(withProgress);
      }
    }

    // Remaining = topics not in user's progress
  const allTopics = await Topic.find({}, 'title description category questionType totalXP');
    const remaining = allTopics
      .filter(t => !progressedTopicIds.has(String(t._id)))
      .map(t => ({
        _id: t._id,
        title: t.title,
        description: t.description,
        category: t.category,
        questionType: t.questionType,
        totalXP: t.totalXP,
      }));

    res.json({ running, completed, remaining });
  } catch (err) {
    console.error('Sections fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch topic sections' });
  }
});

// GET /api/user/quests/:topicId/review - details for a completed or running quest
router.get('/quests/:topicId/review', auth, async (req, res) => {
  try {
    const { topicId } = req.params;
    const topic = await Topic.findById(topicId).lean();
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    let progress = await UserTopicProgress.findOne({ userId: req.user._id, topicId });
    if (!progress) return res.status(404).json({ message: 'No progress for this topic' });
    // Reconcile completion if admin changed levels
    try {
      const totalLevels = Array.isArray(topic.levels) ? topic.levels.length : 0;
      const shouldBeCompleted = totalLevels > 0
        ? Number(progress.passedLevels || 0) >= totalLevels
        : (Number(topic.totalXP || 0) > 0 && Number(progress.totalTopicXP || 0) >= Number(topic.totalXP));
      if (!!progress.completed !== !!shouldBeCompleted) {
        progress.completed = !!shouldBeCompleted;
        if (progress.completed) {
          progress.completedAt = progress.completedAt || new Date();
        } else {
          progress.completedAt = null;
          const next = totalLevels > 0 ? Math.min(Math.max(Number(progress.passedLevels || 0) + 1, 1), totalLevels) : Math.max(Number(progress.passedLevels || 0) + 1, 1);
          progress.currentLevel = next;
        }
        await progress.save();
      }
    } catch {}
    const progressLean = progress.toObject();
    const data = {
      topic: { _id: topic._id, title: topic.title, description: topic.description, totalXP: topic.totalXP, levels: topic.levels || [] },
      progress: {
        currentLevel: progressLean.currentLevel,
        totalTopicXP: progressLean.totalTopicXP,
        passedLevels: progressLean.passedLevels,
        completed: progressLean.completed,
        levels: progressLean.levels || [],
        lastSubmissionAt: progressLean.lastSubmissionAt || null,
        completedAt: progressLean.completedAt || null,
        createdAt: progressLean.createdAt || null,
        updatedAt: progressLean.updatedAt || null
      }
    };
    res.json(data);
  } catch (err) {
    console.error('Quest review error:', err);
    res.status(500).json({ message: 'Failed to fetch quest review' });
  }
});

export default router;

// ========== Quest generation helpers (MCQ via HF router) ==========
async function generateMCQs({ title, description, level, count }) {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) throw new Error('HF_TOKEN is not set');
  const client = new OpenAI({ baseURL: 'https://router.huggingface.co/v1', apiKey: HF_TOKEN });
  const prompt = `
You are a quiz generator. Create ${count} multiple-choice questions (MCQs) for a topic.
Topic Title: ${title}
Level: ${level}
Scope/Description: ${description}

Rules:
- Output strict JSON with this shape only:
{"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":"one of the options exactly"}]} 
- 1 correct answer per question. 4 options per question.
- Keep questions concise and focused on the scope.
- Do NOT include any explanation. No markdown.
`;
  const chat = await client.chat.completions.create({
    model: 'openai/gpt-oss-20b:fireworks-ai',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.4
  });
  const content = chat?.choices?.[0]?.message?.content || '';
  // Debug: print raw AI output for observability
  try {
    console.log('[MCQ AI Raw]', { title, level, count, length: content.length });
    console.log(content);
  } catch {}
  try {
    const parsed = JSON.parse(content);
    const arr = Array.isArray(parsed?.questions) ? parsed.questions : [];
    console.log('[MCQ AI Parsed]', { questions: arr.length });
    return arr
      .filter(q => q && q.question && Array.isArray(q.options) && q.options.length >= 2 && q.correctAnswer)
      .map(q => ({
        question: String(q.question),
        options: q.options.slice(0, 4).map(o => String(o)),
        correctAnswer: String(q.correctAnswer)
      }));
  } catch (e) {
    console.warn('[MCQ AI Parse Fail] falling back to naive parsing', e?.message);
    // Fallback: naive split if model did not follow JSON strictly
    const lines = content.split('\n').filter(Boolean).slice(0, count);
    return lines.map((l, i) => ({
      question: l.replace(/^\d+\.?\s*/, '').slice(0, 140),
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 'A'
    }));
  }
}

function nextLevelFromProgress(topic, progress) {
  if (!progress) return 1;
  const totalLevels = Array.isArray(topic?.levels) ? topic.levels.length : 0;
  const next = Math.max(progress.currentLevel || 1, (progress.passedLevels || 0) + 1);
  return totalLevels > 0 ? Math.min(next, totalLevels) : next;
}

// --- Coding quest generator (level/scope-aware) ---
async function generateCodingQuest({ title, level, scope }) {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) throw new Error('HF_TOKEN is not set');
  // Use OpenAI-compatible HF Router for chat completions (avoids Hub provider mapping lookups)
  const oa = new OpenAI({ baseURL: 'https://router.huggingface.co/v1', apiKey: HF_TOKEN });
  const q = `
Generate a LeetCode-style coding question for the topic "${title}".
Constraints:
- Level: ${level}
- Scope/Description: ${scope || 'General'}

Use EXACTLY this format (no markdown, no backticks):

Problem:
<problem description only, no test cases, no function signature>

Function Signatures:
Python: <python signature>
C++: <c++ signature>
Java: <java signature>

Test Cases:
Input: <input1 in JSON format>
Expected: <expected1 in JSON format>
Explanation: <explanation1>

Input: <input2 in JSON format>
Expected: <expected2 in JSON format>
Explanation: <explanation2>
 
 Input/Output JSON rules:
 - ALWAYS include sizes for arrays/strings/matrices.
   - 1D array: {"n": <length>, "nums": [...]}
   - 2D matrix: {"rows": <R>, "cols": <C>, "matrix": [[...],[...]]}
   - String: {"n": <length>, "s": "..."}
 - ORDER keys in the JSON so sizes appear before data (stdin reading order).
 - Keep all Input and Expected strictly valid JSON. No markdown, no backticks.
`;
  const chat = await oa.chat.completions.create({
    model: 'openai/gpt-oss-120b:together',
    messages: [{ role: 'user', content: q }],
    temperature: 0.25
  });
  let output = chat.choices?.[0]?.message?.content || '';
  output = output.replace(/\*\*/g, '').replace(/`/g, '').trim();
  const problemMatch = output.match(/Problem:\s*([\s\S]*?)(?=\s*Function Signatures:|$)/i);
  const problem = problemMatch ? problemMatch[1].trim() : '';
  let functionSignatures = {};
  const funcSigMatch = output.match(/Function Signatures:([\s\S]*?)(?=\s*Test Cases:|$)/i);
  if (funcSigMatch) {
    const funcSigBlock = funcSigMatch[1].trim();
    const langPatterns = [
      { lang: 'Python', pattern: /Python:\s*(.*?)(?=\s*(?:C\+\+|Java|$))/is },
      { lang: 'CPP', pattern: /C\+\+:?\s*(.*?)(?=\s*(?:Java|Python|$))/is },
      { lang: 'Java', pattern: /Java:\s*(.*?)(?=\s*(?:Python|C\+\+|$))/is }
    ];
    langPatterns.forEach(({ lang, pattern }) => {
      const m = funcSigBlock.match(pattern);
      if (m && m[1]) functionSignatures[lang] = m[1].trim();
    });
  }
  const tcBlock = output.match(/Test Cases:\s*([\s\S]*)/i)?.[1] || '';
  const tcRegex = /Input:\s*(.*?)\nExpected:\s*(.*?)\nExplanation:\s*(.*?)(?=\nInput:|$)/gs;
  let testCases = [];
  let m;
  while ((m = tcRegex.exec(tcBlock)) !== null) {
    testCases.push({ input: m[1].trim(), expected: m[2].trim(), explanation: m[3].trim() });
  }
  // Sanitize test cases: fix size fields (n/rows/cols) and order keys (sizes first)
  function sanitizeInputJsonString(s) {
    try {
      const obj = JSON.parse(s);
      const fixSizes = (o) => {
        const keys = Object.keys(o);
        const out = {};
        const hasNums = Array.isArray(o.nums);
        const hasArr = Array.isArray(o.arr);
        const hasArray = Array.isArray(o.array);
        const hasMatrix = Array.isArray(o.matrix) && Array.isArray((o.matrix[0] || []));
        const hasStr = typeof o.s === 'string';
        if (hasNums) o.n = o.n != null ? Number(o.n) : o.nums.length, o.n = o.nums.length;
        if (hasArr) o.n = o.n != null ? Number(o.n) : o.arr.length, o.n = o.arr.length;
        if (hasArray) o.n = o.n != null ? Number(o.n) : o.array.length, o.n = o.array.length;
        if (hasStr) o.n = o.n != null ? Number(o.n) : o.s.length, o.n = o.s.length;
        if (hasMatrix) {
          o.rows = o.rows != null ? Number(o.rows) : o.matrix.length;
          const firstRow = Array.isArray(o.matrix[0]) ? o.matrix[0] : [];
          o.cols = o.cols != null ? Number(o.cols) : firstRow.length;
          o.rows = o.matrix.length;
          o.cols = firstRow.length;
        }
        const sizeOrder = ['n', 'rows', 'cols'];
        for (const k of sizeOrder) if (k in o) out[k] = o[k];
        for (const k of keys) if (!(k in out)) out[k] = o[k];
        return out;
      };
      const fixed = fixSizes(obj);
      return JSON.stringify(fixed);
    } catch {
      return s;
    }
  }
  const sanitized = testCases.map(tc => ({ input: sanitizeInputJsonString(tc.input), expected: tc.expected, explanation: tc.explanation }));
  // Optional: correct expected outputs for known patterns
  function detectAndFixExpected(problemText, tcArr) {
    const txt = String(problemText || '').toLowerCase();
    const isLongestConsecutive = /longest\s+consecutive/.test(txt);
    const fix = (tc) => {
      const inputStr = sanitizeInputJsonString(tc.input);
      let expectedStr = tc.expected;
      if (isLongestConsecutive) {
        try {
          const obj = JSON.parse(inputStr);
          const nums = Array.isArray(obj.nums) ? obj.nums : (Array.isArray(obj.arr) ? obj.arr : (Array.isArray(obj.array) ? obj.array : []));
          const set = new Set(nums);
          let best = 0;
          for (const x of set) {
            if (!set.has(x - 1)) {
              let cur = x, len = 1;
              while (set.has(cur + 1)) { cur++; len++; }
              if (len > best) best = len;
            }
          }
          expectedStr = JSON.stringify({ ans: best });
        } catch {}
      }
      return { input: inputStr, expected: expectedStr, explanation: tc.explanation };
    };
    return tcArr.map(fix);
  }
  const corrected = detectAndFixExpected(problem, sanitized);
  return { problem, functionSignatures, testCases: corrected, raw: output };
}

// POST /api/user/quests/start  { topicId }
router.post('/quests/start', auth, async (req, res) => {
  try {
    const { topicId } = req.body || {};
    if (!topicId) return res.status(400).json({ message: 'topicId required' });
    const topic = await Topic.findById(topicId).lean();
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    const qtype = (topic.questionType || 'mcq').toLowerCase();
    const category = (topic.category || 'general').toLowerCase();
    if (qtype === 'coding' || category === 'dsa') {
      // Redirect users to coding start endpoint
      return res.status(400).json({ message: 'Use /api/user/quests/start-coding for coding topics' });
    }

    // Load or create progress
    let progress = await UserTopicProgress.findOne({ userId: req.user._id, topicId });
    if (!progress) {
      progress = await UserTopicProgress.create({ userId: req.user._id, topicId, currentLevel: 1, levels: [] });
    }
    const level = nextLevelFromProgress(topic, progress);
    const levelInfo = (topic.levels || []).find(l => Number(l.level) === Number(level)) || { xpRequired: 25, description: topic.description };
    const xp = Number(levelInfo.xpRequired || 25);
    const count = Math.max(1, Math.min(20, Math.round(xp / 5)));

    const questions = await generateMCQs({ title: topic.title, description: levelInfo.description || topic.description, level, count });
    if (!questions?.length) return res.status(500).json({ message: 'Failed to generate questions' });

    // Do not persist generated MCQ content

    return res.json({ topicId, level, xp, questions, topic: { title: topic.title } });
  } catch (err) {
    console.error('Quest start error:', err);
    res.status(500).json({ message: 'Failed to start quest', error: err.message });
  }
});

// POST /api/user/quests/start-coding  { topicId }
router.post('/quests/start-coding', auth, async (req, res) => {
  try {
    const { topicId } = req.body || {};
    if (!topicId) return res.status(400).json({ message: 'topicId required' });
    const topic = await Topic.findById(topicId).lean();
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    const qtype = (topic.questionType || 'coding').toLowerCase();
    if (qtype !== 'coding') return res.status(400).json({ message: 'Not a coding topic' });

    // Load or create progress to decide level
    let progress = await UserTopicProgress.findOne({ userId: req.user._id, topicId });
    if (!progress) progress = await UserTopicProgress.create({ userId: req.user._id, topicId, currentLevel: 1, levels: [] });
    // Reconcile completion/currentLevel if admin changed levels
    try {
      const totalLevels = Array.isArray(topic.levels) ? topic.levels.length : 0;
      const shouldBeCompleted = totalLevels > 0
        ? Number(progress.passedLevels || 0) >= totalLevels
        : (Number(topic.totalXP || 0) > 0 && Number(progress.totalTopicXP || 0) >= Number(topic.totalXP));
      if (!!progress.completed !== !!shouldBeCompleted) {
        progress.completed = !!shouldBeCompleted;
        if (progress.completed) {
          progress.completedAt = progress.completedAt || new Date();
        } else {
          progress.completedAt = null;
          const next = totalLevels > 0 ? Math.min(Math.max(Number(progress.passedLevels || 0) + 1, 1), totalLevels) : Math.max(Number(progress.passedLevels || 0) + 1, 1);
          progress.currentLevel = next;
        }
        await progress.save();
      }
    } catch {}
    const level = nextLevelFromProgress(topic, progress);
    const levelInfo = (topic.levels || []).find(l => Number(l.level) === Number(level)) || { description: topic.description };
    const scope = levelInfo.description || topic.description;

  const quest = await generateCodingQuest({ title: topic.title, level, scope });
    if (!quest?.problem) return res.status(500).json({ message: 'Failed to generate coding quest' });
    // Do not persist generated coding content
  // XP metadata for UI
  const levelInfo2 = (topic.levels || []).find(l => Number(l.level) === Number(level)) || { xpRequired: 25 };
  const levelXP = Number(levelInfo2.xpRequired || 25);
  const xpPerProgram = 5;
  const lvProgress = progress.levels?.find(l => Number(l.level) === Number(level));
  const levelXPEarned = Number(lvProgress?.xpEarned || 0);
  return res.json({ topicId, level, topic: { title: topic.title }, quest, levelXP, xpPerProgram, levelXPEarned });
  } catch (err) {
    console.error('Coding quest start error:', err);
    res.status(500).json({ message: 'Failed to start coding quest', error: err.message });
  }
});

// Removed quests history and item endpoints as generated content is not stored

// POST /api/user/quests/submit  { topicId, level, correctCount, total }
router.post('/quests/submit', auth, async (req, res) => {
  try {
  const { topicId, level, correctCount, total, code, language, isCodingProgram, answers } = req.body || {};
    if (!topicId || !level || total == null || correctCount == null) {
      return res.status(400).json({ message: 'topicId, level, correctCount, total required' });
    }
    const topic = await Topic.findById(topicId);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
  const levelInfo = (topic.levels || []).find(l => Number(l.level) === Number(level)) || { xpRequired: 25 };
  const levelXP = Number(levelInfo.xpRequired || 25);
  const codingSubmission = !!code || !!isCodingProgram;
  const programPassed = Number(correctCount) === Number(total);
  // XP rules: coding -> 5 XP per fully passed program; MCQ -> 5 XP per correct
  const earnedXP = codingSubmission ? (programPassed ? 5 : 0) : Math.max(0, Number(correctCount) * 5);
  // Whether this request causes the level to become passed (after accumulation)
  let levelPassed = false;

    // Update progress
    let progress = await UserTopicProgress.findOne({ userId: req.user._id, topicId });
    if (!progress) {
      progress = await UserTopicProgress.create({ userId: req.user._id, topicId, currentLevel: Number(level) || 1, levels: [] });
    }
  const wasCompleted = !!progress.completed;

    // Update per-level record
    let lv = progress.levels.find(l => Number(l.level) === Number(level));
    if (!lv) {
      progress.levels.push({ level: Number(level), xpEarned: Math.min(levelXP, earnedXP), passed: false });
      lv = progress.levels[progress.levels.length - 1];
    } else {
      lv.xpEarned = Math.min(levelXP, Number(lv.xpEarned || 0) + earnedXP);
    }

    // Record submission entry (audit trail)
    let submissionDoc = null;
    try {
      if (codingSubmission) {
        submissionDoc = await UserCodingSubmission.create({
          userId: req.user._id,
          topicId: topic._id,
          level: Number(level),
          language: language || 'python',
          code: code || '',
          passed: !!programPassed,
          meta: { correctCount, total }
        });
      } else {
        const answersArr = Array.isArray(answers)
          ? answers
          : Object.entries(answers || {}).map(([k, v]) => ({ index: Number(k), selected: String(v) }));
        submissionDoc = await UserMCQSubmission.create({
          userId: req.user._id,
          topicId: topic._id,
          level: Number(level),
          answers: answersArr,
          correctCount: Number(correctCount || 0),
          total: Number(total || 0)
        });
      }
    } catch (e) { console.warn('Submission log failed', e?.message); }

    // Update totals: increment topic XP by earnedXP
    const priorXP = Number(progress.totalTopicXP || 0);
    const newXP = priorXP + earnedXP;
    progress.totalTopicXP = newXP;
    // Mark level passed if this level XP threshold is now met
    if (Number(lv.xpEarned || 0) >= levelXP) {
      lv.passed = true;
      levelPassed = true;
      progress.passedLevels = Math.max(Number(progress.passedLevels || 0), Number(level));
      const totalLevels = Array.isArray(topic.levels) ? topic.levels.length : Number.MAX_SAFE_INTEGER;
      const nextLvl = Math.min(Number(level) + 1, totalLevels);
      progress.currentLevel = nextLvl;
      // Mark completed if last level passed or total XP threshold reached
      if (Number(level) >= totalLevels || (Number(topic.totalXP || 0) > 0 && newXP >= Number(topic.totalXP))) {
        progress.completed = true;
        progress.completedAt = new Date();
      }
    }
    progress.lastSubmissionAt = new Date();
    await progress.save();

    // No linking with generated quests (not stored)

    // Update global XP only if the level just became passed
  if (levelPassed && earnedXP > 0) {
      let gx = await UserGlobalXP.findOne({ userId: req.user._id });
      if (!gx) gx = await UserGlobalXP.create({ userId: req.user._id, totalXP: 0 });
      gx.totalXP = Number(gx.totalXP || 0) + earnedXP;
      await gx.save();
    }

    // Track daily activity (count a submission for today regardless of pass/fail)
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      await UserActivity.findOneAndUpdate(
        { userId: req.user._id, date: startOfDay },
        { $inc: { submissions: 1, xpEarned: Math.max(0, earnedXP) }, $set: { lastUpdated: new Date() } },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.warn('UserActivity upsert failed:', e?.message);
    }

    // Ensure completion matches current topic definition (admin may have changed levels)
    try {
      const totalLevelsNow = Array.isArray(topic.levels) ? topic.levels.length : 0;
      const shouldBeCompletedNow = totalLevelsNow > 0
        ? Number(progress.passedLevels || 0) >= totalLevelsNow
        : (Number(topic.totalXP || 0) > 0 && Number(progress.totalTopicXP || 0) >= Number(topic.totalXP));
      if (!!progress.completed !== !!shouldBeCompletedNow) {
        progress.completed = !!shouldBeCompletedNow;
        if (progress.completed) {
          progress.completedAt = progress.completedAt || new Date();
        } else {
          progress.completedAt = null;
          const next = totalLevelsNow > 0 ? Math.min(Math.max(Number(progress.passedLevels || 0) + 1, 1), totalLevelsNow) : Math.max(Number(progress.passedLevels || 0) + 1, 1);
          progress.currentLevel = next;
        }
        await progress.save();
      }
    } catch {}

    const justCompleted = !wasCompleted && !!progress.completed;
    const tTitle = (topic.title || '').toLowerCase();
    const badgeImage = (() => {
      if (/(javascript|js)/.test(tTitle)) return '/badges/js.png';
      if (/(c\+\+|cpp)/.test(tTitle)) return '/badges/cpp.png';
      if (/(python|py)/.test(tTitle)) return '/badges/python.png';
      if (/(css)/.test(tTitle)) return '/badges/css.png';
      if (/(array)/.test(tTitle)) return '/badges/js.png';
      if (/(string)/.test(tTitle)) return '/badges/cpp.png';
      return 'https://dummyimage.com/96x96/7F56D9/ffffff&text=%F0%9F%8F%86';
    })();
    const badgeName = (() => {
      if (/(javascript|js)/.test(tTitle)) return 'JavaScript Maestro';
      if (/(c\+\+|cpp)/.test(tTitle)) return 'C++ Grandmaster';
      if (/(python|py)/.test(tTitle)) return 'Python Prodigy';
      if (/(css)/.test(tTitle)) return 'CSS3 Stylist';
      if (/(array)/.test(tTitle)) return 'Array Ace';
      if (/(string)/.test(tTitle)) return 'String Specialist';
      return `${topic.title} Champion`;
    })();
  const badge = (justCompleted && progress.completed) ? {
      name: badgeName,
      description: `Completed all levels of ${topic.title}`,
      imageUrl: badgeImage
    } : null;
    // Check if user already has this badge (if a Badge doc exists for this topic)
    let userAlreadyHasBadge = false;
    try {
      const existingBadge = await Badge.findOne({ topic: topic._id });
      if (existingBadge) {
        const ub = await UserBadge.findOne({ user: req.user._id, badge: existingBadge._id });
        userAlreadyHasBadge = !!ub;
      }
    } catch (e) {
      // non-fatal
    }

  // If level not yet passed, consider returning hint to fetch next program (regenerate coding quest)
  const needNextProgram = !levelPassed;

  return res.json({ passed: levelPassed, earnedXP, needNextProgram, progress: {
      currentLevel: progress.currentLevel,
      passedLevels: progress.passedLevels,
      totalTopicXP: progress.totalTopicXP,
      completed: progress.completed,
    }, justCompleted, badge, userAlreadyHasBadge });
  } catch (err) {
    console.error('Quest submit error:', err);
    res.status(500).json({ message: 'Failed to submit quest', error: err.message });
  }
});

// POST /api/user/badges/claim  { topicId }
router.post('/badges/claim', auth, async (req, res) => {
  try {
    const { topicId } = req.body || {};
    if (!topicId) return res.status(400).json({ message: 'topicId required' });
    const topic = await Topic.findById(topicId);
    if (!topic) return res.status(404).json({ message: 'Topic not found' });
    // Ensure topic is currently completed by user (admin might have added levels)
    const progress = await UserTopicProgress.findOne({ userId: req.user._id, topicId });
    if (!progress) return res.status(400).json({ message: 'You have no progress on this topic' });
    const totalLevels = Array.isArray(topic.levels) ? topic.levels.length : 0;
    const shouldBeCompleted = totalLevels > 0
      ? Number(progress.passedLevels || 0) >= totalLevels
      : (Number(topic.totalXP || 0) > 0 && Number(progress.totalTopicXP || 0) >= Number(topic.totalXP));
    if (!shouldBeCompleted) {
      return res.status(400).json({ message: 'Topic is no longer completed. New levels may have been added.' });
    }

    // Map common topics to friendly badge assets
    const topicTitle = (topic.title || '').toLowerCase();
    const iconFor = () => {
      if (/(javascript|js)/.test(topicTitle)) return '/badges/js.png';
      if (/(c\+\+|cpp)/.test(topicTitle)) return '/badges/cpp.png';
      if (/(python|py)/.test(topicTitle)) return '/badges/python.png';
      if (/(css)/.test(topicTitle)) return '/badges/css.png';
      if (/(array)/.test(topicTitle)) return '/badges/js.png';
      if (/(string)/.test(topicTitle)) return '/badges/cpp.png';
      return 'https://dummyimage.com/96x96/7F56D9/ffffff&text=%F0%9F%8F%86';
    };

    // Find or create the Badge for this topic
    let badgeDoc = await Badge.findOne({ topic: topic._id });
    if (!badgeDoc) {
      // Branded, shorter names for common topics
      const brandedName = (() => {
        if (/(javascript|js)/.test(topicTitle)) return 'JavaScript Maestro';
        if (/(c\+\+|cpp)/.test(topicTitle)) return 'C++ Grandmaster';
        if (/(python|py)/.test(topicTitle)) return 'Python Prodigy';
        if (/(css)/.test(topicTitle)) return 'CSS3 Stylist';
        if (/(array)/.test(topicTitle)) return 'Array Ace';
        if (/(string)/.test(topicTitle)) return 'String Specialist';
        return `${topic.title} Champion`;
      })();
      const name = brandedName;
      const description = `Completed all levels of ${topic.title}`;
      const imageUrl = iconFor();
      // Ensure name unique
      badgeDoc = await Badge.findOne({ name });
      if (!badgeDoc) {
        badgeDoc = await Badge.create({ name, description, imageUrl, topic: topic._id });
      }
    }

  // Create UserBadge if not already present
    let userBadge = await UserBadge.findOne({ user: req.user._id, badge: badgeDoc._id });
    const alreadyHad = !!userBadge;
    if (!userBadge) {
      userBadge = await UserBadge.create({ user: req.user._id, badge: badgeDoc._id });
    }

  return res.json({ success: true, alreadyHad, userBadgeId: userBadge._id });
  } catch (err) {
    console.error('Badge claim error:', err);
    res.status(500).json({ message: 'Failed to claim badge', error: err.message });
  }
});

// GET /api/user/badges - list earned badges (and claimable based on completed topics)
router.get('/badges', auth, async (req, res) => {
  try {
    // Determine currently completed topics (after potential admin changes)
    const allProgress = await UserTopicProgress.find({ userId: req.user._id }).populate('topicId', 'levels totalXP').lean();
    const completedProgress = [];
    const completedTopicIds = new Set();
    for (const p of allProgress) {
      if (!p.topicId) continue;
      const totalLevels = Array.isArray(p.topicId.levels) ? p.topicId.levels.length : 0;
      const shouldBeCompleted = totalLevels > 0
        ? Number(p.passedLevels || 0) >= totalLevels
        : (Number(p.topicId.totalXP || 0) > 0 && Number(p.totalTopicXP || 0) >= Number(p.topicId.totalXP));
      if (shouldBeCompleted) {
        completedProgress.push(p);
        completedTopicIds.add(String(p.topicId._id));
      }
    }

    // Earned badges via UserBadge, but only keep ones whose topic is still completed
    const userBadges = await UserBadge.find({ user: req.user._id }).populate('badge').lean();
    const earned = (userBadges || [])
      .filter(ub => ub.badge)
      .filter(ub => {
        // keep if badge has topic linked and it's still completed; if no topic on badge, keep as legacy
        return !ub.badge.topic || completedTopicIds.has(String(ub.badge.topic));
      })
      .map(ub => ({
        id: String(ub.badge._id),
        name: ub.badge.name,
        description: ub.badge.description,
        imageUrl: ub.badge.imageUrl,
        earnedAt: ub.createdAt || ub.updatedAt || null,
      }));

    // Claimable: topics user completed that have a Badge doc but no UserBadge yet
    const topicIds = completedProgress.map(p => p.topicId).filter(Boolean);
    let claimable = [];
    if (topicIds.length) {
      const badges = await Badge.find({ topic: { $in: topicIds } }).lean();
      const earnedIds = new Set(earned.map(e => String(e.id)));
      claimable = badges
        .filter(b => !earnedIds.has(String(b._id)))
        .map(b => ({ id: String(b._id), name: b.name, description: b.description, imageUrl: b.imageUrl }));
    }

    res.json({ count: earned.length, earned, claimable });
  } catch (err) {
    console.error('Badges list error:', err);
    res.status(500).json({ message: 'Failed to fetch badges' });
  }
});

// ===== Activity APIs =====

// GET /api/user/activity/summary
router.get('/activity/summary', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    // All activity docs for user
    const docs = await UserActivity.find({ userId }).sort({ date: 1 }).lean();

    const activeDays = docs.length; // each doc is a day with >= 1 submission
    const totalActivities = docs.reduce((sum, d) => sum + Number(d.submissions || 0), 0);

    // Current streak: consecutive days ending today with submissions >= 1
    const today = new Date();
    const dayKey = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const set = new Set(docs.map(d => new Date(d.date).setHours(0,0,0,0)));
    let streak = 0;
    // streak requires activity today; if none, streak = 0
    let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    while (set.has(cursor.setHours(0,0,0,0))) {
      streak += 1;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
    }

    // Best streak (historical max consecutive days)
    let bestStreak = 0;
    if (docs.length) {
      // Iterate over sorted unique days
      const days = docs.map(d => new Date(d.date).setHours(0,0,0,0)).sort((a,b)=>a-b);
      let current = 1;
      for (let i = 1; i < days.length; i++) {
        const prev = new Date(days[i-1]);
        const expected = new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 1).getTime();
        if (days[i] === expected) current += 1; else { bestStreak = Math.max(bestStreak, current); current = 1; }
      }
      bestStreak = Math.max(bestStreak, current);
    }

    // Daily average over last N days (including zeros)
    const daysWindow = 50;
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (daysWindow - 1));
    const windowMap = new Map();
    for (const d of docs) {
      const t = new Date(d.date);
      if (t >= from) windowMap.set(new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime(), Number(d.submissions || 0));
    }
    let windowTotal = 0;
    for (let i = 0; i < daysWindow; i++) {
      const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i).setHours(0,0,0,0);
      windowTotal += windowMap.get(day) || 0;
    }
    const dailyAverage = daysWindow > 0 ? Number(windowTotal / daysWindow) : 0;

    const lastSubmissionAt = docs.length ? docs[docs.length - 1].lastUpdated : null;

    res.json({ activeDays, totalActivities, dailyAverage, currentStreak: streak, bestStreak, lastSubmissionAt });
  } catch (err) {
    console.error('Activity summary error:', err);
    res.status(500).json({ message: 'Failed to fetch activity summary' });
  }
});

// GET /api/user/activity/heatmap?days=50
router.get('/activity/heatmap', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const days = Math.max(1, Math.min(366, Number(req.query.days || 50)));
    const today = new Date();
    const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
    const docs = await UserActivity.find({ userId, date: { $gte: from } }).lean();
    const map = new Map();
    for (const d of docs) {
      const key = new Date(d.date).setHours(0,0,0,0);
      map.set(key, Number(d.submissions || 0));
    }
    const result = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
      const key = day.setHours(0,0,0,0);
      result.push({ date: new Date(key), count: map.get(key) || 0 });
    }
    res.json({ days, items: result });
  } catch (err) {
    console.error('Activity heatmap error:', err);
    res.status(500).json({ message: 'Failed to fetch activity heatmap' });
  }
});
