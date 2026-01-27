"""
Database connection utilities for webscraper services.
"""

import os
import psycopg
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()


def get_db_connection_string() -> str:
    """Build PostgreSQL connection string from environment variables."""
    return psycopg.conninfo.make_conninfo(
        host=os.getenv("PGHOST"),
        port=os.getenv("PGPORT"),
        dbname=os.getenv("PGDATABASE"),
        user=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD"),
        sslmode=os.getenv("PGSSLMODE", "prefer"),
    )


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.
    
    Usage:
        with get_db_connection() as conn:
            # Use conn
    """
    conn = psycopg.connect(get_db_connection_string())
    try:
        yield conn
    finally:
        conn.close()


def test_db_connection() -> bool:
    """Test database connection."""
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                result = cur.fetchone()
                return result[0] == 1
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False