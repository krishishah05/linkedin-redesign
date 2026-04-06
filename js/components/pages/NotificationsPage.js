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
      setNotifications(prev => (prev || []).map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadNotifications(prev => Math.max(0, prev - 1));
    }).catch(() => {});
  }

  function markAllRead() {
    API.markAllRead().then(() => {
      setNotifications(prev => (prev || []).map(n => ({ ...n, isRead: true })));
      setUnreadNotifications(0);
      showToast('All notifications marked as read');
    }).catch(() => {});
  }

  if (loading) return <LoadingSpinner text="Loading notifications..." />;
  if (error) return <ErrorMessage message={error} />;

  const notifs = notifications || [];
  const unread = notifs.filter(n => !n.isRead).length;

  // SVG icon paths for each notification type (renders inside a 20x20 svg)
  const typeIconPath = {
    like:             'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z',
    comment:          'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
    connection:       'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    job:              'M20 6h-2.18c.07-.44.18-.88.18-1.36C18 2.51 15.49 0 12.36 0c-1.4 0-2.72.56-3.71 1.56L12 4.91l3.35-3.35C15.69 2.65 16 3.32 16 4.07c0 .9-.66 1.65-1.5 1.8L14.18 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z',
    view:             'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
    mention:          'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10h5v-2h-5c-4.34 0-8-3.66-8-8s3.66-8 8-8 8 3.66 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.76-2.24-5-5-5s-5 2.24-5 5 2.24 5 5 5c1.38 0 2.64-.56 3.54-1.47.65.89 1.77 1.47 2.96 1.47 1.97 0 3.5-1.6 3.5-3.57V12c0-5.52-4.48-10-10-10zm0 13c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
    message:          'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
    event:            'M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z',
    birthday:         'M12 6c1.11 0 2-.89 2-2 0-.35-.1-.68-.24-.97L12 0l-1.76 3.03c-.14.29-.24.62-.24.97 0 1.11.89 2 2 2zm4 3H8c-1.1 0-2 .9-2 2v7h2v-2h8v2h2v-7c0-1.1-.9-2-2-2z',
    work_anniversary: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23L16.23 18z',
    default:          'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, color: 'var(--text-3)' }}>
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>You're all caught up. No new notifications.</p>
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
                <Avatar name={(n.actor && n.actor.name) || n.actorName || 'Nexus'} size={48} colorOverride={n.actor && n.actor.avatarColor} />
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'var(--blue)', border: '2px solid var(--white)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#fff">
                    <path d={typeIconPath[n.type] || typeIconPath.default} />
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, margin: '0 0 4px', lineHeight: 1.4 }}>
                  {n.content || n.message || n.text || ''}
                </p>
                <span style={{ fontSize: 12, color: n.isRead ? 'var(--text-3)' : 'var(--blue)', fontWeight: n.isRead ? 400 : 600 }}>
                  {typeof n.timestamp === 'string' ? n.timestamp : formatTime(n.timestamp || n.createdAt)}
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
