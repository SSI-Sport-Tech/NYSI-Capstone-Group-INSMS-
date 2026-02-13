BEGIN;

-- 1. Prevent Duplicate Webscraper Pages
ALTER TABLE sss.webscraper_catalog_url
ADD CONSTRAINT uq_webscraper_catalog_url
UNIQUE (product_catalog_website, number_of_catalog_page);

-- 2. Prevent Duplicate Coach Mappings
ALTER TABLE ams.coach_athlete_mapping
ADD CONSTRAINT uq_coach_athlete_map 
UNIQUE (athlete_id, coach_id);

-- 3. Prevent Duplicate Nutritionist Mappings 
ALTER TABLE ams.nutritionist_athlete_mapping
ADD CONSTRAINT uq_nutritionist_athlete_map
UNIQUE (athlete_id, nutritionist_id);

COMMIT;