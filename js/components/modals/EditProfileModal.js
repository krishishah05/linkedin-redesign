/* ============================================================
   EDITPROFILEMODAL.JS — Edit profile intro
   ============================================================ */
function EditProfileModal() {
  const { closeModal, currentUser, setCurrentUser, showToast } = React.useContext(AppContext);
  const [saving, setSaving] = React.useState(false);
  const [photoPreview, setPhotoPreview] = React.useState(currentUser?.photo || null);
  const [photoChanged, setPhotoChanged] = React.useState(false);
  const photoInputRef = React.useRef(null);

  /* ── Crop state ── */
  const [cropMode, setCropMode] = React.useState(false);
  const [cropImg, setCropImg] = React.useState(null);
  const [cropOffset, setCropOffset] = React.useState({ x: 0, y: 0 });
  const [cropScale, setCropScale] = React.useState(1);
  const [cropNaturalW, setCropNaturalW] = React.useState(null);
  const [cropNaturalH, setCropNaturalH] = React.useState(null);
  const cropCanvasRef = React.useRef(null);
  const draggingRef = React.useRef(false);
  const lastPosRef = React.useRef({ x: 0, y: 0 });

  const [form, setForm] = React.useState({
    firstName: currentUser ? (currentUser.name || '').split(' ')[0] : '',
    lastName:  currentUser ? (currentUser.name || '').split(' ').slice(1).join(' ') : '',
    pronouns:  currentUser ? (currentUser.pronouns || 'he/him') : 'he/him',
    headline:  currentUser ? (currentUser.headline || '') : '',
    industry:  currentUser ? (currentUser.industry || 'Technology') : 'Technology',
    location:  currentUser ? (currentUser.location || '') : '',
    about:     currentUser ? (currentUser.about || '') : '',
  });

  /* ── Photo picker → open crop UI ── */
  function handlePhotoChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      showToast('Please choose an image file.', 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => { showToast('Could not read this photo.', 'error'); };
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropNaturalW(null);
        setCropNaturalH(null);
        setCropImg(reader.result);
        setCropMode(true);
        setCropOffset({ x: 0, y: 0 });
        setCropScale(1);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  /* ── Crop drag handlers ── */
  function onCropMouseDown(e) {
    e.preventDefault();
    draggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
  }
  function onCropMouseMove(e) {
    if (!draggingRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setCropOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }
  function onCropMouseUp() { draggingRef.current = false; }
  function onCropTouchStart(e) {
    draggingRef.current = true;
    lastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onCropTouchMove(e) {
    if (!draggingRef.current) return;
    const dx = e.touches[0].clientX - lastPosRef.current.x;
    const dy = e.touches[0].clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    setCropOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  }

  /* ── Apply crop: render to 400×400 canvas using natural image dims ── */
  function applyCrop() {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const outputSize = 400;
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const baseScale = Math.max(outputSize / nw, outputSize / nh);
      const imgW = nw * baseScale * cropScale;
      const imgH = nh * baseScale * cropScale;
      const scaleToOutput = outputSize / 200;
      const x = (outputSize - imgW) / 2 + cropOffset.x * scaleToOutput;
      const y = (outputSize - imgH) / 2 + cropOffset.y * scaleToOutput;
      ctx.clearRect(0, 0, outputSize, outputSize);
      ctx.save();
      ctx.beginPath();
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x, y, imgW, imgH);
      ctx.restore();
      setPhotoPreview(canvas.toDataURL('image/jpeg', 0.9));
      setPhotoChanged(true);
      setCropMode(false);
      setCropImg(null);
    };
    img.src = cropImg;
  }

  /* ── Compute preview dimensions from natural dims ── */
  const previewSize = 200;
  const cropMinScale = (cropNaturalW && cropNaturalH)
    ? Math.max(previewSize / cropNaturalW, previewSize / cropNaturalH)
    : null;
  const displayW = (cropNaturalW && cropMinScale) ? cropNaturalW * cropMinScale * cropScale : cropScale * previewSize;
  const displayH = (cropNaturalH && cropMinScale) ? cropNaturalH * cropMinScale * cropScale : 'auto';

  function update(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  function handleSave() {
    if (!form.firstName.trim()) { showToast('First name is required', 'error'); return; }
    if (!form.lastName.trim())  { showToast('Last name is required', 'error'); return; }
    if (!form.headline.trim())  { showToast('Headline is required', 'error'); return; }
    if (!form.location.trim())  { showToast('Location is required', 'error'); return; }
    if (saving) return;
    setSaving(true);
    const name = (form.firstName + ' ' + form.lastName).trim();
    const updates = { headline: form.headline, location: form.location, pronouns: form.pronouns, industry: form.industry, about: form.about };
    if (name) updates.name = name;
    if (photoChanged) updates.photo = photoPreview || '';
    API.updateMe(updates)
      .then(updated => { setCurrentUser(updated); showToast('Profile updated!', 'success'); closeModal(); })
      .catch(() => { showToast('Failed to save changes', 'error'); setSaving(false); });
  }

  return (
    <>
      {/* ── Crop overlay (only dialog rendered when cropMode is true) ── */}
      {cropMode && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Adjust photo"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: 'var(--white)', borderRadius: 12, padding: 28, width: 300, boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Adjust photo</h3>
            <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 14px' }}>Drag to reposition · Scroll to zoom</p>

            {/* Circular preview */}
            <div
              role="img"
              aria-label="Photo crop preview — drag to reposition"
              style={{
                width: previewSize, height: previewSize, borderRadius: '50%',
                overflow: 'hidden', cursor: 'grab',
                margin: '0 auto 16px',
                position: 'relative',
                background: '#000',
                border: '3px solid var(--blue)',
                userSelect: 'none',
              }}
              onMouseDown={onCropMouseDown}
              onMouseMove={onCropMouseMove}
              onMouseUp={onCropMouseUp}
              onMouseLeave={onCropMouseUp}
              onTouchStart={onCropTouchStart}
              onTouchMove={onCropTouchMove}
              onTouchEnd={onCropMouseUp}
            >
              <img
                src={cropImg}
                alt=""
                draggable={false}
                onLoad={e => {
                  const nw = e.target.naturalWidth;
                  const nh = e.target.naturalHeight;
                  setCropNaturalW(nw);
                  setCropNaturalH(nh);
                }}
                style={{
                  position: 'absolute',
                  width: displayW,
                  height: displayH,
                  left: '50%',
                  top: '50%',
                  transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px))`,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              />
            </div>

            {/* Zoom */}
            <div style={{ marginBottom: 20 }}>
              <label htmlFor="crop-zoom" style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span>Zoom</span>
                <span>{Math.round(cropScale * 100)}%</span>
              </label>
              <input
                id="crop-zoom"
                type="range" min="1" max="3" step="0.01"
                value={cropScale}
                onChange={e => setCropScale(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <canvas ref={cropCanvasRef} style={{ display: 'none' }} aria-hidden="true" />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => { setCropMode(false); setCropImg(null); }}>Cancel</button>
              <button className="li-btn li-btn--primary li-btn--sm" onClick={applyCrop}>Apply</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit intro modal (hidden while crop is active to avoid two dialogs) ── */}
      {!cropMode && (
        <div className="li-modal-overlay" style={{ display: 'flex' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="li-modal li-modal--lg" role="dialog" aria-modal="true" aria-label="Edit profile intro">
            <div className="li-modal__header">
              <span className="li-modal__title">Edit intro</span>
              <button className="li-modal__close" onClick={closeModal} aria-label="Close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
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
                    aria-label="Upload profile photo"
                    style={{ position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--blue)', border: '2px solid var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Profile photo</div>
                  <button type="button" className="li-btn li-btn--ghost li-btn--sm" onClick={() => photoInputRef.current && photoInputRef.current.click()}>
                    {photoPreview ? 'Change photo' : 'Upload photo'}
                  </button>
                  {photoPreview && (
                    <button type="button" style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer', marginLeft: 8 }}
                      onClick={() => { setPhotoPreview(null); setPhotoChanged(true); }}>Remove</button>
                  )}
                </div>
              </div>

              <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>* indicates required fields</p>

              <div className="li-settings-form-row">
                <div style={{ flex: 1 }}>
                  <label htmlFor="ep-first" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>First name *</label>
                  <input id="ep-first" className="li-settings-input" value={form.firstName} onChange={e => update('firstName', e.target.value)} style={{ width: '100%' }} aria-required="true" />
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="ep-last" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Last name *</label>
                  <input id="ep-last" className="li-settings-input" value={form.lastName} onChange={e => update('lastName', e.target.value)} style={{ width: '100%' }} aria-required="true" />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="ep-pronouns" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Pronouns</label>
                <select id="ep-pronouns" className="li-settings-input" style={{ width: '100%' }} value={form.pronouns} onChange={e => update('pronouns', e.target.value)}>
                  {['he/him', 'she/her', 'they/them', 'other'].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="ep-headline" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Headline *</label>
                <input id="ep-headline" className="li-settings-input" value={form.headline} onChange={e => update('headline', e.target.value)} style={{ width: '100%' }} maxLength={220} aria-required="true" aria-describedby="ep-headline-hint" />
                <div id="ep-headline-hint" style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', marginTop: 4 }}>{form.headline.length}/220</div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="ep-industry" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Industry</label>
                <select id="ep-industry" className="li-settings-input" style={{ width: '100%' }} value={form.industry} onChange={e => update('industry', e.target.value)}>
                  {['Technology', 'Finance', 'Healthcare', 'Education', 'Other'].map(i => <option key={i}>{i}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="ep-location" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Location *</label>
                <input id="ep-location" className="li-settings-input" value={form.location} onChange={e => update('location', e.target.value)} style={{ width: '100%' }} aria-required="true" />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label htmlFor="ep-about" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>About</label>
                <textarea id="ep-about" className="li-settings-input" value={form.about} onChange={e => update('about', e.target.value)} style={{ width: '100%', minHeight: 80, resize: 'vertical' }} maxLength={2600} placeholder="Tell your professional story..." aria-describedby="ep-about-hint" />
                <div id="ep-about-hint" style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'right', marginTop: 4 }}>{form.about.length}/2600</div>
              </div>
            </div>
            <div className="li-modal__footer">
              <button className="li-btn li-btn--ghost li-btn--sm" onClick={closeModal}>Cancel</button>
              <button className="li-btn li-btn--primary li-btn--sm" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
