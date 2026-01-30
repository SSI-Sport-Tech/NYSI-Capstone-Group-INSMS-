"""
Database connection utilities for webscraper services.
Uses centralized settings from app.config.settings
"""

import psycopg
from contextlib import contextmanager
from app.config.settings import settings


def get_db_connection_string() -> str:
    """
    Build PostgreSQL connection string from settings.
    
    Returns:
        str: PostgreSQL connection string
    """
    return psycopg.conninfo.make_conninfo(
        host=settings.postgres_host,
        port=settings.postgres_port,
        dbname=settings.postgres_db,
        user=settings.postgres_user,
        password=settings.postgres_password,
        sslmode="prefer",
    )


@contextmanager
def get_db_connection():
    """
    Context manager for database connections.
    
    Usage:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM table")
    """
    conn = psycopg.connect(get_db_connection_string())
    try:
        yield conn
    finally:
        conn.close()


def test_db_connection() -> bool:
    """
    Test database connection.
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                result = cur.fetchone()
                if result and result[0] == 1:
                    print("✅ Database connection successful")
                    return True
        return False
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


# Test on module import (optional - for debugging)
if __name__ == "__main__":
    print("\n" + "="*60)
    print("TESTING DATABASE CONNECTION")
    print("="*60 + "\n")
    
    print("Configuration:")
    print(f"  Host: {settings.postgres_host}")
    print(f"  Port: {settings.postgres_port}")
    print(f"  Database: {settings.postgres_db}")
    print(f"  User: {settings.postgres_user}")
    print(f"  Password: {'*' * len(settings.postgres_password)} ({len(settings.postgres_password)} chars)")
    print()
    
    print("Testing connection...")
    success = test_db_connection()
    
    if not success:
        print("\nTroubleshooting:")
        print("1. Check PostgreSQL is running")
        print("2. Verify .env has correct credentials")
        print("3. Check database exists: psql -l")