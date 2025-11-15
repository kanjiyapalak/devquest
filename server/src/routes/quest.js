import express from 'express';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';

const router = express.Router();

// POST /api/quest/evaluate
// Body: { code: string, language: 'python'|'cpp'|'java', testCases: [{ input: string|object, expected: string|object, explanation?: string }] }
router.post('/evaluate', async (req, res) => {
  const { code, language, testCases } = req.body || {};
  if (!code || !language || !Array.isArray(testCases) || !testCases.length) {
    return res.status(400).json({ error: 'Missing inputs' });
  }

  const id = Date.now();
  const dir = os.tmpdir();
  const results = [];

  const runWithStdin = (cmdArr, stdinData, cwd = undefined) => new Promise((resolve) => {
    try {
      const proc = spawn(cmdArr[0], cmdArr.slice(1), { cwd });
      let out = '', err = '';
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        try { proc.kill('SIGKILL'); } catch {}
      }, 8000); // 8s timeout

      proc.stdout.on('data', d => { out += d.toString(); });
      proc.stderr.on('data', d => { err += d.toString(); });
      proc.on('close', code => {
        clearTimeout(timer);
        if (timedOut) return resolve({ output: out, error: 'Timed out after 8s' });
        resolve({ output: out, error: code === 0 ? null : err || `Exited with code ${code}` });
      });
      proc.stdin.write(stdinData ?? '');
      proc.stdin.end();
    } catch (e) {
      resolve({ output: '', error: e?.message || 'Failed to run process' });
    }
  });

  // Helpers
  function flattenToLines(value) {
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'boolean') return [value ? 'true' : 'false'];
      if (value === null) return ['null'];
      return [String(value ?? '')];
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return [''];
      const hasNestedArray = value.some((v) => Array.isArray(v));
      if (hasNestedArray) {
        const lines = [];
        for (const item of value) {
          const child = flattenToLines(item);
          if (child.length === 1) lines.push(child[0]);
          else lines.push(...child);
        }
        return lines;
      }
      return [value.map((v) => (Array.isArray(v) ? JSON.stringify(v) : String(v))).join(' ')];
    }
    const lines = [];
    for (const key of Object.keys(value)) {
      const child = flattenToLines(value[key]);
      if (child.length === 1) lines.push(child[0]);
      else lines.push(...child);
    }
    return lines;
  }

  function sanitizeLooseArrayString(str) {
    if (typeof str !== 'string') return '';
    let s = str.trim();
    if (/\{\s*\{/.test(s)) {
      if (s.startsWith('{') && s.endsWith('}')) s = s.slice(1, -1);
      s = s.replace(/}\s*,\s*{/g, '\n');
      s = s.replace(/[\[\]{}]/g, '').replace(/[,:;]/g, ' ');
      s = s
        .split(/\n+/)
        .map(line => line.trim().replace(/\s+/g, ' '))
        .join('\n');
      return s;
    }
    s = s.replace(/[\[\]{}]/g, '').replace(/[,:;]/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function formatInputForStdin(input) {
    try {
      const parsed = typeof input === 'string' ? JSON.parse(input) : input;
      return flattenToLines(parsed).join('\n');
    } catch {
      return sanitizeLooseArrayString(String(input ?? ''));
    }
  }

  function normalizeExpected(expected) {
    try {
      const parsed = typeof expected === 'string' ? JSON.parse(expected) : expected;
      return flattenToLines(parsed).join('\n').trim();
    } catch {
      return sanitizeLooseArrayString(String(expected ?? '')).trim();
    }
  }

  function normalizeOutput(out) {
    const s = String(out ?? '').replace(/\r\n/g, '\n').trim();
    try {
      const parsed = JSON.parse(s);
      return flattenToLines(parsed).join('\n').trim();
    } catch {
      return s;
    }
  }

  for (const tc of testCases) {
    let file = '', ex = '', className = '', cmdArr = [], cleanup = [];
    const inputStr = formatInputForStdin(tc.input || '');
    try {
      if (language === 'python') {
        file = path.join(dir, `q${id}_${Math.random().toString(36).slice(2)}.py`);
        fs.writeFileSync(file, code);
        // Prefer python on Windows (v3) and python3 elsewhere; allow environment override
        const py = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
        cmdArr = [py, file];
        cleanup.push(file);
      } else if (language === 'cpp') {
        file = path.join(dir, `q${id}_${Math.random().toString(36).slice(2)}.cpp`);
        ex = file.replace('.cpp', process.platform === 'win32' ? '.exe' : '');
        fs.writeFileSync(file, code);
        try {
          await new Promise((resolve, reject) => {
            const outPath = process.platform === 'win32' ? ex : ex;
            exec(`g++ "${file}" -o "${outPath}"`, (e, _out, err) => {
              if (e) reject(err || e.message);
              else resolve();
            });
          });
          cmdArr = [ex];
          cleanup.push(file, ex);
        } catch (err) {
          results.push({ input: tc.input, expected: tc.expected, output: '', passed: false, error: String(err) });
          continue;
        }
      } else if (language === 'java') {
        className = `Q${id}${Math.floor(Math.random() * 10000)}`;
        file = path.join(dir, `${className}.java`);
        const javaCode = code.replace(/public class .+\{/, `public class ${className}{`);
        fs.writeFileSync(file, javaCode);
        try {
          await new Promise((resolve, reject) => {
            exec(`javac "${file}"`, (e, _out, err) => {
              if (e) reject(err || e.message);
              else resolve();
            });
          });
          cmdArr = ['java', '-cp', dir, className];
          cleanup.push(file, path.join(dir, className + '.class'));
        } catch (err) {
          results.push({ input: tc.input, expected: tc.expected, output: '', passed: false, error: String(err) });
          continue;
        }
      } else {
        results.push({ input: tc.input, expected: tc.expected, output: '', passed: false, error: `Unsupported language: ${language}` });
        continue;
      }

      const { output, error } = await runWithStdin(cmdArr, inputStr);
      cleanup.forEach((f) => { try { fs.unlinkSync(f); } catch {} });

      const actual = normalizeOutput(output || '');
      const expected = normalizeExpected(tc.expected || '');
      const passed = !error && actual === expected;
      results.push({ input: tc.input, expected, output: actual, passed, error });
    } catch (e) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      if (ex) { try { fs.unlinkSync(ex); } catch {} }
      results.push({ input: tc.input, expected: String(tc.expected ?? ''), output: '', passed: false, error: e?.message || 'Execution failed' });
    }
  }

  res.json({ results });
});

export default router;
