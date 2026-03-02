/* ============================================================
   REPORTMODAL.JS — Report a post
   ============================================================ */
function ReportModal() {
  const { closeModal, showToast } = React.useContext(AppContext);
  const [reason, setReason] = React.useState('');

  const reasons = [
    'Harassment or bullying',
    'Spam or scam',
    'Misinformation',
    'Inappropriate content',
    'Something else',
  ];

  function handleSubmit() {
    if (!reason) { showToast('Please select a reason', 'error'); return; }
    showToast('Report submitted. Thank you.');
    closeModal();
  }

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal">
        <div className="li-modal__header">
          <span className="li-modal__title">Report this post</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          <p style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 16 }}>Why are you reporting this post?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reasons.map(r => (
              <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, border: `1px solid ${reason === r ? 'var(--blue)' : 'var(--border)'}`, borderRadius: 4, cursor: 'pointer', fontSize: 14, background: reason === r ? 'var(--blue-light)' : '' }}>
                <input type="radio" name="report" style={{ accentColor: '#0F5DBD' }} checked={reason === r} onChange={() => setReason(r)} />
                {r}
              </label>
            ))}
          </div>
        </div>
        <div className="li-modal__footer">
          <button className="li-btn li-btn--ghost li-btn--sm" onClick={closeModal}>Cancel</button>
          <button className="li-btn li-btn--primary li-btn--sm" onClick={handleSubmit}>Submit</button>
        </div>
      </div>
    </div>
  );
}
