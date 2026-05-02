/* ============================================================
   APPCONTEXT.JS â€” Global React state and actions
   Replaces the monolithic App.state object from app.js.
   ============================================================ */

const TRANSLATIONS = {
  en: { home:'Home', myNetwork:'My Network', jobs:'Jobs', messaging:'Messaging', conferences:'Conferences', me:'Me â-¾', meShort:'Me', search:'Search', startPost:'Start a post', photo:'Photo', video:'Video', writeArticle:'Write article', post:'Post', publish:'Publish', cancel:'Cancel', whatToTalk:'What do you want to talk about?', editTemplate:'Edit the template, then publish your articleâ€¦', like:'Like', comment:'Comment', repost:'Repost', send:'Send', network:'Network', signOut:'Sign out', settingsPrivacy:'Settings & Privacy', messages:'Messages', chooseTemplate:'Choose an article template', uploadVideoUrl:'Upload video URLâ€¦', pasteImageUrl:'Paste image URLâ€¦', article:'ARTICLE' },
  es: { home:'Inicio', myNetwork:'Mi Red', jobs:'Empleos', messaging:'Mensajes', conferences:'Conferencias', me:'Yo â-¾', meShort:'Yo', search:'Buscar', startPost:'Iniciar publicaciÃ³n', photo:'Foto', video:'VÃ­deo', writeArticle:'Escribir artÃ­culo', post:'Publicar', publish:'Publicar', cancel:'Cancelar', whatToTalk:'Â¿De quÃ© quieres hablar?', editTemplate:'Edita la plantilla y publica tu artÃ­culoâ€¦', like:'Me gusta', comment:'Comentar', repost:'Compartir', send:'Enviar', network:'Red', signOut:'Cerrar sesiÃ³n', settingsPrivacy:'ConfiguraciÃ³n', messages:'Mensajes', chooseTemplate:'Elige una plantilla de artÃ­culo', uploadVideoUrl:'URL del vÃ­deoâ€¦', pasteImageUrl:'URL de la imagenâ€¦', article:'ARTÃCULO' },
  fr: { home:'Accueil', myNetwork:'Mon RÃ©seau', jobs:'Emplois', messaging:'Messagerie', conferences:'ConfÃ©rences', me:'Moi â-¾', meShort:'Moi', search:'Rechercher', startPost:'Commencer une publication', photo:'Photo', video:'VidÃ©o', writeArticle:'Ã‰crire un article', post:'Publier', publish:'Publier', cancel:'Annuler', whatToTalk:'De quoi souhaitez-vous parlerÂ ?', editTemplate:'Modifiez le modÃ¨le, puis publiez votre articleâ€¦', like:'Aimer', comment:'Commenter', repost:'Repartager', send:'Envoyer', network:'RÃ©seau', signOut:'Se dÃ©connecter', settingsPrivacy:'ParamÃ¨tres', messages:'Messages', chooseTemplate:'Choisissez un modÃ¨le d\'article', uploadVideoUrl:'URL de la vidÃ©oâ€¦', pasteImageUrl:'URL de l\'imageâ€¦', article:'ARTICLE' },
  de: { home:'Startseite', myNetwork:'Mein Netzwerk', jobs:'Jobs', messaging:'Nachrichten', conferences:'Konferenzen', me:'Ich â-¾', meShort:'Ich', search:'Suchen', startPost:'Beitrag starten', photo:'Foto', video:'Video', writeArticle:'Artikel schreiben', post:'Posten', publish:'VerÃ¶ffentlichen', cancel:'Abbrechen', whatToTalk:'WorÃ¼ber mÃ¶chtest du sprechen?', editTemplate:'Vorlage bearbeiten und Artikel verÃ¶ffentlichenâ€¦', like:'GefÃ¤llt mir', comment:'Kommentieren', repost:'Teilen', send:'Senden', network:'Netzwerk', signOut:'Abmelden', settingsPrivacy:'Einstellungen', messages:'Nachrichten', chooseTemplate:'Artikelvorlage wÃ¤hlen', uploadVideoUrl:'Video-URLâ€¦', pasteImageUrl:'Bild-URLâ€¦', article:'ARTIKEL' },
  ja: { home:'ãƒ›ãƒ¼ãƒ ', myNetwork:'ãƒžã‚¤ãƒãƒƒãƒˆãƒ¯ãƒ¼ã‚¯', jobs:'æ±‚äºº', messaging:'ãƒ¡ãƒƒã‚»ãƒ¼ã‚¸', conferences:'ã‚«ãƒ³ãƒ•ã‚¡ãƒ¬ãƒ³ã‚¹', me:'è‡ªåˆ† â-¾', meShort:'è‡ªåˆ†', search:'æ¤œç´¢', startPost:'æŠ•ç¨¿ã‚’é-‹å§‹', photo:'å†™çœŸ', video:'å‹•ç”»', writeArticle:'è¨˜äº‹ã‚’æ›¸ã', post:'æŠ•ç¨¿', publish:'å...¬é-‹', cancel:'ã‚­ãƒ£ãƒ³ã‚»ãƒ«', whatToTalk:'ä½•ã«ã¤ã„ã¦è©±ã-ãŸã„ã§ã™ã‹ï¼Ÿ', editTemplate:'ãƒ†ãƒ³ãƒ-ãƒ¬ãƒ¼ãƒˆã‚’ç·¨é›†ã-ã¦è¨˜äº‹ã‚’å...¬é-‹â€¦', like:'ã„ã„ã­', comment:'ã‚³ãƒ¡ãƒ³ãƒˆ', repost:'å...±æœ‰', send:'é€ä¿¡', network:'ãƒãƒƒãƒˆãƒ¯ãƒ¼ã‚¯', signOut:'ãƒ­ã‚°ã‚¢ã‚¦ãƒˆ', settingsPrivacy:'è¨­å®š', messages:'ãƒ¡ãƒƒã‚»ãƒ¼ã‚¸', chooseTemplate:'è¨˜äº‹ãƒ†ãƒ³ãƒ-ãƒ¬ãƒ¼ãƒˆã‚’é¸æŠž', uploadVideoUrl:'å‹•ç”»URLã‚’å...¥åŠ›â€¦', pasteImageUrl:'ç”»åƒURLã‚’å...¥åŠ›â€¦', article:'è¨˜äº‹' },
};

const AppContext = React.createContext(null);

function AppProvider({ children }) {
  // â”€â”€ Server data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [currentUser, setCurrentUser] = React.useState(null);
  const [appLoading, setAppLoading] = React.useState(true);
  const [appError, setAppError] = React.useState(null);

  // â”€â”€ UI state (mirrors App.state) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Loaded from user-scoped key once currentUser is known (see effect below)
  const [likedPosts, setLikedPosts] = React.useState(() => new Set());
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

  // â”€â”€ Recruiter mode (only active for users with isRecruiter flag) â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [recruiterMode, setRecruiterModeState] = React.useState(
    () => localStorage.getItem('li-recruiter-mode') === '1'
  );

  // User availability status: 'open_to_work' | 'conferences' | 'recruiting' | 'not_looking' | null
  // Declared before the effects below that reference it to avoid TDZ errors.
  const [userStatus, setUserStatusState] = React.useState(null);
  const [recruiterPanelOpen, setRecruiterPanelOpen] = React.useState(false);

  // Auto-set 'recruiting' status for recruiter accounts that haven't picked a status yet
  React.useEffect(() => {
    if (!currentUser?.id) return;
    const statusKey = `li-user-status-${currentUser.id}`;
    const savedStatus = localStorage.getItem(statusKey);
    if (savedStatus) {
      setUserStatusState(savedStatus);
    } else if (currentUser.isRecruiter) {
      setUserStatusState('recruiting');
      localStorage.setItem(statusKey, 'recruiting');
    } else {
      setUserStatusState(null);
    }
    if (!currentUser.isRecruiter) {
      setRecruiterModeState(false);
      setRecruiterPanelOpen(false);
      localStorage.removeItem('li-recruiter-mode');
    }
  }, [currentUser]);

  // Clear recruiter mode when status changes away from 'recruiting'
  React.useEffect(() => {
    if (userStatus !== null && userStatus !== 'recruiting' && recruiterMode) {
      setRecruiterModeState(false);
      setRecruiterPanelOpen(false);
      localStorage.removeItem('li-recruiter-mode');
    }
  }, [userStatus, recruiterMode]);

  const [shortlisted, setShortlisted] = React.useState(() => {
    try {
      const s = localStorage.getItem('li-shortlisted');
      return s ? new Map(JSON.parse(s)) : new Map();
    } catch { return new Map(); }
  });

  function setUserStatus(status) {
    setUserStatusState(status);
    const uid = currentUser?.id || userIdRef.current;
    if (!uid) return;
    const statusKey = `li-user-status-${uid}`;
    if (status) localStorage.setItem(statusKey, status);
    else localStorage.removeItem(statusKey);
  }

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
      if (userIdRef.current) {
        try { localStorage.setItem(`li-shortlisted-${userIdRef.current}`, JSON.stringify([...next])); } catch {}
      }
      return next;
    });
  }

  function removeFromShortlist(userId) {
    setShortlisted(prev => {
      const next = new Map(prev);
      next.delete(String(userId));
      if (userIdRef.current) {
        try { localStorage.setItem(`li-shortlisted-${userIdRef.current}`, JSON.stringify([...next])); } catch {}
      }
      return next;
    });
  }

  function clearShortlist() {
    setShortlisted(new Map());
    if (userIdRef.current) {
      try { localStorage.removeItem(`li-shortlisted-${userIdRef.current}`); } catch {}
    }
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

  const [language, setLanguageState] = React.useState(
    () => localStorage.getItem('li-language') || 'en'
  );
  function setLanguage(lang) {
    setLanguageState(lang);
    localStorage.setItem('li-language', lang);
  }
  function t(key) {
    return (TRANSLATIONS[language] || TRANSLATIONS.en)[key] || key;
  }

  // Helper to get user-scoped localStorage key
  const userIdRef = React.useRef(null);
  React.useEffect(() => { userIdRef.current = currentUser?.id ?? null; }, [currentUser]);
  function _save(key, set) {
    const uid = userIdRef.current;
    if (!uid) return;
    try { localStorage.setItem(`${key}-${uid}`, JSON.stringify([...set])); } catch (_) {}
  }

  // â”€â”€ Modal state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [activeModal, setActiveModal] = React.useState(null);
  const [modalData, setModalData] = React.useState(null);

  // â”€â”€ Toast state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [toasts, setToasts] = React.useState([]);

  // â”€â”€ Load user-scoped state once currentUser is known â”€â”€â”€â”€â”€
  React.useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.id;
    try {
      const c = localStorage.getItem(`li-connections-${uid}`);
      if (c) setConnections(new Set(JSON.parse(c)));
      const f = localStorage.getItem(`li-following-${uid}`);
      if (f) setFollowing(new Set(JSON.parse(f)));
      const l = localStorage.getItem(`li-liked-posts-${uid}`);
      setLikedPosts(l ? new Set(JSON.parse(l)) : new Set());
      const sl = localStorage.getItem(`li-shortlisted-${uid}`);
      setShortlisted(sl ? new Map(JSON.parse(sl)) : new Map());
    } catch (_) {}
  }, [currentUser?.id]);

  // â”€â”€ Bootstrap: fetch current user on mount â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  React.useEffect(() => {
    API.getMe()
      .then(user => {
        setCurrentUser(user);
        setAppLoading(false);
      })
      .catch(err => {
        if (err.status === 401) {
          // Session expired or invalid â€” clear stored credentials and go to login
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

  // â”€â”€ Load social state from server (overrides localStorage) â”€
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

  // â”€â”€ Dark mode effect â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  React.useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('li-dark-mode', darkMode ? '1' : '0');
  }, [darkMode]);

  // â”€â”€ Settings persistence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  React.useEffect(() => {
    try { localStorage.setItem('li-settings', JSON.stringify(settings)); } catch {}
  }, [settings]);

  // â”€â”€ Actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        _save('li-liked-posts', next);
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
    setPendingInvitations(prev =>
      prev.filter(inv => String((inv.user || inv).id || inv.senderId || inv.userId || '') !== String(userId))
    );
    API.acceptConnection(userId).catch(() => {});
  }

  function refreshInvitations() {
    API.getInvitations().then(invs => setPendingInvitations(invs || [])).catch(() => {});
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
    // User status
    userStatus,
    setUserStatus,
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
    language,
    setLanguage,
    t,
    refreshInvitations,
  };

  return React.createElement(AppContext.Provider, { value: ctx }, children);
}
