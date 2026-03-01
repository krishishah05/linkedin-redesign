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
  const [likedPosts, setLikedPosts] = React.useState(() => new Set());
  const [savedJobs, setSavedJobs] = React.useState(() => new Set());
  const [connections, setConnections] = React.useState(() => new Set());
  const [following, setFollowing] = React.useState(() => new Set());
  const [pendingConnections, setPendingConnections] = React.useState(() => new Set());

  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);

  const [darkMode, setDarkMode] = React.useState(
    () => localStorage.getItem('li-dark-mode') === '1'
  );

  const [settings, setSettings] = React.useState({
    emailNotifications: true,
    pushNotifications: true,
    publicProfile: true,
    showConnections: true,
    openToWork: false,
    twoFactor: false,
  });

  // ── Modal state ───────────────────────────────────────────
  const [activeModal, setActiveModal] = React.useState(null);
  const [modalData, setModalData] = React.useState(null);

  // ── Toast state ───────────────────────────────────────────
  const [toasts, setToasts] = React.useState([]);

  // ── Bootstrap: fetch current user on mount ────────────────
  React.useEffect(() => {
    API.getMe()
      .then(user => {
        setCurrentUser(user);
        setAppLoading(false);
        // Pre-populate UI state from user data
        if (user.connections) {
          // Seed connections Set from API if needed
        }
      })
      .catch(err => {
        setAppError(err.message);
        setAppLoading(false);
      });
  }, []);

  // Fetch unread counts on mount
  React.useEffect(() => {
    Promise.all([
      API.getConversations().catch(() => []),
      API.getNotifications().catch(() => []),
    ]).then(([convs, notifs]) => {
      const msgs = convs.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      const unreadNotifs = notifs.filter(n => !n.isRead).length;
      setUnreadMessages(msgs);
      setUnreadNotifications(unreadNotifs);
    });
  }, []);

  // ── Dark mode effect ──────────────────────────────────────
  React.useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('li-dark-mode', darkMode ? '1' : '0');
  }, [darkMode]);

  // ── Actions ───────────────────────────────────────────────
  function toggleLike(postId) {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  }

  function toggleSaveJob(jobId) {
    setSavedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  function connect(userId) {
    setPendingConnections(prev => new Set([...prev, String(userId)]));
  }

  function acceptConnection(userId) {
    setConnections(prev => new Set([...prev, String(userId)]));
    setPendingConnections(prev => {
      const next = new Set(prev);
      next.delete(String(userId));
      return next;
    });
  }

  function follow(userId) {
    setFollowing(prev => new Set([...prev, String(userId)]));
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
    // Actions
    toggleLike,
    toggleSaveJob,
    connect,
    acceptConnection,
    follow,
    setDarkMode,
    setSettings,
    setUnreadMessages,
    setUnreadNotifications,
    openModal,
    closeModal,
    showToast,
  };

  return React.createElement(AppContext.Provider, { value: ctx }, children);
}
