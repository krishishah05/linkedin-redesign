/* ============================================================
   FEEDPAGE.JS — Main feed (matches original app.js quality)
   ============================================================ */
function FeedPage() {
  const { currentUser, likedPosts, toggleLike, following, follow, openModal, showToast } = React.useContext(AppContext);
  const { data: posts, loading, error } = useFetch(API.getFeed, []);
  const { data: news } = useFetch(API.getNews, []);
  const { data: hashtags } = useFetch(API.getHashtags, []);
  const { data: users } = useFetch(API.getUsers, []);
  const [localPosts, setLocalPosts] = React.useState(null);
  const [feedSort, setFeedSort] = React.useState('Top');
  const [expandedComments, setExpandedComments] = React.useState(new Set());

  React.useEffect(() => { if (posts) setLocalPosts(posts); }, [posts]);

  if (loading) return <LoadingSpinner text="Loading feed..." />;
  if (error) return (
    <div className="li-page-inner" style={{ textAlign: 'center', padding: 60 }}>
      <svg width="48" height="48" viewBox="0 0 48 48" style={{ marginBottom: 12 }}>
        <rect width="48" height="48" rx="8" fill="#0A66C2"/>
        <text x="8" y="36" fontFamily="Georgia,serif" fontSize="30" fontWeight="bold" fill="#fff">in</text>
      </svg>
      <p style={{ color: 'var(--text-2)', marginBottom: 8 }}>Could not load feed. Make sure the backend is running.</p>
      <code style={{ fontSize: 12, color: 'var(--text-3)' }}>{error}</code>
    </div>
  );

  const allPosts = localPosts || [];
  const u = currentUser || {};

  function handleNewPost(content) {
    const newPost = {
      id: Date.now(),
      author: u.name,
      authorId: u.id,
      authorTitle: u.headline,
      content,
      createdAt: Date.now(),
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      comments: [],
    };
    setLocalPosts(prev => [newPost, ...(prev || [])]);
    API.createPost(content).catch(() => {});
    showToast('Post shared! 🎉', 'success');
  }

  function toggleCommentsFor(postId) {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId); else next.add(postId);
      return next;
    });
  }

  const sponsored = [
    { company: 'Stripe', logo: '🟦', desc: 'Join 1M+ businesses using Stripe to accept payments and manage revenue online.', tagline: 'Build the future of payments.', cta: 'Learn more', bg: 'linear-gradient(135deg,#635bff,#32325d)' },
    { company: 'Figma', logo: '🎨', desc: 'The collaborative interface design tool that teams love. Start designing faster today.', tagline: 'Design, prototype, and collaborate.', cta: 'Try for free', bg: 'linear-gradient(135deg,#f24e1e,#ff7262)' },
  ];

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
              <div className="li-profile-card__banner" style={{ background: u.coverGradient || 'linear-gradient(135deg,#0a66c2,#004182)' }}>
                <div className="li-profile-card__photo" style={{ cursor: 'pointer' }} onClick={() => navigate('profile')}>
                  {getInitials(u.name)}
                </div>
              </div>
              <div className="li-profile-card__info">
                <div className="li-profile-card__name" onClick={() => navigate('profile')}>
                  {u.name}
                  {u.isPremium && (
                    <span style={{ background: '#e7a500', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 2, marginLeft: 4, verticalAlign: 'middle' }}>IN</span>
                  )}
                </div>
                <div className="li-profile-card__headline">{(u.headline || '').split('|')[0].trim()}</div>
                {u.location && <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{u.location}</div>}
              </div>
              <div className="li-profile-card__stats">
                <div className="li-profile-card__stat" onClick={() => navigate('profile')}>
                  <span>Profile viewers</span>
                  <span className="li-profile-card__stat-value">{formatNumber(u.profileViews || 0)}</span>
                </div>
                <div className="li-profile-card__stat" onClick={() => navigate('profile')}>
                  <span>Post impressions</span>
                  <span className="li-profile-card__stat-value">{formatNumber(u.postImpressions || 0)}</span>
                </div>
              </div>
              <div className="li-profile-card__premium" onClick={() => navigate('premium')}>
                <span className="li-profile-card__premium-icon">⭐</span>
                <span>Try <strong>Premium</strong> for free</span>
              </div>
              <div className="li-profile-card__links">
                {[
                  { icon: '🔖', label: 'Saved items', action: () => showToast('Saved items — coming soon') },
                  { icon: '👥', label: 'Groups', action: () => navigate('groups') },
                  { icon: '📅', label: 'Events', action: () => navigate('events') },
                ].map(item => (
                  <div key={item.label} className="li-profile-card__link" onClick={item.action}>
                    <span>{item.icon}</span>{item.label}
                  </div>
                ))}
              </div>
              <div style={{ padding: '8px 16px 12px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => navigate('network')}>
                  Discover more <span>›</span>
                </span>
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
            />
            {/* Sponsored posts interspersed */}
            {(i === 1 || i === 3) && (
              <SponsoredPost key={`ad-${i}`} ad={sponsored[i === 1 ? 0 : 1]} showToast={showToast} />
            )}
          </React.Fragment>
        ))}

        {allPosts.length === 0 && (
          <div className="li-card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📰</div>
            No posts yet. Be the first to share something!
          </div>
        )}
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <aside className="li-sidebar-right">
        {/* LinkedIn News */}
        {allNews.length > 0 && (
          <div className="li-card" style={{ padding: '12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 8px', fontWeight: 700, fontSize: 15 }}>
              LinkedIn News
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" style={{ cursor: 'pointer', color: 'var(--text-2)' }}
                onClick={() => showToast('News details — coming soon')}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div style={{ padding: '0 16px 6px', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Top stories</div>
            {allNews.slice(0, 5).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 16px', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
                onClick={() => showToast(`${item.title || item.headline} — opening...`)}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text)', flexShrink: 0, marginTop: 6 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{item.title || item.headline}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {[item.timeAgo, item.readers ? item.readers + ' readers' : null].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', cursor: 'pointer' }}
              onClick={() => showToast('Loading more news...')}>
              Show more
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </div>
          </div>
        )}

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

        {/* Trending hashtags */}
        {allTags.length > 0 && (
          <div className="li-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>🔥</span> Trending for you
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {allTags.slice(0, 10).map(tag => {
                const label = '#' + (tag.name || tag);
                return (
                  <button key={label} onClick={() => navigate(`search?q=${encodeURIComponent(label)}`)}
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: 'var(--blue)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#EAF4FF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '4px 0 20px', fontSize: 11, color: 'var(--text-2)', lineHeight: 2.2 }}>
          {['About', 'Accessibility', 'Help Center', 'Privacy & Terms', 'Ad Choices', 'Business Services'].map(l => (
            <a key={l} href="#" style={{ color: 'var(--text-2)', textDecoration: 'none', marginRight: 8 }}
              onMouseOver={e => e.target.style.textDecoration = 'underline'}
              onMouseOut={e => e.target.style.textDecoration = 'none'}
              onClick={e => e.preventDefault()}>
              {l}
            </a>
          ))}
          <div style={{ marginTop: 8, color: 'var(--text-3)' }}>LinkedIn Corporation © 2026</div>
        </div>
      </aside>
    </div>
  );
}

/* ── PostCreator ─────────────────────────────────────────── */
function PostCreator({ user, onPost, openModal, showToast }) {
  const [draft, setDraft] = React.useState('');
  const [expanded, setExpanded] = React.useState(false);
  const MAX = 3000;

  function submit() {
    if (!draft.trim()) return;
    onPost(draft.trim());
    setDraft('');
    setExpanded(false);
  }

  return (
    <div className="li-card li-post-creator">
      <div className="li-post-creator__top">
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: user.avatarColor || 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
          {getInitials(user.name || 'Me')}
        </div>
        {!expanded ? (
          <button className="li-post-creator__trigger" onClick={() => setExpanded(true)}>
            Start a post
          </button>
        ) : (
          <textarea
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="What do you want to talk about?"
            maxLength={MAX}
            style={{
              flex: 1, border: '1px solid var(--border)', borderRadius: 8,
              padding: '10px 14px', fontSize: 15, resize: 'none', outline: 'none',
              fontFamily: 'inherit', minHeight: 80, background: 'var(--white)', color: 'var(--text)',
            }}
          />
        )}
      </div>
      {expanded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[['🖼️','Photo'],['🎬','Video'],['📅','Event'],['📄','Article']].map(([icon, label]) => (
              <button key={label} title={label}
                onClick={() => { if (label === 'Event') navigate('events'); else showToast(`${label} upload — coming soon`); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <span style={{ fontSize: 18 }}>{icon}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: MAX - draft.length < 200 ? '#CC1016' : 'var(--text-3)' }}>
              {MAX - draft.length}
            </span>
            <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 14, padding: '4px 8px' }}>Cancel</button>
            <button
              onClick={submit}
              disabled={!draft.trim() || draft.length > MAX}
              style={{
                background: draft.trim() && draft.length <= MAX ? 'var(--blue)' : 'var(--border)',
                color: draft.trim() && draft.length <= MAX ? '#fff' : 'var(--text-3)',
                border: 'none', borderRadius: 20, padding: '8px 22px', fontSize: 14, fontWeight: 600,
                cursor: draft.trim() && draft.length <= MAX ? 'pointer' : 'not-allowed',
              }}>
              Post
            </button>
          </div>
        </div>
      )}
      {!expanded && (
        <div className="li-post-creator__actions">
          {[
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#378FE9"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>, label: 'Photo', action: () => setExpanded(true) },
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#5F9B41"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>, label: 'Video', action: () => setExpanded(true) },
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#E06847"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>, label: 'Event', action: () => navigate('events') },
            { icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="#E06847"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>, label: 'Write article', action: () => showToast('Article editor — coming soon') },
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
function SponsoredPost({ ad, showToast }) {
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
          onClick={() => showToast('Ad hidden')}>✕</button>
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
        <button onClick={() => showToast(`Opening ${ad.company}...`)}
          style={{ background: 'none', border: '1.5px solid var(--text-2)', color: 'var(--text)', borderRadius: 20, padding: '6px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {ad.cta}
        </button>
      </div>
    </div>
  );
}

/* ── FeedPost ────────────────────────────────────────────── */
function FeedPost({ post, liked, onLike, commentsOpen, onToggleComments, following, onFollow, openModal, showToast, currentUser }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [reactionHover, setReactionHover] = React.useState(false);
  const [reactionTimer, setReactionTimer] = React.useState(null);
  const [localReaction, setLocalReaction] = React.useState(null);
  const [commentDraft, setCommentDraft] = React.useState('');
  const [localComments, setLocalComments] = React.useState(post.comments || post.commentsList || []);

  const authorId = post.authorId || (post.author && post.author.id) || 2;
  const authorName = post.author?.name || post.author || post.authorName || 'User';
  const authorTitle = post.author?.headline || post.authorTitle || post.authorHeadline || '';
  const authorColor = post.author?.avatarColor || null;

  const totalReactions = post.likeCount || post.totalReactions ||
    (post.reactions ? Object.values(post.reactions).reduce((a, b) => a + b, 0) : 0);
  const commentCount = post.commentCount || (typeof post.comments === 'number' ? post.comments : (post.commentsList?.length || 0));
  const repostCount = post.repostCount || post.reposts || 0;

  const reactionEmojis = { like: '👍', celebrate: '🎉', love: '❤️', support: '🤝', insightful: '💡', curious: '🤔', funny: '😄' };
  const topReactEmojis = post.reactions ? Object.entries(post.reactions).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => reactionEmojis[k] || '👍') : [];

  const reactionLabel = localReaction || (liked ? 'Liked' : 'Like');
  const isFollowingAuthor = following && following.has(String(authorId));

  const reactions = [
    { emoji: '👍', name: 'Like', color: '#0A66C2' },
    { emoji: '❤️', name: 'Love', color: '#CC1016' },
    { emoji: '🎉', name: 'Celebrate', color: '#E7A500' },
    { emoji: '💡', name: 'Insightful', color: '#5F9B41' },
    { emoji: '🤔', name: 'Curious', color: '#E06847' },
    { emoji: '😄', name: 'Funny', color: '#E7A500' },
  ];

  function handleLikeHover() {
    const t = setTimeout(() => setReactionHover(true), 500);
    setReactionTimer(t);
  }
  function handleLikeLeave() {
    if (reactionTimer) clearTimeout(reactionTimer);
    setTimeout(() => setReactionHover(false), 300);
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
    setLocalComments(prev => [{
      author: u.name || 'You',
      authorHeadline: u.headline,
      text: commentDraft.trim(),
      timestamp: 'Just now',
      likes: 0,
    }, ...prev]);
    setCommentDraft('');
    showToast('Comment posted!');
  }

  const content = post.content || '';

  return (
    <div className="li-post">
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
          {!isFollowingAuthor && (
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
                {['Save post', 'Copy link to post', 'Not interested', 'Report post'].map(label => (
                  <div key={label} className="li-dropdown__item"
                    onClick={() => {
                      setMenuOpen(false);
                      if (label === 'Report post') openModal('report', { post });
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
      {post.image && (
        <img src={post.image} alt="" className="li-post__image"
          onClick={() => showToast('Image viewer — coming soon')} />
      )}

      {/* Reactions count row */}
      {(totalReactions > 0 || commentCount > 0 || repostCount > 0) && (
        <div className="li-post__reactions">
          <div className="li-post__reaction-icons" onClick={() => showToast('Reactions — coming soon')} style={{ cursor: 'pointer' }}>
            {topReactEmojis.length > 0 && (
              <span style={{ display: 'flex', marginRight: 4 }}>
                {topReactEmojis.map((e, i) => (
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
              onMouseEnter={() => { if (reactionTimer) clearTimeout(reactionTimer); setReactionHover(true); }}
              onMouseLeave={() => setReactionHover(false)}>
              {reactions.map(r => (
                <button key={r.name} title={r.name}
                  onClick={() => selectReaction(r)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: '2px 4px', borderRadius: '50%', transition: 'transform 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.4)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                  {r.emoji}
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

        <button className="li-post__action" onClick={() => openModal('share', { post })} style={{ flex: 1 }}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Repost</span>
        </button>

        <button className="li-post__action" onClick={() => showToast('Link copied!')} style={{ flex: 1 }}>
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
          {localComments.slice(0, 3).map((c, i) => {
            const cName = c.author?.name || c.authorName || c.author || 'User';
            const cText = c.text || c.content || '';
            const cHeadline = c.author?.headline || c.authorHeadline || '';
            return (
              <div key={i} className="li-comment">
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
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, padding: 0 }}
                      onClick={() => showToast('Liked comment!')}>Like</button>
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 12, fontWeight: 600, padding: 0 }}
                      onClick={() => showToast('Reply — coming soon')}>Reply</button>
                  </div>
                </div>
              </div>
            );
          })}
          {commentCount > 3 && (
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: 13, fontWeight: 600 }}
              onClick={() => showToast('Loading all comments...')}>
              View all {formatNumber(commentCount)} comments
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
