/* ============================================================
   FEEDPAGE.JS — Main feed with post creation and post list
   ============================================================ */
function FeedPage() {
  const { currentUser, likedPosts, toggleLike, openModal, showToast } = React.useContext(AppContext);
  const { data: posts, loading, error, refetch } = useFetch(API.getFeed, []);
  const { data: news } = useFetch(API.getNews, []);
  const { data: hashtags } = useFetch(API.getHashtags, []);
  const { data: readiness } = useFetch(API.getProfileReadiness, []);

  const [expandedComments, setExpandedComments] = React.useState(new Set());
  const [commentText, setCommentText] = React.useState({});

  function toggleComments(postId) {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  }

  if (loading) return <LoadingSpinner text="Loading feed..." />;
  if (error) return (
    <div className="li-page-inner" style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>
      <p>Could not load feed. Make sure the backend is running.</p>
      <p style={{ fontSize: 13, marginTop: 8 }}>{error}</p>
    </div>
  );

  const allPosts = posts || [];
  const userName = currentUser ? currentUser.name : 'You';

  return (
    <div className="li-page-inner">
      <div className="li-feed-layout">

        {/* Left sidebar */}
        <aside className="li-feed-sidebar li-feed-sidebar--left">
          <div className="li-card li-profile-card">
            {currentUser && (
              <>
                <div className="li-profile-card__banner" />
                <div className="li-profile-card__body">
                  <div className="li-profile-card__avatar-wrap">
                    <Avatar name={currentUser.name} size={72} />
                  </div>
                  <div className="li-profile-card__name"
                    onClick={() => navigate('profile')}
                    style={{ cursor: 'pointer' }}>
                    {currentUser.name}
                  </div>
                  <div className="li-profile-card__headline">{currentUser.headline}</div>
                </div>
                <div className="li-profile-card__stats">
                  <div className="li-profile-card__stat"
                    onClick={() => navigate('network')}
                    style={{ cursor: 'pointer' }}>
                    <span className="li-profile-card__stat-label">Connections</span>
                    <span className="li-profile-card__stat-val li-profile-card__stat-val--blue">
                      {currentUser.connectionCount || 0}
                    </span>
                  </div>
                  <div className="li-profile-card__stat">
                    <span className="li-profile-card__stat-label">Profile views</span>
                    <span className="li-profile-card__stat-val li-profile-card__stat-val--blue">
                      {currentUser.profileViews || 0}
                    </span>
                  </div>
                </div>
                <div className="li-profile-card__footer">
                  <button className="li-btn li-btn--ghost li-btn--sm" style={{ width: '100%' }}
                    onClick={() => navigate('premium')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#F5A623" style={{ marginRight: 6 }}>
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    Try Premium for free
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Saved items */}
          <div className="li-card" style={{ padding: '12px 16px', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0' }}
              onClick={() => showToast('Saved items — coming soon')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-2)' }}>
                <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z" />
              </svg>
              <span style={{ fontSize: 14, color: 'var(--text-2)' }}>Saved items</span>
            </div>
          </div>
        </aside>

        {/* Center feed */}
        <div className="li-feed-main">
          {/* Post create box */}
          <div className="li-card li-post-create">
            <div className="li-post-create__row">
              <Avatar name={userName} size={48} />
              <button className="li-post-create__btn" onClick={() => openModal('post')}>
                Start a post
              </button>
            </div>
            <div className="li-post-create__actions">
              <button className="li-post-create__action" onClick={() => showToast('Photo upload — coming soon')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#378FE9"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" /></svg>
                <span>Photo</span>
              </button>
              <button className="li-post-create__action" onClick={() => showToast('Video upload — coming soon')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#5F9B41"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                <span>Video</span>
              </button>
              <button className="li-post-create__action" onClick={() => showToast('Article creation — coming soon')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#E06847"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" /></svg>
                <span>Write article</span>
              </button>
            </div>
          </div>

          {/* Sort bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 4px', padding: '0 2px' }}>
            <span style={{ fontSize: 14, font: 'var(--text-2)' }}>Sort by: <strong>Top</strong></span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--text-2)' }}>
              <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
            </svg>
          </div>

          {/* Posts */}
          {allPosts.map(post => (
            <FeedPost
              key={post.id}
              post={post}
              liked={likedPosts.has(String(post.id))}
              onLike={() => toggleLike(String(post.id))}
              commentsExpanded={expandedComments.has(post.id)}
              onToggleComments={() => toggleComments(post.id)}
              commentText={commentText[post.id] || ''}
              onCommentChange={val => setCommentText(prev => ({ ...prev, [post.id]: val }))}
              onPostComment={() => {
                if (commentText[post.id]?.trim()) {
                  showToast('Comment posted!');
                  setCommentText(prev => ({ ...prev, [post.id]: '' }));
                }
              }}
              onShare={() => openModal('share', { post })}
              onReport={() => openModal('report', { post })}
              showToast={showToast}
            />
          ))}

          {allPosts.length === 0 && (
            <div className="li-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>
              No posts yet. Be the first to share something!
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="li-feed-sidebar li-feed-sidebar--right">
          {/* LinkedIn News */}
          {news && news.length > 0 && (
            <div className="li-card" style={{ padding: '12px 16px', marginBottom: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>LinkedIn News</div>
              {news.slice(0, 5).map((item, i) => (
                <div key={i} style={{ padding: '5px 0', cursor: 'pointer' }}
                  onClick={() => showToast(`${item.title} — coming soon`)}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.timeAgo} • {item.readers} readers</div>
                </div>
              ))}
            </div>
          )}

          {/* Hashtags */}
          {hashtags && hashtags.length > 0 && (
            <div className="li-card" style={{ padding: '12px 16px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Followed Hashtags</div>
              {hashtags.slice(0, 5).map((tag, i) => (
                <div key={i} style={{ fontSize: 14, padding: '4px 0', cursor: 'pointer', color: 'var(--blue)' }}
                  onClick={() => showToast(`#${tag.name} — coming soon`)}>
                  #{tag.name}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ── FeedPost sub-component ───────────────────────────── */
function FeedPost({ post, liked, onLike, commentsExpanded, onToggleComments, commentText, onCommentChange, onPostComment, onShare, onReport, showToast }) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const reactions = [
    { icon: '👍', label: 'Like', color: '#0A66C2' },
    { icon: '❤️', label: 'Love', color: '#CC1016' },
    { icon: '😂', label: 'Funny', color: '#F5A623' },
    { icon: '😮', label: 'Insightful', color: '#057642' },
  ];

  return (
    <div className="li-card li-post" style={{ marginBottom: 8 }}>
      {/* Post header */}
      <div className="li-post__header">
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
          <Avatar name={post.author} size={48} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
              onClick={() => navigate(`profile?id=${post.authorId}`)}>
              {post.author}
            </div>
            {post.authorTitle && (
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{post.authorTitle}</div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {formatTime(post.createdAt)} • 🌐
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="li-btn li-btn--ghost li-btn--sm"
            style={{ padding: '4px 10px', fontSize: 13 }}
            onClick={() => showToast(`Following ${post.author}`)}>
            + Follow
          </button>
          <div style={{ position: 'relative' }}>
            <button className="li-btn li-btn--ghost" style={{ padding: 4 }}
              onClick={() => setMenuOpen(v => !v)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="li-dropdown" style={{ display: 'block', top: '100%', right: 0, minWidth: 180, zIndex: 100 }}>
                <div className="li-dropdown__item" onClick={() => { setMenuOpen(false); showToast('Post saved!'); }}>Save</div>
                <div className="li-dropdown__item" onClick={() => { setMenuOpen(false); onReport(); }}>Report post</div>
                <div className="li-dropdown__item" onClick={() => { setMenuOpen(false); showToast('Post hidden'); }}>Not interested</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post body */}
      <div className="li-post__content">
        <p style={{ fontSize: 14, lineHeight: 1.6 }}>{post.content}</p>
        {post.image && (
          <img src={post.image} alt="" style={{ width: '100%', borderRadius: 4, marginTop: 10, cursor: 'pointer' }}
            onClick={() => showToast('Image viewer — coming soon')} />
        )}
      </div>

      {/* Reaction counts */}
      {(post.likeCount > 0 || post.commentCount > 0) && (
        <div className="li-post__counts">
          {post.likeCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>
              <span>👍</span> {liked ? post.likeCount + 1 : post.likeCount}
            </span>
          )}
          {post.commentCount > 0 && (
            <span style={{ fontSize: 13, color: 'var(--text-2)', cursor: 'pointer', marginLeft: 'auto' }}
              onClick={onToggleComments}>
              {post.commentCount} comments
            </span>
          )}
        </div>
      )}

      <div className="li-post__divider" />

      {/* Action buttons */}
      <div className="li-post__actions">
        <button className={`li-post__action${liked ? ' active' : ''}`} onClick={onLike}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? '#0A66C2' : 'currentColor'}>
            <path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z" />
          </svg>
          Like
        </button>
        <button className="li-post__action" onClick={onToggleComments}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" />
          </svg>
          Comment
        </button>
        <button className="li-post__action" onClick={onShare}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
          </svg>
          Repost
        </button>
        <button className="li-post__action" onClick={() => showToast('Send — coming soon')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
          Send
        </button>
      </div>

      {/* Comments section */}
      {commentsExpanded && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <Avatar name="Me" size={36} />
            <div style={{ flex: 1 }}>
              <input
                className="li-settings-input"
                placeholder="Add a comment…"
                value={commentText}
                onChange={e => onCommentChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onPostComment()}
                style={{ borderRadius: 20, padding: '8px 14px', height: 36 }}
              />
            </div>
          </div>
          {post.comments && post.comments.slice(0, 3).map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <Avatar name={c.author} size={36} />
              <div style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{c.author}</div>
                <div>{c.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
