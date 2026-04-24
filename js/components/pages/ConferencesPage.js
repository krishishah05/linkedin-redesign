/* ============================================================
   CONFERENCESPAGE.JS — Discover conferences near you
   Leaflet.js + OpenStreetMap — no API key required
   ============================================================ */
function ConferencesPage() {
  const { showToast } = React.useContext(AppContext);
  const mapContainerRef = React.useRef(null);
  const leafletMap = React.useRef(null);
  const markerRefs = React.useRef({});

  const [selectedId, setSelectedId] = React.useState(null);
  const [activeFilter, setActiveFilter] = React.useState('All');
  const [mapReady, setMapReady] = React.useState(false);
  const [registeredIds, setRegisteredIds] = React.useState(new Set());

  const CATEGORIES = ['All', 'AI/ML', 'Web Dev', 'Design', 'Cloud', 'Data', 'Security'];

  const CAT_COLORS = {
    'AI/ML':    '#8B5CF6',
    'Web Dev':  '#0EA5E9',
    'Design':   '#F59E0B',
    'Cloud':    '#10B981',
    'Data':     '#EF4444',
    'Security': '#6366F1',
  };

  const CONFERENCES = [
    { id: 1,  name: 'AI Summit SF 2026',     category: 'AI/ML',    date: 'May 12–13, 2026',  venue: 'Moscone West',              address: 'Howard St, San Francisco, CA',        lat: 37.7841, lng: -122.4001, description: 'The premier AI & ML conference for practitioners and researchers. Featuring keynotes, workshops, and hands-on labs with the latest LLMs and MLOps tools.', attendees: 4200,  price: '$499',   tags: ['Deep Learning', 'LLMs', 'MLOps'] },
    { id: 2,  name: 'React Summit West',     category: 'Web Dev',  date: 'May 22–23, 2026',  venue: 'Fort Mason Center',          address: 'Marina Blvd, San Francisco, CA',      lat: 37.8063, lng: -122.4336, description: 'The largest React & Next.js conference on the West Coast with speakers from Meta, Vercel, Shopify, and more.', attendees: 2800,  price: '$299',   tags: ['React', 'Next.js', 'TypeScript'] },
    { id: 3,  name: 'Config Design 2026',    category: 'Design',   date: 'Jun 4–5, 2026',    venue: 'Bill Graham Auditorium',     address: 'Civic Center Plaza, SF, CA',          lat: 37.7779, lng: -122.4171, description: "Figma's annual conference bringing together product designers and engineers to explore the future of design systems.", attendees: 5000,  price: '$349',   tags: ['UX', 'Figma', 'Design Systems'] },
    { id: 4,  name: 'Google Cloud Next',     category: 'Cloud',    date: 'Jun 10–12, 2026',  venue: 'Moscone South',             address: 'Howard St, San Francisco, CA',        lat: 37.7836, lng: -122.3998, description: "Google's flagship cloud and AI developer conference with 500+ sessions on GCP, AI/ML, and developer tooling.", attendees: 30000, price: '$1,299', tags: ['GCP', 'Kubernetes', 'BigQuery'] },
    { id: 5,  name: 'PyData Bay Area',       category: 'Data',     date: 'May 30, 2026',     venue: 'LinkedIn HQ',               address: 'W Maude Ave, Sunnyvale, CA',          lat: 37.3688, lng: -122.0363, description: 'Community meetup for Python data practitioners covering analytics, machine learning, and open-source tooling.', attendees: 800,   price: 'Free',   tags: ['Python', 'Pandas', 'Visualization'] },
    { id: 6,  name: 'BSides SF Security',    category: 'Security', date: 'Jun 7–8, 2026',    venue: "Marines' Memorial Club",    address: 'Sutter St, San Francisco, CA',        lat: 37.7895, lng: -122.4087, description: 'Community-organized security conference covering offensive security, AppSec, cloud security, and live CTF challenges.', attendees: 1200, price: '$50',    tags: ['CTF', 'Pentesting', 'AppSec'] },
    { id: 7,  name: 'AWS Builders Day',      category: 'Cloud',    date: 'Jul 14–15, 2026',  venue: 'Oracle Park',               address: 'Willie Mays Plaza, San Francisco',    lat: 37.7786, lng: -122.3893, description: 'AWS architecture best practices, serverless deep dives, and hands-on builders sessions for every experience level.', attendees: 8500, price: '$699',   tags: ['AWS', 'Serverless', 'DevOps'] },
    { id: 8,  name: 'Strata Data + AI',      category: 'Data',     date: 'Jun 24–26, 2026',  venue: 'Hyatt Regency SF',          address: 'Embarcadero, San Francisco, CA',      lat: 37.7951, lng: -122.3969, description: 'Enterprise data and AI strategy conference with expert tutorials, case studies, and networking for data leaders.', attendees: 3500, price: '$799',   tags: ['Data Eng', 'AI Strategy', 'Spark'] },
    { id: 9,  name: 'WWDC Hackathon',        category: 'Web Dev',  date: 'Jun 9, 2026',      venue: 'Computer History Museum',   address: 'Shoreline Blvd, Mountain View, CA',  lat: 37.4141, lng: -122.0769, description: "Community hackathon and WWDC viewing party. Build apps, compete for prizes, and meet Apple platform developers.", attendees: 400,   price: 'Free',   tags: ['iOS', 'Swift', 'Xcode'] },
    { id: 10, name: 'UX Research Summit',    category: 'Design',   date: 'Jul 8–9, 2026',    venue: 'Yerba Buena Center',        address: 'Mission St, San Francisco, CA',       lat: 37.7830, lng: -122.4038, description: 'Deep-dive workshops on user research methods, usability testing, and design thinking from global UX leaders.', attendees: 950,   price: '$249',   tags: ['User Research', 'Usability', 'UX'] },
    { id: 11, name: 'MLOps World SF',        category: 'AI/ML',    date: 'Jul 22–23, 2026',  venue: 'Bespoke SF',               address: 'Market St, San Francisco, CA',        lat: 37.7851, lng: -122.4071, description: 'Production ML infrastructure: feature stores, model monitoring, CI/CD for ML, and real-world MLOps case studies.', attendees: 1600, price: '$399',   tags: ['MLOps', 'Feature Stores', 'Monitoring'] },
    { id: 12, name: 'GitHub Universe',       category: 'Web Dev',  date: 'Oct 28–29, 2026',  venue: 'Palace of Fine Arts',       address: 'Lyon St, San Francisco, CA',          lat: 37.8028, lng: -122.4483, description: "GitHub's annual developer conference — open source, AI-assisted coding with Copilot, and the future of software development.", attendees: 7000, price: '$599', tags: ['GitHub', 'Open Source', 'Copilot'] },
  ];

  const filtered = activeFilter === 'All' ? CONFERENCES : CONFERENCES.filter(c => c.category === activeFilter);
  const selectedConf = CONFERENCES.find(c => c.id === selectedId);

  /* ── Init Leaflet map ──────────────────────────────────────── */
  React.useEffect(() => {
    let attempts = 0;
    function tryInit() {
      if (!window.L) {
        if (attempts++ < 30) setTimeout(tryInit, 200);
        return;
      }
      if (!mapContainerRef.current || leafletMap.current) return;

      const L = window.L;
      const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([37.7749, -122.4194], 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      CONFERENCES.forEach(conf => {
        const color = CAT_COLORS[conf.category] || '#0a66c2';
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            width:38px;height:38px;border-radius:50%;
            background:${color};border:3px solid #fff;
            box-shadow:0 3px 10px rgba(0,0,0,0.28);
            display:flex;align-items:center;justify-content:center;
            cursor:pointer;transition:transform 0.15s,box-shadow 0.15s;
          " onmouseover="this.style.transform='scale(1.18)';this.style.boxShadow='0 5px 16px rgba(0,0,0,0.38)'"
             onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 3px 10px rgba(0,0,0,0.28)'">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="white">
              <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/>
            </svg>
          </div>`,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        });

        const marker = L.marker([conf.lat, conf.lng], { icon })
          .addTo(map)
          .bindTooltip(`<b>${conf.name}</b><br><small>${conf.date}</small>`, {
            direction: 'top', offset: [0, -20], className: 'leaflet-conf-tooltip',
          });

        marker.on('click', () => setSelectedId(id => id === conf.id ? null : conf.id));
        markerRefs.current[conf.id] = marker;
      });

      leafletMap.current = map;
      setMapReady(true);
    }
    tryInit();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
        markerRefs.current = {};
      }
    };
  }, []);

  /* ── Fly to selected conference ────────────────────────────── */
  React.useEffect(() => {
    if (!leafletMap.current || !selectedId) return;
    const conf = CONFERENCES.find(c => c.id === selectedId);
    if (conf) leafletMap.current.flyTo([conf.lat, conf.lng], 13, { duration: 0.7 });
  }, [selectedId]);

  /* ── Filter markers visibility ─────────────────────────────── */
  React.useEffect(() => {
    if (!leafletMap.current || !window.L) return;
    CONFERENCES.forEach(conf => {
      const marker = markerRefs.current[conf.id];
      if (!marker) return;
      if (activeFilter === 'All' || conf.category === activeFilter) {
        marker.getElement() && (marker.getElement().style.display = '');
      } else {
        marker.getElement() && (marker.getElement().style.display = 'none');
      }
    });
  }, [activeFilter, mapReady]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 52px)', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border)', padding: '10px 20px', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => navigate('feed')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
              Back
            </button>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Conferences Near You
              </h1>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0 }}>
                San Francisco Bay Area · {filtered.length} upcoming event{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {/* Category filter pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => {
              const color = CAT_COLORS[cat] || 'var(--blue)';
              const active = activeFilter === cat;
              return (
                <button key={cat} onClick={() => setActiveFilter(cat)} style={{
                  padding: '4px 12px', borderRadius: 16,
                  border: `1.5px solid ${active ? color : 'var(--border)'}`,
                  background: active ? color : 'transparent',
                  color: active ? '#fff' : 'var(--text-2)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s',
                }}>
                  {cat !== 'All' && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: active ? '#fff' : color, marginRight: 5, verticalAlign: 'middle' }} />}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Split body ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar list */}
        <div style={{ width: 360, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border)', background: 'var(--white)' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>No conferences in this category</div>
            </div>
          )}
          {filtered.map(conf => {
            const color = CAT_COLORS[conf.category] || '#0a66c2';
            const isActive = conf.id === selectedId;
            const isReg = registeredIds.has(conf.id);
            return (
              <div key={conf.id}
                onClick={() => setSelectedId(id => id === conf.id ? null : conf.id)}
                style={{
                  padding: '14px 16px', cursor: 'pointer',
                  borderLeft: `4px solid ${isActive ? color : 'transparent'}`,
                  background: isActive ? color + '0A' : 'transparent',
                  borderBottom: '1px solid var(--border)', transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color, background: color + '18',
                    padding: '2px 8px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    {conf.category}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: conf.price === 'Free' ? '#057642' : 'var(--text-2)' }}>
                    {conf.price}
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3, lineHeight: 1.3 }}>{conf.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
                  {conf.date}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  {conf.venue}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>👥 {conf.attendees.toLocaleString()}</span>
                  {conf.tags.slice(0, 2).map(t => (
                    <span key={t} style={{ fontSize: 11, background: 'var(--bg-2)', padding: '1px 6px', borderRadius: 6, color: 'var(--text-2)' }}>{t}</span>
                  ))}
                  {isReg && <span style={{ fontSize: 11, color: '#057642', fontWeight: 700, marginLeft: 'auto' }}>✓ Registered</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Map */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

          {!mapReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', zIndex: 5 }}>
              <LoadingSpinner text="Loading map..." />
            </div>
          )}

          {/* Category legend */}
          <div style={{
            position: 'absolute', top: 12, left: 12, zIndex: 999,
            background: 'var(--white)', borderRadius: 10, padding: '10px 14px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.14)', border: '1px solid var(--border)',
            minWidth: 120,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: 0.6 }}>Categories</div>
            {Object.entries(CAT_COLORS).map(([cat, color]) => (
              <div key={cat} onClick={() => setActiveFilter(a => a === cat ? 'All' : cat)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, cursor: 'pointer' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: activeFilter === cat ? 'var(--text)' : 'var(--text-2)', fontWeight: activeFilter === cat ? 700 : 400 }}>{cat}</span>
              </div>
            ))}
          </div>

          {/* Selected conference popup */}
          {selectedConf && (
            <div style={{
              position: 'absolute', bottom: 20, right: 20, width: 310, zIndex: 1000,
              background: 'var(--white)', borderRadius: 14, padding: '18px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)', border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
                  color: CAT_COLORS[selectedConf.category],
                  background: CAT_COLORS[selectedConf.category] + '18',
                  padding: '3px 9px', borderRadius: 8,
                }}>
                  {selectedConf.category}
                </span>
                <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 22, lineHeight: 1, padding: 0 }}>×</button>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', lineHeight: 1.3 }}>{selectedConf.name}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.6 }}>{selectedConf.description}</p>
              <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={CAT_COLORS[selectedConf.category]}><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>
                  <strong>{selectedConf.date}</strong>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={CAT_COLORS[selectedConf.category]}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                  {selectedConf.address}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={CAT_COLORS[selectedConf.category]}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                  {selectedConf.attendees.toLocaleString()} expected · <strong style={{ marginLeft: 2 }}>{selectedConf.price}</strong>
                </span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
                {selectedConf.tags.map(t => (
                  <span key={t} style={{ fontSize: 11, background: 'var(--bg-2)', padding: '3px 8px', borderRadius: 8, color: 'var(--text-2)' }}>{t}</span>
                ))}
              </div>
              {registeredIds.has(selectedConf.id) ? (
                <div style={{ textAlign: 'center', padding: '9px 0', color: '#057642', fontWeight: 700, fontSize: 13, background: '#E6F4EA', borderRadius: 8 }}>
                  ✓ You're registered!
                </div>
              ) : (
                <button
                  className="li-btn li-btn--primary"
                  style={{ width: '100%', fontSize: 13, padding: '9px 16px' }}
                  onClick={() => {
                    setRegisteredIds(prev => new Set([...prev, selectedConf.id]));
                    showToast(`Registered for ${selectedConf.name}! 🎉`, 'success');
                  }}
                >
                  Register — {selectedConf.price}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
