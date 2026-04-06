/* ============================================================
   GROUPDETAILPAGE.JS — Single group view
   ============================================================ */
function GroupDetailPage({ groupId }) {
  const { showToast, joinedGroups, joinGroup, leaveGroup } = React.useContext(AppContext);
  const { data: group, loading, error } = useFetch(() => API.getGroup(groupId), [groupId]);
  const [tab, setTab] = React.useState('posts');
  const joined = joinedGroups.has(String(groupId));

  if (loading) return <LoadingSpinner text="Loading group..." />;
  if (error) return <ErrorMessage message={error} onRetry={() => window.location.reload()} />;
  if (!group) return <ErrorMessage message="Group not found" />;

  return (
    <div className="li-page-inner" style={{ maxWidth: 900 }}>
      {/* Back */}
      <button className="li-btn li-btn--ghost li-btn--sm" style={{ marginBottom: 12 }} onClick={() => navigate('groups')}>
        ← Back to Groups
      </button>

      {/* Hero banner */}
      <div className="li-card" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          height: 140,
          background: group.coverGradient || (group.color ? `linear-gradient(135deg, ${group.color}, #004182)` : 'linear-gradient(135deg, #0a66c2, #004182)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56,
        }}>
          {group.logo || group.emoji || ''}
        </div>
        <div style={{ padding: '16px 24px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{group.name}</h1>
            <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 8 }}>
              {group.privacy || 'Public'} · {formatNumber(group.members || 0)} members
              {group.category && ` · ${group.category}`}
            </div>
            {group.description && (
              <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, maxWidth: 600 }}>{group.description}</p>
            )}
          </div>
          <button
            className={joined ? 'li-btn li-btn--ghost li-btn--sm' : 'li-btn li-btn--primary li-btn--sm'}
            onClick={() => {
              joined ? leaveGroup(groupId) : joinGroup(groupId);
              showToast(joined ? 'Left group' : `Joined "${group.name}"!`);
            }}
          >
            {joined ? 'Leave group' : 'Join group'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="li-card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {['Posts', 'Members', 'About'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t.toLowerCase())}
              className="li-group-tab"
              style={{
                color: tab === t.toLowerCase() ? 'var(--text)' : 'var(--text-2)',
                borderBottomColor: tab === t.toLowerCase() ? 'var(--text)' : 'transparent',
              }}
            >
              {t}
              {t === 'Members' && group.members > 0 && (
                <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--text-3)' }}>
                  {formatNumber(group.members)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'posts' && (
        <div>
          <div className="li-card" style={{ padding: 16, marginBottom: 12 }}>
            <textarea
              placeholder="Share something with the group..."
              style={{
                width: '100%', border: '1px solid var(--border)', borderRadius: 24,
                padding: '10px 16px', fontSize: 14, resize: 'none', outline: 'none',
                fontFamily: 'inherit', background: 'var(--bg-2)', color: 'var(--text)',
                cursor: 'pointer', boxSizing: 'border-box',
              }}
              rows={1}
              onClick={() => showToast('Post creation — coming soon')}
              readOnly
            />
          </div>
          <div className="li-card" style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
              No posts yet. Be the first to share something!
            </p>
          </div>
        </div>
      )}

      {tab === 'members' && (
        <div className="li-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
            {formatNumber(group.members || 0)} members
          </h3>
          {(group.recentMembers || []).length === 0 ? (
            <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Member list unavailable.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(group.recentMembers || []).map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar name={m.name} size={40} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</div>
                    {m.headline && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{m.headline}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'about' && (
        <div className="li-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>About this group</h3>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 16 }}>
            {group.description || 'No description available.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Privacy', group.privacy || 'Public'],
              ['Members', formatNumber(group.members || 0)],
              ...(group.founded ? [['Founded', group.founded]] : []),
              ...(group.industry ? [['Industry', group.industry]] : []),
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', gap: 8, fontSize: 14 }}>
                <span style={{ fontWeight: 600, minWidth: 80 }}>{label}:</span>
                <span style={{ color: 'var(--text-2)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
