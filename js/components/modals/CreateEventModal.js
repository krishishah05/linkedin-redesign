/* ============================================================
   CREATEEVENTMODAL.JS — Create a new event
   ============================================================ */
function CreateEventModal() {
  const { closeModal, currentUser, showToast } = React.useContext(AppContext);
  const [eventType, setEventType] = React.useState('online');
  const [form, setForm] = React.useState({
    name: '',
    organizer: currentUser ? currentUser.name : '',
    startDate: '', startTime: '',
    endDate: '', endTime: '',
    description: '',
  });

  function update(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleCreate() {
    if (!form.name.trim()) { showToast('Event name is required', 'error'); return; }
    if (!form.organizer.trim()) { showToast('Organizer is required', 'error'); return; }
    if (!form.startDate) { showToast('Start date is required', 'error'); return; }
    if (!form.startTime) { showToast('Start time is required', 'error'); return; }
    if (!form.endDate) { showToast('End date is required', 'error'); return; }
    if (!form.endTime) { showToast('End time is required', 'error'); return; }
    if (form.endDate < form.startDate) { showToast('End date must be after start date', 'error'); return; }
    if (form.endDate === form.startDate && form.endTime <= form.startTime) { showToast('End time must be after start time', 'error'); return; }
    API.createEvent({ ...form, type: eventType }).then(() => {
      showToast('Event created!');
      closeModal();
      navigate('events');
    }).catch(() => {
      showToast('Failed to create event', 'error');
    });
  }

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal li-modal--lg">
        <div className="li-modal__header">
          <span className="li-modal__title">Create an event</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          {/* Online / In-person toggle */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[
              { id: 'online',    label: 'Online' },
              { id: 'in-person', label: 'In person' },
            ].map(opt => (
              <button
                key={opt.id}
                style={{
                  flex: 1, padding: 12,
                  border: eventType === opt.id ? '2px solid var(--blue)' : '1px solid var(--border)',
                  borderRadius: 8,
                  background: eventType === opt.id ? 'var(--blue-light)' : 'var(--white)',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  color: eventType === opt.id ? 'var(--blue)' : 'var(--text-2)',
                }}
                onClick={() => setEventType(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Event name *</label>
            <input className="li-settings-input" placeholder="Enter event name" value={form.name} onChange={e => update('name', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Organizer *</label>
            <input className="li-settings-input" value={form.organizer} onChange={e => update('organizer', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div className="li-settings-form-row">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Start date *</label>
              <input type="date" className="li-settings-input" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Start time *</label>
              <input type="time" className="li-settings-input" value={form.startTime} onChange={e => update('startTime', e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div className="li-settings-form-row">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>End date *</label>
              <input type="date" className="li-settings-input" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>End time *</label>
              <input type="time" className="li-settings-input" value={form.endTime} onChange={e => update('endTime', e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              style={{ width: '100%', height: 100, border: '1px solid var(--border-2)', borderRadius: 4, padding: 10, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              placeholder="Tell people more about your event..."
              value={form.description}
              onChange={e => update('description', e.target.value)}
            />
          </div>
        </div>
        <div className="li-modal__footer">
          <button className="li-btn li-btn--ghost li-btn--sm" onClick={closeModal}>Cancel</button>
          <button className="li-btn li-btn--primary li-btn--sm" onClick={handleCreate}>Create event</button>
        </div>
      </div>
    </div>
  );
}
