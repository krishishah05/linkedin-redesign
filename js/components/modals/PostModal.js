/* ============================================================
   POSTMODAL.JS - Create a post
   ============================================================ */
function PostModal() {
  const { currentUser, closeModal, showToast, modalData, t } = React.useContext(AppContext);
  const repostOf = modalData?.repostOf;
  const onRepost = modalData?.onRepost;
  const [text, setText] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');
  const [videoUrl, setVideoUrl] = React.useState('');
  const [videoBlobUrl, setVideoBlobUrl] = React.useState('');
  const [posting, setPosting] = React.useState(false);
  const MAX = 3000;
  const photoInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    };
  }, [videoBlobUrl]);

  function handlePhotoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(typeof reader.result === 'string' ? reader.result : '');
        if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
        setVideoUrl('');
        setVideoBlobUrl('');
      };
      reader.onerror = () => showToast('Could not read this photo.', 'error');
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }

  function handleVideoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
    const url = URL.createObjectURL(file);
    setVideoBlobUrl(url);
    const reader = new FileReader();
    reader.onload = () => {
      setVideoUrl(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => showToast('Could not read this video.', 'error');
    reader.readAsDataURL(file);
    setImageUrl('');
    e.target.value = '';
  }

  function handleSubmit() {
    const cleanImageUrl = imageUrl.trim();
    const cleanVideoUrl = videoUrl.trim();
    if (!text.trim() && !cleanImageUrl && !cleanVideoUrl && !repostOf) { showToast('Write something or add media first', 'error'); return; }
    if (posting) return;
    setPosting(true);
    if (repostOf && onRepost) {
      onRepost(repostOf, text.trim());
      showToast('Reposted with your thoughts!', 'success');
      closeModal();
      navigate('feed');
      return;
    }
    API.createPost(text.trim(), cleanImageUrl || null, cleanVideoUrl || null)
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
        <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
        <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoUpload} />
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
                Anyone
              </button>
            </div>
          </div>
          <textarea
            className="li-post-textarea"
            placeholder={t('whatToTalk')}
            maxLength={MAX}
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
          {(videoBlobUrl || videoUrl) && (
            <div style={{ position: 'relative', marginTop: 8 }}>
              <video src={videoBlobUrl || videoUrl} controls style={{ maxHeight: 220, borderRadius: 8, width: '100%', background: '#000' }} />
              <button
                onClick={() => { if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl); setVideoUrl(''); setVideoBlobUrl(''); }}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#fff', fontSize: 14, lineHeight: '24px', textAlign: 'center' }}
              >×</button>
            </div>
          )}
          {imageUrl && (
            <img src={imageUrl} alt="preview"
              style={{ maxHeight: 160, borderRadius: 8, objectFit: 'cover', width: '100%', marginTop: 8 }}
              onError={e => { e.target.style.display = 'none'; }} />
          )}
          <div className="li-post-char-count">{text.length} / {MAX}</div>
          {repostOf && (() => {
            const rpName = repostOf.author?.name || repostOf.authorName || repostOf.author || 'User';
            const rpHeadline = repostOf.authorTitle || repostOf.author?.headline || '';
            const rpContent = repostOf.content || repostOf.text || repostOf.body || '';
            const rpImage = repostOf.image || repostOf.imageUrl || repostOf.image_url || null;
            return (
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginTop: 8, background: 'var(--bg)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <Avatar name={rpName} size={32} color={repostOf.author?.avatarColor} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{rpName}</div>
                    {rpHeadline && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{rpHeadline}</div>}
                  </div>
                </div>
                {rpContent && <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, color: 'var(--text)' }}>{rpContent.length > 200 ? rpContent.slice(0, 200) + '…' : rpContent}</p>}
                {rpImage && <img src={rpImage} alt="" style={{ maxHeight: 140, borderRadius: 6, width: '100%', objectFit: 'cover', marginTop: 8 }} onError={e => { e.target.style.display = 'none'; }} />}
              </div>
            );
          })()}
        </div>
        <div className="li-modal__footer" style={{ borderTop: '1px solid var(--border)', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
          <div className="li-post-modal__toolbar">
            {[
              { key: 'photo', color: '#70B5F9', icon: <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/> },
              { key: 'video', color: '#F5CA8A', icon: <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/> },
            ].map(btn => (
              <button key={btn.key} className="li-post-tool-btn"
                onClick={() => {
                  if (btn.key === 'photo') { photoInputRef.current && photoInputRef.current.click(); return; }
                  if (btn.key === 'video') { videoInputRef.current && videoInputRef.current.click(); return; }
                }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill={btn.color}>{btn.icon}</svg>
                {t(btn.key)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="li-btn li-btn--primary"
              onClick={handleSubmit}
              disabled={(!text.trim() && !imageUrl.trim() && !videoUrl.trim()) || posting}
              style={{ padding: '8px 20px', fontSize: 14 }}
            >
              {posting ? '...' : t('post')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
