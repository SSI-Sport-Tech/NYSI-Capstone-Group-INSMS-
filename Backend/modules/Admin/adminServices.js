/**
 * Clean Admin Services - No Duplication
 * Only admin-specific functions here
 * Reuses functions from authservices where appropriate
 */

import pool, { withUserContext } from '../../config/db.js';
import * as authservices from '../Auth/services.js';

// ============================================================================
// ADMIN USER MANAGEMENT SERVICES
// ============================================================================

/**
 * Get all users with optional filters
 * @param {Object} filters - Optional filters
 * @param {string} filters.role - Filter by role
 * @param {boolean} filters.is_active - Filter by active status
 * @param {string} filters.search - Search by name or email
 * @returns {Promise<Array>} Array of users with AMS profile info
 */
export async function getAllUsers(filters = {}) {
    let query = `
        SELECT 
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.role,
            u.is_active,
            u.is_email_verified,
            u.created_at,
            u.last_login,
            u.updated_at,
            n.id AS nutritionist_id,
            n.name AS nutritionist_name
        FROM auth.users u
        LEFT JOIN ams.nutritionist n ON u.id = n.user_id
        WHERE 1=1
    `;

    const values = [];
    let paramCount = 0;

    // Add role filter
    if (filters.role) {
        paramCount++;
        query += ` AND u.role = $${paramCount}`;
        values.push(filters.role);
    }

    // Add active status filter
    if (filters.is_active !== undefined) {
        paramCount++;
        query += ` AND u.is_active = $${paramCount}`;
        values.push(filters.is_active);
    }

    // Add search filter (name or email)
    if (filters.search) {
        paramCount++;
        query += ` AND (
            u.email ILIKE $${paramCount} OR 
            u.first_name ILIKE $${paramCount} OR 
            u.last_name ILIKE $${paramCount} OR
            CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramCount}
        )`;
        values.push(`%${filters.search}%`);
    }

    query += ` ORDER BY u.created_at DESC`;

    const result = await pool.query(query, values);
    return result.rows;
}

/**
 * Get user by ID with AMS profile information
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} User object with profile or null
 */
export async function getUserByIdWithProfile(userId) {
    const query = `
        SELECT 
            u.id,
            u.email,
            u.first_name,
            u.last_name,
            u.role,
            u.is_active,
            u.is_email_verified,
            u.created_at,
            u.last_login,
            u.updated_at,
            n.id AS nutritionist_id,
            n.name AS nutritionist_name
        FROM auth.users u
        LEFT JOIN ams.nutritionist n ON u.id = n.user_id
        WHERE u.id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Update user active status
 * @param {string} userId - User UUID
 * @param {boolean} isActive - Active status
 * @param {string} doneByUserId - UUID of user performing action
 * @returns {Promise<void>}
 */
export async function updateUserActiveStatus(userId, isActive, doneByUserId) {
    return withUserContext(doneByUserId, async (client) => {
        const result = await client.query(`
            UPDATE auth.users
            SET is_active = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, email, is_active
        `, [isActive, userId]);

        return result.rows[0];
    });
}

/**
 * Update user password
 * @param {string} userId - User UUID
 * @param {string} passwordHash - New hashed password
 * @param {string} doneByUserId - UUID of user performing action
 * @returns {Promise<void>}
 */
export async function updateUserPassword(userId, passwordHash, doneByUserId) {
    return withUserContext(doneByUserId, async (client) => {
        const result = await client.query(`
            UPDATE auth.users
            SET password_hash = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, email
        `, [passwordHash, userId]);

        return result.rows[0];
    });
}

/**
 * Update user email
 * @param {string} userId - User UUID
 * @param {string} newEmail - New email address
 * @param {string} doneByUserId - UUID of user performing action
 * @returns {Promise<void>}
 */
export async function updateUserEmail(userId, newEmail, doneByUserId) {
    return withUserContext(doneByUserId, async (client) => {
        const result = await client.query(`
            UPDATE auth.users
            SET email = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, email
        `, [newEmail.toLowerCase(), userId]);

        return result.rows[0];
    });
}

/**
 * Update user email verification status
 * @param {string} userId - User UUID
 * @param {boolean} isVerified - Verification status
 * @param {string} doneByUserId - UUID of user performing action
 * @returns {Promise<void>}
 */
export async function updateUserEmailVerification(userId, isVerified, doneByUserId) {
    return withUserContext(doneByUserId, async (client) => {
        const result = await client.query(`
            UPDATE auth.users
            SET is_email_verified = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, email, is_email_verified
        `, [isVerified, userId]);

        return result.rows[0];
    });
}

/**
 * Update user details
 * @param {string} userId - User UUID
 * @param {Object} updates - Fields to update
 * @param {string} doneByUserId - UUID of user performing action
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUser(userId, updates, doneByUserId) {
    return withUserContext(doneByUserId, async (client) => {
        const allowedFields = ['first_name', 'last_name', 'role', 'is_active', 'is_email_verified'];
        const fields = [];
        const values = [userId];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key) && value !== undefined) {
                paramCount++;
                fields.push(`${key} = $${paramCount}`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        paramCount++;
        fields.push(`updated_at = NOW()`);

        const query = `
            UPDATE auth.users
            SET ${fields.join(', ')}
            WHERE id = $1
            RETURNING 
                id, email, first_name, last_name, role, 
                is_active, is_email_verified, created_at, 
                last_login, updated_at
        `;

        const result = await client.query(query, values);
        return result.rows[0];
    });
}

/**
 * Get user statistics (for admin dashboard)
 * @returns {Promise<Object>} User statistics
 */
export async function getUserStatistics() {
    const query = `
        SELECT
            COUNT(*) AS total_users,
            COUNT(*) FILTER (WHERE is_active = true) AS active_users,
            COUNT(*) FILTER (WHERE is_active = false) AS inactive_users,
            COUNT(*) FILTER (WHERE role = 'IT_ADMIN') AS it_admins,
            COUNT(*) FILTER (WHERE role = 'ADMIN') AS admins,
            COUNT(*) FILTER (WHERE role = 'NUTRITIONIST') AS nutritionists,
            COUNT(*) FILTER (WHERE role = 'COACH') AS coaches,
            COUNT(*) FILTER (WHERE role = 'ATHLETE') AS athletes,
            COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') AS active_last_week,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_last_month
        FROM auth.users
    `;

    const result = await pool.query(query);
    return result.rows[0];
}

/**
 * Get audit logs with optional filters (ENHANCED with date filtering)
 * @param {Object} filters - Optional filters
 * @param {string} filters.user_id - Filter by user ID
 * @param {string} filters.table_name - Filter by table name
 * @param {string} filters.action - Filter by action (CREATE, UPDATE, DELETE)
 * @param {string} filters.start_date - Filter by start date (YYYY-MM-DD)
 * @param {string} filters.end_date - Filter by end date (YYYY-MM-DD)
 * @param {number} filters.limit - Maximum number of logs to return (default: 50)
 * @returns {Promise<Array>} Array of audit log entries
 */
export async function getAuditLogs(filters = {}) {
    let query = `
        SELECT 
            id, user_id, table_name, record_id, action,
            old_values, new_values, changed_on
        FROM audit.audit_log
        WHERE 1=1
    `;

    const values = [];
    let paramCount = 0;

    // Add user_id filter
    if (filters.user_id) {
        paramCount++;
        query += ` AND user_id = $${paramCount}`;
        values.push(filters.user_id);
    }

    // Add table_name filter
    if (filters.table_name) {
        paramCount++;
        query += ` AND table_name = $${paramCount}`;
        values.push(filters.table_name);
    }

    // Add action filter
    if (filters.action) {
        paramCount++;
        query += ` AND action = $${paramCount}`;
        values.push(filters.action);
    }

    // Add start_date filter (>= start of day)
    if (filters.start_date) {
        paramCount++;
        query += ` AND changed_on >= $${paramCount}::date`;
        values.push(filters.start_date);
    }

    // Add end_date filter (<= end of day)
    if (filters.end_date) {
        paramCount++;
        query += ` AND changed_on < ($${paramCount}::date + interval '1 day')`;
        values.push(filters.end_date);
    }

    // Order by most recent first
    query += ` ORDER BY changed_on DESC`;

    // Add limit
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(parseInt(filters.limit) || 50);

    const result = await pool.query(query, values);
    return result.rows;
}

/**
 * Get audit log statistics
 * @param {string} userId - Optional user ID to filter by
 * @returns {Promise<Object>} Audit log statistics
 */
export async function getAuditLogStatistics(userId = null) {
    let query = `
        SELECT
            COUNT(*) AS total_logs,
            COUNT(*) FILTER (WHERE action = 'CREATE') AS creates,
            COUNT(*) FILTER (WHERE action = 'UPDATE') AS updates,
            COUNT(*) FILTER (WHERE action = 'DELETE') AS deletes,
            COUNT(DISTINCT table_name) AS tables_affected,
            MIN(changed_on) AS earliest_log,
            MAX(changed_on) AS latest_log
        FROM audit.audit_log
    `;

    const values = [];

    if (userId) {
        query += ` WHERE user_id = $1`;
        values.push(userId);
    }

    const result = await pool.query(query, values);
    return result.rows[0];
}

/**
 * Get unique table names from audit log
 * @returns {Promise<Array>} Array of unique table names
 */
export async function getAuditedTables() {
    const query = `
        SELECT DISTINCT table_name
        FROM audit.audit_log
        ORDER BY table_name
    `;

    const result = await pool.query(query);
    return result.rows.map(row => row.table_name);
}

/**
 * Get recent audit logs for a specific record
 * @param {string} tableName - Table name
 * @param {string} recordId - Record ID
 * @param {number} limit - Maximum number of logs (default: 10)
 * @returns {Promise<Array>} Array of audit logs for the record
 */
export async function getRecordAuditHistory(tableName, recordId, limit = 10) {
    const query = `
        SELECT 
            id, user_id, table_name, record_id, action,
            old_values, new_values, changed_on
        FROM audit.audit_log
        WHERE table_name = $1 AND record_id = $2
        ORDER BY changed_on DESC
        LIMIT $3
    `;

    const result = await pool.query(query, [tableName, recordId, limit]);
    return result.rows;
}