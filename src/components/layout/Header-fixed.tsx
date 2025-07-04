'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { FiMenu, FiX, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import styles from './Header.module.scss';

export function Header() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    }

    // Always add listeners when component mounts
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Browse Articles', href: '/articles' },
    { name: 'Submit Manuscript', href: '/submit' },
    { name: 'About', href: '/about' },
    { name: 'Editorial Board', href: '/editorial-board' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <h1>Global Journal of Advanced Technology</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className={styles.nav}>
            {navigation.map((item) => (
              <Link key={item.name} href={item.href} className={styles.navLink}>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className={styles.userSection}>
            {status === 'loading' ? (
              <div className="spinner" />
            ) : session ? (
              <div className={styles.userMenu} ref={userMenuRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUserMenu();
                  }}
                  className={styles.userButton}
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className={styles.avatar}
                    />
                  ) : (
                    <FiUser className={styles.avatarIcon} />
                  )}
                  <span className={styles.userName}>{session.user.name}</span>
                </button>

                {isUserMenuOpen && (
                  <div className={styles.userDropdown}>
                    <Link 
                      href="/dashboard" 
                      className={styles.dropdownItem} 
                      onClick={(e) => {
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <FiUser />
                      Dashboard
                    </Link>
                    <Link 
                      href="/profile" 
                      className={styles.dropdownItem} 
                      onClick={(e) => {
                        setIsUserMenuOpen(false);
                      }}
                    >
                      <FiSettings />
                      Profile Settings
                    </Link>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsUserMenuOpen(false);
                        signOut();
                      }}
                      className={styles.dropdownItem}
                    >
                      <FiLogOut />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.authButtons}>
                <Link href="/auth/signin" className="btn btn-secondary">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="btn btn-primary">
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className={styles.mobileMenuButton}
            >
              {isMenuOpen ? <FiX /> : <FiMenu />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className={styles.mobileNav}>
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={styles.mobileNavLink}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            {!session && (
              <div className={styles.mobileAuthButtons}>
                <Link href="/auth/signin" className="btn btn-secondary">
                  Sign In
                </Link>
                <Link href="/auth/signup" className="btn btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
