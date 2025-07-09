'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { FiChevronDown, FiUser, FiShield, FiEdit } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import styles from './RoleSwitcher.module.scss';

interface RoleSwitcherProps {
  className?: string;
}

export function RoleSwitcher({ className }: RoleSwitcherProps) {
  const { data: session, update } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const router = useRouter();

  if (!session?.user?.roles || session.user.roles.length <= 1) {
    return null; // Don't show if user doesn't have multiple roles
  }

  const handleRoleSwitch = async (targetRole: string) => {
    if (targetRole === session.user.currentActiveRole) {
      setIsOpen(false);
      return;
    }

    console.log('Switching role from', session.user.currentActiveRole, 'to', targetRole);
    console.log('User roles:', session.user.roles);

    setIsSwitching(true);
    try {
      const response = await fetch('/api/admin', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetRole }),
      });

      console.log('Role switch API response:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Role switch response data:', data);

        // Update the session with all necessary fields
        await update({
          ...session,
          user: {
            ...session.user,
            currentActiveRole: targetRole,
            role: targetRole,
          },
        });

        console.log('Session updated, redirecting to role-specific dashboard');

        toast.success(`Switched to ${targetRole} role`);
        
        // Force refresh to ensure the new role is reflected
        router.refresh();
        
        // Redirect to role-specific dashboard
        const roleRoutes = {
          admin: '/dashboard/admin',
          editor: '/dashboard/editor', 
          'copy-editor': '/dashboard/copy-editor',
          reviewer: '/dashboard/reviewer',
          author: '/dashboard'
        };
        
        const redirectPath = roleRoutes[targetRole as keyof typeof roleRoutes] || '/dashboard';
        console.log('Redirecting to:', redirectPath);
        
        // Add a small delay to ensure session is updated before redirect
        setTimeout(() => {
          router.push(redirectPath);
          setIsOpen(false);
        }, 100);
      } else {
        const data = await response.json();
        console.error('Role switch failed:', data);
        toast.error(data.error || 'Failed to switch role');
      }
    } catch (error) {
      console.error('Error switching role:', error);
      toast.error('Failed to switch role');
    } finally {
      setIsSwitching(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <FiShield className={styles.roleIcon} />;
      case 'editor':
        return <FiEdit className={styles.roleIcon} />;
      case 'copy-editor':
        return <FiEdit className={styles.roleIcon} />;
      default:
        return <FiUser className={styles.roleIcon} />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'editor':
        return 'Editor';
      case 'copy-editor':
        return 'Copy Editor';
      case 'reviewer':
        return 'Reviewer';
      case 'author':
        return 'Author';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const currentRole = session.user.currentActiveRole || session.user.role;

  return (
    <div className={`${styles.roleSwitcher} ${className || ''}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.roleButton}
        disabled={isSwitching}
      >
        {getRoleIcon(currentRole)}
        <span className={styles.roleLabel}>
          {getRoleLabel(currentRole)}
        </span>
        <FiChevronDown className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.roleDropdown}>
          <div className={styles.dropdownHeader}>
            <span>Switch Role</span>
          </div>
          {session.user.roles.map((role) => (
            <button
              key={role}
              onClick={() => handleRoleSwitch(role)}
              className={`${styles.roleOption} ${
                role === currentRole ? styles.active : ''
              }`}
              disabled={isSwitching}
            >
              {getRoleIcon(role)}
              <span>{getRoleLabel(role)}</span>
              {role === currentRole && (
                <span className={styles.activeBadge}>Current</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
