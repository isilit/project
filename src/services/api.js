const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5000';

function getAdminHeaders(userId) {
  return userId ? { 'X-User-Id': String(userId) } : {};
}

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
  return `${API_BASE}/photos/${encodeURIComponent(filename)}`;
}

export function registerUser(payload) {
  return request('/register', { method: 'POST', body: JSON.stringify(payload) });
}

export function loginUser(login, passwordHash) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ login, password: passwordHash }),
  });
}

export function fetchUser(userId) {
  return request(`/user/${userId}`);
}

export function fetchUsers(group) {
  const q = group ? `?group=${encodeURIComponent(group)}` : '';
  return request(`/users${q}`);
}

export function fetchGroups() {
  return request('/groups');
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

export function fetchAdminData(adminUserId) {
  return request('/admin/data', { headers: getAdminHeaders(adminUserId) });
}

export function adminUpdateAccount(adminUserId, accountId, fields) {
  return request(`/admin/accounts/${accountId}`, {
    method: 'PUT',
    headers: getAdminHeaders(adminUserId),
    body: JSON.stringify(fields),
  });
}

export function adminDeleteAccount(adminUserId, accountId) {
  return request(`/admin/accounts/${accountId}`, {
    method: 'DELETE',
    headers: getAdminHeaders(adminUserId),
  });
}

export function adminCreateGroup(adminUserId, payload) {
  return request('/admin/groups', {
    method: 'POST',
    headers: getAdminHeaders(adminUserId),
    body: JSON.stringify(payload),
  });
}

export function adminUpdateGroup(adminUserId, groupId, payload) {
  return request(`/admin/groups/${groupId}`, {
    method: 'PUT',
    headers: getAdminHeaders(adminUserId),
    body: JSON.stringify(payload),
  });
}

export function adminDeleteGroup(adminUserId, groupId) {
  return request(`/admin/groups/${groupId}`, {
    method: 'DELETE',
    headers: getAdminHeaders(adminUserId),
  });
}
