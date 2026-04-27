/* ============================================================
   APPCONTEXT.JS — Global React state and actions
   Replaces the monolithic App.state object from app.js.
   ============================================================ */
const AppContext = React.createContext(null);

function AppProvider({ children }) {
  // ── Server data ───────────────────────────────────────────
  const [currentUser, setCurrentUser] = React.useState(null);
  const [appLoading, setAppLoading] = React.useState(true);
  const [appError, setAppError] = React.useState(null);

  // ── UI state (mirrors App.state) ──────────────────────────
  const [likedPosts, setLikedPosts] = React.useState(() => {
    try { const s = localStorage.getItem('li-liked-posts'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [savedJobs, setSavedJobs] = React.useState(() => {
    try { const s = localStorage.getItem('li-saved-jobs'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [connections, setConnections] = React.useState(() => {
    try { const s = localStorage.getItem('li-connections'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [following, setFollowing] = React.useState(() => {
    try { const s = localStorage.getItem('li-following'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [pendingConnections, setPendingConnections] = React.useState(() => {
    try { const s = localStorage.getItem('li-pending-conn'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });

  const [dismissedInvitations, setDismissedInvitations] = React.useState(() => {
    try { const s = localStorage.getItem('li-dismissed-inv'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [appliedJobs, setAppliedJobs] = React.useState(() => {
    try { const s = localStorage.getItem('li-applied-jobs'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const [joinedGroups, setJoinedGroups] = React.useState(() => {
    try { const s = localStorage.getItem('li-joined-groups'); return s ? new Set(JSON.parse(s)) : new Set(['1', '2', '4']); } catch { return new Set(['1', '2', '4']); }
  });
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const [pendingInvitations, setPendingInvitations] = React.useState([]);

  const [darkMode, setDarkMode] = React.useState(
    () => localStorage.getItem('li-dark-mode') === '1'
  );

  // ── Recruiter mode (only active for users with isRecruiter flag) ─────────
  const [recruiterMode, setRecruiterModeState] = React.useState(
    () => localStorage.getItem('li-recruiter-mode') === '1'
  );
  // Disable recruiter mode if the current user is not a recruiter
  React.useEffect(() => {
    if (currentUser && !currentUser.isRecruiter) {
      setRecruiterModeState(false);
      localStorage.removeItem('li-recruiter-mode');
    }
  }, [currentUser]);
  const [recruiterPanelOpen, setRecruiterPanelOpen] = React.useState(false);
  const [shortlisted, setShortlisted] = React.useState(new Map());

  function toggleRecruiterMode() {
    setRecruiterModeState(prev => {
      const next = !prev;
      localStorage.setItem('li-recruiter-mode', next ? '1' : '0');
      if (!next) setRecruiterPanelOpen(false);
      return next;
    });
  }

  function addToShortlist(user) {
    setShortlisted(prev => {
      const next = new Map(prev);
      next.set(String(user.id), user);
      try { localStorage.setItem(`li-shortlisted-${currentUser?.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function removeFromShortlist(userId) {
    setShortlisted(prev => {
      const next = new Map(prev);
      next.delete(String(userId));
      try { localStorage.setItem(`li-shortlisted-${currentUser?.id}`, JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function clearShortlist() {
    setShortlisted(new Map());
    try { localStorage.removeItem(`li-shortlisted-${currentUser?.id}`); } catch {}
  }

  const [settings, setSettings] = React.useState(() => {
    try {
      const s = localStorage.getItem('li-settings');
      return s ? JSON.parse(s) : {
        emailNotifications: true, pushNotifications: true,
        publicProfile: true, showConnections: true,
        openToWork: false, twoFactor: false,
        jobAlerts: true, networkUpdates: true,
        profileViews: true, personalizedAds: false, shareData: false,
      };
    } catch {
      return {
        emailNotifications: true, pushNotifications: true,
        publicProfile: true, showConnections: true,
        openToWork: false, twoFactor: false,
        jobAlerts: true, networkUpdates: true,
        profileViews: true, personalizedAds: false, shareData: false,
      };
    }
  });

  // Helper to get user-scoped localStorage key
  const userIdRef = React.useRef(null);
  React.useEffect(() => { userIdRef.current = currentUser?.id ?? null; }, [currentUser]);
  function _save(key, set) {
    const uid = userIdRef.current;
    if (!uid) return;
    try { localStorage.setItem(`${key}-${uid}`, JSON.stringify([...set])); } catch (_) {}
  }

  // ── Modal state ───────────────────────────────────────────
  const [activeModal, setActiveModal] = React.useState(null);
  const [modalData, setModalData] = React.useState(null);

  // ── Toast state ───────────────────────────────────────────
  const [toasts, setToasts] = React.useState([]);

  // ── Load user-scoped state once currentUser is known ─────
  React.useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;
    try {
      const c = localStorage.getItem(`li-connections-${uid}`);
      if (c) setConnections(new Set(JSON.parse(c)));
      const f = localStorage.getItem(`li-following-${uid}`);
      if (f) setFollowing(new Set(JSON.parse(f)));
      const l = localStorage.getItem(`li-liked-posts-${uid}`);
      if (l) setLikedPosts(new Set(JSON.parse(l)));
      const sl = localStorage.getItem(`li-shortlisted-${uid}`);
      setShortlisted(sl ? new Map(JSON.parse(sl)) : new Map());
    } catch (_) {}
  }, [currentUser?.id]);

  // ── Bootstrap: fetch current user on mount ────────────────
  React.useEffect(() => {
    API.getMe()
      .then(user => {
        setCurrentUser(user);
        setAppLoading(false);
      })
      .catch(err => {
        if (err.status === 401) {
          // Session expired or invalid — clear stored credentials and go to login
          try {
            localStorage.removeItem('nx-token');
            localStorage.removeItem('nx-uid');
          } catch (_) {}
          window.location.href = 'index.html';
        } else {
          setAppError(err.message);
          setAppLoading(false);
        }
      });
  }, []);

  // ── Load social state from server (overrides localStorage) ─
  React.useEffect(() => {
    if (!appLoading && !appError) {
      API.getSocialState()
        .then(social => {
          const toSet = (arr) => new Set((arr || []).map(String));
          const savedJ   = toSet(social.savedJobs);
          const conns    = toSet(social.connections);
          const foll     = toSet(social.following);
          const pend     = toSet(social.pendingConnections);
          const applied  = toSet(social.appliedJobs);
          const groups   = toSet(social.joinedGroups);
          const dismissed = new Set(social.dismissedInvitations || []);
          setSavedJobs(savedJ);
          setConnections(conns);
          setFollowing(foll);
          setPendingConnections(pend);
          setAppliedJobs(applied);
          setJoinedGroups(groups);
          setDismissedInvitations(dismissed);
          // Sync back to localStorage so offline fallback stays fresh
          try {
            localStorage.setItem('li-saved-jobs',    JSON.stringify([...savedJ]));
            localStorage.setItem('li-connections',   JSON.stringify([...conns]));
            localStorage.setItem('li-following',     JSON.stringify([...foll]));
            localStorage.setItem('li-pending-conn',  JSON.stringify([...pend]));
            localStorage.setItem('li-applied-jobs',  JSON.stringify([...applied]));
            localStorage.setItem('li-joined-groups', JSON.stringify([...groups]));
            localStorage.setItem('li-dismissed-inv', JSON.stringify([...dismissed]));
          } catch {}
        })
        .catch(() => { /* silently keep localStorage values already in state */ });
    }
  }, [appLoading, appError]);

  // Fetch unread counts and invitations on mount
  React.useEffect(() => {
    Promise.all([
      API.getConversations().catch(() => []),
      API.getNotifications().catch(() => []),
      API.getInvitations().catch(() => []),
    ]).then(([convs, notifs, invs]) => {
      const msgs = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      const unreadNotifs = notifs.filter(n => !n.isRead).length;
      setUnreadMessages(msgs);
      setUnreadNotifications(unreadNotifs);
      setPendingInvitations(invs || []);
    });
  }, []);

  // ── Dark mode effect ──────────────────────────────────────
  React.useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('li-dark-mode', darkMode ? '1' : '0');
  }, [darkMode]);

  // ── Settings persistence ──────────────────────────────────
  React.useEffect(() => {
    try { localStorage.setItem('li-settings', JSON.stringify(settings)); } catch {}
  }, [settings]);

  // ── Actions ───────────────────────────────────────────────
  function toggleLike(postId) {
    const key = String(postId);
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      _save('li-liked-posts', next);
      return next;
    });
    API.likePost(postId).catch(() => {
      setLikedPosts(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key); else next.add(key);
        try { localStorage.setItem('li-liked-posts', JSON.stringify([...next])); } catch {}
        return next;
      });
      showToast('Failed to react to post', 'error');
    });
  }

  function toggleSaveJob(jobId) {
    const key = String(jobId);
    setSavedJobs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try { localStorage.setItem('li-saved-jobs', JSON.stringify([...next])); } catch {}
      return next;
    });
    API.toggleSavedJob(jobId).catch(() => {});
  }

  function connect(userId) {
    setPendingConnections(prev => {
      const next = new Set([...prev, String(userId)]);
      try { localStorage.setItem('li-pending-conn', JSON.stringify([...next])); } catch {}
      return next;
    });
    API.connectUser(userId).catch(() => {});
  }

  function acceptConnection(userId) {
    setConnections(prev => {
      const next = new Set([...prev, String(userId)]);
      _save('li-connections', next);
      return next;
    });
    setPendingConnections(prev => {
      const next = new Set(prev);
      next.delete(String(userId));
      try { localStorage.setItem('li-pending-conn', JSON.stringify([...next])); } catch {}
      return next;
    });
    API.acceptConnection(userId).catch(() => {});
  }

  function dismissInvitation(key) {
    setDismissedInvitations(prev => {
      const next = new Set([...prev, key]);
      try { localStorage.setItem('li-dismissed-inv', JSON.stringify([...next])); } catch {}
      return next;
    });
    API.dismissInvitation(key).catch(() => {});
  }

  function resolveInvitation(invName) {
    setPendingInvitations(prev =>
      prev.filter(inv => {
        const name = (inv.user || inv).name || inv.senderName || '';
        return name !== invName;
      })
    );
  }

  function applyJob(jobId) {
    setAppliedJobs(prev => {
      const next = new Set([...prev, String(jobId)]);
      try { localStorage.setItem('li-applied-jobs', JSON.stringify([...next])); } catch {}
      return next;
    });
    API.applyToJob(jobId).catch(() => {});
  }

  function follow(userId) {
    const key = String(userId);
    setFollowing(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      _save('li-following', next);
      return next;
    });
    API.toggleFollow(userId).catch(() => {});
  }

  function joinGroup(groupId) {
    setJoinedGroups(prev => {
      const next = new Set([...prev, String(groupId)]);
      try { localStorage.setItem('li-joined-groups', JSON.stringify([...next])); } catch {}
      return next;
    });
    API.toggleGroup(groupId).catch(() => {});
  }

  function leaveGroup(groupId) {
    setJoinedGroups(prev => {
      const next = new Set(prev);
      next.delete(String(groupId));
      try { localStorage.setItem('li-joined-groups', JSON.stringify([...next])); } catch {}
      return next;
    });
    API.toggleGroup(groupId).catch(() => {});
  }

  function openModal(name, data) {
    setActiveModal(name);
    setModalData(data || null);
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    setActiveModal(null);
    setModalData(null);
    document.body.style.overflow = '';
  }

  function showToast(message, type = 'success') {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }

  const ctx = {
    // Data
    currentUser,
    appLoading,
    appError,
    // UI state
    likedPosts,
    savedJobs,
    connections,
    following,
    pendingConnections,
    unreadMessages,
    unreadNotifications,
    darkMode,
    settings,
    // Modal
    activeModal,
    modalData,
    // Toasts
    toasts,
    setCurrentUser,
    dismissedInvitations,
    dismissInvitation,
    pendingInvitations,
    resolveInvitation,
    appliedJobs,
    applyJob,
    joinedGroups,
    joinGroup,
    leaveGroup,
    // Actions
    toggleLike,
    toggleSaveJob,
    connect,
    acceptConnection,
    follow,
    setDarkMode,
    setSettings,
    // Recruiter mode
    recruiterMode,
    toggleRecruiterMode,
    recruiterPanelOpen,
    setRecruiterPanelOpen,
    shortlisted,
    addToShortlist,
    removeFromShortlist,
    clearShortlist,
    setUnreadMessages,
    setUnreadNotifications,
    openModal,
    closeModal,
    showToast,
  };

  return React.createElement(AppContext.Provider, { value: ctx }, children);
}
