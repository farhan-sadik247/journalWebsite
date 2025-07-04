# Editorial Board Management System

## Overview
The Editorial Board Management system allows administrators to create and manage editorial board structures with a hierarchical designation and role system.

## Features

### 1. Designation Management
- **Create Designations**: Create categories like "Senior Editorial Board", "Associate Editorial Board", etc.
- **Delete Designations**: Remove entire designation categories (with confirmation)
- **Description Support**: Add optional descriptions to designations

### 2. Role Management
- **Create Roles**: Add specific roles within each designation (e.g., "Editor-in-Chief", "Associate Editor")
- **Delete Roles**: Remove specific roles from designations
- **Hierarchical Structure**: Roles are organized under their parent designations

### 3. Editor Assignment
- **User Selection**: Select from available editors via dropdown
- **Profile Preview**: Automatically fetch and display user profile information
- **Assignment Tracking**: View all current editorial board assignments
- **Remove Assignments**: Remove editors from board positions

### 4. Profile Integration
When selecting an editor, the system automatically displays:
- Name and email
- Institutional affiliation
- Biography
- Areas of expertise
- ORCID identifier (if available)

## API Endpoints

### Designations
- `GET /api/designations` - List all designations
- `POST /api/designations` - Create new designation
- `DELETE /api/designations/[id]` - Delete designation

### Roles
- `POST /api/designations/[id]/roles` - Add role to designation
- `DELETE /api/designations/[id]/roles/[roleId]` - Delete role

### Editorial Board Assignments
- `GET /api/editorial-board-assignments` - List all assignments
- `POST /api/editorial-board-assignments` - Create new assignment
- `DELETE /api/editorial-board-assignments/[id]` - Remove assignment

### Users
- `GET /api/users?role=editor` - Get all users with editor role

## Database Schema

### User Model Updates
The User model includes these fields for editorial board management:
- `designation`: String - The designation category
- `designationRole`: String - The specific role within the designation
- `roles`: Array - Multiple roles a user can have

### Designation Model
```typescript
{
  name: String (required, unique),
  description: String (optional),
  roles: [{
    name: String (required),
    description: String (optional)
  }],
  order: Number,
  isActive: Boolean
}
```

## Access Control
- Only users with admin role can access the Editorial Board Management page
- All API endpoints require admin authentication
- Role assignments automatically add 'editor' role to users if not already present

## Usage Flow

1. **Create Designations**: Start by creating designation categories
2. **Add Roles**: Add specific roles to each designation
3. **Assign Editors**: Select editors and assign them to specific designation-role combinations
4. **Manage**: View, edit, or remove assignments as needed

The system integrates with the existing editorial board display page to show the hierarchical structure to public users.
