'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

export default function Header({ title = 'Silk Workspace' }: { title?: string }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      
      <div className={styles.actions}>
        <div className={styles.search}>
          <span className={`material-symbols-outlined ${styles.searchIcon}`}>search</span>
          <input 
            type="text" 
            placeholder="Search everything..." 
            className={styles.searchInput} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <div className={styles.searchDropdown}>
              <div className={styles.searchItem}>Press Enter to search for "{searchQuery}"</div>
            </div>
          )}
        </div>
        
        <div style={{ position: 'relative' }}>
          <button 
            className={styles.btn} 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
          >
            <span className="material-symbols-outlined">notifications</span>
          </button>
          
          {notificationsOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>Notifications</div>
              <div className={styles.dropdownItem}>
                <div className={styles.dropdownIcon}><span className="material-symbols-outlined">mail</span></div>
                <div>
                  <p className={styles.dropdownText}>New letter from Elena</p>
                  <p className={styles.dropdownTime}>10 mins ago</p>
                </div>
              </div>
              <div className={styles.dropdownItem}>
                <div className={styles.dropdownIcon}><span className="material-symbols-outlined">check_circle</span></div>
                <div>
                  <p className={styles.dropdownText}>System backup completed</p>
                  <p className={styles.dropdownTime}>Yesterday</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Link href="/settings" className={styles.btn} style={{ textDecoration: 'none' }}>
          <span className="material-symbols-outlined">settings</span>
        </Link>
      </div>
    </header>
  );
}
