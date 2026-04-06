/* ============================================================
   APPLYMODAL.JS — Multi-step job application flow
   ============================================================ */
function ApplyModal() {
  const { closeModal, modalData, currentUser, showToast } = React.useContext(AppContext);
  const job = modalData && modalData.job ? modalData.job : null;
  const [step, setStep] = React.useState(1);
  const TOTAL_STEPS = 3;

  // Form state
  const [form, setForm] = React.useState({
    firstName: currentUser ? (currentUser.name || '').split(' ')[0] : '',
    lastName: currentUser ? (currentUser.name || '').split(' ').slice(1).join(' ') : '',
    email: currentUser ? (currentUser.email || '') : '',
    phone: '',
    location: currentUser ? (currentUser.location || '') : '',
    workAuth: 'yes',
    experience: '7+ years',
    motivation: '',
  });

  function update(key, val) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function handleNext() {
    if (step === 1) {
      if (!form.firstName.trim()) { showToast('First name is required', 'error'); return; }
      if (!form.lastName.trim()) { showToast('Last name is required', 'error'); return; }
      if (!form.email.trim()) { showToast('Email address is required', 'error'); return; }
      if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { showToast('Please enter a valid email address', 'error'); return; }
    }
    if (step < TOTAL_STEPS) { setStep(s => s + 1); return; }
    // Final submit
    showToast('Application submitted! Good luck!');
    closeModal();
  }

  return (
    <div className="li-modal-overlay" style={{ display: 'flex' }}
      onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
      <div className="li-modal">
        <div className="li-modal__header">
          <span className="li-modal__title">Apply to {job ? job.title : 'this job'}</span>
          <button className="li-modal__close" onClick={closeModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="li-modal__body">
          {/* Progress dots */}
          <div className="li-apply-progress">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div key={i} className={`li-apply-dot${i < step ? ' done' : ''}`} />
            ))}
          </div>

          {/* Step 1: Contact info */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Contact info</h3>
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
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Email address *</label>
                <input className="li-settings-input" value={form.email} onChange={e => update('email', e.target.value)} style={{ width: '100%' }} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Phone number</label>
                <input className="li-settings-input" value={form.phone} onChange={e => update('phone', e.target.value)} style={{ width: '100%' }} placeholder="+1 (415) 234-5678" />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>City, State</label>
                <input className="li-settings-input" value={form.location} onChange={e => update('location', e.target.value)} style={{ width: '100%' }} placeholder="San Francisco, CA" />
              </div>
            </div>
          )}

          {/* Step 2: Resume */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Resume</h3>
              <div style={{ border: '2px dashed var(--border)', borderRadius: 8, padding: 32, textAlign: 'center', marginBottom: 16, cursor: 'pointer' }}
                onClick={() => showToast('File selector — coming soon')}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="var(--text-3)" style={{ marginBottom: 8 }}>
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Upload resume</div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>PDF, DOC, DOCX (Max 5MB)</div>
              </div>
              <div style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 14, marginBottom: 16 }}>— or use your Nexus profile —</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: 'var(--blue-light, #EAF4FF)' }}
                onClick={() => showToast('Nexus profile imported as resume')}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: '#0F5DBD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 800, fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif' }}>N</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{currentUser ? currentUser.name : 'You'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Use Nexus profile</div>
                </div>
                <svg style={{ marginLeft: 'auto' }} width="20" height="20" viewBox="0 0 24 24" fill="#0F5DBD">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
              </div>
            </div>
          )}

          {/* Step 3: Screening */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Additional questions</h3>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>Are you authorized to work in the United States? *</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="work-auth" value="yes" checked={form.workAuth === 'yes'} onChange={() => update('workAuth', 'yes')} style={{ accentColor: '#0F5DBD' }} /> Yes
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input type="radio" name="work-auth" value="no" checked={form.workAuth === 'no'} onChange={() => update('workAuth', 'no')} style={{ accentColor: '#0F5DBD' }} /> No
                  </label>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>Years of relevant experience *</label>
                <select className="li-settings-input" style={{ width: '100%' }} value={form.experience} onChange={e => update('experience', e.target.value)}>
                  {['7+ years', '5-7 years', '3-5 years', '1-3 years', 'Less than 1 year'].map(opt => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 14, fontWeight: 600, display: 'block', marginBottom: 8 }}>Why are you interested in this role? (optional)</label>
                <textarea
                  style={{ width: '100%', height: 80, border: '1px solid var(--border-2)', borderRadius: 4, padding: 10, fontSize: 14, resize: 'none', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  placeholder="Share your motivation..."
                  value={form.motivation}
                  onChange={e => update('motivation', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
        <div className="li-modal__footer">
          {step > 1 && (
            <button className="li-btn li-btn--ghost li-btn--sm" onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          <button className="li-btn li-btn--primary li-btn--sm" onClick={handleNext}>
            {step < TOTAL_STEPS ? 'Next' : 'Submit application'}
          </button>
        </div>
      </div>
    </div>
  );
}
