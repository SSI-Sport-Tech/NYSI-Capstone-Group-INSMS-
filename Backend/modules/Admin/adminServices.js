/**
 * Additional Admin Service Functions
 * Add these to your services.final.js file
 */

import pool from '../../config/db.js';


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
            u.last_login_at,
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
            u.last_login_at,
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
 * @returns {Promise<void>}
 */
export async function updateUserActiveStatus(userId, isActive) {
    const query = `
        UPDATE auth.users
        SET 
            is_active = $2,
            updated_at = NOW()
        WHERE id = $1
    `;

    await pool.query(query, [userId, isActive]);
}

/**
 * Update user password
 * @param {string} userId - User UUID
 * @param {string} passwordHash - New hashed password
 * @returns {Promise<void>}
 */
export async function updateUserPassword(userId, passwordHash) {
    const query = `
        UPDATE auth.users
        SET 
            password_hash = $2,
            updated_at = NOW()
        WHERE id = $1
    `;

    await pool.query(query, [userId, passwordHash]);
}

/**
 * Update user email
 * @param {string} userId - User UUID
 * @param {string} newEmail - New email address
 * @returns {Promise<void>}
 */
export async function updateUserEmail(userId, newEmail) {
    const query = `
        UPDATE auth.users
        SET 
            email = $2,
            updated_at = NOW()
        WHERE id = $1
    `;

    await pool.query(query, [userId, newEmail.toLowerCase()]);
}

/**
 * Update user email verification status
 * @param {string} userId - User UUID
 * @param {boolean} isVerified - Verification status
 * @returns {Promise<void>}
 */
export async function updateUserEmailVerification(userId, isVerified) {
    const query = `
        UPDATE auth.users
        SET 
            is_email_verified = $2,
            updated_at = NOW()
        WHERE id = $1
    `;

    await pool.query(query, [userId, isVerified]);
}

/**
 * Update user details
 * @param {string} userId - User UUID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user object
 */
export async function updateUser(userId, updates) {
    const allowedFields = ['first_name', 'last_name', 'role', 'is_active', 'is_email_verified'];
    const fields = [];
    const values = [userId];
    let paramCount = 1;

    // Build dynamic UPDATE query
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

    // Add updated_at
    paramCount++;
    fields.push(`updated_at = NOW()`);

    const query = `
        UPDATE auth.users
        SET ${fields.join(', ')}
        WHERE id = $1
        RETURNING 
            id,
            email,
            first_name,
            last_name,
            role,
            is_active,
            is_email_verified,
            created_at,
            last_login_at,
            updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
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
            COUNT(*) FILTER (WHERE last_login_at > NOW() - INTERVAL '7 days') AS active_last_week,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_last_month
        FROM auth.users
    `;

    const result = await pool.query(query);
    return result.rows[0];
}
