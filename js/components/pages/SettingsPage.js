/* ============================================================
   SETTINGSPAGE.JS — Account settings
   ============================================================ */
function SettingsPage() {
  const { settings, setSettings, darkMode, setDarkMode, showToast, currentUser, setCurrentUser,
          language, setLanguage, recruiterMode, toggleRecruiterMode, userStatus, setUserStatus } = React.useContext(AppContext);
  const [tab, setTab] = React.useState('account');
  const [savingAccount, setSavingAccount] = React.useState(false);
  const [updatingPw, setUpdatingPw] = React.useState(false);
  const [passwordData, setPasswordData] = React.useState({ current: '', newPw: '', confirm: '' });
  const [accountForm, setAccountForm] = React.useState(() => ({
    firstName: currentUser ? (currentUser.name || '').split(' ')[0] : '',
    lastName: currentUser ? (currentUser.name || '').split(' ').slice(1).join(' ') : '',
    email: currentUser ? (currentUser.email || '') : '',
    phone: currentUser ? (currentUser.phone || '') : '',
  }));

  const tabs = [
    { key: 'account',   label: 'Account' },
    { key: 'privacy',   label: 'Privacy' },
    { key: 'display',   label: 'Display' },
    { key: 'security',  label: 'Security' },
    { key: 'recruiter', label: 'Recruiter Mode' },
    { key: 'delete',    label: 'Delete Account' },
  ];

  function Toggle({ label, desc, value, onChange }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{label}</div>
          {desc && <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{desc}</div>}
        </div>
        <button
          role="switch"
          aria-checked={value}
          onClick={() => onChange(!value)}
          style={{
            width: 44, height: 24, borderRadius: 12, flexShrink: 0, cursor: 'pointer',
            background: value ? 'var(--blue)' : 'var(--border-2)',
            border: 'none', position: 'relative', transition: 'background 0.2s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: value ? 22 : 3,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 0.2s', display: 'block',
          }} />
        </button>
      </div>
    );
  }

  const langOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish — Español' },
    { value: 'fr', label: 'French — Français' },
    { value: 'de', label: 'German — Deutsch' },
    { value: 'ja', label: 'Japanese — 日本語' },
  ];

  const recruiterFeatures = [
    '📋 Candidate Shortlist panel in navigation',
    '📨 AI-powered outreach message templates',
    '🎯 Candidate pipeline management',
    '🔍 Advanced candidate filtering in search',
    '📊 Profile readiness insights',
  ];

  return (
    <div className="li-page-inner" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Settings</h1>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Sidebar tabs */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div className="li-card" style={{ padding: '8px 0' }}>
            {tabs.map(tabItem => (
              <button
                key={tabItem.key}
                onClick={() => setTab(tabItem.key)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 16px',
                  fontSize: 14, fontWeight: tab === tabItem.key ? 700 : 400,
                  background: tab === tabItem.key ? 'var(--bg-2)' : 'none',
                  border: 'none', cursor: 'pointer',
                  borderLeft: tab === tabItem.key ? '3px solid var(--blue)' : '3px solid transparent',
                  color: 'var(--text)',
                }}
              >
                {tabItem.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="li-card" style={{ padding: 24 }}>

            {/* ── Account ── */}
            {tab === 'account' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Account preferences</h2>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Name & URL</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>First name</label>
                      <input className="li-settings-input" value={accountForm.firstName}
                        onChange={e => setAccountForm(f => ({ ...f, firstName: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Last name</label>
                      <input className="li-settings-input" value={accountForm.lastName}
                        onChange={e => setAccountForm(f => ({ ...f, lastName: e.target.value }))}
                        style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Nexus URL</label>
                      <input className="li-settings-input" readOnly
                        value={getNexusProfileUrl(currentUser)}
                        style={{ width: '100%', boxSizing: 'border-box', color: 'var(--text-2)' }} />
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Contact info</h3>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Email</label>
                    <input className="li-settings-input" value={accountForm.email}
                      onChange={e => setAccountForm(f => ({ ...f, email: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Phone</label>
                    <input className="li-settings-input" value={accountForm.phone}
                      onChange={e => setAccountForm(f => ({ ...f, phone: e.target.value }))}
                      style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                </div>
                <button className="li-btn li-btn--primary li-btn--sm" style={{ marginTop: 8 }}
                  disabled={savingAccount}
                  onClick={() => {
                    if (!accountForm.firstName.trim()) { showToast('First name is required', 'error'); return; }
                    if (savingAccount) return;
                    setSavingAccount(true);
                    const name = (accountForm.firstName + ' ' + accountForm.lastName).trim();
                    API.updateMe({ name, email: accountForm.email, phone: accountForm.phone })
                      .then(updated => { setCurrentUser(updated); showToast('Account settings saved!'); setSavingAccount(false); })
                      .catch(() => { showToast('Failed to save account settings', 'error'); setSavingAccount(false); });
                  }}>
                  {savingAccount ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}

            {/* ── Privacy ── */}
            {tab === 'privacy' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Privacy settings</h2>
                <Toggle label="Public profile" desc="Make your profile visible to everyone"
                  value={settings.publicProfile}
                  onChange={v => { setSettings(s => ({ ...s, publicProfile: v })); showToast('Profile visibility updated'); }} />
                <Toggle label="Open to Work" desc="Let recruiters know you're looking for work"
                  value={userStatus === 'open_to_work'}
                  onChange={v => {
                    setSettings(s => ({ ...s, openToWork: v }));
                    setUserStatus(v ? 'open_to_work' : null);
                    showToast('Open to Work ' + (v ? 'enabled' : 'disabled'));
                  }} />
              </div>
            )}

            {/* ── Display ── */}
            {tab === 'display' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Display preferences</h2>
                <Toggle label="Dark mode" desc="Use a darker color scheme"
                  value={darkMode}
                  onChange={v => { setDarkMode(v); showToast('Dark mode ' + (v ? 'enabled' : 'disabled')); }} />
              </div>
            )}

            {/* ── Security ── */}
            {tab === 'security' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sign in & security</h2>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Change password</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Current password</label>
                      <input type="password" className="li-settings-input" style={{ width: '100%', boxSizing: 'border-box' }}
                        value={passwordData.current} onChange={e => setPasswordData(p => ({ ...p, current: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>New password</label>
                      <input type="password" className="li-settings-input" style={{ width: '100%', boxSizing: 'border-box' }}
                        value={passwordData.newPw} onChange={e => setPasswordData(p => ({ ...p, newPw: e.target.value }))} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>Confirm new password</label>
                      <input type="password" className="li-settings-input" style={{ width: '100%', boxSizing: 'border-box' }}
                        value={passwordData.confirm} onChange={e => setPasswordData(p => ({ ...p, confirm: e.target.value }))} />
                    </div>
                    <button className="li-btn li-btn--primary li-btn--sm" style={{ alignSelf: 'flex-start' }}
                      disabled={updatingPw}
                      onClick={() => {
                        if (!passwordData.current) { showToast('Current password is required', 'error'); return; }
                        if (!passwordData.newPw) { showToast('New password is required', 'error'); return; }
                        if (passwordData.newPw.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
                        if (passwordData.newPw !== passwordData.confirm) { showToast('Passwords do not match', 'error'); return; }
                        if (updatingPw) return;
                        setUpdatingPw(true);
                        API.changePassword(passwordData.current, passwordData.newPw)
                          .then(() => { showToast('Password updated successfully!'); setPasswordData({ current: '', newPw: '', confirm: '' }); setUpdatingPw(false); })
                          .catch(err => { showToast(err.message || 'Failed to update password', 'error'); setUpdatingPw(false); });
                      }}>
                      {updatingPw ? 'Updating…' : 'Update password'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Recruiter Mode ── */}
            {tab === 'recruiter' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Recruiter Mode</h2>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.5 }}>
                  Recruiter Mode unlocks advanced hiring features including candidate shortlisting,
                  AI outreach templates, and pipeline management.
                </p>

                <Toggle
                  label="Enable Recruiter Mode"
                  desc="Access hiring tools, candidate pipeline, and outreach templates"
                  value={!!recruiterMode}
                  onChange={() => {
                    if (!currentUser?.isRecruiter) {
                      showToast('Recruiter Mode is only available for recruiter accounts', 'error');
                      return;
                    }
                    if (!recruiterMode && userStatus !== 'recruiting') setUserStatus('recruiting');
                    toggleRecruiterMode();
                    showToast('Recruiter Mode ' + (recruiterMode ? 'disabled' : 'enabled'));
                  }}
                />

                <div style={{ marginTop: 28 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Features included</h3>
                  {recruiterFeatures.map(f => (
                    <div key={f} style={{
                      fontSize: 13, padding: '10px 0', borderBottom: '1px solid var(--border)',
                      color: recruiterMode ? 'var(--text)' : 'var(--text-3)',
                    }}>{f}</div>
                  ))}
                </div>

              </div>
            )}

            {/* ── Delete Account ── */}
            {tab === 'delete' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete Account</h2>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24, lineHeight: 1.5 }}>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
                <button
                  type="button"
                  style={{
                    padding: '9px 20px',
                    borderRadius: 6,
                    border: '1.5px solid #b91c1c',
                    background: 'transparent',
                    color: '#b91c1c',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#b91c1c'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#b91c1c'; }}
                  onClick={() => {
                    if (!window.confirm('Are you sure you want to permanently delete your account? This cannot be undone.')) return;
                    API.deleteUser(currentUser.id)
                      .then(() => {
                        const userId = currentUser.id;
                        ['nx-token','nx-uid','li-liked-posts','li-saved-jobs','li-connections','li-following',
                         'li-pending-conn','li-dismissed-inv','li-applied-jobs','li-joined-groups',
                         'li-settings','li-language','li-user-status','li-recruiter-mode',
                         `li-user-status-${userId}`, `li-shortlisted-${userId}`].forEach(k => localStorage.removeItem(k));
                        setCurrentUser(null);
                        showToast('Account deleted. Redirecting…', 'error');
                        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
                      })
                      .catch(() => showToast('Failed to delete account', 'error'));
                  }}
                >
                  Delete Account
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
