/* ============================================================
   EDITPROFILEMODAL.JS — Edit profile intro
   ============================================================ */
function EditProfileModal() {
  const { closeModal, currentUser, setCurrentUser, showToast } = React.useContext(AppContext);
  const [saving, setSaving] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState(currentUser?.photo || null);
  const [photoChanged, setPhotoChanged] = React.useState(false);
  const photoInputRef = React.useRef(null);
  const [form, setForm] = React.useState({
    firstName: currentUser ? (currentUser.name || '').split(' ')[0] : '',
    lastName: currentUser ? (currentUser.name || '').split(' ').slice(1).join(' ') : '',
    pronouns: currentUser ? (currentUser.pronouns || 'he/him') : 'he/him',
    headline: currentUser ? (currentUser.headline || '') : '',
    industry: currentUser ? (currentUser.industry || 'Technology') : 'Technology',
    location: currentUser ? (currentUser.location || '') : '',
    about: currentUser ? (currentUser.about || '') : '',
  });

  function handlePhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoPreview(reader.result);
        setPhotoChanged(true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function update(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleSave() {
    if (!form.firstName.trim()) { showToast('First name is required', 'error'); return; }
    if (!form.lastName.trim()) { showToast('Last name is required', 'error'); return; }
    if (!form.headline.trim()) { showToast('Headline is required', 'error'); return; }
    if (!form.location.trim()) { showToast('Location is required', 'error'); return; }
    if (saving) return;
    setSaving(true);
    const name = (form.firstName + ' ' + form.lastName).trim();
    const updates = { headline: form.headline, location: form.location, pronouns: form.pronouns, industry: form.industry, about: form.about };
    if (name) updates.name = name;
    if (photoChanged) updates.photo = photoPreview || '';
    API.updateMe(updates)
      .then(updated => {
        setCurrentUser(updated);
        showToast('Profile updated!', 'success');
        closeModal();
      })
      .catch(() => {
        showToast('Failed to save changes', 'error');
        setSaving(false);
      });
  }

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal li-modal--lg">
        <div className="li-modal__header">
          <span className="li-modal__title">Edit intro</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar name={currentUser ? currentUser.name : ''} size={72} photo={photoPreview} />
              <button
                type="button"
                onClick={() => photoInputRef.current && photoInputRef.current.click()}
                style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--blue)', border: '2px solid var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Upload photo"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              </button>
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Profile photo</div>
              <button type="button" className="li-btn li-btn--ghost li-btn--sm" onClick={() => photoInputRef.current && photoInputRef.current.click()}>
                {photoPreview ? 'Change photo' : 'Upload photo'}
              </button>
              {photoPreview && (
                <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', marginLeft: 8 }} onClick={() => { setPhotoPreview(null); setPhotoChanged(true); }}>Remove</button>
              )}
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>* indicates required fields</p>
          <div className="li-settings-form-row">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>First name *</label>
              <input className="li-settings-input" value={form.firstName} onChange={e => update('firstName', e.target.value)} style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Last name *</label>
              <input className="li-settings-input" value={form.lastName} onChange={e => update('lastName', e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Pronouns</label>
            <select className="li-settings-input" style={{ width: '100%' }} value={form.pronouns} onChange={e => update('pronouns', e.target.value)}>
              {['he/him', 'she/her', 'they/them', 'other'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Headline *</label>
            <input className="li-settings-input" value={form.headline} onChange={e => update('headline', e.target.value)} style={{ width: '100%' }} maxLength={220} />
            <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', marginTop: 4 }}>220 character max</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Industry *</label>
            <select className="li-settings-input" style={{ width: '100%' }} value={form.industry} onChange={e => update('industry', e.target.value)}>
              {['Technology', 'Finance', 'Healthcare', 'Education', 'Other'].map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Location *</label>
            <input className="li-settings-input" value={form.location} onChange={e => update('location', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>About</label>
            <textarea className="li-settings-input" value={form.about} onChange={e => update('about', e.target.value)} style={{ width: '100%', minHeight: 80, resize: 'vertical' }} maxLength={2600} placeholder="Tell your professional story..." />
            <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', marginTop: 4 }}>{form.about.length}/2600</div>
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
