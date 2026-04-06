/* ============================================================
   SHAREMODAL.JS — Repost / share options
   ============================================================ */
function ShareModal() {
  const { closeModal, showToast } = React.useContext(AppContext);

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal">
        <div className="li-modal__header">
          <span className="li-modal__title">Share</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body" style={{ padding: 0 }}>
          <div className="li-dropdown__item" onClick={() => { showToast('Reposted!'); closeModal(); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
            </svg>
            <div>
              <div style={{ fontWeight: 600 }}>Repost</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Instantly share to feed</div>
            </div>
          </div>
          <div className="li-dropdown__item" onClick={() => { closeModal(); showToast('Opening post editor…'); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
            <div>
              <div style={{ fontWeight: 600 }}>Repost with your thoughts</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Add your perspective first</div>
            </div>
          </div>
          <div className="li-dropdown__divider" />
          <div className="li-dropdown__item" onClick={() => {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(window.location.href)
                .then(() => { showToast('Link copied!'); closeModal(); })
                .catch(() => showToast('Failed to copy link', 'error'));
            } else {
              showToast('Copy not supported in this browser', 'error');
            }
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
            Copy link to post
          </div>
        </div>
      </div>
    </div>
  );
}
