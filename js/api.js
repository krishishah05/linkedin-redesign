/* ============================================================
   LINKEDIN REDESIGN — API UTILITY
   All fetch calls go through window.API.
   Flask backend must be running on http://localhost:5000
   ============================================================ */
(function () {
  const BASE = 'http://localhost:5000/api';

  async function request(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined) {
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      let errMsg = res.statusText;
      try {
        const errBody = await res.json();
        errMsg = errBody.error || errMsg;
      } catch (_) { }
      const err = new Error(errMsg);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  window.API = {
    // ── User ─────────────────────────────────────────────────
    getMe: () => request('GET', '/me'),
    getUsers: () => request('GET', '/users'),
    getUser: (id) => request('GET', `/users/${id}`),

    // ── Feed ──────────────────────────────────────────────────
    getFeed: () => request('GET', '/feed'),
    createPost: (content) => request('POST', '/feed', { content }),

    // ── Jobs ──────────────────────────────────────────────────
    getJobs: () => request('GET', '/jobs'),
    getJob: (id) => request('GET', `/jobs/${id}`),

    // ── Companies ─────────────────────────────────────────────
    getCompany: (id) => request('GET', `/companies/${id}`),

    // ── Conversations ─────────────────────────────────────────
    getConversations: () => request('GET', '/conversations'),
    getConversation: (id) => request('GET', `/conversations/${id}`),
    sendMessage: (id, text) => request('POST', `/conversations/${id}/messages`, { text }),

    // ── Notifications ─────────────────────────────────────────
    getNotifications: () => request('GET', '/notifications'),
    markRead: (id) => request('PATCH', `/notifications/${id}/read`),
    markAllRead: () => request('PATCH', '/notifications/read-all'),

    // ── Events ────────────────────────────────────────────────
    getEvents: () => request('GET', '/events'),

    // ── Groups ────────────────────────────────────────────────
    getGroups: () => request('GET', '/groups'),
    getGroup: (id) => request('GET', `/groups/${id}`),

    // ── Courses ───────────────────────────────────────────────
    getCourses: () => request('GET', '/courses'),

    // ── Misc ──────────────────────────────────────────────────
    getNews: () => request('GET', '/news'),
    getInvitations: () => request('GET', '/invitations'),
    getHashtags: () => request('GET', '/hashtags'),

    // ── Search ────────────────────────────────────────────────
    search: (q) => request('GET', `/search?q=${encodeURIComponent(q)}`),

    // ── Profile Readiness ─────────────────────────────────────
    getProfileReadiness: () => request('GET', '/profile-readiness'),
  };
})();
