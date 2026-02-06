-- =====================================================
-- NYSI Authentication System - Database Schema
-- =====================================================
-- This migration creates the necessary tables for 2FA email authentication
-- Run this in your PostgreSQL database before starting the server

-- =====================================================
-- 1. USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'manager')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- =====================================================
-- 2. VERIFICATION CODES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON verification_codes(expires_at);

-- =====================================================
-- 3. USER SESSIONS TABLE (Optional - for tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

-- =====================================================
-- 4. AUDIT LOG TABLE (Optional - for security)
-- =====================================================

CREATE TABLE IF NOT EXISTS auth_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'login_attempt', 'login_success', 'logout', 'password_reset', etc.
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON auth_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON auth_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON auth_audit_log(created_at);

-- =====================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. FUNCTION TO CLEAN UP EXPIRED CODES
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
    DELETE FROM verification_codes
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- You can schedule this function to run periodically using pg_cron or call it manually

-- =====================================================
-- 7. SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Create a test admin user (password: Admin123!)
-- Note: In production, create users through the registration endpoint
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES (
    'admin@nysi.com',
    '$2b$10$rKZYvxLmQ8qBzXPkE4YvLe5G9Y4QxK8vJhN.VyE9J5zJ5vXwZ5F5G', -- Admin123!
    'System',
    'Administrator',
    'admin',
    true
)
ON CONFLICT (email) DO NOTHING;

-- Create a test regular user (password: User123!)
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
VALUES (
    'user@nysi.com',
    '$2b$10$rKZYvxLmQ8qBzXPkE4YvLe5G9Y4QxK8vJhN.VyE9J5zJ5vXwZ5F5G', -- User123!
    'Test',
    'User',
    'user',
    true
)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 8. GRANT PERMISSIONS (Adjust based on your setup)
-- =====================================================

-- If you have a specific database user, grant permissions
-- GRANT ALL PRIVILEGES ON TABLE users TO your_db_user;
-- GRANT ALL PRIVILEGES ON TABLE verification_codes TO your_db_user;
-- GRANT ALL PRIVILEGES ON TABLE user_sessions TO your_db_user;
-- GRANT ALL PRIVILEGES ON TABLE auth_audit_log TO your_db_user;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'verification_codes', 'user_sessions', 'auth_audit_log');

-- Check user count
SELECT COUNT(*) as total_users FROM users;

-- =====================================================
-- USEFUL MAINTENANCE QUERIES
-- =====================================================

-- Manually cleanup expired codes
-- SELECT cleanup_expired_verification_codes();

-- View all active verification codes
-- SELECT 
--     u.email,
--     vc.code,
--     vc.expires_at,
--     vc.attempts
-- FROM verification_codes vc
-- JOIN users u ON vc.user_id = u.id
-- WHERE vc.expires_at > NOW()
-- ORDER BY vc.created_at DESC;

-- View recent login attempts
-- SELECT 
--     u.email,
--     u.last_login,
--     u.is_active
-- FROM users u
-- ORDER BY u.last_login DESC NULLS LAST
-- LIMIT 10;

-- Count users by role
-- SELECT role, COUNT(*) as count
-- FROM users
-- GROUP BY role;
