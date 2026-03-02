/* ============================================================
   APP.JS — Root React component; boots the entire SPA.

   Load order in app.html (all type="text/babel"):
     js/api.js (plain JS, loaded first)
     js/components/utils.js
     js/components/AppContext.js
     js/components/shared/Avatar.js
     js/components/shared/LoadingSpinner.js
     js/components/ToastContainer.js
     (all page components)
     (all modal components)
     js/components/NavBar.js
     js/components/MobileNav.js
     js/components/App.js        ← this file (last)
   ============================================================ */

/* ── Page router ─────────────────────────────────────────── */
function Router() {
  const hash = useHash();

  // Parse base route and optional query params
  const [route, queryStr] = hash.split('?');
  const params = {};
  if (queryStr) {
    queryStr.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }

  const pageMap = {
    'feed':          <FeedPage />,
    'profile':       <ProfilePage userId={params.id} />,
    'network':       <NetworkPage />,
    'jobs':          <JobsPage selectedJobId={params.id} />,
    'messaging':     <MessagingPage />,
    'notifications': <NotificationsPage />,
    'search':        <SearchPage query={params.q || ''} />,
    'company':       <CompanyPage companyId={params.id} />,
    'groups':        <GroupsPage />,
    'group-detail':  <GroupDetailPage groupId={params.id} />,
    'events':        <EventsPage />,
    'learning':      <LearningPage />,
    'settings':      <SettingsPage />,
  };

  return pageMap[route] || pageMap['feed'];
}

/* ── App shell ───────────────────────────────────────────── */
function AppShell() {
  const { appLoading, appError } = React.useContext(AppContext);
  const hash = useHash();

  // Move focus to main content on route changes (hash navigation)
  React.useEffect(() => {
    const main = document.getElementById('app-root');
    if (main) main.focus();
  }, [hash]);

  if (appLoading) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div style={{ textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
            <rect width="48" height="48" rx="8" fill="#0F5DBD" />
            <text
              x="11"
              y="36"
              fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
              fontSize="28"
              fontWeight="800"
              fill="#fff"
            >
              N
            </text>
          </svg>
          <p style={{ color: 'var(--text-2)', fontFamily: 'sans-serif', marginTop: 12 }}>
            Loading Nexus...
          </p>
        </div>
      </div>
    );
  }

  if (appError) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          flexDirection: 'column',
          gap: 12
        }}
        role="alert"
      >
        <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
          <rect width="48" height="48" rx="8" fill="#0F5DBD" />
          <text
            x="11"
            y="36"
            fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"
            fontSize="28"
            fontWeight="800"
            fill="#fff"
          >
            N
          </text>
        </svg>
        <p style={{ color: 'var(--text-2)', maxWidth: 400, textAlign: 'center' }}>
          Could not connect to the backend. Make sure <code>python backend/app.py</code> is running.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{appError}</p>
        <button className="li-btn li-btn--primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Skip link for keyboard users */}
      <a className="skip-link" href="#app-root">
        Skip to main content
      </a>

      <NavBar />

      {/* Make main focusable so we can move focus here on navigation */}
      <main className="li-page" id="app-root" tabIndex="-1">
        <Router />
      </main>

      <MobileNav />
      <ModalContainer />
      <ToastContainer />
    </>
  );
}
/* ── Root ────────────────────────────────────────────────── */
function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

/* ── Mount ───────────────────────────────────────────────── */
const rootEl = document.getElementById('react-root');
ReactDOM.createRoot(rootEl).render(<App />);
