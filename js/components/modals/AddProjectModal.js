/* ============================================================
   ADDPROJECTMODAL.JS — Add or edit a project entry
   ============================================================ */
function AddProjectModal() {
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
    name:        editEntry?.name        || '',
    description: editEntry?.description || '',
    url:         editEntry?.url         || '',
    startMonth:  startParts.month,
    startYear:   startParts.year,
    endMonth:    endParts.month,
    endYear:     endParts.year,
    skills:      editEntry?.skills      || '',
  });

  function update(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function handleSave() {
    if (!form.name) { showToast('Project name is required', 'error'); return; }
    if (saving) return;
    setSaving(true);
    const entry = {
      name: form.name, description: form.description, url: form.url,
      startDate: `${form.startMonth} ${form.startYear}`,
      endDate: ongoing ? 'Present' : (`${form.endMonth} ${form.endYear}`.trim() || editEntry?.endDate || ''),
      skills: form.skills,
    };
    const call = isEditing ? API.updateProject(editIndex, entry) : API.addProject(entry);
    call
      .then(updated => {
        setCurrentUser(updated);
        showToast(isEditing ? 'Project updated!' : 'Project added!', 'success');
        closeModal();
      })
      .catch(() => { showToast('Failed to save project', 'error'); setSaving(false); });
  }

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years  = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i));
  const inputStyle = { width: '100%', boxSizing: 'border-box' };

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal li-modal--lg">
        <div className="li-modal__header">
          <span className="li-modal__title">{isEditing ? 'Edit project' : 'Add project'}</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>* indicates required fields</p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Project name *</label>
            <input className="li-settings-input" style={inputStyle} placeholder="Ex: E-commerce Platform" value={form.name} onChange={e => update('name', e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              style={{ width: '100%', height: 100, border: '1px solid var(--border-2)', borderRadius: 4, padding: 10, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              placeholder="Describe the project and your role..."
              value={form.description} onChange={e => update('description', e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Project URL</label>
            <input className="li-settings-input" style={inputStyle} placeholder="Ex: https://github.com/you/project" value={form.url} onChange={e => update('url', e.target.value)} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" style={{ accentColor: '#0F5DBD' }} checked={ongoing} onChange={e => setOngoing(e.target.checked)} />
            I am currently working on this project
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
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Skills</label>
            <input className="li-settings-input" style={inputStyle} placeholder="Ex: React, Node.js, PostgreSQL" value={form.skills} onChange={e => update('skills', e.target.value)} />
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
