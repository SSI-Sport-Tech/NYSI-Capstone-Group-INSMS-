/**
 * NYSI Admin Controller
 * Admin-only endpoints for user management
 * 
 * Features:
 * - List all users
 * - View user details
 * - Activate/deactivate users
 * - Change user passwords
 * - Update user email (2FA email)
 * - Update user roles
 * - Delete users
 */

import * as adminservices from './adminServices.js';
import * as authservices from '../Auth/services.js';
import {
    adminUpdateUserSchema,
    adminChangePasswordSchema,
    adminChangeEmailSchema,
    adminToggleActiveSchema,
} from './adminValidation.js';
import { canManageUser } from "../../utils/permissions.js";

import { z } from 'zod';
import bcrypt from 'bcrypt';

// ============================================================================
// LIST ALL USERS
// ============================================================================

/**
 * Get all users (admin only)
 * GET /api/admin/users
 */
export async function getAllUsers(req, res) {
    try {
        console.log('📋 Admin fetching all users...');
        console.log('Requested by:', req.user.email, '(', req.user.role, ')');

        // Optional filters from query params
        const { role, is_active, search } = req.query;

        const users = await adminservices.getAllUsers({
            role,
            is_active: is_active === 'true' ? true : is_active === 'false' ? false : undefined,
            search,
        });

        console.log(`Found ${users.length} users`);

        res.json({
            message: 'Users retrieved successfully',
            count: users.length,
            users: users.map(user => ({
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                is_active: user.is_active,
                is_email_verified: user.is_email_verified,
                last_login_at: user.last_login_at,
                has_nutritionist_profile: !!user.nutritionist_id,
            })),
        });

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            error: 'Failed to fetch users',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// GET USER DETAILS
// ============================================================================

/**
 * Get user details by ID (admin only)
 * GET /api/admin/users/:id
 */
export async function getUserDetails(req, res) {
    try {
        console.log('👤 Admin fetching user details...');
        console.log('User ID:', req.params.id);
        console.log('Requested by:', req.user.email);

        const user = await adminservices.getUserByIdWithProfile(req.params.id);

        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'No user found with this ID',
            });
        }

        console.log('User details retrieved');

        res.json({
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                is_active: user.is_active,
                is_email_verified: user.is_email_verified,
                created_at: user.created_at,
                last_login_at: user.last_login_at,
                updated_at: user.updated_at,
                // AMS profile info if exists
                nutritionist_profile: user.nutritionist_id ? {
                    id: user.nutritionist_id,
                    name: user.nutritionist_name,
                } : null,
            },
        });

    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({
            error: 'Failed to fetch user details',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// ACTIVATE/DEACTIVATE USER
// ============================================================================

/**
 * Activate or deactivate a user (admin only)
 * PATCH /api/admin/users/:id/active
 */
export async function toggleUserActive(req, res) {
    try {
        console.log('🔄 Admin toggling user active status...');
        console.log('User ID:', req.params.id);
        console.log('Requested by:', req.user.email);

        // Validate request body
        const validatedData = adminToggleActiveSchema.parse(req.body);

        // Prevent admin from deactivating themselves
        if (req.params.id === req.user.userId) {
            return res.status(400).json({
                error: 'Cannot modify own account',
                message: 'You cannot deactivate your own account',
            });
        }

        // Get user to check if exists
        const user = await authservices.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'No user found with this ID',
            });
        }

        //Check if user is allowed to edit target
        if (!canManageUser(req.user.role, user.role)) {
            return res.status(403).json({
                error: "You do not have permission to manage this user",
            });
        }

        // Update active status
        await adminservices.updateUserActiveStatus(req.params.id, validatedData.is_active);

        console.log(`User ${validatedData.is_active ? 'activated' : 'deactivated'} successfully`);

        res.json({
            message: `User ${validatedData.is_active ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: user.id,
                email: user.email,
                is_active: validatedData.is_active,
            },
        });

    } catch (error) {
        console.error('Error toggling user active status:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            });
        }

        res.status(500).json({
            error: 'Failed to update user status',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// CHANGE USER PASSWORD
// ============================================================================

/**
 * Change user password (admin only)
 * PATCH /api/admin/users/:id/password
 */
export async function changeUserPassword(req, res) {
    try {
        console.log('🔑 Admin changing user password...');
        console.log('User ID:', req.params.id);
        console.log('Requested by:', req.user.email);

        // Validate request body
        const validatedData = adminChangePasswordSchema.parse(req.body);

        // Get user to check if exists
        const user = await authservices.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'No user found with this ID',
            });
        }

        //Check if user is allowed to edit target
        if (!canManageUser(req.user.role, user.role)) {
            return res.status(403).json({
                error: "You do not have permission to manage this user",
            });
        }

        // Hash new password
        console.log('Hashing new password...');
        const hashedPassword = await bcrypt.hash(validatedData.new_password, 10);

        // Update password
        await adminservices.updateUserPassword(req.params.id, hashedPassword);

        // Invalidate all sessions for this user (force re-login)
        await authservices.invalidateAllSessions(req.params.id);

        console.log('Password changed successfully');

        res.json({
            message: 'Password changed successfully. User will need to login again.',
            user: {
                id: user.id,
                email: user.email,
            },
        });

    } catch (error) {
        console.error('Error changing user password:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            });
        }

        res.status(500).json({
            error: 'Failed to change password',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// CHANGE USER EMAIL
// ============================================================================

/**
 * Change user email / 2FA email (admin only)
 * PATCH /api/admin/users/:id/email
 */
export async function changeUserEmail(req, res) {
    try {
        console.log('📧 Admin changing user email...');
        console.log('User ID:', req.params.id);
        console.log('Requested by:', req.user.email);

        // Validate request body
        const validatedData = adminChangeEmailSchema.parse(req.body);

        // Prevent admin from changing their own email (should use regular flow)
        if (req.params.id === req.user.userId) {
            return res.status(400).json({
                error: 'Cannot modify own email',
                message: 'Please use the regular email change flow for your own account',
            });
        }

        // Get user to check if exists
        const user = await authservices.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'No user found with this ID',
            });
        }

        //Check if user is allowed to edit target
        if (!canManageUser(req.user.role, user.role)) {
            return res.status(403).json({
                error: "You do not have permission to manage this user",
            });
        }

        // Check if new email already exists
        const existingUser = await authservices.getUserByEmail(validatedData.new_email);
        if (existingUser && existingUser.id !== req.params.id) {
            return res.status(409).json({
                error: 'Email already in use',
                message: 'This email address is already associated with another account',
            });
        }

        // Update email
        await adminservices.updateUserEmail(req.params.id, validatedData.new_email);

        // Optionally set email as unverified
        if (validatedData.reset_verification) {
            await adminservices.updateUserEmailVerification(req.params.id, false);
        }

        console.log('Email changed successfully');

        res.json({
            message: 'Email changed successfully',
            user: {
                id: user.id,
                old_email: user.email,
                new_email: validatedData.new_email,
                is_email_verified: validatedData.reset_verification ? false : user.is_email_verified,
            },
        });

    } catch (error) {
        console.error('Error changing user email:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            });
        }

        res.status(500).json({
            error: 'Failed to change email',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// UPDATE USER DETAILS
// ============================================================================

/**
 * Update user details (admin only)
 * PATCH /api/admin/users/:id
 */
export async function updateUser(req, res) {
    try {
        console.log('✏️ Admin updating user details...');
        console.log('User ID:', req.params.id);
        console.log('Requested by:', req.user.email);

        // Validate request body
        const validatedData = adminUpdateUserSchema.parse(req.body);

        // Get user to check if exists
        const user = await authservices.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'No user found with this ID',
            });
        }

        //Check if user is allowed to edit target
        if (!canManageUser(req.user.role, user.role)) {
            return res.status(403).json({
                error: "You do not have permission to manage this user",
            });
        }

        // Prevent changing own role (security measure)
        if (req.params.id === req.user.userId && validatedData.role) {
            return res.status(400).json({
                error: 'Cannot modify own role',
                message: 'You cannot change your own role',
            });
        }

        // Update user
        const updatedUser = await adminservices.updateUser(req.params.id, validatedData);

        // If role changed to ADMIN or NUTRITIONIST and no profile exists, create one
        if (validatedData.role && ['ADMIN', 'NUTRITIONIST'].includes(validatedData.role)) {
            const existingProfile = await authservices.getNutritionistByUserId(req.params.id);
            if (!existingProfile) {
                console.log('Creating AMS nutritionist profile for role change...');
                await authservices.createNutritionistProfile({
                    name: `${updatedUser.first_name} ${updatedUser.last_name}`,
                    user_id: req.params.id,
                });
            }
        }

        console.log('User updated successfully');

        res.json({
            message: 'User updated successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                first_name: updatedUser.first_name,
                last_name: updatedUser.last_name,
                role: updatedUser.role,
                is_active: updatedUser.is_active,
            },
        });

    } catch (error) {
        console.error('Error updating user:', error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                })),
            });
        }

        res.status(500).json({
            error: 'Failed to update user',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// DELETE USER
// ============================================================================

/**
 * Delete user (admin only)
 * DELETE /api/admin/users/:id
 */
export async function deleteUser(req, res) {
    try {
        console.log('🗑️ Admin deleting user...');
        console.log('User ID:', req.params.id);
        console.log('Requested by:', req.user.email);

        // Prevent admin from deleting themselves
        if (req.params.id === req.user.userId) {
            return res.status(400).json({
                error: 'Cannot delete own account',
                message: 'You cannot delete your own account',
            });
        }

        // Get user to check if exists
        const user = await authservices.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'No user found with this ID',
            });
        }

        //Check if user is allowed to edit target
        if (!canManageUser(req.user.role, user.role)) {
            return res.status(403).json({
                error: "You do not have permission to manage this user",
            });
        }

        const targetRole = result.rows[0].role;
        if (actingUserRole === "ADMIN") {
            if (targetRole !== "NUTRITIONIST") {
                return res.status(403).json({
                    error: "Admins can only manage Nutritionists",
                });
            }
        }

        // Delete user (cascade will delete AMS profile, sessions, verification codes)
        await authservices.deleteUserById(req.params.id);

        console.log('User deleted successfully');

        res.json({
            message: 'User deleted successfully',
            deleted_user: {
                id: user.id,
                email: user.email,
            },
        });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            error: 'Failed to delete user',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// GET USER ACTIVITY LOG
// ============================================================================

/**
 * Get user's recent activity/sessions (admin only)
 * GET /api/admin/users/:id/activity
 */
export async function getUserActivity(req, res) {
    try {
        console.log('📊 Admin fetching user activity...');
        console.log('User ID:', req.params.id);

        const user = await authservices.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'No user found with this ID',
            });
        }

        const sessions = await authservices.getActiveSessions(req.params.id);

        res.json({
            message: 'User activity retrieved',
            user: {
                id: user.id,
                email: user.email,
                last_login_at: user.last_login_at,
            },
            active_sessions: sessions.length,
            sessions: sessions.map(session => ({
                id: session.id,
                ip_address: session.ip_address,
                user_agent: session.user_agent,
                created_at: session.created_at,
                expires_at: session.expires_at,
            })),
        });

    } catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({
            error: 'Failed to fetch user activity',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}
