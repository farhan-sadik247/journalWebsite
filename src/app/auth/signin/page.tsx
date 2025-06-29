'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiMail, FiLock, FiEye, FiEyeOff, FiAlertCircle } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import toast from 'react-hot-toast';
import styles from './AuthForm.module.scss';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        toast.error('Invalid email or password');
      } else {
        toast.success('Signed in successfully!');
        
        // Redirect all users to main dashboard regardless of role
        router.push('/dashboard');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (error) {
      toast.error('Google sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <Link href="/" className={styles.logo}>
            <h1>ResearchJournal</h1>
          </Link>
          <h2>Sign In</h2>
          <p>Welcome back! Please sign in to your account.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          {error && (
            <div className={styles.errorMessage}>
              <FiAlertCircle />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              <FiMail />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.formInput}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              <FiLock />
              Password
            </label>
            <div className={styles.passwordInput}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.formInput}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
          </div>

          <div className={styles.formActions}>
            <Link href="/auth/forgot-password" className={styles.forgotPassword}>
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`${styles.submitButton} btn btn-primary btn-lg`}
          >
            {isLoading ? <div className="spinner" /> : 'Sign In'}
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={`${styles.googleButton} btn btn-secondary btn-lg`}
          >
            <FcGoogle />
            Continue with Google
          </button>

          <div className={styles.authFooter}>
            <p>
              Don&apos;t have an account?{' '}
              <Link href="/auth/signup" className={styles.authLink}>
                Sign up here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
