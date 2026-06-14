const { spawn } = require('child_process');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..', 'backend');
const PHOTO_DIR = path.resolve(__dirname, '..', 'photo');
const python = process.env.PYTHON || 'python';
const script = path.join(BACKEND_DIR, 'server.py');

const proc = spawn(python, [script], {
  cwd: BACKEND_DIR,
  shell: false,
  stdio: 'inherit',
  env: {
    ...process.env,
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8',
    PHOTO_DIR,
    PORT: process.env.PORT || '5000',
  },
});

proc.on('error', (err) => {
  console.error('API не запустился:', err.message);
  process.exit(1);
});

proc.on('close', (code) => process.exit(code ?? 0));
