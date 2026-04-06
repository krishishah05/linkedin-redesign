/* ============================================================
   SEARCHPAGE.JS — Search results
   ============================================================ */
function SearchPage({ query }) {
  const { connect, pendingConnections, connections, showToast } = React.useContext(AppContext);
  const [results, setResults] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [filter, setFilter] = React.useState('all');
  const [localQuery, setLocalQuery] = React.useState(query || '');

  React.useEffect(() => {
    if (!query) return;
    setLocalQuery(query);
    setLoading(true);
    API.search(query)
      .then(data => { setResults(data); setLoading(false); })
      .catch(() => { setLoading(false); showToast('Search failed. Please try again.', 'error'); });
  }, [query]);

  function doSearch(q) {
    if (!q.trim()) return;
    navigate(`search?q=${encodeURIComponent(q.trim())}`);
  }

  const people = results?.users || [];
  const jobs = results?.jobs || [];
  const posts = results?.posts || [];
  const companies = results?.companies || [];

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'people', label: `People (${people.length})` },
    { key: 'jobs', label: `Jobs (${jobs.length})` },
    { key: 'companies', label: `Companies (${companies.length})` },
    { key: 'posts', label: `Posts (${posts.length})` },
  ];

  return (
    <div className="li-page-inner" style={{ maxWidth: 900 }}>
      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={localQuery}
          onChange={e => setLocalQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && doSearch(localQuery)}
          placeholder="Search Nexus"
          style={{
            flex: 1, padding: '10px 16px',
            border: '1px solid var(--border-2)', borderRadius: 4,
            fontSize: 14, outline: 'none', background: 'var(--white)', color: 'var(--text)',
          }}
        />
        <button className="li-btn li-btn--primary" onClick={() => doSearch(localQuery)}>Search</button>
      </div>

      {/* Tabs */}
      {results && (
        <div className="li-card" style={{ padding: 0, marginBottom: 16 }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setFilter(t.key)}
                style={{
                  padding: '12px 16px', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap',
                  color: filter === t.key ? 'var(--text)' : 'var(--text-2)',
                  background: 'none', border: 'none',
                  borderBottom: filter === t.key ? '2px solid var(--text)' : '2px solid transparent',
                  cursor: 'pointer', marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <LoadingSpinner text="Searching..." />}

      {!loading && !query && (
        <div className="li-card" style={{ padding: 40, textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Search for people, jobs, companies, and posts.</p>
        </div>
      )}

      {!loading && query && results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* People */}
          {(filter === 'all' || filter === 'people') && people.length > 0 && (
            <div className="li-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>People</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(filter === 'all' ? people.slice(0, 3) : people).map(user => {
                  const isPending = pendingConnections.has(String(user.id));
                  const isConnected = connections.has(String(user.id));
                  return (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={user.name} size={48} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}
                          onClick={() => navigate(`profile?id=${user.id}`)}
                        >
                          {user.name}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{user.headline}</div>
                        {user.location && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{user.location}</div>}
                      </div>
                      {isConnected ? (
                        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Connected</span>
                      ) : (
                        <button
                          className="li-btn li-btn--outline li-btn--sm"
                          disabled={isPending}
                          onClick={() => { connect(user.id); showToast(`Invitation sent to ${user.name}`); }}
                        >
                          {isPending ? 'Pending' : '+ Connect'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Jobs */}
          {(filter === 'all' || filter === 'jobs') && jobs.length > 0 && (
            <div className="li-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Jobs</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(filter === 'all' ? jobs.slice(0, 3) : jobs).map(job => (
                  <div key={job.id} style={{ display: 'flex', gap: 12, cursor: 'pointer' }}
                    onClick={() => navigate(`jobs?id=${job.id}`)}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 4, background: 'var(--bg-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-3)">
                        <path d="M20 6h-2.18c.07-.44.18-.86.18-1a3 3 0 0 0-6 0c0 .14.11.56.18 1H10C8.9 6 8 6.9 8 8v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-1a1 1 0 0 1 2 0c0 .14-.05.27-.08.41a.75.75 0 0 1 0 .18c-.03.14-.08.27-.13.41H13.21c-.05-.14-.1-.27-.13-.41a.75.75 0 0 1 0-.18C13.05 5.27 13 5.14 13 5zm7 15H10V8h2v1h6V8h2v12z"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>{job.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{job.company}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{job.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Companies */}
          {(filter === 'all' || filter === 'companies') && companies.length > 0 && (
            <div className="li-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Companies</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(filter === 'all' ? companies.slice(0, 3) : companies).map(co => (
                  <div key={co.id} style={{ display: 'flex', gap: 12, cursor: 'pointer' }}
                    onClick={() => navigate(`company?id=${co.id}`)}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 4, background: 'var(--bg-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-3)">
                        <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>{co.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{co.industry}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatNumber(co.followers || 0)} followers</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {people.length === 0 && jobs.length === 0 && companies.length === 0 && posts.length === 0 && (
            <div className="li-card" style={{ padding: 40, textAlign: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No results for "{query}"</h3>
              <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Try different keywords or check your spelling.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
