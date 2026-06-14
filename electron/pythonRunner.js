const { spawn } = require('child_process');
const path = require('path');
const { BACKEND_DIR, PHOTO_DIR } = require('./paths');

function getPythonCommand() {
  return process.env.PYTHON || 'python';
}

function buildPythonEnv(extra = {}) {
  return {
    ...process.env,
    PYTHONUTF8: '1',
    PYTHONIOENCODING: 'utf-8',
    PHOTO_DIR: path.resolve(PHOTO_DIR),
    PORT: process.env.PORT || '5000',
    BIOMETRIC_API: process.env.API_URL || 'http://127.0.0.1:5000',
    ...extra,
  };
}

/**
 * Запуск Python без shell — корректно работает с кириллицей в путях Windows.
 */
function spawnPython(scriptName, args = [], options = {}) {
  const python = getPythonCommand();
  const scriptPath = path.resolve(BACKEND_DIR, scriptName);

  return spawn(python, [scriptPath, ...args], {
    cwd: path.resolve(BACKEND_DIR),
    shell: false,
    windowsHide: true,
    env: buildPythonEnv(options.env),
    stdio: options.stdio || 'pipe',
  });
}

module.exports = { spawnPython, getPythonCommand, buildPythonEnv };
