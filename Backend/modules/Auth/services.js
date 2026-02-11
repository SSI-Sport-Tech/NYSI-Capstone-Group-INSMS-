/**
 * NYSI Authentication Services
 * Database operations for user authentication and 2FA
 * UPDATED: Includes AMS nutritionist profile creation
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
            is_email_verified,
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
            is_email_verified,
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
 * @param {string} userData.role - User role (IT_ADMIN/ADMIN/NUTRITIONIST/COACH/ATHLETE)
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
            is_email_verified,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, true, true, NOW())
        RETURNING 
            id,
            email,
            first_name,
            last_name,
            role,
            is_active,
            is_email_verified,
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
 * Delete user by ID (for rollback scenarios)
 * @param {string} userId - User UUID
 * @returns {Promise<void>}
 */
export async function deleteUserById(userId) {
    const query = `
        DELETE FROM auth.users
        WHERE id = $1
    `;

    await pool.query(query, [userId]);
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
// AMS NUTRITIONIST PROFILE SERVICES
// ============================================================================

/**
 * Get nutritionist profile by user_id
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Nutritionist profile or null if not found
 */
export async function getNutritionistByUserId(userId) {
    const query = `
        SELECT 
            id,
            name,
            user_id,
            created_at,
            updated_at
        FROM ams.nutritionist
        WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create nutritionist profile and link to user
 * @param {Object} profileData - Profile data
 * @param {string} profileData.name - Nutritionist full name
 * @param {string} profileData.user_id - User UUID to link
 * @returns {Promise<Object>} Created nutritionist profile
 */
export async function createNutritionistProfile(profileData) {
    const query = `
        INSERT INTO ams.nutritionist (
            name,
            user_id
        ) VALUES ($1, $2)
        RETURNING 
            id,
            name,
            user_id
    `;

    const values = [
        profileData.name,
        profileData.user_id,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

/**
 * Get athlete profile by user_id (for future use)
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Athlete profile or null if not found
 */
export async function getAthleteByUserId(userId) {
    const query = `
        SELECT 
            id,
            name,
            user_id,
            created_at,
            updated_at
        FROM ams.athlete
        WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get coach profile by user_id (for future use)
 * @param {string} userId - User UUID
 * @returns {Promise<Object|null>} Coach profile or null if not found
 */
export async function getCoachByUserId(userId) {
    const query = `
        SELECT 
            id,
            name,
            user_id,
            created_at,
            updated_at
        FROM ams.coach
        WHERE user_id = $1
    `;

    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// VERIFICATION CODE SERVICES
// ============================================================================

/**
 * Get verification code by user ID and purpose
 * @param {string} userId - User UUID
 * @param {string} purpose - Code purpose (LOGIN_2FA, PASSWORD_RESET, EMAIL_VERIFY)
 * @returns {Promise<Object|null>} Verification code object or null
 */
export async function getVerificationCodeByUserId(userId, purpose = 'LOGIN_2FA') {
    const query = `
        SELECT 
            id,
            user_id,
            code,
            purpose,
            expires_at,
            attempts,
            created_at
        FROM auth.verification_codes
        WHERE user_id = $1 AND purpose = $2
        ORDER BY created_at DESC
        LIMIT 1
    `;

    const result = await pool.query(query, [userId, purpose]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Create new verification code
 * @param {Object} codeData - Verification code data
 * @param {string} codeData.user_id - User UUID
 * @param {string} codeData.code - 6-digit code
 * @param {string} codeData.purpose - Code purpose (LOGIN_2FA, PASSWORD_RESET, EMAIL_VERIFY)
 * @param {Date} codeData.expires_at - Expiration timestamp
 * @param {number} codeData.attempts - Initial attempt count (usually 0)
 * @returns {Promise<Object>} Created verification code object
 */
export async function createVerificationCode(codeData) {
    const query = `
        INSERT INTO auth.verification_codes (
            user_id,
            code,
            purpose,
            expires_at,
            attempts,
            created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING 
            id,
            user_id,
            code,
            purpose,
            expires_at,
            attempts,
            created_at
    `;

    const values = [
        codeData.user_id,
        codeData.code,
        codeData.purpose || 'LOGIN_2FA',
        codeData.expires_at,
        codeData.attempts,
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

/**
 * Delete all verification codes for a user (optionally filter by purpose)
 * @param {string} userId - User UUID
 * @param {string} purpose - Optional purpose filter
 * @returns {Promise<void>}
 */
export async function deleteVerificationCodesByUserId(userId, purpose = null) {
    let query = `
        DELETE FROM auth.verification_codes
        WHERE user_id = $1
    `;

    const values = [userId];

    if (purpose) {
        query += ` AND purpose = $2`;
        values.push(purpose);
    }

    await pool.query(query, values);
}

/**
 * Increment verification attempts
 * @param {string} userId - User UUID
 * @param {string} purpose - Code purpose
 * @returns {Promise<void>}
 */
export async function incrementVerificationAttempts(userId, purpose = 'LOGIN_2FA') {
    const query = `
        UPDATE auth.verification_codes
        SET attempts = attempts + 1
        WHERE user_id = $1 AND purpose = $2
    `;

    await pool.query(query, [userId, purpose]);
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