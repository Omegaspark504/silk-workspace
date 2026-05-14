'use client';

import { useState, useEffect } from 'react';
import Header from '../../Header';
import Toast from '../../components/Toast';
import styles from './Notes.module.css';

export default function NotesPage() {
  const [notes, setNotes] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ show: false, message: '', icon: 'check_circle' });

  // Add debouncing state for auto-save
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  const activeNote = notes.find(n => n._id === activeId) || null;

  const showToast = (message: string, icon = 'check_circle') => {
    setToast({ show: true, message, icon });
  };

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch('/api/notes');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setNotes(data);
        if (data.length > 0 && !activeId) {
          setActiveId(data[0]._id);
        }
      } catch (err) {
        console.error(err);
        showToast('Error loading notes', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotes();
  }, []);

  const handleAddNote = async () => {
    const newNoteTemplate = {
      title: 'Untitled Note',
      time: 'Just now',
      preview: 'Start writing your note here...',
      tags: [],
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      folder: 'Uncategorized',
      content: ''
    };

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNoteTemplate)
      });
      if (!res.ok) throw new Error('Failed to create');
      const createdNote = await res.json();
      setNotes([createdNote, ...notes]);
      setActiveId(createdNote._id);
      showToast('New note created', 'note_add');
    } catch (err) {
      console.error(err);
      showToast('Error creating note', 'error');
    }
  };

  const handleDeleteNote = async () => {
    if (!activeNote) return;
    try {
      const res = await fetch(`/api/notes/${activeNote._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      const remainingNotes = notes.filter(n => n._id !== activeNote._id);
      setNotes(remainingNotes);
      setActiveId(remainingNotes.length > 0 ? remainingNotes[0]._id : null);
      showToast('Note deleted', 'delete');
    } catch (err) {
      console.error(err);
      showToast('Error deleting note', 'error');
    }
  };

  const updateNoteInDB = async (id: string, updates: any) => {
    try {
      await fetch(`/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeId) return;
    const newTitle = e.target.value;
    setNotes(notes.map(n => n._id === activeId ? { ...n, title: newTitle } : n));
    
    // Auto-save debounce
    if (saveTimeout) clearTimeout(saveTimeout);
    setSaveTimeout(setTimeout(() => {
      updateNoteInDB(activeId, { title: newTitle });
    }, 1000));
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeId) return;
    const content = e.target.value;
    const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
    
    setNotes(notes.map(n => n._id === activeId ? { ...n, content, preview: preview || 'Empty note...' } : n));
    
    // Auto-save debounce
    if (saveTimeout) clearTimeout(saveTimeout);
    setSaveTimeout(setTimeout(() => {
      updateNoteInDB(activeId, { content, preview: preview || 'Empty note...' });
    }, 1000));
  };

  if (isLoading) {
    return (
      <>
        <Header title="Minimalist Workspace" />
        <main className={styles.main} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: 'var(--on-surface-variant)' }}>Loading notes...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Minimalist Workspace" />
      <main className={`${styles.main} ${activeId ? styles.mainHasActive : ''}`}>
        <div className={styles.listCol}>
          <div className={styles.listHeader}>
            <h3 className={styles.listTitle}>All Notes</h3>
            <button className={styles.addBtn} onClick={handleAddNote}>
              <span className="material-symbols-outlined">add</span>
            </button>
          </div>

          {notes.length === 0 ? (
            <div className={styles.cardGroup} style={{ padding: '2rem', textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: '0.85rem' }}>
              No notes yet. Hit + to create one.
            </div>
          ) : (
            <div className={styles.cardGroup}>
              {notes.map(note => (
                <div 
                  key={note._id}
                  className={`${styles.card} ${activeId === note._id ? styles.cardActive : ''}`}
                  onClick={() => setActiveId(note._id)}
                >
                  <div className={styles.cardTop}>
                    <h4 className={activeId === note._id ? styles.cardTitleActive : styles.cardTitle}>{note.title}</h4>
                    <span className={styles.cardTime}>{note.time}</span>
                  </div>
                  <p className={styles.cardPreview}>{note.preview}</p>
                  {note.tags && note.tags.length > 0 && (
                    <div className={styles.cardTags}>
                      {note.tags.map((tag: string) => (
                        <span key={tag} className={`${styles.tag} ${activeId === note._id ? styles.tagActive : ''}`}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.editorCol}>
          {activeNote ? (
            <div className={styles.editorContainer}>
              <button className={styles.backBtn} onClick={() => setActiveId(null)}>
                <span className="material-symbols-outlined">arrow_back</span>
                Back to notes
              </button>
              <input
                className={styles.editorTitle}
                type="text"
                placeholder="Note Title"
                value={activeNote.title}
                onChange={handleTitleChange}
              />
              
              <div className={styles.editorMeta}>
                <div className={styles.metaBadge}>
                  <span className="material-symbols-outlined">calendar_today</span>
                  <span>{activeNote.date}</span>
                </div>
                <div className={styles.metaBadge}>
                  <span className="material-symbols-outlined">folder</span>
                  <span className={styles.metaFolder}>{activeNote.folder}</span>
                </div>
                <button className={styles.deleteBtn} onClick={handleDeleteNote}>
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>

              <textarea 
                className={styles.editorContent}
                value={activeNote.content}
                onChange={handleContentChange}
                placeholder="Start writing your note here..."
              />
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--on-surface-variant)' }}>
              Select or create a note to start writing.
            </div>
          )}
        </div>
      </main>

      <Toast 
        show={toast.show} 
        message={toast.message} 
        icon={toast.icon} 
        onClose={() => setToast({ ...toast, show: false })} 
      />
    </>
  );
}
