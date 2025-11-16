/*
  Simple MongoDB backup helper.
  Usage (PowerShell):
    # From repo root or server folder
    # Prefer setting MONGODB_URI, else DB_NAME is used with localhost
    # MONGODB_URI example: mongodb://127.0.0.1:27017/mydb
    node src/scripts/backup.js

  Env vars:
    MONGODB_URI  - full Mongo connection string (preferred)
    DB_NAME      - database name if no URI is provided (defaults to 'mydb')
    OUT_DIR      - output folder (defaults to 'db-backup')
*/
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const OUT_DIR = process.env.OUT_DIR || 'db-backup';
const URI = process.env.MONGODB_URI || process.env.MONGO_URL || '';
const DB_NAME = process.env.DB_NAME || 'mydb';

const outPath = path.resolve(cwd, OUT_DIR);
if (!fs.existsSync(outPath)) fs.mkdirSync(outPath, { recursive: true });

// Build arguments for mongodump
const args = [];
if (URI) {
  args.push('--uri', URI);
} else {
  args.push('--db', DB_NAME);
}
args.push('--out', outPath);

console.log('Running mongodump with args:', args.join(' '));

const child = spawn('mongodump', args, { stdio: 'inherit' });
child.on('error', (err) => {
  if (err.code === 'ENOENT') {
    console.error('\nERROR: mongodump not found in PATH.');
    console.error('Install MongoDB Database Tools and ensure mongodump.exe is on PATH.');
    console.error('Download: https://www.mongodb.com/try/download/database-tools');
    console.error('Or run with full path, e.g.: "C\\\u005c\u005cProgram Files\\MongoDB\\Tools\\<version>\\bin\\mongodump.exe"');
  } else {
    console.error('mongodump spawn failed:', err);
  }
  process.exit(1);
});

child.on('exit', (code) => {
  if (code === 0) {
    console.log(`\nBackup completed. Folder created at: ${outPath}`);
    if (!URI) {
      console.log(`Your DB dump should be at: ${path.join(outPath, DB_NAME)}`);
    } else {
      const parsedName = (URI.split('/').pop() || '').split('?')[0] || DB_NAME;
      console.log(`Your DB dump should be at: ${path.join(outPath, parsedName)}`);
    }
  } else {
    console.error('mongodump exited with code', code);
  }
});
