/**
 * NYSI Authentication Validation Schemas
 * Zod schemas for request validation
 * UPDATED: Aligned with NYSI database roles
 */

import { z } from 'zod';

// ============================================================================
// REUSABLE VALIDATORS
// ============================================================================

// Email validator
const emailSchema = z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase();

// Password validator (strong password requirements)
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .describe('Strong password with uppercase, lowercase, and number');

// Alternative: Simple password validator (less strict)
const simplePasswordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters');

// Name validator
const nameSchema = z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim();

// UPDATED: Role validator matching database schema
const roleSchema = z.enum(['IT_ADMIN', 'ADMIN', 'NUTRITIONIST', 'COACH', 'ATHLETE'], {
    errorMap: () => ({ message: 'Role must be IT_ADMIN, ADMIN, NUTRITIONIST, COACH, or ATHLETE' }),
});

// 6-digit code validator
const codeSchema = z.string()
    .regex(/^[0-9]{6}$/, 'Code must be exactly 6 digits')
    .length(6, 'Code must be exactly 6 digits');

// Purpose validator for verification codes
const purposeSchema = z.enum(['LOGIN_2FA', 'PASSWORD_RESET', 'EMAIL_VERIFY'], {
    errorMap: () => ({ message: 'Purpose must be LOGIN_2FA, PASSWORD_RESET, or EMAIL_VERIFY' }),
});

// ============================================================================
// REGISTRATION SCHEMA
// ============================================================================

/**
 * Schema for user registration
 * POST /api/auth/register
 */
export const registerSchema = z.object({
    // ---- REQUIRED FIELDS ----

    email: emailSchema
        .describe('User email address (will be converted to lowercase)'),

    password: simplePasswordSchema  // Change to passwordSchema for stricter validation
        .describe('User password (minimum 8 characters)'),

    first_name: nameSchema
        .describe('User first name'),

    last_name: nameSchema
        .describe('User last name'),

    // ---- OPTIONAL FIELDS ----

    role: roleSchema
        .default('NUTRITIONIST')  // UPDATED: Default role for new users
        .optional()
        .describe('User role (default: NUTRITIONIST)'),

    // ---- FIELDS NOT ACCEPTED (handled by system) ----

    id: z.never().optional(),
    password_hash: z.never().optional(),
    is_active: z.never().optional(),
    is_email_verified: z.never().optional(),
    created_at: z.never().optional(),
    last_login_at: z.never().optional(),
    updated_at: z.never().optional(),

}).strict();

// ============================================================================
// LOGIN SCHEMAS
// ============================================================================

/**
 * Schema for login (Step 1 - send code)
 * POST /api/auth/login
 */
export const loginSchema = z.object({
    // ---- REQUIRED FIELDS ----

    email: emailSchema
        .describe('User email address'),

    password: z.string()
        .min(1, 'Password is required')
        .describe('User password'),

}).strict();

/**
 * Schema for code verification (Step 2 - verify code)
 * POST /api/auth/verify-code
 */
export const verifyCodeSchema = z.object({
    // ---- REQUIRED FIELDS ----

    email: emailSchema
        .describe('User email address'),

    code: codeSchema
        .describe('6-digit verification code received via email'),

}).strict();

/**
 * Schema for resending verification code
 * POST /api/auth/resend-code
 */
export const resendCodeSchema = z.object({
    // ---- REQUIRED FIELDS ----

    email: emailSchema
        .describe('User email address'),

}).strict();

// ============================================================================
// USER UPDATE SCHEMA (for future use)
// ============================================================================

/**
 * Schema for updating user profile
 * PATCH /api/auth/profile
 */
export const updateProfileSchema = z.object({
    // ---- OPTIONAL FIELDS (at least one required) ----

    first_name: nameSchema
        .optional()
        .describe('User first name'),

    last_name: nameSchema
        .optional()
        .describe('User last name'),

    // ---- FIELDS NOT ACCEPTED ----

    id: z.never().optional(),
    email: z.never().optional(),  // Cannot change email via this endpoint
    password: z.never().optional(),  // Use separate password change endpoint
    password_hash: z.never().optional(),
    role: z.never().optional(),  // Only admins can change roles
    is_active: z.never().optional(),
    is_email_verified: z.never().optional(),
    created_at: z.never().optional(),
    last_login_at: z.never().optional(),
    updated_at: z.never().optional(),

}).strict()
    .refine(data => Object.keys(data).length > 0, {
        message: 'At least one field must be provided to update',
    });

// ============================================================================
// PASSWORD CHANGE SCHEMA (for future use)
// ============================================================================

/**
 * Schema for changing password
 * POST /api/auth/change-password
 */
export const changePasswordSchema = z.object({
    // ---- REQUIRED FIELDS ----

    current_password: z.string()
        .min(1, 'Current password is required')
        .describe('User\'s current password'),

    new_password: simplePasswordSchema  // Change to passwordSchema for stricter validation
        .describe('New password (minimum 8 characters)'),

    confirm_password: z.string()
        .min(1, 'Password confirmation is required')
        .describe('Confirm new password'),

}).strict()
    .refine(data => data.new_password === data.confirm_password, {
        message: 'Passwords do not match',
        path: ['confirm_password'],
    })
    .refine(data => data.current_password !== data.new_password, {
        message: 'New password must be different from current password',
        path: ['new_password'],
    });

// ============================================================================
// PASSWORD RESET SCHEMAS (for future use)
// ============================================================================

/**
 * Schema for requesting password reset
 * POST /api/auth/forgot-password
 */
export const forgotPasswordSchema = z.object({
    // ---- REQUIRED FIELDS ----

    email: emailSchema
        .describe('User email address'),

}).strict();

/**
 * Schema for resetting password with token
 * POST /api/auth/reset-password
 */
export const resetPasswordSchema = z.object({
    // ---- REQUIRED FIELDS ----

    token: z.string()
        .min(1, 'Reset token is required')
        .describe('Password reset token from email'),

    new_password: simplePasswordSchema  // Change to passwordSchema for stricter validation
        .describe('New password (minimum 8 characters)'),

    confirm_password: z.string()
        .min(1, 'Password confirmation is required')
        .describe('Confirm new password'),

}).strict()
    .refine(data => data.new_password === data.confirm_password, {
        message: 'Passwords do not match',
        path: ['confirm_password'],
    });

// ============================================================================
// ADMIN SCHEMAS (for future use)
// ============================================================================

/**
 * Schema for admin to create user
 * POST /api/auth/admin/users
 */
export const adminCreateUserSchema = z.object({
    // ---- REQUIRED FIELDS ----

    email: emailSchema,
    first_name: nameSchema,
    last_name: nameSchema,
    role: roleSchema,

    // ---- OPTIONAL FIELDS ----

    password: simplePasswordSchema
        .optional()
        .describe('If not provided, user must set password on first login'),

    is_active: z.boolean()
        .default(true)
        .optional()
        .describe('Whether user account is active'),

    is_email_verified: z.boolean()
        .default(false)
        .optional()
        .describe('Whether email is verified'),

}).strict();

/**
 * Schema for admin to update user
 * PATCH /api/auth/admin/users/:id
 */
export const adminUpdateUserSchema = z.object({
    // ---- OPTIONAL FIELDS (at least one required) ----

    first_name: nameSchema.optional(),
    last_name: nameSchema.optional(),
    role: roleSchema.optional(),
    is_active: z.boolean().optional(),
    is_email_verified: z.boolean().optional(),

    // ---- FIELDS NOT ACCEPTED ----

    id: z.never().optional(),
    email: z.never().optional(),
    password: z.never().optional(),
    password_hash: z.never().optional(),

}).strict()
    .refine(data => Object.keys(data).length > 0, {
        message: 'At least one field must be provided to update',
    });

// ============================================================================
// HELPER VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate email format (can be used in services)
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export function isValidEmail(email) {
    return emailSchema.safeParse(email).success;
}

/**
 * Validate password strength (can be used in services)
 * @param {string} password - Password to validate
 * @returns {boolean} True if valid
 */
export function isValidPassword(password) {
    return passwordSchema.safeParse(password).success;
}

/**
 * Validate 6-digit code format
 * @param {string} code - Code to validate
 * @returns {boolean} True if valid
 */
export function isValidCode(code) {
    return codeSchema.safeParse(code).success;
}

/**
 * Validate role
 * @param {string} role - Role to validate
 * @returns {boolean} True if valid
 */
export function isValidRole(role) {
    return roleSchema.safeParse(role).success;
}
