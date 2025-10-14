import express from "express";
const router = express.Router();

// Test route for frontend button
router.get("/test", (req, res) => {
    res.json({ message: "Supplement API is working!" });
});

export default router;
