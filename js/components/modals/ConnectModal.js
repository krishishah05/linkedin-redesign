/* ============================================================
   CONNECTMODAL.JS — Send connection request
   ============================================================ */
function ConnectModal() {
  const { closeModal, modalData, connect, showToast } = React.useContext(AppContext);
  const user = modalData && modalData.user ? modalData.user : null;

  function handleConnect() {
    if (!user) { showToast('User data not found', 'error'); closeModal(); return; }
    connect(user.id);
    showToast(`Invitation sent to ${user.name}`);
    closeModal();
  }

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal">
        <div className="li-modal__header">
          <span className="li-modal__title">Connect with {user ? user.name : ''}</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          {user && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <Avatar name={user.name} size={56} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{user.headline}</div>
                {user.location && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{user.location}</div>}
              </div>
            </div>
          )}
          <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
            Connecting will let you message each other and see each other's full network.
          </p>
        </div>
        <div className="li-modal__footer">
          <button className="li-btn li-btn--ghost li-btn--sm" onClick={closeModal}>Cancel</button>
          <button className="li-btn li-btn--primary li-btn--sm" onClick={handleConnect}>Connect</button>
        </div>
      </div>
    </div>
  );
}
