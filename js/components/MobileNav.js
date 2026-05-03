/* ============================================================
   MOBILENAV.JS — Bottom navigation for mobile viewports
   ============================================================ */
function MobileNav() {
  const { unreadMessages, unreadNotifications, pendingInvitations, openModal, t } = React.useContext(AppContext);
  const currentHash = useHash();

  const items = [
    { id: 'feed',          label: t('home'),          badge: 0,                        icon: <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/> },
    { id: 'network',       label: t('network'),       badge: pendingInvitations.length, icon: <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/> },
    { id: 'messaging',     label: t('messages'),      badge: unreadMessages,            icon: <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/> },
    { id: 'notifications', label: t('notifications'), badge: unreadNotifications,       icon: <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/> },
  ];

  return (
    <nav className="li-mobile-nav">
      {/* First 2 items */}
      {items.slice(0, 2).map(item => (
        <div
          key={item.id}
          className={`li-mobile-nav-item${currentHash === item.id ? ' active' : ''}`}
          onClick={() => navigate(item.id)}
          style={{ position: 'relative' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">{item.icon}</svg>
          <span>{item.label}</span>
          {item.badge > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: '50%', transform: 'translateX(12px)',
              background: '#CC1016', color: '#fff', borderRadius: 10,
              padding: '1px 5px', fontSize: 10, fontWeight: 700,
            }}>
              {item.badge}
            </span>
          )}
        </div>
      ))}

      {/* Post button (center) */}
      <div className="li-mobile-nav-item" onClick={() => openModal('post')}>
        <div className="li-mobile-nav-post">+</div>
      </div>

      {/* Last 2 items */}
      {items.slice(2).map(item => (
        <div
          key={item.id}
          className={`li-mobile-nav-item${currentHash === item.id ? ' active' : ''}`}
          onClick={() => navigate(item.id)}
          style={{ position: 'relative' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">{item.icon}</svg>
          <span>{item.label}</span>
          {item.badge > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: '50%', transform: 'translateX(12px)',
              background: '#CC1016', color: '#fff', borderRadius: 10,
              padding: '1px 5px', fontSize: 10, fontWeight: 700,
            }}>
              {item.badge}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
