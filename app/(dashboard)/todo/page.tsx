'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '../../Header';
import Toast from '../../components/Toast';
import styles from './Todo.module.css';

export default function TodoPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [drawerLetters, setDrawerLetters] = useState<any[]>([]);
  
  const [toast, setToast] = useState({ show: false, message: '', icon: 'check_circle' });
  const [editingTask, setEditingTask] = useState<any>(null);

  const pendingTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);

  const showToast = (message: string, icon = 'check_circle') => {
    setToast({ show: true, message, icon });
  };

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const res = await fetch('/api/todos');
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setTasks(data);
      } catch (err) {
        console.error(err);
        showToast('Error loading tasks', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTodos();
  }, []);

  useEffect(() => {
    const fetchDrawerLetters = async () => {
      try {
        const res = await fetch('/api/secret');
        if (!res.ok) return;
        const data = await res.json();
        setDrawerLetters(data.slice(0, 3));
      } catch {
        // Drawer is non-critical — silently fail
      }
    };
    fetchDrawerLetters();
  }, []);

  const toggleTask = async (id: string, isCurrentlyCompleted: boolean) => {
    const completing = !isCurrentlyCompleted;
    
    // Optimistic UI update
    setTasks(tasks.map(t => t._id === id ? { ...t, isCompleted: completing } : t));
    if (completing) showToast('Task completed!', 'task_alt');

    try {
      await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: completing })
      });
    } catch (err) {
      console.error(err);
      // Revert if error
      setTasks(tasks.map(t => t._id === id ? { ...t, isCompleted: isCurrentlyCompleted } : t));
      showToast('Error updating task', 'error');
    }
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    
    const newTaskTemplate = {
      title: newTaskTitle,
      category: 'General',
      isCompleted: false,
      desc: null,
      isPrimary: false,
      progress: null
    };

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskTemplate)
      });
      if (!res.ok) throw new Error('Failed to create');
      const createdTask = await res.json();
      setTasks([createdTask, ...tasks]);
      setNewTaskTitle('');
      showToast('Task added', 'add_task');
    } catch (err) {
      console.error(err);
      showToast('Error creating task', 'error');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addTask();
    }
  };

  const deleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      
      setTasks(tasks.filter(t => t._id !== id));
      showToast('Task deleted', 'delete');
    } catch (err) {
      console.error(err);
      showToast('Error deleting task', 'error');
    }
  };

  const openEditModal = (task: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTask({ ...task });
  };

  const saveEditedTask = async () => {
    if (!editingTask) return;
    
    // Optimistic UI update
    setTasks(tasks.map(t => t._id === editingTask._id ? editingTask : t));
    const taskToSave = { ...editingTask };
    setEditingTask(null);

    try {
      await fetch(`/api/todos/${taskToSave._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: taskToSave.title, 
          category: taskToSave.category, 
          desc: taskToSave.desc 
        })
      });
      showToast('Task updated', 'edit');
    } catch (err) {
      console.error(err);
      showToast('Error updating task', 'error');
    }
  };

  // Progress ring math
  const totalTasks = tasks.length;
  const donePct = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;
  const circumference = 2 * Math.PI * 15.9; // r=15.9
  const dashFill = (donePct / 100) * circumference;

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  if (isLoading) {
    return (
      <>
        <Header title="Minimalist Workspace" />
        <main className={styles.main} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <p style={{ color: 'var(--on-surface-variant)' }}>Loading tasks...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Header title="Minimalist Workspace" />
      <main className={styles.main} style={{ paddingRight: drawerOpen ? '23rem' : '2rem' }}>
        <div className={styles.container}>

          {/* ── Header ──────────────────────────────── */}
          <header className={styles.header}>
            <div className={styles.headerRow}>
              <div className={styles.headerLeft}>
                <p className={styles.headerDate}>{todayLabel}</p>
                <h2 className={styles.title}>Focus</h2>
                <p className={styles.subtitle}>
                  {pendingTasks.length === 0
                    ? 'All clear — nothing left to do!'
                    : `${pendingTasks.length} task${pendingTasks.length !== 1 ? 's' : ''} remaining`}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Progress ring */}
                <div className={styles.progressRing}>
                  <svg viewBox="0 0 36 36" className={styles.progressRingSvg}>
                    <circle cx="18" cy="18" r="15.9" className={styles.progressRingTrack} />
                    <circle
                      cx="18" cy="18" r="15.9"
                      className={styles.progressRingFill}
                      strokeDasharray={`${dashFill} ${circumference - dashFill}`}
                      strokeDashoffset="0"
                    />
                  </svg>
                  <span className={styles.progressRingLabel}>
                    {donePct}%
                    <small>done</small>
                  </span>
                </div>

                {/* Drawer toggle */}
                {!drawerOpen && (
                  <button className={styles.drawerToggle} onClick={() => setDrawerOpen(true)}>
                    <span className="material-symbols-outlined">lock</span>
                  </button>
                )}
              </div>
            </div>

            {/* Add task input */}
            <div className={styles.addInputWrap}>
              <div className={styles.addInputPrefix}>
                <span className="material-symbols-outlined">add_task</span>
              </div>
              <input
                type="text"
                className={styles.addInput}
                placeholder="Add a new task and press Enter…"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleKeyPress}
              />
              <button className={styles.addBtn} onClick={addTask}>
                <span className="material-symbols-outlined">add</span>
              </button>
            </div>
          </header>

          {/* ── Task list ────────────────────────────── */}
          {pendingTasks.length > 0 && (
            <div className={styles.sectionLabel}>
              <span className={styles.sectionLabelText}>Pending</span>
              <div className={styles.sectionLabelLine} />
            </div>
          )}

          {pendingTasks.length === 0 ? (
            <div className={styles.emptyTasks}>
              <span className={`material-symbols-outlined ${styles.emptyTasksIcon}`}>task_alt</span>
              <p className={styles.emptyTasksText}>You&apos;re all caught up!</p>
              <p className={styles.emptyTasksSub}>Add a new task above to get started.</p>
            </div>
          ) : (
            <div className={styles.taskList}>
              {pendingTasks.map(task => (
                <div
                  key={task._id}
                  className={`${styles.card} ${task.isPrimary ? styles.cardPrimary : ''}`}
                  onClick={() => toggleTask(task._id, task.isCompleted)}
                >
                  <div className={styles.cardAccent} />
                  <div className={styles.cardInner}>
                    <div className={styles.cardTop}>
                      <div className={styles.checkCircle}>
                        <span className="material-symbols-outlined">check</span>
                      </div>
                      <h3 className={styles.cardTitle}>{task.title}</h3>
                      <span className={`${styles.tag} ${task.isPrimary ? styles.tagPrimary : ''}`}>
                        {task.category}
                      </span>
                    </div>
                    {task.desc && <p className={styles.cardDesc}>{task.desc}</p>}
                    {task.progress !== null && (
                      <div className={styles.progressWrap}>
                        <div className={styles.progressBar}>
                          <div className={styles.progressFill} style={{ width: `${task.progress}%` }} />
                        </div>
                        <p className={styles.progressText}>{task.progress}% complete</p>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardActions}>
                    <button className={styles.actionBtn} onClick={(e) => openEditModal(task, e)}>
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button className={styles.actionBtn} onClick={(e) => deleteTask(task._id, e)}>
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Completed section ────────────────────── */}
          {completedTasks.length > 0 && (
            <div className={styles.completedSection}>
              <button className={styles.completedToggle} onClick={() => setCompletedOpen(!completedOpen)}>
                <span
                  className={`material-symbols-outlined ${styles.completedChevron}`}
                  style={{ transform: completedOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  chevron_right
                </span>
                <span className={styles.completedTitle}>Completed</span>
                <span className={styles.completedCount}>{completedTasks.length}</span>
              </button>

              {completedOpen && (
                <div className={styles.completedList}>
                  {completedTasks.map(task => (
                    <div
                      key={task._id}
                      className={styles.completedItem}
                      onClick={(e) => { e.stopPropagation(); toggleTask(task._id, task.isCompleted); }}
                    >
                      <div className={styles.completedCheck}>
                        <span className="material-symbols-outlined">check</span>
                      </div>
                      <h3 className={styles.completedText}>{task.title}</h3>
                      <button
                        className={styles.actionBtn}
                        onClick={(e) => deleteTask(task._id, e)}
                        style={{ opacity: 0.45, marginLeft: 'auto' }}
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {drawerOpen && (
          <aside className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <div>
                <h2 className={styles.drawerTitle}>Secret Letters</h2>
                <p className={styles.drawerSubtitle}>Private conversations</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setDrawerOpen(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className={styles.drawerList}>
              {drawerLetters.length === 0 ? (
                <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.85rem', padding: '1rem 0', textAlign: 'center' }}>
                  No messages yet.
                </p>
              ) : (
                drawerLetters.map(thread => (
                  <Link key={thread._id} href="/secret" style={{ textDecoration: 'none' }}>
                    <div className={styles.drawerCard}>
                      <div className={styles.drawerCardTop}>
                        <div className={styles.drawerCardUser}>
                          <div className={styles.drawerAvatar}>
                            {thread.other?.image
                              ? <img src={thread.other.image} alt={thread.other.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                              : thread.other?.name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <h4 className={styles.drawerName}>{thread.other?.name || 'Unknown'}</h4>
                        </div>
                        <span className={styles.drawerTime}>
                          {thread.lastAt ? new Date(thread.lastAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                        </span>
                      </div>
                      <p className={styles.drawerPreview}>{thread.lastMessage || <em style={{ opacity: 0.6 }}>No messages yet</em>}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>

            <div className={styles.drawerFooter}>
              <Link href="/secret" style={{ textDecoration: 'none', display: 'block' }}>
                <button className={styles.composeBtn} style={{ width: '100%' }}>
                  <span className="material-symbols-outlined">edit</span>
                  Compose New
                </button>
              </Link>
            </div>
          </aside>
        )}
      </main>

      {editingTask && (
        <div className={styles.modalOverlay} onClick={() => setEditingTask(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'var(--font-headline)', color: 'var(--on-surface)' }}>Edit Task</h2>
            <input 
              type="text" 
              className={styles.modalInput} 
              value={editingTask.title} 
              onChange={e => setEditingTask({...editingTask, title: e.target.value})}
              placeholder="Task Title"
            />
            <input 
              type="text" 
              className={styles.modalInput} 
              value={editingTask.category} 
              onChange={e => setEditingTask({...editingTask, category: e.target.value})}
              placeholder="Category (e.g., Work, Personal)"
            />
            <textarea 
              className={styles.modalInput} 
              style={{ minHeight: '100px', resize: 'vertical' }}
              value={editingTask.desc || ''} 
              onChange={e => setEditingTask({...editingTask, desc: e.target.value})}
              placeholder="Description (optional)"
            />
            <button className={styles.modalSaveBtn} onClick={saveEditedTask}>
              <span className="material-symbols-outlined">save</span>
              Save Changes
            </button>
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
