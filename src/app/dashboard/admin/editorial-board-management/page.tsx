'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiTrash2, FiEdit, FiSave, FiX } from 'react-icons/fi';
import styles from './EditorialBoardManagement.module.scss';

interface Designation {
  _id: string;
  name: string;
  description: string;
  roles: Role[];
  order: number;
  isActive: boolean;
}

interface Role {
  _id: string;
  name: string;
  description: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  affiliation: string;
  bio: string;
  expertise: string[];
  orcid?: string;
  profileImage?: string;
  designation?: string;
  designationRole?: string;
}

interface BoardAssignment {
  _id?: string;
  userId: string;
  designation: string;
  role: string;
  description?: string;
  user?: User;
}

export default function EditorialBoardManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State for designations and roles
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [boardAssignments, setBoardAssignments] = useState<BoardAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for creating new designation
  const [newDesignation, setNewDesignation] = useState({ name: '', description: '' });
  const [showCreateDesignation, setShowCreateDesignation] = useState(false);
  
  // State for creating new role
  const [newRole, setNewRole] = useState({ name: '', description: '', designationId: '' });
  const [showCreateRole, setShowCreateRole] = useState(false);
  
  // State for assigning editors
  const [newAssignment, setNewAssignment] = useState({
    designation: '',
    role: '',
    userId: '',
    description: ''
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    const hasAdminAccess = session.user.roles?.includes('admin') || 
                          session.user.currentActiveRole === 'admin' || 
                          session.user.role === 'admin';

    if (!hasAdminAccess) {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [designationsRes, usersRes, assignmentsRes] = await Promise.all([
        fetch('/api/designations'),
        fetch('/api/users?role=editor'),
        fetch('/api/editorial-board-assignments')
      ]);

      if (designationsRes.ok) {
        const data = await designationsRes.json();
        setDesignations(data.designations || []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        setBoardAssignments(data.assignments || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDesignation = async () => {
    if (!newDesignation.name.trim()) return;

    try {
      const response = await fetch('/api/designations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDesignation)
      });

      if (response.ok) {
        setNewDesignation({ name: '', description: '' });
        setShowCreateDesignation(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating designation:', error);
    }
  };

  const createRole = async () => {
    if (!newRole.name.trim() || !newRole.designationId) return;

    try {
      const response = await fetch(`/api/designations/${newRole.designationId}/roles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRole.name,
          description: newRole.description
        })
      });

      if (response.ok) {
        setNewRole({ name: '', description: '', designationId: '' });
        setShowCreateRole(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error creating role:', error);
    }
  };

  const assignEditor = async () => {
    if (!newAssignment.designation || !newAssignment.role || !newAssignment.userId) return;

    try {
      const response = await fetch('/api/editorial-board-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAssignment)
      });

      if (response.ok) {
        setNewAssignment({ designation: '', role: '', userId: '', description: '' });
        setSelectedUser(null);
        fetchData();
      }
    } catch (error) {
      console.error('Error assigning editor:', error);
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/editorial-board-assignments/${assignmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
    }
  };

  const deleteDesignation = async (designationId: string) => {
    if (!confirm('Are you sure you want to delete this designation? This will also remove all associated roles and assignments.')) {
      return;
    }

    try {
      const response = await fetch(`/api/designations/${designationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting designation:', error);
    }
  };

  const deleteRole = async (designationId: string, roleId: string) => {
    if (!confirm('Are you sure you want to delete this role? This will also remove all associated assignments.')) {
      return;
    }

    try {
      const response = await fetch(`/api/designations/${designationId}/roles/${roleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting role:', error);
    }
  };

  const handleUserSelection = (userId: string) => {
    const user = users.find(u => u._id === userId);
    setSelectedUser(user || null);
    setNewAssignment({ ...newAssignment, userId });
  };

  const getAvailableRoles = () => {
    const designation = designations.find(d => d.name === newAssignment.designation);
    return designation?.roles || [];
  };

  if (loading) {
    return <div className={styles.loading}>Loading editorial board management...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Editorial Board Management</h1>
        <p>Manage designations, roles, and editorial board assignments</p>
      </div>

      {/* Create Designation Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Designations</h2>
          <button
            className={styles.createButton}
            onClick={() => setShowCreateDesignation(!showCreateDesignation)}
          >
            <FiPlus /> Create Designation
          </button>
        </div>

        {showCreateDesignation && (
          <div className={styles.createForm}>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Designation name (e.g., Senior Editorial Board)"
                value={newDesignation.name}
                onChange={(e) => setNewDesignation({ ...newDesignation, name: e.target.value })}
              />
              <textarea
                placeholder="Description (optional)"
                value={newDesignation.description}
                onChange={(e) => setNewDesignation({ ...newDesignation, description: e.target.value })}
              />
              <div className={styles.formActions}>
                <button onClick={createDesignation} className={styles.saveButton}>
                  <FiSave /> Create
                </button>
                <button onClick={() => setShowCreateDesignation(false)} className={styles.cancelButton}>
                  <FiX /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className={styles.designationsList}>
          {designations.map((designation) => (
            <div key={designation._id} className={styles.designationCard}>
              <div className={styles.designationHeader}>
                <h3>{designation.name}</h3>
                <button
                  onClick={() => deleteDesignation(designation._id)}
                  className={styles.deleteButton}
                >
                  <FiTrash2 />
                </button>
              </div>
              {designation.description && (
                <p className={styles.description}>{designation.description}</p>
              )}
              
              {/* Roles for this designation */}
              <div className={styles.rolesSection}>
                <div className={styles.rolesHeader}>
                  <h4>Roles</h4>
                  <button
                    onClick={() => {
                      setNewRole({ ...newRole, designationId: designation._id });
                      setShowCreateRole(true);
                    }}
                    className={styles.addRoleButton}
                  >
                    <FiPlus /> Add Role
                  </button>
                </div>
                
                <div className={styles.rolesList}>
                  {designation.roles.map((role) => (
                    <div key={role._id} className={styles.roleItem}>
                      <span>{role.name}</span>
                      <button
                        onClick={() => deleteRole(designation._id, role._id)}
                        className={styles.deleteRoleButton}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateRole && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Create New Role</h3>
            <div className={styles.formGroup}>
              <input
                type="text"
                placeholder="Role name (e.g., Editor-in-Chief)"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              />
              <textarea
                placeholder="Role description (optional)"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              />
              <div className={styles.formActions}>
                <button onClick={createRole} className={styles.saveButton}>
                  <FiSave /> Create Role
                </button>
                <button onClick={() => setShowCreateRole(false)} className={styles.cancelButton}>
                  <FiX /> Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Editor Section */}
      <div className={styles.section}>
        <h2>Assign Editor to Board</h2>
        <div className={styles.assignmentForm}>
          <div className={styles.formRow}>
            <select
              value={newAssignment.designation}
              onChange={(e) => setNewAssignment({ ...newAssignment, designation: e.target.value, role: '' })}
            >
              <option value="">Select Designation</option>
              {designations.map((designation) => (
                <option key={designation._id} value={designation.name}>
                  {designation.name}
                </option>
              ))}
            </select>

            <select
              value={newAssignment.role}
              onChange={(e) => setNewAssignment({ ...newAssignment, role: e.target.value })}
              disabled={!newAssignment.designation}
            >
              <option value="">Select Role</option>
              {getAvailableRoles().map((role) => (
                <option key={role._id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>

            <select
              value={newAssignment.userId}
              onChange={(e) => handleUserSelection(e.target.value)}
            >
              <option value="">Select Editor</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div className={styles.userPreview}>
              <h4>Selected Editor Profile</h4>
              <div className={styles.userInfo}>
                <p><strong>Name:</strong> {selectedUser.name}</p>
                <p><strong>Email:</strong> {selectedUser.email}</p>
                <p><strong>Affiliation:</strong> {selectedUser.affiliation}</p>
                <p><strong>Bio:</strong> {selectedUser.bio}</p>
                {selectedUser.expertise.length > 0 && (
                  <p><strong>Expertise:</strong> {selectedUser.expertise.join(', ')}</p>
                )}
                {selectedUser.orcid && (
                  <p><strong>ORCID:</strong> {selectedUser.orcid}</p>
                )}
              </div>
            </div>
          )}

          <textarea
            placeholder="Additional description (optional)"
            value={newAssignment.description}
            onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
            className={styles.descriptionField}
          />

          <button
            onClick={assignEditor}
            className={styles.assignButton}
            disabled={!newAssignment.designation || !newAssignment.role || !newAssignment.userId}
          >
            <FiPlus /> Assign Editor
          </button>
        </div>
      </div>

      {/* Current Assignments */}
      <div className={styles.section}>
        <h2>Current Board Assignments</h2>
        <div className={styles.assignmentsList}>
          {boardAssignments.map((assignment) => (
            <div key={assignment._id} className={styles.assignmentCard}>
              <div className={styles.assignmentHeader}>
                <h4>{assignment.user?.name}</h4>
                <button
                  onClick={() => removeAssignment(assignment._id!)}
                  className={styles.removeButton}
                >
                  <FiTrash2 />
                </button>
              </div>
              <p><strong>Designation:</strong> {assignment.designation}</p>
              <p><strong>Role:</strong> {assignment.role}</p>
              <p><strong>Email:</strong> {assignment.user?.email}</p>
              {assignment.description && (
                <p><strong>Description:</strong> {assignment.description}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
