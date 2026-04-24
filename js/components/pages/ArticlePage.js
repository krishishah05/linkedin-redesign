/* ============================================================
   ARTICLEPAGE.JS — Write & publish a long-form article
   ============================================================ */
function ArticlePage() {
  const { currentUser, showToast } = React.useContext(AppContext);

  const [title, setTitle]     = React.useState('');
  const [body, setBody]       = React.useState('');
  const [coverUrl, setCover]  = React.useState('');
  const [published, setPublished] = React.useState(false);

  const BODY_MAX = 10000;

  function handlePublish() {
    if (!title.trim()) { showToast('Please add a title', 'error'); return; }
    if (!body.trim())  { showToast('Please write something in the article body', 'error'); return; }
    setPublished(true);
    showToast('Article published!', 'success');
  }

  if (published) {
    return (
      <div style={{ maxWidth: 740, margin: '40px auto', padding: '0 16px' }}>
        <div className="li-card" style={{ padding: '48px 40px', textAlign: 'center' }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="#057642" style={{ marginBottom: 16 }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Article published!</h2>
          <p style={{ color: 'var(--text-2)', marginBottom: 24 }}>Your article <strong>"{title}"</strong> is now live on your profile.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="li-btn li-btn--primary" onClick={() => { setPublished(false); setTitle(''); setBody(''); setCover(''); }}>
              Write another
            </button>
            <button className="li-btn li-btn--ghost" onClick={() => navigate('feed')}>
              Back to feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 740, margin: '24px auto', padding: '0 16px' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button
          className="li-btn li-btn--ghost"
          onClick={() => navigate('feed')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          Back
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="li-btn li-btn--ghost"
            onClick={() => showToast('Draft saved', 'success')}
          >
            Save draft
          </button>
          <button
            className="li-btn li-btn--primary"
            onClick={handlePublish}
            disabled={!title.trim() || !body.trim()}
          >
            Publish
          </button>
        </div>
      </div>

      <div className="li-card" style={{ padding: '32px 36px' }}>
        {/* Author line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Avatar name={currentUser?.name || 'Me'} size={40} colorOverride={currentUser?.avatarColor} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{currentUser?.name || 'You'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Publishing to your followers</div>
          </div>
        </div>

        {/* Cover image */}
        <div style={{ marginBottom: 20 }}>
          {coverUrl ? (
            <div style={{ position: 'relative' }}>
              <img
                src={coverUrl}
                alt="Cover"
                style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 8 }}
                onError={e => { e.target.style.display = 'none'; }}
              />
              <button
                onClick={() => setCover('')}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                  color: '#fff', width: 28, height: 28, cursor: 'pointer', fontSize: 16, lineHeight: 1,
                }}
              >×</button>
            </div>
          ) : (
            <div>
              <input
                className="li-input"
                placeholder="Paste a cover image URL (optional)…"
                value={coverUrl}
                onChange={e => setCover(e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
          )}
        </div>

        {/* Title */}
        <textarea
          placeholder="Headline *"
          value={title}
          onChange={e => setTitle(e.target.value)}
          maxLength={150}
          rows={2}
          style={{
            width: '100%', border: 'none', borderBottom: '2px solid var(--border)',
            outline: 'none', fontSize: 26, fontWeight: 700, fontFamily: 'inherit',
            resize: 'none', background: 'transparent', color: 'var(--text)',
            marginBottom: 20, lineHeight: 1.3, padding: '0 0 8px',
          }}
        />

        {/* Body */}
        <textarea
          placeholder="Write your article…"
          value={body}
          onChange={e => setBody(e.target.value)}
          maxLength={BODY_MAX}
          rows={18}
          style={{
            width: '100%', border: 'none', outline: 'none',
            fontSize: 16, fontFamily: 'inherit', resize: 'vertical',
            background: 'transparent', color: 'var(--text)', lineHeight: 1.7,
            padding: 0,
          }}
        />

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: body.length > BODY_MAX * 0.9 ? '#c00' : 'var(--text-3)' }}>
            {BODY_MAX - body.length} characters remaining
          </span>
          <button
            className="li-btn li-btn--primary"
            onClick={handlePublish}
            disabled={!title.trim() || !body.trim()}
          >
            Publish article
          </button>
        </div>
      </div>
    </div>
  );
}
