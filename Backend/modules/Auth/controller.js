/**
 * NYSI Authentication Controller
 * Handles user registration, 2FA login flow, and token verification
 * UPDATED: Automatically creates AMS nutritionist profile for ADMIN/NUTRITIONIST roles
 * 
 * Business Logic Flow:
 * 1. Register: Create user with hashed password → Create AMS profile if ADMIN/NUTRITIONIST
 * 2. Login Step 1: Verify credentials → Send 6-digit code via email
 * 3. Login Step 2: Verify code → Issue JWT token
 * 4. Protected routes: Verify JWT token
 */

import * as services from './services.js';
import {
    registerSchema,
    loginSchema,
    verifyCodeSchema,
    resendCodeSchema,
} from './validation.js';
import { z } from 'zod';
import { sendVerificationEmail } from './emailService.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const CODE_EXPIRY_MINUTES = parseInt(process.env.CODE_EXPIRY_MINUTES || '10');
const MAX_VERIFICATION_ATTEMPTS = parseInt(process.env.MAX_VERIFICATION_ATTEMPTS || '3');

// ============================================================================
// USER REGISTRATION
// ============================================================================

/**
 * Use Case: Register New User (UC-AUTH-001)
 * POST /api/auth/register
 * 
 * Creates a new user account with hashed password
 * If role is ADMIN or NUTRITIONIST, also creates AMS nutritionist profile
 */
export async function register(req, res) {
    try {
        console.log('📝 Registering new user...');
        console.log('Request body:', { ...req.body, password: '[REDACTED]' });

        // STEP 1: Validate request body
        console.log('Step 1: Validating schema...');
        const validatedData = registerSchema.parse(req.body);
        console.log('Schema validation passed');

        // STEP 2: Check if user already exists
        console.log('Step 2: Checking for existing user...');
        const existingUser = await services.getUserByEmail(validatedData.email);

        if (existingUser) {
            console.log('User already exists');
            return res.status(409).json({
                error: 'User already exists',
                message: 'An account with this email address already exists',
            });
        }
        console.log('No existing user found');

        // STEP 3: Hash password
        console.log('Step 3: Hashing password...');
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);
        console.log('Password hashed successfully');

        // STEP 4: Create user
        console.log('Step 4: Creating user in database...');
        const newUser = await services.createUser({
            email: validatedData.email,
            password_hash: hashedPassword,
            first_name: validatedData.first_name,
            last_name: validatedData.last_name,
            role: validatedData.role || 'NUTRITIONIST',
        });
        console.log('User created with ID:', newUser.id);

        // STEP 5: Create AMS profile if ADMIN or NUTRITIONIST
        const nutritionistRoles = ['ADMIN', 'NUTRITIONIST'];
        if (nutritionistRoles.includes(newUser.role)) {
            console.log('Step 5: Creating AMS nutritionist profile...');

            try {
                const nutritionistName = `${validatedData.first_name} ${validatedData.last_name}`;
                const amsProfile = await services.createNutritionistProfile({
                    name: nutritionistName,
                    user_id: newUser.id,
                });

                console.log('AMS nutritionist profile created with ID:', amsProfile.id);
                console.log('✅ User and AMS profile successfully linked');
            } catch (amsError) {
                console.error('❌ Failed to create AMS profile:', amsError);
                // Important: Rollback user creation if AMS profile creation fails
                console.log('Rolling back user creation...');
                await services.deleteUserById(newUser.id);

                return res.status(500).json({
                    error: 'Registration failed',
                    message: 'Failed to create nutritionist profile. Please try again.',
                    details: process.env.NODE_ENV === 'development' ? amsError.message : undefined,
                });
            }
        } else {
            console.log('Step 5: Skipping AMS profile creation (role is not ADMIN/NUTRITIONIST)');
        }

        // STEP 6: Return success response
        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                role: newUser.role,
            },
        });

    } catch (error) {
        console.error('Error registering user:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            const zodErrors = error.issues || error.errors || [];
            return res.status(400).json({
                error: 'Validation failed',
                details: zodErrors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received,
                })),
            });
        }

        // Handle database errors
        res.status(500).json({
            error: 'Registration failed',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// LOGIN - STEP 1: VERIFY CREDENTIALS AND SEND CODE
// ============================================================================

/**
 * Use Case: Login Step 1 - Verify Credentials (UC-AUTH-002)
 * POST /api/auth/login
 * 
 * Validates email/password and sends 6-digit verification code via email
 */
export async function login(req, res) {
    try {
        console.log('🔐 Processing login request...');
        console.log('Request body:', { email: req.body.email, password: '[REDACTED]' });

        // STEP 1: Validate request body
        console.log('Step 1: Validating schema...');
        const validatedData = loginSchema.parse(req.body);
        console.log('Schema validation passed');

        // STEP 2: Get user by email
        console.log('Step 2: Fetching user from database...');
        const user = await services.getUserByEmail(validatedData.email);

        if (!user) {
            console.log('User not found');
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect',
            });
        }
        console.log('User found:', user.id);

        // STEP 3: Check if user is active
        console.log('Step 3: Checking user status...');
        if (!user.is_active) {
            console.log('User account is deactivated');
            return res.status(403).json({
                error: 'Account deactivated',
                message: 'Your account has been deactivated. Please contact support.',
            });
        }
        console.log('User is active');

        // STEP 4: Verify password
        console.log('Step 4: Verifying password...');
        const validPassword = await bcrypt.compare(validatedData.password, user.password_hash);

        if (!validPassword) {
            console.log('Invalid password');
            return res.status(401).json({
                error: 'Invalid credentials',
                message: 'Email or password is incorrect',
            });
        }
        console.log('Password verified successfully');

        // STEP 5: Generate 6-digit verification code
        console.log('Step 5: Generating verification code...');
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
        console.log(`Verification code generated (expires in ${CODE_EXPIRY_MINUTES} minutes)`);

        // STEP 6: Delete any existing verification codes for this user
        console.log('Step 6: Cleaning up old verification codes...');
        await services.deleteVerificationCodesByUserId(user.id);
        console.log('Old codes deleted');

        // STEP 7: Store new verification code
        console.log('Step 7: Storing verification code...');
        await services.createVerificationCode({
            user_id: user.id,
            code: verificationCode,
            purpose: 'LOGIN_2FA',
            expires_at: expiresAt,
            attempts: 0,
        });
        console.log('Verification code stored');

        // STEP 8: Send email (async - don't wait)
        console.log('Step 8: Sending verification email...');
        sendVerificationEmail(user.email, verificationCode, user.first_name)
            .then(() => console.log('✅ Email sent successfully'))
            .catch(err => console.error('❌ Email sending error:', err));

        // STEP 9: Mask email for response
        const maskedEmail = user.email.replace(
            /(.{2})(.*)(@.*)/,
            (match, p1, p2, p3) => p1 + '*'.repeat(p2.length) + p3
        );

        // STEP 10: Return success response
        res.json({
            message: 'Verification code sent to your email',
            email: maskedEmail,
            expiresIn: `${CODE_EXPIRY_MINUTES} minutes`,
        });

    } catch (error) {
        console.error('Error during login:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            const zodErrors = error.issues || error.errors || [];
            return res.status(400).json({
                error: 'Validation failed',
                details: zodErrors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received,
                })),
            });
        }

        // Handle other errors
        res.status(500).json({
            error: 'Login failed',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// LOGIN - STEP 2: VERIFY CODE AND ISSUE TOKEN
// ============================================================================

/**
 * Use Case: Login Step 2 - Verify Code (UC-AUTH-003)
 * POST /api/auth/verify-code
 * 
 * Verifies the 6-digit code and issues JWT token
 */
export async function verifyCode(req, res) {
    try {
        console.log('✅ Verifying 2FA code...');
        console.log('Request body:', { email: req.body.email, code: req.body.code });

        // STEP 1: Validate request body
        console.log('Step 1: Validating schema...');
        const validatedData = verifyCodeSchema.parse(req.body);
        console.log('Schema validation passed');

        // STEP 2: Get user and verification code
        console.log('Step 2: Fetching user and verification code...');
        const user = await services.getUserByEmail(validatedData.email);

        if (!user) {
            console.log('User not found');
            return res.status(401).json({
                error: 'Invalid request',
                message: 'No verification code found. Please login again.',
            });
        }

        const verification = await services.getVerificationCodeByUserId(user.id, 'LOGIN_2FA');

        if (!verification) {
            console.log('No verification code found');
            return res.status(401).json({
                error: 'No verification code found',
                message: 'Please login again to receive a new code.',
            });
        }
        console.log('Verification code found');

        // STEP 3: Check if code expired
        console.log('Step 3: Checking code expiration...');
        if (new Date() > new Date(verification.expires_at)) {
            console.log('Code expired');
            await services.deleteVerificationCodesByUserId(user.id);
            return res.status(401).json({
                error: 'Verification code expired',
                message: 'Your code has expired. Please login again.',
            });
        }
        console.log('Code is still valid');

        // STEP 4: Check max attempts
        console.log('Step 4: Checking attempt count...');
        if (verification.attempts >= MAX_VERIFICATION_ATTEMPTS) {
            console.log('Too many failed attempts');
            await services.deleteVerificationCodesByUserId(user.id);
            return res.status(401).json({
                error: 'Too many failed attempts',
                message: 'You have exceeded the maximum number of attempts. Please login again.',
            });
        }
        console.log(`Attempts: ${verification.attempts}/${MAX_VERIFICATION_ATTEMPTS}`);

        // STEP 5: Verify code
        console.log('Step 5: Verifying code...');
        if (verification.code !== validatedData.code) {
            console.log('Invalid code');
            // Increment attempts
            await services.incrementVerificationAttempts(user.id);
            const remainingAttempts = MAX_VERIFICATION_ATTEMPTS - (verification.attempts + 1);

            return res.status(401).json({
                error: 'Invalid verification code',
                message: 'The code you entered is incorrect',
                attemptsRemaining: remainingAttempts,
            });
        }
        console.log('Code verified successfully');

        // STEP 6: Code is valid - delete it
        console.log('Step 6: Deleting used verification code...');
        await services.deleteVerificationCodesByUserId(user.id);
        console.log('Code deleted');

        // STEP 7: Update last login
        console.log('Step 7: Updating last login timestamp...');
        await services.updateLastLogin(user.id);
        console.log('Last login updated');

        // STEP 8: Generate JWT token
        console.log('Step 8: Generating JWT token...');
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRY }
        );
        console.log('JWT token generated');

        // STEP 9: Return success response
        console.log('✅ Login successful');
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
            },
        });

    } catch (error) {
        console.error('Error verifying code:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            const zodErrors = error.issues || error.errors || [];
            return res.status(400).json({
                error: 'Validation failed',
                details: zodErrors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received,
                })),
            });
        }

        // Handle other errors
        res.status(500).json({
            error: 'Verification failed',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// RESEND VERIFICATION CODE
// ============================================================================

/**
 * Use Case: Resend Verification Code (UC-AUTH-004)
 * POST /api/auth/resend-code
 * 
 * Generates and sends a new verification code
 */
export async function resendCode(req, res) {
    try {
        console.log('🔄 Resending verification code...');
        console.log('Request body:', { email: req.body.email });

        // STEP 1: Validate request body
        console.log('Step 1: Validating schema...');
        const validatedData = resendCodeSchema.parse(req.body);
        console.log('Schema validation passed');

        // STEP 2: Get user
        console.log('Step 2: Fetching user...');
        const user = await services.getUserByEmail(validatedData.email);

        if (!user) {
            console.log('User not found');
            return res.status(404).json({
                error: 'User not found',
                message: 'No account found with this email address',
            });
        }
        console.log('User found:', user.id);

        // STEP 3: Check if user is active
        if (!user.is_active) {
            console.log('User account is deactivated');
            return res.status(403).json({
                error: 'Account deactivated',
                message: 'Your account has been deactivated',
            });
        }

        // STEP 4: Generate new verification code
        console.log('Step 4: Generating new verification code...');
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);
        console.log('New code generated');

        // STEP 5: Delete old codes and insert new one
        console.log('Step 5: Replacing old verification code...');
        await services.deleteVerificationCodesByUserId(user.id);
        await services.createVerificationCode({
            user_id: user.id,
            code: verificationCode,
            purpose: 'LOGIN_2FA',
            expires_at: expiresAt,
            attempts: 0,
        });
        console.log('New code stored');

        // STEP 6: Send email (async)
        console.log('Step 6: Sending verification email...');
        sendVerificationEmail(user.email, verificationCode, user.first_name)
            .then(() => console.log('✅ Email sent successfully'))
            .catch(err => console.error('❌ Email sending error:', err));

        // STEP 7: Return success response
        res.json({
            message: 'New verification code sent to your email',
            expiresIn: `${CODE_EXPIRY_MINUTES} minutes`,
        });

    } catch (error) {
        console.error('Error resending code:', error);

        // Handle Zod validation errors
        if (error instanceof z.ZodError) {
            const zodErrors = error.issues || error.errors || [];
            return res.status(400).json({
                error: 'Validation failed',
                details: zodErrors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message,
                    received: err.received,
                })),
            });
        }

        // Handle other errors
        res.status(500).json({
            error: 'Failed to resend code',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// GET CURRENT USER
// ============================================================================

/**
 * Use Case: Get Current User Profile (UC-AUTH-005)
 * GET /api/auth/me
 * 
 * Returns authenticated user's profile information
 * Requires JWT token in Authorization header
 */
export async function getCurrentUser(req, res) {
    try {
        console.log('👤 Fetching current user profile...');
        console.log('User ID from token:', req.user.userId);

        // User ID comes from authenticateToken middleware (req.user)
        const user = await services.getUserById(req.user.userId);

        if (!user) {
            console.log('User not found');
            return res.status(404).json({
                error: 'User not found',
                message: 'Your account may have been deleted',
            });
        }

        console.log('User profile fetched successfully');
        res.json({
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: user.role,
                is_active: user.is_active,
                is_email_verified: user.is_email_verified,
                created_at: user.created_at,
                last_login_at: user.last_login_at,
            },
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            error: 'Failed to fetch user',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}

// ============================================================================
// LOGOUT
// ============================================================================

/**
 * Use Case: Logout (UC-AUTH-006)
 * POST /api/auth/logout
 * 
 * Logout endpoint (mainly for client-side token removal)
 * In future: Can implement token blacklisting with Redis
 */
export async function logout(req, res) {
    try {
        console.log('👋 User logging out...');
        console.log('User ID:', req.user.userId);

        // In a more advanced implementation:
        // 1. Add token to blacklist (Redis)
        // 2. Track logout time in database
        // 3. Invalidate refresh tokens

        res.json({
            message: 'Logged out successfully',
            note: 'Please remove the authentication token from your client',
        });

    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).json({
            error: 'Logout failed',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
        });
    }
}