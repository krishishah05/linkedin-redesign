/* ============================================================
   APPCONTEXT.JS — Global React state and actions
   Replaces the monolithic App.state object from app.js.
   ============================================================ */
const TRANSLATIONS = {
  en: {
    home: 'Home', myNetwork: 'My Network', network: 'Network', jobs: 'Jobs', messaging: 'Messaging',
    messages: 'Messages', conferences: 'Conferences', me: 'Me ▾', meShort: 'Me', search: 'Search',
    settings: 'Settings', settingsPrivacy: 'Settings & Privacy', signOut: 'Sign out',
    startPost: 'Start a post', photo: 'Photo', video: 'Video', writeArticle: 'Write article',
    post: 'Post', publish: 'Publish', cancel: 'Cancel', whatToTalk: 'What do you want to talk about?',
    editTemplate: 'Edit the template, then publish your article...', like: 'Like', comment: 'Comment',
    repost: 'Repost', send: 'Send', chooseTemplate: 'Choose an article template',
    uploadVideoUrl: 'Upload video URL...', pasteImageUrl: 'Paste image URL...', article: 'ARTICLE',
    loadingProfile: 'Loading profile...', profileNotFound: 'Profile not found',
    editProfile: 'Edit profile', share: 'Share', connect: 'Connect', pending: 'Pending',
    follow: 'Follow', following: 'Following', shortlist: 'Shortlist', shortlisted: 'Shortlisted',
    candidateShortlist: 'Candidate Shortlist', exportToExcel: 'Export to Excel',
    openToWork: 'Open to Work', language: 'Language', displayPreferences: 'Display preferences',
    darkMode: 'Dark mode'
  },
  es: {
    home: 'Inicio', myNetwork: 'Mi Red', network: 'Red', jobs: 'Empleos', messaging: 'Mensajes',
    messages: 'Mensajes', conferences: 'Conferencias', me: 'Yo ▾', meShort: 'Yo', search: 'Buscar',
    settings: 'Configuración', settingsPrivacy: 'Configuración y privacidad', signOut: 'Cerrar sesión',
    startPost: 'Iniciar publicación', photo: 'Foto', video: 'Vídeo', writeArticle: 'Escribir artículo',
    post: 'Publicar', publish: 'Publicar', cancel: 'Cancelar', whatToTalk: '¿De qué quieres hablar?',
    editTemplate: 'Edita la plantilla y publica tu artículo...', like: 'Me gusta', comment: 'Comentar',
    repost: 'Compartir', send: 'Enviar', chooseTemplate: 'Elige una plantilla de artículo',
    uploadVideoUrl: 'URL del vídeo...', pasteImageUrl: 'URL de la imagen...', article: 'ARTÍCULO',
    loadingProfile: 'Cargando perfil...', profileNotFound: 'Perfil no encontrado',
    editProfile: 'Editar perfil', share: 'Compartir', connect: 'Conectar', pending: 'Pendiente',
    follow: 'Seguir', following: 'Siguiendo', shortlist: 'Lista corta', shortlisted: 'En lista',
    candidateShortlist: 'Lista de candidatos', exportToExcel: 'Exportar a Excel',
    openToWork: 'Abierto a trabajar', language: 'Idioma', displayPreferences: 'Preferencias de pantalla',
    darkMode: 'Modo oscuro'
  },
  fr: {
    home: 'Accueil', myNetwork: 'Mon réseau', network: 'Réseau', jobs: 'Emplois', messaging: 'Messagerie',
    messages: 'Messages', conferences: 'Conférences', me: 'Moi ▾', meShort: 'Moi', search: 'Rechercher',
    settings: 'Paramètres', settingsPrivacy: 'Paramètres et confidentialité', signOut: 'Se déconnecter',
    startPost: 'Commencer une publication', photo: 'Photo', video: 'Vidéo', writeArticle: 'Écrire un article',
    post: 'Publier', publish: 'Publier', cancel: 'Annuler', whatToTalk: 'De quoi souhaitez-vous parler ?',
    editTemplate: 'Modifiez le modèle, puis publiez votre article...', like: 'Aimer', comment: 'Commenter',
    repost: 'Repartager', send: 'Envoyer', chooseTemplate: 'Choisissez un modèle d’article',
    uploadVideoUrl: 'URL de la vidéo...', pasteImageUrl: 'URL de l’image...', article: 'ARTICLE',
    loadingProfile: 'Chargement du profil...', profileNotFound: 'Profil introuvable',
    editProfile: 'Modifier le profil', share: 'Partager', connect: 'Se connecter', pending: 'En attente',
    follow: 'Suivre', following: 'Abonné', shortlist: 'Présélection', shortlisted: 'Présélectionné',
    candidateShortlist: 'Présélection de candidats', exportToExcel: 'Exporter vers Excel',
    openToWork: 'Ouvert aux opportunités', language: 'Langue', displayPreferences: 'Préférences d’affichage',
    darkMode: 'Mode sombre'
  },
  de: {
    home: 'Startseite', myNetwork: 'Mein Netzwerk', network: 'Netzwerk', jobs: 'Jobs', messaging: 'Nachrichten',
    messages: 'Nachrichten', conferences: 'Konferenzen', me: 'Ich ▾', meShort: 'Ich', search: 'Suchen',
    settings: 'Einstellungen', settingsPrivacy: 'Einstellungen & Datenschutz', signOut: 'Abmelden',
    startPost: 'Beitrag starten', photo: 'Foto', video: 'Video', writeArticle: 'Artikel schreiben',
    post: 'Posten', publish: 'Veröffentlichen', cancel: 'Abbrechen', whatToTalk: 'Worüber möchtest du sprechen?',
    editTemplate: 'Vorlage bearbeiten und Artikel veröffentlichen...', like: 'Gefällt mir', comment: 'Kommentieren',
    repost: 'Teilen', send: 'Senden', chooseTemplate: 'Artikelvorlage wählen',
    uploadVideoUrl: 'Video-URL...', pasteImageUrl: 'Bild-URL...', article: 'ARTIKEL',
    loadingProfile: 'Profil wird geladen...', profileNotFound: 'Profil nicht gefunden',
    editProfile: 'Profil bearbeiten', share: 'Teilen', connect: 'Vernetzen', pending: 'Ausstehend',
    follow: 'Folgen', following: 'Folge ich', shortlist: 'Auswahl', shortlisted: 'Ausgewählt',
    candidateShortlist: 'Kandidatenauswahl', exportToExcel: 'Nach Excel exportieren',
    openToWork: 'Offen für Arbeit', language: 'Sprache', displayPreferences: 'Anzeigeeinstellungen',
    darkMode: 'Dunkler Modus'
  },
  ja: {
    home: 'ホーム', myNetwork: 'マイネットワーク', network: 'ネットワーク', jobs: '求人', messaging: 'メッセージ',
    messages: 'メッセージ', conferences: 'カンファレンス', me: '自分 ▾', meShort: '自分', search: '検索',
    settings: '設定', settingsPrivacy: '設定とプライバシー', signOut: 'ログアウト',
    startPost: '投稿を開始', photo: '写真', video: '動画', writeArticle: '記事を書く',
    post: '投稿', publish: '公開', cancel: 'キャンセル', whatToTalk: '何について話したいですか？',
    editTemplate: 'テンプレートを編集して記事を公開...', like: 'いいね', comment: 'コメント',
    repost: '共有', send: '送信', chooseTemplate: '記事テンプレートを選択',
    uploadVideoUrl: '動画URLを入力...', pasteImageUrl: '画像URLを入力...', article: '記事',
    loadingProfile: 'プロフィールを読み込み中...', profileNotFound: 'プロフィールが見つかりません',
    editProfile: 'プロフィール編集', share: '共有', connect: 'つながる', pending: '保留中',
    follow: 'フォロー', following: 'フォロー中', shortlist: '候補リスト', shortlisted: '候補済み',
    candidateShortlist: '候補者リスト', exportToExcel: 'Excelにエクスポート',
    openToWork: '仕事を探しています', language: '言語', displayPreferences: '表示設定',
    darkMode: 'ダークモード'
  },
};

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
  const [recruiterPanelOpen, setRecruiterPanelOpen] = React.useState(false);

  // User availability status: 'open_to_work' | 'conferences' | 'recruiting' | 'not_looking' | null
  const [userStatus, setUserStatusState] = React.useState(null);

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
  }, [currentUser]);

  // Clear recruiter mode when status changes away from 'recruiting'
  React.useEffect(() => {
    if (userStatus !== null && userStatus !== 'recruiting' && recruiterMode) {
      setRecruiterModeState(false);
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
      try { localStorage.setItem('li-shortlisted', JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function removeFromShortlist(userId) {
    setShortlisted(prev => {
      const next = new Map(prev);
      next.delete(String(userId));
      try { localStorage.setItem('li-shortlisted', JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function clearShortlist() {
    setShortlisted(new Map());
    try { localStorage.removeItem('li-shortlisted'); } catch {}
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
    const next = TRANSLATIONS[lang] ? lang : 'en';
    setLanguageState(next);
    try { localStorage.setItem('li-language', next); } catch {}
  }

  function t(key) {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return dict[key] || TRANSLATIONS.en[key] || key;
  }

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
    language,
    setLanguage,
    t,
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
  };

  return React.createElement(AppContext.Provider, { value: ctx }, children);
}
