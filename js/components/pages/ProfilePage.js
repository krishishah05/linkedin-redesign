/* ============================================================
   PROFILEPAGE.JS — User profile
   ============================================================ */
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
            <div style={{ height: 200, background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)', position: 'relative' }}>
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
                    background: user.avatarColor || '#0A66C2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 44, fontWeight: 700, color: '#fff',
                  }}>
                    {getInitials(user.name)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {isOwnProfile ? (
                    <>
                      <button className="li-btn li-btn--outline li-btn--sm" onClick={() => openModal('editProfile')}>Edit profile</button>
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
                  <span>💼</span> Open to work
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
                  <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('addExperience')}>+ Add</button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {(expandedSections.has('exp') ? user.experience : user.experience.slice(0, 3)).map((exp, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, flexShrink: 0,
                    }}>🏢</div>
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
                          {exp.skills.map(s => (
                            <span key={s} style={{ fontSize: 12, background: 'var(--bg-2)', padding: '2px 8px', borderRadius: 10 }}>{s}</span>
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
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
                    }}>🎓</div>
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
                {(expandedSections.has('skills') ? user.skills : user.skills.slice(0, 10)).map(skill => (
                  <span key={skill} style={{
                    fontSize: 13, padding: '6px 14px', borderRadius: 16,
                    border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)',
                  }}>
                    {skill}
                  </span>
                ))}
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
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
                    }}>📜</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{cert.name}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{cert.issuer}</div>
                      {cert.date && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Issued {cert.date}</div>}
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

          <div className="li-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>People also viewed</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['Sarah Chen', 'Marcus Rodriguez', 'Emily Chang'].map(name => (
                <div key={name} style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => showToast(`Viewing ${name}'s profile`)}>
                  <Avatar name={name} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Software Engineer</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
