'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import styles from '../Auth.module.css';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [linkedinLoading, setLinkedinLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Register via our API
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      // Step 2: Auto sign-in via custom route (avoids browser-extension-blocked /api/auth/* paths)
      const signinRes = await fetch('/api/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, callbackUrl: '/inbox' }),
      });
      const signinData = await signinRes.json();

      if (!signinRes.ok) {
        // Account was created but auto-login failed — redirect to login
        window.location.href = '/login?registered=true';
        return;
      }

      // Hard redirect so the session cookie is picked up
      window.location.href = signinData.redirectTo || '/inbox';
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signIn('google', { callbackUrl: '/inbox' });
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLinkedInSignIn = async () => {
    setLinkedinLoading(true);
    // LinkedIn OAuth not configured yet — show informative message
    alert('LinkedIn OAuth requires setting up a LinkedIn App.\nAdd LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET to your .env.local to enable this.');
    setLinkedinLoading(false);
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Join Silk</h1>
          <p className={styles.subtitle}>Create your minimalist workspace today.</p>
        </div>

        {/* OAuth buttons */}
        <div className={styles.oauthGroup}>
          <button
            type="button"
            className={styles.oauthBtn}
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.6149z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3436 0-4.3282-1.5832-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71V4.9582H.9574C.3477 6.1732 0 7.5482 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
              <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5813C13.4627.8918 11.4255 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1627 6.6564 3.5795 9 3.5795z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <button
            type="button"
            className={`${styles.oauthBtn} ${styles.oauthLinkedIn}`}
            onClick={handleLinkedInSignIn}
            disabled={linkedinLoading}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect width="18" height="18" rx="3" fill="#0A66C2"/>
              <path d="M4.5 7H6.5V14H4.5V7ZM5.5 4C4.948 4 4.5 4.448 4.5 5C4.5 5.552 4.948 6 5.5 6C6.052 6 6.5 5.552 6.5 5C6.5 4.448 6.052 4 5.5 4Z" fill="white"/>
              <path d="M8 7H9.9V8C10.2 7.4 11 7 12 7C13.9 7 14.5 8.1 14.5 10V14H12.5V10.5C12.5 9.4 12.1 9 11.5 9C10.8 9 10.5 9.5 10.5 10.5V14H8.5L8 7Z" fill="white"/>
            </svg>
            {linkedinLoading ? 'Connecting...' : 'Continue with LinkedIn'}
          </button>
        </div>

        <div className={styles.divider}>
          <span>or sign up with email</span>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>error</span>
            {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSignup}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              className={styles.input}
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className={styles.input}
              placeholder="min. 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account?
          <Link href="/login" className={styles.link}>Sign in</Link>
        </div>
      </div>
    </main>
  );
}
