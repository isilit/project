const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

module.exports = {
  PROJECT_ROOT,
  BACKEND_DIR: path.join(PROJECT_ROOT, 'backend'),
  PHOTO_DIR: path.join(PROJECT_ROOT, 'photo'),
  ADMIN_DIR: path.join(PROJECT_ROOT, 'admin'),
  API_URL: process.env.API_URL || 'http://127.0.0.1:5000',
};
