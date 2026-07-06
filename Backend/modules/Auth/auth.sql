BEGIN;

-- ========================================================
-- 1. SETUP SCHEMA
-- ========================================================

CREATE SCHEMA IF NOT EXISTS auth;

-- ========================================================
-- 2. THE MAIN USERS TABLE (Scoped for Phase 1)
-- ========================================================

CREATE TABLE auth.users (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- UPDATED ROLES:
    -- 'IT_ADMIN': The Tech Team (Full DB Access)
    -- 'ADMIN': The Senior Nutritionist (Can approve supplements, manage team)
    -- 'NUTRITIONIST': The Standard User (Consultations only)
    -- 'COACH' / 'ATHLETE': Phase 2 (Included now to prevent migrations later)
    role VARCHAR(50) NOT NULL CHECK (role IN ('IT_ADMIN', 'ADMIN', 'NUTRITIONIST', 'COACH', 'ATHLETE')),
    
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    
    is_active BOOLEAN DEFAULT TRUE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_email ON auth.users(email);
CREATE INDEX idx_users_role ON auth.users(role);

-- ========================================================
-- 3. 2FA VERIFICATION CODES
-- ========================================================

CREATE TABLE auth.verification_codes (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id UUID NOT NULL,
    
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL CHECK (purpose IN ('LOGIN_2FA', 'PASSWORD_RESET', 'EMAIL_VERIFY')),
    
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT fk_codes_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_codes_user_purpose ON auth.verification_codes(user_id, purpose);

-- ========================================================
-- 4. USER SESSIONS
-- ========================================================

CREATE TABLE auth.user_sessions (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v7(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ========================================================
-- 5. LINKING AUTH TO AMS (The Bridge)
-- ========================================================

-- A. LINK NUTRITIONISTS (Immediate Priority)
-- This allows Senior/Junior nutritionists to log in.
ALTER TABLE ams.nutritionist 
ADD COLUMN user_id UUID UNIQUE, 
ADD CONSTRAINT fk_nutritionist_user FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- B. LINK ATHLETES & COACHES (Future Proofing)
-- We create the columns now so the schema is stable, but we leave them NULL for now.
ALTER TABLE ams.athlete 
ADD COLUMN user_id UUID UNIQUE, 
ADD CONSTRAINT fk_athlete_user FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE ams.coach 
ADD COLUMN user_id UUID UNIQUE, 
ADD CONSTRAINT fk_coach_user FOREIGN KEY (user_id) REFERENCES auth.users(id);

-- ========================================================
-- 6. AUDIT TRIGGERS
-- ========================================================

CREATE TRIGGER audit_auth_users_changes
AFTER INSERT OR UPDATE OR DELETE ON auth.users
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

CREATE TRIGGER audit_verification_codes_changes
AFTER INSERT OR UPDATE OR DELETE ON auth.verification_codes
FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_func();

COMMIT;