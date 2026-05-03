/* ============================================================
   SEARCHPAGE.JS — Search results
   ============================================================ */
function SearchPage({ query }) {
  const { connect, pendingConnections, connections, showToast } = React.useContext(AppContext);
  const [results, setResults] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!query) return;
    setLoading(true);
    API.search(query)
      .then(data => { setResults(data); setLoading(false); })
      .catch(() => { setLoading(false); showToast('Search failed. Please try again.', 'error'); });
  }, [query]);

  const people    = results?.users     || [];
  const jobs      = results?.jobs      || [];
  const companies = results?.companies || [];
  const hasResults = people.length > 0 || jobs.length > 0 || companies.length > 0;

  if (!query) {
    return (
      <div className="li-page-inner" style={{ maxWidth: 700 }}>
        <div className="li-card" style={{ padding: 40, textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Search for people, companies, and jobs using the bar above.</p>
        </div>
      </div>
    );
  }

  if (loading) return <LoadingSpinner text="Searching..." />;

  return (
    <div className="li-page-inner" style={{ maxWidth: 700, flexDirection: 'column', gap: 16 }}>
      {!hasResults ? (
        <div className="li-card" style={{ padding: 40, textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>No results for "{query}"</h3>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Try different keywords or check your spelling.</p>
        </div>
      ) : (
        <>
          {people.length > 0 && (
            <div className="li-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>People</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {people.map(user => {
                  const isPending   = pendingConnections.has(String(user.id));
                  const isConnected = connections.has(String(user.id));
                  return (
                    <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <Avatar name={user.name} size={48} photo={user.photo} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}
                          onClick={() => navigate(`profile?id=${user.id}`)}>
                          {user.name}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{user.headline}</div>
                        {user.location && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{user.location}</div>}
                      </div>
                      {isConnected ? (
                        <span style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Connected</span>
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

          {companies.length > 0 && (
            <div className="li-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Companies</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {companies.map(co => (
                  <div key={co.id} role="button" tabIndex={0}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => navigate(`company?id=${co.id}`)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`company?id=${co.id}`); }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {co.logo || '🏢'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{co.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{co.industry}</div>
                      {co.headquarters && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{co.headquarters}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {jobs.length > 0 && (
            <div className="li-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Jobs</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {jobs.map(job => (
                  <div key={job.id} role="button" tabIndex={0}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => navigate(`jobs?id=${job.id}`)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') navigate(`jobs?id=${job.id}`); }}>
                    <div style={{ width: 48, height: 48, borderRadius: 8, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      💼
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{job.title}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{job.company}</div>
                      {job.location && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{job.location}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
