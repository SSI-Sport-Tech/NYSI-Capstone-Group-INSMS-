import pg from "pg";
import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

const { Pool } = pg;

// Create a connection pool using .env values
const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000, // 10 seconds
    query_timeout: 10000,
    statement_timeout: 10000,
});

// handle pool errors gracefully
pool.on("error", (err) => {
    console.error("❌ Unexpected PostgreSQL pool error:", err);
    process.exit(-1);
});

// verify connection once on startup (with retry)
(async () => {
    try {
        const res = await pool.query("SELECT NOW()");
        console.log("✅ Connected to PostgreSQL at:", res.rows[0].now);
    } catch (err) {
        console.error("❌ Database connection failed:", err.message);
        console.log("⚠️  App will continue but database features won't work");
        console.log("💡 Check your AWS RDS Security Group settings");
        console.log("💡 Your IP: Add 202.94.70.53/32 to inbound rules");
    }
})();

export default pool;
