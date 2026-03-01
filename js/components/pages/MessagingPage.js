/* ============================================================
   MESSAGINGPAGE.JS — Conversations list + chat panel
   ============================================================ */
function MessagingPage() {
  const { showToast, setUnreadMessages } = React.useContext(AppContext);
  const { data: conversations, loading } = useFetch(API.getConversations, []);
  const [selectedId, setSelectedId] = React.useState(null);
  const [messages, setMessages] = React.useState([]);
  const [msgLoading, setMsgLoading] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [search, setSearch] = React.useState('');
  const messagesEndRef = React.useRef(null);

  // Auto-select first conversation
  React.useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedId) {
      selectConversation(conversations[0].id);
    }
  }, [conversations]);

  // Mark all read when page mounts
  React.useEffect(() => {
    setUnreadMessages(0);
  }, []);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  function selectConversation(id) {
    setSelectedId(id);
    setMsgLoading(true);
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

  function sendMessage() {
    if (!draft.trim() || !selectedId) return;
    const text = draft.trim();
    setDraft('');
    // Optimistic update
    const newMsg = {
      id: Date.now(),
      senderId: 'me',
      text,
      timestamp: Date.now(),
      isMe: true,
    };
    setMessages(prev => [...prev, newMsg]);
    API.sendMessage(selectedId, text).catch(() => {
      showToast('Failed to send message', 'error');
    });
  }

  if (loading) return <LoadingSpinner text="Loading messages..." />;

  const allConversations = conversations || [];
  const filteredConvs = search
    ? allConversations.filter(c => (c.participantName || '').toLowerCase().includes(search.toLowerCase()))
    : allConversations;
  const selectedConv = allConversations.find(c => c.id === selectedId);

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
                <button className="li-btn li-btn--ghost" style={{ padding: 4 }}
                  onClick={() => showToast('New message — coming soon')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                </button>
                <button className="li-btn li-btn--ghost" style={{ padding: 4 }}
                  onClick={() => showToast('Settings — coming soon')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
                style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                placeholder="Search messages"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', height: 36, border: '1px solid var(--border-2)', borderRadius: 18,
                  padding: '0 12px 0 32px', fontSize: 13, outline: 'none', background: 'var(--bg-2)',
                  boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredConvs.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
                No conversations found
              </div>
            )}
            {filteredConvs.map(conv => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                style={{
                  display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer',
                  borderLeft: selectedId === conv.id ? '3px solid var(--blue)' : '3px solid transparent',
                  background: selectedId === conv.id ? 'var(--bg-2)' : '',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (selectedId !== conv.id) e.currentTarget.style.background = 'var(--bg-2)';
                }}
                onMouseLeave={e => {
                  if (selectedId !== conv.id) e.currentTarget.style.background = '';
                }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar name={conv.participantName} size={48} />
                  {conv.isOnline && (
                    <div style={{
                      position: 'absolute', bottom: 2, right: 2,
                      width: 10, height: 10, borderRadius: '50%',
                      background: '#057642', border: '2px solid var(--white)',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: conv.unreadCount ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.participantName}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', flexShrink: 0, marginLeft: 4 }}>
                      {conv.lastMessageTime ? formatTime(conv.lastMessageTime) : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: conv.unreadCount ? 600 : 400 }}>
                    {conv.lastMessage || 'No messages yet'}
                  </div>
                  {conv.unreadCount > 0 && (
                    <div style={{
                      display: 'inline-block', background: 'var(--blue)', color: '#fff',
                      borderRadius: 10, padding: '1px 6px', fontSize: 11, marginTop: 2,
                    }}>
                      {conv.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!selectedConv ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-2)' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.2, marginBottom: 12 }}>
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
              <p>Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar name={selectedConv.participantName} size={40} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                    onClick={() => navigate(`profile?id=${selectedConv.participantId}`)}>
                    {selectedConv.participantName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{selectedConv.participantTitle || ''}</div>
                </div>
                <button className="li-btn li-btn--ghost" style={{ padding: 6 }}
                  onClick={() => showToast('More options — coming soon')}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                  </svg>
                </button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {msgLoading ? (
                  <LoadingSpinner text="Loading messages..." />
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 13, marginTop: 40 }}>
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={msg.id || i} style={{
                      display: 'flex',
                      justifyContent: msg.isMe ? 'flex-end' : 'flex-start',
                      marginBottom: 10,
                      gap: 8,
                      alignItems: 'flex-end',
                    }}>
                      {!msg.isMe && <Avatar name={selectedConv.participantName} size={32} />}
                      <div style={{
                        maxWidth: '65%',
                        background: msg.isMe ? 'var(--blue)' : 'var(--bg-2)',
                        color: msg.isMe ? '#fff' : 'var(--text)',
                        borderRadius: msg.isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        padding: '8px 12px',
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}>
                        <div>{msg.text}</div>
                        <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7, textAlign: 'right' }}>
                          {msg.timestamp ? formatTime(msg.timestamp) : ''}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <div style={{ flex: 1, border: '1px solid var(--border-2)', borderRadius: 20, padding: '8px 14px', minHeight: 38, display: 'flex', alignItems: 'center' }}>
                  <textarea
                    placeholder="Write a message…"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    style={{
                      width: '100%', border: 'none', outline: 'none', resize: 'none',
                      fontSize: 14, fontFamily: 'inherit', background: 'transparent',
                      lineHeight: 1.4, minHeight: 22, maxHeight: 80,
                    }}
                    rows={1}
                  />
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button className="li-btn li-btn--ghost" style={{ padding: 6 }}
                    onClick={() => showToast('Attachments — coming soon')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
                    </svg>
                  </button>
                  <button
                    className="li-btn li-btn--primary"
                    style={{ borderRadius: '50%', width: 38, height: 38, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    disabled={!draft.trim()}
                    onClick={sendMessage}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
