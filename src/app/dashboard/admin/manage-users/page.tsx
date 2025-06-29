'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiUser, FiShield, FiTrash2, FiUserPlus, FiUserMinus, FiEdit, FiArrowLeft, FiSearch, FiAward, FiPlus } from 'react-icons/fi';
import toast from 'react-hot-toast';
import Link from 'next/link';
import styles from './ManageUsers.module.scss';

interface User {
  _id: string;
  name: string;
  email: string;
  roles: string[];
  currentActiveRole: string;
  isFounder: boolean;
  affiliation?: string;
  profileImage?: string;
  createdAt: string;
  designation?: string;
  designationRole?: string;
}

interface Designation {
  _id: string;
  name: string;
  roles?: DesignationRole[];
}

interface DesignationRole {
  _id: string;
  name: string;
}

export default function ManageUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [newDesignation, setNewDesignation] = useState('');
  const [newRole, setNewRole] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);
  const [showDesignationModal, setShowDesignationModal] = useState(false);

  useEffect(() => {
    console.log('useEffect triggered:', { status, session: session?.user });
    
    if (status === 'loading') {
      console.log('Status is loading, waiting...');
      return;
    }
    
    if (status === 'unauthenticated') {
      console.log('User is unauthenticated, redirecting to signin');
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      console.log('User is authenticated, checking admin role:', session?.user?.roles);
      
      if (!session?.user?.roles?.includes('admin')) {
        console.log('User does not have admin role, redirecting to dashboard');
        router.push('/dashboard');
        return;
      }

      console.log('User has admin role, fetching data');
      fetchUsers();
      fetchDesignations();
    }
  }, [session, status, router]);

  useEffect(() => {
    // Filter users based on search term and role filter
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.affiliation?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.roles.includes(roleFilter));
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching users...');
      const response = await fetch('/api/admin/users');
      console.log('Users API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data received:', data);
        setUsers(data.users);
      } else {
        console.error('Failed to fetch users, status:', response.status);
        toast.error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchDesignations = async () => {
    try {
      console.log('Fetching designations...');
      const response = await fetch('/api/designations');
      console.log('Designations API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Designations data received:', data);
        setDesignations(data.designations);
      } else {
        console.error('Failed to fetch designations, status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
    }
  };

  const handleRoleChange = async (userId: string, action: 'add' | 'remove', role: string) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          action,
          role,
        }),
      });

      if (response.ok) {
        toast.success(`User role ${action === 'add' ? 'added' : 'removed'} successfully`);
        fetchUsers(); // Refresh user list
        
        // Update selected user if it's currently being viewed
        if (selectedUser?._id === userId) {
          const updatedUser = users.find(u => u._id === userId);
          if (updatedUser) {
            setSelectedUser({
              ...updatedUser,
              roles: action === 'add' 
                ? [...updatedUser.roles, role]
                : updatedUser.roles.filter(r => r !== role)
            });
          }
        }
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update user role');
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success('User deleted successfully');
        fetchUsers(); // Refresh user list
        setShowUserModal(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };
  
  const handleCreateDesignation = async () => {
    if (!newDesignation.trim()) {
      toast.error('Designation name cannot be empty');
      return;
    }
    
    try {
      const response = await fetch('/api/designations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newDesignation.trim() }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Designation created successfully');
        setNewDesignation('');
        fetchDesignations();
      } else {
        toast.error(data.error || 'Failed to create designation');
      }
    } catch (error) {
      console.error('Error creating designation:', error);
      toast.error('Failed to create designation');
    }
  };
  
  const handleAddRole = async (designationId: string) => {
    if (!newRole.trim()) {
      toast.error('Role name cannot be empty');
      return;
    }
    
    try {
      const response = await fetch('/api/designations/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          designationId,
          roleName: newRole.trim()
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Role added successfully');
        setNewRole('');
        fetchDesignations();
      } else {
        toast.error(data.error || 'Failed to add role');
      }
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Failed to add role');
    }
  };
  
  const handleDeleteRole = async (designationId: string, roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/designations/roles?designationId=${designationId}&roleId=${roleId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Role deleted successfully');
        fetchDesignations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete role');
      }
    } catch (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
    }
  };
  
  const handleDeleteDesignation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this designation?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/designations?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        toast.success('Designation deleted successfully');
        fetchDesignations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete designation');
      }
    } catch (error) {
      console.error('Error deleting designation:', error);
      toast.error('Failed to delete designation');
    }
  };
  
  const handleUpdateDesignation = async (userId: string, designation: string) => {
    try {
      console.log('handleUpdateDesignation called with:', { userId, designation });
      
      // Check if the selected user is an editor or reviewer - client-side validation
      const user = users.find(u => u._id === userId);
      console.log('Found user:', user);
      
      if (!user || (!user.roles.includes('editor') && !user.roles.includes('reviewer'))) {
        console.error('User validation failed:', {
          user: user?.name,
          roles: user?.roles,
          hasEditor: user?.roles.includes('editor'),
          hasReviewer: user?.roles.includes('reviewer')
        });
        toast.error('Designation can only be set for editors and reviewers');
        return;
      }
      
      console.log('Sending PATCH request to update designation...');
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          designation,
          designationRole: '' // Reset the designation role when changing designation
        }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        toast.success('Designation updated successfully');
        fetchUsers(); // Refresh user list
        
        // Update selected user if it's currently being viewed
        if (selectedUser?._id === userId) {
          setSelectedUser({
            ...selectedUser,
            designation,
            designationRole: '' // Reset the designation role when changing designation
          });
        }
      } else {
        const data = await response.json();
        console.error('Failed to update designation:', data);
        toast.error(data.error || 'Failed to update designation');
      }
    } catch (error) {
      console.error('Error updating designation:', error);
      toast.error('Failed to update designation');
    }
  };
  
  const handleUpdateDesignationRole = async (userId: string, designationRole: string) => {
    try {
      console.log('handleUpdateDesignationRole called with:', { userId, designationRole });
      
      // Check if the selected user is an editor or reviewer - client-side validation
      const user = users.find(u => u._id === userId);
      console.log('Found user for role update:', user);
      
      if (!user || (!user.roles.includes('editor') && !user.roles.includes('reviewer')) || !user.designation) {
        console.error('User role validation failed:', {
          user: user?.name,
          roles: user?.roles,
          hasEditor: user?.roles.includes('editor'),
          hasReviewer: user?.roles.includes('reviewer'),
          designation: user?.designation
        });
        toast.error('User must be an editor or reviewer with a designation to set a role');
        return;
      }
      
      console.log('Sending PATCH request to update designation role...');
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          designationRole
        }),
      });

      console.log('Role update response status:', response.status);
      const data = await response.json();
      console.log('Role update response data:', data);

      if (response.ok) {
        toast.success('Designation role updated successfully');
        fetchUsers(); // Refresh user list
        
        // Update selected user if it's currently being viewed
        if (selectedUser?._id === userId) {
          setSelectedUser({
            ...selectedUser,
            designationRole
          });
        }
      } else {
        const data = await response.json();
        console.error('Failed to update designation role:', data);
        toast.error(data.error || 'Failed to update designation role');
      }
    } catch (error) {
      console.error('Error updating designation role:', error);
      toast.error('Failed to update designation role');
    }
  };

  const openUserModal = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className={styles.managePage}>
        <div className="container">
          <div className="min-h-screen flex items-center justify-center">
            <div className="spinner" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !session?.user?.roles?.includes('admin')) {
    return null;
  }

  return (
    <div className={styles.managePage}>
      <div className="container">
        <div className={styles.pageHeader}>
          <div className={styles.headerTop}>
            <Link href="/dashboard/admin" className={styles.backButton}>
              <FiArrowLeft />
              Back to Admin Dashboard
            </Link>
          </div>
          <h1>Manage Users</h1>
          <p>Manage user accounts, roles, and permissions</p>
        </div>

        <div className={styles.content}>
          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search users by name, email, or affiliation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.roleFilter}>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">All Roles</option>
                <option value="author">Authors</option>
                <option value="reviewer">Reviewers</option>
                <option value="editor">Editors</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <h3>{users.length}</h3>
              <p>Total Users</p>
            </div>
            <div className={styles.statCard}>
              <h3>{users.filter(u => u.roles.includes('admin')).length}</h3>
              <p>Administrators</p>
            </div>
            <div className={styles.statCard}>
              <h3>{users.filter(u => u.roles.includes('editor')).length}</h3>
              <p>Editors</p>
            </div>
            <div className={styles.statCard}>
              <h3>{users.filter(u => u.roles.includes('reviewer')).length}</h3>
              <p>Reviewers</p>
            </div>
          </div>

          {/* Users List */}
          <div className={styles.usersCard}>
            <div className={styles.cardHeader}>
              <h2>Users ({filteredUsers.length})</h2>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className={styles.emptyState}>
                <FiUser className={styles.emptyIcon} />
                <h3>No users found</h3>
                <p>Try adjusting your search or filter criteria.</p>
              </div>
            ) : (
              <div className={styles.usersList}>
                {filteredUsers.map((user) => (
                  <div key={user._id} className={styles.userItem}>
                    <div className={styles.userInfo}>
                      <div className={styles.userAvatar}>
                        {user.profileImage ? (
                          <img src={user.profileImage} alt={user.name} />
                        ) : (
                          <FiUser />
                        )}
                      </div>
                      <div className={styles.userDetails}>
                        <h4>{user.name}</h4>
                        <p className={styles.userEmail}>{user.email}</p>
                        {user.affiliation && (
                          <p className={styles.userAffiliation}>{user.affiliation}</p>
                        )}
                        <div className={styles.userRoles}>
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <span key={role} className={`status-badge status-${role}`}>
                                {role}
                              </span>
                            ))
                          ) : (
                            <span className="status-badge status-author">author</span>
                          )}
                          {user.isFounder && (
                            <span className="status-badge status-founder">Founder</span>
                          )}
                          {user.designation && (user.roles?.includes('editor') || user.roles?.includes('reviewer')) && (
                            <span className={styles.designation}>
                              {user.designation}
                              {user.designationRole && (
                                <span className={styles.designationRole}> ({user.designationRole})</span>
                              )}
                            </span>
                          )}
                        </div>
                        <p className={styles.memberSince}>
                          Member since {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={styles.userActions}>
                      <button
                        onClick={() => openUserModal(user)}
                        className="btn btn-secondary"
                        disabled={user.isFounder && session?.user?.email !== user.email}
                      >
                        <FiEdit />
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Designation Management Modal */}
        {showDesignationModal && (
          <div className={`${styles.modal} ${styles.designationModal}`}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Manage Designations</h3>
                <button
                  onClick={() => {
                    setShowDesignationModal(false);
                    // Reopen user modal if there was a selected user
                    if (selectedUser) {
                      setTimeout(() => setShowUserModal(true), 100);
                    }
                  }}
                  className={styles.closeButton}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.addDesignationForm}>
                  <h4>Add New Designation Category</h4>
                  <p>Create designation categories (e.g., &quot;Editorial Board&quot;, &quot;Advisory Board&quot;) that will contain specific roles.</p>
                  <div className={styles.designationForm}>
                    <input
                      type="text"
                      placeholder="Enter designation category name"
                      value={newDesignation}
                      onChange={(e) => setNewDesignation(e.target.value)}
                      className={styles.designationInput}
                    />
                    <button
                      onClick={handleCreateDesignation}
                      className="btn btn-primary"
                      disabled={!newDesignation.trim()}
                    >
                      <FiPlus />
                      Add Category
                    </button>
                  </div>
                </div>
                
                <div className={styles.designationsList}>
                  <h4>Designation Categories & Roles</h4>
                  <p>Manage categories and their specific roles. Editors and reviewers can be assigned these special roles.</p>
                  {designations.length === 0 ? (
                    <p>No designation categories available. Add one above.</p>
                  ) : (
                    <div className={styles.designationsContainer}>
                      {designations.map((designation) => (
                        <div key={designation._id} className={styles.designationCard}>
                          <div className={styles.designationHeader}>
                            <span className={styles.designationName}>{designation.name}</span>
                            <button
                              onClick={() => handleDeleteDesignation(designation._id)}
                              className="btn btn-danger btn-sm"
                              title="Delete this designation category"
                            >
                              <FiTrash2 />
                            </button>
                          </div>
                          
                          <div className={styles.rolesSection}>
                            <h5>Roles</h5>
                            <p>Add specific roles within this category that can be assigned to editors and reviewers:</p>
                            
                            <div className={styles.addRoleForm}>
                              <input
                                type="text"
                                placeholder="Enter role name"
                                value={selectedDesignation?._id === designation._id ? newRole : ''}
                                onChange={(e) => {
                                  setSelectedDesignation(designation);
                                  setNewRole(e.target.value);
                                }}
                                className={styles.roleInput}
                              />
                              <button
                                onClick={() => handleAddRole(designation._id)}
                                className="btn btn-primary btn-sm"
                                disabled={!newRole.trim() || selectedDesignation?._id !== designation._id}
                              >
                                <FiPlus /> Add Role
                              </button>
                            </div>
                            
                            {designation.roles && designation.roles.length > 0 ? (
                              <ul className={styles.rolesList}>
                                {designation.roles.map((role) => (
                                  <li key={role._id} className={styles.roleItem}>
                                    <span>{role.name}</span>
                                    <button
                                      onClick={() => handleDeleteRole(designation._id, role._id)}
                                      className="btn btn-danger btn-xs"
                                      title="Delete this role"
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className={styles.noRoles}>No roles defined for this category.</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* User Management Modal */}
        {showUserModal && selectedUser && (
          <div className={styles.modal}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>Manage User: {selectedUser.name}</h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className={styles.closeButton}
                >
                  ×
                </button>
              </div>
              <div className={styles.modalBody}>
                <div className={styles.userModalInfo}>
                  <div className={styles.modalUserAvatar}>
                    {selectedUser.profileImage ? (
                      <img src={selectedUser.profileImage} alt={selectedUser.name} />
                    ) : (
                      <FiUser />
                    )}
                  </div>
                  <div className={styles.modalUserDetails}>
                    <h4>{selectedUser.name}</h4>
                    <p><strong>Email:</strong> {selectedUser.email}</p>
                    {selectedUser.affiliation && (
                      <p><strong>Affiliation:</strong> {selectedUser.affiliation}</p>
                    )}
                    <p><strong>Registration Role:</strong> {selectedUser.currentActiveRole}</p>
                    <p><strong>Current Roles:</strong> {selectedUser.roles.join(', ')}</p>
                    <p><strong>Active Role:</strong> {selectedUser.currentActiveRole}</p>
                    {selectedUser.roles.includes('editor') || selectedUser.roles.includes('reviewer') ? (
                      <p>
                        <strong>Designation:</strong> {selectedUser.designation || 'None'}
                        {selectedUser.designation && selectedUser.designationRole && (
                          <span> ({selectedUser.designationRole})</span>
                        )}
                      </p>
                    ) : null}
                    <p><strong>Member Since:</strong> {new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                    {selectedUser.isFounder && (
                      <div className={styles.founderNote}>
                        <FiShield />
                        <span><strong>Founder:</strong> This user is the founder and can only be modified by themselves.</span>
                      </div>
                    )}
                  </div>
                </div>

                {(!selectedUser.isFounder || session?.user?.email === selectedUser.email) ? (
                  <div className={styles.roleManagement}>
                    <h4>Role Management</h4>
                    <p>Add or remove roles for this user:</p>
                    <div className={styles.roleActions}>
                      {['author', 'reviewer', 'editor', 'copy-editor', 'admin'].map((role) => {
                        const hasRole = selectedUser.roles.includes(role);
                        const isSelfManagement = session?.user?.email === selectedUser.email;
                        const isCurrentUserAdmin = session?.user?.roles?.includes('admin');
                        
                        // Role promotion restrictions
                        const cannotRemoveFounderAdmin = selectedUser.isFounder && role === 'admin' && !isSelfManagement;
                        
                        // Copy-editor restrictions: Only admin can assign copy-editor role
                        // Admin can make anyone copy-editor, or promote themselves
                        const canAssignCopyEditor = role === 'copy-editor' && (
                          isCurrentUserAdmin || 
                          (isSelfManagement && isCurrentUserAdmin)
                        );
                        
                        // Admin restrictions: Only admin can assign admin role
                        // Admin can only promote editors to admin (must be editor first)
                        const canAssignAdmin = role === 'admin' && isCurrentUserAdmin && (
                          selectedUser.roles.includes('editor') || selectedUser.isFounder
                        );
                        
                        // Editor restrictions: Only admin can assign editor role
                        const canAssignEditor = role === 'editor' && isCurrentUserAdmin;
                        
                        // Reviewer can be assigned by admin
                        const canAssignReviewer = role === 'reviewer' && isCurrentUserAdmin;
                        
                        // Author is default role, admin can manage
                        const canAssignAuthor = role === 'author' && isCurrentUserAdmin;
                        
                        // Determine if action is allowed
                        let canPerformAction = false;
                        let disabledReason = '';
                        
                        if (role === 'copy-editor') {
                          canPerformAction = canAssignCopyEditor;
                          disabledReason = !canAssignCopyEditor ? 'Only admins can assign copy-editor role' : '';
                        } else if (role === 'admin') {
                          canPerformAction = canAssignAdmin;
                          disabledReason = !canAssignAdmin ? 'User must be an editor first to become admin' : '';
                        } else if (role === 'editor') {
                          canPerformAction = canAssignEditor;
                          disabledReason = !canAssignEditor ? 'Only admins can assign editor role' : '';
                        } else if (role === 'reviewer') {
                          canPerformAction = canAssignReviewer;
                          disabledReason = !canAssignReviewer ? 'Only admins can assign reviewer role' : '';
                        } else if (role === 'author') {
                          canPerformAction = canAssignAuthor;
                          disabledReason = !canAssignAuthor ? 'Only admins can manage author role' : '';
                        }
                        
                        // Override for founder admin removal
                        if (cannotRemoveFounderAdmin) {
                          canPerformAction = false;
                          disabledReason = 'Cannot remove admin role from founder';
                        }
                        
                        return (
                          <div key={role} className={styles.roleAction}>
                            <div className={styles.roleInfo}>
                              <span className={styles.roleName}>{role.charAt(0).toUpperCase() + role.slice(1)}</span>
                              <span className={`status-badge status-${role}`}>{role}</span>
                            </div>
                            {hasRole ? (
                              <button
                                onClick={() => handleRoleChange(selectedUser._id, 'remove', role)}
                                className="btn btn-danger btn-sm"
                                disabled={!canPerformAction}
                                title={disabledReason}
                              >
                                <FiUserMinus />
                                Remove
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRoleChange(selectedUser._id, 'add', role)}
                                className="btn btn-primary btn-sm"
                                disabled={!canPerformAction}
                                title={disabledReason}
                              >
                                <FiUserPlus />
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Role Assignment for editors and reviewers (from designation categories) */}
                    {(selectedUser.roles.includes('editor') || selectedUser.roles.includes('reviewer')) && (
                      <div className={styles.designationManagement}>
                        <h4>{selectedUser.roles.includes('editor') && selectedUser.roles.includes('reviewer') ? 'Editor/Reviewer' : selectedUser.roles.includes('editor') ? 'Editor' : 'Reviewer'} Special Role Assignment</h4>
                        <p>Assign a special role from available designation categories:</p>
                        <div className={styles.designationActions}>
                          <select
                            value={selectedUser.designationRole || ''}
                            onChange={(e) => {
                              const selectedRole = e.target.value;
                              if (selectedRole) {
                                // Find which designation this role belongs to
                                const designation = designations.find(d => 
                                  d.roles?.some(r => r.name === selectedRole)
                                );
                                if (designation) {
                                  // First set the designation
                                  handleUpdateDesignation(selectedUser._id, designation.name);
                                  // Then set the role
                                  setTimeout(() => {
                                    handleUpdateDesignationRole(selectedUser._id, selectedRole);
                                  }, 100);
                                }
                              } else {
                                // Clear both designation and role
                                handleUpdateDesignation(selectedUser._id, '');
                              }
                            }}
                            className={styles.designationSelect}
                          >
                            <option value="">No Special Role</option>
                            {designations.map((designation) => 
                              designation.roles?.map((role) => (
                                <option key={`${designation._id}-${role._id}`} value={role.name}>
                                  {designation.name} - {role.name}
                                </option>
                              ))
                            )}
                          </select>
                          
                          {selectedUser.designation && selectedUser.designationRole && (
                            <div className={styles.currentAssignment}>
                              <p><strong>Current Assignment:</strong></p>
                              <p>{selectedUser.designation} - {selectedUser.designationRole}</p>
                            </div>
                          )}
                          
                          <button
                            onClick={() => {
                              setShowDesignationModal(true);
                              setShowUserModal(false); // Close user modal when opening designation modal
                            }}
                            className="btn btn-secondary btn-sm mt-2"
                          >
                            <FiAward /> Manage Available Roles
                          </button>
                        </div>
                      </div>
                    )}

                    {!selectedUser.isFounder && (
                      <div className={styles.dangerZone}>
                        <h4>Danger Zone</h4>
                        <p>Permanently delete this user account. This action cannot be undone.</p>
                        <button
                          onClick={() => handleDeleteUser(selectedUser._id)}
                          className="btn btn-danger"
                        >
                          <FiTrash2 />
                          Delete User Account
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.restrictedAccess}>
                    <FiShield />
                    <p>You cannot modify the founder&apos;s account unless you are the founder.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
