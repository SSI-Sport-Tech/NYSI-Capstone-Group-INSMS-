# NYSI Project - Working with Claude

## Purpose
This document provides guidelines for effective collaboration between you and Claude (AI assistant) on the NYSI Nutritionist Web Application project.

**Last Updated:** January 20, 2026  
**Version:** 1.0

---

## 📋 Quick Start

### Before You Begin

**Read These Files First:**
1. **PROJECT_ARCHITECTURE.md** - Understand the system structure
2. **DATABASE_SCHEMA.md** - Know the database schema
3. **USE_CASES_IMPLEMENTATION.md** - See what's implemented and what's planned

### How to Work with Claude

**Core Principle:** Claude is your collaborative partner, not a code generator. Always provide context, ask for clarifications, and review the output.

---

## 🎯 Communication Guidelines

### 1. Always Provide Context

❌ **Don't Say:**
> "Add a new field to the supplement table"

✅ **Do Say:**
> "I need to add a 'supplier' field to the SSS.Supplement table. This should store the name of the company that supplies the supplement. It's optional (nullable), should be searchable, and display in both list and detail views. Maximum length should be 100 characters."

**Why:** Detailed context helps Claude provide accurate, complete solutions that match your actual needs.

---

### 2. Ask for Clarifications Before Implementation

When you have an idea or requirement, start with:

**Template:**
```
I want to [describe feature/change].

Before implementing, please help me clarify:
1. [Question about approach]
2. [Question about data structure]
3. [Question about business logic]
4. [Question about implications]
```

**Example:**
```
I want to add batch testing verification for supplements.

Before implementing, please help me clarify:
1. Should batch testing be required for all supplements or optional?
2. What information do we need to track (testing org, date, certificate number)?
3. Should we allow multiple test results per supplement?
4. How should this interact with the existing batch_testing_org field?
```

**Why:** Clarifying requirements upfront prevents rework and ensures the solution aligns with your vision.

---

### 3. Use Step-by-Step Approach

For complex features, break them into phases:

**Template:**
```
Feature: [Name]

Phase 1: Database changes
Phase 2: Validation and business logic  
Phase 3: API endpoint
Phase 4: Documentation and testing

Let's start with Phase 1. Can you help me design the database changes needed?
```

**Why:** Step-by-step implementation is easier to review, test, and debug.

---

## 🛠️ Implementation Workflow

### Step 1: Define the Requirement

**You:** Describe what you want to build

**Example:**
```
I need to implement batch CRUD operations so nutritionists can create, view, update, and delete inventory batches.
```

---

### Step 2: Clarification Questions

**Claude:** Will ask clarifying questions

**Example Questions Claude Might Ask:**
- What fields are required vs optional for batch creation?
- Should batch deletion be hard delete or soft delete?
- How should batch updates handle stock changes?
- What validation rules should apply?
- Should we check for related tickets before deletion?

**You:** Answer each question with specific details

---

### Step 3: Review the Plan

**Claude:** Will propose an implementation plan

**Example Plan:**
```
Implementation Plan for Batch CRUD:

1. Database Layer (services.js)
   - createBatch()
   - getBatchById()
   - updateBatch()
   - deleteBatch()

2. Business Logic (controller.js)
   - Validation (Zod schema)
   - Business rules enforcement
   - Error handling

3. API Routes (routes.js)
   - POST /api/SSS/batches
   - GET /api/SSS/batches/:id
   - PATCH /api/SSS/batches/:id
   - DELETE /api/SSS/batches

4. Validation (validation.js)
   - createBatchSchema
   - updateBatchSchema
   - deleteBatchSchema

Does this plan align with your requirements?
```

**You:** Review and approve or request changes

---

### Step 4: Iterative Implementation

**Claude:** Will implement one component at a time

**You:** Review each component before moving to the next

**Best Practice:**
- Review database queries first
- Then business logic
- Then API endpoints
- Finally documentation

---

### Step 5: Testing Guidance

**Claude:** Will provide testing steps

**You:** Test in Swagger UI and provide feedback

**Feedback Loop:**
- ✅ Works as expected → Move to next feature
- ❌ Issues found → Claude helps debug and fix

---

## 📚 Reference Documentation

### When Asking Questions

**Always mention which documentation you've read:**

✅ **Good:**
> "I've read PROJECT_ARCHITECTURE.md and DATABASE_SCHEMA.md. Based on the current schema, I want to add a 'supplier' field to SSS.Supplement. Can you help me implement this?"

**Why:** Helps Claude understand your context level and avoid explaining what you already know.

---

### Documentation Hierarchy

**For Architecture Questions:**
→ Read `PROJECT_ARCHITECTURE.md`

**For Database Questions:**
→ Read `DATABASE_SCHEMA.md`

**For Feature Status:**
→ Read `USE_CASES_IMPLEMENTATION.md`

**For Getting Started:**
→ Read `ONBOARDING_GUIDE.md`

**For AI Collaboration Best Practices:**
→ Read `AI_ASSISTANT_GUIDELINES.md`

---

## 🔄 Common Scenarios

### Scenario 1: Adding a New Field

**Your Request:**
```
I want to add a 'supplier' field to the supplement table.
```

**Claude's Response:**
```
Before implementing, let me clarify:

1. **Field Details:**
   - Data type: VARCHAR or TEXT?
   - Maximum length?
   - Required or optional?
   - Default value?

2. **Functionality:**
   - Should it be searchable?
   - Should it appear in list view or detail view only?
   - Any validation rules (e.g., specific format)?

3. **Integration:**
   - Should existing supplements have a default supplier?
   - Any business logic tied to this field?

Could you provide these details?
```

**You Respond With:**
```
1. Field Details:
   - VARCHAR(100)
   - Maximum 100 characters
   - Optional (nullable)
   - Default: NULL

2. Functionality:
   - Yes, searchable
   - Show in both list and detail views
   - No special format required

3. Integration:
   - Existing supplements can be NULL
   - No special business logic
```

**Claude Implements:**
- Database ALTER TABLE
- Update validation.js
- Update services.js (create, update, get queries)
- Update routes.js (Swagger docs)
- Provide testing steps

---

### Scenario 2: Fixing a Bug

**Your Request:**
```
I'm getting an error when creating a supplement:
[paste error message]
```

**Claude's Response:**
```
Let me analyze this error:

[Error Analysis]
Root Cause: [Explanation]

Could you also provide:
1. The request body you sent
2. Expected behavior
3. What you've already tried

This will help me give you a precise solution.
```

**You Provide:**
```
1. Request body: [paste JSON]
2. Expected: Supplement should be created successfully
3. Tried: Restarted server, checked database connection
```

**Claude Provides:**
- Root cause explanation
- Fix with code changes
- Verification steps

---

### Scenario 3: Implementing a New Use Case

**Your Request:**
```
I want to implement UC-SSS-012: Create Batch.
Reference: USE_CASES_IMPLEMENTATION.md
```

**Claude's Response:**
```
Great! I see UC-SSS-012 in USE_CASES_IMPLEMENTATION.md.

Before we start, let me confirm the requirements:

Based on the use case, I understand:
- Endpoint: POST /api/SSS/batches
- Required fields: supplement_id, batch_number, batch_initial_quantity
- Optional fields: batch_price, expiration_date, manufacture_date

Questions:
1. Should batch_number be unique globally or per supplement?
2. Any validation on batch_initial_quantity (min/max)?
3. Should we auto-set batch_stock_status_id or require it?
4. Any relationship checks (e.g., does supplement_id exist)?

Please clarify these points.
```

**You Clarify:**
```
1. Unique globally across all batches
2. Min = 1, no maximum
3. Default to "Pending" status initially
4. Yes, verify supplement_id exists, return 400 if not
```

**Claude Implements:**
Full implementation with all layers

---

## ⚠️ Important Reminders

### 1. Always Reference Project Files

When Claude suggests changes, it will reference specific files and line numbers:

```javascript
// File: modules/SSS/services.js
// Location: Around line 320
// What: Add supplier field to INSERT query

export async function createSupplement(supplementData) {
  const query = `
    INSERT INTO SSS.Supplement (
      supplement_name,
      supplier,  // ← New field added here
      ...
    ) VALUES (
      $1, $2, ...
    )
  `;
  ...
}
```

**You:** Review the exact location and verify it makes sense

---

### 2. Follow Project Conventions

Claude knows the project conventions from `AI_ASSISTANT_GUIDELINES.md`:

- **ES Modules** (not CommonJS)
- **Zod validation** (not Joi)
- **Parameterized queries** (not ORM)
- **Schema prefix** (SSS.Supplement, not Supplement)
- **4-layer architecture** (Routes → Controller → Service → Database)

**You:** Trust these conventions unless you want to change them (then discuss with Claude)

---

### 3. Test Before Moving Forward

After Claude provides implementation:

1. **Restart Server:** `npm start`
2. **Open Swagger:** http://localhost:8000/docs
3. **Test the endpoint**
4. **Verify in database** (if needed)
5. **Report results to Claude**

**Don't:** Skip testing and implement the next feature

---

### 4. Provide Feedback

After testing:

✅ **If it works:**
```
Perfect! The supplier field is working as expected. 
I tested creating and searching supplements with supplier, both work great.
Ready to move to the next feature.
```

❌ **If it doesn't work:**
```
Found an issue: When I search by supplier name, it's not returning results.
Error: [paste error or describe behavior]
Expected: Should return supplements with matching supplier
```

**Claude will:** Debug and provide a fix

---

## 🎓 Learning Mode

### Ask "Why" Questions

Don't just get code - understand it!

**Examples:**
```
Why did you use JSONB for ingredients instead of a separate table?
Why parameterized queries instead of an ORM like Sequelize?
Why is batch_testing_org auto-set based on status?
```

**Claude will:** Explain the reasoning and trade-offs

---

### Request Alternatives

Ask for different approaches:

```
You suggested [approach A]. 
What would be the pros/cons if we used [approach B] instead?
```

**Claude will:** Compare options and help you decide

---

## 📝 Code Review Checklist

When Claude provides code, check:

**Database Queries:**
- [ ] Uses schema prefix (SSS.Supplement)
- [ ] Uses parameterized queries ($1, $2)
- [ ] Handles NULL values properly
- [ ] Includes proper JOINs for lookup tables

**Validation:**
- [ ] All required fields validated
- [ ] Proper data types (UUID, string, number)
- [ ] Error messages are clear
- [ ] Optional fields have nullable() and transform()

**Business Logic:**
- [ ] Follows existing patterns
- [ ] Business rules enforced
- [ ] Edge cases handled
- [ ] Error responses user-friendly

**API Documentation:**
- [ ] Swagger docs complete
- [ ] Request examples provided
- [ ] Response examples provided
- [ ] Error cases documented

---

## 🚀 Best Practices

### 1. One Feature at a Time

❌ **Don't:**
```
Add supplier field, implement batch CRUD, add authentication, and set up OCR integration
```

✅ **Do:**
```
Let's add the supplier field first. Once that's working, we'll move to batch CRUD.
```

---

### 2. Incremental Changes

❌ **Don't:**
```
Rewrite the entire services.js file to use a different pattern
```

✅ **Do:**
```
Let's refactor the createSupplement function first. If it works well, we can apply the same pattern to other functions.
```

---

### 3. Document as You Go

After implementing a feature:
```
Can you help me update the documentation?

1. Add this to USE_CASES_IMPLEMENTATION.md
2. Update DATABASE_SCHEMA.md with the new field
3. Update PROJECT_ARCHITECTURE.md if needed
```

---

## 🔍 Debugging Together

### When Something Goes Wrong

**Step 1: Gather Information**
```
Issue: [Describe what's wrong]
Error: [Paste full error message]
Request: [What you sent to API]
Expected: [What should happen]
Actual: [What actually happened]
```

**Step 2: Claude Analyzes**
```
Root Cause: [Explanation]
Fix: [Code changes needed]
Why This Happened: [Technical explanation]
Prevention: [How to avoid in future]
```

**Step 3: Implement & Test**
```
Please verify:
1. [Verification step 1]
2. [Verification step 2]
```

**Step 4: Confirm Fix**
```
✅ Fixed! Here's what I tested:
[List of test cases]
```

---

## 📊 Progress Tracking

### Keep Claude Updated

**Start of Session:**
```
Hi Claude! I'm working on the NYSI project. 
Last time we finished implementing supplement CRUD.
Today I want to work on batch CRUD operations.

Reference: USE_CASES_IMPLEMENTATION.md shows UC-SSS-012 as planned.
```

**End of Session:**
```
Great work today! We completed:
✅ Batch creation endpoint
✅ Validation for batch fields
✅ Tested in Swagger - all working

Next session:
📋 Implement batch update (PATCH)
📋 Implement batch delete (DELETE)
```

**Why:** Helps Claude maintain context across sessions

---

## ⚡ Quick Commands

### Request Code Review
```
Can you review this code for potential issues?
[paste code]
```

### Request Explanation
```
Can you explain how this function works?
[paste function or reference file and line number]
```

### Request Alternative Approach
```
Current approach: [describe]
Concerns: [list concerns]
Can you suggest alternatives?
```

### Request Testing Help
```
How should I test this feature?
What edge cases should I check?
```

---

## 🎯 Example: Complete Feature Implementation

### Request:
```
I want to implement batch CRUD operations (UC-SSS-012 through UC-SSS-014).

Reference files:
- USE_CASES_IMPLEMENTATION.md (UC-SSS-012, 013, 014)
- DATABASE_SCHEMA.md (SSS.Inventory_Batch table)
- PROJECT_ARCHITECTURE.md (module structure)

Before we start, can you:
1. Confirm you understand the requirements
2. Ask any clarifying questions
3. Propose an implementation order
```

### Claude Responds:
```
✅ I've read the reference files. I understand:
- UC-SSS-012: Create batch
- UC-SSS-013: Update batch  
- UC-SSS-014: Delete batch

Clarifying questions:

1. **Batch Creation:**
   - Should batch_number be auto-generated or user-provided?
   - Required fields vs optional?
   - Default batch_stock_status_id?

2. **Batch Update:**
   - Can we update batch_initial_quantity after tickets exist?
   - Any fields that shouldn't be updateable?

3. **Batch Deletion:**
   - Hard delete or soft delete?
   - What if tickets exist for this batch?
   - Cascade delete tickets or prevent deletion?

Proposed Implementation Order:
1. View Batch Details (GET) - foundation for others
2. Create Batch (POST)
3. Update Batch (PATCH)
4. Delete Batch (DELETE)

This order allows us to test each feature before building the next.

Please provide your answers to the clarifying questions.
```

### You Clarify:
```
1. Batch Creation:
   - User-provided batch_number (must be unique)
   - Required: supplement_id, batch_number, batch_initial_quantity
   - Default status: "Pending" (we'll need the UUID)

2. Batch Update:
   - Allow quantity updates only if no tickets
   - All fields updateable except id and supplement_id

3. Batch Deletion:
   - Hard delete for now (soft delete in Phase 2)
   - If tickets exist: return 409 Conflict with error message
   - Do NOT cascade - protect data integrity
```

### Claude Implements:
```
Perfect! Let's start with View Batch Details (GET).

**Step 1: Service Layer** (modules/SSS/services.js)

[Provides getBatchById() implementation]

**Step 2: Controller Layer** (modules/SSS/controller.js)

[Provides getBatchDetails() implementation]

**Step 3: Routes Layer** (modules/SSS/routes.js)

[Provides GET route + Swagger docs]

**Step 4: Testing**

Test in Swagger:
1. Open http://localhost:8000/docs
2. Expand GET /api/SSS/batches/:id
3. Use this UUID: [existing batch ID from your database]
4. Expected: Full batch details with stock calculations

Please test and report results!
```

### You Test and Report:
```
✅ Tested successfully!

Results:
- GET returns full batch details
- Stock calculations correct (booked + available)
- Related supplement info included
- 404 for invalid UUID works correctly

Ready for next step: Create Batch (POST)
```

### Continue Until Complete:
- Claude implements CREATE
- You test
- Claude implements UPDATE
- You test
- Claude implements DELETE
- You test
- Update documentation together

---

## 📢 Communication Best Practices

### Be Specific
❌ "It's not working"  
✅ "When I try to create a batch, I get a 400 error: 'Invalid supplement_id'"

### Provide Context
❌ "How do I add a field?"  
✅ "Looking at DATABASE_SCHEMA.md, I want to add a 'supplier' field to SSS.Supplement. How should I implement this following our project architecture?"

### Confirm Understanding
❌ [Implement without confirming]  
✅ "Before I implement this, let me confirm: You're suggesting [X]. Is that correct?"

### Share Results
❌ [Move on without feedback]  
✅ "Tested the implementation - works perfectly! Here's what I verified: [list]"

---

## 🎉 Success Metrics

You're collaborating effectively when:

✅ You ask clarifying questions before implementing  
✅ You reference project documentation  
✅ You test incrementally  
✅ You provide specific feedback  
✅ You understand the "why" behind solutions  
✅ You maintain project conventions  
✅ You update documentation as you go

---

## 💡 Remember

**Claude's Role:**
- Collaborative partner
- Technical guide
- Code reviewer
- Learning facilitator

**Your Role:**
- Project owner
- Decision maker
- Requirements provider
- Final reviewer

**Together:**
- Build high-quality software
- Maintain clean architecture
- Follow best practices
- Learn and improve

---

## 📞 Quick Reference

**Starting a Session:**
```
Hi Claude! Working on NYSI project.
Completed: [what's done]
Today's goal: [what you want to do]
Reference: [relevant docs]
```

**Asking for Implementation:**
```
Feature: [name]
Requirements: [details]
Reference: [docs]

Before implementing, please clarify: [questions]
```

**Providing Feedback:**
```
Tested [feature]:
✅ Works: [what works]
❌ Issues: [what doesn't]
Details: [specifics]
```

**Debugging:**
```
Issue: [describe]
Error: [paste]
Expected: [what should happen]
Tried: [what you attempted]
```

---

**Remember:** Good collaboration = Clear communication + Iterative development + Continuous testing

**Happy Coding!** 🚀

---

**Document Version:** 1.0  
**Last Updated:** January 20, 2026  
**Maintained By:** Development Team
