# AI Assistant Collaboration Guidelines

## Purpose of This Document
This document provides guidelines for AI assistants (like Claude, ChatGPT, etc.) when collaborating on the NYSI Nutritionist Web Application project. Following these guidelines ensures consistent, high-quality assistance.

**Target Audience:** AI Assistants  
**Last Updated:** January 24, 2026  
**Version:** 1.1

---

## Core Principles

### 1. **Ask Before Implementing**
âŒ **Don't:** Immediately start coding when given a vague request  
âœ… **Do:** Ask clarifying questions first

**Example:**
```
User: "Add a new field to supplement"

Bad Response:
"Here's the code to add a 'description' field..."

Good Response:
"I'd be happy to help add a new field. Before I proceed, could you clarify:
1. What is the field name?
2. What data type should it be (text, number, boolean, etc.)?
3. Is it required or optional?
4. Are there any validation rules?
5. Should it be searchable?
6. Does it need to appear in the list view or just detail view?"
```

### 2. **Reference Project Documentation First**
Before answering, always check:
1. **PROJECT_ARCHITECTURE.md** - For architectural decisions
2. **DATABASE_SCHEMA.md** - For database structure
3. **USE_CASES.md** - For feature specifications
4. **ONBOARDING_GUIDE.md** - For common patterns

### 3. **Maintain Consistency**
Follow existing patterns in the codebase:
- âœ… Same code style
- âœ… Same naming conventions
- âœ… Same error handling approach
- âœ… Same validation patterns

### 4. **Explain Your Reasoning**
Always explain **why**, not just **what**:

âŒ **Don't:**
```javascript
// Add this to validation.js
supplier: z.string().max(100),
```

âœ… **Do:**
```javascript
// Add this to validation.js
supplier: z.string()
  .max(100, 'Supplier name too long')
  .optional()
  .nullable()
  .transform(val => val || null),

// Why:
// - max(100): Matches database VARCHAR(100) constraint
// - optional(): Supplier is not required for all supplements
// - nullable(): Allows explicit null in database
// - transform(): Converts empty strings to null for consistency
```

---

## Project Context

### Technology Stack Awareness

**This project uses:**
- Node.js with **ES Modules** (not CommonJS)
- Express.js for routing
- PostgreSQL as database
- **Zod** for validation (not Joi)
- **Parameterized queries** (not ORM)
- Swagger for documentation

**When suggesting code:**
```javascript
// âœ… Correct: ES Module syntax
import pool from '../../config/db.js';
export async function createSupplement() { }

// âŒ Wrong: CommonJS syntax
const pool = require('../../config/db');
module.exports = { createSupplement };
```

### Database-Specific Rules

**PostgreSQL Specifics:**
1. Schema prefix required: `SSS.Supplement` (not just `Supplement`)
2. JSONB columns exist - don't suggest TEXT for JSON data
3. UUID v4 via `gen_random_uuid()` - don't suggest `uuid()` extension
4. TEXT[] arrays for URL fields - not JSONB
5. Parameterized queries always: `$1, $2` (not string concatenation)

### Architectural Patterns

**Follow the 4-layer architecture:**
```
Routes â†’ Controller â†’ Service â†’ Database
```

**When user asks to "add a feature":**
1. Start with **services.js** (database operation)
2. Then **controller.js** (business logic)
3. Then **routes.js** (API endpoint + Swagger)
4. Finally **validation.js** (if new fields)

---

## Response Guidelines

### When Analyzing Issues

**Debug Pattern:**
```markdown
## Issue Analysis

**Symptoms:**
[What the user is experiencing]

**Root Cause:**
[Why it's happening]

**Solution:**
[How to fix it]

**Prevention:**
[How to avoid this in future]

**Verification:**
[How to test the fix]
```

### When Providing Code

**Always include:**
1. **File location:** `modules/SSS/services.js`
2. **Line number (if updating):** Around line 320
3. **What changed:** Added supplier field
4. **Why it changed:** To track supplement suppliers
5. **Testing steps:** How to verify it works

**Code block format:**
```javascript
// File: modules/SSS/services.js
// Location: Around line 320
// What: Add supplier field to INSERT query
// Why: Track supplement suppliers

export async function createSupplement(supplementData) {
  const query = `
    INSERT INTO SSS.Supplement (
      supplement_name,
      supplier,  -- â† New field added here
      ...
    ) VALUES (
      $1, $2, ...
    )
  `;
  
  const values = [
    supplementData.supplement_name,
    supplementData.supplier || null,  // â† New value added here
    // ...
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}
```

---

## Common Request Types

### Type 1: "Add a new field"

**Required Information:**
- Field name
- Data type
- Required vs optional
- Validation rules
- Default value
- Searchable? Filterable?

**Implementation Checklist:**
- [ ] Database ALTER TABLE
- [ ] Update validation.js schema
- [ ] Update services.js (create function)
- [ ] Update services.js (update function)
- [ ] Update services.js (get functions - SELECT queries)
- [ ] Update routes.js (Swagger schemas)
- [ ] Provide testing steps

---

### Type 2: "Fix this error"

**Response Structure:**
```markdown
## Error Analysis

**Error Message:**
[Copy exact error]

**Error Code:** [e.g., 22P02]

**What This Means:**
[Explain in simple terms]

**Root Cause:**
[Why it's happening]

**Solution:**
[Step-by-step fix]

**Testing:**
[How to verify fix worked]
```

**Don't assume** - Ask for:
- Full error message
- Stack trace
- What they were trying to do
- Relevant code snippet

---

### Type 3: "Add a new endpoint"

**Clarifying Questions:**
1. What is the endpoint URL?
2. What HTTP method (GET, POST, PATCH, DELETE)?
3. What input does it accept?
4. What should it return?
5. Any special business logic?
6. Authentication required? (future feature)

**Implementation Order:**
```
1. Service function (database operation)
2. Controller function (validation + business logic)
3. Route definition (HTTP mapping)
4. Swagger documentation (API docs)
5. Testing examples
```

---

### Type 4: "Help me debug"

**Debugging Checklist:**
```markdown
Please provide:
- [ ] Full error message with stack trace
- [ ] What you were trying to do
- [ ] Relevant code snippet
- [ ] What you've already tried
- [ ] Expected vs actual behavior

This helps me give you precise assistance faster.
```

**Tools to Suggest:**
1. `console.log()` for debugging
2. Swagger UI for testing
3. PostgreSQL `\d` commands for schema inspection
4. Browser DevTools for frontend issues

---

## Validation Best Practices

### Zod Schema Patterns

**For required text fields:**
```javascript
field_name: z.string()
  .min(1, 'Field name is required')
  .max(255, 'Field name too long')
  .trim()
```

**For optional text fields:**
```javascript
// ✅ CORRECT (for partial updates)
field_name: z.string()
  .trim()
  .optional()
  .nullable()
  .transform(val => {
    if (val === undefined) return undefined;  // Preserve undefined
    return val || null;  // Only convert empty string to null
  })

// ❌ WRONG (sets unprovided fields to NULL in partial updates)
field_name: z.string()
  .trim()
  .optional()
  .nullable()
  .transform(val => val || null)  // undefined || null = null ❌
```

**Why the transform matters for partial updates:**
- **Field not provided** → `undefined` → **not** included in UPDATE (correct)
- **Empty string provided** → `null` → included in UPDATE (correct)
- **Value provided** → `value` → included in UPDATE (correct)

**For UUIDs:**
```javascript
field_id: z.string().uuid('Must be a valid UUID')
```

**For numbers:**
```javascript
price: z.coerce.number()
  .positive('Price must be positive')
  .multipleOf(0.01, 'Max 2 decimal places')
```

**For arrays:**
```javascript
// String array (JSONB)
ingredients: z.array(z.string().min(1))
  .optional()
  .nullable()
  .default([])

// URL array (TEXT[])
urls: z.preprocess(
  (val) => {
    if (!val) return null;
    if (typeof val === 'string') return [val];
    if (Array.isArray(val)) return val;
    return null;
  },
  z.array(z.string().url()).optional().nullable()
)
```

---

## Database Query Patterns

### SELECT Queries

**Always include:**
- Schema prefix: `SSS.Supplement`
- Proper JOINs for lookup tables
- WHERE clauses for soft deletes (`is_active = true`)
- ORDER BY for consistent results

```javascript
const query = `
  SELECT 
    s.id,
    s.supplement_name,
    spf.supplement_packaging_form,  -- From lookup table
    ssl.supplement_status             -- From lookup table
  FROM SSS.Supplement s
  LEFT JOIN SSS.Supplement_Packaging_Form_Lookup spf 
    ON s.supplement_packaging_form_id = spf.id
  LEFT JOIN SSS.Supplement_Status_Lookup ssl
    ON s.supplement_status_id = ssl.id
  WHERE spf.is_active = true 
    AND ssl.is_active = true
  ORDER BY s.id DESC
  LIMIT $1 OFFSET $2
`;
```

### INSERT Queries

**Pattern:**
```javascript
export async function createSupplement(supplementData) {
  const query = `
    INSERT INTO SSS.Supplement (
      field1,
      field2
    ) VALUES (
      $1, $2
    )
    RETURNING *
  `;
  
  const values = [
    supplementData.field1,
    supplementData.field2 || null  // Handle optional fields
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}
```

### UPDATE Queries

**Dynamic UPDATE pattern:**
```javascript
export async function updateSupplement(id, updateData) {
  const fields = [];
  const values = [];
  let paramCounter = 1;
  
  const fieldMapping = {
    field1: updateData.field1,
    field2: updateData.field2
  };
  
  for (const [field, value] of Object.entries(fieldMapping)) {
    if (value !== undefined) {
      fields.push(`${field} = $${paramCounter}`);
      values.push(value);
      paramCounter++;
    }
  }
  
  if (fields.length === 0) return null;
  
  values.push(id);
  
  const query = `
    UPDATE SSS.Supplement 
    SET ${fields.join(', ')}
    WHERE id = $${paramCounter}
    RETURNING *
  `;
  
  const result = await pool.query(query, values);
  return result.rows[0];
}
```

---

## Data Type Handling

### JSONB Fields (Need JSON.stringify)

**Fields that are JSONB:**
- `supplement_ingredient` (array)
- `nutritional_info_per_100g` (object)
- `nutritional_info_per_serving` (object)

**How to handle:**
```javascript
// INSERT/UPDATE
values: [
  supplementData.supplement_ingredient && supplementData.supplement_ingredient.length > 0
    ? JSON.stringify(supplementData.supplement_ingredient)
    : '[]',
  
  supplementData.nutritional_info_per_100g
    ? JSON.stringify(supplementData.nutritional_info_per_100g)
    : null
]

// SELECT (no special handling - pg returns as JS objects/arrays)
```

### TEXT[] Fields (pg handles natively)

**Fields that are TEXT[]:**
- `product_source_url` (array of URLs)

**How to handle:**
```javascript
// INSERT/UPDATE
const urlArray = supplementData.product_source_url 
  ? (Array.isArray(supplementData.product_source_url) 
      ? supplementData.product_source_url 
      : [supplementData.product_source_url])
  : null;

values: [
  urlArray  // pg handles array conversion automatically
]

// SELECT (no special handling - pg returns as JS arrays)
```

---

## Error Handling

### User-Friendly Errors

**Transform database errors:**
```javascript
try {
  await services.createSupplement(data);
} catch (error) {
  // Log technical error
  console.error('Database error:', error);
  
  // Return user-friendly message
  if (error.code === '23505') {  // Unique violation
    return res.status(409).json({
      error: "Supplement with this name and brand already exists"
    });
  }
  
  if (error.code === '23503') {  // Foreign key violation
    return res.status(400).json({
      error: "Invalid reference ID provided"
    });
  }
  
  // Generic error
  return res.status(500).json({
    error: "Failed to create supplement"
  });
}
```

### Validation Errors

**Format Zod errors:**
```javascript
try {
  const validated = createSupplementSchema.parse(req.body);
} catch (error) {
  return res.status(400).json({
    error: "Validation failed",
    details: error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }))
  });
}
```

---

## Swagger Documentation

### Required Components

**Every endpoint needs:**
1. Summary (short description)
2. Description (detailed explanation)
3. Tags (for grouping)
4. Parameters (path, query, body)
5. Responses (200, 400, 404, 500)
6. Examples (at least 1 per request type)

**Template:**
```javascript
/**
 * @swagger
 * /api/SSS/supplements:
 *   post:
 *     summary: Create new supplement
 *     description: |
 *       Add a new supplement to the library.
 *       
 *       **Business Logic:**
 *       - Field X is required
 *       - Field Y auto-set by backend
 *       
 *       **Use Case:** UC-SSS-009
 *     tags: [Supplements]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateSupplementRequest'
 *           examples:
 *             minimal:
 *               summary: Minimal required fields
 *               value:
 *                 supplement_name: "Vitamin D3"
 *                 ...
 *     responses:
 *       201:
 *         description: Supplement created successfully
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/supplements', controller.createSupplement);
```

---

## Testing Guidance

### What to Tell Users to Test

**For new features:**
```markdown
## Testing Steps

1. **Restart Server**
   ```bash
   npm start
   ```

2. **Open Swagger UI**
   ```
   http://localhost:8000/docs
   ```

3. **Test Positive Case** (should work)
   - Expand POST /api/SSS/supplements
   - Click "Try it out"
   - Use this payload:
   ```json
   {
     "supplement_name": "Test Supplement",
     ...
   }
   ```
   - Click "Execute"
   - **Expected:** 201 Created

4. **Test Negative Case** (should fail)
   - Use invalid data:
   ```json
   {
     "supplement_name": ""  // Empty - should fail
   }
   ```
   - **Expected:** 400 Bad Request

5. **Verify in Database**
   ```sql
   SELECT * FROM SSS.Supplement 
   WHERE supplement_name = 'Test Supplement';
   ```
```

---

## Common Pitfalls to Avoid

### 1. Don't Assume Field Names

âŒ **Don't:**
```javascript
// Assuming field is called 'website'
s.website
```

âœ… **Do:**
```javascript
// Check DATABASE_SCHEMA.md first
// Actual field name is 'product_source_url'
s.product_source_url
```

### 2. Don't Forget Schema Prefix

âŒ **Don't:**
```sql
SELECT * FROM Supplement
```

âœ… **Do:**
```sql
SELECT * FROM SSS.Supplement
```

### 3. Don't Mix Data Types

âŒ **Don't:**
```javascript
// JSONB field but sending as string
supplement_ingredient: "Vitamin D3, Calcium"
```

âœ… **Do:**
```javascript
// JSONB field should be array
supplement_ingredient: ["Vitamin D3", "Calcium"]
```

### 4. Don't Hardcode Values

âŒ **Don't:**
```javascript
approved_by: "admin"  // String instead of UUID
```

âœ… **Do:**
```javascript
approved_by: "e9e9f927-40f4-4f0a-bdca-a5503b5974da"  // Actual UUID
```

### 5. Don't Skip Validation

âŒ **Don't:**
```javascript
// Direct database call without validation
const result = await pool.query(query, [req.body.name]);
```

âœ… **Do:**
```javascript
// Validate first
const validated = schema.parse(req.body);
const result = await pool.query(query, [validated.name]);
```

---

## When to Suggest Alternatives

### Suggest Better Approaches When:

1. **User wants to add a field that already exists**
```markdown
"I see you want to add a 'name' field. The Supplement table already has 
'supplement_name' which serves this purpose. Would you like to:
1. Use the existing 'supplement_name' field?
2. Add a different field with a different purpose?
3. Rename 'supplement_name' to just 'name'?"
```

2. **User's approach doesn't follow project patterns**
```markdown
"I notice you're trying to use an ORM. This project uses parameterized 
queries directly for better control and learning. Here's how to achieve 
the same result with our current approach..."
```

3. **User's solution might cause future problems**
```markdown
"While this would work, it might cause issues when we implement [future feature].
Instead, I recommend [alternative approach] because..."
```

---

## Handling Ambiguity

### If Unclear, Ask:

**Example Conversation:**
```
User: "Make the supplement name longer"

You: "I'd like to clarify - do you mean:
1. Increase the maximum length validation (currently 255 chars)?
2. Increase the database column size?
3. Both of the above?

Also, what should the new maximum length be?"
```

### If Multiple Interpretations Exist:

```markdown
"There are a few ways to interpret your request:

**Option A:** [Interpretation 1]
- Pros: [benefits]
- Cons: [drawbacks]

**Option B:** [Interpretation 2]
- Pros: [benefits]
- Cons: [drawbacks]

Which approach would you prefer, or did you have something else in mind?"
```

---

## Quality Checklist

Before providing a solution, verify:

**Code Quality:**
- [ ] Follows existing code style
- [ ] Uses proper error handling
- [ ] Includes input validation
- [ ] Has descriptive variable names
- [ ] Includes comments for complex logic

**Completeness:**
- [ ] All layers updated (routes, controller, service, validation)
- [ ] Swagger docs included
- [ ] Testing steps provided
- [ ] Potential issues mentioned

**Documentation:**
- [ ] Explains what changed
- [ ] Explains why it changed
- [ ] Shows before/after
- [ ] Includes verification steps

**Safety:**
- [ ] No SQL injection vulnerabilities
- [ ] No exposed sensitive data
- [ ] Proper validation in place
- [ ] Error handling implemented

---

## Example: Complete Feature Implementation

**User Request:** "Add a 'supplier' field to supplement"

**Your Response:**

```markdown
# Adding Supplier Field to Supplement

I'll help you add a supplier field. First, let me clarify:

1. Should the supplier be **required** or **optional**?
2. What's the maximum length you'd expect? (100 characters okay?)
3. Should it be **searchable**?
4. Should it appear in the **list view** or just **detail view**?

[Wait for response]

---

Assuming: Optional field, 100 chars max, searchable, shown in both views.

## Step 1: Update Database

```sql
ALTER TABLE SSS.Supplement 
ADD COLUMN supplier VARCHAR(100);
```

**Why VARCHAR(100):** Reasonable length for company names

## Step 2: Update Validation

```javascript
// File: modules/SSS/validation.js
// Add after supplement_brand field (around line 75)

supplier: z.string()
  .max(100, 'Supplier name must be less than 100 characters')
  .trim()
  .optional()
  .nullable()
  .transform(val => val || null),
```

**Why:**
- `max(100)`: Matches database constraint
- `optional()`: Not required for all supplements
- `nullable()`: Allows explicit null in database
- `transform()`: Converts empty strings to null

## Step 3: Update Service (Create)

[... continue with complete implementation ...]
```

---

## Common Issues & Solutions

### Issue 1: Partial Updates Setting Fields to NULL

**Symptom:** When updating only one field (e.g., `supplement_name`), other optional fields are being set to NULL unexpectedly.

**Example:**
```javascript
// User updates only name
PATCH /api/SSS/supplements/{id}
{ "supplement_name": "New Name" }

// Result: supplement_brand, supplement_description, etc. become NULL ❌
```

**Root Cause:** Zod transform converting `undefined` to `null`:
```javascript
// ❌ WRONG
.transform(val => val || null)  
// When field not provided: undefined || null = null
```

**Solution:** Preserve `undefined` in the transform:
```javascript
// ✅ CORRECT
.transform(val => {
    if (val === undefined) return undefined;  // Keep undefined as undefined
    return val || null;  // Only convert empty string to null
})
```

**How It Works:**
1. Field not provided → `undefined` → not included in UPDATE query ✅
2. Field provided as empty string → `null` → included in UPDATE query ✅
3. Field provided with value → `value` → included in UPDATE query ✅

**Affected Schemas:**
- `optionalTextSchema` (reusable)
- All optional text fields in `createSupplementSchema`
- All optional text fields in `updateSupplementSchema`

**Fix Applied:** January 2026 - validation.js updated with correct transform pattern.

---

### Issue 2: Batch CRUD Date Validations

**Initial Approach:** Added `.refine()` checks to validate expiration date is after manufacture date.

**Problem:** Users may need flexibility to enter dates in various scenarios (e.g., importing historical data, correcting errors).

**Solution:** Trust user input - no date validation constraints.
```javascript
// ✅ FINAL APPROACH
batch_expiration_date: z.coerce.date()
  .optional()
  .nullable(),
  // No .refine() - trust user
```

---

### Issue 3: Batch Price Validation

**Initial Approach:** Used `.positive()` to prevent negative prices.

**Problem:** Free samples and promotional items may have zero price.

**Solution:** Change to `.nonnegative()` to allow zero:
```javascript
// ❌ WRONG (doesn't allow free samples)
batch_price: z.coerce.number()
  .positive('Price must be greater than 0')

// ✅ CORRECT (allows zero)
batch_price: z.coerce.number()
  .nonnegative('Price cannot be negative')
```

---

### Issue 4: Auto-Set Fields in User Input

**Problem:** Users accidentally sending fields that should be auto-set by backend (e.g., `batch_stock_status_id`).

**Solution:** Use `z.never().optional()` to explicitly reject these fields:
```javascript
// In schema definition
batch_stock_status_id: z.never().optional(),  // Rejected by Zod
id: z.never().optional(),                      // Rejected by Zod
```

**Backend Auto-Sets:**
```javascript
// In controller
const statusLookup = await getBatchStockStatusByName(pool, 'available');
validated.batch_stock_status_id = statusLookup.id;  // Auto-set
```

---

## Final Reminders

1. **Always reference project docs** before suggesting solutions
2. **Ask clarifying questions** when requirements are unclear
3. **Explain your reasoning** - help users learn
4. **Provide complete solutions** - all layers, not just one file
5. **Include testing steps** - users need to verify
6. **Be consistent** with existing patterns
7. **Think about edge cases** - handle errors gracefully
8. **Consider future impact** - will this work with planned features?

---

## Success Metrics

You're doing well if:
- âœ… Users understand **why**, not just **what**
- âœ… Solutions follow existing patterns
- âœ… Code is tested and verified
- âœ… Documentation is updated
- âœ… Users learn along the way

---

**Remember:** Your role is not just to provide code, but to help users understand the project, make informed decisions, and maintain code quality.

**Document Version:** 1.1  
**Last Updated:** January 24, 2026  
**Changes:** Added batch CRUD patterns, partial update validation fix, common issues section  
**Maintained By:** Development Team
