/**
 * Admin Routes
 * Admin-only user management endpoints
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    getAllUsers,
    getUserDetails,
    toggleUserActive,
    changeUserPassword,
    changeUserEmail,
    updateUser,
    deleteUser,
    getUserActivity,
} from './adminController.js';
import { authenticateToken, requireAdmin } from '../Auth/authMiddleware.js';

const router = express.Router();

// ==================== RATE LIMITERS ====================

// Rate limit for admin operations (30 per minute)
const adminLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: {
        error: 'Too many admin requests',
        message: 'Please slow down',
    },
});

// ==================== MIDDLEWARE ====================

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);
router.use(adminLimiter);

// ==================== SWAGGER DOCUMENTATION ====================

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin user management endpoints (ADMIN and IT_ADMIN only)
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [IT_ADMIN, ADMIN, NUTRITIONIST, COACH, ATHLETE]
 *         description: Filter by role
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized (requires ADMIN or IT_ADMIN)
 */
router.get('/users', getAllUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get('/users/:id', getUserDetails);

/**
 * @swagger
 * /api/admin/users/{id}/active:
 *   patch:
 *     summary: Activate or deactivate a user
 *     description: Set user's active status. Deactivated users cannot login.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - is_active
 *             properties:
 *               is_active:
 *                 type: boolean
 *                 description: true to activate, false to deactivate
 *                 example: false
 *           examples:
 *             deactivate:
 *               summary: Deactivate user
 *               value:
 *                 is_active: false
 *             activate:
 *               summary: Activate user
 *               value:
 *                 is_active: true
 *     responses:
 *       200:
 *         description: User status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deactivated successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     is_active:
 *                       type: boolean
 *       400:
 *         description: Cannot modify own account
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/active', toggleUserActive);

/**
 * @swagger
 * /api/admin/users/{id}/password:
 *   patch:
 *     summary: Change user password
 *     description: Admin can change any user's password. All user sessions will be invalidated.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - new_password
 *               - confirm_password
 *             properties:
 *               new_password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: NewSecurePass123!
 *               confirm_password:
 *                 type: string
 *                 format: password
 *                 example: NewSecurePass123!
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error or passwords don't match
 *       404:
 *         description: User not found
 */
router.patch('/users/:id/password', changeUserPassword);

/**
 * @swagger
 * /api/admin/users/{id}/email:
 *   patch:
 *     summary: Change user email (2FA email)
 *     description: Admin can change user's email address. This is the email used for 2FA codes.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - new_email
 *             properties:
 *               new_email:
 *                 type: string
 *                 format: email
 *                 example: new.email@nysi.org.sg
 *               reset_verification:
 *                 type: boolean
 *                 default: true
 *                 description: Set email as unverified (default true)
 *     responses:
 *       200:
 *         description: Email changed successfully
 *       400:
 *         description: Cannot modify own email via admin endpoint
 *       404:
 *         description: User not found
 *       409:
 *         description: Email already in use
 */
router.patch('/users/:id/email', changeUserEmail);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   patch:
 *     summary: Update user details
 *     description: Update user's name, role, or status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *                 example: John
 *               last_name:
 *                 type: string
 *                 example: Doe
 *               role:
 *                 type: string
 *                 enum: [IT_ADMIN, ADMIN, NUTRITIONIST, COACH, ATHLETE]
 *               is_active:
 *                 type: boolean
 *               is_email_verified:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Cannot modify own role or no fields provided
 *       404:
 *         description: User not found
 */
router.patch('/users/:id', updateUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Delete user
 *     description: Permanently delete a user and all associated data (AMS profile, sessions, codes)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Cannot delete own account
 *       404:
 *         description: User not found
 */
router.delete('/users/:id', deleteUser);

/**
 * @swagger
 * /api/admin/users/{id}/activity:
 *   get:
 *     summary: Get user activity
 *     description: Get user's recent sessions and activity
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User activity retrieved
 *       404:
 *         description: User not found
 *       403:
 *          description: Admins can only manage Nutritionists
 */
router.get('/users/:id/activity', getUserActivity);

export default router;
