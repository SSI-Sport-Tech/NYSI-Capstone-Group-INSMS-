--
-- PostgreSQL database dump
--

\restrict nQQFUOHQ5CWlB72NudCS7jlGqACOmInwWCBOTXfKW1Dvd3LBWKoGsxcCwgnDAGc

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.8 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: sport_lookup; Type: TABLE DATA; Schema: ams; Owner: -
--

INSERT INTO ams.sport_lookup (id, sport, is_active) VALUES ('019c2e87-3623-757e-97d3-adb4a80209a5', 'Swimming', true);
INSERT INTO ams.sport_lookup (id, sport, is_active) VALUES ('019c2e87-3624-7140-9030-9f94e8f34b6d', 'Track and Field', true);
INSERT INTO ams.sport_lookup (id, sport, is_active) VALUES ('019c2e87-3624-7be1-bb48-a1ac5ea969b7', 'Basketball', true);
INSERT INTO ams.sport_lookup (id, sport, is_active) VALUES ('019c2e87-3624-7988-a82f-8d65b8dd49a6', 'Football', true);
INSERT INTO ams.sport_lookup (id, sport, is_active) VALUES ('019c7731-2b0f-7239-bf34-bf6e03c7d476', 'Tennis', true);
INSERT INTO ams.sport_lookup (id, sport, is_active) VALUES ('019c843a-d547-7fbb-bb2f-c2f56a19836e', 'Test NewSport', true);
INSERT INTO ams.sport_lookup (id, sport, is_active) VALUES ('019c2e87-361e-7ea7-bf39-3baf4012bc4d', 'Badminton', true);
INSERT INTO ams.sport_lookup (id, sport, is_active) VALUES ('019cb68c-1ef0-73b8-9746-a6a94e5df800', 'Archery', true);


--
-- Data for Name: consultation_objective_lookup; Type: TABLE DATA; Schema: consultation; Owner: -
--

INSERT INTO consultation.consultation_objective_lookup (id, consultation_objective, is_active) VALUES ('019d2d27-ee08-7c06-9b30-f53d20c27e31', 'Diet Assessment', true);
INSERT INTO consultation.consultation_objective_lookup (id, consultation_objective, is_active) VALUES ('019d2d27-ee12-79d3-a550-287edf3afb9e', 'Body Composition (BIA/Skinfolds)', true);
INSERT INTO consultation.consultation_objective_lookup (id, consultation_objective, is_active) VALUES ('019d2d27-ee13-7c67-8e32-5fda47bb8cb0', 'Supplements Planning', true);
INSERT INTO consultation.consultation_objective_lookup (id, consultation_objective, is_active) VALUES ('019d2d27-ee13-722b-9443-9391019f687c', 'Hydration Assessment', true);
INSERT INTO consultation.consultation_objective_lookup (id, consultation_objective, is_active) VALUES ('019d2d27-ee13-77c3-879a-d3184b2da3aa', 'Mood Assessment', true);
INSERT INTO consultation.consultation_objective_lookup (id, consultation_objective, is_active) VALUES ('019d2d27-ee13-76ae-8c09-8dd8003d31bf', 'Sleep Assessment', true);
INSERT INTO consultation.consultation_objective_lookup (id, consultation_objective, is_active) VALUES ('019d2d27-ee13-7880-a556-859542a63964', 'Gut Microbiome Testing', true);
INSERT INTO consultation.consultation_objective_lookup (id, consultation_objective, is_active) VALUES ('019d2d27-ee13-7b9b-ad8b-6b026f460bdf', 'Blood Nutrient Assessment', true);
INSERT INTO consultation.consultation_objective_lookup (id, consultation_objective, is_active) VALUES ('019d2d27-ee13-7b57-91b7-85bee114484e', 'Competition Preparation', true);


--
-- Data for Name: open_item_status_lookup; Type: TABLE DATA; Schema: consultation; Owner: -
--

INSERT INTO consultation.open_item_status_lookup (id, open_item_status, is_active) VALUES ('019c765b-583a-7932-855b-5314c39aa72d', 'In Progress', true);
INSERT INTO consultation.open_item_status_lookup (id, open_item_status, is_active) VALUES ('019c765b-583f-7e35-962c-67e15a718874', 'Completed', true);
INSERT INTO consultation.open_item_status_lookup (id, open_item_status, is_active) VALUES ('00000000-0000-0000-0000-000000000005', 'Pending', false);


--
-- Data for Name: type_of_consult_lookup; Type: TABLE DATA; Schema: consultation; Owner: -
--

INSERT INTO consultation.type_of_consult_lookup (id, type_of_consult, is_active) VALUES ('019c4ae3-7dfe-7bc7-9b89-5ec3c6869485', 'Initial Consultation', true);
INSERT INTO consultation.type_of_consult_lookup (id, type_of_consult, is_active) VALUES ('019c4ae3-c5b0-7e31-87fe-c5faa3fcc1c6', 'Follow-up Consultation', true);


--
-- Data for Name: batch_stock_status_lookup; Type: TABLE DATA; Schema: sss; Owner: -
--

INSERT INTO sss.batch_stock_status_lookup (id, batch_stock_status, is_active) VALUES ('62a76ec5-8ba5-4e82-8081-b9c1acf33e9d', 'AVAILABLE', true);
INSERT INTO sss.batch_stock_status_lookup (id, batch_stock_status, is_active) VALUES ('c0356ae7-887c-47ff-9042-0a71dd1d9b05', 'LOW STOCK', true);
INSERT INTO sss.batch_stock_status_lookup (id, batch_stock_status, is_active) VALUES ('dfbc6ee8-d8e7-4bde-bf90-1c98944700c9', 'OUT OF STOCK', true);


--
-- Data for Name: batch_testing_org_lookup; Type: TABLE DATA; Schema: sss; Owner: -
--

INSERT INTO sss.batch_testing_org_lookup (id, batch_testing_org, is_active) VALUES ('019ceacc-6fa1-7090-80b6-e2ed78797554', 'Informed Sport', true);
INSERT INTO sss.batch_testing_org_lookup (id, batch_testing_org, is_active) VALUES ('019ceacc-6faa-7af8-af17-b1296ba8f481', 'Informed Choice', true);
INSERT INTO sss.batch_testing_org_lookup (id, batch_testing_org, is_active) VALUES ('019ceacc-6fab-7232-b5b0-f39089b92f08', 'NSF Sport', true);
INSERT INTO sss.batch_testing_org_lookup (id, batch_testing_org, is_active) VALUES ('019ceacc-6fab-7ec8-bbd2-805f1cc52152', 'HASTA', true);
INSERT INTO sss.batch_testing_org_lookup (id, batch_testing_org, is_active) VALUES ('019ceacc-6fab-72aa-b7bd-84221e399597', 'Cologne List', true);
INSERT INTO sss.batch_testing_org_lookup (id, batch_testing_org, is_active) VALUES ('019ceacc-6fab-7aae-ba8e-af18abdc9ce2', 'BSCG', true);


--
-- Data for Name: supplement_packaging_form_lookup; Type: TABLE DATA; Schema: sss; Owner: -
--

INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('6f7ae3f3-b451-4696-b4ca-8217e948f7a8', 'TUB', true);
INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('92ed0e40-b010-44e8-8ab0-1435b7ce49a1', 'SACHET', true);
INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('382749cb-383b-4949-b46c-c815ca2ebc73', 'BAR', true);
INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('c4510224-5e6f-4280-b00a-96db069dc3ae', 'SLEEVE', true);
INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('6e7866b7-c3a6-403a-acfe-a3fabd64af5d', 'TUBE', true);
INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('607b0fac-9720-4f54-9592-1e19d8e5776a', 'BOTTLE', true);
INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('b7e1a8b8-e26d-478f-93e0-0424f00a7919', 'PACKET', true);
INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('c39d8a4c-3e50-4f70-accd-fcbd1a6f12d0', 'TABLET', true);
INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('637d71cf-2992-4c11-b654-8f199f716df7', 'BOX', true);
INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('8ae2dc3e-141f-4ad8-bea0-5d14451beaf0', 'BAG', true);
INSERT INTO sss.supplement_packaging_form_lookup (id, supplement_packaging_form, is_active) VALUES ('257044dd-16eb-4c23-a676-abbfbc54ac7b', 'PACK', true);


--
-- Data for Name: supplement_status_lookup; Type: TABLE DATA; Schema: sss; Owner: -
--

INSERT INTO sss.supplement_status_lookup (id, supplement_status, is_active) VALUES ('9b6fb269-6dc0-4843-ad42-9aeeae8d5d7d', 'NOT BATCH TESTED', true);
INSERT INTO sss.supplement_status_lookup (id, supplement_status, is_active) VALUES ('9f3c014d-79e3-4454-b78b-3bde2e22889d', 'BATCH TESTED', true);
INSERT INTO sss.supplement_status_lookup (id, supplement_status, is_active) VALUES ('28a9cdcc-19ef-4961-8479-9cc7abbc2065', 'DISCONTINUED', true);


--
-- Data for Name: ticket_status_lookup; Type: TABLE DATA; Schema: sss; Owner: -
--

INSERT INTO sss.ticket_status_lookup (id, ticket_status, is_active) VALUES ('c51f8a2c-63f0-475b-ae57-a80c229873a1', 'BOOKED', true);
INSERT INTO sss.ticket_status_lookup (id, ticket_status, is_active) VALUES ('4da5d84b-a644-4494-97fb-fd9b2e7b0500', 'ADJUSTED', true);
INSERT INTO sss.ticket_status_lookup (id, ticket_status, is_active) VALUES ('0514d39c-99ae-44a0-a267-aa825dddf8f4', 'RETURNED', true);
INSERT INTO sss.ticket_status_lookup (id, ticket_status, is_active) VALUES ('598816c6-6098-4d79-a31d-dc27f625541b', 'COMPLETED', true);


--
-- Data for Name: webscraper_catalog_url; Type: TABLE DATA; Schema: sss; Owner: -
--

INSERT INTO sss.webscraper_catalog_url (id, product_catalog_website, number_of_catalog_page, is_active) VALUES ('019c4b01-6703-77f2-b3d5-6fee27747b1e', 'https://appliednutrition.uk/collections/best-sellers', NULL, true);
INSERT INTO sss.webscraper_catalog_url (id, product_catalog_website, number_of_catalog_page, is_active) VALUES ('ef506179-99cc-41f7-90c9-4e3d70378d27', 'https://www.healthspanelite.co.uk/protein/', 1, true);


--
-- PostgreSQL database dump complete
--

\unrestrict nQQFUOHQ5CWlB72NudCS7jlGqACOmInwWCBOTXfKW1Dvd3LBWKoGsxcCwgnDAGc

