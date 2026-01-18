import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ocrRoutes from "./modules/OCR/routes.js";


// Load env variables
dotenv.config();

// Import database connection (this will test and log immediately)
import pool from "./config/db.js";

// Express app
const app = express();
const PORT = process.env.PORT || 8000;

// CORS - Allow requests from Next.js dev server
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import your existing routes
import supplementRoutes from "./modules/SSS/routes.js";
import athleteRoutes from "./modules/AthleteProfileSystem/routes.js";

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
        note: "This endpoint doesn't require database"
    });
});

// Start server
const server = app.listen(PORT, () => {
    console.log(`✅ Backend API running on http://localhost:${PORT}`);
    console.log(`✅ CORS enabled for: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);
});

// Increase timeout for long-running OCR requests (2 minutes)
server.timeout = 120000;
