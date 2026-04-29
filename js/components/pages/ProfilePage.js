/* ============================================================
   PROFILEPAGE.JS — User profile
   ============================================================ */

/* Sub-component: pulls real users from API for "People also viewed" */
function PeopleAlsoViewed({ currentUserId }) {
  const { data: users } = useFetch(() => API.getUsers(), []);
  const { showToast, currentUser } = React.useContext(AppContext);
  const filterId = currentUserId || (currentUser && currentUser.id);
  const shown = (users || []).filter(u => !filterId || String(u.id) !== String(filterId)).slice(0, 3);
  if (!shown.length) return null;
  return (
    <div className="li-card" style={{ padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>People also viewed</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {shown.map(u => (
          <div key={u.id} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}
            onClick={() => navigate(`profile?id=${u.id}`)}>
            <Avatar name={u.name} size={40} colorOverride={u.avatarColor} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(u.headline || '').split('|')[0].trim()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfilePage({ userId }) {
  const {
    currentUser, connections, connect, pendingConnections, following, follow, openModal, showToast,
    recruiterMode, shortlisted, addToShortlist, removeFromShortlist,
    userStatus, setUserStatus,
  } = React.useContext(AppContext);
  const isOwnProfile = !userId || (currentUser && String(userId) === String(currentUser.id));

  const { data: profileData, loading, error } = useFetch(
    () => isOwnProfile ? API.getMe() : API.getUser(userId),
    [userId]
  );

  const { data: readinessData } = useFetch(
    () => isOwnProfile ? API.getOutreachReadiness() : Promise.resolve(null),
    [isOwnProfile]
  );

  const [expandedSections, setExpandedSections] = React.useState(new Set());
  const [aiTips, setAiTips] = React.useState(null);
  const [statusPickerOpen, setStatusPickerOpen] = React.useState(false);
  const [localCerts, setLocalCerts] = React.useState(() => {
    try {
      const key = `li-certs-${userId || (currentUser && currentUser.id)}`;
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [showAddCert, setShowAddCert] = React.useState(false);
  const [certForm, setCertForm] = React.useState({ name: '', org: '', issueDate: '' });

  const STATUS_OPTIONS = [
    { key: 'open_to_work', label: 'Open to work', desc: "Show recruiters you're available", bg: '#E6F4EA', color: '#057642', dot: '#057642' },
    { key: 'conferences', label: 'Looking for conferences', desc: 'Discover events in your area', bg: '#E8F4FD', color: '#0a66c2', dot: '#0a66c2' },
    { key: 'recruiting', label: 'Recruiting', desc: 'Unlock Recruiter Mode features', bg: '#F3E8FD', color: '#7c3aed', dot: '#7c3aed' },
    { key: 'not_looking', label: 'Not looking', desc: 'Hide your availability status', bg: 'var(--bg-2)', color: 'var(--text-2)', dot: 'var(--text-3)' },
  ];

  function addLocalCert() {
    if (!certForm.name.trim()) return;
    const newCert = { id: Date.now(), name: certForm.name.trim(), org: certForm.org.trim(), issueDate: certForm.issueDate };
    const updated = [newCert, ...localCerts];
    setLocalCerts(updated);
    const key = `li-certs-${userId || (currentUser && currentUser.id)}`;
    try { localStorage.setItem(key, JSON.stringify(updated)); } catch {}
    setCertForm({ name: '', org: '', issueDate: '' });
    setShowAddCert(false);
    showToast('Certification added!', 'success');
  }
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(null);

  function fetchAiTips() {
    setAiLoading(true);
    setAiError(null);
    setAiTips(null);
    API.getProfileImprovementTips()
      .then(res => { setAiTips(res.tips); setAiLoading(false); })
      .catch(err => { setAiError(err.message || 'Failed to load tips'); setAiLoading(false); });
  }

  function toggleSection(key) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  if (loading) return <LoadingSpinner text="Loading profile..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!profileData) return <ErrorMessage message="Profile not found" />;

  const user = profileData;
  const isPending = pendingConnections.has(String(user.id));
  const isConnected = connections.has(String(user.id));
  const isFollowing = following.has(String(user.id));

  return (
    <div className="li-page-inner">
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Main column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Hero card */}
          <div className="li-card" style={{ padding: 0, overflow: 'visible' }}>
            {/* Cover photo */}
            <div style={{ height: 200, background: user.coverGradient || 'linear-gradient(135deg, #0F5DBD 0%, #0A4A9E 100%)', position: 'relative', overflow: 'hidden', borderRadius: '10px 10px 0 0' }}>
            </div>
            {/* Profile info */}
            <div style={{ padding: '0 24px 20px', position: 'relative' }}>
              {/* Avatar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                <div style={{ marginTop: -50 }}>
                  <div style={{
                    width: 120, height: 120, borderRadius: '50%', border: '4px solid var(--white)',
                    background: user.avatarColor || '#0F5DBD',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 44, fontWeight: 700, color: '#fff',
                  }}>
                    {getInitials(user.name)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {isOwnProfile ? (
                    <>
                      <button className="li-btn li-btn--outline li-btn--sm" onClick={() => openModal('edit-profile')}>Edit profile</button>
                      <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => {
                        const url = window.location.href.split('#')[0] + '#profile?id=' + user.id;
                        navigator.clipboard?.writeText(url).then(() => showToast('Profile link copied!', 'success')).catch(() => showToast('Failed to copy profile link', 'error'));
                      }}>Share</button>
                      <button
                        className="li-btn li-btn--ghost li-btn--sm"
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={fetchAiTips}
                        disabled={aiLoading}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>
                        {aiLoading ? 'Loading…' : '✦ AI Tips'}
                      </button>
                    </>
                  ) : (
                    <>
                      {isConnected ? (
                        <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => navigate('messaging')}>Message</button>
                      ) : (
                        <button
                          className={isPending ? 'li-btn li-btn--ghost li-btn--sm' : 'li-btn li-btn--primary li-btn--sm'}
                          disabled={isPending}
                          onClick={() => { connect(user.id); showToast(`Invitation sent to ${user.name}`); }}
                        >
                          {isPending ? 'Pending' : '+ Connect'}
                        </button>
                      )}
                      <button
                        className="li-btn li-btn--outline li-btn--sm"
                        onClick={() => { follow(user.id); showToast(isFollowing ? `Unfollowed ${user.name}` : `Following ${user.name}`); }}
                      >
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                      <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => showToast('More options')}>···</button>
                      {userStatus === 'recruiting' && recruiterMode && (() => {
                        const inPipeline = shortlisted.has(String(user.id));
                        return (
                          <button
                            className="li-btn li-btn--sm"
                            style={{
                              fontSize: 13, padding: '5px 14px',
                              background: inPipeline ? '#E6F4EA' : 'transparent',
                              border: `1px solid ${inPipeline ? '#057642' : 'var(--border)'}`,
                              color: inPipeline ? '#057642' : 'var(--text-2)',
                              borderRadius: 14, cursor: 'pointer', fontWeight: 600,
                            }}
                            onClick={() => {
                              if (inPipeline) {
                                removeFromShortlist(user.id);
                                showToast(`Removed ${user.name} from shortlist`);
                              } else {
                                addToShortlist(user);
                                showToast(`${user.name} added to shortlist`);
                              }
                            }}
                          >
                            {inPipeline ? '✓ Shortlisted' : '+ Shortlist'}
                          </button>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>

              {/* Name & headline */}
              <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{user.name}</h1>
              <p style={{ fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>{user.headline}</p>

              {/* Location + connections */}
              <div style={{ display: 'flex', gap: 16, fontSize: 14, color: 'var(--text-2)', flexWrap: 'wrap', marginBottom: 12 }}>
                {user.location && <span>{user.location}</span>}
                {user.connections > 0 && (
                  <span style={{ color: 'var(--blue)', cursor: 'pointer', fontWeight: 600 }}>
                    {user.connections >= 500 ? '500+' : user.connections} connections
                  </span>
                )}
              </div>

              {/* Status badge + picker */}
              {(() => {
                const effectiveStatus = isOwnProfile
                  ? (userStatus || (user.openToWork ? 'open_to_work' : null))
                  : (user.openToWork ? 'open_to_work' : null);
                const opt = STATUS_OPTIONS.find(o => o.key === effectiveStatus);
                return (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    {opt && opt.key !== 'not_looking' ? (
                      <button
                        onClick={() => isOwnProfile && setStatusPickerOpen(v => !v)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: opt.bg, color: opt.color,
                          padding: '6px 12px', borderRadius: 16, fontSize: 13, fontWeight: 600,
                          border: 'none', cursor: isOwnProfile ? 'pointer' : 'default',
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.dot, display: 'inline-block', flexShrink: 0 }} />
                        {opt.label}
                        {isOwnProfile && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>}
                      </button>
                    ) : isOwnProfile ? (
                      <button onClick={() => setStatusPickerOpen(v => !v)} style={{ background: 'none', border: '1px dashed var(--border)', color: 'var(--text-3)', padding: '5px 12px', borderRadius: 16, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                        + Set availability status
                      </button>
                    ) : null}

                    {/* Dropdown picker — own profile only */}
                    {isOwnProfile && statusPickerOpen && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 200,
                        background: 'var(--white)', border: '1px solid var(--border)',
                        borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
                        minWidth: 290, padding: 8,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', padding: '4px 10px 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          Your availability
                        </div>
                        {STATUS_OPTIONS.map(o => {
                          const current = userStatus || (user.openToWork ? 'open_to_work' : null);
                          const isActive = current === o.key;
                          return (
                            <button key={o.key} onClick={() => {
                              setUserStatus(o.key);
                              setStatusPickerOpen(false);
                              if (o.key === 'conferences') { showToast('Explore conferences near you →', 'success'); navigate('conferences'); }
                              else if (o.key === 'recruiting') showToast('Recruiter Mode is now available in the Me menu', 'success');
                              else if (o.key !== 'not_looking') showToast(`Status set to "${o.label}"`, 'success');
                            }} style={{
                              display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%',
                              padding: '8px 10px', border: 'none', borderRadius: 8,
                              cursor: 'pointer', textAlign: 'left',
                              background: isActive ? o.bg : 'transparent',
                            }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)'; }}
                              onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? o.bg : 'transparent'; }}
                            >
                              <span style={{ width: 10, height: 10, borderRadius: '50%', background: o.dot, flexShrink: 0, marginTop: 4 }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? o.color : 'var(--text)' }}>{o.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{o.desc}</div>
                              </div>
                              {isActive && <svg width="14" height="14" viewBox="0 0 24 24" fill={o.dot} style={{ flexShrink: 0, marginTop: 3 }}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>}
                            </button>
                          );
                        })}
                        <div style={{ margin: '6px 10px 2px', paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                          Only visible to you
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* About */}
          {user.about && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>About</h2>
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('edit-profile')}>Edit</button>}
              </div>
              <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                {expandedSections.has('about') || user.about.length <= 300
                  ? user.about
                  : user.about.slice(0, 300) + '…'}
              </p>
              {user.about.length > 300 && (
                <button className="li-btn li-btn--ghost li-btn--sm" style={{ marginTop: 8 }} onClick={() => toggleSection('about')}>
                  {expandedSections.has('about') ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          {/* Experience */}
          {user.experience && user.experience.length > 0 && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Experience</h2>
                {isOwnProfile && (
                  <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('add-exp')}>+ Add</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(expandedSections.has('exp') ? user.experience : user.experience.slice(0, 3)).map((exp, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-3)">
                        <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{exp.title}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-2)' }}>
                        {exp.company}
                        {exp.type && ` · ${exp.type}`}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                        {exp.startDate} – {exp.endDate || 'Present'}
                        {exp.duration && ` · ${exp.duration}`}
                      </div>
                      {exp.location && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{exp.location}</div>}
                      {exp.description && (
                        <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5 }}>{exp.description}</p>
                      )}
                      {exp.skills && exp.skills.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {(typeof exp.skills === 'string' ? exp.skills.split(',') : exp.skills).map((s, i) => (
                            <span key={i} style={{ fontSize: 12, background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 10 }}>{typeof s === 'object' ? s.name : s.trim()}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {user.experience.length > 3 && (
                <button className="li-btn li-btn--ghost li-btn--sm" style={{ marginTop: 12 }} onClick={() => toggleSection('exp')}>
                  {expandedSections.has('exp') ? 'Show less' : `Show all ${user.experience.length} experiences`}
                </button>
              )}
            </div>
          )}

          {/* Education */}
          {user.education && user.education.length > 0 && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Education</h2>
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('add-education')}>+ Add</button>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {user.education.map((edu, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-3)">
                        <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{edu.school}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{edu.degree}{edu.field && ` · ${edu.field}`}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{edu.startYear} – {edu.endYear || 'Present'}</div>
                      {edu.activities && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{edu.activities}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Skills</h2>
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('add-skill')}>+ Add</button>}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(expandedSections.has('skills') ? user.skills : user.skills.slice(0, 10)).map((skill, i) => {
                  const label = typeof skill === 'object' ? skill.name : skill;
                  return (
                    <span key={label + i} style={{
                      fontSize: 13, padding: '6px 14px', borderRadius: 16,
                      border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)',
                    }}>
                      {label}
                    </span>
                  );
                })}
              </div>
              {user.skills.length > 10 && (
                <button className="li-btn li-btn--ghost li-btn--sm" style={{ marginTop: 12 }} onClick={() => toggleSection('skills')}>
                  {expandedSections.has('skills') ? 'Show less' : `Show all ${user.skills.length} skills`}
                </button>
              )}
            </div>
          )}

          {/* Licenses & Certifications */}
          {(() => {
            const allCerts = [...(user.certifications || []), ...localCerts];
            if (allCerts.length === 0 && !isOwnProfile) return null;
            return (
              <div className="li-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Licenses & certifications</h2>
                  {isOwnProfile && (
                    <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => setShowAddCert(v => !v)}>
                      {showAddCert ? 'Cancel' : '+ Add'}
                    </button>
                  )}
                </div>

                {/* Inline add form */}
                {showAddCert && (
                  <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, marginBottom: 16, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Add certification</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Name *</label>
                        <input className="li-input" placeholder="e.g. AWS Solutions Architect" value={certForm.name}
                          onChange={e => setCertForm(f => ({ ...f, name: e.target.value }))} style={{ fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Issuing organization</label>
                        <input className="li-input" placeholder="e.g. Amazon Web Services" value={certForm.org}
                          onChange={e => setCertForm(f => ({ ...f, org: e.target.value }))} style={{ fontSize: 13 }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Issue date</label>
                        <input className="li-input" type="month" value={certForm.issueDate}
                          onChange={e => setCertForm(f => ({ ...f, issueDate: e.target.value }))} style={{ fontSize: 13 }} />
                      </div>
                      <button className="li-btn li-btn--primary li-btn--sm" onClick={addLocalCert}
                        disabled={!certForm.name.trim()} style={{ alignSelf: 'flex-start' }}>
                        Save
                      </button>
                    </div>
                  </div>
                )}

                {allCerts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-3)', fontSize: 13 }}>
                    No certifications yet. Click "+ Add" to add your first one.
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {allCerts.map((cert, i) => (
                    <div key={cert.id || i} style={{ display: 'flex', gap: 12 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-3)">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{cert.name}</div>
                        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{cert.org || cert.issuer}</div>
                        {(cert.issueDate || cert.date) && (
                          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
                            Issued {cert.issueDate ? new Date(cert.issueDate + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : cert.date}
                          </div>
                        )}
                      </div>
                      {isOwnProfile && cert.id && (
                        <button onClick={() => {
                          const updated = localCerts.filter(c => c.id !== cert.id);
                          setLocalCerts(updated);
                          try { localStorage.setItem(`li-certs-${userId || currentUser?.id}`, JSON.stringify(updated)); } catch {}
                          showToast('Certification removed');
                        }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 18, lineHeight: 1, alignSelf: 'flex-start', padding: 0 }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right sidebar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {isOwnProfile && (() => {
            const score = readinessData?.score ?? null;
            const level = readinessData?.level;
            const levelLabel = level === 'ready' ? 'All-Star' : level === 'almost_ready' ? 'Rising' : 'Getting started';
            const barColor = score === null ? 'var(--blue)' : score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--gold-dark)' : 'var(--red)';
            const displayScore = score ?? '—';
            return (
              <div className="li-card" style={{ padding: 20, marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Profile strength</h3>
                <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, marginBottom: 8 }}>
                  <div style={{ height: '100%', width: score !== null ? `${score}%` : '0%', background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  {score !== null ? `${levelLabel} · ${displayScore}% complete` : 'Calculating…'}
                </div>
              </div>
            );
          })()}

          {/* AI Profile Tips card */}
          {isOwnProfile && (aiTips || aiLoading || aiError) && (
            <div className="li-card" style={{ padding: 20, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>✦</span>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>AI Profile Tips</h3>
              </div>
              {aiLoading && (
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Analyzing your profile…</div>
              )}
              {aiError && (
                <div style={{ fontSize: 13, color: 'var(--red)' }}>{aiError}</div>
              )}
              {aiTips && (
                <ol style={{ paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {aiTips.map((tip, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{tip}</li>
                  ))}
                </ol>
              )}
              {aiTips && (
                <button
                  className="li-btn li-btn--ghost li-btn--sm"
                  style={{ marginTop: 12 }}
                  onClick={fetchAiTips}
                  disabled={aiLoading}
                >
                  Refresh tips
                </button>
              )}
            </div>
          )}

          <PeopleAlsoViewed currentUserId={userId} />
        </div>
      </div>
    </div>
  );
}
