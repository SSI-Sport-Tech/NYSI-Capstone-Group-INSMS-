/**
 * Unified Admin Services
 * Supports all three systems: AEMS, ICS, NOMS
 * Uses PIN-based auth (unified login)
 */
import pool, { withUserContext } from '../../config/db.js';
import bcrypt from 'bcrypt';


const ICS_PERMISSIONS_BY_ROLE = {
    Staff: [
        "auth:login", "auth:change_own_pin",
        "stock_in:scan", "stock_in:enter_quantity", "stock_in:enter_expiry_date",
        "stock_in:acknowledge", "stock_in:view_availability",
        "stock_take:scan", "stock_take:view_threshold_alerts", "stock_take:acknowledge",
        "stock_out:scan", "stock_out:acknowledge",
        "reporting:view_stock_flow_chart", "reporting:view_expiry_status",
        "reporting:view_consumption_rate", "reporting:view_threshold_alerts",
        "product:view_rules", "product:view_attributes", "product:change_threshold",
        "system:view_dashboard"
    ],
    Scientist: [
        "auth:login", "auth:change_own_pin",
        "stock_in:scan", "stock_in:enter_quantity", "stock_in:enter_expiry_date",
        "stock_in:acknowledge", "stock_in:view_availability",
        "stock_in:view_high_value_notifications", "stock_in:acknowledge_high_value",
        "stock_in:view_critical_value_alerts", "stock_in:view_pending_audit",
        "stock_in:perform_verification_scan",
        "stock_take:scan", "stock_take:view_threshold_alerts", "stock_take:acknowledge",
        "stock_out:scan", "stock_out:acknowledge", "stock_out:APPROVE_TRANSACTIONS",
        "discrepancy:view_flagged", "discrepancy:investigate", "discrepancy:provide_explanation",
        "discrepancy:add_back_stock", "discrepancy:write_off_stock", "discrepancy:clear_flag",
        "reporting:view_stock_flow_chart", "reporting:view_expiry_status",
        "reporting:view_consumption_rate", "reporting:view_threshold_alerts",
        "product:view_rules", "product:view_attributes", "product:change_threshold",
        "system:view_audit_logs", "system:view_all_notifications", "system:view_dashboard"
    ],
    Administrator: [
        "auth:login", "auth:change_own_pin", "auth:view_all_pins",
        "user:add", "user:update", "user:delete", "user:view_all",
        "stock_in:scan", "stock_in:enter_quantity", "stock_in:enter_expiry_date",
        "stock_in:acknowledge", "stock_in:view_availability",
        "stock_in:view_high_value_notifications", "stock_in:acknowledge_high_value",
        "stock_in:view_critical_value_alerts", "stock_in:view_pending_audit",
        "stock_in:perform_verification_scan",
        "stock_take:scan", "stock_take:view_threshold_alerts", "stock_take:acknowledge",
        "stock_out:scan", "stock_out:acknowledge", "stock_out:APPROVE_TRANSACTIONS",
        "discrepancy:view_flagged", "discrepancy:investigate", "discrepancy:provide_explanation",
        "discrepancy:add_back_stock", "discrepancy:write_off_stock", "discrepancy:clear_flag",
        "reporting:view_stock_flow_chart", "reporting:view_expiry_status",
        "reporting:view_consumption_rate", "reporting:view_threshold_alerts",
        "product:view_rules", "product:view_attributes", "product:manage", "product:change_threshold",
        "system:view_audit_logs", "system:view_all_notifications", "system:view_dashboard"
    ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getIcsPermissions(icsRole) {
    return ICS_PERMISSIONS_BY_ROLE[icsRole] || [];
}

async function hashPin(pin) {
    return bcrypt.hash(pin, 10);
}

// ── Core SELECT fragment (used by getAllUsers + getUserByIdWithProfile) ───────
const USER_SELECT = `
    SELECT 
        u.id,
        u.email,
        u.full_name,
        u.first_name,
        u.last_name,
        u.role,
        u.is_active,
        u.is_email_verified,
        u.is_admin,
        u.is_nutritionist,
        u.is_it_admin,
        u.ics_role,
        u.ics_permissions,
        u.groups,
        u.created_at,
        u.last_login,
        u.updated_at,
        n.id   AS nutritionist_id,
        n.name AS nutritionist_name
    FROM auth.users u
    LEFT JOIN ams.nutritionist n ON u.id = n.user_id
`;

// ============================================================================
// GET ALL USERS
// ============================================================================
export async function getAllUsers(filters = {}) {
    let query = USER_SELECT + ' WHERE 1=1';
    const values = [];
    let paramCount = 0;

    if (filters.role) {
        paramCount++;
        query += ` AND u.role = $${paramCount}`;
        values.push(filters.role);
    }

    if (filters.is_active !== undefined) {
        paramCount++;
        query += ` AND u.is_active = $${paramCount}`;
        values.push(filters.is_active);
    }

    if (filters.search) {
        paramCount++;
        query += ` AND (
            u.email ILIKE $${paramCount} OR
            u.full_name ILIKE $${paramCount} OR
            u.first_name ILIKE $${paramCount} OR
            u.last_name ILIKE $${paramCount} OR
            CONCAT(u.first_name, ' ', u.last_name) ILIKE $${paramCount}
        )`;
        values.push(`%${filters.search}%`);
    }

    query += ' ORDER BY u.created_at DESC';
    const result = await pool.query(query, values);
    return result.rows.map(formatUser);
}

// ============================================================================
// GET USER BY ID
// ============================================================================
export async function getUserByIdWithProfile(userId) {
    const query = USER_SELECT + ' WHERE u.id = $1';
    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? formatUser(result.rows[0]) : null;
}

// ── Format user row → unified shape ─────────────────────────────────────────
function formatUser(row) {
    return {
        id: row.id,
        email: row.email,
        full_name: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || null,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        ics_role: row.ics_role,
        ics_permissions: row.ics_permissions,
        is_admin: row.is_admin,
        is_nutritionist: row.is_nutritionist,
        is_it_admin: row.is_it_admin,
        is_active: row.is_active,
        is_email_verified: row.is_email_verified,
        groups: row.groups,
        created_at: row.created_at,
        last_login: row.last_login,
        updated_at: row.updated_at,
        nutritionist_id: row.nutritionist_id,
        nutritionist_name: row.nutritionist_name,
        has_nutritionist_profile: !!row.nutritionist_id,
    };
}

// ============================================================================
// CREATE USER (PIN-based, unified)
// ============================================================================
export async function createUser(userData, doneByUserId) {
    const { email, pin, full_name, first_name, last_name, role } = userData;

    const pinHash = await hashPin(pin);
    const icsPermissions = getIcsPermissions(
        role === 'NUTRITIONIST' ? 'Scientist' :
            ['IT_ADMIN', 'ADMIN'].includes(role) ? 'Administrator' : 'Staff'
    );
    return withUserContext(doneByUserId, async (client) => {
        const userResult = await client.query(`
            INSERT INTO auth.users (
                email, pin_hash, ics_pin_code,
                first_name, last_name,
                role, ics_permissions,
                is_active, is_email_verified,
                password_hash, updated_at
            ) VALUES ($1,$2,$2,$3,$4,$5,$6,true,false,'',NOW())
            RETURNING id, email, full_name, role, ics_role, is_active, created_at
        `, [
            email.toLowerCase(),
            pinHash,
            first_name || null,
            last_name || null,
            role || 'DASHBOARD',
            JSON.stringify(icsPermissions),
        ]);

        const newUser = userResult.rows[0];

        // Create ams.nutritionist profile for ADMIN/NUTRITIONIST roles
        if (['IT_ADMIN', 'ADMIN', 'NUTRITIONIST'].includes(role)) {
            const displayName = full_name || `${first_name || ''} ${last_name || ''}`.trim() || email;
            await client.query(`
                INSERT INTO ams.nutritionist (user_id, name)
                VALUES ($1, $2)
                ON CONFLICT (user_id) DO NOTHING
            `, [newUser.id, displayName]);
        }

        return newUser;
    });
}

// ============================================================================
// UPDATE USER
// ============================================================================
export async function updateUser(userId, updates, doneByUserId) {
    return withUserContext(doneByUserId, async (client) => {
        const fields = [];
        const values = [userId];
        let paramCount = 1;

        // Basic fields
        const basicFields = ['email', 'first_name', 'last_name', 'is_active', 'is_email_verified', 'groups'];
        for (const field of basicFields) {
            if (updates[field] !== undefined) {
                paramCount++;
                fields.push(`${field} = $${paramCount}`);
                values.push(field === 'email' ? updates[field].toLowerCase() : updates[field]);
            }
        }

        // Role change — only update role + ics_permissions (others are generated)
        if (updates.role !== undefined) {
            const icsPermissions = getIcsPermissions(
                updates.role === 'NUTRITIONIST' ? 'Scientist' :
                    ['IT_ADMIN', 'ADMIN'].includes(updates.role) ? 'Administrator' : 'Staff'
            );
            paramCount++; fields.push(`role = $${paramCount}`); values.push(updates.role);
            paramCount++; fields.push(`ics_permissions = $${paramCount}`); values.push(JSON.stringify(icsPermissions));
            // is_admin, is_nutritionist, is_it_admin, ics_role are now generated — don't set them

            // Sync ams.nutritionist profile
            if (['IT_ADMIN', 'ADMIN', 'NUTRITIONIST'].includes(updates.role)) {
                const displayName = updates.full_name || updates.email;
                await client.query(`
                    INSERT INTO ams.nutritionist (user_id, name)
                    VALUES ($1, $2)
                    ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name
                `, [userId, displayName]);
            } else {
                await client.query('DELETE FROM ams.nutritionist WHERE user_id = $1', [userId]);
            }
        }

        // PIN change
        if (updates.pin) {
            const pinHash = await hashPin(updates.pin);
            paramCount++; fields.push(`pin_hash = $${paramCount}`); values.push(pinHash);
            paramCount++; fields.push(`ics_pin_code = $${paramCount}`); values.push(pinHash);
        }

        if (fields.length === 0) throw new Error('No valid fields to update');

        paramCount++;
        fields.push(`updated_at = NOW()`);

        const result = await client.query(`
            UPDATE auth.users SET ${fields.join(', ')}
            WHERE id = $1
            RETURNING id, email, full_name, role, ics_role, is_active, updated_at
        `, values);

        return result.rows[0];
    });
}

// ============================================================================
// DELETE USER
// ============================================================================
export async function deleteUser(userId, doneByUserId) {
    return withUserContext(doneByUserId, async (client) => {
        // Remove nutritionist profile first
        await client.query('DELETE FROM ams.nutritionist WHERE user_id = $1', [userId]);
        // Delete user
        await client.query('DELETE FROM auth.users WHERE id = $1', [userId]);
    });
}

// ============================================================================
// UPDATE ACTIVE STATUS
// ============================================================================
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

// ============================================================================
// UPDATE EMAIL
// ============================================================================
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

// ============================================================================
// GET USER STATISTICS
// ============================================================================
export async function getUserStatistics() {
    const result = await pool.query(`
        SELECT
            COUNT(*) AS total_users,
            COUNT(*) FILTER (WHERE is_active = true)  AS active_users,
            COUNT(*) FILTER (WHERE is_active = false) AS inactive_users,
            COUNT(*) FILTER (WHERE role = 'IT_ADMIN')     AS it_admins,
            COUNT(*) FILTER (WHERE role = 'ADMIN')        AS admins,
            COUNT(*) FILTER (WHERE role = 'NUTRITIONIST') AS nutritionists,
            COUNT(*) FILTER (WHERE role = 'COACH')        AS coaches,
            COUNT(*) FILTER (WHERE role = 'ATHLETE')      AS athletes,
            COUNT(*) FILTER (WHERE role = 'DASHBOARD')    AS dashboard_users,
            COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days')  AS active_last_week,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS new_last_month
        FROM auth.users
    `);
    return result.rows[0];
}

// ============================================================================
// AUDIT LOGS (unchanged)
// ============================================================================
export async function getAuditLogs(filters = {}) {
    let query = `
        SELECT id, user_id, table_name, record_id, action,
               old_values, new_values, changed_on
        FROM audit.audit_log
        WHERE 1=1
    `;
    const values = [];
    let paramCount = 0;

    if (filters.user_id) { paramCount++; query += ` AND user_id = $${paramCount}`; values.push(filters.user_id); }
    if (filters.table_name) { paramCount++; query += ` AND table_name = $${paramCount}`; values.push(filters.table_name); }
    if (filters.action) { paramCount++; query += ` AND action = $${paramCount}`; values.push(filters.action); }
    if (filters.start_date) { paramCount++; query += ` AND changed_on >= $${paramCount}::date`; values.push(filters.start_date); }
    if (filters.end_date) { paramCount++; query += ` AND changed_on < ($${paramCount}::date + interval '1 day')`; values.push(filters.end_date); }

    query += ' ORDER BY changed_on DESC';
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    values.push(parseInt(filters.limit) || 50);

    const result = await pool.query(query, values);
    return result.rows;
}

export async function getAuditLogStatistics(userId = null) {
    let query = `
        SELECT
            COUNT(*) AS total_logs,
            COUNT(*) FILTER (WHERE action = 'INSERT') AS creates,
            COUNT(*) FILTER (WHERE action = 'UPDATE') AS updates,
            COUNT(*) FILTER (WHERE action = 'DELETE') AS deletes,
            COUNT(DISTINCT table_name) AS tables_affected,
            MIN(changed_on) AS earliest_log,
            MAX(changed_on) AS latest_log
        FROM audit.audit_log
    `;
    const values = [];
    if (userId) { query += ' WHERE user_id = $1'; values.push(userId); }
    const result = await pool.query(query, values);
    return result.rows[0];
}

export async function getAuditedTables() {
    const result = await pool.query('SELECT DISTINCT table_name FROM audit.audit_log ORDER BY table_name');
    return result.rows.map(r => r.table_name);
}

export async function getRecordAuditHistory(tableName, recordId, limit = 10) {
    const result = await pool.query(`
        SELECT id, user_id, table_name, record_id, action,
               old_values, new_values, changed_on
        FROM audit.audit_log
        WHERE table_name = $1 AND record_id = $2
        ORDER BY changed_on DESC LIMIT $3
    `, [tableName, recordId, limit]);
    return result.rows;
}