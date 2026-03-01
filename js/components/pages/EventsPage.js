/* ============================================================
   EVENTSPAGE.JS — Events listing
   ============================================================ */
function EventsPage() {
  const { openModal, showToast } = React.useContext(AppContext);
  const { data: events, loading, error } = useFetch(API.getEvents, []);
  const [tab, setTab] = React.useState('all');
  const [attending, setAttending] = React.useState(() => new Set());
  const [interested, setInterested] = React.useState(() => new Set());

  // Seed from API on first load
  React.useEffect(() => {
    if (events && events.length > 0) {
      const att = new Set(events.filter(e => e.isAttending).map(e => e.id));
      const int_ = new Set(events.filter(e => e.isInterested).map(e => e.id));
      if (att.size > 0) setAttending(att);
      if (int_.size > 0) setInterested(int_);
    }
  }, [events]);

  if (loading) return <LoadingSpinner text="Loading events..." />;
  if (error) return <ErrorMessage message={error} />;

  const allEvents = events || [];

  const shown = tab === 'attending'
    ? allEvents.filter(e => attending.has(e.id))
    : tab === 'interested'
      ? allEvents.filter(e => interested.has(e.id))
      : allEvents;

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="li-page-inner" style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Events</h1>
        <button className="li-btn li-btn--primary li-btn--sm" onClick={() => openModal('create-event')}>
          + Create event
        </button>
      </div>

      {/* Tabs */}
      <div className="li-card" style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {['All', 'Attending', 'Interested'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t.toLowerCase())}
              style={{
                padding: '14px 20px', fontSize: 14, fontWeight: 600,
                color: tab === t.toLowerCase() ? 'var(--text)' : 'var(--text-2)',
                background: 'none', border: 'none',
                borderBottom: tab === t.toLowerCase() ? '2px solid var(--text)' : '2px solid transparent',
                cursor: 'pointer', marginBottom: -1,
              }}
            >
              {t}
              {t === 'Attending' && attending.size > 0 && (
                <span style={{ marginLeft: 6, background: 'var(--blue)', color: '#fff', fontSize: 11, borderRadius: 10, padding: '1px 6px' }}>
                  {attending.size}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Events list */}
      {shown.length === 0 ? (
        <div className="li-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>No events here yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shown.map(event => (
            <div key={event.id} className="li-card" style={{ padding: 20, display: 'flex', gap: 16 }}>
              {/* Date box */}
              <div style={{
                width: 56, height: 56, flexShrink: 0, borderRadius: 8,
                background: '#EAF4FF', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase' }}>
                  {event.date ? new Date(event.date).toLocaleString('en-US', { month: 'short' }) : 'TBD'}
                </span>
                <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>
                  {event.date ? new Date(event.date).getDate() : '—'}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{event.title}</h3>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
                  {formatDate(event.date)}{event.time ? ' · ' + event.time : ''} · {event.isVirtual ? 'Online' : (event.location || event.type || 'In-person')}
                </div>
                {event.organizer && (
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>
                    Organized by {event.organizer}
                  </div>
                )}
                {event.attendees > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12 }}>
                    {formatNumber(event.attendees)} attendees
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className={attending.has(event.id) ? 'li-btn li-btn--primary li-btn--sm' : 'li-btn li-btn--outline li-btn--sm'}
                    onClick={() => {
                      setAttending(prev => {
                        const next = new Set(prev);
                        if (next.has(event.id)) { next.delete(event.id); showToast('Removed from attending'); }
                        else { next.add(event.id); showToast('Marked as attending!'); }
                        return next;
                      });
                    }}
                  >
                    {attending.has(event.id) ? '✓ Attending' : 'Attend'}
                  </button>
                  <button
                    className="li-btn li-btn--ghost li-btn--sm"
                    onClick={() => {
                      setInterested(prev => {
                        const next = new Set(prev);
                        if (next.has(event.id)) next.delete(event.id);
                        else { next.add(event.id); showToast('Marked as interested!'); }
                        return next;
                      });
                    }}
                  >
                    {interested.has(event.id) ? '★ Interested' : '☆ Interested'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
