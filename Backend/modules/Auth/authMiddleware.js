/**
 * Authentication Middleware
 * Protects routes by verifying JWT tokens
 * UPDATED: Aligned with NYSI database roles
 */

import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

/**
 * Middleware to verify JWT token
 * Add to any route that requires authentication
 */
export const authenticateToken = (req, res, next) => {
  try {
    console.log("authenticateToken: Checking headers...");
    // Get token from Authorization header
    const authHeader = req.headers["authorization"];
    console.log(
      "authenticateToken: Auth header:",
      authHeader
        ? "Bearer " + authHeader.split(" ")[1]?.substring(0, 20) + "..."
        : "No auth header",
    );

    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      console.log("authenticateToken: No token found");
      return res.status(401).json({
        error: "Access token required",
        message: "Please provide a valid authentication token",
      });
    }

    console.log("authenticateToken: Verifying token...");
    // Verify token
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.log("authenticateToken: Token verification failed:", err.name);
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

      console.log("authenticateToken: Token verified, user:", user);
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
 * Middleware to check if user has IT_ADMIN role
 * Use AFTER authenticateToken
 * IT_ADMIN = Full database access (The Tech Team)
 */
export const requireITAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.nomsrole !== "IT_ADMIN") {
      return res.status(403).json({
        error: "Access denied",
        message: "IT Admin privileges required",
      });
    }

    next();
  } catch (error) {
    console.error("IT Admin check error:", error);
    res.status(500).json({ error: "Authorization error" });
  }
};

/**
 * Middleware to check if user has ADMIN role
 * Use AFTER authenticateToken
 * ADMIN = Senior Nutritionist (Can approve supplements, manage team)
 */
export const requireAdmin = (req, res, next) => {
  try {
    console.log("requireAdmin: Checking user:", req.user);

    if (!req.user) {
      console.log("requireAdmin: No user found in request");
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log("requireAdmin: User role:", req.user.nomsRole);

    if (req.user.nomsRole !== "ADMIN" && req.user.nomsRole !== "IT_ADMIN") {
      console.log("requireAdmin: Access denied for role:", req.user.nomsRole);
      return res.status(403).json({
        error: "Access denied",
        message: "Admin privileges required",
        userRole: req.user.nomsRole,
      });
    }

    console.log("requireAdmin: Access granted for role:", req.user.nomsRole);
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ error: "Authorization error" });
  }
};

/**
 * Middleware to check if user is a Nutritionist (ADMIN or NUTRITIONIST)
 * Use AFTER authenticateToken
 */
export const requireNutritionist = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const allowedRoles = ["IT_ADMIN", "ADMIN", "NUTRITIONIST"];
    if (!allowedRoles.includes(req.user.nomsRole)) {
      return res.status(403).json({
        error: "Access denied",
        message: "Nutritionist access required",
      });
    }

    next();
  } catch (error) {
    console.error("Nutritionist check error:", error);
    res.status(500).json({ error: "Authorization error" });
  }
};

/**
 * Middleware to check for specific roles
 * @param {Array} allowedRoles - Array of allowed roles
 *
 * Usage:
 * router.get('/route', authenticateToken, requireRole(['IT_ADMIN', 'ADMIN']), handler);
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      if (!allowedRoles.includes(req.user.nomsRole)) {
        return res.status(403).json({
          error: "Access denied",
          message: `Required role: ${allowedRoles.join(" or ")}`,
          yourRole: req.user.nomsRole,
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if user is IT Admin
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
export const isITAdmin = (user) => {
  return user && user.nomsRole === "IT_ADMIN";
};

/**
 * Check if user is Admin (Senior Nutritionist) or higher
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
export const isAdmin = (user) => {
  return user && (user.nomsRole === "ADMIN" || user.nomsRole === "IT_ADMIN");
};

/**
 * Check if user is any type of Nutritionist
 * @param {Object} user - User object from req.user
 * @returns {boolean}
 */
export const isNutritionist = (user) => {
  return user && ["IT_ADMIN", "ADMIN", "NUTRITIONIST"].includes(user.nomsRole);
};

/**
 * Check if user has any of the specified roles
 * @param {Object} user - User object from req.user
 * @param {Array} roles - Array of role names
 * @returns {boolean}
 */
export const hasRole = (user, roles) => {
  return user && roles.includes(user.nomsRole);
};
