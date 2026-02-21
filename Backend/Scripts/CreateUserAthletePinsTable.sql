-- Create User_Athlete_Pins table for user-specific athlete pinning
-- This table stores which athletes each user has pinned

CREATE TABLE IF NOT EXISTS AMS.User_Athlete_Pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    athlete_id UUID NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_user_athlete_pins_user_id 
        FOREIGN KEY (user_id) REFERENCES Auth.User(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_athlete_pins_athlete_id 
        FOREIGN KEY (athlete_id) REFERENCES AMS.Athlete(id) ON DELETE CASCADE,
        
    -- Ensure one record per user-athlete pair
    CONSTRAINT uk_user_athlete_pins_user_athlete 
        UNIQUE (user_id, athlete_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_athlete_pins_user_id 
    ON AMS.User_Athlete_Pins(user_id);
    
CREATE INDEX IF NOT EXISTS idx_user_athlete_pins_athlete_id 
    ON AMS.User_Athlete_Pins(athlete_id);

-- Create index for querying pinned athletes
CREATE INDEX IF NOT EXISTS idx_user_athlete_pins_user_pinned 
    ON AMS.User_Athlete_Pins(user_id, is_pinned) WHERE is_pinned = true;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION AMS.update_user_athlete_pins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_user_athlete_pins_updated_at ON AMS.User_Athlete_Pins;
CREATE TRIGGER trigger_update_user_athlete_pins_updated_at
    BEFORE UPDATE ON AMS.User_Athlete_Pins
    FOR EACH ROW
    EXECUTE FUNCTION AMS.update_user_athlete_pins_updated_at();

-- Add comments for documentation
COMMENT ON TABLE AMS.User_Athlete_Pins IS 'Stores user-specific athlete pinning preferences';
COMMENT ON COLUMN AMS.User_Athlete_Pins.user_id IS 'Reference to the user who pinned the athlete';
COMMENT ON COLUMN AMS.User_Athlete_Pins.athlete_id IS 'Reference to the pinned athlete';
COMMENT ON COLUMN AMS.User_Athlete_Pins.is_pinned IS 'Whether the athlete is currently pinned by this user';