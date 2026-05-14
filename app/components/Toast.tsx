'use client';

import { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
  icon?: string;
}

export default function Toast({ message, show, onClose, icon = 'check_circle' }: ToastProps) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  return (
    <div className={`${styles.toast} ${show ? styles.show : ''}`}>
      <span className={`material-symbols-outlined ${styles.icon}`}>{icon}</span>
      {message}
    </div>
  );
}
