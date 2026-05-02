/* ============================================================
   ADDEDUCATIONMODAL.JS — Add or edit an education entry
   ============================================================ */
function AddEducationModal() {
  const { closeModal, setCurrentUser, showToast, modalData } = React.useContext(AppContext);

  const isEditing = !!(modalData && modalData.entry);
  const editEntry = isEditing ? modalData.entry : null;
  const editIndex = isEditing ? modalData.index : null;

  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    school:    editEntry?.school    || '',
    degree:    editEntry?.degree    || '',
    field:     editEntry?.field     || '',
    startDate: editEntry?.startDate || editEntry?.startYear || '',
    endDate:   editEntry?.endDate   || editEntry?.endYear   || '',
  });

  function update(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function handleSave() {
    if (!form.school.trim()) { showToast('School name is required', 'error'); return; }
    if (saving) return;
    setSaving(true);
    const entry = {
      school: form.school.trim(), degree: form.degree.trim(),
      field: form.field.trim(), startDate: form.startDate.trim(), endDate: form.endDate.trim(),
    };
    const call = isEditing ? API.updateEducation(editIndex, entry) : API.addEducation(entry);
    call
      .then(updated => {
        setCurrentUser(updated);
        showToast(isEditing ? 'Education updated!' : 'Education added!', 'success');
        closeModal();
      })
      .catch(() => { showToast('Failed to save education', 'error'); setSaving(false); });
  }

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal li-modal--lg">
        <div className="li-modal__header">
          <span className="li-modal__title">{isEditing ? 'Edit education' : 'Add education'}</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>School *</label>
            <input className="li-settings-input" value={form.school} onChange={e => update('school', e.target.value)} style={{ width: '100%' }} placeholder="e.g. MIT, Stanford University" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Degree</label>
            <input className="li-settings-input" value={form.degree} onChange={e => update('degree', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Bachelor of Science, MBA" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Field of study</label>
            <input className="li-settings-input" value={form.field} onChange={e => update('field', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Computer Science" />
          </div>
          <div className="li-settings-form-row">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Start date</label>
              <input className="li-settings-input" value={form.startDate} onChange={e => update('startDate', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Sep 2020" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>End date</label>
              <input className="li-settings-input" value={form.endDate} onChange={e => update('endDate', e.target.value)} style={{ width: '100%' }} placeholder="e.g. May 2024 or Present" />
            </div>
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
