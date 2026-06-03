const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || res.statusText);
  }
  return data;
}

export function photoUrl(filename) {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename;
  return `${API_BASE}/photos/${filename}`;
}

export function registerUser(payload) {
  return request('/register', { method: 'POST', body: JSON.stringify(payload) });
}

export function loginUser(login, password) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  });
}

export function fetchUser(userId) {
  return request(`/user/${userId}`);
}

export function fetchUsers() {
  return request('/users');
}

export function updateUser(userId, fields) {
  return request(`/user/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
}

export function fetchUserStats(userId) {
  return request(`/user/${userId}/stats`);
}
