/* ============================================================
   GROUPSPAGE.JS — Groups listing
   ============================================================ */
function GroupsPage() {
  const { showToast, joinedGroups, joinGroup, leaveGroup } = React.useContext(AppContext);
  const { data: groups, loading, error } = useFetch(API.getGroups, []);
  const [tab, setTab] = React.useState('my-groups');
  const joined = joinedGroups;

  if (loading) return <LoadingSpinner text="Loading groups..." />;
  if (error) return <ErrorMessage message={error} />;

  const allGroups = groups || [];

  const shown = tab === 'my-groups'
    ? allGroups.filter(g => joined.has(String(g.id)))
    : allGroups.filter(g => !joined.has(String(g.id)));

  return (
    <div className="li-page-inner" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Groups</h1>
        <button className="li-btn li-btn--outline li-btn--sm" onClick={() => showToast('Create group — coming soon')}>
          + Create group
        </button>
      </div>

      {/* Tabs */}
      <div className="li-card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[['my-groups', 'My Groups'], ['discover', 'Discover']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTab(val)}
              style={{
                padding: '14px 20px', fontSize: 14, fontWeight: 600,
                color: tab === val ? 'var(--text)' : 'var(--text-2)',
                background: 'none', border: 'none',
                borderBottom: tab === val ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="li-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>Groups</div>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 16 }}>
            {tab === 'my-groups' ? "You haven't joined any groups yet." : 'No groups to discover right now.'}
          </p>
          {tab === 'my-groups' && (
            <button className="li-btn li-btn--primary li-btn--sm" onClick={() => setTab('discover')}>
              Discover groups
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {shown.map(group => (
            <div key={group.id} className="li-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Group header */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 8, flexShrink: 0,
                  background: group.coverGradient || group.color || '#0F5DBD',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: '#fff',
                }}>
                  {group.logo || group.emoji || ''}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{group.name}</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                    {group.privacy || 'Public'} · {formatNumber(group.members || 0)} members
                  </div>
                </div>
              </div>

              {group.description && (
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
                  {group.description.length > 100 ? group.description.slice(0, 100) + '…' : group.description}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button
                  className="li-btn li-btn--outline li-btn--sm"
                  style={{ flex: 1 }}
                  onClick={() => navigate(`group-detail?id=${group.id}`)}
                >
                  View
                </button>
                {joined.has(String(group.id)) ? (
                  <button
                    className="li-btn li-btn--ghost li-btn--sm"
                    onClick={() => {
                      leaveGroup(group.id);
                      showToast('Left group');
                    }}
                  >
                    Leave
                  </button>
                ) : (
                  <button
                    className="li-btn li-btn--primary li-btn--sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      joinGroup(group.id);
                      showToast(`Joined "${group.name}"!`);
                    }}
                  >
                    Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
