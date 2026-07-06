# 👨‍💼 Admin User Management Guide

## Overview

Admins (ADMIN and IT_ADMIN roles) can now manage all users with full control over:
- ✅ **User Status** - Activate/deactivate accounts
- ✅ **Passwords** - Reset any user's password
- ✅ **Email Addresses** - Change 2FA email addresses
- ✅ **User Details** - Update names, roles, verification status
- ✅ **Account Deletion** - Remove users permanently
- ✅ **Activity Monitoring** - View user sessions and activity

## New Admin Endpoints

All endpoints require `ADMIN` or `IT_ADMIN` role.

### Base URL
```
/api/admin/*
```

## 1. List All Users

**GET** `/api/admin/users`

Get all users with optional filters.

**Query Parameters:**
```
?role=NUTRITIONIST          # Filter by role
&is_active=true             # Filter by active status
&search=john                # Search by name or email
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/admin/users?role=NUTRITIONIST&is_active=true" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "message": "Users retrieved successfully",
  "count": 5,
  "users": [
    {
      "id": "uuid",
      "email": "jane@nysi.org.sg",
      "first_name": "Jane",
      "last_name": "Smith",
      "role": "NUTRITIONIST",
      "is_active": true,
      "is_email_verified": true,
      "created_at": "2024-01-15T10:30:00Z",
      "last_login": "2024-02-10T14:22:00Z",
      "has_nutritionist_profile": true
    }
  ]
}
```

## 2. Get User Details

**GET** `/api/admin/users/:id`

Get detailed information about a specific user.

**Example:**
```bash
curl -X GET "http://localhost:8000/api/admin/users/USER_UUID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "jane@nysi.org.sg",
    "first_name": "Jane",
    "last_name": "Smith",
    "role": "NUTRITIONIST",
    "is_active": true,
    "is_email_verified": true,
    "created_at": "2024-01-15T10:30:00Z",
    "last_login": "2024-02-10T14:22:00Z",
    "updated_at": "2024-02-10T14:22:00Z",
    "nutritionist_profile": {
      "id": "profile-uuid",
      "name": "Jane Smith"
    }
  }
}
```

## 3. Activate/Deactivate User

**PATCH** `/api/admin/users/:id/active`

Deactivate a user to prevent them from logging in. They can be reactivated later.

**Request Body:**
```json
{
  "is_active": false
}
```

**Example - Deactivate User:**
```bash
curl -X PATCH "http://localhost:8000/api/admin/users/USER_UUID/active" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

**Response:**
```json
{
  "message": "User deactivated successfully",
  "user": {
    "id": "uuid",
    "email": "jane@nysi.org.sg",
    "is_active": false
  }
}
```

**Example - Reactivate User:**
```bash
curl -X PATCH "http://localhost:8000/api/admin/users/USER_UUID/active" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": true}'
```

**Use Cases:**
- Temporarily suspend a user
- Reactivate after suspension
- Disable compromised accounts

## 4. Change User Password

**PATCH** `/api/admin/users/:id/password`

Reset a user's password. All their active sessions will be invalidated (forced re-login).

**Request Body:**
```json
{
  "new_password": "NewSecurePass123!",
  "confirm_password": "NewSecurePass123!"
}
```

**Example:**
```bash
curl -X PATCH "http://localhost:8000/api/admin/users/USER_UUID/password" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_password": "NewSecurePass123!",
    "confirm_password": "NewSecurePass123!"
  }'
```

**Response:**
```json
{
  "message": "Password changed successfully. User will need to login again.",
  "user": {
    "id": "uuid",
    "email": "jane@nysi.org.sg"
  }
}
```

**Use Cases:**
- User forgot password and requests admin help
- Force password reset for security
- Unlock account after too many failed login attempts

## 5. Change User Email (2FA Email)

**PATCH** `/api/admin/users/:id/email`

Change the email address where 2FA codes are sent.

**Request Body:**
```json
{
  "new_email": "new.email@nysi.org.sg",
  "reset_verification": true
}
```

**Example:**
```bash
curl -X PATCH "http://localhost:8000/api/admin/users/USER_UUID/email" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_email": "new.email@nysi.org.sg",
    "reset_verification": true
  }'
```

**Response:**
```json
{
  "message": "Email changed successfully",
  "user": {
    "id": "uuid",
    "old_email": "jane@nysi.org.sg",
    "new_email": "new.email@nysi.org.sg",
    "is_email_verified": false
  }
}
```

**Parameters:**
- `new_email` (required) - New email address
- `reset_verification` (optional, default: true) - Mark email as unverified

**Use Cases:**
- User changed corporate email
- Update email to correct typo
- Migrate user to new email system

## 6. Update User Details

**PATCH** `/api/admin/users/:id`

Update user's name, role, or verification status.

**Request Body:**
```json
{
  "first_name": "Jane",
  "last_name": "Doe",
  "role": "ADMIN",
  "is_email_verified": true
}
```

**Example - Promote to Admin:**
```bash
curl -X PATCH "http://localhost:8000/api/admin/users/USER_UUID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role": "ADMIN"
  }'
```

**Response:**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "uuid",
    "email": "jane@nysi.org.sg",
    "first_name": "Jane",
    "last_name": "Doe",
    "role": "ADMIN",
    "is_active": true
  }
}
```

**Automatic Profile Creation:**
If you change a user's role to `ADMIN` or `NUTRITIONIST` and they don't have an AMS nutritionist profile, one will be created automatically.

**Use Cases:**
- Promote nutritionist to admin
- Fix typos in user names
- Manually verify email addresses
- Change user roles

## 7. Delete User

**DELETE** `/api/admin/users/:id`

Permanently delete a user and all associated data.

**Example:**
```bash
curl -X DELETE "http://localhost:8000/api/admin/users/USER_UUID" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "message": "User deleted successfully",
  "deleted_user": {
    "id": "uuid",
    "email": "jane@nysi.org.sg"
  }
}
```

**What Gets Deleted (CASCADE):**
- ✅ User account in `auth.users`
- ✅ AMS nutritionist profile (if exists)
- ✅ All active sessions
- ✅ All verification codes
- ✅ Audit logs will remain (user_id becomes NULL)

**Protection:**
- ❌ Cannot delete your own account
- ✅ Deletion is permanent (no undo)

## 8. View User Activity

**GET** `/api/admin/users/:id/activity`

View user's active sessions and last login.

**Example:**
```bash
curl -X GET "http://localhost:8000/api/admin/users/USER_UUID/activity" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Response:**
```json
{
  "message": "User activity retrieved",
  "user": {
    "id": "uuid",
    "email": "jane@nysi.org.sg",
    "last_login": "2024-02-10T14:22:00Z"
  },
  "active_sessions": 2,
  "sessions": [
    {
      "id": "session-uuid",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "created_at": "2024-02-10T14:22:00Z",
      "expires_at": "2024-02-11T14:22:00Z"
    }
  ]
}
```

## Security Protections

### 1. Admin Cannot Modify Themselves
- ❌ Cannot deactivate own account
- ❌ Cannot delete own account
- ❌ Cannot change own role
- ❌ Cannot change own email via admin endpoint
- ✅ Can change own password via admin endpoint

### 2. Session Invalidation
When password is changed:
- All user sessions are invalidated
- User must login again with new password

### 3. Email Uniqueness
- Email addresses must be unique
- Cannot change to an email that's already in use

### 4. Rate Limiting
- Admin endpoints: 30 requests per minute
- Prevents abuse and accidental bulk operations

## Integration with server.js

Add admin routes to your server:

```javascript
// server.js
import express from 'express';
import authRoutes from './modules/Auth/routes.js';
import adminRoutes from './modules/adminRoutes.js';

const app = express();

// Regular auth routes
app.use('/api/auth', authRoutes);

// Admin routes (requires ADMIN or IT_ADMIN)
app.use('/api/admin', adminRoutes);

// ... rest of server setup
```

## Testing Admin Features

### 1. Login as Admin

```bash
# Login with seed admin account
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "senior@nysi.org.sg",
    "password": "Password123!"
  }'

# Get verification code from terminal, then verify
curl -X POST http://localhost:8000/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "senior@nysi.org.sg",
    "code": "123456"
  }'

# Save the token
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 2. List All Users

```bash
curl -X GET "http://localhost:8000/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 3. Deactivate a Nutritionist

```bash
# Get user ID from list, then deactivate
curl -X PATCH "http://localhost:8000/api/admin/users/USER_ID/active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

### 4. Reset Password

```bash
curl -X PATCH "http://localhost:8000/api/admin/users/USER_ID/password" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_password": "NewPassword123!",
    "confirm_password": "NewPassword123!"
  }'
```

## Common Workflows

### Workflow 1: Onboard New Nutritionist
```bash
# 1. Admin registers new nutritionist
curl -X POST http://localhost:8000/api/auth/register \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new.nutritionist@nysi.org.sg",
    "password": "TempPassword123!",
    "first_name": "New",
    "last_name": "Nutritionist",
    "role": "NUTRITIONIST"
  }'

# 2. Admin tells nutritionist their temp password
# 3. Nutritionist logs in and admin can later change their password
```

### Workflow 2: Handle Forgotten Password
```bash
# 1. User contacts admin saying they forgot password
# 2. Admin resets password
curl -X PATCH "http://localhost:8000/api/admin/users/USER_ID/password" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_password": "TempPassword123!",
    "confirm_password": "TempPassword123!"
  }'

# 3. Admin tells user new temp password
# 4. User logs in and admin can change it again after they set their own
```

### Workflow 3: Suspend User Account
```bash
# 1. Deactivate user
curl -X PATCH "http://localhost:8000/api/admin/users/USER_ID/active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'

# 2. User cannot login
# 3. Reactivate when ready
curl -X PATCH "http://localhost:8000/api/admin/users/USER_ID/active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"is_active": true}'
```

### Workflow 4: Change User Email
```bash
# User changed their corporate email
curl -X PATCH "http://localhost:8000/api/admin/users/USER_ID/email" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "new_email": "new.email@nysi.org.sg",
    "reset_verification": true
  }'
```

## Swagger UI

All admin endpoints are documented in Swagger:

```
http://localhost:8000/docs
```

Look for the **"Admin"** tag in the API documentation.

## Files Added

1. ✅ `adminController.js` - All admin user management logic
2. ✅ `adminValidation.js` - Zod schemas for admin endpoints
3. ✅ `adminServices.js` - Database queries for admin operations
4. ✅ `adminRoutes.js` - Admin endpoint routes + Swagger docs

## Next Steps

1. ✅ Copy admin files to your `modules/Auth/` directory
2. ✅ Add admin service functions to `services.final.js`
3. ✅ Import admin routes in `server.js`
4. ✅ Test with admin account (`senior@nysi.org.sg`)
5. ✅ Protect with HTTPS in production
6. ✅ Set up admin audit logging (optional)

Your admins now have full control over user management! 🎉
