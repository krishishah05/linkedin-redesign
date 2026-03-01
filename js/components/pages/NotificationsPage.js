/* ============================================================
   NOTIFICATIONSPAGE.JS — Notifications feed
   ============================================================ */
function NotificationsPage() {
  const { setUnreadNotifications, showToast } = React.useContext(AppContext);
  const [notifications, setNotifications] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    API.getNotifications()
      .then(data => { setNotifications(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  function markRead(id) {
    API.markRead(id).then(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    }).catch(() => {});
  }

  function markAllRead() {
    API.markAllRead().then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadNotifications(0);
      showToast('All notifications marked as read');
    }).catch(() => {});
  }

  if (loading) return <LoadingSpinner text="Loading notifications..." />;
  if (error) return <ErrorMessage message={error} />;

  const notifs = notifications || [];
  const unread = notifs.filter(n => !n.isRead).length;

  const typeIcon = {
    like: '👍',
    comment: '💬',
    connection: '🤝',
    job: '💼',
    view: '👁',
    mention: '@',
    message: '✉',
    event: '📅',
    birthday: '🎂',
    work_anniversary: '🎉',
    default: '🔔',
  };

  return (
    <div className="li-page-inner" style={{ maxWidth: 660 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>Notifications</h1>
          {unread > 0 && (
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{unread} unread</span>
          )}
        </div>
        {unread > 0 && (
          <button className="li-btn li-btn--ghost li-btn--sm" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {notifs.length === 0 ? (
        <div className="li-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No notifications yet.</p>
        </div>
      ) : (
        <div className="li-card" style={{ padding: 0, overflow: 'hidden' }}>
          {notifs.map((n, i) => (
            <div
              key={n.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '16px 20px',
                background: n.isRead ? 'var(--white)' : 'var(--blue-light, #EAF4FF)',
                borderBottom: i < notifs.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => !n.isRead && markRead(n.id)}
            >
              {/* Icon/avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar name={n.actorName || 'LinkedIn'} size={48} />
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--white)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11,
                }}>
                  {typeIcon[n.type] || typeIcon.default}
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, margin: '0 0 4px', lineHeight: 1.4 }}>
                  {n.message || n.text || ''}
                </p>
                <span style={{ fontSize: 12, color: n.isRead ? 'var(--text-3)' : 'var(--blue)', fontWeight: n.isRead ? 400 : 600 }}>
                  {formatTime(n.timestamp || n.createdAt)}
                </span>
              </div>

              {/* Unread dot */}
              {!n.isRead && (
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0, marginTop: 6 }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
