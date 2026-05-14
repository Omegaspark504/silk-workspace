'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '../../Header';
import Toast from '../../components/Toast';
import styles from './Settings.module.css';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // ── Profile state ──
  const [avatar, setAvatar]           = useState<string | null>(null);
  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [phone, setPhone]             = useState('');
  const [bio, setBio]                 = useState('');
  const [location, setLocation]       = useState('');
  const [website, setWebsite]         = useState('');
  const [twitter, setTwitter]         = useState('');
  const [linkedin, setLinkedin]       = useState('');
  const [profileLoading, setProfileLoading] = useState(true);

  // ── Security state ──
  const [currentPw, setCurrentPw]     = useState('');
  const [newPw, setNewPw]             = useState('');
  const [confirmPw, setConfirmPw]     = useState('');

  // ── Notification state ──
  const [emailNotifs, setEmailNotifs]     = useState(true);
  const [pushNotifs, setPushNotifs]       = useState(false);
  const [weeklyDigest, setWeeklyDigest]   = useState(true);

  // ── Appearance state ──
  const [theme, setTheme]             = useState<'system' | 'light' | 'dark'>('system');
  const [compact, setCompact]         = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState({ show: false, message: '', icon: 'check_circle' });
  const showToast = (message: string, icon = 'check_circle') =>
    setToast({ show: true, message, icon });

  // Load profile from API on mount
  useEffect(() => {
    if (!session) return;
    const load = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setFullName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setBio(data.bio || '');
        setLocation(data.location || '');
        setWebsite(data.website || '');
        setTwitter(data.twitter || '');
        setLinkedin(data.linkedin || '');
        if (data.image) setAvatar(data.image);
        if (data.preferences) {
          setEmailNotifs(data.preferences.emailNotifications ?? true);
          setPushNotifs(data.preferences.pushNotifications ?? false);
          setWeeklyDigest(data.preferences.weeklyDigest ?? true);
          setTheme(data.preferences.theme ?? 'system');
          setCompact(data.preferences.compact ?? false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setProfileLoading(false);
      }
    };
    load();
  }, [session]);

  // Avatar upload handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast('Image must be smaller than 4 MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setAvatar(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName,
          bio,
          phone,
          location,
          website,
          twitter,
          linkedin,
          image: avatar,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      showToast('Profile saved successfully', 'save');
      router.refresh();
    } catch (err) {
      console.error(err);
      showToast('Failed to save profile', 'error');
    }
  };

  const handleSaveNotifications = async (overrides?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    weeklyDigest?: boolean;
    theme?: 'system' | 'light' | 'dark';
    compact?: boolean;
  }) => {
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences: {
            emailNotifications: overrides?.emailNotifications ?? emailNotifs,
            pushNotifications: overrides?.pushNotifications ?? pushNotifs,
            weeklyDigest: overrides?.weeklyDigest ?? weeklyDigest,
            theme: overrides?.theme ?? theme,
            compact: overrides?.compact ?? compact,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPw) return showToast('Enter your current password', 'error');
    if (newPw !== confirmPw) return showToast('Passwords do not match', 'error');
    if (newPw.length < 8) return showToast('New password must be at least 8 characters', 'error');

    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) return showToast(data.error || 'Failed to update password', 'error');
      showToast('Password updated successfully', 'security');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch {
      showToast('Failed to update password', 'error');
    }
  };

  return (
    <>
      <Header title="Settings" />
      <main className={styles.main}>
        <div className={styles.container}>

          {/* ── Page title ── */}
          <div className={styles.pageHeader}>
            <h2 className={styles.pageTitle}>Account Settings</h2>
            <p className={styles.pageSubtitle}>Manage your profile, security, and preferences.</p>
          </div>

          {/* ══════════════════════════════════════════
              CARD 1 — Profile
          ══════════════════════════════════════════ */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>
              <span className="material-symbols-outlined">manage_accounts</span>
              Profile
            </div>

            {profileLoading ? (
              <p style={{ color: 'var(--on-surface-variant)', padding: '1rem 0' }}>Loading profile…</p>
            ) : (
              <>
                {/* Avatar row */}
                <div className={styles.avatarRow}>
                  <div className={styles.avatarWrap} onClick={() => fileRef.current?.click()}>
                    {avatar ? (
                      <img src={avatar} alt="Profile" className={styles.avatarImg} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        <span className="material-symbols-outlined">person</span>
                      </div>
                    )}
                    <div className={styles.avatarOverlay}>
                      <span className="material-symbols-outlined">photo_camera</span>
                    </div>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                    id="avatar-upload"
                  />
                  <div className={styles.avatarInfo}>
                    <p className={styles.avatarHint}>Click the photo to upload a new picture.</p>
                    <p className={styles.avatarHintSub}>PNG, JPG or WEBP · max 4 MB</p>
                    {avatar && (
                      <button className={styles.removeAvatarBtn} onClick={() => setAvatar(null)}>
                        Remove photo
                      </button>
                    )}
                  </div>
                </div>

                {/* 2-column grid */}
                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Full Name</label>
                    <input type="text" className={styles.input} value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email Address</label>
                    <input type="email" className={styles.input} value={email} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} title="Email cannot be changed" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Phone Number</label>
                    <input type="tel" className={styles.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Location</label>
                    <input type="text" className={styles.input} value={location} onChange={e => setLocation(e.target.value)} placeholder="City, Country" />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Bio</label>
                  <textarea className={`${styles.input} ${styles.textarea}`} value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell people a little about yourself..." rows={3} />
                </div>

                {/* Socials */}
                <div className={styles.sectionSubtitle}>Social Links</div>
                <div className={styles.grid2}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Website</label>
                    <div className={styles.inputWithIcon}>
                      <span className="material-symbols-outlined">language</span>
                      <input type="url" className={styles.input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yoursite.com" />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Twitter / X</label>
                    <div className={styles.inputWithIcon}>
                      <span className={styles.atSign}>@</span>
                      <input type="text" className={styles.input} value={twitter} onChange={e => setTwitter(e.target.value)} placeholder="handle" />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>LinkedIn</label>
                    <div className={styles.inputWithIcon}>
                      <span className="material-symbols-outlined">work</span>
                      <input type="text" className={styles.input} value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/…" />
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <button className={styles.submitBtn} onClick={handleSaveProfile}>
                    <span className="material-symbols-outlined">save</span>
                    Save Profile
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ══════════════════════════════════════════
              CARD 2 — Security
          ══════════════════════════════════════════ */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>
              <span className="material-symbols-outlined">lock</span>
              Security
            </div>

            <div className={styles.grid2}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Current Password</label>
                <input type="password" className={styles.input} value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="••••••••" />
              </div>
              <div />
              <div className={styles.formGroup}>
                <label className={styles.label}>New Password</label>
                <input type="password" className={styles.input} value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="min. 8 characters" />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Confirm New Password</label>
                <input type="password" className={styles.input} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="repeat password" />
              </div>
            </div>

            <div className={styles.cardFooter}>
              <button className={`${styles.submitBtn} ${styles.dangerBtn}`} onClick={() => { signOut({ callbackUrl: '/login' }); }}>
                <span className="material-symbols-outlined">logout</span>
                Sign Out
              </button>
              <button className={styles.submitBtn} onClick={handleUpdatePassword}>
                <span className="material-symbols-outlined">security</span>
                Update Password
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              CARD 3 — Notifications
          ══════════════════════════════════════════ */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>
              <span className="material-symbols-outlined">notifications_active</span>
              Notifications
            </div>

            {[
              { label: 'Email Notifications', sub: 'Receive daily summaries of tasks and notes.', value: emailNotifs, toggle: () => { const next = !emailNotifs; setEmailNotifs(next); handleSaveNotifications({ emailNotifications: next }); showToast(next ? 'Email notifications on' : 'Email notifications off', 'mail'); } },
              { label: 'Push Notifications', sub: 'Get instant alerts when a new letter arrives.', value: pushNotifs, toggle: () => { const next = !pushNotifs; setPushNotifs(next); handleSaveNotifications({ pushNotifications: next }); showToast(next ? 'Push notifications on' : 'Push notifications off', 'notifications_active'); } },
              { label: 'Weekly Digest', sub: 'A weekly summary of your workspace activity.', value: weeklyDigest, toggle: () => { const next = !weeklyDigest; setWeeklyDigest(next); handleSaveNotifications({ weeklyDigest: next }); } },
            ].map(({ label, sub, value, toggle }) => (
              <div key={label} className={styles.toggleWrap}>
                <div className={styles.toggleInfo}>
                  <h4>{label}</h4>
                  <p>{sub}</p>
                </div>
                <button className={`${styles.toggle} ${value ? styles.toggleOn : ''}`} onClick={toggle} aria-label={label}>
                  <div className={styles.toggleThumb} />
                </button>
              </div>
            ))}
          </div>

          {/* ══════════════════════════════════════════
              CARD 4 — Appearance
          ══════════════════════════════════════════ */}
          <div className={styles.card}>
            <div className={styles.sectionTitle}>
              <span className="material-symbols-outlined">palette</span>
              Appearance
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Theme</label>
              <div className={styles.themeRow}>
                {(['system', 'light', 'dark'] as const).map(t => (
                  <button
                    key={t}
                    className={`${styles.themeBtn} ${theme === t ? styles.themeBtnActive : ''}`}
                    onClick={() => { setTheme(t); handleSaveNotifications({ theme: t }); }}
                  >
                    <span className="material-symbols-outlined">
                      {t === 'system' ? 'devices' : t === 'light' ? 'light_mode' : 'dark_mode'}
                    </span>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.toggleWrap}>
              <div className={styles.toggleInfo}>
                <h4>Compact Mode</h4>
                <p>Reduce spacing for a denser layout.</p>
              </div>
              <button
                className={`${styles.toggle} ${compact ? styles.toggleOn : ''}`}
                onClick={() => { const next = !compact; setCompact(next); handleSaveNotifications({ compact: next }); }}
                aria-label="Compact mode"
              >
                <div className={styles.toggleThumb} />
              </button>
            </div>
          </div>

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
