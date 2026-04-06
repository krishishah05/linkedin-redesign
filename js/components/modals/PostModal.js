/* ============================================================
   POSTMODAL.JS — Create a post
   ============================================================ */
function PostModal() {
  const { currentUser, closeModal, showToast } = React.useContext(AppContext);
  const [text, setText] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  const MAX = 3000;

  function handleSubmit() {
    if (!text.trim()) { showToast('Write something first', 'error'); return; }
    if (posting) return;
    setPosting(true);
    API.createPost(text.trim())
      .then(() => {
        showToast('Post published!');
        closeModal();
        navigate('feed');
      })
      .catch(() => {
        showToast('Failed to publish post. Try again.', 'error');
        setPosting(false);
      });
  }

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal">
        <div className="li-modal__header">
          <span className="li-modal__title">Create a post</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          <div className="li-post-modal__author">
            <Avatar name={currentUser ? currentUser.name : 'Me'} size={48} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{currentUser ? currentUser.name : ''}</div>
              <button className="li-post-modal__audience">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Anyone ▾
              </button>
            </div>
          </div>
          <textarea
            className="li-post-textarea"
            placeholder="What do you want to talk about?"
            maxLength={MAX}
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
          <div className="li-post-char-count">{text.length} / {MAX}</div>
        </div>
        <div className="li-modal__footer" style={{ borderTop: '1px solid var(--border)', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div className="li-post-modal__toolbar">
            {[
              { label: 'Photo',        color: '#70B5F9', icon: <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/> },
              { label: 'Video',        color: '#F5CA8A', icon: <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/> },
              { label: 'Write article',color: '#7FC15E', icon: <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/> },
            ].map(btn => (
              <button key={btn.label} className="li-post-tool-btn" onClick={() => showToast(`${btn.label} — coming soon`)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={btn.color}>{btn.icon}</svg>
                {btn.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="li-btn li-btn--primary"
              onClick={handleSubmit}
              disabled={!text.trim() || posting}
              style={{ padding: '8px 20px', fontSize: 14 }}
            >
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
