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
      .catch(() => { setLoading(false); });
  }, [query]);

  function doSearch(q) {
    if (!q.trim()) return;
    navigate(`search/${encodeURIComponent(q.trim())}`);
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
          placeholder="Search LinkedIn"
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
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
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
                          onClick={() => navigate(`profile/${user.id}`)}
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
                    onClick={() => navigate(`job/${job.id}`)}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 4, background: 'var(--bg-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>💼</div>
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
                    onClick={() => navigate(`company/${co.id}`)}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 4, background: 'var(--bg-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0,
                    }}>🏢</div>
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
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No results for "{query}"</h3>
              <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Try different keywords or check your spelling.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
