/* ============================================================
   NETWORKPAGE.JS — My Network / People You May Know
   ============================================================ */
function NetworkPage() {
  const { connections, connect, pendingConnections, showToast } = React.useContext(AppContext);
  const { data: users, loading: usersLoading } = useFetch(API.getUsers, []);
  const { data: invitations, loading: invitesLoading } = useFetch(API.getInvitations, []);
  const [tab, setTab] = React.useState('suggestions');

  const loading = usersLoading || invitesLoading;
  if (loading) return <LoadingSpinner text="Loading network..." />;

  const allUsers = users || [];
  const allInvitations = invitations || [];

  return (
    <div className="li-page-inner">
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Left sidebar */}
        <div style={{ width: 220, flexShrink: 0 }}>
          <div className="li-card" style={{ padding: '12px 0', marginBottom: 16 }}>
            <div style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>Manage my network</div>
            {[
              ['Connections', connections.size],
              ['Following & Followers', 48],
              ['Groups', 2],
              ['Events', 0],
              ['Pages', 3],
              ['Newsletters', 1],
              ['Hashtags', 6],
            ].map(([label, count]) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 16px', cursor: 'pointer', fontSize: 14,
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
                onClick={() => showToast(`${label} — coming soon`)}
              >
                <span>{label}</span>
                {count > 0 && <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600 }}>{count}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Invitations */}
          {allInvitations.length > 0 && (
            <div className="li-card" style={{ padding: '16px 24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700 }}>Invitations ({allInvitations.length})</h2>
                <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => showToast('All invitations viewed')}>
                  See all
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {allInvitations.slice(0, 3).map((inv, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar name={inv.name || inv.senderName} size={48} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{inv.name || inv.senderName}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{inv.headline || inv.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{inv.mutualConnections || 0} mutual connections</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => showToast('Invitation ignored')}>Ignore</button>
                      <button className="li-btn li-btn--outline li-btn--sm" onClick={() => showToast(`Connected with ${inv.name || inv.senderName}!`)}>Accept</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div className="li-card" style={{ padding: '16px 24px' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>People you may know</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {allUsers.slice(0, 12).map(user => {
                const iConnected = connections.has(String(user.id));
                const isPending = pendingConnections.has(String(user.id));
                return (
                  <div key={user.id} className="li-card" style={{ padding: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
                    {/* Banner */}
                    <div style={{ height: 40, background: 'linear-gradient(135deg,#0a66c2,#004182)', borderRadius: '6px 6px 0 0', margin: '-16px -16px 0', marginBottom: 8 }} />
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: -20, marginBottom: 8 }}>
                      <Avatar name={user.name} size={56} />
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{user.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, lineHeight: 1.3 }}>
                      {user.headline ? user.headline.slice(0, 50) + (user.headline.length > 50 ? '…' : '') : ''}
                    </div>
                    {user.mutualConnections > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10 }}>
                        {user.mutualConnections} mutual connections
                      </div>
                    )}
                    {iConnected ? (
                      <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Connected</div>
                    ) : (
                      <button
                        className={isPending ? 'li-btn li-btn--ghost li-btn--sm' : 'li-btn li-btn--outline li-btn--sm'}
                        style={{ width: '100%' }}
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
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
