'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import styles from './Sidebar.module.css';

const FALLBACK_AVATAR = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const userName = session?.user?.name || 'User';

  // session.user.image only contains URL-based images (base64 avatars are stripped from JWT).
  // Fetch the full profile to get a base64 avatar if one was uploaded.
  useEffect(() => {
    if (!session) return;
    if (session.user?.image) {
      setProfileImage(session.user.image);
      return;
    }
    fetch('/api/user/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.image) setProfileImage(data.image); })
      .catch(() => {});
  }, [session]);

  const userImage = profileImage || FALLBACK_AVATAR;
  
  return (
    <>
      <nav className={styles.sidebar}>
        <div className={styles.header}>
          <h1 className={styles.title}>Workspace</h1>
          <p className={styles.subtitle}>Silk Theme</p>
        </div>
        <ul className={styles.navList}>
          <li>
            <Link href="/todo" className={`${styles.navItem} ${pathname === '/todo' ? styles.active : ''}`}>
              <span className="material-symbols-outlined">check_box</span>
              To-Do
            </Link>
          </li>
          <li>
            <Link href="/notes" className={`${styles.navItem} ${pathname === '/notes' ? styles.active : ''}`}>
              <span className="material-symbols-outlined">description</span>
              Notes
            </Link>
          </li>
          <li>
            <Link href="/inbox" className={`${styles.navItem} ${pathname === '/inbox' ? styles.active : ''}`}>
              <span className="material-symbols-outlined">mail</span>
              Letters
            </Link>
          </li>
          <li>
            <Link href="/secret" className={`${styles.navItem} ${pathname === '/secret' ? styles.active : ''}`}>
              <span className="material-symbols-outlined">lock</span>
              Secret Letters
            </Link>
          </li>
        </ul>
        <div className={styles.bottomSection}>
          <div style={{ position: 'relative' }}>
            <button
              className={styles.profileBtn}
              onClick={() => setProfileOpen(!profileOpen)}
            >
              <div className={styles.avatar}>
                <img src={userImage} alt="Profile" />
              </div>
              <div className={styles.profileInfo}>
                <span className={styles.name}>{userName}</span>
                <span className={styles.role}>Workspace Member</span>
              </div>
            </button>

            {profileOpen && (
              <div className={styles.profileDropdown}>
                <Link href="/settings" className={styles.dropdownItem} style={{ textDecoration: 'none' }}>
                  <span className="material-symbols-outlined">person</span>
                  Account Settings
                </Link>
                <button className={styles.dropdownItem} onClick={() => signOut({ callbackUrl: '/login' })}>
                  <span className="material-symbols-outlined">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom navigation */}
      <nav className={styles.bottomNav}>
        <Link href="/todo" className={`${styles.bottomNavItem} ${pathname === '/todo' ? styles.bottomNavActive : ''}`}>
          <span className="material-symbols-outlined">check_box</span>
          <span>Focus</span>
        </Link>
        <Link href="/notes" className={`${styles.bottomNavItem} ${pathname === '/notes' ? styles.bottomNavActive : ''}`}>
          <span className="material-symbols-outlined">description</span>
          <span>Notes</span>
        </Link>
        <Link href="/inbox" className={`${styles.bottomNavItem} ${pathname === '/inbox' ? styles.bottomNavActive : ''}`}>
          <span className="material-symbols-outlined">mail</span>
          <span>Letters</span>
        </Link>
        <Link href="/secret" className={`${styles.bottomNavItem} ${pathname === '/secret' ? styles.bottomNavActive : ''}`}>
          <span className="material-symbols-outlined">lock</span>
          <span>Secret</span>
        </Link>
        <Link href="/settings" className={`${styles.bottomNavItem} ${pathname === '/settings' ? styles.bottomNavActive : ''}`}>
          <span className="material-symbols-outlined">person</span>
          <span>Profile</span>
        </Link>
      </nav>
    </>
  );
}
