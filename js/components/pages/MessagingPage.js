/* ============================================================
   MESSAGINGPAGE.JS — Conversations list + chat panel
   + User Story 1: Outreach Guide (assistant panel)
   + User Story 2: Profile Readiness (score panel; API-driven w/ mock fallback)
   ============================================================ */

function MessagingPage() {
  const { currentUser, showToast, setUnreadMessages } = React.useContext(AppContext);

  const { data: conversations, loading } = useFetch(API.getConversations, []);
  const [localConversations, setLocalConversations] = React.useState(null);
  const [selectedId, setSelectedId] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [msgLoading, setMsgLoading] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [composing, setComposing] = React.useState(false);
  const [composeSearch, setComposeSearch] = React.useState('');
  const [networkUsers, setNetworkUsers] = React.useState([]);
  const messagesEndRef = React.useRef(null);

  // Panels (user stories live in Messaging like your original requirement)
  const [activePanel, setActivePanel] = React.useState(null); // 'guide' | 'score' | null

  // Outreach Guide state (per-conversation)
  const [guideStateByConv, setGuideStateByConv] = React.useState({});

  // Profile Readiness state
  const [readiness, setReadiness] = React.useState(null);
  const [readinessLoading, setReadinessLoading] = React.useState(false);
  const [readinessError, setReadinessError] = React.useState(null);

  // Track per-conversation unread counts so we can decrement accurately
  const [unreadByConv, setUnreadByConv] = React.useState({});

  // Sync conversations from fetch into local state + compute initial unread badge
  React.useEffect(() => {
    if (conversations) {
      setLocalConversations(conversations);
      const map = {};
      let total = 0;
      conversations.forEach(c => {
        const n = c.unreadCount || 0;
        map[c.id] = n;
        total += n;
      });
      setUnreadByConv(map);
      setUnreadMessages(total);
    }
  }, [conversations]);

  // Auto-select first conversation
  React.useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedId) {
      selectConversation(conversations[0].id);
    }
  }, [conversations]);

  // Load users for compose picker
  React.useEffect(() => {
    API.getUsers?.().then(u => setNetworkUsers(u || [])).catch(() => { });
  }, [])

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  function selectConversation(id) {
    setSelectedId(id);
    setMsgLoading(true);

    // Decrement badge by this conversation's unread count, then zero it out
    const unreadCount = unreadByConv[id] || 0;
    setUnreadByConv(prev => ({ ...prev, [id]: 0 }));
    if (unreadCount > 0) {
      setUnreadMessages(cur => Math.max(0, cur - unreadCount));
    }

    // Also clear unreadCount on the local conversation list item
    setLocalConversations(prev =>
      (prev || []).map(c => c.id === id ? { ...c, unreadCount: 0 } : c)
    );

    API.getConversation(id)
      .then(data => {
        setMessages(data.messages || []);
        setMsgLoading(false);
      })
      .catch(() => {
        setMessages([]);
        setMsgLoading(false);
      });
  }

  function startConversation(user) {
    setComposing(false);
    setComposeSearch('');
    // Check if conversation with this user already exists
    const existing = (localConversations || []).find(c =>
      String(c.participant?.id || c.participantId) === String(user.id)
    );
    if (existing) {
      selectConversation(existing.id);
      return;
    }
    API.createConversation(user.id)
      .then(conv => {
        setLocalConversations(prev => [conv, ...(prev || [])]);
        selectConversation(conv.id);
      })
      .catch(() => showToast('Could not start conversation', 'error'));
  }

  function sendMessage() {
    if (!draft.trim() || !selectedId || sending) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);

    // Optimistic update
    const newMsg = {
      id: Date.now(),
      senderId: currentUser ? currentUser.id : -1,
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, newMsg]);

    API.sendMessage(selectedId, text)
      .catch(() => {
        setMessages(prev => prev.filter(m => m.id !== newMsg.id));
        setDraft(text);
        showToast('Failed to send message', 'error');
      })
      .finally(() => setSending(false));
  }

  // ────────────────────────────────────────────────────────────
  // USER STORY 2 — Profile Readiness
  // API-first (backend-ready), fallback mock for P3 if backend off
  // ────────────────────────────────────────────────────────────
  async function openProfileReadiness() {
    setActivePanel(prev => (prev === 'score' ? null : 'score'));
    if (activePanel === 'score') return;

    // Close guide if open
    if (activePanel === 'guide') setActivePanel('score');

    await loadProfileReadiness({ refresh: false });
  }

  async function loadProfileReadiness({ refresh }) {
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      // Backend call (P4-ready)
      const data = await API.getProfileReadiness();
      setReadiness(data);
      if (refresh) showToast('Score refreshed', 'success');
    } catch (e) {
      // Fallback mock so P3 works even if backend isn’t running
      const mock = mockBackendGetProfileReadiness(currentUser, { jitter: refresh });
      setReadiness(mock);
      setReadinessError('Backend not running — using mocked score');
      if (refresh) showToast('Score refreshed (mock)', 'info');
    } finally {
      setReadinessLoading(false);
    }
  }

  // ────────────────────────────────────────────────────────────
  // USER STORY 1 — Outreach Guide
  // React version of your old step-by-step guide logic
  // ────────────────────────────────────────────────────────────
  function openOutreachGuide() {
    if (!selectedId) { showToast('Select a conversation first', 'info'); return; }
    setActivePanel(prev => (prev === 'guide' ? null : 'guide'));

    // Close readiness if open
    if (activePanel === 'score') setActivePanel('guide');

    setGuideStateByConv(prev => {
      const next = { ...prev };
      if (!next[selectedId]) {
        next[selectedId] = {
          step: 1,
          goal: null,
          variantIdx: 0,
          details: {
            recipient: '',
            yourRole: '',
            field: '',
            company: '',
            role: '',
            context: '',
          },
          preview: '',
        };
      }
      return next;
    });
  }

  function setGuideState(patch) {
    if (!selectedId) return;
    setGuideStateByConv(prev => ({
      ...prev,
      [selectedId]: { ...(prev[selectedId] || {}), ...patch },
    }));
  }

  function setGuideDetailsPatch(patch) {
    if (!selectedId) return;
    setGuideStateByConv(prev => ({
      ...prev,
      [selectedId]: {
        ...(prev[selectedId] || {}),
        details: { ...((prev[selectedId] || {}).details || {}), ...patch },
      },
    }));
  }


  function selectGoal(goalKey) {
    const cur = guideStateByConv[selectedId] || {};
    const updated = {
      ...cur,
      goal: goalKey,
      step: 2,
      variantIdx: 0,
    };
    updated.preview = computeGuidePreview(updated);
    setGuideState(updated);
  }

  function nextStep() {
    const s = guideStateByConv[selectedId];
    if (!s) return;

    if (s.step === 1) {
      if (!s.goal) {
        showToast('Pick a goal to continue', 'info');
        return;
      }
      setGuideState({ step: 2 });
      return;
    }

    if (s.step === 2) {
      const updated = { ...s, step: 3 };
      updated.preview = computeGuidePreview(updated);
      setGuideState(updated);
      return;
    }
  }

  function backStep() {
    const s = guideStateByConv[selectedId];
    if (!s) return;
    if (s.step > 1) setGuideState({ step: s.step - 1 });
  }

  function cycleVariant() {
    const s = guideStateByConv[selectedId];
    if (!s || !s.goal) return;
    const variants = _OUTREACH_TEMPLATES[s.goal] || [];
    if (!variants.length) return;

    const updated = { ...s, variantIdx: (s.variantIdx + 1) % variants.length };
    updated.preview = computeGuidePreview(updated);
    setGuideState(updated);
  }

  function updateGuidePreviewManual(value) {
    const s = guideStateByConv[selectedId];
    if (!s) return;
    setGuideState({ preview: value });
  }

  function applyGuideMessage() {
    const s = guideStateByConv[selectedId];
    if (!s) return;
    const text = (s.preview || '').trim();
    if (!text) {
      showToast('Nothing to insert yet', 'info');
      return;
    }
    setDraft(text);
    showToast('Message drafted — review and send!', 'success');
    setActivePanel(null);
  }

  // Keep preview synced when details change (when in step 2/3)
  React.useEffect(() => {
    if (!selectedId) return;
    const s = guideStateByConv[selectedId];
    if (!s) return;
    if (!s.goal) return;
    if (s.step === 2 || s.step === 3) {
      const fresh = computeGuidePreview(s);
      // Only overwrite preview automatically if user hasn’t manually edited it heavily
      // (Simple rule: if preview still matches computed prefix-ish)
      setGuideStateByConv(prev => {
        const cur = prev[selectedId];
        if (!cur) return prev;
        const computed = computeGuidePreview(cur);
        // If user edited, keep their version
        if (cur.step === 3 && cur.preview && cur.preview !== computed) return prev;
        return { ...prev, [selectedId]: { ...cur, preview: computed } };
      });
    }
  }, [selectedId, guideStateByConv[selectedId]?.details, guideStateByConv[selectedId]?.goal, guideStateByConv[selectedId]?.variantIdx]);

  if (loading) return <LoadingSpinner text="Loading messages..." />;

  const allConversations = localConversations || conversations || [];
  const filteredConvs = search
    ? allConversations.filter(c => (c.participantName || '').toLowerCase().includes(search.toLowerCase()))
    : allConversations;
  const selectedConv = allConversations.find(c => c.id === selectedId);
  const filteredNetworkUsers = composeSearch
    ? networkUsers.filter(u => u.name.toLowerCase().includes(composeSearch.toLowerCase()))
    : networkUsers;

  const guideState = selectedId ? guideStateByConv[selectedId] : null;

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 16px' }}>
      <div className="li-card" style={{ display: 'flex', height: 620, overflow: 'hidden', padding: 0 }}>

        {/* Left panel — conversation list */}
        <div style={{ width: 320, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Messaging</h2>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  className="li-btn li-btn--ghost"
                  style={{ padding: '4px 8px', fontSize: 12 }}
                  onClick={() => setComposing(c => !c)}
                  title="New message"
                >
                  New Message
                </button>
              </div>
            </div>

            {/* Compose picker */}
            {composing && (
              <div style={{ marginBottom: 8 }}>
                <input
                  autoFocus
                  className="li-input"
                  placeholder="Search your network..."
                  value={composeSearch}
                  onChange={e => setComposeSearch(e.target.value)}
                  style={{ width: '100%', marginBottom: 6 }}
                />
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--white)' }}>
                  {filteredNetworkUsers.slice(0, 20).map(u => (
                    <button
                      key={u.id}
                      onClick={() => startConversation(u)}
                      style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <Avatar name={u.name} size={28} colorOverride={u.avatarColor} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(u.headline || '').split('|')[0].trim()}</div>
                      </div>
                    </button>
                  ))}
                  {filteredNetworkUsers.length === 0 && (
                    <div style={{ padding: '12px 10px', fontSize: 13, color: 'var(--text-3)' }}>No users found</div>
                  )}
                </div>
              </div>
            )}

            {/* Search */}
            {!composing && (
              <input
                className="li-input"
                placeholder="Search messages"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ width: '100%' }}
              />
            )}
          </div>

          {/* Conversation list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {!composing && filteredConvs.length === 0 && (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                {search ? 'No conversations match your search.' : 'No messages yet. Use ✏ New to message someone in your network.'}
              </div>
            )}
            {filteredConvs.map(c => (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className="li-msg-conv"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '12px 12px',
                  border: 'none',
                  background: c.id === selectedId ? 'var(--blue-light)' : 'transparent',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.participantName || 'Unknown'}</div>
                <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>{c.lastMessage || ''}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Right panel — chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {!selectedConv && allConversations.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', gap: 12, padding: 32 }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: 'var(--text-3)' }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Your inbox is empty</div>
              <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 260 }}>
                Connect with people on the Network page to start conversations.
              </div>
            </div>
          )}
          {/* Chat header */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <h2 style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>
              {selectedConv ? (selectedConv.participant?.name || selectedConv.participantName || 'Conversation') : 'Select a conversation'}
            </h2>
            <div style={{ flex: 1 }} />

            {/* User story buttons */}
            <button
              className="li-btn li-btn--ghost"
              onClick={openOutreachGuide}
              disabled={!selectedId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Outreach Guide"
            >
              Guide
            </button>

            <button
              className="li-btn li-btn--ghost"
              onClick={openProfileReadiness}
              disabled={!selectedId}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              title="Profile Readiness"
            >
              Score
            </button>
          </div>

          {/* Panels (render like your old “side overlay” inside messaging) */}
          {activePanel === 'guide' && selectedId && (
            <OutreachGuidePanel
              convId={selectedId}
              state={guideState}
              onClose={() => setActivePanel(null)}
              onSelectGoal={selectGoal}
              onNext={nextStep}
              onBack={backStep}
              onCycle={cycleVariant}
              onDetailsChange={setGuideDetailsPatch}
              onPreviewChange={updateGuidePreviewManual}
              onInsert={applyGuideMessage}
            />
          )}

          {activePanel === 'score' && (
            <ProfileReadinessPanel
              readiness={readiness}
              loading={readinessLoading}
              error={readinessError}
              onClose={() => setActivePanel(null)}
              onRefresh={() => loadProfileReadiness({ refresh: true })}
            />
          )}

          {/* Chat messages */}
          <div style={{ padding: 14, overflowY: 'auto', flex: 1, background: 'var(--bg)' }}>
            {msgLoading ? (
              <div style={{ color: 'var(--text-3)' }}>Loading conversation…</div>
            ) : (
              <>
                {(messages || []).map(m => {
                  const isMe = currentUser != null && m.senderId === currentUser.id;
                  return (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '70%',
                          background: isMe ? 'var(--blue)' : 'var(--white)',
                          color: isMe ? 'white' : 'var(--text)',
                          padding: '10px 12px',
                          borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                          fontSize: 14,
                          lineHeight: 1.5,
                        }}
                      >
                        {m.text}
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                          {formatTime(m.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Composer */}
          <div style={{ padding: 12, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
            <input
              className="li-input"
              placeholder="Write a message…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              style={{ flex: 1 }}
            />
            <button className="li-btn li-btn--primary" onClick={sendMessage} disabled={sending}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Outreach Guide Panel (User Story 1)
   ───────────────────────────────────────────────────────────── */
function OutreachGuidePanel({
  convId,
  state,
  onClose,
  onSelectGoal,
  onNext,
  onBack,
  onCycle,
  onDetailsChange,
  onPreviewChange,
  onInsert,
}) {
  if (!state) return null;

  const tips = state.goal ? (_OUTREACH_TIPS[state.goal] || []) : [];

  const variants = state.goal ? (_OUTREACH_TEMPLATES[state.goal] || []) : [];
  const tone = variants.length ? variants[state.variantIdx % variants.length].tone : '—';
  const variantLabel = variants.length ? `v${state.variantIdx + 1} of ${variants.length}` : '';

  return (
    <div className="li-msg-guide" role="complementary" aria-label="Outreach message guide">
      <div className="li-msg-guide__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}></span>
          <span className="li-msg-guide__title">Outreach Guide</span>
          <div className="li-msg-guide__dots">
            <div className={'li-msg-guide__dot' + (state.step === 1 ? ' active' : ' done')}><span>1</span></div>
            <div className="li-msg-guide__dot-line"></div>
            <div className={'li-msg-guide__dot' + (state.step === 2 ? ' active' : state.step > 2 ? ' done' : '')}><span>2</span></div>
            <div className="li-msg-guide__dot-line"></div>
            <div className={'li-msg-guide__dot' + (state.step === 3 ? ' active' : '')}><span>3</span></div>
          </div>
        </div>
        <button className="li-msg-guide__close" onClick={onClose} title="Close guide" aria-label="Close guide">✕</button>
      </div>

      <div className="li-msg-guide__body">
        <div className="li-msg-guide__steps">
          {state.step === 1 && (
            <div className="li-msg-guide__step">
              <div className="li-msg-guide__step-label">What’s the purpose of your message?</div>
              <div className="li-msg-guide__goals">
                {_OUTREACH_GOALS.map(g => (
                  <div
                    key={g.key}
                    className={'li-msg-guide__goal-tile' + (state.goal === g.key ? ' selected' : '')}
                    onClick={() => onSelectGoal(g.key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') onSelectGoal(g.key); }}
                  >
                    <span className="li-msg-guide__goal-icon">{g.icon}</span>
                    <span className="li-msg-guide__goal-label">{g.label}</span>
                    <span className="li-msg-guide__goal-desc">{g.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.step === 2 && (
            <div className="li-msg-guide__step">
              <div className="li-msg-guide__step-label">Personalize your message</div>
              <div className="li-msg-guide__fields">
                <Field label="Their first name" value={state.details.recipient} onChange={(v) => onDetailsChange({ recipient: v })} />
                <Field label="Your name / major" value={state.details.yourRole} onChange={(v) => onDetailsChange({ yourRole: v })} />
                <Field label="Their field / industry" value={state.details.field} onChange={(v) => onDetailsChange({ field: v })} />
                <Field label="Company (optional)" value={state.details.company} onChange={(v) => onDetailsChange({ company: v })} />
                <Field label="Role (optional)" value={state.details.role} onChange={(v) => onDetailsChange({ role: v })} />
                <Field label="Context (optional)" value={state.details.context} onChange={(v) => onDetailsChange({ context: v })} />
              </div>
            </div>
          )}

          {state.step === 3 && (
            <div className="li-msg-guide__step">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <div className="li-msg-guide__step-label" style={{ margin: 0 }}>Review & edit your message</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="li-msg-guide__tone-badge">{tone}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{variantLabel}</span>
                  <button className="li-msg-guide__cycle-btn" onClick={onCycle} title="Try another version">Try another</button>
                </div>
              </div>

              <textarea
                className="li-msg-guide__preview"
                value={state.preview || ''}
                onChange={(e) => onPreviewChange(e.target.value)}
                rows={6}
                placeholder="Your message will appear here…"
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="li-msg-guide__insert-btn" onClick={onInsert}>Use this message →</button>
              </div>
            </div>
          )}
        </div>

        <div className="li-msg-guide__tips-panel">
          <div className="li-msg-guide__tips-heading">Quick Tips</div>
          <div className="li-msg-guide__tips-list">
            {!state.goal ? (
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.5 }}>
                Pick a goal to see tailored tips
              </div>
            ) : tips.map((t, idx) => (
              <div key={idx} className="li-msg-guide__tip">- {t}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="li-msg-guide__footer">
        <button className="li-msg-guide__nav-btn" style={{ visibility: state.step > 1 ? 'visible' : 'hidden' }} onClick={onBack}>
          ← Back
        </button>
        <div style={{ flex: 1 }} />
        <button className="li-msg-guide__nav-btn primary" onClick={onNext}>
          {state.step === 3 ? 'Done' : 'Next →'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  const id = React.useMemo(() => 'field-' + Math.random().toString(36).substr(2, 9), []);
  return (
    <div className="li-msg-guide__field-row">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="li-msg-guide__input" value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Profile Readiness Panel (User Story 2)
   ───────────────────────────────────────────────────────────── */
function ProfileReadinessPanel({ readiness, loading, error, onClose, onRefresh }) {
  const s = readiness;

  const [aiData, setAiData] = React.useState(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState(null);

  function fetchAI() {
    setAiLoading(true);
    setAiError(null);
    API.getAIProfileReadiness()
      .then(res => { setAiData(res); setAiLoading(false); })
      .catch(err => { setAiError(err.message || 'AI evaluation failed'); setAiLoading(false); });
  }

  // Auto-run quality analysis when the panel first opens
  React.useEffect(() => { fetchAI(); }, []);

  const displayScore    = aiData?.score ?? 0;
  const displaySections = aiData?.sections ?? [];

  const status      = displayScore >= 80 ? 'good' : displayScore >= 70 ? 'warn' : 'bad';
  const statusLabel = aiData?.level ?? (displayScore >= 80 ? 'All-Star' : displayScore >= 50 ? 'Developing' : 'Beginner');

  // Ring math
  const r = 44;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - (displayScore / 100));

  return (
    <div className="li-msg-score" role="complementary" aria-label="Profile readiness score">
      <div className="li-msg-score__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15 }}>Score</span>
          <span className="li-msg-score__title">Profile Readiness</span>
          <span className="li-msg-score__subtitle">
            {aiData ? 'AI quality score' : 'Improve your profile before outreach'}
          </span>
        </div>
        <button className="li-msg-score__close" onClick={onClose} title="Close">✕</button>
      </div>

      <div className="li-msg-score__body">
        {(loading || aiLoading) && !aiData ? (
          <div style={{ padding: 24, color: 'var(--text-3)', textAlign: 'center' }}>
            <div style={{ fontSize: 14, marginBottom: 6 }}>✦ Analyzing your profile quality…</div>
            <div style={{ fontSize: 12 }}>This takes a few seconds</div>
          </div>
        ) : aiError && !aiData ? (
          <div style={{ padding: 14 }}>
            <div style={{ fontSize: 13, color: 'var(--red)', marginBottom: 10 }}>{aiError}</div>
            <button className="li-msg-score__btn" onClick={fetchAI}>Try again</button>
          </div>
        ) : !aiData ? (
          <div style={{ padding: 14, color: 'var(--text-3)' }}>No score available.</div>
        ) : (
          <div className="li-msg-score__grid">
            <div className="li-msg-score__left">
              <div className={'li-msg-score__summary ' + status}>
                <div className="li-msg-score__ring">
                  <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
                    <circle cx="54" cy="54" r={r} stroke="var(--border)" strokeWidth="8" fill="none" />
                    <circle
                      cx="54" cy="54" r={r}
                      stroke={status === 'good' ? 'var(--green)' : status === 'warn' ? 'var(--gold-dark)' : 'var(--red)'}
                      strokeWidth="8" fill="none"
                      strokeDasharray={circ.toFixed(1)}
                      strokeDashoffset={offset.toFixed(1)}
                      strokeLinecap="round"
                      transform="rotate(-90 54 54)"
                    />
                  </svg>
                  <div className="li-msg-score__ring-text">
                    <div className="li-msg-score__ring-num">{displayScore}</div>
                    <div className="li-msg-score__ring-den">/ 100</div>
                  </div>
                </div>

                <div className="li-msg-score__status">
                  <span className={'li-msg-score__badge ' + status}>{statusLabel}</span>
                  {aiData && <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginTop: 2 }}>AI quality score</span>}
                </div>

                {aiData?.summary ? (
                  <div className="li-msg-score__sub">{aiData.summary}</div>
                ) : (
                  <div className="li-msg-score__sub">Tightening your profile usually increases reply rates.</div>
                )}
                {!!error && <div className="li-msg-score__api-note">{error}</div>}
                {!!aiError && <div className="li-msg-score__api-note" style={{ color: 'var(--red)' }}>{aiError}</div>}
              </div>

              <div className="li-msg-score__breakdown">
                {displaySections.map(sec => {
                  const c = sec.score >= 80 ? 'good' : sec.score >= 40 ? 'warn' : 'bad';
                  return (
                    <div key={sec.key} className="li-msg-score__bar" style={{ marginBottom: sec.feedback ? 8 : 4 }}>
                      <div className="li-msg-score__bar-label">{sec.label}</div>
                      <div className="li-msg-score__bar-track">
                        <div className={'li-msg-score__bar-fill ' + c} style={{ width: `${sec.score}%` }} />
                      </div>
                      <div className={'li-msg-score__bar-pct ' + c}>{sec.score}%</div>
                      {sec.feedback && (
                        <div style={{ fontSize: 11, color: 'var(--text-3)', gridColumn: '1 / -1', lineHeight: 1.4, marginTop: 1 }}>
                          {sec.feedback}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="li-msg-score__right">
              <div className="li-msg-score__card">
                {aiData?.suggestions?.length > 0 ? (
                  <>
                    <div className="li-msg-score__card-title">AI Suggestions</div>
                    <ul style={{ margin: '0 0 12px', paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {aiData.suggestions.map((sg, i) => (
                        <li key={i} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{sg}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="li-msg-score__card-title">Quick fixes</div>
                    <div className="li-msg-score__fixes">
                      {(s.fixes || []).map(f => (
                        <div key={f.key} className="li-msg-score__fix">
                          <div className="li-msg-score__fix-left">
                            <span className={'li-msg-score__dot ' + f.status}></span>
                            <span className="li-msg-score__fix-label">{f.label}</span>
                          </div>
                          {f.status === 'done' ? (
                            <span className="li-msg-score__done">Done</span>
                          ) : (
                            <span className="li-msg-score__todo">Fix</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="li-msg-score__actions">
                  <button
                    className="li-msg-score__btn"
                    onClick={fetchAI}
                    disabled={aiLoading}
                    title="Evaluate profile quality with AI"
                  >
                    {aiLoading ? 'Analyzing…' : aiData ? 'Re-analyze' : '✦ AI Analyze'}
                  </button>
                  <button className="li-msg-score__btn primary" onClick={() => { window.location.hash = 'profile'; }}>
                    Go to profile
                  </button>
                </div>

                {!aiData && (
                  <div className="li-msg-score__note">
                    You can message now — but these fixes usually boost response rates.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="li-msg-score__footer">
        <button className="li-msg-score__footer-btn" onClick={() => { window.location.hash = 'profile'; }}>
          Go to profile
        </button>
        <div style={{ flex: 1 }} />
        <button className="li-msg-score__footer-btn primary" onClick={onClose}>
          Continue messaging
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Old “mock backend” scoring logic (kept as fallback)
   ───────────────────────────────────────────────────────────── */
function mockBackendGetProfileReadiness(user, opts = {}) {
  const jitter = opts.jitter ? (Math.random() * 4 - 2) : 0;
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

  const sections = [
    { key: 'photo', label: 'Photo', score: 67 },
    { key: 'headline', label: 'Headline', score: 42 },
    { key: 'about', label: 'About', score: 30 },
    { key: 'exp', label: 'Experience', score: 60 },
    { key: 'edu', label: 'Education', score: 90 },
    { key: 'skills', label: 'Skills', score: 55 },
  ].map(s => ({ ...s, score: clamp(s.score + jitter) }));

  const score = clamp(sections.reduce((a, b) => a + b.score, 0) / sections.length);

  const fixes = [
    { key: 'photo', label: 'Profile photo', status: score >= 60 ? 'done' : 'warn' },
    { key: 'headline', label: 'Improve headline', status: 'bad' },
    { key: 'about', label: 'Expand About section', status: 'bad' },
    { key: 'skills', label: 'Add 5+ skills', status: 'warn' },
    { key: 'exp', label: 'Add metrics in experience', status: 'warn' },
    { key: 'edu', label: 'Education complete', status: 'done' },
  ];

  const u = user || {};
  const headlineLen = (u.headline || '').trim().length;
  const aboutLen = (u.about || '').trim().length;
  const skillCount = Array.isArray(u.skills) ? u.skills.length : (u.skills ? 1 : 0);

  if (headlineLen >= 35) fixes.find(f => f.key === 'headline').status = 'warn';
  if (headlineLen >= 55) fixes.find(f => f.key === 'headline').status = 'done';
  if (aboutLen >= 120) fixes.find(f => f.key === 'about').status = 'warn';
  if (aboutLen >= 170) fixes.find(f => f.key === 'about').status = 'done';
  if (skillCount >= 8) fixes.find(f => f.key === 'skills').status = 'done';

  return { score, sections, fixes };
}

function computeGuidePreview(state) {
  if (!state || !state.goal) return '';
  const variants = _OUTREACH_TEMPLATES[state.goal] || [];
  if (!variants.length) return '';
  const variant = variants[state.variantIdx % variants.length];
  return variant.template(state.details || {});
}

/* ─────────────────────────────────────────────────────────────
   Outreach guide templates (from your old app.js)
   ───────────────────────────────────────────────────────────── */
const _OUTREACH_GOALS = [
  { key: 'advice', icon: '', label: 'Ask for Advice', desc: 'Career guidance from a pro' },
  { key: 'job', icon: '', label: 'Job / Internship', desc: 'Express interest in a role' },
  { key: 'network', icon: '', label: 'Build Network', desc: 'Connect in your field' },
  { key: 'mentor', icon: '', label: 'Find a Mentor', desc: 'Request ongoing guidance' },
  { key: 'followup', icon: '', label: 'Follow Up', desc: 'After meeting or applying' },
  { key: 'referral', icon: '', label: 'Ask for Referral', desc: 'Request a job referral' },
];

const _OUTREACH_TIPS = {
  advice: [
    'Keep it short (3–5 sentences).',
    'Ask for 15–20 minutes, not “a call sometime”.',
    'End with an easy yes/no question.',
  ],
  job: [
    'Mention the role + why you’re excited (1 line).',
    'Add a quick signal (project/skill) to show fit.',
    'Ask for next step: “open to a quick chat?”',
  ],
  network: [
    'Be specific about why you reached out.',
    'Reference something from their profile if possible.',
    'Don’t ask for too much — ask to connect first.',
  ],
  mentor: [
    'Be respectful with time (20 minutes).',
    'Say what you want advice on (1–2 topics).',
    'Offer flexibility: “anytime next week”.',
  ],
  followup: [
    'Remind them where you met / what you discussed.',
    'Say thanks + one clear next step.',
    'Keep it upbeat, not pushy.',
  ],
  referral: [
    'Ask only after showing fit (skill/project).',
    'Make it easy: “If you’re open to referring…”',
    'Respect a “no” and thank them anyway.',
  ],
};

const _OUTREACH_TEMPLATES = {
  advice: [
    {
      tone: 'Warm',
      template: (d) => `Hi ${d.recipient || '[Name]'},\n\nI'm ${d.yourRole || '[your name/major]'} and I've been following your work in ${d.field || '[their field]'}. I'd love to learn from your experience — would you have 15–20 minutes for a quick chat sometime?\n\nThanks so much for considering it!`,
    },
    {
      tone: 'Professional',
      template: (d) => `Hello ${d.recipient || '[Name]'},\n\nMy name is ${d.yourRole || '[your name]'} and I'm currently studying ${d.field || '[field]'}. I came across your profile and was impressed by your background. I'd greatly appreciate any insights you could share about your career path.\n\nWould you be open to a brief informational chat?`,
    },
  ],
  job: [
    {
      tone: 'Direct',
      template: (d) => `Hi ${d.recipient || '[Name]'},\n\nI saw the ${d.role || '[role]'} opening at ${d.company || '[Company]'} and I’m really interested. I’m ${d.yourRole || '[your name/major]'} with experience in ${d.field || '[skill/area]'}.\n\nWould you be open to a quick chat about the team and what you look for in candidates?`,
    },
    {
      tone: 'Warm',
      template: (d) => `Hi ${d.recipient || '[Name]'},\n\nHope you’re doing well! I’m ${d.yourRole || '[your name/major]'} and I’m exploring opportunities in ${d.field || '[field]'}.\n\nIf you have 10–15 minutes, I’d love to hear what your experience has been like at ${d.company || '[Company]'}.`,
    },
  ],
  network: [
    {
      tone: 'Friendly',
      template: (d) => `Hi ${d.recipient || '[Name]'},\n\nI’m ${d.yourRole || '[your name/major]'} and I’m trying to learn more about ${d.field || '[field]'}.\n\nYour path really stood out to me — would you be open to connecting?`,
    },
    {
      tone: 'Professional',
      template: (d) => `Hello ${d.recipient || '[Name]'},\n\nI’m ${d.yourRole || '[your name/major]'} and I’m building my network in ${d.field || '[field]'}. I’d love to connect and follow your work.\n\nThanks!`,
    },
  ],
  mentor: [
    {
      tone: 'Warm',
      template: (d) => `Hi ${d.recipient || '[Name]'},\n\nI’m ${d.yourRole || '[your name/major]'} and I’m trying to grow in ${d.field || '[field]'}. I’d love to learn from your experience.\n\nWould you be open to a quick 15–20 minute chat sometime?`,
    },
  ],
  followup: [
    {
      tone: 'Polite',
      template: (d) => `Hi ${d.recipient || '[Name]'},\n\nIt was great connecting ${d.context ? `(${d.context})` : 'recently'}. Thanks again for your time.\n\nIf you have a moment, I’d love to follow up on ${d.field || '[topic]'} and ask one quick question.`,
    },
  ],
  referral: [
    {
      tone: 'Respectful',
      template: (d) => `Hi ${d.recipient || '[Name]'},\n\nI’m applying to ${d.company || '[Company]'} for the ${d.role || '[role]'} position. I’m ${d.yourRole || '[your name/major]'} and I’ve been working on ${d.field || '[relevant project/skill]'}.\n\nIf you’re open to it, would you consider referring me? Totally understand if not — I appreciate your time either way.`,
    },
  ],
};

// =============================================================
// TEST EXPORTS (Only active in Node.js/Jest environment)
// =============================================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    MessagingPage,
    OutreachGuidePanel,
    ProfileReadinessPanel,
    mockBackendGetProfileReadiness,
    computeGuidePreview,
    _OUTREACH_GOALS,
    _OUTREACH_TIPS,
    _OUTREACH_TEMPLATES
  };
}