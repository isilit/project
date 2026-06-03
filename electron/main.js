const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const Database = require('better-sqlite3');

const isDev = !app.isPackaged;
const PROJECT_ROOT = path.join(__dirname, '..');
const BACKEND_DIR = path.join(PROJECT_ROOT, 'backend');
const PHOTO_DIR = path.join(PROJECT_ROOT, 'photo');
const SESSION_DB = path.join(app.getPath('userData'), 'session.db');

let mainWindow = null;
let apiProcess = null;
let sessionDb = null;

function initSessionDb() {
  sessionDb = new Database(SESSION_DB);
  sessionDb.exec(`
    CREATE TABLE IF NOT EXISTS session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      username TEXT,
      password TEXT,
      userJson TEXT
    );
  `);
}

function startBackend() {
  const serverScript = path.join(BACKEND_DIR, 'server.py');
  const pythonCmd = process.env.PYTHON || 'python';
  apiProcess = spawn(pythonCmd, [serverScript], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      PHOTO_DIR,
      PORT: '5000',
    },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function runBiometric(mode, user) {
  return new Promise((resolve, reject) => {
    const script = path.join(BACKEND_DIR, 'main_logic.py');
    const pythonCmd = process.env.PYTHON || 'python';
    const args = [
      script,
      '--mode', mode,
      '--api', 'http://127.0.0.1:5000',
      '--photo-dir', PHOTO_DIR,
    ];

    if (mode === 'enroll' && user) {
      args.push('--account-id', String(user.id));
      args.push('--first-name', user.firstName || '');
      args.push('--last-name', user.lastName || '');
    }

    const proc = spawn(pythonCmd, args, {
      cwd: BACKEND_DIR,
      env: process.env,
      shell: process.platform === 'win32',
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      const lines = stdout.trim().split('\n').filter(Boolean);
      const lastLine = lines[lines.length - 1] || '';
      try {
        const parsed = JSON.parse(lastLine);
        resolve({ code, result: parsed, stderr });
      } catch {
        reject(new Error(stderr || stdout || `Процесс завершился с кодом ${code}`));
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const startUrl = isDev
    ? (process.env.ELECTRON_START_URL || 'http://localhost:3000')
    : `file://${path.join(PROJECT_ROOT, 'build', 'index.html')}`;

  mainWindow.loadURL(startUrl);
}

app.whenReady().then(() => {
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  initSessionDb();
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (apiProcess) apiProcess.kill();
  if (sessionDb) sessionDb.close();
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('session:get', () => {
  const row = sessionDb.prepare('SELECT username, password, userJson FROM session WHERE id = 1').get();
  if (!row) return null;
  return {
    username: row.username,
    password: row.password,
    user: row.userJson ? JSON.parse(row.userJson) : null,
  };
});

ipcMain.handle('session:set', (_e, data) => {
  sessionDb.prepare(`
    INSERT INTO session (id, username, password, userJson)
    VALUES (1, @username, @password, @userJson)
    ON CONFLICT(id) DO UPDATE SET
      username = @username,
      password = @password,
      userJson = @userJson
  `).run({
    username: data?.username || null,
    password: data?.password || null,
    userJson: data?.user ? JSON.stringify(data.user) : null,
  });
  return true;
});

ipcMain.handle('session:clear', () => {
  sessionDb.prepare('DELETE FROM session WHERE id = 1').run();
  return true;
});

ipcMain.handle('biometric:enroll', async (_e, user) => runBiometric('enroll', user));
ipcMain.handle('biometric:identify', async () => runBiometric('identify'));
ipcMain.handle('biometric:isElectron', () => true);
