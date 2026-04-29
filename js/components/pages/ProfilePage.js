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
    currentUser, setCurrentUser, connections, connect, pendingConnections, following, follow, openModal, showToast,
    recruiterMode, shortlisted, addToShortlist, removeFromShortlist,
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

  const { data: feedData } = useFetch(API.getFeed, []);

  const [expandedSections, setExpandedSections] = React.useState(new Set());
  const [aiTips, setAiTips] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(null);

  const [aiReadiness, setAiReadiness] = React.useState(null);
  const [aiReadinessLoading, setAiReadinessLoading] = React.useState(false);
  const [aiReadinessError, setAiReadinessError] = React.useState(null);

  function fetchAiTips() {
    setAiLoading(true);
    setAiError(null);
    setAiTips(null);
    API.getProfileImprovementTips()
      .then(res => { setAiTips(res.tips); setAiLoading(false); })
      .catch(err => { setAiError(err.message || 'Failed to load tips'); setAiLoading(false); });
  }

  function fetchAiReadiness() {
    setAiReadinessLoading(true);
    setAiReadinessError(null);
    API.getAIProfileReadiness()
      .then(res => { setAiReadiness(res); setAiReadinessLoading(false); })
      .catch(err => { setAiReadinessError(err.message || 'AI evaluation failed'); setAiReadinessLoading(false); });
  }

  // AI readiness is triggered manually via the Analyze button — no auto-fetch on load

  function toggleSection(key) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const MONTH_IDX = {January:0,February:1,March:2,April:3,May:4,June:5,July:6,August:7,September:8,October:9,November:10,December:11};
  function dateVal(str) {
    if (!str || str === 'Present') return Infinity;
    const [m, y] = (str || '').split(' ');
    return (parseInt(y, 10) || 0) * 12 + (MONTH_IDX[m] ?? 0);
  }
  function sortedDesc(arr, key) {
    return [...(arr || [])].sort((a, b) => dateVal(b[key]) - dateVal(a[key]));
  }

  function makeDeleter(apiFn, label) {
    return (index) => {
      apiFn(index)
        .then(updated => { setCurrentUser(updated); showToast(`${label} removed`, 'success'); })
        .catch(() => showToast(`Failed to remove ${label.toLowerCase()}`, 'error'));
    };
  }
  const deleteExp   = makeDeleter(API.deleteExperience,   'Experience');
  const deleteEdu   = makeDeleter(API.deleteEducation,     'Education');
  const deleteProj  = makeDeleter(API.deleteProject,       'Project');
  const deleteVol   = makeDeleter(API.deleteVolunteering,  'Volunteering');
  const deleteHonor = makeDeleter(API.deleteHonor,         'Honor');
  const deleteSkill = makeDeleter(API.deleteSkill,         'Skill');

  const PencilBtn = ({ onClick }) => (
    <button onClick={onClick} title="Edit" aria-label="Edit"
      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', lineHeight: 0, borderRadius: 4 }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--blue)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
    </button>
  );

  const TrashBtn = ({ onClick }) => (
    <button onClick={onClick} title="Delete" aria-label="Delete"
      style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', lineHeight: 0, borderRadius: 4 }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--red, #cc1016)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
    </button>
  );

  if (loading) return <LoadingSpinner text="Loading profile..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!profileData) return <ErrorMessage message="Profile not found" />;

  const user = (isOwnProfile && currentUser) ? currentUser : profileData;
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
            <div style={{ height: 200, background: user.coverGradient || 'linear-gradient(135deg, #0F5DBD 0%, #0A4A9E 100%)', position: 'relative' }}>
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
                      {currentUser?.isRecruiter && recruiterMode && (() => {
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
          {(user.about || isOwnProfile) && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>About</h2>
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('edit-profile')}>Edit</button>}
              </div>
              {user.about ? (
                <>
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
                </>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Add a summary to help others understand who you are and what you do.</p>
              )}
            </div>
          )}

          {/* Activity */}
          {(() => {
            const userPosts = (feedData || []).filter(p =>
              String(p.authorId || p.author?.id || '') === String(user.id)
            ).slice(0, 3);
            if (!isOwnProfile && userPosts.length === 0) return null;
            return (
              <div className="li-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700 }}>Activity</h2>
                    {user.followers > 0 && <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '2px 0 0' }}>{user.followers} followers</p>}
                  </div>
                  {isOwnProfile && (
                    <button className="li-btn li-btn--outline li-btn--sm" onClick={() => navigate('feed')}>Create a post</button>
                  )}
                </div>
                {userPosts.length === 0 ? (
                  <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 12 }}>
                    {isOwnProfile ? 'Share an article, photo, or idea — your posts will appear here.' : `${user.name} hasn't posted recently.`}
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                    {userPosts.map(post => (
                      <div key={post.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>
                        <p style={{ margin: '0 0 4px' }}>{(post.content || '').slice(0, 200)}{(post.content || '').length > 200 ? '…' : ''}</p>
                        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatTime(post.timestamp || post.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Experience */}
          {(isOwnProfile || (user.experience && user.experience.length > 0)) && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Experience</h2>
                {isOwnProfile && (
                  <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('add-exp')}>+ Add</button>
                )}
              </div>
              {user.experience && user.experience.length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {(expandedSections.has('exp') ? sortedDesc(user.experience,'startDate') : sortedDesc(user.experience,'startDate').slice(0, 3)).map((exp, i) => {
                      const origIdx = user.experience.indexOf(exp);
                      return (
                      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <div style={{ width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-3)">
                            <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                          </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{exp.title}</div>
                          <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{exp.company}{exp.type && ` · ${exp.type}`}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{exp.startDate} – {exp.endDate || 'Present'}{exp.duration && ` · ${exp.duration}`}</div>
                          {exp.location && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{exp.location}</div>}
                          {exp.description && <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5 }}>{exp.description}</p>}
                        </div>
                        {isOwnProfile && <div style={{ display: 'flex', gap: 2 }}>
                          <PencilBtn onClick={() => openModal('add-exp', { entry: exp, index: origIdx })} />
                          <TrashBtn onClick={() => deleteExp(origIdx)} />
                        </div>}
                      </div>
                      );
                    })}
                  </div>
                  {user.experience.length > 3 && (
                    <button className="li-btn li-btn--ghost li-btn--sm" style={{ marginTop: 12 }} onClick={() => toggleSection('exp')}>
                      {expandedSections.has('exp') ? 'Show less' : `Show all ${user.experience.length} experiences`}
                    </button>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Add your work experience to show recruiters and connections what you've done.</p>
              )}
            </div>
          )}

          {/* Education */}
          {(isOwnProfile || (user.education && user.education.length > 0)) && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Education</h2>
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('add-education')}>+ Add</button>}
              </div>
              {user.education && user.education.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {user.education.map((edu, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-3)">
                          <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{edu.school}</div>
                        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{edu.degree}{edu.field && ` · ${edu.field}`}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{edu.startYear || edu.startDate} – {edu.endYear || edu.endDate || 'Present'}</div>
                        {edu.activities && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{edu.activities}</div>}
                      </div>
                      {isOwnProfile && <div style={{ display: 'flex', gap: 2 }}>
                        <PencilBtn onClick={() => openModal('add-education', { entry: edu, index: i })} />
                        <TrashBtn onClick={() => deleteEdu(i)} />
                      </div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Add your educational background to let others know where you studied.</p>
              )}
            </div>
          )}

          {/* Projects */}
          {(isOwnProfile || (user.projects && user.projects.length > 0)) && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Projects</h2>
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('add-project')}>+ Add</button>}
              </div>
              {user.projects && user.projects.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {sortedDesc(user.projects, 'startDate').map((proj, i) => {
                    const origIdx = user.projects.indexOf(proj);
                    return (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-3)"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{proj.name}</div>
                        {proj.startDate && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{proj.startDate}{proj.endDate ? ` – ${proj.endDate}` : ''}</div>}
                        {proj.description && <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>{proj.description}</p>}
                        {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--blue)' }}>{proj.url}</a>}
                      </div>
                      {isOwnProfile && <div style={{ display: 'flex', gap: 2 }}>
                        <PencilBtn onClick={() => openModal('add-project', { entry: proj, index: origIdx })} />
                        <TrashBtn onClick={() => deleteProj(origIdx)} />
                      </div>}
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Showcase your work — add projects you've built or contributed to.</p>
              )}
            </div>
          )}

          {/* Volunteering */}
          {(isOwnProfile || (user.volunteering && user.volunteering.length > 0)) && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Volunteering</h2>
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('add-volunteer')}>+ Add</button>}
              </div>
              {user.volunteering && user.volunteering.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {sortedDesc(user.volunteering, 'startDate').map((vol, i) => {
                    const origIdx = user.volunteering.indexOf(vol);
                    return (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-3)"><path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{vol.role}</div>
                        <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{vol.organization}</div>
                        {vol.cause && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{vol.cause}</div>}
                        {vol.startDate && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{vol.startDate}{vol.endDate ? ` – ${vol.endDate}` : ''}</div>}
                        {vol.description && <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>{vol.description}</p>}
                      </div>
                      {isOwnProfile && <div style={{ display: 'flex', gap: 2 }}>
                        <PencilBtn onClick={() => openModal('add-volunteer', { entry: vol, index: origIdx })} />
                        <TrashBtn onClick={() => deleteVol(origIdx)} />
                      </div>}
                    </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Add volunteering experience to highlight your community involvement.</p>
              )}
            </div>
          )}

          {/* Skills */}
          {(isOwnProfile || (user.skills && user.skills.length > 0)) && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Skills</h2>
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('add-skill')}>+ Add</button>}
              </div>
              {user.skills && user.skills.length > 0 ? (
                <>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {(expandedSections.has('skills') ? user.skills : user.skills.slice(0, 10)).map((skill, i) => {
                      const label = typeof skill === 'object' ? skill.name : skill;
                      return (
                        <span key={label + i} style={{ fontSize: 13, padding: '6px 14px', borderRadius: 16, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {label}
                          {isOwnProfile && (
                            <button onClick={() => deleteSkill(i)} title="Remove skill"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 0, lineHeight: 0, fontSize: 14, fontWeight: 700 }}
                              onMouseEnter={e => e.currentTarget.style.color = 'var(--red, #cc1016)'}
                              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}>×</button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                  {user.skills.length > 10 && (
                    <button className="li-btn li-btn--ghost li-btn--sm" style={{ marginTop: 12 }} onClick={() => toggleSection('skills')}>
                      {expandedSections.has('skills') ? 'Show less' : `Show all ${user.skills.length} skills`}
                    </button>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Add skills to help others understand what you're good at.</p>
              )}
            </div>
          )}

          {/* Honors & Awards */}
          {(isOwnProfile || (user.honors && user.honors.length > 0)) && (
            <div className="li-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Honors &amp; Awards</h2>
                {isOwnProfile && <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => openModal('add-honor')}>+ Add</button>}
              </div>
              {user.honors && user.honors.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {user.honors.map((honor, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-3)"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{honor.title}</div>
                        {honor.issuer && <div style={{ fontSize: 14, color: 'var(--text-2)' }}>{honor.issuer}</div>}
                        {(honor.issueDate || honor.year) && <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{honor.issueDate || `${honor.month} ${honor.year}`}</div>}
                        {honor.description && <p style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>{honor.description}</p>}
                      </div>
                      {isOwnProfile && <div style={{ display: 'flex', gap: 2 }}>
                        <PencilBtn onClick={() => openModal('add-honor', { entry: honor, index: i })} />
                        <TrashBtn onClick={() => deleteHonor(i)} />
                      </div>}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Add honors and awards to recognize your achievements.</p>
              )}
            </div>
          )}

          {/* Certifications */}
          {user.certifications && user.certifications.length > 0 && (
            <div className="li-card" style={{ padding: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Licenses &amp; Certifications</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {user.certifications.map((cert, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 4, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
          {isOwnProfile && (() => {
            const score    = aiReadiness?.score ?? null;
            const level    = aiReadiness?.level ?? null;
            const barColor = score === null ? 'var(--blue)' : score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--gold-dark)' : 'var(--red)';

            return (
              <div className="li-card" style={{ padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Profile strength</h3>
                  <button
                    className="li-btn li-btn--ghost li-btn--sm"
                    onClick={fetchAiReadiness}
                    disabled={aiReadinessLoading}
                    style={{ fontSize: 12, padding: '3px 8px' }}
                    title="AI quality evaluation"
                  >
                    {aiReadinessLoading ? 'Analyzing…' : '✦ Analyze'}
                  </button>
                </div>

                {/* Loading state */}
                {aiReadinessLoading && !aiReadiness && (
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 8 }}>✦ Analyzing quality…</div>
                )}

                {/* Error state */}
                {aiReadinessError && !aiReadiness && (
                  <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{aiReadinessError}</div>
                )}

                {/* Score bar — only shown once AI data is ready */}
                {aiReadiness && (
                  <>
                    <div style={{ height: 6, background: 'var(--bg-2)', borderRadius: 3, marginBottom: 6 }}>
                      <div style={{ height: '100%', width: `${score}%`, background: barColor, borderRadius: 3, transition: 'width 0.4s ease' }} />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 14 }}>
                      {level ? `${level} · ` : ''}{score}% quality score
                    </div>
                  </>
                )}

                {/* AI summary */}
                {aiReadiness?.summary && (
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, margin: '0 0 12px' }}>
                    {aiReadiness.summary}
                  </p>
                )}

                {/* Per-section breakdown */}
                {aiReadiness?.sections && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                    {aiReadiness.sections.map(sec => {
                      const sColor = sec.score >= 75 ? 'var(--green)' : sec.score >= 40 ? 'var(--gold-dark)' : 'var(--red)';
                      return (
                        <div key={sec.key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
                            <span>{sec.label}</span>
                            <span style={{ color: sColor }}>{sec.score}%</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${sec.score}%`, background: sColor, borderRadius: 2, transition: 'width 0.4s ease' }} />
                          </div>
                          {sec.feedback && (
                            <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '3px 0 0', lineHeight: 1.4 }}>{sec.feedback}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Suggestions */}
                {aiReadiness?.suggestions?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--text)' }}>Suggestions</div>
                    <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {aiReadiness.suggestions.map((s, i) => (
                        <li key={i} style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Re-analyze button after first run */}
                {aiReadiness && (
                  <button
                    className="li-btn li-btn--ghost li-btn--sm"
                    onClick={fetchAiReadiness}
                    disabled={aiReadinessLoading}
                    style={{ marginTop: 12, width: '100%' }}
                  >
                    {aiReadinessLoading ? 'Analyzing…' : 'Re-analyze'}
                  </button>
                )}
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
