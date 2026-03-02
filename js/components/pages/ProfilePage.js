/* ============================================================
   PROFILEPAGE.JS — User profile
   ============================================================ */

/* Sub-component: pulls real users from API for "People also viewed" */
function PeopleAlsoViewed({ currentUserId }) {
  const { data: users } = useFetch(() => API.getUsers(), []);
  const { showToast } = React.useContext(AppContext);
  const shown = (users || []).filter(u => String(u.id) !== String(currentUserId)).slice(0, 3);
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
  const { currentUser, connections, connect, pendingConnections, following, follow, openModal, showToast } = React.useContext(AppContext);
  const isOwnProfile = !userId || (currentUser && String(userId) === String(currentUser.id));

  const { data: profileData, loading, error } = useFetch(
    () => isOwnProfile ? API.getMe() : API.getUser(userId),
    [userId]
  );

  const [expandedSections, setExpandedSections] = React.useState(new Set());

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
          <div className="li-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Cover photo */}
            <div style={{ height: 200, background: 'linear-gradient(135deg, #0F5DBD 0%, #0A4A9E 100%)', position: 'relative' }}>
              {isOwnProfile && (
                <button
                  style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: 4, padding: '6px 10px', color: '#fff', cursor: 'pointer', fontSize: 12 }}
                  onClick={() => showToast('Cover photo upload — coming soon')}
                >
                  Edit cover
                </button>
              )}
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
                      <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => showToast('Share profile link copied!')}>Share</button>
                    </>
                  ) : (
                    <>
                      {isConnected ? (
                        <button className="li-btn li-btn--ghost li-btn--sm">Message</button>
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

              {/* Stats (own profile only) */}
              {isOwnProfile && (user.profileViews || user.postImpressions) && (
                <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                  {user.profileViews > 0 && (
                    <div style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{formatNumber(user.profileViews)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Profile views</div>
                    </div>
                  )}
                  {user.postImpressions > 0 && (
                    <div style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>{formatNumber(user.postImpressions)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Post impressions</div>
                    </div>
                  )}
                </div>
              )}

              {/* Open to Work badge */}
              {user.openToWork && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E6F4EA', color: '#1e7e34', padding: '6px 12px', borderRadius: 16, fontSize: 13, fontWeight: 600 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#1e7e34"><path d="M20 6h-2.18c.07-.44.18-.86.18-1a3 3 0 0 0-6 0c0 .14.11.56.18 1H10C8.9 6 8 6.9 8 8v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-1a1 1 0 0 1 2 0c0 .14-.05.27-.08.41a.75.75 0 0 1 0 .18c-.03.14-.08.27-.13.41H13.21c-.05-.14-.1-.27-.13-.41a.75.75 0 0 1 0-.18C13.05 5.27 13 5.14 13 5zm7 15H10V8h2v1h6V8h2v12z"/></svg> Open to work
                </div>
              )}
            </div>
          </div>

          {/* About */}
          {user.about && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>About</h2>
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => showToast('Edit about — coming soon')}>Edit</button>}
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
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => showToast('Add education — coming soon')}>+ Add</button>}
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
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => showToast('Add skill — coming soon')}>+ Add</button>}
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

          {/* Certifications */}
          {user.certifications && user.certifications.length > 0 && (
            <div className="li-card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Licenses & certifications</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {user.certifications.map((cert, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-3)">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/>
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{cert.name}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{cert.org || cert.issuer}</div>
                      {(cert.issueDate || cert.date) && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Issued {cert.issueDate || cert.date}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          {isOwnProfile && (
            <div className="li-card" style={{ padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Profile strength</h3>
              <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, marginBottom: 8 }}>
                <div style={{ height: '100%', width: '85%', background: 'var(--blue)', borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>All-Star · 85% complete</div>
            </div>
          )}

          <PeopleAlsoViewed currentUserId={userId} />
        </div>
      </div>
    </div>
  );
}
