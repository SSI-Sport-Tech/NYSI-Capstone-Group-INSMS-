/**
 * NYSI Authentication Mock Services (NO DATABASE REQUIRED)
 * In-memory storage for testing before database is set up
 * 
 * USAGE:
 * 1. Rename this file to services.js (backup the real one first)
 * 2. Test all endpoints without PostgreSQL
 * 3. When database is ready, switch back to real services.js
 */

// In-memory data stores (reset when server restarts)
const users = new Map(); // email -> user object
const verificationCodes = new Map(); // userId -> code object
const sessions = new Map(); // sessionId -> session object

// Helper to generate UUID (simple version for testing)
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ============================================================================
// USER SERVICES (In-Memory)
// ============================================================================

/**
 * Get user by email (simulates database query)
 */
export async function getUserByEmail(email) {
    console.log('[MOCK] Getting user by email:', email);
    const user = users.get(email.toLowerCase());
    
    if (user) {
        console.log('[MOCK] User found:', { id: user.id, email: user.email });
    } else {
        console.log('[MOCK] User not found');
    }
    
    return user || null;
}

/**
 * Get user by ID (simulates database query)
 */
export async function getUserById(userId) {
    console.log('[MOCK] Getting user by ID:', userId);
    
    // Find user in Map
    for (const user of users.values()) {
        if (user.id === userId) {
            console.log('[MOCK] User found');
            return user;
        }
    }
    
    console.log('[MOCK] User not found');
    return null;
}

/**
 * Create new user (simulates INSERT query)
 */
export async function createUser(userData) {
    console.log('[MOCK] Creating user:', { email: userData.email });
    
    const newUser = {
        id: generateId(),
        email: userData.email.toLowerCase(),
        password_hash: userData.password_hash,
        first_name: userData.first_name,
        last_name: userData.last_name,
        role: userData.role,
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: null,
    };
    
    users.set(newUser.email, newUser);
    console.log('[MOCK] User created with ID:', newUser.id);
    console.log('[MOCK] Total users in memory:', users.size);
    
    return newUser;
}

/**
 * Update user's last login timestamp
 */
export async function updateLastLogin(userId) {
    console.log('[MOCK] Updating last login for user:', userId);
    
    for (const user of users.values()) {
        if (user.id === userId) {
            user.last_login = new Date().toISOString();
            console.log('[MOCK] Last login updated');
            return;
        }
    }
    
    console.log('[MOCK] User not found for last login update');
}

// ============================================================================
// VERIFICATION CODE SERVICES (In-Memory)
// ============================================================================

/**
 * Get verification code by user ID
 */
export async function getVerificationCodeByUserId(userId) {
    console.log('[MOCK] Getting verification code for user:', userId);
    const code = verificationCodes.get(userId);
    
    if (code) {
        console.log('[MOCK] Code found:', { code: code.code, attempts: code.attempts });
    } else {
        console.log('[MOCK] No code found');
    }
    
    return code || null;
}

/**
 * Create new verification code
 */
export async function createVerificationCode(codeData) {
    console.log('[MOCK] Creating verification code for user:', codeData.user_id);
    console.log('[MOCK] Code:', codeData.code);
    
    const newCode = {
        id: generateId(),
        user_id: codeData.user_id,
        code: codeData.code,
        expires_at: codeData.expires_at,
        attempts: codeData.attempts,
        created_at: new Date().toISOString(),
    };
    
    verificationCodes.set(codeData.user_id, newCode);
    console.log('[MOCK] Code stored. Total codes in memory:', verificationCodes.size);
    
    return newCode;
}

/**
 * Delete all verification codes for a user
 */
export async function deleteVerificationCodesByUserId(userId) {
    console.log('[MOCK] Deleting verification codes for user:', userId);
    const deleted = verificationCodes.delete(userId);
    
    if (deleted) {
        console.log('[MOCK] Code deleted');
    } else {
        console.log('[MOCK] No code found to delete');
    }
}

/**
 * Increment verification attempts
 */
export async function incrementVerificationAttempts(userId) {
    console.log('[MOCK] Incrementing attempts for user:', userId);
    const code = verificationCodes.get(userId);
    
    if (code) {
        code.attempts += 1;
        console.log('[MOCK] Attempts incremented to:', code.attempts);
    } else {
        console.log('[MOCK] No code found to increment');
    }
}

/**
 * Cleanup expired verification codes
 */
export async function cleanupExpiredCodes() {
    console.log('[MOCK] Cleaning up expired codes...');
    const now = new Date();
    let deletedCount = 0;
    
    for (const [userId, code] of verificationCodes.entries()) {
        if (new Date(code.expires_at) < now) {
            verificationCodes.delete(userId);
            deletedCount++;
        }
    }
    
    console.log('[MOCK] Deleted', deletedCount, 'expired codes');
    return deletedCount;
}

// ============================================================================
// SESSION SERVICES (In-Memory)
// ============================================================================

/**
 * Create user session
 */
export async function createSession(sessionData) {
    console.log('[MOCK] Creating session for user:', sessionData.user_id);
    
    const newSession = {
        id: generateId(),
        user_id: sessionData.user_id,
        token_hash: sessionData.token_hash,
        ip_address: sessionData.ip_address,
        user_agent: sessionData.user_agent,
        created_at: new Date().toISOString(),
        expires_at: sessionData.expires_at,
        is_active: true,
    };
    
    sessions.set(newSession.id, newSession);
    console.log('[MOCK] Session created. Total sessions:', sessions.size);
    
    return newSession;
}

/**
 * Get active sessions for a user
 */
export async function getActiveSessions(userId) {
    console.log('[MOCK] Getting active sessions for user:', userId);
    const now = new Date();
    const userSessions = [];
    
    for (const session of sessions.values()) {
        if (session.user_id === userId && 
            session.is_active && 
            new Date(session.expires_at) > now) {
            userSessions.push(session);
        }
    }
    
    console.log('[MOCK] Found', userSessions.length, 'active sessions');
    return userSessions;
}

/**
 * Invalidate session
 */
export async function invalidateSession(sessionId) {
    console.log('[MOCK] Invalidating session:', sessionId);
    const session = sessions.get(sessionId);
    
    if (session) {
        session.is_active = false;
        console.log('[MOCK] Session invalidated');
    } else {
        console.log('[MOCK] Session not found');
    }
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllSessions(userId) {
    console.log('[MOCK] Invalidating all sessions for user:', userId);
    let count = 0;
    
    for (const session of sessions.values()) {
        if (session.user_id === userId) {
            session.is_active = false;
            count++;
        }
    }
    
    console.log('[MOCK] Invalidated', count, 'sessions');
}

// ============================================================================
// AUDIT LOG SERVICES (In-Memory)
// ============================================================================

const auditLogs = [];

/**
 * Create audit log entry
 */
export async function createAuditLog(logData) {
    console.log('[MOCK] Creating audit log:', logData.action);
    
    const newLog = {
        id: generateId(),
        user_id: logData.user_id || null,
        action: logData.action,
        ip_address: logData.ip_address || null,
        user_agent: logData.user_agent || null,
        success: logData.success,
        error_message: logData.error_message || null,
        created_at: new Date().toISOString(),
    };
    
    auditLogs.push(newLog);
    console.log('[MOCK] Audit log created. Total logs:', auditLogs.length);
    
    return newLog;
}

/**
 * Get recent audit logs for a user
 */
export async function getUserAuditLogs(userId, limit = 50) {
    console.log('[MOCK] Getting audit logs for user:', userId);
    
    const userLogs = auditLogs
        .filter(log => log.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    
    console.log('[MOCK] Found', userLogs.length, 'logs');
    return userLogs;
}

// ============================================================================
// DEBUGGING UTILITIES
// ============================================================================

/**
 * Get current state (for debugging)
 */
export function getDebugState() {
    return {
        users: Array.from(users.values()).map(u => ({
            id: u.id,
            email: u.email,
            first_name: u.first_name,
            role: u.role,
        })),
        verification_codes: Array.from(verificationCodes.values()).map(c => ({
            user_id: c.user_id,
            code: c.code,
            expires_at: c.expires_at,
            attempts: c.attempts,
        })),
        sessions: Array.from(sessions.values()).map(s => ({
            id: s.id,
            user_id: s.user_id,
            is_active: s.is_active,
        })),
        audit_logs: auditLogs.slice(-10), // Last 10 logs
    };
}

/**
 * Clear all data (for testing)
 */
export function clearAllData() {
    console.log('[MOCK] Clearing all in-memory data...');
    users.clear();
    verificationCodes.clear();
    sessions.clear();
    auditLogs.length = 0;
    console.log('[MOCK] All data cleared');
}

/**
 * Seed test data (for testing)
 */
export async function seedTestData() {
    console.log('[MOCK] Seeding test data...');
    
    // Create test users
    await createUser({
        email: 'admin@nysi.com',
        password_hash: '$2b$10$rKZYvxLmQ8qBzXPkE4YvLe5G9Y4QxK8vJhN.VyE9J5zJ5vXwZ5F5G', // Admin123!
        first_name: 'System',
        last_name: 'Administrator',
        role: 'admin',
    });
    
    await createUser({
        email: 'user@nysi.com',
        password_hash: '$2b$10$rKZYvxLmQ8qBzXPkE4YvLe5G9Y4QxK8vJhN.VyE9J5zJ5vXwZ5F5G', // User123!
        first_name: 'Test',
        last_name: 'User',
        role: 'user',
    });
    
    console.log('[MOCK] Test data seeded');
    console.log('[MOCK] Test accounts:');
    console.log('  - admin@nysi.com / Admin123!');
    console.log('  - user@nysi.com / User123!');
}

// ============================================================================
// AUTO-SEED ON STARTUP (Optional)
// ============================================================================

// Uncomment to automatically seed test data when module loads
// seedTestData();

console.log('');
console.log('='.repeat(60));
console.log('🧪 MOCK SERVICES LOADED (NO DATABASE REQUIRED)');
console.log('='.repeat(60));
console.log('Using in-memory storage for testing');
console.log('Data will reset when server restarts');
console.log('');
console.log('To seed test accounts, run: seedTestData()');
console.log('To view current state, run: getDebugState()');
console.log('To clear all data, run: clearAllData()');
console.log('='.repeat(60));
console.log('');
