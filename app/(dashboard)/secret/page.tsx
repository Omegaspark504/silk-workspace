'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Header from '../../Header';
import Toast from '../../components/Toast';
import { useSSE } from '../../hooks/useSSE';
import styles from './Secret.module.css';

type OtherUser = { id: string; name: string; email: string; image: string | null };
type Thread    = { _id: string; lastMessage: string; lastAt: string; other: OtherUser | null };
type Message   = { _id: string; fromUserId: string; content: string; createdAt: string };

export default function SecretPage() {
  const { data: session } = useSession();
  const myId = (session?.user as any)?.id as string | undefined;

  const [threads,       setThreads]       = useState<Thread[]>([]);
  const [activeThread,  setActiveThread]  = useState<Thread | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [draft,         setDraft]         = useState('');
  const [sending,       setSending]       = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [msgLoading,    setMsgLoading]    = useState(false);

  const [newOpen,       setNewOpen]       = useState(false);
  const [newEmail,      setNewEmail]      = useState('');
  const [newError,      setNewError]      = useState('');
  const [newLoading,    setNewLoading]    = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', icon: 'check_circle' });
  const showToast = (message: string, icon = 'check_circle') =>
    setToast({ show: true, message, icon });

  const bottomRef = useRef<HTMLDivElement>(null);
  const activeThreadRef = useRef(activeThread);
  useEffect(() => { activeThreadRef.current = activeThread; }, [activeThread]);

  // Real-time: incoming secret messages from the other participant
  useSSE((event) => {
    if (event.type === 'new_secret_message') {
      const { threadId, message } = event as { threadId: string; message: Message };

      setThreads(prev => {
        const exists = prev.some(t => t._id === threadId);
        if (exists) {
          return prev.map(t =>
            t._id === threadId
              ? { ...t, lastMessage: message.content, lastAt: message.createdAt }
              : t
          );
        }
        // Thread not in list yet (sender just created it) — fetch and prepend
        fetch(`/api/secret/${threadId}`)
          .then(r => r.ok ? r.json() : null)
          .then(data => {
            if (!data?.thread) return;
            setThreads(cur => cur.some(t => t._id === threadId) ? cur : [data.thread, ...cur]);
          })
          .catch(() => {});
        return prev;
      });

      // Append to messages only if this thread is currently open
      if (activeThreadRef.current?._id === threadId) {
        setMessages(prev => {
          if (prev.some(m => m._id === (message as any)._id)) return prev;
          return [...prev, message];
        });
      } else {
        showToast('New secret message', 'lock');
      }
    }
  }, !!session);

  // Load thread list
  useEffect(() => {
    fetch('/api/secret')
      .then(r => r.ok ? r.json() : [])
      .then(setThreads)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Load messages when active thread changes
  useEffect(() => {
    if (!activeThread) return;
    setMsgLoading(true);
    fetch(`/api/secret/${activeThread._id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setMessages(data.messages); })
      .catch(() => {})
      .finally(() => setMsgLoading(false));
  }, [activeThread?._id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openThread = (thread: Thread) => {
    setActiveThread(thread);
    setDraft('');
  };

  const sendMessage = async () => {
    if (!draft.trim() || !activeThread || sending) return;
    const content = draft.trim();
    setDraft('');
    setSending(true);

    // Optimistic insert
    const optimistic: Message = {
      _id: `opt-${Date.now()}`,
      fromUserId: myId || '',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/secret/${activeThread._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Revert optimistic message
        setMessages(prev => prev.filter(m => m._id !== optimistic._id));
        showToast(data.error || 'Failed to send', 'error');
        setDraft(content);
        return;
      }
      // Replace optimistic with real
      setMessages(prev => prev.map(m => m._id === optimistic._id ? data : m));
      // Update thread preview
      setThreads(prev => prev.map(t =>
        t._id === activeThread._id
          ? { ...t, lastMessage: content, lastAt: new Date().toISOString() }
          : t
      ));
    } catch {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      showToast('Connection error', 'error');
      setDraft(content);
    } finally {
      setSending(false);
    }
  };

  const startNewThread = async () => {
    if (!newEmail.trim()) { setNewError('Enter an email address.'); return; }
    setNewError('');
    setNewLoading(true);

    try {
      const res = await fetch('/api/secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) { setNewError(data.error || 'Failed to start thread.'); return; }

      // If thread already in list, just activate it; otherwise prepend
      setThreads(prev => {
        const exists = prev.find(t => t._id === data.threadId);
        if (exists) return prev;
        return [{ _id: data.threadId, lastMessage: '', lastAt: new Date().toISOString(), other: data.other }, ...prev];
      });

      const thread = threads.find(t => t._id === data.threadId) ||
        { _id: data.threadId, lastMessage: '', lastAt: new Date().toISOString(), other: data.other };

      setActiveThread(thread as Thread);
      setMessages([]);
      setNewOpen(false);
      setNewEmail('');
    } catch {
      setNewError('Connection error. Try again.');
    } finally {
      setNewLoading(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return formatTime(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const initials = (name?: string | null) =>
    name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';

  return (
    <>
      <Header title="Secret Letters" />
      <main className={styles.main}>

        {/* ── Thread list ───────────────────────────── */}
        <div className={styles.listCol}>
          <div className={styles.listHeader}>
            <span className={styles.listTitle}>Conversations</span>
            <button className={styles.newBtn} onClick={() => { setNewOpen(true); setNewEmail(''); setNewError(''); }}>
              <span className="material-symbols-outlined">add</span>
              New
            </button>
          </div>

          <div className={styles.threadGroup}>
            {loading ? (
              <div className={styles.emptyState}>
                <p>Loading…</p>
              </div>
            ) : threads.length === 0 ? (
              <div className={styles.emptyState}>
                <span className="material-symbols-outlined">lock</span>
                <p>No secret conversations yet.<br />Hit <strong>New</strong> to start one.</p>
              </div>
            ) : (
              threads.map(thread => (
                <button
                  key={thread._id}
                  className={`${styles.threadCard} ${activeThread?._id === thread._id ? styles.threadCardActive : ''}`}
                  onClick={() => openThread(thread)}
                >
                  <div className={styles.threadAvatar}>
                    {thread.other?.image
                      ? <img src={thread.other.image} alt={thread.other.name} />
                      : initials(thread.other?.name)}
                  </div>
                  <div className={styles.threadInfo}>
                    <div className={styles.threadName}>{thread.other?.name || 'Unknown'}</div>
                    <div className={styles.threadPreview}>
                      {thread.lastMessage || <em>No messages yet</em>}
                    </div>
                  </div>
                  <span className={styles.threadTime}>{formatDate(thread.lastAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Chat panel ────────────────────────────── */}
        {activeThread ? (
          <div className={styles.chatCol}>
            {/* Header */}
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderAvatar}>
                {activeThread.other?.image
                  ? <img src={activeThread.other.image} alt={activeThread.other.name} />
                  : initials(activeThread.other?.name)}
              </div>
              <div>
                <div className={styles.chatHeaderName}>{activeThread.other?.name || 'Unknown'}</div>
                <div className={styles.chatHeaderEmail}>{activeThread.other?.email || ''}</div>
              </div>
              <div className={styles.secretBadge}>
                <span className="material-symbols-outlined">lock</span>
                Private
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messages}>
              {msgLoading ? (
                <div className={styles.noMessages}>Loading messages…</div>
              ) : messages.length === 0 ? (
                <div className={styles.noMessages}>No messages yet. Say hello!</div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.fromUserId === myId;
                  return (
                    <div key={msg._id} className={`${styles.msgRow} ${isOwn ? styles.msgRowOwn : ''}`}>
                      {!isOwn && (
                        <div className={styles.msgAvatar}>
                          {activeThread.other?.image
                            ? <img src={activeThread.other.image} alt="" />
                            : initials(activeThread.other?.name)}
                        </div>
                      )}
                      <div className={`${styles.msgBubble} ${isOwn ? styles.msgBubbleOwn : ''}`}>
                        {msg.content}
                      </div>
                      <span className={`${styles.msgTime} ${isOwn ? styles.msgTimeOwn : ''}`}>
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Send bar */}
            <div className={styles.sendBar}>
              <input
                className={styles.sendInput}
                placeholder="Write a secret letter…"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <button className={styles.sendBtn} onClick={sendMessage} disabled={!draft.trim() || sending}>
                <span className="material-symbols-outlined">send</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <span className="material-symbols-outlined">lock</span>
            <p>Select a conversation or start a new one.</p>
          </div>
        )}

      </main>

      {/* ── New thread modal ──────────────────────── */}
      {newOpen && (
        <div className={styles.modalOverlay} onClick={() => setNewOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>
              <span className="material-symbols-outlined">lock</span>
              New Secret Conversation
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
              Enter the email of another Silk user. Only the two of you will ever see these messages.
            </p>
            <input
              type="email"
              className={styles.modalInput}
              placeholder="their@email.com"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setNewError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') startNewThread(); }}
              autoFocus
            />
            {newError && (
              <div className={styles.modalError}>
                <span className="material-symbols-outlined">error</span>
                {newError}
              </div>
            )}
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setNewOpen(false)}>Cancel</button>
              <button className={styles.startBtn} onClick={startNewThread} disabled={newLoading}>
                {newLoading ? 'Starting…' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        show={toast.show}
        message={toast.message}
        icon={toast.icon}
        onClose={() => setToast({ ...toast, show: false })}
      />
    </>
  );
}
