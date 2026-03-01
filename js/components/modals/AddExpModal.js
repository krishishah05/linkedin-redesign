/* ============================================================
   ADDEXPMODAL.JS — Add a work experience entry
   ============================================================ */
function AddExpModal() {
  const { closeModal, showToast } = React.useContext(AppContext);
  const [currentRole, setCurrentRole] = React.useState(true);
  const [form, setForm] = React.useState({
    title: '', type: '', company: '', location: '',
    startMonth: 'January', startYear: '2024', description: '', skills: '',
  });

  function update(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    if (!form.title || !form.company) { showToast('Title and company are required', 'error'); return; }
    showToast('Experience added!');
    closeModal();
  }

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years = Array.from({ length: 30 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal li-modal--lg">
        <div className="li-modal__header">
          <span className="li-modal__title">Add experience</span>
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
            <input className="li-settings-input" placeholder="Ex: Retail Sales Manager" value={form.title} onChange={e => update('title', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Employment type</label>
            <select className="li-settings-input" style={{ width: '100%' }} value={form.type} onChange={e => update('type', e.target.value)}>
              <option value="">Please select</option>
              {['Full-time','Part-time','Self-employed','Freelance','Contract','Internship'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Company name *</label>
            <input className="li-settings-input" placeholder="Ex: Microsoft" value={form.company} onChange={e => update('company', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Location</label>
            <input className="li-settings-input" placeholder="Ex: London, United Kingdom" value={form.location} onChange={e => update('location', e.target.value)} style={{ width: '100%' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 12 }}>
            <input type="checkbox" style={{ accentColor: '#0A66C2' }} checked={currentRole} onChange={e => setCurrentRole(e.target.checked)} />
            I am currently working in this role
          </label>
          <div className="li-settings-form-row">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Start date *</label>
              <select className="li-settings-input" style={{ width: '100%' }} value={form.startMonth} onChange={e => update('startMonth', e.target.value)}>
                {months.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>&nbsp;</label>
              <select className="li-settings-input" style={{ width: '100%' }} value={form.startYear} onChange={e => update('startYear', e.target.value)}>
                {years.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
            <textarea
              style={{ width: '100%', height: 100, border: '1px solid var(--border-2)', borderRadius: 4, padding: 10, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              placeholder="Describe your role and achievements..."
              value={form.description}
              onChange={e => update('description', e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Skills</label>
            <input className="li-settings-input" placeholder="Add skills (Ex: Leadership, Python, React)" value={form.skills} onChange={e => update('skills', e.target.value)} style={{ width: '100%' }} />
          </div>
        </div>
        <div className="li-modal__footer">
          <button className="li-btn li-btn--ghost li-btn--sm" onClick={closeModal}>Cancel</button>
          <button className="li-btn li-btn--primary li-btn--sm" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
