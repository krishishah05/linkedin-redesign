/* ============================================================
   NETWORKPAGE.JS — My Network / People You May Know
   ============================================================ */
function NetworkPage() {
  const {
    connections, connect, acceptConnection, pendingConnections, showToast,
    pendingInvitations, dismissedInvitations, dismissInvitation,
    recruiterMode, shortlisted, addToShortlist, removeFromShortlist, userStatus,
    refreshInvitations,
  } = React.useContext(AppContext);
  const { data: users, loading: usersLoading } = useFetch(API.getUsers, []);
  const [tab, setTab] = React.useState('suggestions');
  const [showAllInvitations, setShowAllInvitations] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState(null);
  const [searching, setSearching] = React.useState(false);
  const searchTimeoutRef = React.useRef(null);

  function handleSearchChange(val) {
    setSearchQuery(val);
    clearTimeout(searchTimeoutRef.current);
    if (!val.trim()) { setSearchResults(null); return; }
    setSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      API.search(val)
        .then(res => { setSearchResults(res.users || []); setSearching(false); })
        .catch(() => setSearching(false));
    }, 300);
  }

  React.useEffect(() => { refreshInvitations && refreshInvitations(); }, []);

  // Real incoming connection requests from other users
  const [incomingRequests, setIncomingRequests] = React.useState([]);
  React.useEffect(() => {
    API.getConnectionRequests()
      .then(data => setIncomingRequests(data || []))
      .catch(() => {});
  }, []);

  function handleAccept(requester) {
    API.acceptConnection(requester.id)
      .then(() => {
        acceptConnection(requester.id);
        setIncomingRequests(prev => prev.filter(r => r.id !== requester.id));
        showToast(`Connected with ${requester.name}!`, 'success');
      })
      .catch(() => showToast('Failed to accept connection request', 'error'));
  }

  function handleDecline(requester) {
    API.declineConnectionRequest(requester.id)
      .then(() => {
        setIncomingRequests(prev => prev.filter(r => r.id !== requester.id));
        showToast('Connection request declined');
      })
      .catch(() => showToast('Failed to decline connection request', 'error'));
  }

  if (usersLoading) return <LoadingSpinner text="Loading network..." />;

  const allUsers = users || [];
  const visibleInvitations = pendingInvitations.filter(inv => !dismissedInvitations.has(String((inv.user || inv).id || inv.senderId || '')));
  const totalRequests = incomingRequests.length + Math.min(visibleInvitations.length, 3);

  return (
    <div className="li-page-inner">
      {/* People search */}
      <div className="li-card" style={{ padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input
          type="text"
          placeholder="Search people by name or role..."
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, background: 'transparent', color: 'var(--text)' }}
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); setSearchResults(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 18, lineHeight: 1 }}>×</button>
        )}
      </div>

      {/* Search results */}
      {searchQuery && (
        <div className="li-card" style={{ padding: '16px 24px', marginBottom: 16 }}>
          {searching ? (
            <div style={{ fontSize: 14, color: 'var(--text-2)', padding: '8px 0' }}>Searching...</div>
          ) : searchResults && searchResults.length === 0 ? (
            <div style={{ fontSize: 14, color: 'var(--text-2)', padding: '8px 0' }}>No people found for "{searchQuery}"</div>
          ) : (searchResults || []).map((user, idx) => {
            const iConnected = connections.has(String(user.id));
            const isPending = pendingConnections.has(String(user.id));
            return (
              <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: idx < searchResults.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => navigate(`profile?id=${user.id}`)}>
                  <Avatar name={user.name} size={48} photo={user.photo} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer' }} onClick={() => navigate(`profile?id=${user.id}`)}>{user.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{user.headline}</div>
                  {user.location && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{user.location}</div>}
                </div>
                {iConnected ? (
                  <span style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>Connected</span>
                ) : (
                  <button
                    className={isPending ? 'li-btn li-btn--ghost li-btn--sm' : 'li-btn li-btn--outline li-btn--sm'}
                    disabled={isPending}
                    onClick={() => { if (!isPending) { connect(user.id); showToast(`Invitation sent to ${user.name}`); } }}
                  >{isPending ? 'Pending' : '+ Connect'}</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Connection requests */}
          {totalRequests > 0 && (
            <div className="li-card" style={{ padding: '16px 24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Invitations ({totalRequests})</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Real incoming requests */}
                {incomingRequests.map(requester => (
                  <div key={requester.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ cursor: 'pointer' }} onClick={() => navigate(`profile?id=${requester.id}`)}>
                      <Avatar name={requester.name} size={48} colorOverride={requester.avatarColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`profile?id=${requester.id}`)}>
                        {requester.name}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{requester.headline || ''}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Wants to connect with you</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => handleDecline(requester)}>Decline</button>
                      <button className="li-btn li-btn--outline li-btn--sm" onClick={() => handleAccept(requester)}>Accept</button>
                    </div>
                  </div>
                ))}

                {/* Seeded invitations */}
                {visibleInvitations.slice(0, 3).map((inv, i) => {
                  const invUser = inv.user || inv;
                  const invName = invUser.name || inv.senderName || 'Unknown';
                  const invHeadline = invUser.headline || inv.headline || inv.title || '';
                  const invKey = String(invUser.id || inv.senderId || `${invName}-${i}`);
                  return (
                    <div key={invKey} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={invName} size={48} colorOverride={invUser.avatarColor} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{invName}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{invHeadline}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{inv.mutualCount || inv.mutualConnections || 0} mutual connections</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => {
                          dismissInvitation(String(invUser.id || ''));
                          showToast('Invitation declined');
                        }}>Decline</button>
                        <button className="li-btn li-btn--outline li-btn--sm" onClick={() => {
                          dismissInvitation(String(invUser.id || ''));
                          acceptConnection(invUser.id);
                          showToast(`Connected with ${invName}!`);
                        }}>Accept</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="li-card" style={{ padding: '16px 24px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>People you may know</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {allUsers.slice(0, 12).map((user, idx) => {
                const iConnected = connections.has(String(user.id));
                const isPending = pendingConnections.has(String(user.id));
                return (
                  <div key={user.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                    borderBottom: idx < 11 ? '1px solid var(--border)' : 'none',
                  }}>
                    <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => navigate(`profile?id=${user.id}`)}>
                      <Avatar name={user.name} size={48} colorOverride={user.avatarColor} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        onClick={() => navigate(`profile?id=${user.id}`)}
                      >{user.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.headline ? user.headline.slice(0, 60) + (user.headline.length > 60 ? '…' : '') : ''}
                      </div>
                      {user.mutualConnections > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                          {user.mutualConnections} mutual connections
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      {iConnected ? (
                        <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Connected</span>
                      ) : (
                        <button
                          className={isPending ? 'li-btn li-btn--ghost li-btn--sm' : 'li-btn li-btn--outline li-btn--sm'}
                          onClick={() => {
                            if (!isPending) {
                              connect(user.id);
                              showToast(`Invitation sent to ${user.name}`);
                            }
                          }}
                          disabled={isPending}
                        >
                          {isPending ? 'Pending' : '+ Connect'}
                        </button>
                      )}
                      {userStatus === 'recruiting' && recruiterMode && (() => {
                        const inPipeline = shortlisted.has(String(user.id));
                        return (
                          <button
                            className="li-btn li-btn--sm"
                            style={{
                              fontSize: 12, padding: '3px 10px',
                              background: inPipeline ? '#E6F4EA' : 'transparent',
                              border: `1px solid ${inPipeline ? '#057642' : 'var(--border)'}`,
                              color: inPipeline ? '#057642' : 'var(--text-2)',
                              borderRadius: 14, cursor: 'pointer', whiteSpace: 'nowrap',
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
