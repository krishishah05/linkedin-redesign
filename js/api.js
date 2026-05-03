/* ============================================================
   LINKEDIN REDESIGN — API UTILITY
   All fetch calls go through window.API.
   Flask backend must be running on http://localhost:5000
   ============================================================ */
(function () {
  const LOCAL_API = `${window.location.protocol}//${window.location.hostname}:5000/api`;
  const BASE = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    ? LOCAL_API
    : 'https://linkedin-redesign-z364.onrender.com/api';

  function getToken() {
    try { return localStorage.getItem('nx-token') || ''; } catch { return ''; }
  }

  async function request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const opts = { method, headers };
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
    updateMe: (updates) => request('PUT', '/me', updates),
    getUsers: () => request('GET', '/users'),
    getUser: (id) => request('GET', `/users/${id}`),

    // ── Feed ──────────────────────────────────────────────────
    getFeed: () => request('GET', '/feed'),
    createPost: (content, imageUrl, videoUrl) => request('POST', '/feed', { content, imageUrl: imageUrl || null, videoUrl: videoUrl || null }),
    likePost: (id) => request('POST', `/feed/${id}/like`),
    commentOnPost: (id, text) => request('POST', `/feed/${id}/comments`, { text }),
    deletePost: (id) => request('DELETE', `/feed/${id}`),

    // ── Jobs ──────────────────────────────────────────────────
    getJobs: () => request('GET', '/jobs'),
    getJob: (id) => request('GET', `/jobs/${id}`),

    // ── Companies ─────────────────────────────────────────────
    getCompany: (id) => request('GET', `/companies/${id}`),

    // ── Conversations ─────────────────────────────────────────
    getConversations: () => request('GET', '/conversations'),
    getConversation: (id) => request('GET', `/conversations/${id}`),
    createConversation: (participantId) => request('POST', '/conversations', { participantId }),
    sendMessage: (id, text) => request('POST', `/conversations/${id}/messages`, { text }),

    // ── Notifications ─────────────────────────────────────────
    getNotifications: () => request('GET', '/notifications'),
    markRead: (id) => request('PATCH', `/notifications/${id}/read`),
    markAllRead: () => request('PATCH', '/notifications/read-all'),

    // ── Events ────────────────────────────────────────────────
    getEvents: () => request('GET', '/events'),
    createEvent: (data) => request('POST', '/events', data),
    attendEvent: (id) => request('POST', `/events/${id}/attend`),
    interestEvent: (id) => request('POST', `/events/${id}/interest`),

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
    search: (q) => request('GET', `/search?q=${encodeURIComponent(q || '')}`),

    // ── Profile (education / skills / experience / projects / volunteering / honors) ──
    addEducation: (entry) => request('POST', '/me/education', entry),
    addExperience: (entry) => request('POST', '/me/experience', entry),
    addSkill: (skill) => request('POST', '/me/skills', { skill }),
    addProject: (entry) => request('POST', '/me/projects', entry),
    addVolunteering: (entry) => request('POST', '/me/volunteering', entry),
    addHonor: (entry) => request('POST', '/me/honors', entry),
    updateExperience: (index, entry) => request('PUT', `/me/experience/${index}`, entry),
    updateEducation: (index, entry) => request('PUT', `/me/education/${index}`, entry),
    updateProject: (index, entry) => request('PUT', `/me/projects/${index}`, entry),
    updateVolunteering: (index, entry) => request('PUT', `/me/volunteering/${index}`, entry),
    updateHonor: (index, entry) => request('PUT', `/me/honors/${index}`, entry),
    deleteExperience: (index) => request('DELETE', `/me/experience/${index}`),
    deleteEducation: (index) => request('DELETE', `/me/education/${index}`),
    deleteProject: (index) => request('DELETE', `/me/projects/${index}`),
    deleteVolunteering: (index) => request('DELETE', `/me/volunteering/${index}`),
    deleteHonor: (index) => request('DELETE', `/me/honors/${index}`),
    deleteSkill: (index) => request('DELETE', `/me/skills/${index}`),
    createGroup: (data) => request('POST', '/groups', data),

    // ── Profile Readiness ─────────────────────────────────────
    getProfileReadiness: () => request('GET', '/profile-readiness'),

    // ── Outreach (Story #1: Outreach Message Guidance  |  Story #7: Outreach Readiness Check) ──
    generateOutreachMessage: (recipientId, tone, goal, customNote, details) =>
      request('POST', '/outreach/generate', { recipientId, tone, goal, custom_note: customNote, details: details || {} }),
    getOutreachReadiness: (userId) =>
      request('GET', userId ? `/outreach/readiness?userId=${encodeURIComponent(userId)}` : '/outreach/readiness'),

    // ── Social state ──────────────────────────────────────────
    getSocialState: () => request('GET', '/me/social'),
    toggleSavedJob: (id) => request('POST', `/me/saved-jobs/${id}`),
    getConnectionRequests: () => request('GET', '/me/connection-requests'),
    declineConnectionRequest: (id) => request('DELETE', `/me/connection-requests/${id}`),
    connectUser: (id) => request('POST', `/me/connections/${id}`),
    acceptConnection: (id) => request('POST', `/me/connections/${id}/accept`),
    toggleFollow: (id) => request('POST', `/me/following/${id}`),
    applyToJob: (id) => request('POST', `/me/applied-jobs/${id}`),
    toggleGroup: (id) => request('POST', `/me/groups/${id}/toggle`),
    dismissInvitation: (key) => request('POST', '/me/invitations/dismiss', { key }),

    // ── Conference Stories ────────────────────────────────────
    getConferenceStories: () => request('GET', '/conference-stories'),
    createConferenceStory: (data) => request('POST', '/conference-stories', data),
    searchConferences: (location, field) =>
      request('GET', `/conferences/search?location=${encodeURIComponent(location || '')}&field=${encodeURIComponent(field || '')}`),

    // ── AI Profile Improvement ────────────────────────────────
    getProfileImprovementTips: () => request('POST', '/profile/improve'),
    getAIProfileReadiness: () => request('POST', '/profile-readiness/ai'),

    // ── Cover Letter ──────────────────────────────────────────
    coverLetterGenerate: (prompt) => request('POST', '/cover-letter/generate', { prompt }),

    // ── Account ───────────────────────────────────────────────
    login: (email, password) =>
      request('POST', '/auth/login', { email, password }),
    register: (name, email, password) =>
      request('POST', '/auth/register', { name, email, password }),
    changePassword: (current, newPassword) =>
      request('POST', '/auth/change-password', { current, newPassword }),
    deleteUser: (id) =>
      request('DELETE', `/users/${id}`),
  };
})();
