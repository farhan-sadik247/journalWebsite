'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { FiMenu, FiX, FiUser, FiLogOut, FiSettings, FiChevronDown, FiSearch, FiBook, FiInfo, FiMail, FiUsers, FiFileText, FiDollarSign } from 'react-icons/fi';
import styles from './Header.module.scss';
import NotificationBar from './NotificationBar';
import AdminPaymentConfig from './AdminPaymentConfig';

export function Header() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleUserMenu = () => setIsUserMenuOpen(!isUserMenuOpen);
  const toggleDropdown = (dropdownName: string) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName);
  };

  const navigationGroups = {
    browse: {
      title: 'Browse',
      icon: FiSearch,
      items: [
        { name: 'Browse Articles', href: '/articles', icon: FiBook },
        { name: 'Advanced Search', href: '/search', icon: FiSearch },
      ]
    },
    about: {
      title: 'About',
      icon: FiInfo,
      items: [
        { name: 'About Journal', href: '/about', icon: FiInfo },
        { name: 'Editorial Board', href: '/editorial-board', icon: FiUsers },
        { name: 'Publication Fees', href: '/publication-fees', icon: FiDollarSign },
        { name: 'Contact Us', href: '/contact', icon: FiMail },
      ]
    }
  };

  const singleItems = [
    { name: 'Submit Manuscript', href: '/submit', icon: FiFileText },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          {/* Logo */}
          <Link href="/" className={styles.logo}>
            <h1>ResearchJournal</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className={styles.nav}>
            <Link href="/" className={styles.navLink}>
              Home
            </Link>
            
            {/* Grouped Navigation Dropdowns */}
            {Object.entries(navigationGroups).map(([key, group]) => (
              <div key={key} className={styles.dropdown}>
                <button
                  className={styles.dropdownTrigger}
                  onClick={() => toggleDropdown(key)}
                  onMouseEnter={() => setActiveDropdown(key)}
                >
                  <group.icon className={styles.navIcon} />
                  {group.title}
                  <FiChevronDown className={`${styles.chevron} ${activeDropdown === key ? styles.open : ''}`} />
                </button>
                
                {activeDropdown === key && (
                  <div 
                    className={styles.dropdownMenu}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    {group.items.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={styles.dropdownItem}
                        onClick={() => setActiveDropdown(null)}
                      >
                        <item.icon className={styles.itemIcon} />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            
            {/* Single Navigation Items */}
            {singleItems.map((item) => (
              <Link key={item.name} href={item.href} className={styles.navLink}>
                <item.icon className={styles.navIcon} />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Section with Notifications and Admin Controls */}
          <div className={styles.userSection}>
            {session && <NotificationBar />}
            {session?.user?.role === 'admin' && <AdminPaymentConfig />}
            
            {status === 'loading' ? (
              <div className="spinner" />
            ) : session ? (
              <div className={styles.userMenu}>
                <button
                  onClick={toggleUserMenu}
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
                    <Link href="/dashboard" className={styles.dropdownItem}>
                      <FiUser />
                      Dashboard
                    </Link>
                    {(session.user.role === 'copy-editor' || 
                      session.user.roles?.includes('copy-editor') || 
                      session.user.role === 'admin') && (
                      <Link href="/dashboard/copy-editor/simple" className={styles.dropdownItem}>
                        <FiSettings />
                        Copy Editor (Simple)
                      </Link>
                    )}
                    {(session.user.role === 'admin' || session.user.role === 'editor') && (
                      <>
                        <Link href="/dashboard/analytics" className={styles.dropdownItem}>
                          <FiSettings />
                          Analytics
                        </Link>
                        <Link href="/dashboard/corrections" className={styles.dropdownItem}>
                          <FiSettings />
                          Corrections
                        </Link>
                        <Link href="/dashboard/payments" className={styles.dropdownItem}>
                          <FiSettings />
                          Payments
                        </Link>
                      </>
                    )}
                    <Link href="/profile" className={styles.dropdownItem}>
                      <FiSettings />
                      Profile Settings
                    </Link>
                    <button
                      onClick={() => signOut()}
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
            <Link
              href="/"
              className={styles.mobileNavLink}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            
            {/* Mobile Navigation Groups */}
            {Object.entries(navigationGroups).map(([key, group]) => (
              <div key={key} className={styles.mobileNavGroup}>
                <div className={styles.mobileNavGroupTitle}>
                  <group.icon className={styles.navIcon} />
                  {group.title}
                </div>
                {group.items.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={styles.mobileNavSubLink}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className={styles.itemIcon} />
                    {item.name}
                  </Link>
                ))}
              </div>
            ))}
            
            {/* Mobile Single Items */}
            {singleItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={styles.mobileNavLink}
                onClick={() => setIsMenuOpen(false)}
              >
                <item.icon className={styles.navIcon} />
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
