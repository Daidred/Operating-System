// Self-hosted API client. Exposes the same interface the app used with the
// Base44 SDK (base44.entities.X.list/filter/create/update/delete/subscribe,
// base44.auth.*, base44.integrations.Core.*) but talks to our own server.

async function request(path, { method = 'GET', body, formData } = {}) {
  const options = { method, credentials: 'same-origin' };
  if (formData) {
    options.body = formData;
  } else if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const res = await fetch(path, options);
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const POLL_INTERVAL_MS = 30000;

function makeEntity(name) {
  const base = `/api/entities/${name}`;
  return {
    list: (sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', limit);
      return request(`${base}?${params}`);
    },
    filter: (query, sort, limit) => {
      const params = new URLSearchParams();
      params.set('filter', JSON.stringify(query || {}));
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', limit);
      return request(`${base}?${params}`);
    },
    create: (data) => request(base, { method: 'POST', body: data }),
    update: (id, data) => request(`${base}/${id}`, { method: 'PATCH', body: data }),
    delete: (id) => request(`${base}/${id}`, { method: 'DELETE' }),
    // Realtime subscriptions are approximated by polling: the callback is used
    // by pages to invalidate their react-query caches.
    subscribe: (callback) => {
      const timer = setInterval(callback, POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    },
  };
}

const entityCache = {};
const entities = new Proxy({}, {
  get: (_target, name) => {
    if (typeof name !== 'string') return undefined;
    entityCache[name] ||= makeEntity(name);
    return entityCache[name];
  },
});

const auth = {
  me: () => request('/api/auth/me'),
  loginViaEmailPassword: async (email, password) => {
    const { user } = await request('/api/auth/login', { method: 'POST', body: { email, password } });
    return user;
  },
  register: async ({ email, password, full_name }) => {
    const { user } = await request('/api/auth/register', { method: 'POST', body: { email, password, full_name } });
    return user;
  },
  logout: async () => {
    try { await request('/api/auth/logout', { method: 'POST' }); } catch { /* already logged out */ }
    window.location.href = '/login';
  },
  redirectToLogin: () => { window.location.href = '/login'; },
  resetPasswordRequest: (email) => request('/api/auth/reset-request', { method: 'POST', body: { email } }),
  resetPassword: ({ resetToken, newPassword }) => request('/api/auth/reset', { method: 'POST', body: { token: resetToken, password: newPassword } }),
  // Legacy Base44 flows that no longer apply to the self-hosted backend:
  setToken: () => {},
  verifyOtp: async () => { throw new Error('Email verification is not required on this server'); },
  resendOtp: async () => { throw new Error('Email verification is not required on this server'); },
  loginWithProvider: () => { throw new Error('Social login is not available on this server'); },
};

const Core = {
  UploadFile: async ({ file }) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/api/integrations/upload', { method: 'POST', formData });
  },
  InvokeLLM: async (options) => {
    const { result } = await request('/api/integrations/invoke-llm', { method: 'POST', body: options });
    return result;
  },
  SendEmail: (options) => request('/api/integrations/send-email', { method: 'POST', body: options }),
};

export const base44 = { entities, auth, integrations: { Core } };
