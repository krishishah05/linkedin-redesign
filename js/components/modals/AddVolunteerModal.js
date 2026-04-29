/* ============================================================
   ADDVOLUNTEERMODAL.JS — Add or edit a volunteering entry
   ============================================================ */
function AddVolunteerModal() {
  const { closeModal, setCurrentUser, showToast, modalData } = React.useContext(AppContext);

  const isEditing = !!(modalData && modalData.entry);
  const editEntry = isEditing ? modalData.entry : null;
  const editIndex = isEditing ? modalData.index : null;

  function parseParts(dateStr) {
    if (!dateStr || dateStr === 'Present') return { month: 'January', year: String(new Date().getFullYear()) };
    const parts = dateStr.split(' ');
    return { month: parts[0] || 'January', year: parts[1] || String(new Date().getFullYear()) };
  }

  const startParts = parseParts(editEntry?.startDate);
  const endParts   = parseParts(editEntry?.endDate);

  const [saving, setSaving] = React.useState(false);
  const [ongoing, setOngoing] = React.useState(
    isEditing ? (editEntry.endDate === 'Present' || !editEntry.endDate) : true
  );
  const [form, setForm] = React.useState({
    role:         editEntry?.role         || '',
    organization: editEntry?.organization || '',
    cause:        editEntry?.cause        || '',
    description:  editEntry?.description  || '',
    startMonth:   startParts.month,
    startYear:    startParts.year,
    endMonth:     endParts.month,
    endYear:      endParts.year,
  });

  function update(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function handleSave() {
    if (!form.role || !form.organization) { showToast('Role and organization are required', 'error'); return; }
    if (saving) return;
    setSaving(true);
    const entry = {
      role: form.role, organization: form.organization, cause: form.cause,
      startDate: `${form.startMonth} ${form.startYear}`,
      endDate: ongoing ? 'Present' : (`${form.endMonth} ${form.endYear}`.trim() || editEntry?.endDate || ''),
      description: form.description,
    };
    const call = isEditing ? API.updateVolunteering(editIndex, entry) : API.addVolunteering(entry);
    call
      .then(updated => {
        setCurrentUser(updated);
        showToast(isEditing ? 'Volunteering updated!' : 'Volunteering experience added!', 'success');
        closeModal();
      })
      .catch(() => { showToast('Failed to save volunteering experience', 'error'); setSaving(false); });
  }

  const causes = [
    'Animal Welfare', 'Arts & Culture', 'Children', 'Civil Rights & Social Action',
    'Economic Empowerment', 'Education', 'Environment', 'Health', 'Human Rights',
    'Politics', 'Poverty Alleviation', 'Science & Technology', 'Social Services',
  ];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years  = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i));
  const inputStyle = { width: '100%', boxSizing: 'border-box' };

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal li-modal--lg">
        <div className="li-modal__header">
          <span className="li-modal__title">{isEditing ? 'Edit volunteering' : 'Add volunteering experience'}</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>* indicates required fields</p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Role *</label>
            <input className="li-settings-input" style={inputStyle} placeholder="Ex: Volunteer Coordinator" value={form.role} onChange={e => update('role', e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Organization *</label>
            <input className="li-settings-input" style={inputStyle} placeholder="Ex: Red Cross" value={form.organization} onChange={e => update('organization', e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Cause</label>
            <select className="li-settings-input" style={inputStyle} value={form.cause} onChange={e => update('cause', e.target.value)}>
              <option value="">Select a cause</option>
              {causes.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" style={{ accentColor: '#0F5DBD' }} checked={ongoing} onChange={e => setOngoing(e.target.checked)} />
            I currently volunteer here
          </label>
          <div className="li-settings-form-row">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Start date</label>
              <select className="li-settings-input" style={inputStyle} value={form.startMonth} onChange={e => update('startMonth', e.target.value)}>
                {months.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>&nbsp;</label>
              <select className="li-settings-input" style={inputStyle} value={form.startYear} onChange={e => update('startYear', e.target.value)}>
                {years.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          {!ongoing && (
            <div className="li-settings-form-row">
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>End date</label>
                <select className="li-settings-input" style={inputStyle} value={form.endMonth} onChange={e => update('endMonth', e.target.value)}>
                  {months.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>&nbsp;</label>
                <select className="li-settings-input" style={inputStyle} value={form.endYear} onChange={e => update('endYear', e.target.value)}>
                  {years.map(y => <option key={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              style={{ width: '100%', height: 100, border: '1px solid var(--border-2)', borderRadius: 4, padding: 10, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              placeholder="Describe your responsibilities and impact..."
              value={form.description} onChange={e => update('description', e.target.value)}
            />
          </div>
        </div>
        <div className="li-modal__footer">
          <button className="li-btn li-btn--ghost li-btn--sm" onClick={closeModal}>Cancel</button>
          <button className="li-btn li-btn--primary li-btn--sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
