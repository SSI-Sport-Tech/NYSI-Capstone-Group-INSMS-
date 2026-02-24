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
    console.error("Unexpected PostgreSQL pool error:", err);
    process.exit(-1);
});

// verify connection once on startup (with retry)
(async () => {
    try {
        const res = await pool.query("SELECT NOW()");
        console.log("Connected to PostgreSQL at:", res.rows[0].now);
    } catch (err) {
        console.error("Database connection failed:", err.message);
        console.log("App will continue but database features won't work");
        console.log("Check your AWS RDS Security Group settings");
        console.log("Your IP: Add 202.94.70.53/32 to inbound rules");
    }
})();

export default pool;

/**
 * Runs a callback inside a transaction with the current user ID set
 * for the audit trigger (app.current_user_id). Use for all INSERT/UPDATE/DELETE.
 *
 * SET LOCAL scopes the variable to the current transaction only,
 * so it never leaks across pool connections.
 *
 * @param {string|null} userId - auth.users.id UUID from req.user.userId
 * @param {Function} callback - async (client) => { return await client.query(...) }
 * @returns {Promise<*>} Whatever the callback returns
 */
export async function withUserContext(userId, callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (userId) {
            await client.query('SELECT set_config($1, $2, true)', ['app.current_user_id', userId]);
        }
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}
