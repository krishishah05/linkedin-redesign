/* ============================================================
   CONFERENCESPAGE.JS — Conferences map + Snapchat-style stories
   Uses LightMap (zero-dependency OSM tile map, no Leaflet)
   ============================================================ */

function ConferencesPage() {
  const { showToast } = React.useContext(AppContext);
  const [locationQ, setLocationQ] = React.useState('');
  const [fieldQ, setFieldQ] = React.useState('technology');
  const [searchCenter, setSearchCenter] = React.useState(null); // geocoded center for searched location
  const [conferences, setConferences] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [searching, setSearching] = React.useState(false);
  const [stories, setStories] = React.useState([]);
  const [showStoryForm, setShowStoryForm] = React.useState(false);
  const [viewingStoryIdx, setViewingStoryIdx] = React.useState(null); // index into stories[]
  const [storyForm, setStoryForm] = React.useState({
    conferenceName: '', tagline: '', description: '', photoUrl: '', companyLogoUrl: '',
  });
  const [storySubmitting, setStorySubmitting] = React.useState(false);

  // Map center follows selected conf, or first conf with valid coords, or geocoded search center
  const SF_DEFAULT = { lat: 37.7749, lng: -122.4194 };
  function isDefaultCoord(lat, lng) {
    return Math.abs(lat - SF_DEFAULT.lat) < 0.001 && Math.abs(lng - SF_DEFAULT.lng) < 0.001;
  }
  const mapCenter = React.useMemo(() => {
    if (selectedId) {
      const c = conferences.find(x => String(x.id) === String(selectedId));
      if (c && !isDefaultCoord(c.lat, c.lng)) return { lat: c.lat, lng: c.lng };
    }
    const first = conferences.find(c => !isDefaultCoord(c.lat, c.lng));
    if (first) return { lat: first.lat, lng: first.lng };
    if (searchCenter) return searchCenter;
    return SF_DEFAULT;
  }, [selectedId, conferences, searchCenter]);

  const selectedConf = conferences.find(c => String(c.id) === String(selectedId));
  const selectedConfUrl = getSafeHttpUrl(selectedConf?.link);

  // Load stories on mount
  React.useEffect(() => {
    API.getConferenceStories()
      .then(data => setStories(Array.isArray(data) ? data : []))
      .catch(() => { });
  }, []);

  // Geocode a place name → { lat, lng } using OSM Nominatim (free, no key)
  async function geocodePlace(place) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`,
        { headers: { 'Accept-Language': 'en-US', 'User-Agent': 'LinkedInRedesign/1.0 (https://github.com/krishishah05/linkedin-redesign)' } }
      );
      const data = await res.json();
      if (data && data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    } catch (_) { }
    return null;
  }

  async function searchConferences(e) {
    if (e) e.preventDefault();

    const location = locationQ.trim() || "United States";
    const field = fieldQ.trim() || "technology";

    setSearching(true);
    setSelectedId(null);

    try {
      // 1. Get center of searched location
      const geo = await geocodePlace(location);
      setSearchCenter(geo || null);

      // 2. Call the backend; it calls SerpAPI, normalizes results, and falls back if needed.
      const data = await API.searchConferences(location, field);
      const events = Array.isArray(data) ? data : (Array.isArray(data.conferences) ? data.conferences : (data.events_results || []));

      // 3. Use backend-normalized conference data. Geocode only if an older response lacks coordinates.
      const cleaned = await Promise.all(
        events.map(async (event, i) => {
          let coords = null;
          if ((event.lat === undefined || event.lng === undefined) && event.address) {
            coords = await geocodePlace(event.address);
          }

          const fallbackLat = geo?.lat || 37.7749;
          const fallbackLng = geo?.lng || -122.4194;
          const jitter = (i % 5) * 0.008 - 0.016;

          return {
            id: event.id || i + 1,
            name: event.name || event.title,
            category: event.category || field,
            date: typeof event.date === 'string' ? event.date : (event.date?.start_date || "TBD"),
            venue: event.venue || "",
            address: event.address || "Unknown",
            description: event.description || "",
            link: event.link,
            price: event.price,
            attendees: event.attendees || 0,
            lat: Number(event.lat ?? coords?.lat ?? fallbackLat + jitter),
            lng: Number(event.lng ?? coords?.lng ?? fallbackLng + jitter),
            tags: event.tags || [field],
            source: event.source || data.source || "serpapi",
          };
        })
      );

      setConferences(cleaned);
      setSelectedId(cleaned[0]?.id || null);

    } catch (err) {
      showToast("Failed to fetch conferences", "error");
    } finally {
      setSearching(false);
    }
  }

  // Build markers for LightMap
  const mapMarkers = React.useMemo(() => {
    const confMarkers = conferences.map(c => ({
      id: `conf-${c.id}`,
      lat: c.lat,
      lng: c.lng,
      label: (c.category || c.name || 'C').slice(0, 2).toUpperCase(),
      active: String(c.id) === String(selectedId),
      isStory: false,
    }));

    const storyMarkers = stories.flatMap(story => {
      const conf = conferences.find(c => {
        const sn = String(story.conferenceName || '').toLowerCase();
        const cn = String(c.name || '').toLowerCase();
        if (!sn || !cn) return false;
        const firstWord = cn.split(/\s+/)[0];
        const storyFirstWord = sn.split(/\s+/)[0];
        return cn === sn || cn.startsWith(`${sn} `) || sn.startsWith(`${cn} `) || (firstWord && storyFirstWord === firstWord);
      });
      if (!conf) return [];
      const offsets = [0.003, -0.003, 0.002, -0.002, 0.004];
      const idx = stories.indexOf(story);
      return [{
        id: `story-${story.id}`,
        lat: conf.lat + offsets[idx % offsets.length],
        lng: conf.lng + offsets[(idx + 2) % offsets.length],
        label: getInitials(story.author?.name || 'A'),
        active: false,
        isStory: true,
        color: story.author?.avatarColor || '#0F5DBD',
      }];
    });

    return [...confMarkers, ...storyMarkers];
  }, [conferences, selectedId, stories]);

  function onMarkerClick(markerId) {
    if (String(markerId).startsWith('story-')) {
      const storyId = String(markerId).replace('story-', '');
      const idx = stories.findIndex(s => String(s.id) === storyId);
      if (idx >= 0) setViewingStoryIdx(idx);
    } else {
      const confId = String(markerId).replace('conf-', '');
      setSelectedId(prev => String(prev) === confId ? null : confId);
    }
  }

  function handleStorySubmit(e) {
    e.preventDefault();
    if (!storyForm.conferenceName.trim() || !storyForm.tagline.trim() || !storyForm.description.trim()) {
      showToast('Conference name, headline, and takeaways are required.', 'error');
      return;
    }
    setStorySubmitting(true);
    API.createConferenceStory({
      conferenceName: storyForm.conferenceName.trim(),
      tagline: storyForm.tagline.trim(),
      description: storyForm.description.trim(),
      photoUrl: storyForm.photoUrl.trim() || null,
      companyLogoUrl: storyForm.companyLogoUrl.trim() || null,
    })
      .then(story => {
        setStories(prev => [story, ...prev]);
        setShowStoryForm(false);
        setStoryForm({ conferenceName: '', tagline: '', description: '', photoUrl: '', companyLogoUrl: '' });
        showToast('Conference experience shared!', 'success');
      })
      .catch(() => showToast('Failed to share story.', 'error'))
      .finally(() => setStorySubmitting(false));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Search bar ── */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '12px 20px', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 750, margin: 0, color: 'var(--text)' }}>Conferences</h1>
            <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '2px 0 0' }}>
              Search by location and field. Conferences appear on the map with attendee stories.
            </p>
          </div>
          <form onSubmit={searchConferences} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input aria-label="Conference location" value={locationQ} onChange={e => setLocationQ(e.target.value)}
              placeholder="Location" style={confInputStyle} />
            <input aria-label="Conference field or topic" value={fieldQ} onChange={e => setFieldQ(e.target.value)}
              placeholder="Field or topic" style={confInputStyle} />
            <button className="li-btn li-btn--primary li-btn--sm" type="submit" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>
      </div>

      {/* ── Body: sidebar + map ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside style={{ width: 350, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border)', background: 'var(--white)', display: 'flex', flexDirection: 'column' }}>

          {/* Story row */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 750, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Attendee experiences
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {/* Add story ring */}
              <button type="button" onClick={() => setShowStoryForm(true)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#0a66c2,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, fontWeight: 700, border: '2px solid var(--border)' }}>+</div>
                <div style={{ fontSize: 10, color: 'var(--text-2)' }}>Share</div>
              </button>

              {stories.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', paddingTop: 14, paddingLeft: 4 }}>No experiences yet.</div>
              )}

              {stories.map((story, idx) => (
                <button key={story.id} type="button" onClick={() => setViewingStoryIdx(idx)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}>
                  {/* Story ring gradient border */}
                  <div style={{ padding: 2, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ef4444, #a855f7)', display: 'inline-block' }}>
                    <div style={{ background: 'var(--white)', borderRadius: '50%', padding: 2 }}>
                      <Avatar name={story.author?.name || 'Attendee'} size={40} colorOverride={story.author?.avatarColor} />
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', maxWidth: 52, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(story.author?.name || 'Attendee').split(' ')[0]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Conference count */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {searching ? 'Searching...' : `${conferences.length} conference${conferences.length !== 1 ? 's' : ''}`}
            </div>
          </div>

          {/* Conference list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!searching && conferences.length === 0 && (
              <div style={{ padding: 32, color: 'var(--text-2)', fontSize: 14 }}>Search for conferences to see results.</div>
            )}
            {conferences.map(conf => {
              const isActive = String(conf.id) === String(selectedId);
              return (
                <button key={conf.id} type="button"
                  onClick={() => setSelectedId(id => String(id) === String(conf.id) ? null : conf.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '14px 16px', cursor: 'pointer',
                    borderTop: 0, borderRight: 0, borderBottom: '1px solid var(--border)',
                    borderLeft: `3px solid ${isActive ? 'var(--blue)' : 'transparent'}`,
                    background: isActive ? 'var(--blue-light)' : 'var(--white)',
                    font: 'inherit',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 750, color: isActive ? 'var(--blue)' : 'var(--text)', lineHeight: 1.3 }}>{conf.name}</div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', flexShrink: 0 }}>{conf.price || 'See event'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 3 }}>{conf.date}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 7 }}>{conf.venue || conf.address}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(conf.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} style={{ fontSize: 11, background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 6, color: 'var(--text-2)' }}>{tag}</span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Map area */}
        <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <LightMap
            centerLat={mapCenter.lat}
            centerLng={mapCenter.lng}
            zoom={10}
            markers={mapMarkers}
            onMarkerClick={onMarkerClick}
          />

          {/* Selected conference popup */}
          {selectedConf && (
            <div style={{
              position: 'absolute', bottom: 20, right: 20, width: 320, zIndex: 100,
              background: 'var(--white)', borderRadius: 12, padding: 18,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--blue)', background: 'var(--blue-light)', padding: '3px 9px', borderRadius: 8 }}>
                  {selectedConf.category || fieldQ}
                </span>
                <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 750, margin: '0 0 5px', lineHeight: 1.3, color: 'var(--text)' }}>{selectedConf.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 10px', lineHeight: 1.55 }}>{selectedConf.description}</p>
              <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                <span><strong style={{ color: 'var(--text)' }}>{selectedConf.date}</strong></span>
                <span>{selectedConf.address}</span>
                {selectedConf.attendees > 0 && (
                  <span>{Number(selectedConf.attendees).toLocaleString()} expected · <strong>{selectedConf.price || 'See event'}</strong></span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {selectedConfUrl && (
                  <button className="li-btn li-btn--ghost" style={{ flex: 1, fontSize: 13 }} onClick={() => window.open(selectedConfUrl, '_blank', 'noopener,noreferrer')}>
                    View event
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Story form modal ── */}
      {showStoryForm && (
        <ConferenceStoryForm
          conferences={conferences}
          storyForm={storyForm}
          setStoryForm={setStoryForm}
          submitting={storySubmitting}
          onSubmit={handleStorySubmit}
          onClose={() => setShowStoryForm(false)}
        />
      )}

      {/* ── Snapchat-style story viewer ── */}
      {viewingStoryIdx !== null && stories.length > 0 && (
        <SnapStoryViewer
          stories={stories}
          initialIdx={viewingStoryIdx}
          onClose={() => setViewingStoryIdx(null)}
        />
      )}
    </div>
  );
}

/* ── Snapchat-style full-screen story viewer ───────────────── */
function SnapStoryViewer({ stories, initialIdx, onClose }) {
  const [idx, setIdx] = React.useState(initialIdx);
  const [progress, setProgress] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [liked, setLiked] = React.useState(new Set());
  const intervalRef = React.useRef(null);
  const wrapperRef = React.useRef(null);

  React.useEffect(() => { wrapperRef.current?.focus(); }, []);
  const DURATION = 7000; // ms per story
  const TICK = 50;

  const story = stories[idx];

  // Auto-advance timer
  React.useEffect(() => {
    setProgress(0);
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (TICK / DURATION) * 100;
        if (next >= 100) {
          clearInterval(intervalRef.current);
          goNext();
          return 100;
        }
        return next;
      });
    }, TICK);
    return () => clearInterval(intervalRef.current);
  }, [idx, paused]);

  function goNext() {
    if (idx < stories.length - 1) { setIdx(i => i + 1); }
    else { onClose(); }
  }
  function goPrev() {
    if (idx > 0) { setIdx(i => i - 1); }
  }

  function handleTap(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) goPrev();
    else if (x > rect.width * 0.65) goNext();
  }

  const hasPhoto = story.photoUrl && story.photoUrl.startsWith('http');
  const accentColor = story.author?.avatarColor || '#0a66c2';

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 9500,
        background: '#000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') goNext(); if (e.key === 'ArrowLeft') goPrev(); }}
      tabIndex={-1}
    >
      {/* Story card */}
      <div
        style={{
          position: 'relative',
          width: '100%', maxWidth: 420,
          height: '100%', maxHeight: 780,
          borderRadius: 16,
          overflow: 'hidden',
          background: hasPhoto ? '#000' : `linear-gradient(155deg, ${accentColor}cc 0%, #0d1117 60%, #0d1117 100%)`,
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          userSelect: 'none',
        }}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        onClick={handleTap}
      >
        {/* Background photo */}
        {hasPhoto && (
          <>
            <img src={story.photoUrl} alt="" onError={e => { e.target.style.display = 'none'; }}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.75) 70%, rgba(0,0,0,0.92) 100%)' }} />
          </>
        )}

        {/* Progress bars */}
        <div style={{ position: 'absolute', top: 12, left: 12, right: 12, display: 'flex', gap: 4, zIndex: 10 }}>
          {stories.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: '#fff',
                width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%',
                transition: i === idx ? `width ${TICK}ms linear` : 'none',
              }} />
            </div>
          ))}
        </div>

        {/* Top: author + close */}
        <div style={{ position: 'absolute', top: 26, left: 14, right: 14, display: 'flex', alignItems: 'center', gap: 10, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}
            onClick={e => { e.stopPropagation(); if (story.author?.id) { onClose(); navigate(`profile?id=${story.author.id}`); } }}>
            <div style={{ padding: 2, borderRadius: '50%', background: 'linear-gradient(135deg,#f59e0b,#ef4444,#a855f7)', flexShrink: 0 }}>
              <div style={{ background: '#111', borderRadius: '50%', padding: 2 }}>
                <Avatar name={story.author?.name || 'Attendee'} size={34} colorOverride={story.author?.avatarColor} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{story.author?.name || 'Attendee'}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>{story.conferenceName}</div>
            </div>
          </div>
          {story.companyLogoUrl && (
            <img src={story.companyLogoUrl} alt="" style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 6, background: 'rgba(255,255,255,0.1)', padding: 3 }}
              onError={e => { e.target.style.display = 'none'; }} />
          )}
          <button onClick={e => { e.stopPropagation(); onClose(); }}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, backdropFilter: 'blur(4px)' }}>
            ×
          </button>
        </div>

        {/* Content — bottom half */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 20px 24px', zIndex: 10 }}>
          {/* Conference tag */}
          <div style={{ display: 'inline-block', background: `${accentColor}cc`, color: '#fff', fontSize: 11, fontWeight: 750, padding: '4px 10px', borderRadius: 20, marginBottom: 12, backdropFilter: 'blur(6px)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {story.conferenceName}
          </div>

          {/* Tagline */}
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.25, marginBottom: 10, textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
            {story.tagline}
          </div>

          {/* Description */}
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6, marginBottom: 18, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {story.description}
          </div>

          {/* Actions row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={e => { e.stopPropagation(); setLiked(prev => { const n = new Set(prev); n.has(story.id) ? n.delete(story.id) : n.add(story.id); return n; }); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: liked.has(story.id) ? '#ef4444' : 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: 600, padding: '8px 0' }}>
              <span style={{ fontSize: 20 }}>{liked.has(story.id) ? '❤️' : '🤍'}</span>
              {liked.has(story.id) ? 'Liked' : 'Like'}
            </button>
            {/* Story count indicator */}
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              {idx + 1} / {stories.length}
            </div>
          </div>
        </div>

        {/* Tap zones (visual hint) */}
        <div style={{ position: 'absolute', top: 80, bottom: 120, left: 0, width: '35%', zIndex: 5 }} />
        <div style={{ position: 'absolute', top: 80, bottom: 120, right: 0, width: '35%', zIndex: 5 }} />
      </div>

      {/* Prev/Next nav arrows (outside card) */}
      {idx > 0 && (
        <button onClick={e => { e.stopPropagation(); goPrev(); }}
          style={{ position: 'absolute', left: 'max(12px, calc(50% - 230px))', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 22, color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)', zIndex: 10 }}>
          ‹
        </button>
      )}
      {idx < stories.length - 1 && (
        <button onClick={e => { e.stopPropagation(); goNext(); }}
          style={{ position: 'absolute', right: 'max(12px, calc(50% - 230px))', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 22, color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)', zIndex: 10 }}>
          ›
        </button>
      )}
    </div>
  );
}

/* ── Story share form ──────────────────────────────────────── */
function ConferenceStoryForm({ conferences, storyForm, setStoryForm, submitting, onSubmit, onClose }) {
  const formWrapperRef = React.useRef(null);
  React.useEffect(() => { formWrapperRef.current?.focus(); }, []);
  return (
    <div ref={formWrapperRef} tabIndex={-1} onKeyDown={e => { if (e.key === 'Escape') onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', outline: 'none' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--white)', borderRadius: 12, padding: 28, width: 500, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.35)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 750, margin: 0, color: 'var(--text)' }}>Share Your Experience</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '4px 0 0' }}>Your story will appear in the attendee ring.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-3)', lineHeight: 1 }}>×</button>
        </div>
        <form onSubmit={onSubmit}>
          {[
            { label: 'Conference name', key: 'conferenceName', required: true, type: 'text', list: 'conf-datalist', placeholder: 'Select or type a conference' },
            { label: 'Headline', key: 'tagline', required: true, type: 'text', placeholder: 'A concise takeaway from the event', max: 120 },
          ].map(f => (
            <ConferenceField key={f.key} label={f.label} required={f.required}>
              <input type={f.type} list={f.list} value={storyForm[f.key]}
                onChange={e => setStoryForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder} maxLength={f.max}
                style={storyInputStyle} />
              {f.list && <datalist id="conf-datalist">{conferences.map(c => <option key={c.id} value={c.name} />)}</datalist>}
            </ConferenceField>
          ))}
          <ConferenceField label="Key takeaways" required>
            <textarea value={storyForm.description}
              onChange={e => setStoryForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What did you learn? Which talks stood out?"
              rows={4} style={{ ...storyInputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </ConferenceField>
          {[
            { label: 'Photo URL', key: 'photoUrl', placeholder: 'https://... (displayed as story background)' },
            { label: 'Company/conference logo URL', key: 'companyLogoUrl', placeholder: 'https://...' },
          ].map(f => (
            <ConferenceField key={f.key} label={f.label}>
              <input type="url" value={storyForm[f.key]}
                onChange={e => setStoryForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder} style={storyInputStyle} />
            </ConferenceField>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="button" className="li-btn li-btn--ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="li-btn li-btn--primary" style={{ flex: 2 }} disabled={submitting}>
              {submitting ? 'Sharing...' : 'Share experience'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConferenceField({ label, required, children }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <label style={{ fontSize: 13, fontWeight: 650, color: 'var(--text)', display: 'block', marginBottom: 6 }}>
        {label}{required ? ' *' : ''}
      </label>
      {children}
    </div>
  );
}

function getSafeHttpUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const url = new URL(String(rawUrl), window.location.origin);
    return /^https?:$/i.test(url.protocol) ? url.href : '';
  } catch (_) { return ''; }
}

const confInputStyle = {
  width: 180, padding: '8px 10px', border: '1px solid var(--border-2)',
  borderRadius: 6, fontSize: 13, background: 'var(--white)', color: 'var(--text)', outline: 'none',
};

const storyInputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 6,
  border: '1px solid var(--border-2)', fontSize: 14,
  background: 'var(--white)', color: 'var(--text)', boxSizing: 'border-box', outline: 'none',
};
