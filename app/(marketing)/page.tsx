import Link from 'next/link';
import styles from './Marketing.module.css';

export default function LandingPage() {
  return (
    <main className={styles.main}>
      <nav className={styles.nav}>
        <div className={styles.logo}>Silk</div>
        <div className={styles.navLinks}>
          <Link href="/login" className={styles.loginBtn}>Log In</Link>
          <Link href="/signup" className={styles.signupBtn}>Sign Up</Link>
        </div>
      </nav>

      <div className={styles.hero}>
        <div className={styles.badge}>Midnight Canvas Edition</div>
        <h1 className={styles.title}>
          Your minimalist workspace, <br />
          <span>reimagined.</span>
        </h1>
        <p className={styles.subtitle}>
          Escape the clutter. Silk combines neomorphic design with powerful organization tools. Mail, To-Do, and Notes, unified in one serene environment.
        </p>

        <div className={styles.ctaGroup}>
          <Link href="/signup" className={styles.ctaPrimary}>
            Get Started Free
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
          <Link href="/login" className={styles.ctaSecondary}>
            View Demo
          </Link>
        </div>

        <div className={styles.mockup}>
          <div className={styles.dots}>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>
          <div className={styles.mockupText}>Silk Dashboard Preview</div>
        </div>
      </div>
    </main>
  );
}
