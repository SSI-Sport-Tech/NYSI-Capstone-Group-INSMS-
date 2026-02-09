# AMS Database Schema - Complete Reference

**Database:** PostgreSQL 14+  
**Last Updated:** February 5, 2026  
**Version:** 1.0  
**Status:** Initial Design - Phase 1

---

## Quick Reference

### Connection Details
```javascript
Host: localhost (development)
Port: 5432
Database: nysi_db
Schema: AMS (Athlete Management System)
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
└── AMS (Schema)
    ├── Athlete                          # Main athlete catalog
    ├── Athlete_Registry                 # Carding status tracking
    ├── Athlete_Medical                  # Medical information
    ├── Coach_Athlete_Mapping            # Many-to-many athlete-coach
    ├── Nutritionist_Athlete_Mapping     # Many-to-many athlete-nutritionist
    ├── Coach                            # Coach catalog
    ├── Nutritionist                     # Nutritionist catalog
    └── Sport_Lookup                     # Sports reference data
```

### Schema Purpose
- **AMS:** Athlete Management System - all athlete profile and assignment data

---

## Core Tables

### AMS.Athlete

**Purpose:** Main athlete profile catalog

**Table Definition:**
```sql
CREATE TABLE AMS.Athlete (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID NOT NULL,
    sportsyncID TEXT NOT NULL,
    athlete_name_abbr TEXT NOT NULL,
    gender TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    
    FOREIGN KEY (sport_id) 
        REFERENCES AMS.Sport_Lookup(id)
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key (auto-generated) |
| `sport_id` | UUID | No | FK to Sport_Lookup (current/historical sport) |
| `sportsyncID` | TEXT | No | External system ID for integration |
| `athlete_name_abbr` | TEXT | No | Athlete's abbreviated name |
<<<<<<< HEAD
| `gender` | TEXT | No | Athlete's gender (CHECK: MALE, FEMALE, OTHER) |
=======
| `gender` | TEXT | No | Athlete's gender |
>>>>>>> parent of e16bfa5 (Revert "Merge pull request #14 from Mike-Umali/Web-Portal")
| `date_of_birth` | DATE | No | Athlete's birth date |

**Business Rules:**
1. **All fields required** - No nullable fields except foreign key cascade scenarios
2. **Sport Changes Allowed** - Athletes can change sports (update `sport_id`)
3. **Historical Record** - `sport_id` represents athlete's sport association

**Important Notes:**
- ✅ **All fields must be provided** during athlete creation
- ✅ **No validation constraints** on athlete_name_abbr (free text)
<<<<<<< HEAD
- ✅ **gender is TEXT** with CHECK constraint: must be `MALE`, `FEMALE`, or `OTHER` (uppercase)
=======
- ✅ **gender is TEXT** (not a lookup table)
>>>>>>> parent of e16bfa5 (Revert "Merge pull request #14 from Mike-Umali/Web-Portal")

---

### AMS.Athlete_Registry

**Purpose:** Track athlete carding status and clearance dates

**Relationship:** One-to-One with Athlete (each athlete has exactly ONE registry record)

**Table Definition:**
```sql
CREATE TABLE AMS.Athlete_Registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL UNIQUE,  -- UNIQUE ensures 1:1
    carding_status TEXT NOT NULL,
<<<<<<< HEAD
    athlete_notified_on DATE NOT NULL,
=======
    athlete_mathlid_on DATE NOT NULL,
>>>>>>> parent of e16bfa5 (Revert "Merge pull request #14 from Mike-Umali/Web-Portal")
    carding_start_date DATE NOT NULL,
    carding_end_date DATE NOT NULL,
    medical_clearance BOOLEAN NOT NULL,
    approved_start_date DATE NOT NULL,
    approved_end_date DATE NOT NULL,
    
    FOREIGN KEY (athlete_id) 
        REFERENCES AMS.Athlete(id) ON DELETE CASCADE
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `athlete_id` | UUID | No (UNIQUE) | FK to Athlete (1:1 relationship) |
| `carding_status` | TEXT | No | Carding status (free text) |
<<<<<<< HEAD
| `athlete_notified_on` | DATE | No | Athlete math/ID date (logging) |
=======
| `athlete_mathlid_on` | DATE | No | Athlete math/ID date (logging) |
>>>>>>> parent of e16bfa5 (Revert "Merge pull request #14 from Mike-Umali/Web-Portal")
| `carding_start_date` | DATE | No | Carding period start |
| `carding_end_date` | DATE | No | Carding period end |
| `medical_clearance` | BOOLEAN | No | Medical clearance flag |
| `approved_start_date` | DATE | No | Approval period start |
| `approved_end_date` | DATE | No | Approval period end |

**Business Rules:**
1. **One Registry Per Athlete** - UNIQUE constraint on `athlete_id`
2. **Medical Clearance Optional** - Not required for athlete to be "active"
3. **Date Fields Trust User** - No validation on date relationships
4. **All Fields Required** - Registry must be complete when created

**Important Notes:**
- ✅ **1:1 Relationship enforced** by UNIQUE constraint
- ✅ **Cascade delete** - Registry deleted if athlete deleted
- ⚠️ **No historical records** - Only current carding status stored

---

### AMS.Athlete_Medical

**Purpose:** Track athlete medical conditions and allergies

**Relationship:** One-to-One with Athlete (each athlete has exactly ONE medical record)

**Table Definition:**
```sql
CREATE TABLE AMS.Athlete_Medical (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL UNIQUE,  -- UNIQUE ensures 1:1
    medical_condition TEXT NOT NULL,
    food_allergy TEXT NOT NULL,
    drug_allergy TEXT NOT NULL,
    past_injury TEXT NOT NULL,
    
    FOREIGN KEY (athlete_id) 
        REFERENCES AMS.Athlete(id) ON DELETE CASCADE
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `athlete_id` | UUID | No (UNIQUE) | FK to Athlete (1:1 relationship) |
| `medical_condition` | TEXT | No | Medical conditions (free text) |
| `food_allergy` | TEXT | No | Food allergies (free text) |
| `drug_allergy` | TEXT | No | Drug allergies (free text) |
| `past_injury` | TEXT | No | Past injuries (free text) |

**Business Rules:**
1. **One Medical Record Per Athlete** - UNIQUE constraint on `athlete_id`
2. **Free Text Fields** - No structured validation
3. **All Fields Required** - Medical record must be complete
4. **Referenced for Supplement Assignment** - Medical data used in AMS module

**Important Notes:**
- ✅ **1:1 Relationship enforced** by UNIQUE constraint
- ✅ **Cascade delete** - Medical record deleted if athlete deleted
- ✅ **Free text format** - No validation on content

---

### AMS.Coach_Athlete_Mapping

**Purpose:** Many-to-many relationship between coaches and athletes

**Table Definition:**
```sql
CREATE TABLE AMS.Coach_Athlete_Mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    athlete_id UUID NOT NULL,
    coach_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    FOREIGN KEY (athlete_id) 
        REFERENCES AMS.Athlete(id) ON DELETE CASCADE,
    FOREIGN KEY (coach_id) 
        REFERENCES AMS.Coach(id) ON DELETE CASCADE,
        
    -- Prevent duplicate active assignments
    UNIQUE (athlete_id, coach_id, is_active)
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `athlete_id` | UUID | No | FK to Athlete |
| `coach_id` | UUID | No | FK to Coach |
| `is_active` | BOOLEAN | No | Active/inactive flag (default: true) |

**Business Rules:**
1. **Many-to-Many** - One athlete can have multiple coaches, one coach can have multiple athletes
2. **Multiple Active Coaches** - Athlete can have multiple active coaches simultaneously
3. **Historical Tracking** - `is_active = false` hides assignment without deleting
4. **Soft Delete Pattern** - Set `is_active = false` instead of DELETE

**Important Notes:**
- ✅ **Supports multiple active coaches** per athlete
- ✅ **Soft delete via is_active flag**
- ✅ **Unique constraint prevents duplicate active assignments**

---

### AMS.Nutritionist_Athlete_Mapping

**Purpose:** Many-to-many relationship between nutritionists and athletes

**Table Definition:**
```sql
CREATE TABLE AMS.Nutritionist_Athlete_Mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nutritionist_id UUID NOT NULL,
    athlete_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    FOREIGN KEY (athlete_id) 
        REFERENCES AMS.Athlete(id) ON DELETE CASCADE,
    FOREIGN KEY (nutritionist_id) 
        REFERENCES AMS.Nutritionist(id) ON DELETE CASCADE,
        
    -- Prevent duplicate active assignments
    UNIQUE (athlete_id, nutritionist_id, is_active)
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `nutritionist_id` | UUID | No | FK to Nutritionist |
| `athlete_id` | UUID | No | FK to Athlete |
| `is_active` | BOOLEAN | No | Active/inactive flag (default: true) |

**Business Rules:**
1. **Many-to-Many** - One athlete can have multiple nutritionists, one nutritionist can have multiple athletes
2. **Multiple Active Nutritionists** - Athlete can have multiple active nutritionists simultaneously
3. **Historical Tracking** - `is_active = false` hides assignment without deleting
4. **Soft Delete Pattern** - Set `is_active = false` instead of DELETE

**Important Notes:**
- ✅ **Supports multiple active nutritionists** per athlete
- ✅ **Soft delete via is_active flag**
- ✅ **Unique constraint prevents duplicate active assignments**

---

## Lookup Tables

### AMS.Coach

**Purpose:** Coach catalog

**Table Definition:**
```sql
CREATE TABLE AMS.Coach (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport_id UUID NOT NULL,
    name TEXT NOT NULL,
    
    FOREIGN KEY (sport_id) 
        REFERENCES AMS.Sport_Lookup(id)
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `sport_id` | UUID | No | FK to Sport_Lookup |
| `name` | TEXT | No | Coach's name |

**Important Notes:**
- ✅ **Pre-existing data** - Already populated
- ✅ **Coach-specific sport** - Each coach assigned to a sport

---

### AMS.Nutritionist

**Purpose:** Nutritionist catalog

**Table Definition:**
```sql
CREATE TABLE AMS.Nutritionist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `name` | TEXT | No | Nutritionist's name |

**Important Notes:**
- ✅ **Pre-existing data** - Already populated
- ✅ **No sport association** - Nutritionists work across all sports

---

### AMS.Sport_Lookup

**Purpose:** Sports reference data

**Table Definition:**
```sql
CREATE TABLE AMS.Sport_Lookup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);
```

**Column Details:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key |
| `sport` | TEXT | No | Sport name |
| `is_active` | BOOLEAN | No | Active/inactive flag |

**Business Rules:**
1. **Soft Delete** - Use `is_active = false` instead of DELETE
2. **New Sports Can Be Added** - Not a fixed list
3. **Can Delete if Unused** - Sports without athletes/coaches can be deleted

**Important Notes:**
- ✅ **Pre-existing data** - Already populated
- ✅ **Soft delete pattern** - Set is_active = false
- ✅ **Historical record** - Athlete's sport_id is historical

---

## Relationships

### Entity Relationship Diagram

```
┌─────────────────────────────────────────┐
│  Sport_Lookup                           │
│  - id (PK)                              │
│  - sport                                │
│  - is_active                            │
└──────────────┬──────────────────────────┘
               │ 1
               │
               │ M
┌──────────────▼──────────────────────────┐
│  Athlete                                │
│  - id (PK)                              │◄─────────┐
│  - sport_id (FK)                        │          │
│  - sportsyncID                          │          │
│  - athlete_name_abbr                    │          │
│  - gender                               │          │
│  - date_of_birth                        │          │
└──────────────┬──────────────────────────┘          │
               │ 1                                   │ 1
               │                                     │
          ┌────┴────┐                                │
          │ 1       │ 1                              │
          │         │                                │
          ▼         ▼                                │
┌─────────────┐ ┌─────────────────────┐             │
│  Registry   │ │  Medical            │             │
│  - id (PK)  │ │  - id (PK)          │             │
│  - athlete_id│ │  - athlete_id (FK)  │             │
│  (FK UNIQUE)│ │    (FK UNIQUE)      │             │
│  - carding_ │ │  - medical_condition│             │
│    status   │ │  - food_allergy     │             │
│  - ...      │ │  - drug_allergy     │             │
│             │ │  - past_injury      │             │
└─────────────┘ └─────────────────────┘             │
                                                     │
               │ M                                   │
               │                                     │
               ▼                                     │
┌────────────────────────────────────────┐          │
│  Coach_Athlete_Mapping                 │          │
│  - id (PK)                             │          │
│  - athlete_id (FK)  ───────────────────┘          │
│  - coach_id (FK)                       │          │
│  - is_active                           │          │
└────────────────┬───────────────────────┘          │
                 │ M                                 │
                 │                                   │
                 │ 1                                 │
                 ▼                                   │
┌─────────────────────────────────────────┐         │
│  Coach                                  │         │
│  - id (PK)                              │         │
│  - sport_id (FK)                        │         │
│  - name                                 │         │
└─────────────────────────────────────────┘         │
                                                     │
               │ M                                   │
               │                                     │
               ▼                                     │
┌────────────────────────────────────────┐          │
│  Nutritionist_Athlete_Mapping          │          │
│  - id (PK)                             │          │
│  - athlete_id (FK)  ───────────────────┘
│  - nutritionist_id (FK)                │
│  - is_active                           │
└────────────────┬───────────────────────┘
                 │ M
                 │
                 │ 1
                 ▼
┌─────────────────────────────────────────┐
│  Nutritionist                           │
│  - id (PK)                              │
│  - name                                 │
└─────────────────────────────────────────┘
```

**Key Relationships:**
- One Sport → Many Athletes (1:M)
- One Sport → Many Coaches (1:M)
- One Athlete → One Registry (1:1)
- One Athlete → One Medical Record (1:1)
- Athletes ↔ Coaches (M:M via Coach_Athlete_Mapping)
- Athletes ↔ Nutritionists (M:M via Nutritionist_Athlete_Mapping)

---

## Data Types Reference

### PostgreSQL Types Used

| Type | Usage | Example | Node.js Handling |
|------|-------|---------|------------------|
| `UUID` | Primary keys, FKs | `a1b2c3d4-...` | String |
| `TEXT` | Variable text | `"John Doe"` | String |
| `DATE` | Date only | `2000-01-15` | String (ISO format) |
| `BOOLEAN` | True/false | `true` | Boolean |

---

## Business Rules

### 1. Athlete-Coach Assignment

**Many Active Coaches Allowed:**
```sql
-- Athlete can have multiple active coaches
SELECT * FROM AMS.Coach_Athlete_Mapping
WHERE athlete_id = $1 AND is_active = true;
-- Can return multiple rows ✅
```

**Soft Delete Pattern:**
```javascript
// Instead of DELETE, set is_active = false
await pool.query(`
    UPDATE AMS.Coach_Athlete_Mapping
    SET is_active = false
    WHERE id = $1
`, [mappingId]);
```

### 2. Athlete-Nutritionist Assignment

**Same rules as Coach Assignment:**
- Multiple active nutritionists allowed
- Soft delete via `is_active = false`

### 3. Sport Changes

**Athletes can change sports:**
```javascript
// Update athlete's sport
await pool.query(`
    UPDATE AMS.Athlete
    SET sport_id = $1
    WHERE id = $2
`, [newSportId, athleteId]);
```

### 4. Registry & Medical Records

**1:1 Relationship Enforced:**
```sql
-- UNIQUE constraint prevents multiple records
CREATE UNIQUE INDEX idx_athlete_registry_athlete_id 
    ON AMS.Athlete_Registry(athlete_id);

CREATE UNIQUE INDEX idx_athlete_medical_athlete_id 
    ON AMS.Athlete_Medical(athlete_id);
```

---

## Query Patterns

### Pattern 1: List Athletes with Sport

```sql
SELECT 
    a.id,
    a.athlete_name_abbr,
    a.gender,
    a.date_of_birth,
    a.sportsyncID,
    s.sport AS sport_name
FROM AMS.Athlete a
LEFT JOIN AMS.Sport_Lookup s ON a.sport_id = s.id
WHERE s.is_active = true
ORDER BY a.id DESC
LIMIT 10 OFFSET $1;
```

### Pattern 2: Get Athlete Full Profile

```sql
-- Get athlete with all related data
SELECT 
    a.*,
    s.sport AS sport_name,
    r.carding_status,
    r.medical_clearance,
    r.carding_start_date,
    r.carding_end_date,
    m.medical_condition,
    m.food_allergy,
    m.drug_allergy,
    m.past_injury
FROM AMS.Athlete a
LEFT JOIN AMS.Sport_Lookup s ON a.sport_id = s.id
LEFT JOIN AMS.Athlete_Registry r ON a.id = r.athlete_id
LEFT JOIN AMS.Athlete_Medical m ON a.id = m.athlete_id
WHERE a.id = $1;

-- Get athlete's active coaches
SELECT 
    c.id,
    c.name,
    s.sport AS coach_sport
FROM AMS.Coach_Athlete_Mapping cam
INNER JOIN AMS.Coach c ON cam.coach_id = c.id
INNER JOIN AMS.Sport_Lookup s ON c.sport_id = s.id
WHERE cam.athlete_id = $1 AND cam.is_active = true;

-- Get athlete's active nutritionists
SELECT 
    n.id,
    n.name
FROM AMS.Nutritionist_Athlete_Mapping nam
INNER JOIN AMS.Nutritionist n ON nam.nutritionist_id = n.id
WHERE nam.athlete_id = $1 AND nam.is_active = true;
```

### Pattern 3: Create Athlete with Registry & Medical

```sql
-- Step 1: Create athlete
INSERT INTO AMS.Athlete (
    sport_id,
    sportsyncID,
    athlete_name_abbr,
    gender,
    date_of_birth
) VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- Step 2: Create registry (if provided)
INSERT INTO AMS.Athlete_Registry (
    athlete_id,
    carding_status,
<<<<<<< HEAD
    athlete_notified_on,
=======
    athlete_mathlid_on,
>>>>>>> parent of e16bfa5 (Revert "Merge pull request #14 from Mike-Umali/Web-Portal")
    carding_start_date,
    carding_end_date,
    medical_clearance,
    approved_start_date,
    approved_end_date
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- Step 3: Create medical record (if provided)
INSERT INTO AMS.Athlete_Medical (
    athlete_id,
    medical_condition,
    food_allergy,
    drug_allergy,
    past_injury
) VALUES ($1, $2, $3, $4, $5)
RETURNING *;
```

### Pattern 4: Assign Coach to Athlete

```sql
-- Check for existing active assignment
SELECT * FROM AMS.Coach_Athlete_Mapping
WHERE athlete_id = $1 AND coach_id = $2 AND is_active = true;

-- If not exists, create new assignment
INSERT INTO AMS.Coach_Athlete_Mapping (
    athlete_id,
    coach_id,
    is_active
) VALUES ($1, $2, true)
RETURNING *;
```

### Pattern 5: Update Athlete

```sql
-- Dynamic UPDATE query
UPDATE AMS.Athlete
SET 
    sport_id = COALESCE($1, sport_id),
    athlete_name_abbr = COALESCE($2, athlete_name_abbr),
    gender = COALESCE($3, gender),
    date_of_birth = COALESCE($4, date_of_birth)
WHERE id = $5
RETURNING *;
```

---

## Common Issues & Solutions

### Issue 1: "duplicate key value violates unique constraint"

**Error:** `duplicate key value violates unique constraint "athlete_registry_athlete_id_key"`

**Cause:** Trying to create second registry/medical record for same athlete

**Solution:**
```javascript
// Check if registry exists before creating
const existing = await pool.query(`
    SELECT id FROM AMS.Athlete_Registry 
    WHERE athlete_id = $1
`, [athleteId]);

if (existing.rows.length > 0) {
    // Update instead of insert
    await pool.query(`
        UPDATE AMS.Athlete_Registry 
        SET ... 
        WHERE athlete_id = $1
    `, [athleteId]);
}
```

### Issue 2: Cascade Delete Concerns

**Problem:** Deleting athlete deletes all related records

**Solution:** Consider soft delete for athletes instead:
```sql
-- Add is_active to Athlete table
ALTER TABLE AMS.Athlete ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Soft delete instead of hard delete
UPDATE AMS.Athlete SET is_active = false WHERE id = $1;
```

---

## Performance Optimization

### Recommended Indexes

```sql
-- Athlete queries
CREATE INDEX idx_athlete_sport_id ON AMS.Athlete(sport_id);
CREATE INDEX idx_athlete_sportsyncid ON AMS.Athlete(sportsyncID);

-- Registry queries
CREATE INDEX idx_registry_athlete_id ON AMS.Athlete_Registry(athlete_id);
CREATE INDEX idx_registry_carding_status ON AMS.Athlete_Registry(carding_status);

-- Medical queries
CREATE INDEX idx_medical_athlete_id ON AMS.Athlete_Medical(athlete_id);

-- Mapping queries
CREATE INDEX idx_coach_mapping_athlete ON AMS.Coach_Athlete_Mapping(athlete_id, is_active);
CREATE INDEX idx_coach_mapping_coach ON AMS.Coach_Athlete_Mapping(coach_id, is_active);
CREATE INDEX idx_nutritionist_mapping_athlete ON AMS.Nutritionist_Athlete_Mapping(athlete_id, is_active);
CREATE INDEX idx_nutritionist_mapping_nutritionist ON AMS.Nutritionist_Athlete_Mapping(nutritionist_id, is_active);

-- Lookup queries
CREATE INDEX idx_sport_lookup_active ON AMS.Sport_Lookup(is_active);
```

---

**Document Version:** 1.0  
**Last Updated:** February 5, 2026  
**Next Review:** After athlete CRUD implementation  
**Maintained By:** Development Team
