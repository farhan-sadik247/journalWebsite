'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiMail, FiLock, FiEye, FiEyeOff, FiUser, FiAlertCircle, FiBookOpen, FiUsers, FiEdit, FiSettings } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { signIn } from 'next-auth/react';
import toast from 'react-hot-toast';
import styles from '../signin/AuthForm.module.scss';

type UserRole = 'author' | 'reviewer' | 'editor';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'author' as UserRole,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const router = useRouter();

  const roleOptions = [
    {
      value: 'author' as UserRole,
      label: 'Author',
      icon: FiBookOpen,
      description: 'Submit and manage manuscripts',
    },
    {
      value: 'reviewer' as UserRole,
      label: 'Reviewer',
      icon: FiUsers,
      description: 'Review submitted manuscripts',
    },
    {
      value: 'editor' as UserRole,
      label: 'Editor',
      icon: FiEdit,
      description: 'Manage editorial workflow',
    },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Account created successfully!');
        
        // Automatically sign in the user
        const signInResult = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          router.push('/dashboard');
        } else {
          router.push('/auth/signin');
        }
      } else {
        setErrors({ general: data.error || 'An error occurred' });
        toast.error(data.error || 'Failed to create account');
      }
    } catch (error) {
      setErrors({ general: 'An error occurred. Please try again.' });
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch (error) {
      toast.error('Google sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.authHeader}>
          <Link href="/" className={styles.logo}>
            <h1>ResearchJournal</h1>
          </Link>
          <h2>Create Account</h2>
          <p>Join our research community and start publishing your work.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.authForm}>
          {errors.general && (
            <div className={styles.errorMessage}>
              <FiAlertCircle />
              <span>{errors.general}</span>
            </div>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="name" className={styles.formLabel}>
              <FiUser />
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`${styles.formInput} ${errors.name ? 'error' : ''}`}
              placeholder="Enter your full name"
              required
            />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.formLabel}>
              <FiMail />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`${styles.formInput} ${errors.email ? 'error' : ''}`}
              placeholder="Enter your email"
              required
            />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>

          <div className={styles.roleSelection}>
            <label className={styles.formLabel}>
              <FiSettings />
              Account Type
            </label>
            <div className={styles.roleGrid}>
              {roleOptions.map((role) => (
                <div
                  key={role.value}
                  className={`${styles.roleOption} ${
                    formData.role === role.value ? styles.selected : ''
                  }`}
                  onClick={() => handleInputChange('role', role.value)}
                >
                  <role.icon />
                  <span>{role.label}</span>
                </div>
              ))}
            </div>
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
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className={`${styles.formInput} ${errors.password ? 'error' : ''}`}
                placeholder="Create a password"
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
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.formLabel}>
              <FiLock />
              Confirm Password
            </label>
            <div className={styles.passwordInput}>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                className={`${styles.formInput} ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className={styles.passwordToggle}
              >
                {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>
            {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`${styles.submitButton} btn btn-primary btn-lg`}
          >
            {isLoading ? <div className="spinner" /> : 'Create Account'}
          </button>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className={`${styles.googleButton} btn btn-secondary btn-lg`}
          >
            <FcGoogle />
            Continue with Google
          </button>

          <div className={styles.authFooter}>
            <p>
              Already have an account?{' '}
              <Link href="/auth/signin" className={styles.authLink}>
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
