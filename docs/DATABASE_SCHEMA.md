# NYSI Database Schema - Complete Reference

**Database:** PostgreSQL 14+  
**Last Updated:** January 20, 2026  
**Version:** 2.0  
**Status:** Production Schema - Phase 1 Complete

---

## Quick Reference

### Connection Details
```javascript
Host: localhost (development)
Port: 5432
Database: nysi_db
Schema: SSS (Supplement Support System)
```

### Key UUIDs
```javascript
// Supplement Status
BATCH_TESTED:     '9f3c014d-79e3-4454-b78b-3bde2e22889d'
NOT_BATCH_TESTED: '9b6fb269-6dc0-4843-ad42-9aeeae8d5d7d'
DISCONTINUED:     '28a9cdcc-19ef-4961-8479-9cc7abbc2065'

// Packaging Forms
BOTTLE: '607b0fac-9720-4f54-9592-1e19d8e5776a'
TABLET: 'c39d8a4c-3e50-4f70-accd-fcbd1a6f12d0'
TUB:    '6f7ae3f3-b451-4696-b4ca-8217e948f7a8'
BAR:    '382749cb-383b-4949-b46c-c815ca2ebc73'

// System User
DR_KHOO: 'e9e9f927-40f4-4f0a-bdca-a5503b5974da'
```

---

## Table of Contents
1. [Schema Overview](#schema-overview)
2. [Core Tables](#core-tables)
3. [Lookup Tables](#lookup-tables)
4. [Relationships](#relationships)
5. [Data Types Reference](#data-types-reference)
6. [Business Rules](#business-rules)
7. [Query Patterns](#query-patterns)

---

## Schema Overview

### Database Structure

```
nysi_db/
├── SSS (Schema)
│   ├── Supplement                            # Main product catalog
│   ├── Supplement_Staging                    # Web scraper staging area
│   ├── Inventory_Batch                       # Batch/lot tracking
│   ├── Inventory_Ticket                      # Supplement allocations
│   ├── Supplement_Packaging_Form_Lookup      # Packaging types
│   ├── Supplement_Status_Lookup              # Batch testing status
│   ├── Batch_Stock_Status_Lookup             # Inventory status
│   └── Ticket_Status_Lookup                  # Ticket status
│
└── audit (Schema)
    └── audit_log                             # Change tracking
```

### Schema Purpose
- **SSS:** Supplement Support System - all supplement and inventory data
- **audit:** Centralized audit trail for compliance

---

## Core Tables

### SSS.Supplement

**Purpose:** Main supplement product catalog (production data)

**Table Definition:**
```sql
CREATE TABLE SSS.Supplement (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplement_packaging_form_id UUID NOT NULL,
    supplement_input_type TEXT,
    supplement_name TEXT,
    supplement_brand TEXT,
    supplement_description TEXT,
    supplement_ingredient JSONB,  -- Array of ingredient names
    nutritional_info_per_100g JSONB,  -- Nutritional data object
    nutritional_info_per_serving JSONB,  -- Nutritional data object
    nutritional_info_per_serving_definition TEXT,
    supplement_warning_label TEXT,
    supplement_certifications TEXT,
    supplement_additional_information TEXT,
    batch_testing_org TEXT,
    product_source_url TEXT[],  -- Array of URLs
    scraper_version TEXT,
    supplement_status_id UUID NOT NULL,
    approved_by UUID NOT NULL,  -- References user table (future)
    vector_100g_ingredient vector,  -- For similarity search (pgvector)
    vector_perserving_ingredient vector,
    
    FOREIGN KEY (supplement_packaging_form_id) 
        REFERENCES SSS.Supplement_Packaging_Form_Lookup(id),
    FOREIGN KEY (supplement_status_id) 
        REFERENCES SSS.Supplement_Status_Lookup(id),
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key (auto-generated) |
| `supplement_packaging_form_id` | UUID | No | FK to packaging form lookup |
| `supplement_input_type` | TEXT | Yes | "Manual" or "Web Scraper" |
| `supplement_name` | TEXT | Yes | Product name (e.g., "Vitamin D3 2000 IU") |
| `supplement_brand` | TEXT | Yes | Brand/manufacturer |
| `supplement_description` | TEXT | Yes | Detailed product description |
| `supplement_ingredient` | JSONB | Yes | Array: `["Vitamin D3", "MCT Oil"]` |
| `nutritional_info_per_100g` | JSONB | Yes | Object: `{"protein": "10g", "fat": "5g"}` |
| `nutritional_info_per_serving` | JSONB | Yes | Object: `{"vitamin_d": "2000 IU"}` |
| `nutritional_info_per_serving_definition` | TEXT | Yes | Serving size: "1 softgel" |
| `supplement_warning_label` | TEXT | Yes | Safety warnings |
| `supplement_certifications` | TEXT | Yes | Quality certifications |
| `supplement_additional_information` | TEXT | Yes | Additional notes |
| `batch_testing_org` | TEXT | Yes | Testing org or "NIL" |
| `product_source_url` | TEXT[] | Yes | Array of product URLs |
| `scraper_version` | TEXT | Yes | Web scraper version used |
| `supplement_status_id` | UUID | No | FK to status lookup |
| `approved_by` | UUID | No | User who approved (hardcoded for now) |
| `vector_100g_ingredient` | vector(384) | Embedding of ingredients + per-100g nutrition |
| `vector_perserving_ingredient` | vector(384) | Embedding of ingredients + per-serving nutrition |

**Embedding Model:** BAAI/bge-small-en-v1.5 (384-dimensional)

**What's Included in Vectors:**
```python
# Combined data for vectorization
{
    "ingredients": ["Vitamin D3", "MCT Oil"],
    "nutrients": [
        {"name": "Vitamin D", "amount": "2000IU", "daily_value": "500%"},
        {"name": "Total Fat", "amount": "1g", "daily_value": "1%"}
    ]
    # Note: Calories NOT included (often incidental to formulation)
}
```

**Generation:**
- Vectors generated by Python FastAPI service (port 8001)
- Node.js backend calls `/api/vectorization/generate`
- Stored as PostgreSQL vector(384) type
- Used for cosine similarity search

**Indexes:**
```sql
-- IVFFlat index for fast similarity search
CREATE INDEX idx_supplement_vector_100g 
ON SSS.Supplement 
USING ivfflat (vector_100g_ingredient vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX idx_supplement_vector_serving 
ON SSS.Supplement 
USING ivfflat (vector_perserving_ingredient vector_cosine_ops)
WITH (lists = 100);
```

**Similarity Query Example:**
```sql
-- Find top 5 similar supplements
SELECT 
    id,
    supplement_name,
    supplement_brand,
    1 - (vector_100g_ingredient <=> $1::vector) AS similarity
FROM SSS.Supplement
WHERE vector_100g_ingredient IS NOT NULL
ORDER BY vector_100g_ingredient <=> $1::vector
LIMIT 5;

-- $1 = query vector (384-dimensional array)
```

**Important Notes:**
- ⚠️ Vectors can be NULL (supplements created before vectorization feature)
- ✅ Regenerate vectors when ingredients or nutrition updated
- ✅ Use per_100g as primary (more standardized than per_serving)
- ✅ Fallback to per_serving if per_100g unavailable

**Business Rules:**
1. **batch_testing_org Logic:**
   - If `supplement_status_id` = BATCH_TESTED → batch_testing_org REQUIRED
   - If `supplement_status_id` = NOT_BATCH_TESTED → batch_testing_org = "NIL" (auto-set)
   - If `supplement_status_id` = DISCONTINUED → batch_testing_org keeps value

2. **Duplicate Prevention:**
   - Check for existing supplement with same `supplement_name` + `supplement_brand` (case-insensitive)

3. **Auto-Set Fields:**
   - `id` = gen_random_uuid()
   - `approved_by` = 'e9e9f927-40f4-4f0a-bdca-a5503b5974da' (system user)
   - `supplement_input_type` = 'Manual' (for manual entries)

**Important Notes:**
- ✅ **Use this table for all user-facing operations**
- ⚠️ **Never use Supplement_Staging for queries**
- Field name is `product_source_url`, NOT `supplement_website`

---

### SSS.Supplement_Staging

**Purpose:** Temporary storage for web scraper data before approval

**Status:** ⚠️ NOT USED for manual entries

**When Used:**
- Web scraper deposits new supplement data here
- Admin reviews and approves
- Approved data copied to SSS.Supplement
- Maintains link via `promoted_to_supplement_id` on the staging record

**Note:** Skip this table for normal operations. Only relevant for web scraping workflow.

---

### SSS.Inventory_Batch

**Purpose:** Track supplement batches/lots with expiration and stock levels

**Table Definition:**
```sql
CREATE TABLE SSS.Inventory_Batch (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplement_id UUID NOT NULL,
    batch_stock_status_id UUID NOT NULL,
    batch_number VARCHAR(100),
    batch_initial_quantity INTEGER,
    batch_price NUMERIC(10,2),
    batch_expiration_date DATE,
    batch_manufacture_date DATE,
    
    FOREIGN KEY (supplement_id) 
        REFERENCES SSS.Supplement(id),
    FOREIGN KEY (batch_stock_status_id) 
        REFERENCES SSS.Batch_Stock_Status_Lookup(id)
);
```

**Column Details:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `supplement_id` | UUID | FK to Supplement |
| `batch_stock_status_id` | UUID | FK to status lookup |
| `batch_number` | VARCHAR(100) | Unique batch/lot number |
| `batch_initial_quantity` | INTEGER | Starting quantity |
| `batch_price` | NUMERIC(10,2) | Price per unit |
| `batch_expiration_date` | DATE | Expiration date |
| `batch_manufacture_date` | DATE | Manufacturing date |

**Calculated Fields (Not Stored):**
```sql
-- Booked quantity (sum of all tickets)
booked = SUM(Inventory_Ticket.quantity) WHERE inventory_batch_id = batch.id

-- Available quantity
available = batch_initial_quantity - booked
```

**Query Pattern:**
```sql
SELECT 
    ib.*,
    s.supplement_name,
    s.supplement_brand,
    COALESCE(SUM(it.quantity), 0) AS booked,
    ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) AS available,
    bssl.batch_stock_status
FROM SSS.Inventory_Batch ib
INNER JOIN SSS.Supplement s ON ib.supplement_id = s.id
LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.inventory_batch_id
LEFT JOIN SSS.Batch_Stock_Status_Lookup bssl 
    ON ib.batch_stock_status_id = bssl.id
GROUP BY ib.id, s.supplement_name, s.supplement_brand, bssl.batch_stock_status;
```

---

### SSS.Inventory_Ticket

**Purpose:** Track supplement allocations/bookings to athletes

**Table Definition:**
```sql
CREATE TABLE SSS.Inventory_Ticket (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_batch_id UUID NOT NULL,
    athlete_id UUID NOT NULL,
    ticket_status_id UUID NOT NULL,
    quantity SMALLINT CHECK (quantity > 0),
    
    FOREIGN KEY (inventory_batch_id) 
        REFERENCES SSS.Inventory_Batch(id),
    FOREIGN KEY (ticket_status_id) 
        REFERENCES SSS.Ticket_Status_Lookup(id)
);
```

**Column Details:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `inventory_batch_id` | UUID | FK to batch |
| `athlete_id` | UUID | FK to athlete (AMS module) |
| `ticket_status_id` | UUID | FK to ticket status lookup |
| `quantity` | SMALLINT | Quantity allocated (must be > 0) |

**Current Assumption:**
- ALL tickets counted regardless of status
- No filtering by ticket_status_id (yet)
- Future: May need to exclude "Cancelled" tickets

---

## Lookup Tables

### SSS.Supplement_Packaging_Form_Lookup

**Purpose:** Define available packaging forms (bottle, tablet, etc.)

**Table Definition:**
```sql
CREATE TABLE SSS.Supplement_Packaging_Form_Lookup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplement_packaging_form TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);
```

**Current Values:**
```sql
INSERT INTO SSS.Supplement_Packaging_Form_Lookup (id, supplement_packaging_form, is_active)
VALUES 
    ('607b0fac-9720-4f54-9592-1e19d8e5776a', 'BOTTLE', true),
    ('c39d8a4c-3e50-4f70-accd-fcbd1a6f12d0', 'TABLET', true),
    ('6f7ae3f3-b451-4696-b4ca-8217e948f7a8', 'TUB', true),
    ('382749cb-383b-4949-b46c-c815ca2ebc73', 'BAR', true),
    ('92ed0e40-b010-44e8-8ab0-1435b7ce49a1', 'SACHET', true),
    ('b7e1a8b8-e26d-478f-93e0-0424f00a7919', 'PACKET', true),
    ('637d71cf-2992-4c11-b654-8f199f716df7', 'BOX', true),
    ('8ae2dc3e-141f-4ad8-bea0-5d14451beaf0', 'BAG', true),
    ('257044dd-16eb-4c23-a676-abbfbc54ac7b', 'PACK', true),
    ('c4510224-5e6f-4280-b00a-96db069dc3ae', 'SLEEVE', true),
    ('6e7866b7-c3a6-403a-acfe-a3fabd64af5d', 'TUBE', true);
```

**Soft Delete:** Use `is_active = false` instead of DELETE

---

### SSS.Supplement_Status_Lookup

**Purpose:** Define supplement batch testing status

**Table Definition:**
```sql
CREATE TABLE SSS.Supplement_Status_Lookup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplement_status TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);
```

**Current Values:**
```sql
INSERT INTO SSS.Supplement_Status_Lookup (id, supplement_status, is_active)
VALUES 
    ('9f3c014d-79e3-4454-b78b-3bde2e22889d', 'BATCH TESTED', true),
    ('9b6fb269-6dc0-4843-ad42-9aeeae8d5d7d', 'NOT BATCH TESTED', true),
    ('28a9cdcc-19ef-4961-8479-9cc7abbc2065', 'DISCONTINUED', true);
```

**Business Logic Impact:** See batch_testing_org rules in Supplement table

---

### SSS.Batch_Stock_Status_Lookup

**Purpose:** Define batch inventory status

**Example Values:**
- "Approved" - Tested and ready for use
- "Pending" - Awaiting testing
- "Quarantined" - Quality issues
- "Expired" - Past expiration date

**Note:** Status is STORED in database, not calculated

---

### SSS.Ticket_Status_Lookup

**Purpose:** Define ticket/allocation status

**Example Values:**
- "Confirmed"
- "Pending"
- "Cancelled"
- "Fulfilled"

---

### audit.audit_log

**Purpose:** Centralized audit trail for all table changes

**Table Definition:**
```sql
CREATE TABLE audit.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    record_id UUID,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,  -- INSERT, UPDATE, DELETE
    new_values JSONB,
    old_values JSONB,
    changed_on TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Implementation:** Database triggers or application code

---

## Relationships

### Entity Relationship Diagram

```
┌────────────────────────────────────────┐
│  Supplement_Packaging_Form_Lookup      │
│  - id (PK)                             │
│  - supplement_packaging_form           │
│  - is_active                           │
└────────────┬───────────────────────────┘
             │ 1
             │
             │ M
┌────────────▼───────────────────────────┐
│  Supplement                            │
│  - id (PK)                             │
│  - supplement_packaging_form_id (FK)   │◄─────┐
│  - supplement_status_id (FK)           │      │
│  - supplement_name                     │      │
│  - supplement_brand                    │      │
│  - ...                                 │      │
└────────────┬───────────────────────────┘      │
             │ 1                                 │
             │                                   │
             │ M                                 │
┌────────────▼───────────────────────────┐      │
│  Inventory_Batch                       │      │
│  - id (PK)                             │      │
│  - supplement_id (FK)                  │      │
│  - batch_stock_status_id (FK)          │      │
│  - batch_number                        │      │
│  - batch_initial_quantity              │      │
│  - ...                                 │      │
└────────────┬───────────────────────────┘      │
             │ 1                                 │
             │                                   │
             │ M                                 │
┌────────────▼───────────────────────────┐      │
│  Inventory_Ticket                      │      │
│  - id (PK)                             │      │
│  - inventory_batch_id (FK)             │      │
│  - athlete_id (FK)                     │      │
│  - ticket_status_id (FK)               │      │
│  - quantity                            │      │
└────────────────────────────────────────┘      │
                                                 │
┌────────────────────────────────────────┐      │
│  Supplement_Status_Lookup              │      │
│  - id (PK)                             │      │
│  - supplement_status                   │      │
│  - is_active                           │      │
└────────────────────────────────────────┘      │
             │                                   │
             └───────────────────────────────────┘
```

**Key Relationships:**
- One supplement → Many batches (1:M)
- One batch → Many tickets (1:M)
- One packaging form → Many supplements (1:M)
- One status → Many supplements (1:M)

---

## Data Types Reference

### PostgreSQL Types Used

| Type | Usage | Example | Node.js Handling |
|------|-------|---------|------------------|
| `UUID` | Primary keys, FKs | `a1b2c3d4-...` | String |
| `TEXT` | Variable text | `"Vitamin D3"` | String |
| `VARCHAR(n)` | Limited text | `"BATCH-001"` | String |
| `JSONB` | JSON documents | `["item1", "item2"]` | Object/Array (with JSON.stringify) |
| `TEXT[]` | Array of text | `{"url1", "url2"}` | Array (native pg conversion) |
| `INTEGER` | Whole numbers | `100` | Number |
| `SMALLINT` | Small integers | `10` | Number |
| `NUMERIC(10,2)` | Decimal numbers | `29.99` | String (to avoid precision loss) |
| `DATE` | Date only | `2026-12-31` | String (ISO format) |
| `TIMESTAMP` | Date + time | `2026-01-20 14:30:00` | Date object |
| `BOOLEAN` | True/false | `true` | Boolean |
| `vector` | ML embeddings | `[0.1, 0.2, ...]` | Array (pgvector) |

### JSONB vs TEXT[] Handling

**JSONB (requires JSON.stringify):**
```javascript
// Insert
const values = [
    JSON.stringify(["Vitamin D3", "MCT Oil"]),  // supplement_ingredient
    JSON.stringify({"protein": "10g"})           // nutritional_info_per_100g
];

// Retrieved automatically as JS objects/arrays
const result = await pool.query("SELECT supplement_ingredient FROM ...");
console.log(result.rows[0].supplement_ingredient);  // ["Vitamin D3", "MCT Oil"]
```

**TEXT[] (native pg conversion):**
```javascript
// Insert
const urlArray = ["https://url1.com", "https://url2.com"];
const values = [urlArray];  // pg handles conversion

// Retrieved automatically as JS arrays
const result = await pool.query("SELECT product_source_url FROM ...");
console.log(result.rows[0].product_source_url);  // ["https://url1.com", "https://url2.com"]
```

---

## Business Rules

### 1. batch_testing_org Auto-Set

**Implementation:** `modules/SSS/controller.js`

```javascript
// Get status name from ID
const statusResult = await pool.query(`
    SELECT supplement_status 
    FROM SSS.Supplement_Status_Lookup 
    WHERE id = $1
`, [validated.supplement_status_id]);

const status = statusResult.rows[0].supplement_status;

// Apply business logic
if (status === 'BATCH TESTED') {
    if (!validated.batch_testing_org || validated.batch_testing_org === 'NIL') {
        throw new Error('batch_testing_org is required when status is BATCH TESTED');
    }
} else if (status === 'NOT BATCH TESTED') {
    validated.batch_testing_org = 'NIL';  // Auto-set
} else if (status === 'DISCONTINUED') {
    // Keep existing value
}
```

### 2. Duplicate Prevention

**Check Before Insert:**
```javascript
const duplicate = await checkDuplicateSupplement(name, brand);
if (duplicate) {
    return res.status(409).json({
        error: "Supplement with this name and brand already exists"
    });
}
```

### 3. Stock Calculations

**Always Calculated (Never Stored):**
```javascript
booked = SUM(Inventory_Ticket.quantity) 
         WHERE inventory_batch_id = batch.id

available = batch_initial_quantity - booked
```

---

## Query Patterns

### Pattern 1: List Supplements with Pagination

```sql
SELECT 
    s.id,
    s.supplement_name,
    s.supplement_brand,
    spf.supplement_packaging_form,
    ssl.supplement_status,
    s.batch_testing_org,
    s.product_source_url
FROM SSS.Supplement s
LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf 
    ON s.supplement_packaging_form_id = spf.id
LEFT JOIN SSS.Supplement_Status_Lookup ssl
    ON s.supplement_status_id = ssl.id
WHERE spf.is_active = true 
  AND ssl.is_active = true
ORDER BY s.id DESC
LIMIT 10 OFFSET $1;
```

### Pattern 2: Search Supplements

```sql
SELECT 
    s.*,
    spf.supplement_packaging_form,
    ssl.supplement_status,
    CASE 
        WHEN s.supplement_name ILIKE '%' || $1 || '%' THEN 1
        WHEN s.supplement_brand ILIKE '%' || $1 || '%' THEN 2
        WHEN s.supplement_ingredient::text ILIKE '%' || $1 || '%' THEN 3
        WHEN spf.supplement_packaging_form ILIKE '%' || $1 || '%' THEN 4
        WHEN ssl.supplement_status ILIKE '%' || $1 || '%' THEN 5
        ELSE 6
    END AS relevance_order
FROM SSS.Supplement s
LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf 
    ON s.supplement_packaging_form_id = spf.id
LEFT JOIN SSS.Supplement_Status_Lookup ssl
    ON s.supplement_status_id = ssl.id
WHERE (
    s.supplement_name ILIKE '%' || $1 || '%' OR
    s.supplement_brand ILIKE '%' || $1 || '%' OR
    s.supplement_ingredient::text ILIKE '%' || $1 || '%' OR
    spf.supplement_packaging_form ILIKE '%' || $1 || '%' OR
    ssl.supplement_status ILIKE '%' || $1 || '%'
)
  AND spf.is_active = true 
  AND ssl.is_active = true
ORDER BY relevance_order, s.id DESC
LIMIT 10 OFFSET $2;
```

### Pattern 3: Get Supplement Details with Stock

```sql
-- Get supplement details
SELECT 
    s.*,
    spf.supplement_packaging_form,
    ssl.supplement_status
FROM SSS.Supplement s
LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf 
    ON s.supplement_packaging_form_id = spf.id
LEFT JOIN SSS.Supplement_Status_Lookup ssl
    ON s.supplement_status_id = ssl.id
WHERE s.id = $1;

-- Get stock summary
SELECT 
    SUM(ib.batch_initial_quantity) AS total_stock,
    COALESCE(SUM(ticket_quantities.total_booked), 0) AS total_booked
FROM SSS.Inventory_Batch ib
LEFT JOIN (
    SELECT inventory_batch_id, SUM(quantity) AS total_booked
    FROM SSS.Inventory_Ticket
    GROUP BY inventory_batch_id
) ticket_quantities ON ib.id = ticket_quantities.inventory_batch_id
WHERE ib.supplement_id = $1;

-- Get batches
SELECT 
    ib.*,
    COALESCE(SUM(it.quantity), 0) AS booked,
    ib.batch_initial_quantity - COALESCE(SUM(it.quantity), 0) AS available,
    bssl.batch_stock_status
FROM SSS.Inventory_Batch ib
LEFT JOIN SSS.Inventory_Ticket it ON ib.id = it.inventory_batch_id
LEFT JOIN SSS.Batch_Stock_Status_Lookup bssl 
    ON ib.batch_stock_status_id = bssl.id
WHERE ib.supplement_id = $1
GROUP BY ib.id, bssl.batch_stock_status
ORDER BY ib.id DESC
LIMIT 10 OFFSET $2;
```

### Pattern 4: Create Supplement

```sql
INSERT INTO SSS.Supplement (
    supplement_name,
    supplement_brand,
    supplement_packaging_form_id,
    supplement_status_id,
    approved_by,
    batch_testing_org,
    supplement_description,
    supplement_ingredient,
    nutritional_info_per_100g,
    nutritional_info_per_serving,
    nutritional_info_per_serving_definition,
    supplement_warning_label,
    supplement_certifications,
    supplement_additional_information,
    product_source_url,
    supplement_input_type
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    $8,  -- JSONB: JSON.stringify(array)
    $9,  -- JSONB: JSON.stringify(object)
    $10, -- JSONB: JSON.stringify(object)
    $11, $12, $13, $14,
    $15, -- TEXT[]: native array
    $16
)
RETURNING *;
```

### Pattern 5: Update Supplement (Dynamic)

```javascript
// Build dynamic UPDATE query
const fields = [];
const values = [];
let paramCounter = 1;

if (updateData.supplement_name !== undefined) {
    fields.push(`supplement_name = $${paramCounter}`);
    values.push(updateData.supplement_name);
    paramCounter++;
}

// ... add other fields

values.push(id);  // WHERE clause parameter

const query = `
    UPDATE SSS.Supplement 
    SET ${fields.join(', ')}
    WHERE id = $${paramCounter}
    RETURNING *
`;
```

---

## Maintenance Commands

### View Schema
```sql
\d SSS.Supplement
\d+ SSS.Supplement  -- With additional details
```

### List All Tables
```sql
\dt SSS.*
```

### Check Constraints
```sql
SELECT conname, contype, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'SSS.Supplement'::regclass;
```

### View Foreign Keys
```sql
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'sss';
```

### Check Indexes
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'sss' AND tablename = 'supplement';
```

---

## Common Issues & Solutions

### Issue 1: "relation does not exist"

**Error:** `relation "supplement" does not exist`

**Cause:** Missing schema prefix

**Solution:**
```sql
-- Wrong
SELECT * FROM Supplement;

-- Correct
SELECT * FROM SSS.Supplement;
```

---

### Issue 2: JSONB Parsing Error

**Error:** `invalid input syntax for type json`

**Cause:** Sending plain arrays/objects instead of JSON strings

**Solution:**
```javascript
// Wrong
values: [["item1", "item2"]]

// Correct
values: [JSON.stringify(["item1", "item2"])]
```

---

### Issue 3: UUID Format Error

**Error:** `invalid input syntax for type uuid`

**Cause:** Passing non-UUID string

**Solution:**
```javascript
// Validate with Zod
supplement_status_id: z.string().uuid()
```

---

## Performance Optimization

### Recommended Indexes

```sql
-- Supplement search performance
CREATE INDEX idx_supplement_name_gin 
    ON SSS.Supplement USING gin(supplement_name gin_trgm_ops);

CREATE INDEX idx_supplement_brand_gin 
    ON SSS.Supplement USING gin(supplement_brand gin_trgm_ops);

CREATE INDEX idx_supplement_ingredient_gin 
    ON SSS.Supplement USING gin(supplement_ingredient);

-- Foreign key indexes
CREATE INDEX idx_supplement_packaging_form_id 
    ON SSS.Supplement(supplement_packaging_form_id);

CREATE INDEX idx_supplement_status_id 
    ON SSS.Supplement(supplement_status_id);

-- Batch queries
CREATE INDEX idx_batch_supplement_id 
    ON SSS.Inventory_Batch(supplement_id);

CREATE INDEX idx_ticket_batch_id 
    ON SSS.Inventory_Ticket(inventory_batch_id);

-- Lookup table filtering
CREATE INDEX idx_packaging_form_active 
    ON SSS.Supplement_Packaging_Form_Lookup(is_active);

CREATE INDEX idx_supplement_status_active 
    ON SSS.Supplement_Status_Lookup(is_active);
```

---

**Document Version:** 2.0  
**Last Updated:** January 20, 2026  
**Next Review:** After batch CRUD implementation
