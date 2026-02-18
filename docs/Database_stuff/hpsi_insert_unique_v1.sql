BEGIN;

INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form)
VALUES
  ('TUB'),
  ('SACHET'),
  ('BAR'),
  ('SLEEVE'),
  ('TUBE'),
  ('BOTTLE'),
 	('PACKET'),
 	('TABLET'),
 	('BOX'),
 	('BAG'),
 	('PACK')
ON CONFLICT (supplement_packaging_form) DO NOTHING;


INSERT INTO sss.ticket_status_lookup (ticket_status)
VALUES
  ('BOOKED'),
  ('ADJUSTED'),
  ('RETURNED'),
  ('COMPLETED')
ON CONFLICT (ticket_status) DO NOTHING;


INSERT INTO sss.webscraper_catalog_url (product_catalog_website, number_of_catalog_page)
VALUES
	('https://appliednutrition.uk/collections/best-sellers', 5)
ON CONFLICT (product_catalog_website, number_of_catalog_page) DO NOTHING;


INSERT INTO SSS.batch_stock_status_lookup (batch_stock_status)
VALUES
  ('AVAILABLE'),
  ('LOW STOCK'),
  ('OUT OF STOCK')
ON CONFLICT (batch_stock_status) DO NOTHING;


INSERT INTO SSS.supplement_status_lookup (supplement_status)
VALUES
  ('NOT BATCH TESTED'),
  ('BATCH TESTED'),
  ('DISCONTINUED')
ON CONFLICT (supplement_status) DO NOTHING;

COMMIT;

BEGIN; 
-- ========================================================
-- 2. Populate Data (Seeding)
-- ========================================================

-- Carbohydrates
INSERT INTO consultation.nutrition_diagnosis_lookup (category, diagnosis) VALUES
('CARB', 'Adequate intake of carbohydrates'),
('CARB', 'Insufficient intake of carbohydrates'),
('CARB', 'Excessive intake of carbohydrates'),
('CARB', 'Inconsistent intake of carbohydrates');

-- Protein
INSERT INTO consultation.nutrition_diagnosis_lookup (category, diagnosis) VALUES
('PROTEIN', 'Adequate intake of protein'),
('PROTEIN', 'Insufficient intake of protein'),
('PROTEIN', 'Excessive intake of protein'),
('PROTEIN', 'Inconsistent intake of protein');

-- Fat
INSERT INTO consultation.nutrition_diagnosis_lookup (category, diagnosis) VALUES
('FAT', 'Adequate intake of fat'),
('FAT', 'Insufficient intake of fat'),
('FAT', 'Excessive intake of fat');

-- Fibre
INSERT INTO consultation.nutrition_diagnosis_lookup (category, diagnosis) VALUES
('FIBRE', 'Adequate intake of fibre'),
('FIBRE', 'Low fibre intake due to lack of fruits vegetables and wholegrains');

-- Iron
INSERT INTO consultation.nutrition_diagnosis_lookup (category, diagnosis) VALUES
('IRON', 'Adequate intake of high-iron food items'),
('IRON', 'Limited intake of high-iron food items');

-- Calcium
INSERT INTO consultation.nutrition_diagnosis_lookup (category, diagnosis) VALUES
('CALCIUM', 'Adequate intake of calcium-rich foods'),
('CALCIUM', 'Insufficient intake of calcium-rich foods'),
('CALCIUM', 'Inconsistent intake of calcium-rich foods');

-- Micronutrients
INSERT INTO consultation.nutrition_diagnosis_lookup (category, diagnosis) VALUES
('MICRO', 'Adequate intake of micronutrients evident by consumption of fruits and vegetables'),
('MICRO', 'At risk of micronutrient deficiencies evident by low intake of fruits and vegetables'),
('MICRO', 'Inconsistent intake of micronutrients');
COMMIT; 