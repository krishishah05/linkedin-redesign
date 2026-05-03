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
  const [activeTab, setActiveTab] = React.useState('suggestions');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState(null);
  const [searching, setSearching] = React.useState(false);
  const searchTimeoutRef = React.useRef(null);

  React.useEffect(() => { refreshInvitations && refreshInvitations(); }, []);

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

  function handleSearchChange(val) {
    setSearchQuery(val);
    clearTimeout(searchTimeoutRef.current);
    if (!val.trim()) { setSearchResults(null); setSearching(false); return; }
    setSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      API.search(val)
        .then(res => { setSearchResults(res.users || []); setSearching(false); })
        .catch(() => setSearching(false));
    }, 300);
  }

  if (usersLoading) return <LoadingSpinner text="Loading network..." />;

  const allUsers = users || [];
  const visibleInvitations = pendingInvitations.filter(inv => !dismissedInvitations.has(String((inv.user || inv).id || inv.senderId || '')));
  const totalRequests = incomingRequests.length + Math.min(visibleInvitations.length, 3);

  const connectedUsers = allUsers.filter(u => connections.has(String(u.id)));
  const shortlistedUsers = allUsers.filter(u => shortlisted.has(String(u.id)));

  const tabs = [
    { key: 'suggestions', label: 'Suggestions' },
    { key: 'connections', label: `Connections${connectedUsers.length ? ` (${connectedUsers.length})` : ''}` },
    ...(recruiterMode ? [{ key: 'shortlisted', label: `Shortlisted${shortlistedUsers.length ? ` (${shortlistedUsers.length})` : ''}` }] : []),
  ];

  function PersonRow({ user, idx, total, showShortlist }) {
    const iConnected = connections.has(String(user.id));
    const isPending = pendingConnections.has(String(user.id));
    const inPipeline = shortlisted.has(String(user.id));
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
        borderBottom: idx < total - 1 ? '1px solid var(--border)' : 'none',
      }}>
        <div style={{ flexShrink: 0, cursor: 'pointer' }} onClick={() => navigate(`profile?id=${user.id}`)}>
          <Avatar name={user.name} size={48} photo={user.photo} colorOverride={user.avatarColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            onClick={() => navigate(`profile?id=${user.id}`)}>{user.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.headline ? user.headline.slice(0, 60) + (user.headline.length > 60 ? '…' : '') : ''}
          </div>
          {user.location && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{user.location}</div>}
          {!iConnected && user.mutualConnections > 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{user.mutualConnections} mutual connections</div>
          )}
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          {iConnected ? (
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Connected</span>
          ) : (
            <button
              className={isPending ? 'li-btn li-btn--ghost li-btn--sm' : 'li-btn li-btn--outline li-btn--sm'}
              disabled={isPending}
              onClick={() => { if (!isPending) { connect(user.id); showToast(`Invitation sent to ${user.name}`); } }}
            >{isPending ? 'Pending' : '+ Connect'}</button>
          )}
          {showShortlist && recruiterMode && (
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
                if (inPipeline) { removeFromShortlist(user.id); showToast(`Removed ${user.name} from shortlist`); }
                else { addToShortlist(user); showToast(`${user.name} added to shortlist`); }
              }}
            >{inPipeline ? '✓ Shortlisted' : '+ Shortlist'}</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="li-page-inner" style={{ maxWidth: 700 }}>

      {/* Invitations */}
      {totalRequests > 0 && (
        <div className="li-card" style={{ padding: '16px 24px', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Invitations ({totalRequests})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {incomingRequests.map(requester => (
              <div key={requester.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ cursor: 'pointer' }} onClick={() => navigate(`profile?id=${requester.id}`)}>
                  <Avatar name={requester.name} size={48} colorOverride={requester.avatarColor} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, cursor: 'pointer' }} onClick={() => navigate(`profile?id=${requester.id}`)}>{requester.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{requester.headline || ''}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Wants to connect with you</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => handleDecline(requester)}>Decline</button>
                  <button className="li-btn li-btn--outline li-btn--sm" onClick={() => handleAccept(requester)}>Accept</button>
                </div>
              </div>
            ))}
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
                    <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => { dismissInvitation(String(invUser.id || '')); showToast('Invitation declined'); }}>Decline</button>
                    <button className="li-btn li-btn--outline li-btn--sm" onClick={() => { dismissInvitation(String(invUser.id || '')); acceptConnection(invUser.id); showToast(`Connected with ${invName}!`); }}>Accept</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search bar — same width as card below */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', marginBottom: 0,
        background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '8px 8px 0 0',
        borderBottom: 'none' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--text-3)" style={{ flexShrink: 0 }}>
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
          <button onClick={() => { setSearchQuery(''); setSearchResults(null); setSearching(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 20, lineHeight: 1, padding: 0 }}>×</button>
        )}
      </div>

      {/* People card */}
      <div className="li-card" style={{ borderRadius: '0 0 8px 8px', padding: '0 24px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              style={{
                padding: '14px 16px', fontSize: 14, fontWeight: activeTab === t.key ? 700 : 500,
                color: activeTab === t.key ? 'var(--text)' : 'var(--text-2)',
                background: 'none', border: 'none', borderBottom: activeTab === t.key ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap',
              }}
            >{t.label}</button>
          ))}
        </div>

        <div style={{ paddingTop: 4 }}>
          {/* Search results override tab content */}
          {searchQuery ? (
            searching ? (
              <div style={{ padding: '20px 0', fontSize: 14, color: 'var(--text-2)' }}>Searching...</div>
            ) : !searchResults || searchResults.length === 0 ? (
              <div style={{ padding: '20px 0', fontSize: 14, color: 'var(--text-2)' }}>No people found for "{searchQuery}"</div>
            ) : searchResults.map((user, idx) => (
              <PersonRow key={user.id} user={user} idx={idx} total={searchResults.length} showShortlist={recruiterMode} />
            ))
          ) : activeTab === 'suggestions' ? (
            allUsers.slice(0, 12).map((user, idx) => (
              <PersonRow key={user.id} user={user} idx={idx} total={Math.min(allUsers.length, 12)} showShortlist={userStatus === 'recruiting' && recruiterMode} />
            ))
          ) : activeTab === 'connections' ? (
            connectedUsers.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-2)', fontSize: 14 }}>
                You haven't connected with anyone yet.
              </div>
            ) : connectedUsers.map((user, idx) => (
              <PersonRow key={user.id} user={user} idx={idx} total={connectedUsers.length} showShortlist={recruiterMode} />
            ))
          ) : activeTab === 'shortlisted' ? (
            shortlistedUsers.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-2)', fontSize: 14 }}>
                No candidates shortlisted yet. Use the Shortlist button on any profile.
              </div>
            ) : shortlistedUsers.map((user, idx) => (
              <PersonRow key={user.id} user={user} idx={idx} total={shortlistedUsers.length} showShortlist={true} />
            ))
          ) : null}
        </div>
      </div>
    </div>
  );
}
