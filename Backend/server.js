import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load env variables
dotenv.config();

// Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, "..", "Frontend")));

// Import your existing routes
import supplementRoutes from "./modules/SSS/routes.js";
import athleteRoutes from "./modules/AthleteProfileSystem/routes.js";

// Register API routes
app.use("/api/SSS", supplementRoutes);
app.use("/api/APS", athleteRoutes);

// Serve your index.html at root
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "Frontend", "index.html"));
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});
