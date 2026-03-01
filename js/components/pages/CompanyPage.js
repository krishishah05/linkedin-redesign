/* ============================================================
   COMPANYPAGE.JS — Company profile page
   ============================================================ */
function CompanyPage({ companyId }) {
  const { following, follow, showToast } = React.useContext(AppContext);
  const { data: company, loading, error } = useFetch(() => API.getCompany(companyId), [companyId]);
  const { data: jobs } = useFetch(API.getJobs, []);
  const [tab, setTab] = React.useState('home');

  if (loading) return <LoadingSpinner text="Loading company..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  if (!company) return <ErrorMessage message="Company not found" />;

  const isFollowing = following.has(String(companyId));
  const companyJobs = (jobs || []).filter(j => j.company === company.name || j.companyId === company.id).slice(0, 5);

  return (
    <div className="li-page-inner" style={{ maxWidth: 900 }}>
      {/* Hero */}
      <div className="li-card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        {/* Cover */}
        <div style={{ height: 160, background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)' }} />
        {/* Logo + info */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 8, border: '3px solid var(--white)',
            background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, marginTop: -40, marginBottom: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            {company.logo || company.emoji || '🏢'}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{company.name}</h1>
              <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 4 }}>{company.tagline || company.description?.slice(0, 120)}</p>
              <div style={{ fontSize: 13, color: 'var(--text-3)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {company.industry && <span>{company.industry}</span>}
                {company.size && <span>· {company.size}</span>}
                {company.headquarters && <span>· {company.headquarters}</span>}
                {company.followers && <span>· {formatNumber(company.followers)} followers</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                className={isFollowing ? 'li-btn li-btn--ghost li-btn--sm' : 'li-btn li-btn--outline li-btn--sm'}
                onClick={() => {
                  follow(companyId);
                  showToast(isFollowing ? `Unfollowed ${company.name}` : `Following ${company.name}`);
                }}
              >
                {isFollowing ? 'Following' : '+ Follow'}
              </button>
              <button className="li-btn li-btn--primary li-btn--sm" onClick={() => showToast('Website opened in new tab')}>
                Visit website
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="li-card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {['Home', 'About', 'Jobs', 'People'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t.toLowerCase())}
              style={{
                padding: '14px 20px', fontSize: 14, fontWeight: 600,
                color: tab === t.toLowerCase() ? 'var(--text)' : 'var(--text-2)',
                background: 'none', border: 'none',
                borderBottom: tab === t.toLowerCase() ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Home tab */}
      {tab === 'home' && (
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="li-card" style={{ padding: 24, marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Overview</h2>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                {company.description || 'No description available.'}
              </p>
            </div>
            {companyJobs.length > 0 && (
              <div className="li-card" style={{ padding: 24 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Open roles</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {companyJobs.map(job => (
                    <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => navigate(`jobs?id=${job.id}`)}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--blue)' }}>{job.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{job.location} · {job.type}</div>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                      </svg>
                    </div>
                  ))}
                </div>
                <button className="li-btn li-btn--ghost li-btn--sm" style={{ marginTop: 12 }} onClick={() => setTab('jobs')}>
                  See all jobs →
                </button>
              </div>
            )}
          </div>

          <div style={{ width: 280, flexShrink: 0 }}>
            <div className="li-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Company details</h3>
              {[
                ['Website', company.website || 'N/A'],
                ['Industry', company.industry || 'N/A'],
                ['Size', company.size || 'N/A'],
                ['Founded', company.founded || 'N/A'],
                ['Headquarters', company.headquarters || 'N/A'],
                ['Type', company.type || 'Privately Held'],
              ].map(([k, v]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 2 }}>{k}</div>
                  <div style={{ fontSize: 14 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className="li-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>About {company.name}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>
            {company.about || company.description || 'No additional information available.'}
          </p>
          {company.specialties && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Specialties</h3>
              <p style={{ fontSize: 14, color: 'var(--text-2)' }}>{company.specialties}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'jobs' && (
        <div className="li-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            {companyJobs.length} open positions
          </h2>
          {companyJobs.length === 0 ? (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No open roles at this time.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {companyJobs.map(job => (
                <div key={job.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--blue)', cursor: 'pointer', marginBottom: 4 }}
                    onClick={() => navigate(`jobs?id=${job.id}`)}>
                    {job.title}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>{job.location} · {job.type}</div>
                  {job.salary && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{job.salary}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'people' && (
        <div className="li-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Employee directory coming soon.</p>
        </div>
      )}
    </div>
  );
}
