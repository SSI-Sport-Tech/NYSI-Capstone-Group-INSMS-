/**
 * Authentication Middleware
 * Protects routes by verifying JWT tokens
 */

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Middleware to verify JWT token
 * Add to any route that requires authentication
 */
export const authenticateToken = (req, res, next) => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                error: "Access token required",
                message: "Please provide a valid authentication token",
            });
        }

        // Verify token
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                if (err.name === "TokenExpiredError") {
                    return res.status(403).json({
                        error: "Token expired",
                        message: "Your session has expired. Please login again.",
                    });
                }
                
                return res.status(403).json({
                    error: "Invalid token",
                    message: "Authentication failed. Please login again.",
                });
            }

            // Attach user info to request
            req.user = user;
            next();
        });
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(500).json({ error: "Authentication error" });
    }
};

/**
 * Middleware to check if user has admin role
 * Use AFTER authenticateToken
 */
export const requireAdmin = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }

        if (req.user.role !== "admin") {
            return res.status(403).json({
                error: "Access denied",
                message: "Admin privileges required",
            });
        }

        next();
    } catch (error) {
        console.error("Admin check error:", error);
        res.status(500).json({ error: "Authorization error" });
    }
};

/**
 * Middleware to check for specific roles
 * @param {Array} allowedRoles - Array of allowed roles
 */
export const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Authentication required" });
            }

            if (!allowedRoles.includes(req.user.role)) {
                return res.status(403).json({
                    error: "Access denied",
                    message: `Required role: ${allowedRoles.join(" or ")}`,
                });
            }

            next();
        } catch (error) {
            console.error("Role check error:", error);
            res.status(500).json({ error: "Authorization error" });
        }
    };
};

/**
 * Optional authentication - doesn't fail if no token
 * Useful for routes that have both public and authenticated behavior
 */
export const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            req.user = null;
            return next();
        }

        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) {
                req.user = null;
            } else {
                req.user = user;
            }
            next();
        });
    } catch (error) {
        req.user = null;
        next();
    }
};
