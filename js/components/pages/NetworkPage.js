/* ============================================================
   NETWORKPAGE.JS — My Network / People You May Know
   ============================================================ */
function NetworkPage() {
  const { connections, connect, pendingConnections, showToast, pendingInvitations, resolveInvitation } = React.useContext(AppContext);
  const { data: users, loading: usersLoading } = useFetch(API.getUsers, []);
  const [tab, setTab] = React.useState('suggestions');

  if (usersLoading) return <LoadingSpinner text="Loading network..." />;

  const allUsers = users || [];
  const visibleInvitations = pendingInvitations;

  return (
    <div className="li-page-inner">
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Invitations */}
          {visibleInvitations.length > 0 && (
            <div className="li-card" style={{ padding: '16px 24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Invitations ({visibleInvitations.length})</h2>
                <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => showToast('All invitations viewed')}>
                  See all
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {visibleInvitations.slice(0, 3).map((inv, i) => {
                  const invUser = inv.user || inv;
                  const invName = invUser.name || inv.senderName || 'Unknown';
                  const invHeadline = invUser.headline || inv.headline || inv.title || '';
                  return (
                    <div key={invName} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar name={invName} size={48} colorOverride={invUser.avatarColor} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{invName}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{invHeadline}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{inv.mutualCount || inv.mutualConnections || 0} mutual connections</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => {
                          resolveInvitation(invName);
                          showToast('Invitation ignored');
                        }}>Ignore</button>
                        <button className="li-btn li-btn--outline li-btn--sm" onClick={() => {
                          resolveInvitation(invName);
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
                    <div style={{ flexShrink: 0 }}>
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
