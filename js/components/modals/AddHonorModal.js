/* ============================================================
   ADDHONORMODAL.JS — Add or edit a honor or award entry
   ============================================================ */
function AddHonorModal() {
  const { closeModal, setCurrentUser, showToast, modalData } = React.useContext(AppContext);

  const isEditing = !!(modalData && modalData.entry);
  const editEntry = isEditing ? modalData.entry : null;
  const editIndex = isEditing ? modalData.index : null;

  function parseParts(dateStr) {
    if (!dateStr) return { month: 'January', year: String(new Date().getFullYear()) };
    const parts = dateStr.split(' ');
    return { month: parts[0] || 'January', year: parts[1] || String(new Date().getFullYear()) };
  }

  const dateParts = parseParts(editEntry?.issueDate);

  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    title:       editEntry?.title       || '',
    issuer:      editEntry?.issuer      || '',
    month:       dateParts.month,
    year:        dateParts.year,
    description: editEntry?.description || '',
  });

  function update(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function handleSave() {
    const trimmedTitle = form.title && form.title.trim();
    if (!trimmedTitle) { showToast('Title is required', 'error'); return; }
    if (saving) return;
    setSaving(true);
    const entry = {
      title: trimmedTitle, issuer: form.issuer,
      issueDate: `${form.month} ${form.year}`,
      description: form.description,
    };
    const call = isEditing ? API.updateHonor(editIndex, entry) : API.addHonor(entry);
    call
      .then(updated => {
        setCurrentUser(updated);
        showToast(isEditing ? 'Honor updated!' : 'Honor & award added!', 'success');
        closeModal();
      })
      .catch(() => { showToast('Failed to save honor', 'error'); setSaving(false); });
  }

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years  = Array.from({ length: 50 }, (_, i) => String(new Date().getFullYear() - i));
  const inputStyle = { width: '100%', boxSizing: 'border-box' };

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal li-modal--lg">
        <div className="li-modal__header">
          <span className="li-modal__title">{isEditing ? 'Edit honor & award' : 'Add honor & award'}</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>* indicates required fields</p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Title *</label>
            <input className="li-settings-input" style={inputStyle} placeholder="Ex: Dean's List" value={form.title} onChange={e => update('title', e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Issuer</label>
            <input className="li-settings-input" style={inputStyle} placeholder="Ex: NJIT" value={form.issuer} onChange={e => update('issuer', e.target.value)} />
          </div>
          <div className="li-settings-form-row">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Issue date</label>
              <select className="li-settings-input" style={inputStyle} value={form.month} onChange={e => update('month', e.target.value)}>
                {months.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>&nbsp;</label>
              <select className="li-settings-input" style={inputStyle} value={form.year} onChange={e => update('year', e.target.value)}>
                {years.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              style={{ width: '100%', height: 100, border: '1px solid var(--border-2)', borderRadius: 4, padding: 10, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              placeholder="Describe the honor or award..."
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
