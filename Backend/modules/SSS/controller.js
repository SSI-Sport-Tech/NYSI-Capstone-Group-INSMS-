// Backend/modules/SSS/controller.js
import { searchSupplements } from "./services.js";

export async function getSearch(req, res) {
    try {
        const q = req.query.q;
        const scope = (req.query.scope || "all").toLowerCase();
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        if (!q || !q.trim()) {
            return res.status(400).json({ success: false, error: "Missing search query" });
        }

        const { rows, total } = await searchSupplements(q, scope, limit, offset);
        return res.json({ success: true, results: rows, total });
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ success: false, error: "Server error while searching" });
    }
}
