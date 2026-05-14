'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Header from '../../Header';
import Toast from '../../components/Toast';
import { useSSE } from '../../hooks/useSSE';
import styles from './Inbox.module.css';

function InboxContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();

  const [letters, setLetters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', icon: 'check_circle' });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Compose modal state
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  // Quick reply footer state (kept separate from compose modal to avoid shared-state bugs)
  const [quickReplyBody, setQuickReplyBody] = useState('');

  useEffect(() => {
    if (searchParams.get('compose') === 'true') {
      setComposeOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchLetters = async () => {
      try {
        const res = await fetch('/api/inbox');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setLetters(data);
        if (data.length > 0 && !activeId) {
          setActiveId(data[0]._id);
        }
      } catch (err) {
        console.error(err);
        showToast('Error loading inbox', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLetters();
  }, []);

  // Real-time: prepend new letters delivered to this user by other users
  useSSE((event) => {
    if (event.type === 'new_letter') {
      const letter = event.letter as any;
      setLetters(prev => {
        if (prev.some(l => l._id === letter._id)) return prev;
        return [letter, ...prev];
      });
      showToast(`New letter from ${letter.sender}`, 'mail');
    }
  }, !!session);

  const activeLetter = letters.find(l => l._id === activeId) || null;

  const formatLetterTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter letters by search query (sender, subject, preview)
  const filteredLetters = searchQuery.trim()
    ? letters.filter(l =>
        l.sender?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.preview?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : letters;

  const showToast = (message: string, icon = 'check_circle') => {
    setToast({ show: true, message, icon });
  };

  const [composeError, setComposeError] = useState('');

  const handleAction = async (action: string) => {
    if (action === 'send') {
      if (!composeTo.trim())    { setComposeError('Enter a recipient email address.'); return; }
      if (!composeSubject.trim()) { setComposeError('Subject cannot be empty.'); return; }
      if (!composeBody.trim())    { setComposeError('Message body cannot be empty.'); return; }

      setComposeError('');
      try {
        const res = await fetch('/api/inbox', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: composeTo, subject: composeSubject, content: composeBody }),
        });
        const data = await res.json();
        if (!res.ok) { setComposeError(data.error || 'Failed to send.'); return; }

        showToast(`Letter sent to ${data.recipientName || composeTo}`, 'send');
        setComposeOpen(false);
        setComposeTo(''); setComposeSubject(''); setComposeBody(''); setComposeError('');
        router.push('/inbox');
      } catch (err) {
        console.error(err);
        setComposeError('Connection error. Please try again.');
      }
      return;
    }

    if (!activeLetter) return;

    if (action === 'delete' || action === 'archive') {
      try {
        const res = await fetch(`/api/inbox/${activeLetter._id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete/archive');

        const remainingLetters = letters.filter(l => l._id !== activeLetter._id);
        setLetters(remainingLetters);
        setActiveId(remainingLetters.length > 0 ? remainingLetters[0]._id : null);
        showToast(action === 'delete' ? 'Letter deleted' : 'Letter archived', action === 'delete' ? 'delete' : 'archive');
      } catch (err) {
        console.error(err);
        showToast('Error processing action', 'error');
      }
    } else if (action === 'reply') {
      setComposeTo(activeLetter.senderEmail || '');
      setComposeSubject(`Re: ${activeLetter.subject}`);
      setComposeError('');
      setComposeOpen(true);
    }
  };

  const handleQuickReply = async () => {
    if (!quickReplyBody.trim() || !activeLetter) return;
    if (!activeLetter.senderEmail) {
      showToast('Cannot reply — sender email unknown', 'error');
      return;
    }

    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: activeLetter.senderEmail,
          subject: `Re: ${activeLetter.subject}`,
          content: quickReplyBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.error || 'Failed to send reply', 'error'); return; }
      setQuickReplyBody('');
      showToast('Reply sent', 'send');
    } catch (err) {
      console.error(err);
      showToast('Error sending reply', 'error');
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Silk Inbox" />
        <main className={styles.main} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: 'var(--on-surface-variant)' }}>Loading inbox...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Silk Inbox" />
      <main className={styles.main}>

        {/* ── Gmail-style search bar ─────────────────── */}
        <div className={styles.gmailSearch}>
          <div className={styles.gmailSearchInner}>
            <button className={styles.gmailSearchIcon} onClick={() => {}} aria-label="Search">
              <span className="material-symbols-outlined">search</span>
            </button>
            <input
              type="text"
              className={styles.gmailSearchInput}
              placeholder="Search in mail"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                className={styles.gmailSearchClear}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Two-column layout ──────────────────────── */}
        <div className={styles.columns}>
          <div className={styles.listCol}>
            <div className={styles.listHeader}>
              <h2 className={styles.listTitle}>Inbox</h2>
              <span className={styles.unreadBadge}>{letters.length} Messages</span>
            </div>

            {filteredLetters.length === 0 ? (
              <div className={styles.listGroup} style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.875rem' }}>
                {searchQuery ? `No results for "${searchQuery}"` : 'No messages yet.'}
              </div>
            ) : (
              <div className={styles.listGroup}>
                {filteredLetters.map(letter => (
                  <button
                    key={letter._id}
                    onClick={() => { setActiveId(letter._id); setQuickReplyBody(''); }}
                    className={`${styles.card} ${activeId === letter._id ? styles.cardActive : ''} ${letter.isSystem ? styles.cardDimmed : ''}`}
                  >
                    <div className={styles.cardTop}>
                      <span className={styles.cardAuthor}>{letter.sender}</span>
                      <span className={styles.cardTime}>{formatLetterTime(letter.createdAt)}</span>
                    </div>
                    <h3 className={styles.cardSubject}>{letter.subject}</h3>
                    <p className={styles.cardPreview}>{letter.preview}</p>
                    {letter.tag && (
                      <div className={styles.cardTags}>
                        <span className={letter.isSystem ? styles.tagSystem : styles.tag}>{letter.tag}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

        <div className={styles.readCol}>
          {activeLetter ? (
            <>
              <div className={styles.readHeader}>
                <div className={styles.readProfile}>
                  <div className={styles.readAvatar}>
                    {activeLetter.avatar
                      ? <img src={activeLetter.avatar} alt={activeLetter.sender} />
                      : <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                          {activeLetter.sender?.[0]?.toUpperCase() || '?'}
                        </span>
                    }
                  </div>
                  <div>
                    <h2 className={styles.readName}>{activeLetter.sender}</h2>
                    <div className={styles.readMeta}>
                      <span>{activeLetter.senderEmail || activeLetter.email || 'no-reply@workspace.local'}</span>
                      <span className={styles.dot}></span>
                      <span>To: me</span>
                      {activeLetter.createdAt && (
                        <>
                          <span className={styles.dot}></span>
                          <span>{new Date(activeLetter.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.readActions}>
                  <button className={`${styles.actionBtn} ${styles.actionBtnPrimary}`} onClick={() => handleAction('reply')}>
                    <span className="material-symbols-outlined">reply</span>
                  </button>
                  <button className={styles.actionBtn} onClick={() => handleAction('archive')}>
                    <span className="material-symbols-outlined">archive</span>
                  </button>
                  <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => handleAction('delete')}>
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              <div className={styles.readContent}>
                <div className={styles.readBody}>
                  <h1 className={styles.bodyTitle}>{activeLetter.subject}</h1>
                  <div className={styles.prose}>
                    {/* Simplified for string content from DB */}
                    {typeof activeLetter.content === 'string' ? (
                      <p style={{ whiteSpace: 'pre-wrap' }}>{activeLetter.content}</p>
                    ) : (
                      <p>Content not available</p>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.replyFooter}>
                <div className={styles.replyAvatar}>
                  {session?.user?.image
                    ? <img src={session.user.image} alt="Me" />
                    : <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        {session?.user?.name?.charAt(0).toUpperCase() || 'M'}
                      </span>
                  }
                </div>
                <div className={styles.replyInputWrap}>
                  <input
                    className={styles.replyInput}
                    placeholder="Draft a quick reply..."
                    type="text"
                    value={quickReplyBody}
                    onChange={e => setQuickReplyBody(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleQuickReply(); }}
                  />
                  <button className={styles.sendBtn} onClick={handleQuickReply}>
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconRing}>
                <span className="material-symbols-outlined">mail</span>
              </div>
              <h2 className={styles.emptyTitle}>Your inbox is ready</h2>
              <p className={styles.emptySubtitle}>
                Pick a letter from the list, or write something to someone new.
              </p>
              <button className={styles.emptyComposeBtn} onClick={() => setComposeOpen(true)}>
                <span className="material-symbols-outlined">edit_square</span>
                Compose a letter
              </button>
              <div className={styles.emptyHints}>
                <div className={styles.emptyHint}>
                  <span className="material-symbols-outlined">reply</span>
                  <span>Reply directly from the read view</span>
                </div>
                <div className={styles.emptyHint}>
                  <span className="material-symbols-outlined">lock</span>
                  <span>Send private messages via Secret Letters</span>
                </div>
                <div className={styles.emptyHint}>
                  <span className="material-symbols-outlined">search</span>
                  <span>Use the search bar above to find any letter</span>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>{/* end .columns */}

        <button className={styles.fab} onClick={() => setComposeOpen(true)}>
          <span className="material-symbols-outlined">edit_square</span>
          <span>Compose</span>
        </button>
      </main>

      {composeOpen && (
        <div className={styles.modalOverlay} onClick={() => { setComposeOpen(false); setComposeError(''); router.push('/inbox'); }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>New Letter</h2>
              <button className={styles.closeBtn} onClick={() => { setComposeOpen(false); setComposeError(''); router.push('/inbox'); }}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className={styles.modalBody}>
              {composeError && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
                  {composeError}
                </p>
              )}
              <input
                type="email"
                className={styles.modalInput}
                placeholder="To (email address)"
                value={composeTo}
                onChange={e => { setComposeTo(e.target.value); setComposeError(''); }}
              />
              <input 
                type="text" 
                className={styles.modalInput} 
                placeholder="Subject" 
                value={composeSubject}
                onChange={e => setComposeSubject(e.target.value)}
              />
              <textarea 
                className={`${styles.modalInput} ${styles.modalTextarea}`} 
                placeholder="Write your message..."
                value={composeBody}
                onChange={e => setComposeBody(e.target.value)}
              ></textarea>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalSendBtn} onClick={() => handleAction('send')}>
                <span className="material-symbols-outlined">send</span>
                Send Letter
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

export default function InboxPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InboxContent />
    </Suspense>
  );
}
