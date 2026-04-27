/* ============================================================
   SHORTLISTPANEL.JS — Recruiter candidate shortlist drawer
   Only visible when recruiterMode is ON.
   Uses SheetJS (window.XLSX) for Excel export with CSV fallback.
   ============================================================ */
function ShortlistPanel() {
  const {
    shortlisted, removeFromShortlist, clearShortlist,
    recruiterPanelOpen, setRecruiterPanelOpen,
    currentUser, recruiterMode,
  } = React.useContext(AppContext);
  const navigate = window.navigate;

  const profiles = [...shortlisted.values()];

  if (!currentUser?.isRecruiter || !recruiterMode || !recruiterPanelOpen) return null;

  function downloadCSV() {
    const headers = ['Name','Current Role','Company','Headline','Location','Skills','Education','Degree','Connections','Open to Work','Profile URL'];
    const rows = profiles.map(u => {
      const exp0 = (u.experience || [])[0] || {};
      const edu0 = (u.education  || [])[0] || {};
      const skills = (u.skills || []).slice(0, 15).map(s => (typeof s === 'object' ? s.name : s)).join('; ');
      const url = `${window.location.origin}${window.location.pathname}#profile?id=${u.id}`;
      return [u.name, exp0.title, exp0.company, u.headline, u.location, skills, edu0.school, edu0.degree, u.connections, u.openToWork ? 'Yes' : 'No', url]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',');
    });
    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `candidate-shortlist-${new Date().toISOString().split('T')[0]}.csv`;
    try { a.click(); } finally { URL.revokeObjectURL(objectUrl); }
  }

  function exportToExcel() {
    if (!window.XLSX) {
      downloadCSV();
      return;
    }
    try {
      const rows = profiles.map(u => {
        const exp0 = (u.experience || [])[0] || {};
        const edu0 = (u.education  || [])[0] || {};
        const skills = (u.skills || []).slice(0, 15).map(s => (typeof s === 'object' ? s.name : s)).join(', ');
        return {
          'Name':          u.name        || '',
          'Current Role':  exp0.title    || '',
          'Company':       exp0.company  || '',
          'Headline':      u.headline    || '',
          'Location':      u.location    || '',
          'Skills':        skills,
          'Education':     edu0.school   || '',
          'Degree':        edu0.degree   || '',
          'Connections':   u.connections || 0,
          'Open to Work':  u.openToWork  ? 'Yes' : 'No',
          'Profile URL':   `${window.location.origin}${window.location.pathname}#profile?id=${u.id}`,
        };
      });
      const XLSX = window.XLSX;
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 22 }, { wch: 28 }, { wch: 24 }, { wch: 40 },
        { wch: 22 }, { wch: 45 }, { wch: 26 }, { wch: 22 },
        { wch: 13 }, { wch: 13 }, { wch: 50 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Candidate Shortlist');
      XLSX.writeFile(wb, `candidate-shortlist-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      downloadCSV();
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setRecruiterPanelOpen(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100 }}
      />

      {/* Slide-in drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0,
        height: '100vh', width: 420,
        background: 'var(--white)',
        zIndex: 1101,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          background: 'linear-gradient(135deg, #057642 0%, #0a8a52 100%)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                </svg>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>Candidate Shortlist</h2>
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                {profiles.length === 0
                  ? 'No candidates yet'
                  : `${profiles.length} candidate${profiles.length !== 1 ? 's' : ''} shortlisted`}
              </div>
            </div>
            <button
              onClick={() => setRecruiterPanelOpen(false)}
              style={{
                background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer',
                padding: '4px 8px', color: '#fff', lineHeight: 1,
                fontSize: 20, borderRadius: 6, fontWeight: 400,
              }}
              aria-label="Close panel"
            >×</button>
          </div>

          {/* Export button in header when candidates exist */}
          {profiles.length > 0 && (
            <button
              onClick={exportToExcel}
              style={{
                marginTop: 14, width: '100%',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.35)',
                borderRadius: 6, color: '#fff',
                padding: '8px 14px', cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              Export to Excel · {profiles.length} candidate{profiles.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>

        {/* Profile list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {profiles.length === 0 ? (
            <div style={{ padding: '60px 28px', textAlign: 'center', color: 'var(--text-2)' }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="var(--border)" style={{ marginBottom: 14 }}>
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--text)' }}>Shortlist is empty</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                Browse profiles in <strong>Network</strong> or on any profile page and click <strong>"+ Shortlist"</strong> to add candidates.
              </div>
            </div>
          ) : (
            profiles.map((u, idx) => {
              const skills = (u.skills || []).slice(0, 4).map(s => typeof s === 'object' ? s.name : s);
              const exp0 = (u.experience || [])[0];
              return (
                <div
                  key={u.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  {/* Top row: avatar + info + remove */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div
                      style={{ flexShrink: 0, cursor: 'pointer' }}
                      onClick={() => { navigate(`profile?id=${u.id}`); setRecruiterPanelOpen(false); }}
                    >
                      <Avatar name={u.name} size={46} colorOverride={u.avatarColor} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span
                          style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer', color: 'var(--text)' }}
                          onClick={() => { navigate(`profile?id=${u.id}`); setRecruiterPanelOpen(false); }}
                        >
                          {u.name}
                        </span>
                        {u.openToWork && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                            background: '#e8f5e9', color: '#057642', border: '1px solid #b2dfdb',
                            whiteSpace: 'nowrap',
                          }}>
                            #OPEN
                          </span>
                        )}
                        {u.isPremium && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                            background: '#fff8e1', color: '#c7910a', border: '1px solid #ffe082',
                            whiteSpace: 'nowrap',
                          }}>
                            ★ Premium
                          </span>
                        )}
                      </div>

                      {exp0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {exp0.title}{exp0.company ? ` · ${exp0.company}` : ''}
                        </div>
                      )}

                      {u.location && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                          📍 {u.location}
                        </div>
                      )}

                      {/* Skills tags */}
                      {skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                          {skills.map(s => (
                            <span key={s} style={{
                              fontSize: 11, padding: '2px 8px', borderRadius: 10,
                              background: 'var(--bg)', border: '1px solid var(--border)',
                              color: 'var(--text-2)',
                            }}>{s}</span>
                          ))}
                          {(u.skills || []).length > 4 && (
                            <span style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 4px' }}>
                              +{(u.skills || []).length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => removeFromShortlist(u.id)}
                      title="Remove from shortlist"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-3)', padding: '2px 4px', flexShrink: 0,
                        borderRadius: 4, lineHeight: 1,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>

                  {/* Connections line */}
                  {u.connections > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, marginLeft: 58 }}>
                      {u.connections} connections
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {profiles.length > 0 && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
            background: 'var(--bg)',
          }}>
            <button
              className="li-btn li-btn--ghost"
              onClick={clearShortlist}
              style={{ width: '100%', fontSize: 13, color: '#c00' }}
            >
              Clear all candidates
            </button>
          </div>
        )}
      </div>
    </>
  );
}
