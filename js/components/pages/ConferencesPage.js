/* ============================================================
   CONFERENCESPAGE.JS - Search conferences and view attendee stories
   ============================================================ */

function ConferencesPage() {
  const { showToast } = React.useContext(AppContext);
  const mapContainerRef = React.useRef(null);
  const leafletMap = React.useRef(null);
  const conferenceMarkers = React.useRef([]);
  const storyMarkers = React.useRef([]);

  const [locationQ, setLocationQ] = React.useState('San Francisco, CA');
  const [fieldQ, setFieldQ] = React.useState('technology');
  const [conferences, setConferences] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [mapReady, setMapReady] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [registeredIds, setRegisteredIds] = React.useState(new Set());
  const [stories, setStories] = React.useState([]);
  const [showStoryForm, setShowStoryForm] = React.useState(false);
  const [viewingStory, setViewingStory] = React.useState(null);
  const [storyForm, setStoryForm] = React.useState({
    conferenceName: '', tagline: '', description: '', photoUrl: '', companyLogoUrl: '',
  });
  const [storySubmitting, setStorySubmitting] = React.useState(false);

  const selectedConf = conferences.find(c => String(c.id) === String(selectedId));
  const selectedConfUrl = getSafeHttpUrl(selectedConf && selectedConf.link);

  React.useEffect(() => {
    API.getConferenceStories()
      .then(data => setStories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    let attempts = 0;
    function tryInit() {
      if (!window.L) {
        if (attempts++ < 30) setTimeout(tryInit, 200);
        return;
      }
      if (!mapContainerRef.current || leafletMap.current) return;
      const map = window.L.map(mapContainerRef.current, { zoomControl: true }).setView([37.7749, -122.4194], 11);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      leafletMap.current = map;
      setMapReady(true);
    }
    tryInit();
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    searchConferences();
  }, []);

  React.useEffect(() => {
    if (!mapReady) return;
    renderMarkers();
  }, [mapReady, conferences, stories, selectedId]);

  function searchConferences(e) {
    if (e) e.preventDefault();
    const location = locationQ.trim() || 'San Francisco, CA';
    const field = fieldQ.trim() || 'technology';
    setSearching(true);
    API.searchConferences(location, field)
      .then(items => {
        const cleanItems = (Array.isArray(items) ? items : []).map((item, index) => ({
          ...item,
          id: item.id || index + 1,
          lat: Number(item.lat) || 37.7749,
          lng: Number(item.lng) || -122.4194,
          tags: Array.isArray(item.tags) ? item.tags : [],
        }));
        setConferences(cleanItems);
        setSelectedId(cleanItems[0]?.id || null);
      })
      .catch(() => showToast('Could not load conferences. Showing saved results when available.', 'error'))
      .finally(() => setSearching(false));
  }

  function renderMarkers() {
    const L = window.L;
    const map = leafletMap.current;
    if (!L || !map) return;

    conferenceMarkers.current.forEach(marker => map.removeLayer(marker));
    storyMarkers.current.forEach(marker => map.removeLayer(marker));
    conferenceMarkers.current = [];
    storyMarkers.current = [];

    const bounds = [];
    conferences.forEach(conf => {
      const marker = L.marker([conf.lat, conf.lng], { icon: conferenceIcon(conf, String(conf.id) === String(selectedId)) })
        .addTo(map)
        .bindTooltip(`<b>${escapeHtml(conf.name)}</b><br><small>${escapeHtml(conf.date || '')}</small>`, {
          direction: 'top',
          offset: [0, -18],
        });
      marker.on('click', () => setSelectedId(id => String(id) === String(conf.id) ? null : conf.id));
      conferenceMarkers.current.push(marker);
      bounds.push([conf.lat, conf.lng]);

      storiesForConference(conf).forEach((story, index) => {
        const offset = storyOffset(index);
        const storyMarker = L.marker([conf.lat + offset.lat, conf.lng + offset.lng], { icon: storyIcon(story) })
          .addTo(map)
          .bindTooltip(`<b>${escapeHtml(story.author?.name || 'Attendee')}</b><br><small>${escapeHtml(story.conferenceName || conf.name)}</small>`, {
            direction: 'top',
            offset: [0, -14],
          });
        storyMarker.on('click', () => setViewingStory(story));
        storyMarkers.current.push(storyMarker);
        bounds.push([conf.lat + offset.lat, conf.lng + offset.lng]);
      });
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
}

function getSafeHttpUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const url = new URL(String(rawUrl), window.location.origin);
    return /^https?:$/i.test(url.protocol) ? url.href : '';
  } catch (_) {
    return '';
  }
}

function conferenceIcon(conf, active) {
    const color = active ? '#0a66c2' : '#344054';
    return window.L.divIcon({
      className: '',
      html: `<div style="width:34px;height:34px;border-radius:8px;background:${color};border:2px solid #fff;box-shadow:0 3px 10px rgba(0,0,0,0.28);display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:800;">${escapeHtml((conf.category || 'C').slice(0, 2).toUpperCase())}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });
  }

  function storyIcon(story) {
    const name = story.author?.name || 'Attendee';
    const initials = getInitials(name);
    const color = story.author?.avatarColor || '#0F5DBD';
    return window.L.divIcon({
      className: '',
      html: `<div style="width:30px;height:30px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:800;">${escapeHtml(initials)}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  }

  function storiesForConference(conf) {
    return stories.filter(story => {
      const storyName = String(story.conferenceName || '').toLowerCase();
      const confName = String(conf.name || '').toLowerCase();
      return storyName && (confName.includes(storyName) || storyName.includes(confName.split(' ')[0]));
    }).slice(0, 5);
  }

  function storyOffset(index) {
    const offsets = [
      { lat: 0.003, lng: 0.002 },
      { lat: -0.003, lng: 0.002 },
      { lat: 0.002, lng: -0.003 },
      { lat: -0.002, lng: -0.003 },
      { lat: 0.004, lng: 0 },
    ];
    return offsets[index % offsets.length];
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
        showToast('Conference experience shared.', 'success');
      })
      .catch(() => showToast('Failed to share story.', 'error'))
      .finally(() => setStorySubmitting(false));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '12px 20px', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 750, margin: 0 }}>Conferences</h1>
            <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '2px 0 0' }}>
              Search by location and field, then explore events and attendee experiences on the map.
            </p>
          </div>
          <form onSubmit={searchConferences} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={locationQ}
              onChange={e => setLocationQ(e.target.value)}
              placeholder="Location"
              style={conferenceInputStyle}
            />
            <input
              value={fieldQ}
              onChange={e => setFieldQ(e.target.value)}
              placeholder="Field or topic"
              style={conferenceInputStyle}
            />
            <button className="li-btn li-btn--primary li-btn--sm" type="submit" disabled={searching}>
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <aside style={{ width: 370, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border)', background: 'var(--white)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, fontWeight: 750, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
              Attendee experiences
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {stories.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', paddingTop: 4 }}>
                  No experiences yet. Share the first one.
                </div>
              )}
              {stories.map(story => (
                <button key={story.id} type="button" onClick={() => setViewingStory(story)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', flexShrink: 0, border: 'none', background: 'none', padding: 0, font: 'inherit' }}
                  aria-label={`Open ${story.author ? story.author.name : 'attendee'} conference story`}>
                  <Avatar name={story.author ? story.author.name : 'Attendee'} size={48} colorOverride={story.author ? story.author.avatarColor : undefined} />
                  <div style={{ fontSize: 10, color: 'var(--text-2)', maxWidth: 58, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {story.author ? story.author.name.split(' ')[0] : 'Attendee'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{conferences.length} conference{conferences.length !== 1 ? 's' : ''}</div>
            <button data-testid="share-conference-story-btn" type="button" className="li-btn li-btn--ghost li-btn--sm" onClick={() => setShowStoryForm(true)}>
              Share experience
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {conferences.length === 0 && (
              <div style={{ padding: 32, color: 'var(--text-2)', fontSize: 14 }}>Search for conferences to see results.</div>
            )}
            {conferences.map(conf => {
              const isActive = String(conf.id) === String(selectedId);
              const isRegistered = registeredIds.has(String(conf.id));
              return (
                <button key={conf.id} type="button" onClick={() => setSelectedId(id => String(id) === String(conf.id) ? null : conf.id)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '15px 16px', cursor: 'pointer',
                    borderTop: 0, borderRight: 0, borderBottom: '1px solid var(--border)',
                    borderLeft: `3px solid ${isActive ? 'var(--blue)' : 'transparent'}`,
                    background: isActive ? '#EAF4FF' : 'var(--white)',
                    font: 'inherit',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                    <div style={{ fontSize: 14, fontWeight: 750, color: isActive ? 'var(--blue)' : 'var(--text)', lineHeight: 1.3 }}>{conf.name}</div>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{conf.price || 'See event'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 5 }}>{conf.date}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>{conf.venue || conf.address}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(conf.tags || []).slice(0, 3).map(tag => (
                      <span key={tag} style={{ fontSize: 11, background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 6, color: 'var(--text-2)' }}>{tag}</span>
                    ))}
                    {isRegistered && <span style={{ fontSize: 11, color: '#057642', fontWeight: 750, marginLeft: 'auto' }}>Registered</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          {!mapReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', zIndex: 5 }}>
              <LoadingSpinner text="Loading map..." />
            </div>
          )}

          {selectedConf && (
            <div style={{
              position: 'absolute', bottom: 20, right: 20, width: 330, zIndex: 1000,
              background: 'var(--white)', borderRadius: 10, padding: 18,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 750, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--blue)', background: '#EAF4FF', padding: '3px 9px', borderRadius: 8 }}>
                  {selectedConf.category || fieldQ}
                </span>
                <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 22, lineHeight: 1, padding: 0 }}>x</button>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 750, margin: '0 0 6px', lineHeight: 1.3 }}>{selectedConf.name}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.55 }}>{selectedConf.description}</p>
              <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                <span><strong>{selectedConf.date}</strong></span>
                <span>{selectedConf.address}</span>
                <span>{selectedConf.attendees ? `${Number(selectedConf.attendees).toLocaleString()} expected | ` : ''}<strong>{selectedConf.price || 'See event'}</strong></span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {registeredIds.has(String(selectedConf.id)) ? (
                  <div style={{ flex: 1, textAlign: 'center', padding: '9px 0', color: '#057642', fontWeight: 750, fontSize: 13, background: '#E6F4EA', borderRadius: 8 }}>
                    Registered
                  </div>
                ) : (
                  <button className="li-btn li-btn--primary" style={{ flex: 1, fontSize: 13, padding: '9px 16px' }} onClick={() => {
                    setRegisteredIds(prev => new Set([...prev, String(selectedConf.id)]));
                    showToast(`Registered for ${selectedConf.name}.`, 'success');
                  }}>
                    Register
                  </button>
                )}
                {selectedConfUrl && (
                  <button className="li-btn li-btn--ghost" style={{ flex: 1, fontSize: 13, padding: '9px 16px' }} onClick={() => window.open(selectedConfUrl, '_blank', 'noopener,noreferrer')}>
                    View event
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

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

      {viewingStory && (
        <ConferenceStoryViewer story={viewingStory} onClose={() => setViewingStory(null)} />
      )}
    </div>
  );
}

const conferenceInputStyle = {
  width: 190,
  padding: '8px 10px',
  border: '1px solid var(--border-2)',
  borderRadius: 6,
  fontSize: 13,
  background: 'var(--white)',
  color: 'var(--text)',
  outline: 'none',
};

function ConferenceStoryForm({ conferences, storyForm, setStoryForm, submitting, onSubmit, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--white)', borderRadius: 10, padding: 28, width: 500, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 750, margin: 0 }}>Share Your Experience</h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '4px 0 0' }}>Add a short reflection from a conference you attended.</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-3)', lineHeight: 1 }}>x</button>
        </div>

        <form onSubmit={onSubmit}>
          <ConferenceField label="Conference name" required>
            <input type="text" list="conf-list" value={storyForm.conferenceName}
              onChange={e => setStoryForm(f => ({ ...f, conferenceName: e.target.value }))}
              placeholder="Select or type a conference"
              style={storyInputStyle} />
            <datalist id="conf-list">
              {conferences.map(c => <option key={c.id} value={c.name} />)}
            </datalist>
          </ConferenceField>

          <ConferenceField label="Headline" required>
            <input type="text" value={storyForm.tagline}
              onChange={e => setStoryForm(f => ({ ...f, tagline: e.target.value }))}
              placeholder="A concise takeaway from the event"
              maxLength={120}
              style={storyInputStyle} />
          </ConferenceField>

          <ConferenceField label="Key takeaways" required>
            <textarea value={storyForm.description}
              onChange={e => setStoryForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What did you learn? Which talks or conversations stood out?"
              rows={4}
              style={{ ...storyInputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          </ConferenceField>

          <ConferenceField label="Photo URL">
            <input type="url" value={storyForm.photoUrl}
              onChange={e => setStoryForm(f => ({ ...f, photoUrl: e.target.value }))}
              placeholder="https://..."
              style={storyInputStyle} />
          </ConferenceField>

          <ConferenceField label="Company or conference logo URL">
            <input type="url" value={storyForm.companyLogoUrl}
              onChange={e => setStoryForm(f => ({ ...f, companyLogoUrl: e.target.value }))}
              placeholder="https://..."
              style={storyInputStyle} />
          </ConferenceField>

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

const storyInputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 6,
  border: '1px solid var(--border-2)',
  fontSize: 14,
  background: 'var(--white)',
  color: 'var(--text)',
  boxSizing: 'border-box',
  outline: 'none',
};

function ConferenceStoryViewer({ story, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9100, background: 'rgba(0,0,0,0.86)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ position: 'relative', width: 390, maxWidth: '95vw', background: 'var(--white)', borderRadius: 10, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}>
        {story.photoUrl && (
          <img src={story.photoUrl} alt="" style={{ width: '100%', height: 210, objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
        )}
        <div style={{ padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Avatar name={story.author ? story.author.name : 'Attendee'} size={40} colorOverride={story.author ? story.author.avatarColor : undefined} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 750, color: 'var(--text)' }}>{story.author ? story.author.name : 'Attendee'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{story.conferenceName}</div>
            </div>
            {story.companyLogoUrl && (
              <img src={story.companyLogoUrl} alt="" style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, background: 'var(--bg-2)', padding: 3, marginLeft: 'auto' }}
                onError={e => { e.target.style.display = 'none'; }} />
            )}
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.25, margin: '0 0 12px' }}>{story.tagline}</h3>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>{story.description}</p>
        </div>
        <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>x</button>
      </div>
    </div>
  );
}
