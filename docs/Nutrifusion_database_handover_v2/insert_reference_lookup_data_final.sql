-- ==============================================================================
-- NutriFusion Reference Data Seeding Script (AWS Handover)
-- Note: UUIDs are generated dynamically by the database default functions.
-- ==============================================================================

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);

BEGIN;

--
-- Data for Name: sport_lookup; Type: TABLE DATA; Schema: ams;
--
INSERT INTO ams.sport_lookup (sport, is_active) VALUES ('Swimming', true);
INSERT INTO ams.sport_lookup (sport, is_active) VALUES ('Track and Field', true);
INSERT INTO ams.sport_lookup (sport, is_active) VALUES ('Basketball', true);
INSERT INTO ams.sport_lookup (sport, is_active) VALUES ('Football', true);
INSERT INTO ams.sport_lookup (sport, is_active) VALUES ('Tennis', true);
INSERT INTO ams.sport_lookup (sport, is_active) VALUES ('Test NewSport', true);
INSERT INTO ams.sport_lookup (sport, is_active) VALUES ('Badminton', true);
INSERT INTO ams.sport_lookup (sport, is_active) VALUES ('Archery', true);

--
-- Data for Name: consultation_objective_lookup; Type: TABLE DATA; Schema: consultation;
--
INSERT INTO consultation.consultation_objective_lookup (consultation_objective, is_active) VALUES ('Diet Assessment', true);
INSERT INTO consultation.consultation_objective_lookup (consultation_objective, is_active) VALUES ('Body Composition (BIA/Skinfolds)', true);
INSERT INTO consultation.consultation_objective_lookup (consultation_objective, is_active) VALUES ('Supplements Planning', true);
INSERT INTO consultation.consultation_objective_lookup (consultation_objective, is_active) VALUES ('Hydration Assessment', true);
INSERT INTO consultation.consultation_objective_lookup (consultation_objective, is_active) VALUES ('Mood Assessment', true);
INSERT INTO consultation.consultation_objective_lookup (consultation_objective, is_active) VALUES ('Sleep Assessment', true);
INSERT INTO consultation.consultation_objective_lookup (consultation_objective, is_active) VALUES ('Gut Microbiome Testing', true);
INSERT INTO consultation.consultation_objective_lookup (consultation_objective, is_active) VALUES ('Blood Nutrient Assessment', true);
INSERT INTO consultation.consultation_objective_lookup (consultation_objective, is_active) VALUES ('Competition Preparation', true);

--
-- Data for Name: open_item_status_lookup; Type: TABLE DATA; Schema: consultation;
--
INSERT INTO consultation.open_item_status_lookup (open_item_status, is_active) VALUES ('In Progress', true);
INSERT INTO consultation.open_item_status_lookup (open_item_status, is_active) VALUES ('Completed', true);
INSERT INTO consultation.open_item_status_lookup (open_item_status, is_active) VALUES ('Pending', false);

--
-- Data for Name: type_of_consult_lookup; Type: TABLE DATA; Schema: consultation;
--
INSERT INTO consultation.type_of_consult_lookup (type_of_consult, is_active) VALUES ('Initial Consultation', true);
INSERT INTO consultation.type_of_consult_lookup (type_of_consult, is_active) VALUES ('Follow-up Consultation', true);

--
-- Data for Name: batch_stock_status_lookup; Type: TABLE DATA; Schema: sss;
--
INSERT INTO sss.batch_stock_status_lookup (batch_stock_status, is_active) VALUES ('AVAILABLE', true);
INSERT INTO sss.batch_stock_status_lookup (batch_stock_status, is_active) VALUES ('LOW STOCK', true);
INSERT INTO sss.batch_stock_status_lookup (batch_stock_status, is_active) VALUES ('OUT OF STOCK', true);

--
-- Data for Name: batch_testing_org_lookup; Type: TABLE DATA; Schema: sss;
--
INSERT INTO sss.batch_testing_org_lookup (batch_testing_org, is_active) VALUES ('Informed Sport', true);
INSERT INTO sss.batch_testing_org_lookup (batch_testing_org, is_active) VALUES ('Informed Choice', true);
INSERT INTO sss.batch_testing_org_lookup (batch_testing_org, is_active) VALUES ('NSF Sport', true);
INSERT INTO sss.batch_testing_org_lookup (batch_testing_org, is_active) VALUES ('HASTA', true);
INSERT INTO sss.batch_testing_org_lookup (batch_testing_org, is_active) VALUES ('Cologne List', true);
INSERT INTO sss.batch_testing_org_lookup (batch_testing_org, is_active) VALUES ('BSCG', true);

--
-- Data for Name: supplement_packaging_form_lookup; Type: TABLE DATA; Schema: sss;
--
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('TUB', true);
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('SACHET', true);
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('BAR', true);
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('SLEEVE', true);
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('TUBE', true);
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('BOTTLE', true);
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('PACKET', true);
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('TABLET', true);
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('BOX', true);
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('BAG', true);
INSERT INTO sss.supplement_packaging_form_lookup (supplement_packaging_form, is_active) VALUES ('PACK', true);

--
-- Data for Name: supplement_status_lookup; Type: TABLE DATA; Schema: sss;
--
INSERT INTO sss.supplement_status_lookup (supplement_status, is_active) VALUES ('NOT BATCH TESTED', true);
INSERT INTO sss.supplement_status_lookup (supplement_status, is_active) VALUES ('BATCH TESTED', true);
INSERT INTO sss.supplement_status_lookup (supplement_status, is_active) VALUES ('DISCONTINUED', true);

--
-- Data for Name: ticket_status_lookup; Type: TABLE DATA; Schema: sss;
--
INSERT INTO sss.ticket_status_lookup (ticket_status, is_active) VALUES ('BOOKED', true);
INSERT INTO sss.ticket_status_lookup (ticket_status, is_active) VALUES ('ADJUSTED', true);
INSERT INTO sss.ticket_status_lookup (ticket_status, is_active) VALUES ('RETURNED', true);
INSERT INTO sss.ticket_status_lookup (ticket_status, is_active) VALUES ('COMPLETED', true);

--
-- Data for Name: webscraper_catalog_url; Type: TABLE DATA; Schema: sss;
--
INSERT INTO sss.webscraper_catalog_url (product_catalog_website, number_of_catalog_page, is_active) VALUES ('https://appliednutrition.uk/collections/best-sellers', NULL, true);
INSERT INTO sss.webscraper_catalog_url (product_catalog_website, number_of_catalog_page, is_active) VALUES ('https://www.healthspanelite.co.uk/protein/', 1, true);

COMMIT;