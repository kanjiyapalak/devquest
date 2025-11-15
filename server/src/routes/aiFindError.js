// // server/routes/aiFindError.js
// import express from 'express';
// import dotenv from 'dotenv';

// dotenv.config();
// const router = express.Router();

// // POST / (mounted at /api/ai/find-error)
// // Body: { problem: string, code: string, language?: 'python'|'cpp'|'java'|string }
// router.post('/', async (req, res) => {
//   try {
//     const { problem, code = '', language, messages: history = [] } = req.body || {};
//   if (!problem) return res.status(400).json({ error: 'Missing problem' });

//   const codeText = String(code || '').trim();
//   const nonEmptyLines = codeText.split(/\r?\n/).filter(l => l.trim()).length;
//     const lastUserTurn = Array.isArray(history) ? [...history].reverse().find(m => m && m.role === 'user') : null;
//     const lastUserText = (lastUserTurn?.content || '').toString();
//     const wantsFullCode = /\b(full|complete)\s+(working\s+)?code\b|\bwrite\s+the\s+entire\s+code\b/i.test(lastUserText);
//     const logicOnlyIntent = /\b(explain|logic|approach|idea|hint)\b/i.test(lastUserText);

//     // Determine language preference: explicit param beats user text
//     let langPref = (language || '').toString().toLowerCase();
//     if (!langPref) {
//       const m = lastUserText.toLowerCase().match(/\b(c\+\+|cpp|python|java|javascript|js)\b/);
//       if (m) langPref = m[1] === 'c++' ? 'cpp' : (m[1] === 'js' ? 'javascript' : m[1]);
//     }

//     const HF_TOKEN = process.env.HF_TOKEN;
//     if (!HF_TOKEN) {
//       return res.status(500).json({ error: 'HF_TOKEN is not configured on the server' });
//     }

//     // If no real code was provided, do NOT give a full solution; ask user to paste their attempt.
//     if ((!codeText || nonEmptyLines < 3 || codeText.length < 40) && !logicOnlyIntent) {
//       return res.json({
//         analysis: [
//           '**Please paste your code snippet** so I can find syntax or logical errors.\n\n',
//           '- Include the failing test case or the exact error message.\n',
//           '- I won\'t provide a full solution until I can review your attempt, but I can outline an approach and common pitfalls if you share more context.'
//         ].join('')
//       });
//     }

//     const system = [
//       'You are a senior code reviewer and competitive programming mentor.',
//       'Task: Find syntax errors and logical/edge-case issues in the user\'s code for the given problem.',
//       'Rules:',
//       '- Be concise but thorough. Use bullet points where helpful.',
//       '- If syntax errors exist, show the exact line(s) and a corrected snippet.',
//       '- If logic issues exist, explain the failing scenario and why.',
//       '- Suggest a minimal fix or improved approach (patch-style or small snippet only).',
//       '- Do NOT provide a full working solution program; only show short targeted snippets necessary to fix the bug.',
//       '- Never write the entire solution if the user has not provided a substantial attempt.',
//       `- Keep responses in the requested language${langPref ? ` (${langPref})` : ''}. Do not mix languages.`,
//       '- If the user asks for a full working code, politely refuse and offer logic, algorithm steps, and small targeted snippets instead.',
//       '',
//       'Formatting requirements:',
//       '- Return PLAIN TEXT only. No Markdown, no tables, no headings, no backticks.',
//       '- Use simple hyphen bullets (-) and short paragraphs.',
//     ].join('\n');

//     const contextBlock = [
//       `Problem Statement:\n${problem}`,
//       `\nLanguage: ${langPref || language || 'unspecified'}`,
//       codeText ? '\n\nUser Code:\n' + codeText : '',
//     ].join('\n');

//     const msgs = [
//       { role: 'system', content: system },
//       { role: 'user', content: contextBlock }
//     ];
//     if (Array.isArray(history) && history.length) {
//       for (const m of history) {
//         if (!m || !m.role || !m.content) continue;
//         // constrain role to 'user' or 'assistant'
//         const role = m.role === 'assistant' ? 'assistant' : 'user';
//         msgs.push({ role, content: String(m.content) });
//       }
//     }
//     if (wantsFullCode) {
//       msgs.push({ role: 'system', content: 'User requested full code. Politely refuse and offer logic-only guidance and small patch snippets.' });
//     }

//     const payload = {
//       model: 'openai/gpt-oss-120b:together',
//       messages: msgs,
//   temperature: 0.2,
//   max_tokens: 900,
//     };

//     const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         Authorization: `Bearer ${HF_TOKEN}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(payload),
//     });

//     if (!resp.ok) {
//       const text = await resp.text().catch(() => '');
//       return res.status(resp.status).json({ error: `HF Router error: ${resp.statusText}`, details: text });
//     }

//     const data = await resp.json();
//     let content = data?.choices?.[0]?.message?.content || '';

//     // Post-process to plain text in case the model still returns Markdown
//     const toPlainText = (s) => {
//       if (!s) return '';
//       // Unwrap code fences but keep content
//       s = s.replace(/```[\s\S]*?```/g, (m) => {
//         const inner = m.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '');
//         return `Snippet:\n${inner.trim()}`;
//       });
//       // Remove bold/italics and inline code ticks
//       s = s.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/_(.*?)_/g, '$1').replace(/`([^`]+)`/g, '$1');
//       // Strip headings
//       s = s.replace(/^#{1,6}\s*/gm, '');
//       // Convert simple Markdown tables to bullets
//       const lines = s.split(/\r?\n/);
//       let out = [], header = null;
//       for (let ln of lines) {
//         const line = ln.trim();
//         if (!line) { out.push(''); continue; }
//         if (/^\|?\s*[-: ]+\s*(\|\s*[-: ]+\s*)+\|?$/.test(line)) continue; // separator
//         if (line.includes('|')) {
//           const cells = line.split('|').map(c=>c.trim()).filter(Boolean);
//           if (!header) { header = cells; continue; }
//           if (header && cells.length === header.length) {
//             out.push('- ' + cells.map((v,i)=> `${header[i]}: ${v}`).join('; '));
//             continue;
//           }
//         }
//         out.push(line);
//       }
//       s = out.join('\n');
//       // Collapse excessive blank lines
//       s = s.replace(/\n{3,}/g, '\n\n').trim();
//       return s;
//     };

//     content = toPlainText(content);

//     // Additional safeguard: if model still leaked a full solution (multiple lines with language keywords), replace with pseudocode outline.
//     const langKw = /(for\s*\(|while\s*\(|#include\s+<|public\s+class|def\s+\w+\s*\(|System\.out\.print|std::|using\s+namespace|return\s+\w|int\s+main\s*\(|class\s+\w+)/i;
//     const codeBlockPattern = /Snippet:\n([\s\S]{40,})/g; // captured code after our earlier fence conversion
//     let replaced = false;
//     content = content.replace(codeBlockPattern, (m, block) => {
//       const lines = block.split(/\n/).filter(l=>l.trim());
//       const keywordCount = lines.filter(l=>langKw.test(l)).length;
//       if (keywordCount > 3 || lines.length > 12) {
//         replaced = true;
//         return 'Snippet:\nPSEUDOCODE:\n1. Read input / parameters\n2. Initialize needed variables\n3. Loop / process to compute result (describe key transitions)\n4. Update best / answer variables as needed\n5. Output final answer\n(Full code omitted by policy)';
//       }
//       return m; // keep small targeted snippet
//     });
//     if (wantsFullCode && !replaced) {
//       content += '\n\nNote: Full code request denied. Ask for specific logic or a small patch if needed.';
//     }
//     return res.json({ analysis: content });
//   } catch (e) {
//     console.error('find-error route failed:', e);
//     return res.status(500).json({ error: e.message || 'Unknown error' });
//   }
// });

// export default router;
