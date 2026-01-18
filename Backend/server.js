import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ocrRoutes from "./modules/OCR/routes.js";
import supplementRoutes from "./modules/SSS/routes.js";
import athleteRoutes from "./modules/AthleteProfileSystem/routes.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

// Load env variables
dotenv.config();

// Import database connection (this will test and log immediately)
import pool from "./config/db.js";

// Express app
const app = express();
const PORT = process.env.PORT || 8000;

// CORS - Allow requests from Next.js dev server
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NYSI Backend API",
      version: "2.0.0",
      description:
        "New York Sports Institute - Supplement Management System API",
      contact: {
        name: "NYSI Development Team",
        email: "dev@nysi.edu",
      },
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
    components: {
      parameters: {
        PageParam: {
          name: "page",
          in: "query",
          description: "Page number for pagination",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            default: 1,
          },
        },
        LimitParam: {
          name: "limit",
          in: "query",
          description: "Number of items per page",
          required: false,
          schema: {
            type: "integer",
            minimum: 1,
            maximum: 100,
            default: 10,
          },
        },
        SearchParam: {
          name: "search",
          in: "query",
          description: "Search query string",
          required: false,
          schema: {
            type: "string",
          },
        },
      },
    },
    tags: [
      {
        name: "Health",
        description: "Health check and system status endpoints",
      },
      {
        name: "Supplements",
        description: "Supplement library management",
      },
      {
        name: "Inventory",
        description: "Batch inventory management",
      },
    ],
  },
  apis: [
    "./modules/SSS/routes.js",
    "./modules/AthleteProfileSystem/routes.js",
    "./modules/OCR/routes.js",
    "./server.js",
  ],
};

const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// Setup Swagger Documentation
app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpecs, {
    explorer: true,
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "NYSI API Documentation",
  })
);

// Register API routes
app.use("/api/SSS", supplementRoutes);
app.use("/api/APS", athleteRoutes);
app.use("/api/ocr", ocrRoutes);

// Health check endpoint
/**
 * @swagger
 * /:
 *   get:
 *     summary: Health Check
 *     description: Check if the API is running
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
 *                   example: "NYSI Backend API is running"
 *                 version:
 *                   type: string
 *                   example: "2.0"
 */
app.get("/", (req, res) => {
  res.json({ message: "NYSI Backend API is running", version: "2.0" });
});

// Test endpoint (no database required)
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
 *                   example: "Backend is working! ✅"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 note:
 *                   type: string
 *                   example: "This endpoint doesn't require database"
 */
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working! ✅",
    timestamp: new Date().toISOString(),
    note: "This endpoint doesn't require database",
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Backend API running on http://localhost:${PORT}`);
  console.log(
    `✅ CORS enabled for: ${
      process.env.FRONTEND_URL || "http://localhost:3000"
    }`
  );
});

// Increase timeout for long-running OCR requests (2 minutes)
server.timeout = 120000;
