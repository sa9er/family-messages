const API_URL = "https://family-messages-api.onrender.com";

export const api = {
  async request(endpoint: string, options?: RequestInit) {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(options?.headers || {}),
    };
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },
  get: (endpoint: string) => api.request(endpoint, { method: 'GET' }),
  post: (endpoint: string, body: unknown) => api.request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  upload: async (endpoint: string, formData: FormData) => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  },
};
