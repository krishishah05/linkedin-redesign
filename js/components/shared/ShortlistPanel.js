/* ============================================================
   SHORTLISTPANEL.JS — Recruiter candidate pipeline drawer
   Only visible when recruiterMode is ON.
   Uses SheetJS (window.XLSX) for Excel export.
   ============================================================ */
function ShortlistPanel() {
  const {
    shortlisted, removeFromShortlist, clearShortlist,
    recruiterPanelOpen, setRecruiterPanelOpen,
  } = React.useContext(AppContext);

  const profiles = [...shortlisted.values()];

  if (!recruiterPanelOpen) return null;

  function exportToExcel() {
    if (!window.XLSX) {
      alert('Excel library not loaded. Please refresh the page.');
      return;
    }
    const rows = profiles.map(u => {
      const exp0 = (u.experience || [])[0] || {};
      const edu0 = (u.education  || [])[0] || {};
      const skills = (u.skills || [])
        .slice(0, 15)
        .map(s => (typeof s === 'object' ? s.name : s))
        .join(', ');
      return {
        'Name':            u.name        || '',
        'Current Role':    exp0.title    || '',
        'Company':         exp0.company  || '',
        'Headline':        u.headline    || '',
        'Location':        u.location    || '',
        'Skills':          skills,
        'Education':       edu0.school   || '',
        'Degree':          edu0.degree   || '',
        'Connections':     u.connections || 0,
        'Open to Work':    u.openToWork  ? 'Yes' : 'No',
        'Profile URL':     `${window.location.origin}${window.location.pathname}#profile?id=${u.id}`,
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    // Set column widths
    ws['!cols'] = [
      { wch: 22 }, { wch: 28 }, { wch: 24 }, { wch: 40 },
      { wch: 22 }, { wch: 45 }, { wch: 26 }, { wch: 22 },
      { wch: 13 }, { wch: 13 }, { wch: 50 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Candidate Pipeline');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `candidate-pipeline-${date}.xlsx`);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setRecruiterPanelOpen(false)}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 1100,
        }}
      />

      {/* Slide-in drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0,
        height: '100vh', width: 380,
        background: 'var(--white)',
        zIndex: 1101,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 32px rgba(0,0,0,0.18)',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--blue)">
                <path d="M20 6h-2.18c.07-.44.18-.86.18-1a3 3 0 0 0-6 0c0 .14.11.56.18 1H10C8.9 6 8 6.9 8 8v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-1a1 1 0 0 1 2 0c0 .41-.24.55-.38.73a.5.5 0 0 1-.24.27h-1.27c-.04-.14-.11-.27-.11-.41V5zm7 15H10V8h2v1h6V8h2v12z"/>
              </svg>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Candidate Pipeline</h2>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {profiles.length} candidate{profiles.length !== 1 ? 's' : ''} shortlisted
            </div>
          </div>
          <button
            onClick={() => setRecruiterPanelOpen(false)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 4, color: 'var(--text-2)', lineHeight: 1,
              fontSize: 22, fontWeight: 300,
            }}
            aria-label="Close panel"
          >
            ×
          </button>
        </div>

        {/* Profile list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {profiles.length === 0 ? (
            <div style={{ padding: '52px 24px', textAlign: 'center', color: 'var(--text-2)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--border)" style={{ marginBottom: 12 }}>
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
              </svg>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>No candidates yet</div>
              <div style={{ fontSize: 13 }}>Browse profiles and click<br />"Add to Pipeline" to shortlist.</div>
            </div>
          ) : (
            profiles.map((u, idx) => (
              <div
                key={u.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 20px',
                  borderBottom: idx < profiles.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => { navigate(`profile?id=${u.id}`); setRecruiterPanelOpen(false); }}>
                  <Avatar name={u.name} size={44} colorOverride={u.avatarColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    onClick={() => { navigate(`profile?id=${u.id}`); setRecruiterPanelOpen(false); }}
                  >
                    {u.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {(u.headline || '').split('|')[0].trim()}
                  </div>
                  {u.location && (
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{u.location}</div>
                  )}
                </div>
                <button
                  onClick={() => removeFromShortlist(u.id)}
                  title="Remove from pipeline"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', padding: 4, flexShrink: 0,
                    borderRadius: 4, lineHeight: 1,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: 10,
          flexShrink: 0,
        }}>
          <button
            className="li-btn li-btn--primary"
            onClick={exportToExcel}
            disabled={profiles.length === 0}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            Export to Excel ({profiles.length})
          </button>
          {profiles.length > 0 && (
            <button
              className="li-btn li-btn--ghost"
              onClick={clearShortlist}
              style={{ width: '100%', fontSize: 13, color: 'var(--text-3)' }}
            >
              Clear all candidates
            </button>
          )}
        </div>
      </div>
    </>
  );
}
