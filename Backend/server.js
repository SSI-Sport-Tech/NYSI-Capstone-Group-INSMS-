import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerSpecs from "./config/swagger.js";
import ocrRoutes from "./modules/OCR/routes.js";
import supplementRoutes from "./modules/SSS/index.js";
import adminRoutes from "./modules/Admin/adminRoutes.js";
import athleteRoutes from "./modules/AMS/index.js";
import authRoutes from "./modules/Auth/routes.js";
import consultationRoutes from "./modules/Consultation/index.js";
import nutritionistScheduleRoutes from "./modules/AMS/nutritionist_schedule/routes.js";
// import scheduleRoutes from "./modules/AMS/nutritionist_schedule/routes.js";
import { verifyEmailConfig } from "./modules/Auth/emailService.js";
import { ZodError } from "zod";

// Load environment variables
dotenv.config();

// Import database connection (this will test and log immediately)
import pool from "./config/db.js";

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// ==================== MIDDLEWARE ====================

// CORS - Allow requests from Next.js dev server
app.use(
  cors({
    origin: [process.env.FRONTEND_URL || "http://localhost:3000", "http://127.0.0.1",],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==================== API DOCUMENTATION ====================

// Update Swagger with security scheme for JWT (SAFE MERGE)
const swaggerOptions = {
  ...swaggerSpecs,
  components: {
    ...(swaggerSpecs.components || {}),
    securitySchemes: {
      ...(swaggerSpecs.components?.securitySchemes || {}),
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token from /api/auth/verify-code",
      },
    },
  },
};

// Swagger UI setup
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerOptions, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "NYSI API Documentation",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  }),
);

// Swagger JSON endpoint (useful for importing into other tools)
app.get("/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerOptions);
});

// ==================== API ROUTES ====================

// Authentication routes (must be first for security)
app.use("/api/auth", authRoutes);

// App Routes
app.use("/api/SSS", supplementRoutes);
app.use("/api/AMS", athleteRoutes);
app.use("/api/ocr", ocrRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/Consultation", consultationRoutes);
// app.use("/api/Nutritionist", nutritionistScheduleRoutes);

// ==================== HEALTH CHECK ENDPOINTS ====================

/**
 * @swagger
 * /:
 *   get:
 *     summary: Health Check
 *     description: Check if the API is running and get basic information
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is running successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: NYSI Backend API is running
 *                 version:
 *                   type: string
 *                   example: "2.1"
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                 documentation:
 *                   type: string
 *                   example: http://localhost:8000/docs
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
app.get("/", (req, res) => {
  res.json({
    message: "NYSI Backend API is running",
    version: "2.1",
    features: [
      "2FA Email Authentication",
      "Supplement Management",
      "Athlete Profiles",
      "OCR Services",
      "Web Scraping",
    ],
    documentation: `http://localhost:${PORT}/docs`,
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /api/test:
 *   get:
 *     summary: Test Endpoint
 *     description: Simple test endpoint that doesn't require database connection
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Test successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Backend is working!
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 note:
 *                   type: string
 *                   example: This endpoint doesn't require database
 */
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working! ✅",
    timestamp: new Date().toISOString(),
    note: "This endpoint doesn't require database",
  });
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Detailed Health Check
 *     description: Check database connection and service status
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All services are healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 services:
 *                   type: object
 *                   properties:
 *                     api:
 *                       type: string
 *                       example: running
 *                     database:
 *                       type: string
 *                       example: connected
 *                     email:
 *                       type: string
 *                       example: configured
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 error:
 *                   type: string
 */
app.get("/api/health", async (req, res) => {
  try {
    // Test database connection
    await pool.query("SELECT 1");

    // Check email configuration
    const emailConfigured =
      process.env.EMAIL_USER && process.env.EMAIL_PASSWORD;

    res.json({
      status: "healthy",
      services: {
        api: "running",
        database: "connected",
        email: emailConfigured ? "configured" : "not_configured",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "unhealthy",
      services: {
        api: "running",
        database: "disconnected",
        email: "unknown",
      },
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ==================== 404 HANDLER ====================

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
    method: req.method,
    suggestion: `Visit http://localhost:${PORT}/docs for API documentation`,
  });
});

// ==================== ERROR HANDLER ====================

app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Zod validation errors → 400 Bad Request
  if (err instanceof ZodError) {
    const issues = err.issues ?? err.errors ?? [];
    return res.status(400).json({
      error: "Validation failed",
      details: issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ==================== START SERVER ====================

const server = app.listen(PORT, async () => {
  console.log("\n" + "=".repeat(60));
  console.log("✅ NYSI Backend API Server Started");
  console.log("=".repeat(60));
  console.log(`🌐 Server URL:        http://localhost:${PORT}`);
  console.log(`📚 API Docs:          http://localhost:${PORT}/docs`);
  console.log(`📄 OpenAPI JSON:      http://localhost:${PORT}/docs.json`);
  console.log(
    `🔗 CORS Enabled For:  ${process.env.FRONTEND_URL || "http://localhost:3000"
    }`,
  );
  console.log("=".repeat(60));
  console.log("🔒 Authentication:    2FA Email Enabled");
  console.log("📧 Email Service:     Checking configuration...");
  console.log("=".repeat(60) + "\n");

  // Verify email configuration on startup
  await verifyEmailConfig();
});

// Increase timeout for long-running OCR requests (2 minutes)
server.timeout = 120000;

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
    pool.end(() => {
      console.log("Database pool closed");
      process.exit(0);
    });
  });
});
