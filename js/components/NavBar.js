/* ============================================================
   NAVBAR.JS — Top navigation bar (replaces static HTML nav)
   ============================================================ */
function NavBar() {
  const { currentUser, unreadMessages, unreadNotifications, openModal, showToast, darkMode, setDarkMode } =
    React.useContext(AppContext);
  const currentHash = useHash();

  const [meOpen, setMeOpen] = React.useState(false);
  const [workOpen, setWorkOpen] = React.useState(false);

  const [searchVal, setSearchVal] = React.useState('');
  const [suggestions, setSuggestions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const searchListId = 'nav-search-listbox';
  const meMenuId = 'nav-me-menu';
  const workMenuId = 'nav-work-menu';

  const meBtnRef = React.useRef(null);
  const workBtnRef = React.useRef(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('#nav-me-wrap')) setMeOpen(false);
      if (!e.target.closest('#nav-work-wrap')) setWorkOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close menus on Escape
  React.useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setMeOpen(false);
        setWorkOpen(false);
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleSearchInput(val) {
    setSearchVal(val);
    setActiveIndex(-1);

    if (!val.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    API.search(val)
      .then(results => {
        // API returns {users:[], jobs:[], posts:[], query:''}
        const users = (results.users || []).slice(0, 4);
        const jobs = (results.jobs || []).slice(0, 2);
        const combined = [...users, ...jobs];
        setSuggestions(combined.slice(0, 6));
        setShowSuggestions(true);
      })
      .catch(() => {
        setSuggestions([]);
        setShowSuggestions(false);
      });
  }

  function goToSearchValue(v) {
    const q = encodeURIComponent(v || '');
    navigate(`search?q=${q}`);
    setShowSuggestions(false);
    setActiveIndex(-1);
  }

  function handleSearchKeyDown(e) {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter' && searchVal.trim()) {
        goToSearchValue(searchVal.trim());
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const s = suggestions[activeIndex];
      if (s) goToSearchValue(s.name || s.title || s.query || '');
      else if (searchVal.trim()) goToSearchValue(searchVal.trim());
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }

  const navItems = [
    { id: 'feed',          label: 'Home',          badge: 0,                    icon: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/> },
    { id: 'network',       label: 'My Network',    badge: 3,                    icon: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/> },
    { id: 'jobs',          label: 'Jobs',          badge: 0,                    icon: <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.51 15.49 0 12.36 0c-1.4 0-2.72.56-3.71 1.56L12 4.91l3.35-3.35C15.69 2.65 16 3.32 16 4.07c0 .9-.66 1.65-1.5 1.8L14.18 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/> },
    { id: 'messaging',     label: 'Messaging',     badge: unreadMessages,       icon: <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/> },
    { id: 'notifications', label: 'Notifications', badge: unreadNotifications,  icon: <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/> },
  ];

  const appItems = [
    { label: 'Learning',  icon: <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>, color: '#0F5DBD', page: 'learning' },
    { label: 'Jobs',      icon: <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.51 15.49 0 12.36 0c-1.4 0-2.72.56-3.71 1.56L12 4.91l3.35-3.35C15.69 2.65 16 3.32 16 4.07c0 .9-.66 1.65-1.5 1.8L14.18 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/>, color: '#915907', page: 'jobs' },
    { label: 'Groups',    icon: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>, color: '#6B46C1', page: 'groups' },
    { label: 'Events',    icon: <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>, color: '#E67E22', page: 'events' },
  ];

  return (
    <nav className="li-nav" id="main-nav" aria-label="Primary">
      <div className="li-nav__inner">

        {/* Logo */}
        <a
          className="li-nav__logo"
          href="#"
          onClick={e => { e.preventDefault(); navigate('feed'); }}
          aria-label="Nexus Home"
        >
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true" focusable="false">
            <rect width="34" height="34" rx="6" fill="#0F5DBD"/>
            <text x="8" y="25" fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" fontSize="20" fontWeight="800" fill="#fff">N</text>
          </svg>
        </a>

        {/* Search (combobox + listbox) */}
        <div className="li-nav__search" style={{ position: 'relative' }}>
          <span className="li-nav__search-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </span>

          <input
            type="text"
            className="li-nav__search-input"
            id="nav-search"
            placeholder="Search"
            autoComplete="off"
            value={searchVal}
            onChange={e => handleSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => { if (searchVal.trim() && suggestions.length) setShowSuggestions(true); }}
            onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveIndex(-1); }, 150)}
            aria-label="Search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showSuggestions && suggestions.length > 0}
            aria-controls={searchListId}
            aria-activedescendant={activeIndex >= 0 ? `sugg-${activeIndex}` : undefined}
          />

          {showSuggestions && suggestions.length > 0 && (
            <div
              className="search-suggestions"
              id={searchListId}
              role="listbox"
              aria-label="Search suggestions"
              style={{ display: 'block', position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999 }}
            >
              {suggestions.map((s, i) => {
                const label = s.name || s.title || s.query || '';
                const selected = i === activeIndex;

                return (
                  <button
                    key={i}
                    id={`sugg-${i}`}
                    type="button"
                    className={`sugg-item${selected ? ' is-active' : ''}`}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => {
                      // prevent blur before click fires
                      e.preventDefault();
                      goToSearchValue(label);
                    }}
                  >
                    <Avatar name={label} size={28} />
                    <span style={{ fontSize: 13, textAlign: 'left' }}>
                      <span style={{ fontWeight: 600, display: 'block' }}>{label}</span>
                      {s.headline && <span style={{ color: 'var(--text-2)', display: 'block' }}>{s.headline}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Nav Items */}
        <div className="li-nav__items">
          {navItems.map(item => {
            const isActive = currentHash === item.id;
            const badgeText = item.badge > 0 ? `, ${item.badge} unread` : '';
            return (
              <button
                key={item.id}
                className={`li-nav__item${isActive ? ' active' : ''}`}
                id={`nav-${item.id}`}
                onClick={() => navigate(item.id)}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${item.label}${badgeText}`}
                type="button"
              >
                <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                  {item.icon}
                </svg>
                <span className="li-nav__item-label">{item.label}</span>
                {item.badge > 0 && (
                  <span className="li-nav__item-badge" aria-hidden="true">{item.badge}</span>
                )}
              </button>
            );
          })}

          <div className="li-nav__divider" />

          {/* Me dropdown */}
          <div className="li-nav__item li-nav__me" id="nav-me-wrap">
            <button
              ref={meBtnRef}
              className="li-nav__menu-btn"
              id="nav-me-btn"
              type="button"
              onClick={() => setMeOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={meOpen}
              aria-controls={meMenuId}
              aria-label="Account menu"
            >
              <span className="li-nav__me-avatar" id="nav-avatar" aria-hidden="true">
                {currentUser ? getInitials(currentUser.name) : '?'}
              </span>
              <span className="li-nav__item-label">Me ▾</span>
            </button>

            {meOpen && (
              <div className="li-dropdown" id={meMenuId} role="menu" style={{ display: 'block' }}>
                <div className="li-dropdown__header">
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {currentUser && <Avatar name={currentUser.name} size={56} />}
                    <div>
                      <div className="li-dropdown__header-name">{currentUser ? currentUser.name : ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 220, lineHeight: 1.3 }}>
                        {currentUser ? currentUser.headline : ''}
                      </div>
                    </div>
                  </div>

                  <a
                    href="#"
                    className="li-dropdown__header-link"
                    onClick={e => { e.preventDefault(); navigate('profile'); setMeOpen(false); }}
                    role="menuitem"
                  >
                    View Profile
                  </a>
                </div>

                <div style={{ padding: '8px 0' }}>
                  <div style={{ padding: '6px 16px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>
                    Account
                  </div>

                  <button
                    type="button"
                    className="li-dropdown__item"
                    role="menuitem"
                    onClick={() => { navigate('settings'); setMeOpen(false); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                      <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                    </svg>
                    <span>Settings &amp; Privacy</span>
                  </button>

                  <button
                    type="button"
                    className="li-dropdown__item"
                    role="menuitem"
                    onClick={() => { showToast('Help center — coming soon'); setMeOpen(false); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
                    </svg>
                    <span>Help</span>
                  </button>

                  <button
                    type="button"
                    className="li-dropdown__item"
                    role="menuitem"
                    onClick={() => { setDarkMode(v => !v); setMeOpen(false); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                      <path d="M20 15.31L23.31 12 20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
                    </svg>
                    <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                  </button>
                </div>

                <div className="li-dropdown__divider" />

                <button
                  type="button"
                  className="li-dropdown__item"
                  role="menuitem"
                  onClick={() => { window.location.href = 'index.html'; }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Work / Apps dropdown */}
          <div className="li-nav__item" id="nav-work-wrap">
            <button
              ref={workBtnRef}
              className="li-nav__menu-btn"
              id="nav-work-btn"
              type="button"
              onClick={() => setWorkOpen(v => !v)}
              aria-haspopup="menu"
              aria-expanded={workOpen}
              aria-controls={workMenuId}
              aria-label="For Business menu"
            >
              <svg className="nav-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
                <path d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"/>
              </svg>
              <span className="li-nav__item-label">For Business ▾</span>
            </button>

            {workOpen && (
              <div className="li-dropdown li-apps-dropdown" id={workMenuId} role="menu" style={{ display: 'block' }}>
                <div style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, borderBottom: '1px solid var(--border)' }}>
                  Explore Nexus
                </div>
                <div className="li-apps-grid">
                  {appItems.map(item => (
                    <button
                      key={item.label}
                      type="button"
                      className="li-app-item"
                      role="menuitem"
                      onClick={() => {
                        setWorkOpen(false);
                        if (item.page) navigate(item.page);
                        else showToast(`${item.label} — coming soon`);
                      }}
                    >
                      <span className="li-app-icon" style={{ background: item.color, color: '#fff' }} aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden="true" focusable="false">
                          {item.icon}
                        </svg>
                      </span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}