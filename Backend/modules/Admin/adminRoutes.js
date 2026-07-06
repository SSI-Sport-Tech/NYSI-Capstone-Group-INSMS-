/**
 * Admin Routes - Unified User Management
 * Supports AEMS, ICS and NOMS user management
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import {
    getAllUsers,
    getUserDetails,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    toggleUserActive,
    changeUserPassword,
    changeUserEmail,
    getUserActivity,
    getAuditLogs,
    getAuditLogStatistics,
    getAuditedTables,
    getRecordAuditHistory,
    getUserStats,
} from './adminController.js';
import { authenticateToken, requireAdmin } from '../Auth/authMiddleware.js';

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────
const adminLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    message: { error: 'Too many admin requests', message: 'Please slow down' },
});

// ── Middleware ────────────────────────────────────────────────────────────────
router.use(authenticateToken);
router.use(requireAdmin);
router.use(adminLimiter);

// ── User Management ───────────────────────────────────────────────────────────
router.get('/users', getAllUsers);
router.post('/users', createUser);          // ← NEW: unified create with PIN
router.get('/users/:id', getUserDetails);
router.patch('/users/:id', updateUser);
router.put('/users/:id', updateUser);          // ← accept PUT too (from ICS page)
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/active', toggleUserActive);
router.patch('/users/:id/password', changeUserPassword);
router.patch('/users/:id/email', changeUserEmail);
router.get('/users/:id/activity', getUserActivity);

// ── Statistics ────────────────────────────────────────────────────────────────
router.get('/stats', getUserStats);

// ── Audit Logs ────────────────────────────────────────────────────────────────
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/statistics', getAuditLogStatistics);
router.get('/audit-logs/tables', getAuditedTables);
router.get('/audit-logs/:tableName/:recordId', getRecordAuditHistory);

export default router;