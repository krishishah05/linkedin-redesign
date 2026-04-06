/* ============================================================
   NAVBAR.JS — Top navigation bar (replaces static HTML nav)
   ============================================================ */
function NavBar() {
  const { currentUser, unreadMessages, pendingInvitations, openModal, showToast, darkMode, setDarkMode } =
    React.useContext(AppContext);
  const currentHash = useHash();

  const [meOpen, setMeOpen] = React.useState(false);
  const [searchVal, setSearchVal] = React.useState('');
  const [suggestions, setSuggestions] = React.useState([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const searchListId = 'nav-search-listbox';
  const meMenuId = 'nav-me-menu';

  const meBtnRef = React.useRef(null);

  // Close dropdowns on outside click
  React.useEffect(() => {
    function handleClick(e) {
      if (!e.target.closest('#nav-me-wrap')) setMeOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close menus on Escape
  React.useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        setMeOpen(false);
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
    { id: 'feed',          label: 'Home',          badge: 0,                         icon: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/> },
    { id: 'network',       label: 'My Network',    badge: pendingInvitations.length,  icon: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/> },
    { id: 'jobs',          label: 'Jobs',          badge: 0,                         icon: <path d="M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.51 15.49 0 12.36 0c-1.4 0-2.72.56-3.71 1.56L12 4.91l3.35-3.35C15.69 2.65 16 3.32 16 4.07c0 .9-.66 1.65-1.5 1.8L14.18 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/> },
    { id: 'messaging',     label: 'Messaging',     badge: unreadMessages,            icon: <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/> },
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

          {/* Dark mode toggle */}
          <button
            type="button"
            className="li-nav__dark-toggle"
            onClick={() => setDarkMode(v => !v)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 000-1.41l-1.06-1.06zm1.06-12.37l-1.06 1.06a.996.996 0 000 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 000-1.41-.996.996 0 00-1.41 0zM7.05 18.36l-1.06 1.06a.996.996 0 000 1.41c.39.39 1.03.39 1.41 0l1.06-1.06a.996.996 0 000-1.41-.996.996 0 00-1.41 0z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 3a9 9 0 100 18A9 9 0 0012 3zm0 16a7 7 0 010-14 7.07 7.07 0 011 .07A5.5 5.5 0 0012 17.5a5.5 5.5 0 004.93-7.93c.36.12.72.27 1.07.43A7 7 0 0112 19z"/>
              </svg>
            )}
          </button>

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


                </div>

                <div className="li-dropdown__divider" />

                <button
                  type="button"
                  className="li-dropdown__item"
                  role="menuitem"
                  onClick={() => {
                    localStorage.removeItem('nx-token'); localStorage.removeItem('nx-uid');
                    ['li-liked-posts','li-saved-jobs','li-connections','li-following','li-pending-conn',
                     'li-dismissed-inv','li-applied-jobs','li-joined-groups','li-settings',
                     'li-attending-events','li-interested-events'].forEach(k => localStorage.removeItem(k));
                    window.location.href = 'index.html';
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>


        </div>
      </div>
    </nav>
  );
}