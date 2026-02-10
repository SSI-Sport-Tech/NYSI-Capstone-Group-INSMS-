/**
 * NYSI Authentication Services
 * Database operations for user authentication and 2FA
 */

import pool from '../../config/db.js';

// ============================================================================
// USER SERVICES
// ============================================================================

/**
 * Get user by email
 * @param {string} email - User email address
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function getUserByEmail(email) {
    const query = `
        SELECT 
            id,
            email,
            password_hash,
            first_name,
            last_name,
            role,
            is_active,
            created_at,
            last_login_at
        FROM auth.users
        WHERE email = $1
    `;

    const result = await pool.query(query, [email.toLowerCase()]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get user by ID
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function getUserById(userId) {
    const query = `
        SELECT 
            id,
            email,
            first_name,
            last_name,
            role,
            is_active,
            created_at,
            last_login_at
        FROM auth.users
        WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create new user
 * @param {Object} userData - User data
 * @param {string} userData.email - Email address
 * @param {string} userData.password_hash - Hashed password
 * @param {string} userData.first_name - First name
 * @param {string} userData.last_name - Last name
 * @param {string} userData.role - User role (user/admin/manager)
 * @returns {Promise<Object>} Created user object
 */
export async function createUser(userData) {
    const query = `
        INSERT INTO auth.users (
            email,
            password_hash,
            first_name,
            last_name,
            role,
            is_active,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, true, NOW())
        RETURNING 
            id,
            email,
            first_name,
            last_name,
            role,
            is_active,
            created_at
    `;

    const values = [
        userData.email.toLowerCase(),
        userData.password_hash,
        userData.first_name,
        userData.last_name,
        userData.role,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

/**
 * Update user's last login timestamp
 * @param {string} userId - User UUID
 * @returns {Promise<void>}
 */
export async function updateLastLogin(userId) {
    const query = `
        UPDATE auth.users
        SET last_login_at = NOW()
        WHERE id = $1
    `;

    await pool.query(query, [userId]);
}

// ============================================================================
// VERIFICATION CODE SERVICES
// ============================================================================

/**
 * Get verification code by user ID
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Verification code object or null
 */
export async function getVerificationCodeByUserId(userId) {
    const query = `
        SELECT 
            id,
            user_id,
            code,
            expires_at,
            attempts,
            created_at
        FROM auth.verification_codes
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create new verification code
 * @param {Object} codeData - Verification code data
 * @param {string} codeData.user_id - User UUID
 * @param {string} codeData.code - 6-digit code
 * @param {Date} codeData.expires_at - Expiration timestamp
 * @param {number} codeData.attempts - Initial attempt count (usually 0)
 * @returns {Promise<Object>} Created verification code object
 */
export async function createVerificationCode(codeData) {
    const query = `
        INSERT INTO auth.verification_codes (
            user_id,
            code,
            expires_at,
            attempts,
            created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING 
            id,
            user_id,
            code,
            expires_at,
            attempts,
            created_at
    `;

    const values = [
        codeData.user_id,
        codeData.code,
        codeData.expires_at,
        codeData.attempts,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

/**
 * Delete all verification codes for a user
 * @param {string} userId - User UUID
 * @returns {Promise<void>}
 */
export async function deleteVerificationCodesByUserId(userId) {
    const query = `
        DELETE FROM auth.verification_codes
        WHERE user_id = $1
    `;

    await pool.query(query, [userId]);
}

/**
 * Increment verification attempts
 * @param {string} userId - User UUID
 * @returns {Promise<void>}
 */
export async function incrementVerificationAttempts(userId) {
    const query = `
        UPDATE auth.verification_codes
        SET attempts = attempts + 1
        WHERE user_id = $1
    `;

    await pool.query(query, [userId]);
}

/**
 * Cleanup expired verification codes
 * Should be run periodically (e.g., via cron job)
 * @returns {Promise<number>} Number of deleted codes
 */
export async function cleanupExpiredCodes() {
    const query = `
        DELETE FROM auth.verification_codes
        WHERE expires_at < NOW()
        RETURNING id
    `;

    const result = await pool.query(query);
    return result.rows.length;
}

// ============================================================================
// USER SESSION SERVICES (Optional - for tracking)
// ============================================================================

/**
 * Create user session (optional - for session tracking)
 * @param {Object} sessionData - Session data
 * @param {string} sessionData.user_id - User UUID
 * @param {string} sessionData.token_hash - Hashed JWT token
 * @param {string} sessionData.ip_address - IP address
 * @param {string} sessionData.user_agent - User agent string
 * @param {Date} sessionData.expires_at - Session expiration
 * @returns {Promise<Object>} Created session object
 */
export async function createSession(sessionData) {
    const query = `
        INSERT INTO auth.user_sessions (
            user_id,
            token_hash,
            ip_address,
            user_agent,
            created_at,
            expires_at,
            is_active
        ) VALUES ($1, $2, $3, $4, NOW(), $5, true)
        RETURNING 
            id,
            user_id,
            ip_address,
            created_at,
            expires_at
    `;

    const values = [
        sessionData.user_id,
        sessionData.token_hash,
        sessionData.ip_address,
        sessionData.user_agent,
        sessionData.expires_at,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

/**
 * Get active sessions for a user
 * @param {string} userId - User UUID
 * @returns {Promise<Array>} Array of active sessions
 */
export async function getActiveSessions(userId) {
    const query = `
        SELECT 
            id,
            ip_address,
            user_agent,
            created_at,
            expires_at
        FROM auth.user_sessions
        WHERE user_id = $1
          AND is_active = true
          AND expires_at > NOW()
        ORDER BY created_at DESC
    `;

    const result = await pool.query(query, [userId]);
    return result.rows;
}

/**
 * Invalidate session
 * @param {string} sessionId - Session UUID
 * @returns {Promise<void>}
 */
export async function invalidateSession(sessionId) {
    const query = `
        UPDATE auth.user_sessions
        SET is_active = false
        WHERE id = $1
    `;

    await pool.query(query, [sessionId]);
}

/**
 * Invalidate all sessions for a user
 * @param {string} userId - User UUID
 * @returns {Promise<void>}
 */
export async function invalidateAllSessions(userId) {
    const query = `
        UPDATE auth.user_sessions
        SET is_active = false
        WHERE user_id = $1
    `;

    await pool.query(query, [userId]);
}

// // ============================================================================
// // AUDIT LOG SERVICES (Optional - for security tracking)
// // ============================================================================

// /**
//  * Create audit log entry
//  * @param {Object} logData - Audit log data
//  * @param {string} logData.user_id - User UUID (nullable)
//  * @param {string} logData.action - Action performed
//  * @param {string} logData.ip_address - IP address
//  * @param {string} logData.user_agent - User agent string
//  * @param {boolean} logData.success - Whether action succeeded
//  * @param {string} logData.error_message - Error message (if failed)
//  * @returns {Promise<Object>} Created audit log entry
//  */
// export async function createAuditLog(logData) {
//     const query = `
//         INSERT INTO audit.audit_log (
//             user_id,
//             action,
//             ip_address,
//             user_agent,
//             success,
//             error_message,
//             created_at
//         ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
//         RETURNING
//             id,
//             user_id,
//             action,
//             success,
//             created_at
//     `;

//     const values = [
//         logData.user_id || null,
//         logData.action,
//         logData.ip_address || null,
//         logData.user_agent || null,
//         logData.success,
//         logData.error_message || null,
//     ];

//     const result = await pool.query(query, values);
//     return result.rows[0];
// }

// /**
//  * Get recent audit logs for a user
//  * @param {string} userId - User UUID
//  * @param {number} limit - Number of logs to return (default 50)
//  * @returns {Promise<Array>} Array of audit log entries
//  */
// export async function getUserAuditLogs(userId, limit = 50) {
//     const query = `
//         SELECT
//             id,
//             action,
//             ip_address,
//             success,
//             error_message,
//             created_at
//         FROM auth.audit_log
//         WHERE user_id = $1
//         ORDER BY created_at DESC
//         LIMIT $2
//     `;

//     const result = await pool.query(query, [userId, limit]);
//     return result.rows;
// }
