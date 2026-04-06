/* ============================================================
   CONNECTMODAL.JS — Send connection request with optional note
   ============================================================ */
function ConnectModal() {
  const { closeModal, modalData, connect, showToast } = React.useContext(AppContext);
  const user = modalData && modalData.user ? modalData.user : null;
  const [note, setNote] = React.useState('');
  const MAX = 300;

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
          <span className="li-modal__title">Add a note</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 12 }}>
            People are more likely to accept invitations with a personalized note.
          </p>
          {user && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <Avatar name={user.name} size={48} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{user.headline}</div>
              </div>
            </div>
          )}
          <textarea
            style={{ width: '100%', height: 120, border: '1px solid var(--border-2)', borderRadius: 4, padding: 12, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
            placeholder="E.g. We know each other from..."
            maxLength={MAX}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'right', marginTop: 4 }}>
            {note.length}/{MAX}
          </div>
        </div>
        <div className="li-modal__footer">
          <button className="li-btn li-btn--ghost li-btn--sm" onClick={closeModal}>Cancel</button>
          <button className="li-btn li-btn--primary li-btn--sm" onClick={handleConnect}>Connect</button>
        </div>
      </div>
    </div>
  );
}
