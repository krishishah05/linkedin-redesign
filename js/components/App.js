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
    'jobs':          <JobsPage jobId={params.id} />,
    'messaging':     <MessagingPage />,
    'notifications': <NotificationsPage />,
    'search':        <SearchPage query={params.q || ''} />,
    'company':       <CompanyPage companyId={params.id} />,
    'groups':        <GroupsPage />,
    'group-detail':  <GroupDetailPage groupId={params.id} />,
    'events':        <EventsPage />,
    'learning':      <LearningPage />,
    'settings':      <SettingsPage />,
    'premium':       <PremiumPage />,
  };

  return pageMap[route] || pageMap['feed'];
}

/* ── App shell ───────────────────────────────────────────── */
function AppShell() {
  const { appLoading, appError } = React.useContext(AppContext);

  if (appLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 48 48">
            <rect width="48" height="48" rx="8" fill="#0A66C2"/>
            <text x="8" y="36" fontFamily="Georgia,serif" fontSize="30" fontWeight="bold" fill="#fff">in</text>
          </svg>
          <p style={{ color: 'var(--text-2)', fontFamily: 'sans-serif', marginTop: 12 }}>Loading LinkedIn...</p>
        </div>
      </div>
    );
  }

  if (appError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <rect width="48" height="48" rx="8" fill="#0A66C2"/>
          <text x="8" y="36" fontFamily="Georgia,serif" fontSize="30" fontWeight="bold" fill="#fff">in</text>
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
      <NavBar />
      <main className="li-page" id="app-root">
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
