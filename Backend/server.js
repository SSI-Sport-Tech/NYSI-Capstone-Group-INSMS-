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
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
    paths: {
      "/": {
        get: {
          summary: "Health Check",
          description: "Check if the API is running",
          responses: {
            200: {
              description: "API is running successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      message: { type: "string" },
                      version: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/test": {
        get: {
          summary: "Test Endpoint",
          description: "Simple test endpoint (no database required)",
          responses: {
            200: {
              description: "Test successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      message: { type: "string" },
                      timestamp: { type: "string" },
                      note: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/SSS/batches": {
        get: {
          summary: "Get Inventory Batches",
          description: "Get paginated list of supplement inventory batches",
          parameters: [
            {
              name: "page",
              in: "query",
              description: "Page number",
              required: false,
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              description: "Items per page",
              required: false,
              schema: { type: "integer", default: 10 },
            },
            {
              name: "search",
              in: "query",
              description: "Search query",
              required: false,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "List of batches",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array" },
                      totalCount: { type: "integer" },
                      currentPage: { type: "integer" },
                      totalPages: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/SSS/supplements": {
        get: {
          summary: "Get Supplements",
          description: "Get paginated list of supplements",
          parameters: [
            {
              name: "page",
              in: "query",
              description: "Page number",
              required: false,
              schema: { type: "integer", default: 1 },
            },
            {
              name: "limit",
              in: "query",
              description: "Items per page",
              required: false,
              schema: { type: "integer", default: 10 },
            },
            {
              name: "search",
              in: "query",
              description: "Search query",
              required: false,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "List of supplements",
            },
          },
        },
      },
    },
  },
  apis: [], // No need for file scanning since we define paths above
};

const specs = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

// Register API routes
app.use("/api/SSS", supplementRoutes);
app.use("/api/APS", athleteRoutes);
app.use("/api/ocr", ocrRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({ message: "NYSI Backend API is running", version: "2.0" });
});

// Test endpoint (no database required)
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
