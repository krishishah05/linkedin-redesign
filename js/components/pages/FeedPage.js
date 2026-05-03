/* ============================================================
   FEEDPAGE.JS — Main feed (matches original app.js quality)
   ============================================================ */

function FeedPage() {
  const { currentUser, likedPosts, toggleLike, following, follow, connections, openModal, showToast } = React.useContext(AppContext);
  const { data: posts, loading, error } = useFetch(API.getFeed, []);
  const { data: news } = useFetch(API.getNews, []);
  const { data: hashtags } = useFetch(API.getHashtags, []);
  const { data: users } = useFetch(API.getUsers, []);
  const [localPosts, setLocalPosts] = React.useState(null);
  const [feedSort, setFeedSort] = React.useState('Top');
  const [expandedComments, setExpandedComments] = React.useState(new Set());
  const [savedPostIds, setSavedPostIds] = React.useState(new Set());
  const [dismissedAdKeys, setDismissedAdKeys] = React.useState(new Set());

  React.useEffect(() => { if (posts) setLocalPosts(posts); }, [posts]);

  if (loading) return <LoadingSpinner text="Loading feed..." />;
  if (error) return (
    <div className="li-page-inner" style={{ textAlign: 'center', padding: 60 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ marginBottom: 12 }}>
        <rect width="48" height="48" rx="8" fill="#0F5DBD"/>
        <text x="11" y="36" fontFamily="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" fontSize="28" fontWeight="800" fill="#fff">N</text>
      </svg>
      <p style={{ color: 'var(--text-2)', marginBottom: 8 }}>Could not load feed. Make sure the backend is running.</p>
      <code style={{ fontSize: 12, color: 'var(--text-3)' }}>{error}</code>
    </div>
  );

  const rawPosts = (localPosts || []).filter(post => {
    const authorId = String(post.authorId || post.author?.id || '');
    if (!authorId) return true; // no author info → always show
    const myId = String((currentUser || {}).id || '');
    return authorId === myId || (connections || new Set()).has(authorId);
  });
  const allPosts = feedSort === 'Recent'
    ? [...rawPosts].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
    : [...rawPosts].sort((a, b) => {
        const ra = a.reactions ? Object.values(a.reactions).reduce((s, v) => s + v, 0) : (a.totalReactions || 0);
        const rb = b.reactions ? Object.values(b.reactions).reduce((s, v) => s + v, 0) : (b.totalReactions || 0);
        return rb - ra;
      });
  const u = currentUser || {};

  function handleRepost(originalPost, commentText = '') {
    const newPost = {
      id: Date.now(),
      author: u.name,
      authorId: u.id,
      authorTitle: u.headline,
      content: commentText,
      repostOf: originalPost,
      createdAt: Date.now(),
      timestamp: Date.now(),
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      comments: [],
    };
    setLocalPosts(prev => [newPost, ...(prev || [])]);
    setFeedSort('Recent');
  }

  function handleNewPost(content, imageUrl, videoUrl) {
    const newPost = {
      id: Date.now(),
      author: u.name,
      authorId: u.id,
      authorTitle: u.headline,
      content,
      image: imageUrl || null,
      videoUrl: videoUrl || null,
      createdAt: Date.now(),
      timestamp: Date.now(),
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      comments: [],
    };
    setLocalPosts(prev => [newPost, ...(prev || [])]);
    setFeedSort('Recent');
    API.createPost(content, imageUrl || null, videoUrl || null)
      .then((savedPost) => {
        setLocalPosts(prev => (prev || []).map(p => (
          p.id === newPost.id ? { ...p, ...savedPost } : p
        )));
        showToast('Post shared!', 'success');
      })
      .catch(() => {
        setLocalPosts(prev => (prev || []).filter(p => p.id !== newPost.id));
        showToast('Failed to post. Please try again.', 'error');
      });
  }

  function toggleCommentsFor(postId) {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  }


  const suggUsers = (users || []).slice(0, 4);
  const allNews = news || [];
  const allTags = hashtags || [];

  return (
    <div className="li-page-inner">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="li-sidebar-left">
        <div className="li-card li-profile-card">
          {u.name && (
            <>
              <div className="li-profile-card__banner" style={{ background: u.coverGradient || 'linear-gradient(135deg,#2E87F0 0%,#0F5DBD 60%,#764ba2 100%)' }}>
                <div className="li-profile-card__photo" style={{ cursor: 'pointer' }} onClick={() => navigate(`profile?id=${u.id}`)}>
                  {getInitials(u.name)}
                </div>
              </div>
              <div className="li-profile-card__info">
                <div className="li-profile-card__name" onClick={() => navigate(`profile?id=${u.id}`)}>
                  {u.name}

                </div>
                <div className="li-profile-card__headline">{(u.headline || '').split('|')[0].trim()}</div>
                {u.location && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{u.location}</div>}
              </div>

            </>
          )}
        </div>
      </aside>

      {/* ── CENTER FEED ── */}
      <div className="li-main-col">
        {/* Post Creator */}
        <PostCreator user={u} onPost={handleNewPost} openModal={openModal} showToast={showToast} />

        {/* Sort bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--white)', borderRadius: 8, boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Sort by:</span>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', borderRadius: 16, padding: 3 }}>
            {['Top', 'Recent'].map(s => (
              <button key={s} onClick={() => setFeedSort(s)} style={{
                padding: '4px 14px', borderRadius: 12, border: 'none',
                background: feedSort === s ? 'var(--blue)' : 'transparent',
                color: feedSort === s ? '#fff' : 'var(--text-2)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Posts */}
        {allPosts.map((post, i) => (
          <React.Fragment key={post.id}>
            <FeedPost
              post={post}
              liked={likedPosts.has(String(post.id))}
              onLike={() => { toggleLike(String(post.id)); }}
              commentsOpen={expandedComments.has(post.id)}
              onToggleComments={() => toggleCommentsFor(post.id)}
              following={following}
              onFollow={follow}
              openModal={openModal}
              showToast={showToast}
              currentUser={u}
              onRepost={handleRepost}
              savedPostIds={savedPostIds}
              onSave={id => setSavedPostIds(prev => { const next = new Set(prev); next.has(String(id)) ? next.delete(String(id)) : next.add(String(id)); return next; })}
              onHide={id => { setLocalPosts(prev => (prev || []).filter(p => p.id !== id)); showToast('Post removed from your feed'); }}
              onDelete={id => {
                const deleted = (localPosts || []).find(p => p.id === id);
                setLocalPosts(prev => prev.filter(p => p.id !== id));
                API.deletePost(id).catch(() => {
                  showToast('Failed to delete post', 'error');
                  if (deleted) setLocalPosts(prev => [deleted, ...(prev || [])]);
                });
              }}
            />
          </React.Fragment>
        ))}

        {allPosts.length === 0 && (
          <div className="li-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, color: 'var(--text-3)' }}><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <div>Your feed is empty. Follow people and companies to see posts here.</div>
          </div>
        )}
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <aside className="li-sidebar-right">

        {/* People you may know */}
        {suggUsers.length > 0 && (
          <div className="li-card" style={{ padding: '12px 0' }}>
            <div style={{ padding: '0 16px 8px', fontWeight: 700, fontSize: 15 }}>People you may know</div>
            {suggUsers.map(su => {
              const isFollowing = following.has(String(su.id));
              return (
                <div key={su.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 16px' }}>
                  <div style={{ cursor: 'pointer', flexShrink: 0 }} onClick={() => navigate(`profile?id=${su.id}`)}>
                    <Avatar name={su.name} size={36} colorOverride={su.avatarColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      onClick={() => navigate(`profile?id=${su.id}`)}>
                      {su.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(su.headline || '').split('|')[0].trim()}
                    </div>
                  </div>
                  <button
                    onClick={() => { follow(su.id); showToast(`Following ${su.name}`); }}
                    style={{
                      flexShrink: 0, border: `1px solid ${isFollowing ? 'var(--border)' : 'var(--blue)'}`,
                      color: isFollowing ? 'var(--text-2)' : 'var(--blue)', background: 'none',
                      borderRadius: 16, padding: '4px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                    {isFollowing ? 'Following' : '+ Follow'}
                  </button>
                </div>
              );
            })}
            <div style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}
              onClick={() => navigate('network')}>
              View all recommendations
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 12l4-4-4-4"/></svg>
            </div>
          </div>
        )}

      </aside>
    </div>
  );
}

/* ── PostCreator ─────────────────────────────────────────── */
function PostCreator({ user, onPost, openModal, showToast }) {
  const { t } = React.useContext(AppContext);
  const [draft, setDraft] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState('');
  const [photoPreviewUrl, setPhotoPreviewUrl] = React.useState('');
  const [showMediaInput, setShowMediaInput] = React.useState(false);
  const [mediaInputType, setMediaInputType] = React.useState('photo');
  const [showArticleTemplates, setShowArticleTemplates] = React.useState(false);
  const [isArticle, setIsArticle] = React.useState(false);
  const [videoUrl, setVideoUrl] = React.useState('');
  const [videoPreviewUrl, setVideoPreviewUrl] = React.useState('');
  const MAX = 3000;
  const photoInputRef = React.useRef(null);
  const videoInputRef = React.useRef(null);

  React.useEffect(() => {
    return () => {
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
    };
  }, [photoPreviewUrl]);

  const ARTICLE_TEMPLATES = [
    { id: 'insight', title: 'Industry Insight', emoji: '📊', preview: 'Trends & observations from your field',
      body: `[Your compelling headline]\n\nKey trends I'm observing in [industry]:\n• [Trend 1 — what you're seeing]\n• [Trend 2 — why it matters]\n• [Trend 3 — what's coming next]\n\nWhat this means for professionals like us:\n[Your analysis]\n\nWhat trends are you seeing?\n\n#Insights #[Industry]` },
    { id: 'howto', title: 'How-To Guide', emoji: '📋', preview: 'Step-by-step tutorial or guide',
      body: `How to [achieve something valuable]\n\n— Step 1: [First action]\n[Brief explanation]\n\n— Step 2: [Second action]\n[Brief explanation]\n\n— Step 3: [Third action]\n[Brief explanation]\n\n💡 Pro tip: [Bonus insight]\n\nSave this for later!\n\n#HowTo #Tips #[Field]` },
    { id: 'opinion', title: 'Opinion Piece', emoji: '💭', preview: 'Share your professional perspective',
      body: `Hot take: [Your position]\n\nHere's why:\n\n[First argument]\n\n[Second argument]\n\n[Third argument]\n\nDo you agree or disagree?\n\n#Opinion #[Industry] #Leadership` },
    { id: 'announcement', title: 'Announcement', emoji: '📣', preview: 'Share news or milestones',
      body: `Thrilled to announce: [Your big news] 🎉\n\n[Full story of what happened]\n\nThis wouldn't have been possible without [acknowledgements].\n\nWhat's next: [Goals]\n\n#Announcement #NewChapter` },
    { id: 'casestudy', title: 'Case Study', emoji: '🔍', preview: 'Document a challenge you solved',
      body: `Case Study: How [we/I] [achieved result]\n\n🔴 Challenge:\n[The problem]\n\n🟡 Approach:\n[Your method]\n\n🟢 Results:\n• [Metric 1]\n• [Metric 2]\n\n📚 Learnings:\n[Key takeaway]\n\n#CaseStudy #[Industry]` },
  ];

  function submit() {
    const cleanImageUrl = imageUrl.trim();
    const cleanVideoUrl = videoUrl.trim();
    if (!draft.trim() && !cleanImageUrl && !cleanVideoUrl) return;
    onPost(draft.trim(), cleanImageUrl || null, cleanVideoUrl || null);
    setDraft('');
    setImageUrl('');
    setPhotoPreviewUrl('');
    setVideoUrl('');
    setShowMediaInput(false);
    setExpanded(false);
    setIsArticle(false);
    setShowArticleTemplates(false);
  }

  function handlePhotoCapture(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      const nextPreview = URL.createObjectURL(file);
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl);
      setPhotoPreviewUrl(nextPreview);
      setExpanded(true);
      const reader = new FileReader();
      reader.onload = () => {
        setImageUrl(typeof reader.result === 'string' ? reader.result : '');
      };
      reader.onerror = () => showToast('Could not read this photo.', 'error');
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  }

  function activatePhoto() {
    setMediaInputType('photo');
    setShowMediaInput(true);
    photoInputRef.current && photoInputRef.current.click();
    setExpanded(true);
  }
  function activateVideo() {
    setMediaInputType('video');
    setShowMediaInput(true);
    videoInputRef.current && videoInputRef.current.click();
    setExpanded(true);
  }
  function activateArticle() { setShowArticleTemplates(true); }
  function selectTemplate(tmpl) { setDraft(tmpl.body); setIsArticle(true); setShowArticleTemplates(false); setExpanded(true); }
  function handleVideoUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
    setVideoUrl(url);
    e.target.value = '';
  }
  function cancelAll() {
    setExpanded(false);
    setIsArticle(false);
    setShowArticleTemplates(false);
    setShowMediaInput(false);
    setImageUrl('');
    setPhotoPreviewUrl('');
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    setVideoUrl('');
    setVideoPreviewUrl('');
  }

  if (showArticleTemplates) {
    return (
      <div className="li-card li-post-creator">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <button onClick={() => setShowArticleTemplates(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>?</button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{t('chooseTemplate')}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ARTICLE_TEMPLATES.map(tmpl => (
            <button key={tmpl.id} onClick={() => selectTemplate(tmpl)}
              style={{ background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '14px', cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blue)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{tmpl.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{tmpl.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{tmpl.preview}</div>
            </button>
          ))}
        </div>
        <button onClick={() => setShowArticleTemplates(false)}
          style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, width: '100%', textAlign: 'center' }}>
          {t('cancel')}
        </button>
      </div>
    );
  }

  return (
    <div className="li-card li-post-creator">
      <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoCapture} />
      <input ref={videoInputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoUpload} />

      <div className="li-post-creator__top">
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: user.avatarColor || 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
          {getInitials(user.name || 'Me')}
        </div>
        {!expanded ? (
          <button className="li-post-creator__trigger" onClick={() => setExpanded(true)}>
            {t('startPost')}
          </button>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {isArticle && (
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', background: 'rgba(10,102,194,0.12)', padding: '2px 8px', borderRadius: 10, alignSelf: 'flex-start' }}>
                {t('article')}
              </span>
            )}
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder={isArticle ? t('editTemplate') : t('whatToTalk')}
              maxLength={MAX}
              style={{
                flex: 1, border: '1px solid var(--border)', borderRadius: 8,
                padding: '10px 14px', fontSize: 15, resize: 'none', outline: 'none',
                fontFamily: 'inherit', minHeight: isArticle ? 200 : 80,
                background: 'var(--white)', color: 'var(--text)',
              }}
            />
          </div>
        )}
      </div>
      {expanded && videoUrl && (
        <div style={{ position: 'relative', marginTop: 8 }}>
          <video src={videoUrl} controls style={{ maxHeight: 180, borderRadius: 8, width: '100%', background: '#000' }} />
          <button
            onClick={() => { if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl); setVideoUrl(''); setVideoPreviewUrl(''); }}
            style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', color: '#fff', fontSize: 14, lineHeight: '24px', textAlign: 'center' }}
          >×</button>
        </div>
      )}
      {expanded && !videoUrl.trim() && (imageUrl || photoPreviewUrl) && (
        <img src={photoPreviewUrl || imageUrl} alt="preview" style={{ maxHeight: 180, borderRadius: 8, objectFit: 'cover', width: '100%', marginTop: 4 }}
          onError={e => { e.target.style.display = 'none'; }} />
      )}
      {expanded && showMediaInput && (
        <input
          value={mediaInputType === 'video' ? videoUrl : imageUrl}
          onChange={e => mediaInputType === 'video' ? setVideoUrl(e.target.value) : setImageUrl(e.target.value)}
          placeholder={mediaInputType === 'video' ? t('uploadVideoUrl') : t('pasteImageUrl')}
          style={{
            width: '100%',
            marginTop: 8,
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 14,
            outline: 'none',
            background: 'var(--white)',
            color: 'var(--text)',
            boxSizing: 'border-box',
          }}
        />
      )}
      {expanded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button title={t('photo')} onClick={activatePhoto}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#378FE9"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
              <span>{t('photo')}</span>
            </button>
            <button title={t('video')} onClick={activateVideo}
              style={{ background: showMediaInput && mediaInputType === 'video' ? 'var(--bg)' : 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = showMediaInput && mediaInputType === 'video' ? 'var(--bg)' : 'none'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#5F9B41"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
              <span>{t('video')}</span>
            </button>
            <button title={t('writeArticle')} onClick={activateArticle}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#E06847"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              <span>{t('writeArticle')}</span>
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: MAX - draft.length < 200 ? '#CC1016' : 'var(--text-3)' }}>
              {MAX - draft.length}
            </span>
            <button onClick={cancelAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 14, padding: '4px 8px' }}>{t('cancel')}</button>
            <button
              onClick={submit}
              disabled={(!draft.trim() && !imageUrl.trim() && !videoUrl.trim()) || draft.length > MAX}
              style={{
                background: (draft.trim() || imageUrl.trim() || videoUrl.trim()) && draft.length <= MAX ? 'var(--blue)' : 'var(--border)',
                color: (draft.trim() || imageUrl.trim() || videoUrl.trim()) && draft.length <= MAX ? '#fff' : 'var(--text-3)',
                border: 'none', borderRadius: 20, padding: '8px 22px', fontSize: 14, fontWeight: 600,
                cursor: (draft.trim() || imageUrl.trim() || videoUrl.trim()) && draft.length <= MAX ? 'pointer' : 'not-allowed',
              }}>
              {isArticle ? t('publish') : t('post')}
            </button>
          </div>
        </div>
      )}
      {!expanded && (
        <div className="li-post-creator__actions">
          {[
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#378FE9"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>, label: t('photo'), action: activatePhoto },
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#5F9B41"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>, label: t('video'), action: activateVideo },
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#E06847"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>, label: t('writeArticle'), action: activateArticle },
          ].map(item => (
            <button key={item.label} className="li-post-creator__action" onClick={item.action}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── SponsoredPost ───────────────────────────────────────── */
function SponsoredPost({ ad, showToast, onDismiss }) {
  return (
    <div className="li-post" style={{ padding: '12px 16px' }}>
      <div className="li-post__header">
        <div style={{ width: 48, height: 48, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, background: 'var(--bg)', border: '1px solid var(--border)', flexShrink: 0 }}>
          {ad.logo}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{ad.company}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Sponsored</div>
        </div>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', padding: 4 }}
          onClick={onDismiss}>✕</button>
      </div>
      <div className="li-post__body">
        <p className="li-post__text">{ad.desc}</p>
      </div>
      <div style={{ height: 140, background: ad.bg, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 16px 8px', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', color: '#fff', padding: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{ad.tagline}</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>{ad.company}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{ad.company}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{ad.tagline}</div>
        </div>
        <button onClick={() => navigate(`search?q=${encodeURIComponent(ad.company)}`)}
          style={{ background: 'none', border: '1.5px solid var(--text-2)', color: 'var(--text)', borderRadius: 20, padding: '6px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {ad.cta}
        </button>
      </div>
    </div>
  );
}

/* ── FeedPost ────────────────────────────────────────────── */
function FeedPost({ post, liked, onLike, commentsOpen, onToggleComments, following, onFollow, openModal, showToast, currentUser, onDelete, onHide, onSave, savedPostIds, onRepost }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [reactionHover, setReactionHover] = React.useState(false);
  const reactionTimerRef = React.useRef(null);
  const [localReaction, setLocalReaction] = React.useState(null);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [localComments, setLocalComments] = React.useState(() => {
    const raw = Array.isArray(post.comments) ? post.comments : Array.isArray(post.commentsList) ? post.commentsList : [];
    return raw.map((c, i) => c._localKey ? c : { ...c, _localKey: c.id != null ? String(c.id) : `seed-${i}` });
  });
  const [likedComments, setLikedComments] = React.useState(new Set());
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [replyDraft, setReplyDraft] = React.useState('');
  const [showAllComments, setShowAllComments] = React.useState(false);

  const authorId = post.authorId || (post.author && post.author.id) || 2;
  const authorName = post.author?.name || post.author || post.authorName || 'User';
  const authorTitle = post.author?.headline || post.authorTitle || post.authorHeadline || '';
  const authorColor = post.author?.avatarColor || null;

  const totalReactions = post.likeCount || post.totalReactions ||
    (post.reactions ? Object.values(post.reactions).reduce((a, b) => a + b, 0) : 0);
  const commentCount = localComments.length || post.commentCount || (typeof post.comments === 'number' ? post.comments : 0);
  const repostCount = post.repostCount || post.reposts || 0;

  const reactionLabels = { like: 'Like', celebrate: 'Celebrate', love: 'Love', support: 'Support', insightful: 'Insightful', curious: 'Curious', funny: 'Funny' };
  const reactionEmojiMap = { like: '👍', celebrate: '🎉', love: '❤️', support: '🤝', insightful: '💡', curious: '🤔', funny: '😄' };
  const topReactLabels = post.reactions ? Object.entries(post.reactions).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => reactionEmojiMap[k] || '👍') : [];

  const reactionLabel = localReaction || (liked ? 'Liked' : 'Like');
  const isFollowingAuthor = following && following.has(String(authorId));

  const reactions = [
    { emoji: '👍', name: 'Like', color: '#0F5DBD' },
    { emoji: '❤️', name: 'Love', color: '#CC1016' },
    { emoji: '🎉', name: 'Celebrate', color: '#E7A500' },
    { emoji: '💡', name: 'Insightful', color: '#5F9B41' },
    { emoji: '🤔', name: 'Curious', color: '#E06847' },
    { emoji: '😄', name: 'Funny', color: '#E7A500' },
  ];

  function handleLikeHover() {
    clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => setReactionHover(true), 500);
  }
  function handleLikeLeave() {
    clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = setTimeout(() => setReactionHover(false), 300);
  }
  function selectReaction(r) {
    setLocalReaction(r.name);
    setReactionHover(false);
    onLike();
    showToast(`Reacted with ${r.name}!`, 'success');
  }
  function postComment() {
    if (!commentDraft.trim()) return;
    const u = currentUser || {};
    const text = commentDraft.trim();
    const cid = `c-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    setLocalComments(prev => [{
      id: cid,
      _localKey: cid,
      author: u.name || 'You',
      authorHeadline: u.headline,
      text,
      timestamp: 'Just now',
      likes: 0,
    }, ...prev]);
    setCommentDraft('');
    showToast('Comment posted!');
    API.commentOnPost(post.id, text).catch(() => { showToast('Failed to post comment', 'error'); });
  }

  const content = post.content || '';

  return (
    <div className="li-post" id={`post-${post.id}`}>
      {/* Header */}
      <div className="li-post__header">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
          <div className="li-post__author-photo" style={{ background: authorColor || 'var(--blue)', cursor: 'pointer' }}
            onClick={() => navigate(`profile?id=${authorId}`)}>
            {getInitials(authorName)}
          </div>
          <div className="li-post__author-info">
            <div className="li-post__author-name" onClick={() => navigate(`profile?id=${authorId}`)}>
              {authorName}
              <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 400 }}>· 2nd</span>
            </div>
            {authorTitle && <div className="li-post__author-headline">{authorTitle}</div>}
            <div className="li-post__meta">
              <span className="li-post__timestamp">{formatTime(post.createdAt || post.timestamp)}</span>
              <span className="li-post__privacy">·</span>
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" className="li-post__privacy">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 1.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zM5 7.5a3 3 0 006 0H5z"/>
              </svg>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {!isFollowingAuthor && String(authorId) !== String(currentUser?.id) && (
            <button
              onClick={() => { onFollow(authorId); showToast(`Following ${authorName}`); }}
              style={{ border: '1px solid var(--blue)', color: 'var(--blue)', background: 'none', borderRadius: 20, padding: '5px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Follow
            </button>
          )}
          <div style={{ position: 'relative' }}>
            <button className="li-post__options" onClick={() => setMenuOpen(v => !v)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="li-dropdown" style={{ display: 'block', position: 'absolute', top: '100%', right: 0, minWidth: 200, zIndex: 100 }}>
                {[
                  ...(currentUser && (post.authorId === currentUser.id || post.authorId === String(currentUser.id)) ? ['Delete post'] : []),
                  savedPostIds && savedPostIds.has(String(post.id)) ? 'Unsave post' : 'Save post',
                  'Copy link to post', 'Not interested', 'Report post'
                ].map(label => (
                  <div key={label} className="li-dropdown__item"
                    style={label === 'Delete post' ? { color: 'var(--red)' } : {}}
                    onClick={() => {
                      setMenuOpen(false);
                      if (label === 'Delete post') { onDelete && onDelete(post.id); showToast('Post deleted'); }
                      else if (label === 'Report post') openModal('report', { post });
                      else if (label === 'Copy link to post') {
                        copyLink(`${window.location.origin}${window.location.pathname}#post-${post.id}`, showToast);
                      }
                      else if (label === 'Save post' || label === 'Unsave post') {
                        onSave && onSave(post.id);
                        showToast(label === 'Save post' ? 'Post saved' : 'Post unsaved');
                      }
                      else if (label === 'Not interested') { onHide && onHide(post.id); }
                      else showToast(label);
                    }}>
                    {label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="li-post__body">
        <p className="li-post__text">
          {content.length > 280 ? <TruncatedText text={content} limit={280} /> : content}
        </p>
        {(post.tags || []).length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {post.tags.slice(0, 3).map(t => (
              <span key={t} style={{ fontSize: 13, color: 'var(--blue)', cursor: 'pointer' }}
                onClick={() => navigate(`search?q=${encodeURIComponent('#' + t)}`)}>
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
      {post.videoUrl && (
        <video src={post.videoUrl} controls className="li-post__image" style={{ width: '100%' }} />
      )}
      {!post.videoUrl && post.image && (
        <img src={post.image} alt="" className="li-post__image"
          style={{ cursor: 'zoom-in' }}
          onClick={() => openModal('imageViewer', { src: post.image })} />
      )}
      {post.repostOf && (() => {
        const rp = post.repostOf;
        const rpName = rp.author?.name || rp.authorName || rp.author || 'User';
        const rpHeadline = rp.authorTitle || rp.author?.headline || '';
        const rpContent = rp.content || rp.text || rp.body || '';
        const rpImage = rp.image || rp.imageUrl || rp.image_url || null;
        return (
          <div style={{ margin: '8px 16px', border: '1px solid var(--border)', borderRadius: 8, padding: '12px', background: 'var(--bg)' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Avatar name={rpName} size={32} color={rp.author?.avatarColor} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{rpName}</div>
                {rpHeadline && <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{rpHeadline}</div>}
              </div>
            </div>
            {rpContent && <p style={{ fontSize: 14, lineHeight: 1.5, margin: 0, color: 'var(--text)' }}>{rpContent.length > 200 ? rpContent.slice(0, 200) + '…' : rpContent}</p>}
            {rpImage && <img src={rpImage} alt="" style={{ maxHeight: 180, borderRadius: 6, width: '100%', objectFit: 'cover', marginTop: 8 }} onError={e => { e.target.style.display = 'none'; }} />}
          </div>
        );
      })()}

      {/* Reactions count row */}
      {(totalReactions > 0 || commentCount > 0 || repostCount > 0) && (
        <div className="li-post__reactions">
          <div className="li-post__reaction-icons">
            {topReactLabels.length > 0 && (
              <span style={{ display: 'flex', marginRight: 4 }}>
                {topReactLabels.map((e, i) => (
                  <span key={i} className="li-post__reaction-emoji" style={{ marginLeft: i > 0 ? -4 : 0 }}>{e}</span>
                ))}
              </span>
            )}
            {(totalReactions > 0 || liked) && (
              <span className="li-post__reaction-count">
                {liked ? (totalReactions > 1 ? `You and ${formatNumber(totalReactions - 1)} others` : 'You') : formatNumber(totalReactions)}
              </span>
            )}
          </div>
          <div className="li-post__meta-right">
            {commentCount > 0 && (
              <span className="li-post__comments-count" onClick={onToggleComments}>
                {formatNumber(commentCount)} comment{commentCount !== 1 ? 's' : ''}
              </span>
            )}
            {repostCount > 0 && (
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{formatNumber(repostCount)} reposts</span>
            )}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="li-post__actions">
        {/* Like with reaction picker */}
        <div style={{ position: 'relative', flex: 1 }}>
          <button
            className={`li-post__action${liked ? ' liked' : ''}`}
            style={{ width: '100%' }}
            onMouseEnter={handleLikeHover}
            onMouseLeave={handleLikeLeave}
            onClick={() => { setLocalReaction(null); onLike(); }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill={liked ? 'var(--blue)' : 'none'} stroke={liked ? 'var(--blue)' : 'currentColor'} strokeWidth="1.5">
              <path d="M8 10V20H4V10h4zm4-7a1 1 0 011 1v6h5a2 2 0 011.98 2.22l-1 7A2 2 0 0117 21H8V10l2.95-6.55A1 1 0 0112 3z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{reactionLabel}</span>
          </button>
          {reactionHover && (
            <div
              style={{ position: 'absolute', bottom: '100%', left: 0, display: 'flex', gap: 4, background: 'var(--white)', borderRadius: 24, padding: '6px 10px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 200 }}
              onMouseEnter={() => { clearTimeout(reactionTimerRef.current); setReactionHover(true); }}
              onMouseLeave={() => { reactionTimerRef.current = setTimeout(() => setReactionHover(false), 100); }}>
              {reactions.map(r => (
                <button key={r.name} title={r.name}
                  onClick={() => selectReaction(r)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: '2px 4px', borderRadius: '50%', transition: 'transform 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.4)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {r.emoji || r.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="li-post__action" onClick={onToggleComments} style={{ flex: 1 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Comment</span>
        </button>

        <button className="li-post__action" onClick={() => openModal('share', { post, onRepost })} style={{ flex: 1 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Repost</span>
        </button>

        <button className="li-post__action" onClick={() => copyLink(`${window.location.origin}${window.location.pathname}#post-${post.id}`, showToast)} style={{ flex: 1 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Send</span>
        </button>
      </div>

      {/* Comments */}
      {commentsOpen && (
        <div className="li-post__comments">
          {/* Comment input */}
          <div className="li-post__comment-input-row">
            <div className="li-comment__photo" style={{ background: (currentUser || {}).avatarColor || 'var(--blue)' }}>
              {getInitials((currentUser || {}).name || 'Me')}
            </div>
            <input
              className="li-post__comment-input"
              placeholder="Add a comment…"
              value={commentDraft}
              onChange={e => setCommentDraft(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && postComment()}
            />
            {commentDraft.trim() && (
              <button className="li-btn li-btn--primary li-btn--sm" style={{ borderRadius: 20, flexShrink: 0 }} onClick={postComment}>Post</button>
            )}
          </div>

          {/* Comment list */}
          {localComments.slice(0, showAllComments ? localComments.length : 3).map((c, i) => {
            const authorStr = typeof c.author === 'string' ? c.author : (c.author?.id || c.author?.name || '');
            const cKey = c._localKey || c.id || `${authorStr}-${c.timestamp}-${i}`;
            const cName = c.author?.name || c.authorName || c.author || 'User';
            const cText = c.text || c.content || '';
            const cHeadline = c.author?.headline || c.authorHeadline || '';
            return (
              <div key={cKey} className="li-comment">
                <div className="li-comment__photo" style={{ background: 'var(--blue)' }}>
                  {getInitials(cName)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="li-comment__bubble">
                    <div className="li-comment__author">{cName}</div>
                    {cHeadline && <div className="li-comment__headline">{cHeadline}</div>}
                    <div className="li-comment__text">{cText}</div>
                  </div>
                  <div className="li-comment__actions">
                    {c.timestamp && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{typeof c.timestamp === 'string' ? c.timestamp : formatTime(c.timestamp)}</span>}
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0, color: likedComments.has(cKey) ? 'var(--blue)' : 'var(--text-2)' }}
                      onClick={() => setLikedComments(prev => { const next = new Set(prev); if (next.has(cKey)) next.delete(cKey); else next.add(cKey); return next; })}>
                      {likedComments.has(cKey) ? 'Liked' : 'Like'}
                    </button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, padding: 0 }}
                      onClick={() => setReplyingTo(cKey)}>Reply</button>
                  </div>
                  {replyingTo === cKey && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, marginLeft: 40 }}>
                      <input
                        autoFocus
                        className="li-input"
                        placeholder={`Reply to ${cName}…`}
                        value={replyDraft}
                        onChange={e => setReplyDraft(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && replyDraft.trim()) {
                            const rid = `r-${Date.now()}`; const reply = { id: rid, _localKey: rid, author: currentUser?.name || 'You', text: `@${cName} ${replyDraft.trim()}`, timestamp: 'Just now', likes: 0 };
                            setLocalComments(prev => { const next = [...prev]; next.splice(i + 1, 0, reply); return next; });
                            setReplyDraft(''); setReplyingTo(null);
                          } else if (e.key === 'Escape') { setReplyingTo(null); }
                        }}
                        style={{ flex: 1, fontSize: 12, padding: '4px 8px' }}
                      />
                      <button className="li-btn li-btn--primary" style={{ fontSize: 12, padding: '4px 10px' }}
                        onClick={() => {
                          if (!replyDraft.trim()) return;
                          const rid = `r-${Date.now()}`; const reply = { id: rid, _localKey: rid, author: currentUser?.name || 'You', text: `@${cName} ${replyDraft.trim()}`, timestamp: 'Just now', likes: 0 };
                          setLocalComments(prev => { const next = [...prev]; next.splice(i + 1, 0, reply); return next; });
                          setReplyDraft(''); setReplyingTo(null);
                        }}>Reply</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {localComments.length > 3 && (
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, fontWeight: 600 }}
              onClick={() => setShowAllComments(v => !v)}>
              {showAllComments ? 'Show fewer comments' : `View all ${formatNumber(localComments.length)} comments`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── TruncatedText helper ────────────────────────────────── */
function TruncatedText({ text, limit }) {
  const [expanded, setExpanded] = React.useState(false);
  if (text.length <= limit || expanded) {
    return (
      <>
        {text}
        {expanded && text.length > limit && (
          <> <button className="li-post__see-more" onClick={() => setExpanded(false)}>see less</button></>
        )}
      </>
    );
  }
  return (
    <>
      {text.slice(0, limit)}
      <button className="li-post__see-more" onClick={() => setExpanded(true)}>…see more</button>
    </>
  );
}
