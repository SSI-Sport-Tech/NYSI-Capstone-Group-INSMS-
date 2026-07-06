/**
 * Admin Validation Schemas
 * Zod schemas for admin user management endpoints
 */

import { z } from 'zod';

// ============================================================================
// REUSABLE VALIDATORS (from main validation.js)
// ============================================================================

const emailSchema = z.string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters')
    .trim()
    .toLowerCase();

const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters');

const nameSchema = z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim();

const roleSchema = z.enum(['IT_ADMIN', 'ADMIN', 'NUTRITIONIST', 'COACH', 'ATHLETE'], {
    errorMap: () => ({ message: 'Role must be IT_ADMIN, ADMIN, NUTRITIONIST, COACH, or ATHLETE' }),
});

// ============================================================================
// ADMIN - TOGGLE USER ACTIVE STATUS
// ============================================================================

/**
 * Schema for activating/deactivating users
 * PATCH /api/admin/users/:id/active
 */
export const adminToggleActiveSchema = z.object({
    is_active: z.boolean({
        required_error: 'is_active is required',
        invalid_type_error: 'is_active must be a boolean',
    }).describe('true to activate user, false to deactivate'),
}).strict();

// ============================================================================
// ADMIN - CHANGE USER PASSWORD
// ============================================================================

/**
 * Schema for admin changing user password
 * PATCH /api/admin/users/:id/password
 */
export const adminChangePasswordSchema = z.object({
    new_password: passwordSchema
        .describe('New password for the user (minimum 8 characters)'),

    confirm_password: z.string()
        .min(1, 'Password confirmation is required')
        .describe('Confirm new password'),
}).strict()
    .refine(data => data.new_password === data.confirm_password, {
        message: 'Passwords do not match',
        path: ['confirm_password'],
    });

// ============================================================================
// ADMIN - CHANGE USER EMAIL
// ============================================================================

/**
 * Schema for admin changing user email (2FA email)
 * PATCH /api/admin/users/:id/email
 */
export const adminChangeEmailSchema = z.object({
    new_email: emailSchema
        .describe('New email address for the user'),

    reset_verification: z.boolean()
        .default(true)
        .optional()
        .describe('Set email as unverified (default: true)'),
}).strict();

// ============================================================================
// ADMIN - UPDATE USER DETAILS
// ============================================================================

/**
 * Schema for admin updating user details
 * PATCH /api/admin/users/:id
 */
export const adminUpdateUserSchema = z.object({
    // Optional fields - at least one must be provided

    first_name: nameSchema
        .optional()
        .describe('User first name'),

    last_name: nameSchema
        .optional()
        .describe('User last name'),

    role: roleSchema
        .optional()
        .describe('User role'),

    is_active: z.boolean()
        .optional()
        .describe('Whether user account is active'),

    is_email_verified: z.boolean()
        .optional()
        .describe('Whether email is verified'),

    // Fields not accepted
    id: z.never().optional(),
    email: z.never().optional(),  // Use dedicated email change endpoint
    password: z.never().optional(),  // Use dedicated password change endpoint
    password_hash: z.never().optional(),
    created_at: z.never().optional(),
    last_login: z.never().optional(),
    updated_at: z.never().optional(),

}).strict()
    .refine(data => Object.keys(data).length > 0, {
        message: 'At least one field must be provided to update',
    });

// ============================================================================
// ADMIN - CREATE USER
// ============================================================================

/**
 * Schema for admin creating a new user
 * POST /api/admin/users
 */
export const adminCreateUserSchema = z.object({
    // Required fields
    email: emailSchema,
    first_name: nameSchema,
    last_name: nameSchema,
    role: roleSchema,

    // Optional fields
    password: passwordSchema
        .optional()
        .describe('If not provided, user must be sent password reset link'),

    is_active: z.boolean()
        .default(true)
        .optional()
        .describe('Whether user account is active (default: true)'),

    is_email_verified: z.boolean()
        .default(false)
        .optional()
        .describe('Whether email is verified (default: false)'),

    send_welcome_email: z.boolean()
        .default(true)
        .optional()
        .describe('Send welcome email with password setup link (default: true)'),

}).strict();

// ============================================================================
// ADMIN - QUERY FILTERS
// ============================================================================

/**
 * Schema for filtering users list
 * GET /api/admin/users?role=ADMIN&is_active=true&search=john
 */
export const adminUsersQuerySchema = z.object({
    role: roleSchema
        .optional()
        .describe('Filter by role'),

    is_active: z.enum(['true', 'false'])
        .optional()
        .describe('Filter by active status'),

    search: z.string()
        .max(255)
        .optional()
        .describe('Search by name or email'),

    page: z.string()
        .regex(/^\d+$/)
        .transform(Number)
        .pipe(z.number().int().positive())
        .default('1')
        .optional()
        .describe('Page number (default: 1)'),

    limit: z.string()
        .regex(/^\d+$/)
        .transform(Number)
        .pipe(z.number().int().positive().max(100))
        .default('50')
        .optional()
        .describe('Items per page (default: 50, max: 100)'),

}).strict();
