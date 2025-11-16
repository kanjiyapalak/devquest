// server/routes/ai.js
import express from 'express';
import dotenv from 'dotenv';
import os from 'os';
import { InferenceClient } from '@huggingface/inference';
import OpenAI from 'openai';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

dotenv.config();
const router = express.Router();
const MODEL = 'openai/gpt-oss-120b:together';
const HF_TOKEN = process.env.HF_TOKEN;

router.post('/generate', async (req, res) => {
  let { prompt } = req.body;
  if (!prompt?.trim()) prompt = 'Create a basic coding question with signature and 2 test cases.';

  const q = `
You are an expert competitive programming problem setter.
TASK: Generate ONE high-quality, LeetCode / Codeforces style coding problem about "${prompt}" and a SMALL, ACCURATE test set.

STRICT OUTPUT FORMAT (no extra sections, no markdown, no numbering):
Problem:
<concise problem statement only>

Function Signatures:
Python: <python function signature using snake_case>
C++: <C++ function signature ONLY (inside a function, NOT full program)>
Java: <public method signature ONLY (NOT a whole class)>

Test Cases:
Input: <input JSON 1>
Expected: <expected JSON 1>
Explanation: <why expected is correct>

Input: <input JSON 2>
Expected: <expected JSON 2>
Explanation: <why expected is correct>

Input: <input JSON 3>
Expected: <expected JSON 3>
Explanation: <why expected is correct>

REQUIREMENTS & VALIDATION RULES (follow EXACTLY):
1. Produce EXACTLY 3 test cases: (a) edge/minimal, (b) typical, (c) challenging/complex.
2. Every Expected MUST be the TRUE result of applying the problem logic to the Input.
3. Double‑check each Expected BEFORE output: recompute mentally; if mismatch, FIX it.
4. JSON rules:
  - Valid strict JSON: double quotes, no comments, no trailing commas, no NaN/Infinity.
  - Arrays / matrices MUST include explicit sizes first when natural in CP style:
     1D: {"n": <len>, "nums": [...]}
     2D: {"rows": <R>, "cols": <C>, "matrix": [[...],[...]]}
     String (if length relevant): {"n": <len>, "s": "..."}
  - Order keys: all size fields first (n / rows / cols), then data containers, then scalars/parameters.
5. NO full solution, NO hints about algorithmic approach—just the problem statement and required sections.
6. Problem statement MUST define:
  - Input description (implicitly via JSON fields naming)
  - Required output (singular or structured) unambiguously.
  - Constraints: provide realistic numeric constraints (NOT huge; ensure test cases respect them).
7. If the task is about counting / optimizing, Expected must be an object like {"ans": value} unless naturally multidimensional.
8. If multiple outputs are needed, wrap them in a JSON object with clear key names (never raw arrays as top-level unless the ONLY output is an array).
9. NEVER fabricate impossible conditions; ensure test cases are consistent with constraints.
10. NO markdown, no backticks, no extraneous commentary.

SELF-CHECK BEFORE FINALIZING (do NOT output this checklist):
- Did I recompute each Expected from the Input logically?
- Do sizes match array/matrix/string lengths?
- Are edge case and complex case meaningful (NOT trivial permutations)?
- Are constraints consistent with test data?

Return ONLY the required sections. Absolutely no extra text.
`;

  try {
  const oa = new OpenAI({ baseURL: 'https://router.huggingface.co/v1', apiKey: HF_TOKEN });
  const chat = await oa.chat.completions.create({ model: MODEL, messages: [{ role: 'user', content: q }], temperature: 0.3 });

  let output = chat.choices[0].message.content;
    console.log('🧠 AI Output:', output);

    output = output.replace(/\*\*/g, '').replace(/`/g, '').trim();

    // Parse problem statement
    const problemMatch = output.match(/Problem:\s*([\s\S]*?)(?=\s*Function Signatures:|$)/i);
    const problem = problemMatch ? problemMatch[1].trim() : '';

    // Parse function signatures
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
        const match = funcSigBlock.match(pattern);
        if (match && match[1]) {
          functionSignatures[lang] = match[1].trim();
        }
      });
    }

    console.log('Parsed function signatures:', functionSignatures);

    const tcBlock = output.match(/Test Cases:\s*([\s\S]*)/i)?.[1] || '';
    const tcRegex = /Input:\s*(.*?)\nExpected:\s*(.*?)\nExplanation:\s*(.*?)(?=\nInput:|$)/gs;

    let testCases = [];
    let m;
    while ((m = tcRegex.exec(tcBlock)) !== null) {
      testCases.push({
        input: m[1].trim(),
        expected: m[2].trim(),
        explanation: m[3].trim()
      });
    }

    // Sanitize test cases: fix size fields and key order
    function sanitizeInputJsonString(s) {
      try {
        const obj = JSON.parse(s);
        const fixSizes = (o) => {
          const keys = Object.keys(o);
          const out = {};
          // Detect and fix sizes
          const hasNums = Array.isArray(o.nums);
          const hasArr = Array.isArray(o.arr);
          const hasArray = Array.isArray(o.array);
          const hasMatrix = Array.isArray(o.matrix) && Array.isArray(o.matrix[0] || []);
          const hasStr = typeof o.s === 'string';
          if (hasNums) o.n = o.n != null ? Number(o.n) : o.nums.length, o.n = o.nums.length;
          if (hasArr) o.n = o.n != null ? Number(o.n) : o.arr.length, o.n = o.arr.length;
          if (hasArray) o.n = o.n != null ? Number(o.n) : o.array.length, o.n = o.array.length;
          if (hasStr) o.n = o.n != null ? Number(o.n) : o.s.length, o.n = o.s.length;
          if (hasMatrix) {
            o.rows = o.rows != null ? Number(o.rows) : (o.matrix.length);
            const firstRow = Array.isArray(o.matrix[0]) ? o.matrix[0] : [];
            o.cols = o.cols != null ? Number(o.cols) : (firstRow.length);
            o.rows = o.matrix.length;
            o.cols = firstRow.length;
          }
          // Order: sizes first then others in original order
          const sizeOrder = ['n', 'rows', 'cols'];
          for (const k of sizeOrder) if (k in o) out[k] = o[k];
          for (const k of keys) if (!(k in out)) out[k] = o[k];
          return out;
        };
        const fixed = fixSizes(obj);
        return JSON.stringify(fixed);
      } catch {
        return s; // leave as-is if not JSON
      }
    }

    // Optional pattern-based expected correction (e.g., Longest Consecutive Sequence)
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
            // compute length of longest consecutive sequence
            const set = new Set(nums);
            let best = 0;
            for (const x of set) {
              if (!set.has(x - 1)) {
                let cur = x, len = 1;
                while (set.has(cur + 1)) { cur++; len++; }
                if (len > best) best = len;
              }
            }
            const fixed = { ans: best };
            expectedStr = JSON.stringify(fixed);
          } catch {}
        }
        return { input: inputStr, expected: expectedStr, explanation: tc.explanation };
      };
      return tcArr.map(fix);
    }

    const sanitized = detectAndFixExpected(problem, testCases);

    res.json({ problem, functionSignatures, testCases: sanitized, raw: output });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});





// Removed /explain endpoint as per request

// ...existing code...
router.post('/evaluate', async (req, res) => {
  const { code, language, testCases } = req.body;
  if (!code || !language || !testCases?.length) return res.status(400).json({ error: 'Missing inputs' });

  const id = Date.now(), dir = os.tmpdir();
  let results = [];
  const { exec, spawn } = await import('child_process');
  const runWithStdin = (cmdArr, stdinData, cwd = undefined) => new Promise((resolve) => {
    const proc = spawn(cmdArr[0], cmdArr.slice(1), { cwd });
    let out = '', err = '';
    proc.stdout.on('data', d => { out += d.toString(); });
    proc.stderr.on('data', d => { err += d.toString(); });
    proc.on('close', code => {
      resolve({ output: out, error: code === 0 ? null : err || `Exited with code ${code}` });
    });
    proc.stdin.write(stdinData);
    proc.stdin.end();
  });

  // Helper: recursively flatten JSON to stdin-friendly lines
  function flattenToLines(value) {
    // Scalars
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'boolean') return [value ? 'true' : 'false'];
      if (value === null) return ['null'];
      return [String(value)];
    }
    // Arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return [''];
      // If any element is an array, emit each child as its own line
      const hasNestedArray = value.some((v) => Array.isArray(v));
      if (hasNestedArray) {
        const lines = [];
        for (const item of value) {
          const child = flattenToLines(item);
          // If child has multiple lines, keep them as separate lines
          if (child.length === 1) lines.push(child[0]);
          else lines.push(...child);
        }
        return lines;
      }
      // 1D array => join by space
      return [value.map((v) => (Array.isArray(v) ? JSON.stringify(v) : String(v))).join(' ')];
    }
    // Objects => preserve key insertion order, each top-level value on its own line
    const lines = [];
    for (const key of Object.keys(value)) {
      const child = flattenToLines(value[key]);
      // If array-like multi-line, append as multiple lines, else single line
      if (child.length === 1) lines.push(child[0]);
      else lines.push(...child);
    }
    return lines;
  }

  // Heuristic sanitizer for non-JSON array strings like "{1, 2, 3}" or "{{1,2},{3,4}}"
  function sanitizeLooseArrayString(str) {
    if (typeof str !== 'string') return '';
    let s = str.trim();
    // Handle nested initializer lists: replace '},{' with newline to separate rows
    if (/\{\s*\{/.test(s)) {
      // Remove outermost braces if paired
      if (s.startsWith('{') && s.endsWith('}')) s = s.slice(1, -1);
      s = s.replace(/}\s*,\s*{/g, '\n');
      // Remove any remaining braces/brackets and commas -> spaces
      s = s.replace(/[\[\]{}]/g, '').replace(/[,:;]/g, ' ');
      // Normalize whitespace per line
      s = s
        .split(/\n+/)
        .map(line => line.trim().replace(/\s+/g, ' '))
        .join('\n');
      return s;
    }
    // Flat list in braces or brackets -> single line of numbers
    s = s.replace(/[\[\]{}]/g, '').replace(/[,:;]/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function formatInputForStdin(input) {
    try {
      const parsed = typeof input === 'string' ? JSON.parse(input) : input;
      return flattenToLines(parsed).join('\n');
    } catch {
      // Not JSON: attempt to sanitize common C++/text array formats
      return sanitizeLooseArrayString(String(input ?? ''));
    }
  }

  // Normalize expected values: if JSON, apply same flattening so user can print tokens/lines
  function normalizeExpected(expected) {
    try {
      const parsed = typeof expected === 'string' ? JSON.parse(expected) : expected;
      return flattenToLines(parsed).join('\n').trim();
    } catch {
      // Try loose sanitizer fallback
      return sanitizeLooseArrayString(String(expected ?? '')).trim();
    }
  }

  // Normalize output for comparison: if JSON, flatten like expected; else trim/canonicalize newlines
  function normalizeOutput(out) {
    const s = String(out ?? '').replace(/\r\n/g, '\n').trim();
    // Try to parse as JSON to allow users printing arrays/objects
    try {
      const parsed = JSON.parse(s);
      return flattenToLines(parsed).join('\n').trim();
    } catch {
      return s;
    }
  }

  for (let tc of testCases) {
    let file = '', ex = '', className = '', cmdArr = [], cleanup = [];
    // Convert JSON input to stdin string for code runner
    let inputStr = formatInputForStdin(tc.input || '');
    if (language === 'python') {
      file = path.join(dir, `q${id}_${Math.random().toString(36).slice(2)}.py`);
      fs.writeFileSync(file, code);
      cmdArr = [process.platform === 'win32' ? 'python' : 'python3', file];
      cleanup.push(file);
    } else if (language === 'cpp') {
      file = path.join(dir, `q${id}_${Math.random().toString(36).slice(2)}.cpp`);
      ex = file.replace('.cpp','');
      fs.writeFileSync(file, code);
      // Compile
      try {
        await new Promise((resolve, reject) => {
          exec(`g++ "${file}" -o "${ex}"`, (e, out, err) => {
            if (e) reject(err || e.message);
            else resolve();
          });
        });
        cmdArr = [ex];
        cleanup.push(file, ex);
      } catch (err) {
        results.push({ input: tc.input, expected: tc.expected, output: '', passed: false, error: err });
        continue;
      }
    } else if (language === 'java') {
      className = `Q${id}${Math.floor(Math.random()*10000)}`;
      file = path.join(dir, `${className}.java`);
      let javaCode = code.replace(/public class .+\{/, `public class ${className}{`);
      fs.writeFileSync(file, javaCode);
      // Compile
      try {
        await new Promise((resolve, reject) => {
          exec(`javac "${file}"`, (e, out, err) => {
            if (e) reject(err || e.message);
            else resolve();
          });
        });
        cmdArr = ['java', '-cp', dir, className];
        cleanup.push(file, path.join(dir, className + '.class'));
      } catch (err) {
        results.push({ input: tc.input, expected: tc.expected, output: '', passed: false, error: err });
        continue;
      }
    }
  let { output, error } = await runWithStdin(cmdArr, inputStr);
    cleanup.forEach(f => { try { fs.unlinkSync(f); } catch {} });
  const actual = normalizeOutput(output || '');
  const expected = normalizeExpected(tc.expected || '');
  const passed = !error && actual === expected;
  results.push({ input: tc.input, expected, output: actual, passed, error });
  }
  res.json({ results });
});
// ...existing

export default router;
