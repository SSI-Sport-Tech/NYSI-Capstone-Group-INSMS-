/**
 * Unified Admin Controller
 * Handles all user management operations across AEMS, ICS and NOMS
 */
import * as services from './adminServices.js';
import { z } from 'zod';

// ── Validation schemas ────────────────────────────────────────────────────────
const createUserSchema = z.object({
    email: z.string().email(),
    pin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits'),
    full_name: z.string().min(1).optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    role: z.enum(['IT_ADMIN', 'ADMIN', 'NUTRITIONIST', 'COACH', 'ATHLETE', 'DASHBOARD']).default('DASHBOARD'),
});

const updateUserSchema = z.object({
    email: z.string().email().optional(),
    full_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    pin: z.string().regex(/^\d{6}$/).optional(),
    role: z.enum(['IT_ADMIN', 'ADMIN', 'NUTRITIONIST', 'COACH', 'ATHLETE', 'DASHBOARD']).optional(),
    is_active: z.boolean().optional(),
    is_email_verified: z.boolean().optional(),
});

// ── Helper: check if performer can modify target ──────────────────────────────
function canModify(performerRole, targetRole) {
    if (performerRole === 'IT_ADMIN') return true;
    if (performerRole === 'ADMIN') {
        return !['IT_ADMIN', 'ADMIN'].includes(targetRole);
    }
    return false;
}

// ============================================================================
// GET ALL USERS
// ============================================================================
export async function getAllUsers(req, res) {
    try {
        console.log('📋 Admin fetching all users...');
        console.log(`Requested by: ${req.user.email} ( ${req.user.role} )`);

        const filters = {};
        if (req.query.role) filters.role = req.query.role;
        if (req.query.search) filters.search = req.query.search;
        if (req.query.is_active !== undefined) {
            filters.is_active = req.query.is_active === 'true';
        }

        const users = await services.getAllUsers(filters);
        console.log(`Found ${users.length} users`);

        res.json({
            message: 'Users retrieved successfully',
            count: users.length,
            users,
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users', message: error.message });
    }
}

// ============================================================================
// GET USER BY ID (alias: getUserDetails for route compat)
// ============================================================================
export async function getUserDetails(req, res) {
    return getUserById(req, res);
}

export async function getUserById(req, res) {
    try {
        const user = await services.getUserByIdWithProfile(req.params.id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
}

// ============================================================================
// CREATE USER
// ============================================================================
export async function createUser(req, res) {
    try {
        const validatedData = createUserSchema.parse(req.body);

        // Only IT_ADMIN can create ADMIN or IT_ADMIN
        const effectiveRole = req.user.nomsRole || req.user.role;
        if (['ADMIN', 'IT_ADMIN'].includes(validatedData.role) && effectiveRole !== 'IT_ADMIN') {
            return res.status(403).json({ error: 'Only IT Admins can create Admin users' });
        }

        const newUser = await services.createUser(validatedData, req.user.id || req.user.userId);
        console.log(`✅ Created user: ${newUser.email}`);
        res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user', message: error.message });
    }
}

// ============================================================================
// UPDATE USER
// ============================================================================
export async function updateUser(req, res) {
    try {
        const targetUser = await services.getUserByIdWithProfile(req.params.id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const effectiveRole = req.user.nomsRole || req.user.role;
        if (!canModify(effectiveRole, targetUser.role)) {
            return res.status(403).json({ error: 'Insufficient permissions to modify this user' });
        }

        // Non-IT_ADMINs cannot change roles
        if (req.body.role && effectiveRole !== 'IT_ADMIN') {
            return res.status(403).json({ error: 'Only IT Admins can change user roles' });
        }

        const validatedData = updateUserSchema.parse(req.body);
        const updated = await services.updateUser(
            req.params.id,
            validatedData,
            req.user.id || req.user.userId
        );

        console.log(`✅ Updated user: ${updated.email}`);
        res.json({ message: 'User updated successfully', user: updated });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Email already exists' });
        }
        if (error.name === 'ZodError') {
            return res.status(400).json({ error: 'Validation failed', details: error.issues });
        }
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user', message: error.message });
    }
}

// ============================================================================
// DELETE USER
// ============================================================================
export async function deleteUser(req, res) {
    try {
        const effectiveRole = req.user.nomsRole || req.user.role;
        if (effectiveRole !== 'IT_ADMIN') {
            return res.status(403).json({ error: 'Only IT Admins can delete users' });
        }

        const targetUser = await services.getUserByIdWithProfile(req.params.id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Prevent self-deletion
        const performerId = req.user.id || req.user.userId;
        if (targetUser.id === performerId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await services.deleteUser(req.params.id, performerId);
        console.log(`🗑️  Deleted user: ${targetUser.email}`);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user', message: error.message });
    }
}

// ============================================================================
// TOGGLE ACTIVE STATUS
// ============================================================================
export async function toggleUserActive(req, res) {
    try {
        const { is_active } = req.body;
        if (typeof is_active !== 'boolean') {
            return res.status(400).json({ error: 'is_active must be a boolean' });
        }

        const targetUser = await services.getUserByIdWithProfile(req.params.id);
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        const effectiveRole = req.user.nomsRole || req.user.role;
        if (!canModify(effectiveRole, targetUser.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        const updated = await services.updateUserActiveStatus(
            req.params.id,
            is_active,
            req.user.id || req.user.userId
        );
        res.json({ message: `User ${is_active ? 'activated' : 'deactivated'}`, user: updated });
    } catch (error) {
        console.error('Error toggling user active:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
}

// ============================================================================
// GET USER STATISTICS
// ============================================================================
export async function getUserStats(req, res) {
    try {
        const stats = await services.getUserStatistics();
        res.json({ stats });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
}

// ============================================================================
// CHANGE PASSWORD (legacy - now PIN-based, kept for route compat)
// ============================================================================
export async function changeUserPassword(req, res) {
    // Redirect to PIN update
    const { new_password, pin } = req.body;
    const newPin = pin || new_password;
    if (!newPin || !/^\d{6}$/.test(newPin)) {
        return res.status(400).json({ error: 'PIN must be 6 digits' });
    }
    req.body = { pin: newPin };
    return updateUser(req, res);
}

// ============================================================================
// CHANGE EMAIL (kept for route compat)
// ============================================================================
export async function changeUserEmail(req, res) {
    const { new_email } = req.body;
    if (!new_email) return res.status(400).json({ error: 'new_email required' });
    req.body = { email: new_email };
    return updateUser(req, res);
}

// ============================================================================
// GET USER ACTIVITY
// ============================================================================
export async function getUserActivity(req, res) {
    try {
        const logs = await services.getAuditLogs({
            user_id: req.params.id,
            limit: 20,
        });
        res.json({ activity: logs });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch activity' });
    }
}

// ============================================================================
// GET AUDIT LOGS
// ============================================================================
export async function getAuditLogs(req, res) {
    try {
        const filters = {
            user_id: req.query.user_id,
            table_name: req.query.table_name,
            action: req.query.action,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            limit: req.query.limit || 50,
        };
        const logs = await services.getAuditLogs(filters);
        res.json({ logs, count: logs.length });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
}

// ============================================================================
// GET AUDIT LOG STATISTICS
// ============================================================================
export async function getAuditLogStatistics(req, res) {
    try {
        const stats = await services.getAuditLogStatistics(req.query.user_id || null);
        res.json({ message: 'Audit log statistics retrieved', statistics: stats });
    } catch (error) {
        console.error('Error fetching audit statistics:', error);
        res.status(500).json({ error: 'Failed to fetch audit statistics' });
    }
}

// ============================================================================
// GET AUDITED TABLES
// ============================================================================
export async function getAuditedTables(req, res) {
    try {
        const tables = await services.getAuditedTables();
        res.json({ message: 'Audited tables retrieved', count: tables.length, tables });
    } catch (error) {
        console.error('Error fetching audited tables:', error);
        res.status(500).json({ error: 'Failed to fetch audited tables' });
    }
}

// ============================================================================
// GET RECORD AUDIT HISTORY
// ============================================================================
export async function getRecordAuditHistory(req, res) {
    try {
        const { tableName, recordId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const logs = await services.getRecordAuditHistory(tableName, recordId, limit);
        res.json({ message: 'Record audit history retrieved', table_name: tableName, record_id: recordId, count: logs.length, data: logs });
    } catch (error) {
        console.error('Error fetching record audit history:', error);
        res.status(500).json({ error: 'Failed to fetch record audit history' });
    }
}