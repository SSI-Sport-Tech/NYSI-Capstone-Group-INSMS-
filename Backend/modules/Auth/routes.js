/**
 * Authentication Routes
 * Handles all authentication-related endpoints
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
 *   description: User authentication and 2FA management
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
 *                 example: john.doe@nysi.com
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
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: User already exists
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
 *                 example: john.doe@nysi.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Verification code sent
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
 *                   example: jo***@nysi.com
 *                 expiresIn:
 *                   type: string
 *                   example: 10 minutes
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account deactivated
 *       500:
 *         description: Server error
 */
router.post("/login", loginLimiter, login);

/**
 * @swagger
 * /api/auth/verify-code:
 *   post:
 *     summary: Login - Step 2 (Verify code and get token)
 *     description: Verifies the 6-digit code and returns JWT token
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
 *                 example: john.doe@nysi.com
 *               code:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
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
 *                       type: string
 *       401:
 *         description: Invalid or expired code
 *       500:
 *         description: Server error
 */
router.post("/verify-code", codeLimiter, verifyCode);

/**
 * @swagger
 * /api/auth/resend-code:
 *   post:
 *     summary: Resend verification code
 *     description: Sends a new verification code to user's email
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
 *                 example: john.doe@nysi.com
 *     responses:
 *       200:
 *         description: New code sent
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
 *         description: User profile
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
 *                       type: string
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *                     last_login:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Not authenticated
 */
router.get("/me", authenticateToken, getCurrentUser);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout
 *     description: Logout endpoint (client should remove token)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", authenticateToken, logout);

export default router;
