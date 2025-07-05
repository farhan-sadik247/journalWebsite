/**
 * Test script for Admin Manuscript Management API
 * 
 * This script demonstrates the API endpoints for admin manuscript management.
 * It should be run by an authenticated admin user.
 */

// Example fetch calls for testing the admin manuscript management API

// 1. Get all manuscripts (admin view)
async function getAllManuscriptsForAdmin() {
  try {
    const response = await fetch('/api/manuscripts?admin=true', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Admin manuscripts:', data);
      return data.manuscripts;
    } else {
      const error = await response.json();
      console.error('Error fetching manuscripts:', error);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

// 2. Delete a manuscript (admin only)
async function deleteManuscript(manuscriptId: string) {
  if (!confirm('Are you sure you want to delete this manuscript? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`/api/manuscripts/${manuscriptId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Manuscript deleted successfully:', data);
      return true;
    } else {
      const error = await response.json();
      console.error('Error deleting manuscript:', error);
      return false;
    }
  } catch (error) {
    console.error('Network error:', error);
    return false;
  }
}

// 3. Test admin access validation
async function testAdminAccess() {
  try {
    // Try to access admin endpoint without admin permissions
    const response = await fetch('/api/manuscripts?admin=true');
    
    if (response.status === 403) {
      console.log('✓ Admin access correctly blocked for non-admin users');
    } else if (response.ok) {
      console.log('✓ Admin access granted - user has admin permissions');
    } else {
      console.log('? Unexpected response:', response.status);
    }
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Usage examples:
/*
// In browser console or admin interface:

// Get all manuscripts
const manuscripts = await getAllManuscriptsForAdmin();

// Delete a specific manuscript (replace with actual ID)
const deleted = await deleteManuscript('manuscript_id_here');

// Test admin access
await testAdminAccess();
*/

export { getAllManuscriptsForAdmin, deleteManuscript, testAdminAccess };
