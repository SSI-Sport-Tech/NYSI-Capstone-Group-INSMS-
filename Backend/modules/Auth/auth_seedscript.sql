BEGIN;

-- =================================================================
-- USER 1: THE IT ADMIN (You)
-- Role: IT_ADMIN (Access to everything, no AMS profile needed)
-- =================================================================
INSERT INTO auth.users (
    email, 
    password_hash, 
    role, 
    first_name, 
    last_name, 
    is_email_verified
)
VALUES (
    'tech@nysi.org.sg', 
    crypt('Password123!', gen_salt('bf')), -- Generates valid Bcrypt hash
    'IT_ADMIN', 
    'System', 
    'Admin', 
    TRUE
);

-- =================================================================
-- USER 2: SENIOR NUTRITIONIST (The Boss)
-- Role: ADMIN (Can approve supplements)
-- Action: Creates Auth User -> Creates AMS Profile -> Links them
-- =================================================================
DO $$
DECLARE
    new_user_id UUID;
BEGIN
    -- A. Create Auth User
    INSERT INTO auth.users (email, password_hash, role, first_name, last_name, is_email_verified)
    VALUES ('senior@nysi.org.sg', crypt('Password123!', gen_salt('bf')), 'ADMIN', 'Sarah', 'Tan', TRUE)
    RETURNING id INTO new_user_id;

    -- B. Create AMS Profile & Link
    INSERT INTO ams.nutritionist (name, user_id)
    VALUES ('Sarah Tan (Senior)', new_user_id);
END $$;

-- =================================================================
-- USER 3: JUNIOR NUTRITIONIST (The Worker)
-- Role: NUTRITIONIST (Consultations only)
-- Action: Creates Auth User -> Creates AMS Profile -> Links them
-- =================================================================
DO $$
DECLARE
    new_user_id UUID;
BEGIN
    -- A. Create Auth User
    INSERT INTO auth.users (email, password_hash, role, first_name, last_name, is_email_verified)
    VALUES ('junior@nysi.org.sg', crypt('Password123!', gen_salt('bf')), 'NUTRITIONIST', 'James', 'Lee', TRUE)
    RETURNING id INTO new_user_id;

    -- B. Create AMS Profile & Link
    INSERT INTO ams.nutritionist (name, user_id)
    VALUES ('James Lee (Junior)', new_user_id);
END $$;

COMMIT;


SELECT 
    u.email, 
    u.role, 
    n.name AS nutritionist_profile_name 
FROM auth.users u
LEFT JOIN ams.nutritionist n ON u.id = n.user_id;