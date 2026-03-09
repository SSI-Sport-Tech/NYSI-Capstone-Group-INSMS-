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
                created_at: user.created_at
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
// ACTIVATE/DEACTIVATE USER (UPDATED)
// ============================================================================

export async function toggleUserActive(req, res) {
    try {
        console.log('🔄 Admin toggling user active status...');
        console.log('User ID:', req.params.id);
        console.log('Requested by:', req.user.email);

        const validatedData = adminToggleActiveSchema.parse(req.body);

        if (req.params.id === req.user.userId) {
            return res.status(400).json({
                error: 'Cannot modify own account',
            });
        }

        const user = await authservices.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!canManageUser(req.user.role, user.role)) {
            return res.status(403).json({
                error: "You do not have permission to manage this user",
            });
        }

        // ✅ PASS CURRENT USER ID FOR AUDIT
        const currentUserId = req.user.userId;
        await adminservices.updateUserActiveStatus(
            req.params.id,
            validatedData.is_active,
            currentUserId  // ← Added for audit
        );

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
        res.status(500).json({ error: 'Failed to update user status' });
    }
}

// ============================================================================
// CHANGE USER PASSWORD (UPDATED)
// ============================================================================

export async function changeUserPassword(req, res) {
    try {
        console.log('🔑 Admin changing user password...');

        const validatedData = adminChangePasswordSchema.parse(req.body);

        const user = await authservices.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!canManageUser(req.user.role, user.role)) {
            return res.status(403).json({
                error: "You do not have permission to manage this user",
            });
        }

        const hashedPassword = await bcrypt.hash(validatedData.new_password, 10);

        // ✅ PASS CURRENT USER ID FOR AUDIT
        const currentUserId = req.user.userId;
        await adminservices.updateUserPassword(
            req.params.id,
            hashedPassword,
            currentUserId  // ← Added for audit
        );

        await authservices.invalidateAllSessions(req.params.id);

        console.log('Password changed successfully');

        res.json({
            message: 'Password changed successfully. User will need to login again.',
            user: { id: user.id, email: user.email },
        });

    } catch (error) {
        console.error('Error changing user password:', error);
        res.status(500).json({ error: 'Failed to change password' });
    }
}
// ============================================================================
// CHANGE USER EMAIL (UPDATED)
// ============================================================================

export async function changeUserEmail(req, res) {
    try {
        console.log('📧 Admin changing user email...');

        const validatedData = adminChangeEmailSchema.parse(req.body);

        if (req.params.id === req.user.userId) {
            return res.status(400).json({
                error: 'Cannot modify own email',
            });
        }

        const user = await authservices.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!canManageUser(req.user.role, user.role)) {
            return res.status(403).json({
                error: "You do not have permission to manage this user",
            });
        }

        const existingUser = await authservices.getUserByEmail(validatedData.new_email);
        if (existingUser && existingUser.id !== req.params.id) {
            return res.status(409).json({ error: 'Email already in use' });
        }

        // ✅ PASS CURRENT USER ID FOR AUDIT
        const currentUserId = req.user.userId;
        await adminservices.updateUserEmail(
            req.params.id,
            validatedData.new_email,
            currentUserId  // ← Added for audit
        );

        if (validatedData.reset_verification) {
            await adminservices.updateUserEmailVerification(
                req.params.id,
                false,
                currentUserId  // ← Added for audit
            );
        }

        console.log('Email changed successfully');

        res.json({
            message: 'Email changed successfully',
            user: {
                id: user.id,
                old_email: user.email,
                new_email: validatedData.new_email,
            },
        });

    } catch (error) {
        console.error('Error changing user email:', error);
        res.status(500).json({ error: 'Failed to change email' });
    }
}

// ============================================================================
// UPDATE USER DETAILS (UPDATED)
// ============================================================================

export async function updateUser(req, res) {
    try {
        console.log('✏️ Admin updating user details...');

        const validatedData = adminUpdateUserSchema.parse(req.body);

        const user = await authservices.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!canManageUser(req.user.role, user.role)) {
            return res.status(403).json({
                error: "You do not have permission to manage this user",
            });
        }

        if (req.params.id === req.user.userId && validatedData.role) {
            return res.status(400).json({
                error: 'Cannot modify own role',
            });
        }

        // ✅ PASS CURRENT USER ID FOR AUDIT
        const currentUserId = req.user.userId;
        const updatedUser = await adminservices.updateUser(
            req.params.id,
            validatedData,
            currentUserId  // ← Added for audit
        );

        // Create AMS profile if role changed to ADMIN/NUTRITIONIST
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
        res.status(500).json({ error: 'Failed to update user' });
    }
}

// ============================================================================
// DELETE USER (UPDATED - Uses authservices)
// ============================================================================

export async function deleteUser(req, res) {
    try {
        console.log('🗑️ Admin deleting user...');
        console.log('User ID:', req.params.id);
        console.log('Requested by:', req.user.email);

        // Prevent self-deletion
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

        // Check permissions
        if (!canManageUser(req.user.role, user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to delete this user',
            });
        }

        // ✅ USE authservices.deleteUserById with current user ID
        const currentUserId = req.user.userId;
        await authservices.deleteUserById(
            req.params.id,   // User to delete
            currentUserId    // WHO is deleting (for audit)
        );

        console.log('✅ User deleted successfully');

        res.json({
            message: 'User deleted successfully',
            deleted_user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
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
// ============================================================================
// GET AUDIT LOGS (ENHANCED with date filtering)
// ============================================================================

/**
 * Get audit logs with filters (admin only)
 * GET /api/admin/audit-logs
 */
export async function getAuditLogs(req, res) {
    try {
        console.log('📋 Admin fetching audit logs...');
        console.log('Requested by:', req.user.email, '(', req.user.role, ')');

        // Optional filters from query params
        const { user_id, table_name, action, limit, start_date, end_date } = req.query;

        // Log date filters if provided
        if (start_date || end_date) {
            console.log('Date filters:', { start_date, end_date });
        }

        const logs = await adminservices.getAuditLogs({
            user_id,
            table_name,
            action,
            start_date,
            end_date,
            limit: limit ? parseInt(limit) : 50,
        });

        console.log(`Found ${logs.length} audit log entries`);

        res.json({
            message: 'Audit logs retrieved successfully',
            count: logs.length,
            filters_applied: {
                user_id: user_id || null,
                table_name: table_name || null,
                action: action || null,
                start_date: start_date || null,
                end_date: end_date || null,
            },
            data: logs,
        });

    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({
            error: 'Failed to fetch audit logs',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}


// ============================================================================
// GET AUDIT LOG STATISTICS
// ============================================================================

/**
 * Get audit log statistics (admin only)
 * GET /api/admin/audit-logs/statistics
 */
export async function getAuditLogStatistics(req, res) {
    try {
        console.log('📊 Admin fetching audit log statistics...');
        console.log('Requested by:', req.user.email);

        const { user_id } = req.query;

        const stats = await adminservices.getAuditLogStatistics(user_id);

        console.log('Audit log statistics retrieved');

        res.json({
            message: 'Audit log statistics retrieved successfully',
            statistics: {
                total_logs: parseInt(stats.total_logs),
                creates: parseInt(stats.creates),
                updates: parseInt(stats.updates),
                deletes: parseInt(stats.deletes),
                tables_affected: parseInt(stats.tables_affected),
                earliest_log: stats.earliest_log,
                latest_log: stats.latest_log,
            },
        });

    } catch (error) {
        console.error('Error fetching audit log statistics:', error);
        res.status(500).json({
            error: 'Failed to fetch audit log statistics',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// GET AUDITED TABLES
// ============================================================================

/**
 * Get list of unique table names in audit log (admin only)
 * GET /api/admin/audit-logs/tables
 */
export async function getAuditedTables(req, res) {
    try {
        console.log('📋 Admin fetching audited tables...');
        console.log('Requested by:', req.user.email);

        const tables = await adminservices.getAuditedTables();

        console.log(`Found ${tables.length} audited tables`);

        res.json({
            message: 'Audited tables retrieved successfully',
            count: tables.length,
            tables: tables,
        });

    } catch (error) {
        console.error('Error fetching audited tables:', error);
        res.status(500).json({
            error: 'Failed to fetch audited tables',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// GET RECORD AUDIT HISTORY
// ============================================================================

/**
 * Get audit history for a specific record (admin only)
 * GET /api/admin/audit-logs/:tableName/:recordId
 */
export async function getRecordAuditHistory(req, res) {
    try {
        console.log('📝 Admin fetching record audit history...');
        console.log('Table:', req.params.tableName);
        console.log('Record ID:', req.params.recordId);
        console.log('Requested by:', req.user.email);

        const { limit } = req.query;

        const logs = await adminservices.getRecordAuditHistory(
            req.params.tableName,
            req.params.recordId,
            limit ? parseInt(limit) : 10
        );

        console.log(`Found ${logs.length} audit log entries for record`);

        res.json({
            message: 'Record audit history retrieved successfully',
            table_name: req.params.tableName,
            record_id: req.params.recordId,
            count: logs.length,
            data: logs,
        });

    } catch (error) {
        console.error('Error fetching record audit history:', error);
        res.status(500).json({
            error: 'Failed to fetch record audit history',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}