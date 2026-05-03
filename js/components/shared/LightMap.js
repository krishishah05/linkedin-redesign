/* ============================================================
   LIGHTMAP.JS — Zero-dependency tile map using OpenStreetMap
   No Leaflet, no external library. Uses plain <img> tiles +
   React state. Drag to pan, +/- to zoom, click markers.
   ============================================================ */

const TILE_SIZE = 256;

// Convert lat/lng → fractional tile coordinates at zoom level z
function _latLngToTile(lat, lng, z) {
  const n = Math.pow(2, z);
  const x = (lng + 180) / 360 * n;
  const latRad = lat * Math.PI / 180;
  const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n;
  return { x, y };
}

function LightMap({ centerLat = 37.7749, centerLng = -122.4194, zoom = 11, markers = [], onMarkerClick = () => {} }) {
  const containerRef = React.useRef(null);
  const [size, setSize] = React.useState({ w: 800, h: 500 });
  const [drag, setDrag] = React.useState({ px: 0, py: 0 }); // accumulated pixel offset from drags
  const [currentZoom, setCurrentZoom] = React.useState(zoom);
  const [attribution, setAttribution] = React.useState(false);
  const isDragging = React.useRef(false);
  const lastMouse = React.useRef(null);
  const moved = React.useRef(false); // distinguish click vs drag

  // Reset drag offset when center prop changes (new search)
  const prevCenter = React.useRef({ lat: centerLat, lng: centerLng });
  React.useEffect(() => {
    if (prevCenter.current.lat !== centerLat || prevCenter.current.lng !== centerLng) {
      setDrag({ px: 0, py: 0 });
      prevCenter.current = { lat: centerLat, lng: centerLng };
    }
  }, [centerLat, centerLng]);

  // Observe container size
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth || 800, h: el.clientHeight || 500 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sync zoom prop changes from outside
  React.useEffect(() => { setCurrentZoom(zoom); }, [zoom]);

  // Fractional tile coords of the visual center (base + drag)
  const centerTile = React.useMemo(() => {
    const base = _latLngToTile(centerLat, centerLng, currentZoom);
    return {
      x: base.x - drag.px / TILE_SIZE,
      y: base.y - drag.py / TILE_SIZE,
    };
  }, [centerLat, centerLng, currentZoom, drag]);

  // Build the tile grid
  const tiles = React.useMemo(() => {
    const { w, h } = size;
    const cx = centerTile.x;
    const cy = centerTile.y;
    const maxTile = Math.pow(2, currentZoom);
    const halfX = Math.ceil(w / TILE_SIZE / 2) + 1;
    const halfY = Math.ceil(h / TILE_SIZE / 2) + 1;
    const result = [];
    for (let dy = -halfY; dy <= halfY; dy++) {
      for (let dx = -halfX; dx <= halfX; dx++) {
        const tx = Math.floor(cx) + dx;
        const ty = Math.floor(cy) + dy;
        if (ty < 0 || ty >= maxTile) continue;
        const wtx = ((tx % maxTile) + maxTile) % maxTile;
        result.push({
          key: `${currentZoom}/${wtx}/${ty}`,
          url: `https://tile.openstreetmap.org/${currentZoom}/${wtx}/${ty}.png`,
          left: Math.round((tx - cx) * TILE_SIZE + w / 2),
          top:  Math.round((ty - cy) * TILE_SIZE + h / 2),
        });
      }
    }
    return result;
  }, [centerTile, currentZoom, size]);

  // Convert a lat/lng to a pixel position on screen
  function toScreen(lat, lng) {
    const t = _latLngToTile(lat, lng, currentZoom);
    return {
      x: Math.round((t.x - centerTile.x) * TILE_SIZE + size.w / 2),
      y: Math.round((t.y - centerTile.y) * TILE_SIZE + size.h / 2),
    };
  }

  // ── Mouse / touch drag handlers ──────────────────────────────
  function onPointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    isDragging.current = true;
    moved.current = false;
    const client = e.touches ? e.touches[0] : e;
    lastMouse.current = { x: client.clientX, y: client.clientY };
    e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!isDragging.current) return;
    const client = e.touches ? e.touches[0] : e;
    const dx = client.clientX - lastMouse.current.x;
    const dy = client.clientY - lastMouse.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved.current = true;
    lastMouse.current = { x: client.clientX, y: client.clientY };
    setDrag(prev => ({ px: prev.px + dx, py: prev.py + dy }));
  }

  function onPointerUp() {
    isDragging.current = false;
  }

  function zoomBy(delta) {
    setCurrentZoom(z => Math.max(3, Math.min(18, z + delta)));
    setDrag({ px: 0, py: 0 });
  }

  // Double-click: zoom in centered on click position
  function onDoubleClick(e) {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    // Offset so the clicked point becomes the new center
    const offsetX = clickX - size.w / 2;
    const offsetY = clickY - size.h / 2;
    setDrag(prev => ({ px: prev.px - offsetX / 2, py: prev.py - offsetY / 2 }));
    setCurrentZoom(z => Math.min(18, z + 1));
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#e8e0d8', touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onDoubleClick={onDoubleClick}
    >
      {/* Tile images */}
      {tiles.map(tile => (
        <img
          key={tile.key}
          src={tile.url}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: 'absolute',
            left: tile.left,
            top: tile.top,
            width: TILE_SIZE,
            height: TILE_SIZE,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      ))}

      {/* Cursor overlay (so pointer isn't blocked by tile imgs) */}
      <div style={{
        position: 'absolute', inset: 0,
        cursor: isDragging.current ? 'grabbing' : 'grab',
        pointerEvents: 'none',
      }} />

      {/* Markers */}
      {markers.map(m => {
        const pos = toScreen(m.lat, m.lng);
        // Skip off-screen markers (with margin)
        if (pos.x < -60 || pos.x > size.w + 60 || pos.y < -60 || pos.y > size.h + 60) return null;
        return (
          <button
            key={m.id}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); if (!moved.current) onMarkerClick(m.id); }}
            title={m.label}
            style={{
              position: 'absolute',
              left: pos.x - 18,
              top: pos.y - 18,
              width: 36,
              height: 36,
              borderRadius: m.isStory ? '50%' : 9,
              background: m.active ? '#0a66c2' : m.isStory ? (m.color || '#0F5DBD') : '#344054',
              border: `2px solid ${m.active ? '#fff' : 'rgba(255,255,255,0.85)'}`,
              boxShadow: m.active ? '0 0 0 3px rgba(10,102,194,0.35), 0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
              fontSize: m.isStory ? 11 : 12,
              fontWeight: 800,
              cursor: 'pointer',
              zIndex: m.active ? 20 : 10,
              transition: 'transform 0.15s, box-shadow 0.15s',
              transform: m.active ? 'scale(1.18)' : 'scale(1)',
              lineHeight: 1,
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            {m.label}
          </button>
        );
      })}

      {/* Zoom controls */}
      <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', flexDirection: 'column', gap: 2, zIndex: 30 }}>
        {[{ d: 1, label: '+' }, { d: -1, label: '−' }].map(({ d, label }) => (
          <button
            key={label}
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); zoomBy(d); }}
            style={{
              width: 32, height: 32, background: 'white', border: '1px solid rgba(0,0,0,0.18)',
              borderRadius: 6, fontSize: 20, lineHeight: 1, cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.18)', color: '#333', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* OSM Attribution (required by tile usage policy) */}
      <div
        onClick={() => setAttribution(v => !v)}
        style={{
          position: 'absolute', bottom: 4, right: 4, fontSize: 10,
          background: 'rgba(255,255,255,0.75)', padding: '2px 5px',
          borderRadius: 3, color: '#555', cursor: 'pointer', zIndex: 30,
          userSelect: 'none',
        }}
      >
        {attribution
          ? '© OpenStreetMap contributors'
          : '© OSM'}
      </div>
    </div>
  );
}
