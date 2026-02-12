/**
 * Authentication Routes
 * Handles all authentication-related endpoints
 * UPDATED: Aligned with NYSI database roles
 */

import express from "express";
import rateLimit from "express-rate-limit";
import {
    register,
    login,
    verifyCode,
    resendCode,
    getCurrentUser,
    logout,
} from "./controller.js";
import { authenticateToken } from "./authMiddleware.js";

const router = express.Router();

// ==================== RATE LIMITERS ====================

// Strict rate limit for login attempts (5 per 15 minutes per IP)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        error: "Too many login attempts",
        message: "Please try again in 15 minutes",
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate limit for code verification (3 per minute per IP)
const codeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3,
    message: {
        error: "Too many verification attempts",
        message: "Please wait a minute before trying again",
    },
});

// Rate limit for resend code (2 per 5 minutes per IP)
const resendLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 2,
    message: {
        error: "Too many resend requests",
        message: "Please wait 5 minutes before requesting another code",
    },
});

// General rate limit for registration (3 per hour per IP)
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: {
        error: "Too many registration attempts",
        message: "Please try again later",
    },
});

// ==================== SWAGGER DOCUMENTATION ====================

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and 2FA management for NYSI
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     UserRole:
 *       type: string
 *       enum:
 *         - IT_ADMIN
 *         - ADMIN
 *         - NUTRITIONIST
 *         - COACH
 *         - ATHLETE
 *       description: |
 *         User roles in NYSI:
 *         - IT_ADMIN: Tech team with full database access
 *         - ADMIN: Senior nutritionist (can approve supplements, manage team)
 *         - NUTRITIONIST: Standard nutritionist (consultations only)
 *         - COACH: Coach role (Phase 2)
 *         - ATHLETE: Athlete role (Phase 2)
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@nysi.org.sg
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123!
 *               first_name:
 *                 type: string
 *                 example: John
 *               last_name:
 *                 type: string
 *                 example: Doe
 *               role:
 *                 $ref: '#/components/schemas/UserRole'
 *                 default: NUTRITIONIST
 *                 description: User role (defaults to NUTRITIONIST if not specified)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 01936d9e-7c8a-7890-b123-456789abcdef
 *                     email:
 *                       type: string
 *                       example: john.doe@nysi.org.sg
 *                     first_name:
 *                       type: string
 *                       example: John
 *                     last_name:
 *                       type: string
 *                       example: Doe
 *                     role:
 *                       $ref: '#/components/schemas/UserRole'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Validation failed
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                       message:
 *                         type: string
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User already exists
 *                 message:
 *                   type: string
 *                   example: An account with this email address already exists
 *       500:
 *         description: Server error
 */
router.post("/register", registerLimiter, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login - Step 1 (Send verification code)
 *     description: Validates credentials and sends a 6-digit code to user's email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: senior@nysi.org.sg
 *                 description: Your registered email address
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *                 description: Your account password
 *           examples:
 *             seniorNutritionist:
 *               summary: Senior Nutritionist (ADMIN)
 *               value:
 *                 email: senior@nysi.org.sg
 *                 password: SecurePass123!
 *             juniorNutritionist:
 *               summary: Junior Nutritionist (NUTRITIONIST)
 *               value:
 *                 email: junior@nysi.org.sg
 *                 password: SecurePass123!
 *             itAdmin:
 *               summary: IT Admin (IT_ADMIN)
 *               value:
 *                 email: tech@nysi.org.sg
 *                 password: SecurePass123!
 *     responses:
 *       200:
 *         description: Verification code sent to email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Verification code sent to your email
 *                 email:
 *                   type: string
 *                   example: se***@nysi.org.sg
 *                   description: Masked email address for privacy
 *                 expiresIn:
 *                   type: string
 *                   example: 10 minutes
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid credentials
 *                 message:
 *                   type: string
 *                   example: Email or password is incorrect
 *       403:
 *         description: Account deactivated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Account deactivated
 *                 message:
 *                   type: string
 *                   example: Your account has been deactivated. Please contact support.
 *       500:
 *         description: Server error
 */
router.post("/login", loginLimiter, login);

/**
 * @swagger
 * /api/auth/verify-code:
 *   post:
 *     summary: Login - Step 2 (Verify code and get token)
 *     description: Verifies the 6-digit code sent via email and returns JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - code
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: senior@nysi.org.sg
 *                 description: Same email used in login step
 *               code:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: "123456"
 *                 description: 6-digit verification code from email
 *     responses:
 *       200:
 *         description: Login successful - JWT token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                   description: JWT token for authenticated requests
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     role:
 *                       $ref: '#/components/schemas/UserRole'
 *       401:
 *         description: Invalid or expired code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid verification code
 *                 message:
 *                   type: string
 *                   example: The code you entered is incorrect
 *                 attemptsRemaining:
 *                   type: integer
 *                   example: 2
 *                   description: Number of attempts remaining (max 3)
 *       500:
 *         description: Server error
 */
router.post("/verify-code", codeLimiter, verifyCode);

/**
 * @swagger
 * /api/auth/resend-code:
 *   post:
 *     summary: Resend verification code
 *     description: Generates and sends a new verification code to user's email
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: senior@nysi.org.sg
 *     responses:
 *       200:
 *         description: New verification code sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: New verification code sent to your email
 *                 expiresIn:
 *                   type: string
 *                   example: 10 minutes
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post("/resend-code", resendLimiter, resendCode);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns the authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     role:
 *                       $ref: '#/components/schemas/UserRole'
 *                     is_active:
 *                       type: boolean
 *                     is_email_verified:
 *                       type: boolean
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     last_login_at:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Not authenticated or token missing
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Access token required
 *                 message:
 *                   type: string
 *                   example: Please provide a valid authentication token
 *       403:
 *         description: Token expired or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Token expired
 *                 message:
 *                   type: string
 *                   example: Your session has expired. Please login again.
 */
router.get("/me", authenticateToken, getCurrentUser);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     description: Logout endpoint (client should remove token from storage)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *                 note:
 *                   type: string
 *                   example: Please remove the authentication token from your client
 */
router.post("/logout", authenticateToken, logout);

export default router;
