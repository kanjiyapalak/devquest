// server/routes/ai.js
import express from 'express';
import dotenv from 'dotenv';
import os from 'os';
import { InferenceClient } from '@huggingface/inference';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

dotenv.config();
const router = express.Router();
const MODEL = 'mistralai/Mistral-Nemo-Instruct-2407';
const HF_TOKEN = process.env.HF_TOKEN;

router.post('/generate', async (req, res) => {
  let { prompt } = req.body;
  if (!prompt?.trim()) prompt = 'Create a basic coding question with signature and 2 test cases.';

  const q = `
Generate a LeetCode-style coding question on "${prompt}". Use this format:

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
- ALWAYS ensure inputs that contain arrays or matrices include their sizes explicitly.
  - 1D array: include {"n": <length>, "nums": [...]}
  - 2D matrix: include {"rows": <R>, "cols": <C>, "matrix": [[...], ...]}
  - Strings: include length if typical CP-style input uses it: {"n": <length>, "s": "..."}
- When using an input JSON object, ORDER KEYS in the exact reading order for stdin: sizes first (n/rows/cols), then the data structures.
- Keep all Input and Expected strictly valid JSON (no trailing commas, no comments, no backticks, no markdown).

(Do NOT use backticks anywhere. All inputs and outputs must be valid JSON. No Markdown formatting!)
`;

  try {
    const client = new InferenceClient(HF_TOKEN);
    const chat = await client.chatCompletion({
      model: MODEL,
      provider: 'nebius',
      messages: [{ role: 'user', content: q }],
    });

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

    res.json({ problem, functionSignatures, testCases, raw: output });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});





router.post('/explain', async (req, res) => {
  const { code, problem } = req.body;
  if (!code || !problem) return res.status(400).json({ error: 'Missing code or problem.' });
  const q = `Explain the following solution for this coding problem in a clear, step-by-step way.\n\nProblem:\n${problem}\n\nSolution Code:\n${code}`;
  try {
    const client = new InferenceClient(HF_TOKEN);
    const chat = await client.chatCompletion({
      model: MODEL, provider: 'nebius',
      messages: [{ role: 'user', content: q }],
    });
    const explanation = chat.choices[0].message.content;
    res.json({ explanation });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
