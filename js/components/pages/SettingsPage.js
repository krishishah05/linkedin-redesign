/* ============================================================
   SETTINGSPAGE.JS — Account settings
   ============================================================ */
function SettingsPage() {
  const { settings, setSettings, darkMode, setDarkMode, showToast } = React.useContext(AppContext);
  const [tab, setTab] = React.useState('notifications');
  const [passwordData, setPasswordData] = React.useState({ current: '', newPw: '', confirm: '' });

  const tabs = [
    { key: 'notifications', label: 'Notifications' },
    { key: 'privacy', label: 'Privacy' },
    { key: 'account', label: 'Account' },
    { key: 'display', label: 'Display' },
    { key: 'security', label: 'Security' },
    { key: 'data', label: 'Data Privacy' },
  ];

  function Toggle({ label, desc, settingKey, value, onChange }) {
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

  return (
    <div className="li-page-inner" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Settings</h1>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {/* Sidebar tabs */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div className="li-card" style={{ padding: '8px 0' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  width: '100%', textAlign: 'left', padding: '10px 16px',
                  fontSize: 14, fontWeight: tab === t.key ? 700 : 400,
                  background: tab === t.key ? 'var(--bg-2)' : 'none',
                  border: 'none', cursor: 'pointer', borderLeft: tab === t.key ? '3px solid var(--blue)' : '3px solid transparent',
                  color: 'var(--text)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="li-card" style={{ padding: 24 }}>

            {tab === 'notifications' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Notification preferences</h2>
                <Toggle
                  label="Email notifications"
                  desc="Receive activity and updates via email"
                  value={settings.emailNotifications}
                  onChange={v => { setSettings(s => ({ ...s, emailNotifications: v })); showToast('Email notifications ' + (v ? 'enabled' : 'disabled')); }}
                />
                <Toggle
                  label="Push notifications"
                  desc="Receive push notifications in your browser"
                  value={settings.pushNotifications}
                  onChange={v => { setSettings(s => ({ ...s, pushNotifications: v })); showToast('Push notifications ' + (v ? 'enabled' : 'disabled')); }}
                />
                <Toggle
                  label="Job alerts"
                  desc="Get notified about new job matches"
                  value={true}
                  onChange={() => showToast('Job alerts updated')}
                />
                <Toggle
                  label="Network updates"
                  desc="New connections and birthday reminders"
                  value={true}
                  onChange={() => showToast('Network updates updated')}
                />
              </div>
            )}

            {tab === 'privacy' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Privacy settings</h2>
                <Toggle
                  label="Public profile"
                  desc="Make your profile visible to everyone"
                  value={settings.publicProfile}
                  onChange={v => { setSettings(s => ({ ...s, publicProfile: v })); showToast('Profile visibility updated'); }}
                />
                <Toggle
                  label="Show connections"
                  desc="Let others see your connections list"
                  value={settings.showConnections}
                  onChange={v => { setSettings(s => ({ ...s, showConnections: v })); showToast('Connection visibility updated'); }}
                />
                <Toggle
                  label="Open to Work"
                  desc="Let recruiters know you're looking for work"
                  value={settings.openToWork}
                  onChange={v => { setSettings(s => ({ ...s, openToWork: v })); showToast('Open to Work ' + (v ? 'enabled' : 'disabled')); }}
                />
                <Toggle
                  label="Profile views"
                  desc="Show when you've viewed someone's profile"
                  value={true}
                  onChange={() => showToast('Profile view setting updated')}
                />
              </div>
            )}

            {tab === 'account' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Account preferences</h2>
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Name & URL</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[['First name', 'Alex'], ['Last name', 'Johnson'], ['LinkedIn URL', 'linkedin.com/in/alexjohnson']].map(([label, val]) => (
                      <div key={label}>
                        <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
                        <input
                          className="li-settings-input"
                          defaultValue={val}
                          style={{ width: '100%', boxSizing: 'border-box' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Contact info</h3>
                  {[['Email', 'alex.johnson@gmail.com'], ['Phone', '+1 (415) 234-5678']].map(([label, val]) => (
                    <div key={label} style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>{label}</label>
                      <input className="li-settings-input" defaultValue={val} style={{ width: '100%', boxSizing: 'border-box' }} />
                    </div>
                  ))}
                </div>
                <button className="li-btn li-btn--primary li-btn--sm" style={{ marginTop: 8 }} onClick={() => showToast('Account settings saved!')}>
                  Save changes
                </button>
              </div>
            )}

            {tab === 'display' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Display preferences</h2>
                <Toggle
                  label="Dark mode"
                  desc="Use a darker color scheme"
                  value={darkMode}
                  onChange={v => { setDarkMode(v); showToast('Dark mode ' + (v ? 'enabled' : 'disabled')); }}
                />
                <div style={{ paddingTop: 16 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Language</h3>
                  <select className="li-settings-input" style={{ width: 200 }}>
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                    <option>Japanese</option>
                  </select>
                </div>
              </div>
            )}

            {tab === 'security' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Sign in & security</h2>
                <Toggle
                  label="Two-factor authentication"
                  desc="Add an extra layer of security to your account"
                  value={settings.twoFactor}
                  onChange={v => { setSettings(s => ({ ...s, twoFactor: v })); showToast('Two-factor authentication ' + (v ? 'enabled' : 'disabled')); }}
                />
                <div style={{ paddingTop: 16 }}>
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
                      onClick={() => { showToast('Password updated successfully!'); setPasswordData({ current: '', newPw: '', confirm: '' }); }}>
                      Update password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'data' && (
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Data privacy</h2>
                <Toggle
                  label="Allow personalized ads"
                  desc="LinkedIn uses your data to show relevant ads"
                  value={false}
                  onChange={() => showToast('Ad preference updated')}
                />
                <Toggle
                  label="Share data with third parties"
                  desc="Allow LinkedIn partners to use your data"
                  value={false}
                  onChange={() => showToast('Data sharing preference updated')}
                />
                <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-2)', borderRadius: 8 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Download your data</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>
                    Get a copy of your LinkedIn data including your connections, messages, and posts.
                  </p>
                  <button className="li-btn li-btn--outline li-btn--sm" onClick={() => showToast('Data export requested — check your email')}>
                    Request data export
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
