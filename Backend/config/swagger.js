import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "HPSI Backend API",
            version: "2.1.0", // ✅ UPDATED: Incremented version
            description:
                "HPSI - Supplement Management System API. Comprehensive API for managing supplements, inventory batches, athlete profiles, and web scraping operations.",
            contact: {
                name: "HPSI Development Team",
                email: "dev@hpsi.com",
            },
            license: {
                name: "MIT",
                url: "https://opensource.org/licenses/MIT",
            },
        },
        servers: [
            {
                url: "http://localhost:8000",
                description: "Development server",
            },
            {
                url: "https://your-production-url.com",
                description: "Production server",
            },
        ],
        tags: [
            {
                name: "Health",
                description: "Health check and system status endpoints",
            },
            // ==================== SSS (Supplement Management) ====================
            {
                name: "SSS - Supplements",
                description: "Supplement library management - CRUD operations, search, and similarity matching",
            },
            {
                name: "SSS - Inventory",
                description: "Batch inventory management and stock tracking",
            },
            {
                name: "SSS - Staging",
                description: "Supplement staging area - Web scraper data review and approval",
            },
            {
                name: "SSS - Catalog URLs",
                description: "Manage web scraping catalog URLs",
            },
            {
                name: "SSS - Scraping",
                description: "Web scraping operations",
            },
            {
                name: "SSS - Lookups",
                description: "SSS lookup tables for dropdowns (packaging forms, statuses)",
            },
            // ==================== AMS (Athlete Management) ====================
            {
                name: "AMS - Athletes",
                description: "Athlete Management System - CRUD, registry, and medical records",
            },
            {
                name: "AMS - Sports",
                description: "Sport lookup admin CRUD - create, list, and delete sports",
            },
            {
                name: "AMS - Coaches",
                description: "Coach management - CRUD operations for coaches",
            },
            {
                name: "AMS - Nutritionists",
                description: "Nutritionist management - CRUD operations for nutritionists",
            },
            {
                name: "AMS - Lookups",
                description: "AMS lookup tables for dropdowns (sports)",
            },
            // ==================== Consultation ====================
            {
                name: "Consultation - Consultation Session",
                description: "Consultation Session — session-level fields (consult date, follow-up date, nutritionist, consult type)",
            },
            {
                name: "Consultation - Actionables",
                description: "Actionables card — follow-up action items for a consultation session",
            },
            {
                name: "Consultation - Lookups",
                description: "Consultation lookup tables for dropdowns (consult types, nutrition diagnoses)",
            },
            {
                name: "Consultation - Nutrition Diagnosis Summary",
                description: "Nutrition Diagnosis Summary — session-level notes, nutrition diagnosis reviews, and remarks",
            },

            {
                name: "Consultation - Training Schedule",
                description: "Manage athlete daily training schedules, RPE, and performance details for a session",
            },
            {
                name: "Consultation - Meal Log",
                description: "Manage athlete meal logs and macronutrient intake for a session",
            },

            {
                name: "Consultation - Anthropometry",
                description: "Anthropometry card — height/weight/body composition + BMI category for a session",
            },
            {
                name: "Consultation - Nutrition Requirements",
                description: "Nutrition Requirements card — nutrition requirements, estimated intake, PAL, comments, and computed outputs",
            },
            {
                name: "Consultation - Medical History",
                description: "Medical History card — athlete medical conditions, allergies, puberty, bowel movement, hydration, and period data",
            },
            {
                name: "Consultation - Supplement Dispensing",
                description: "Supplement Dispensing card — manage supplement dispensing per session, with automatic inventory ticket creation and batch stock status updates",
            },
            // ==================== Other ====================
            {
                name: "OCR",
                description: "OCR and text extraction services",
            },
            {
                name: "Authentication",
                description: "User authentication, login, logout, and 2FA",
            },
            {
                name: "Admin",
                description: "Admin user management endpoints (ADMIN and IT_ADMIN only)",
            },
        ],
        components: {
            schemas: {
                // ==================== TRAINING SCHEDULE SCHEMAS ====================
                TrainingScheduleEntry: {
                    type: "object",
                    required: ["dayOfWeek", "activity"],
                    properties: {
                        dayOfWeek: {
                            type: "string",
                            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                            description: "Day of the week (title case)",
                        },
                        timeStart: {
                            type: "string",
                            nullable: true,
                            pattern: "^\\d{2}:\\d{2}$",
                            description: "Start time in HH:MM format",
                            example: "09:00",
                        },
                        timeEnd: {
                            type: "string",
                            nullable: true,
                            pattern: "^\\d{2}:\\d{2}$",
                            description: "End time in HH:MM format",
                            example: "10:30",
                        },
                        activity: {
                            type: "string",
                            maxLength: 4000,
                            description: "Description of the training activity",
                        },
                        rpe: {
                            type: "integer",
                            nullable: true,
                            minimum: 1,
                            maximum: 10,
                            description: "Rating of Perceived Exertion (1–10)",
                        },
                    },
                },

                TrainingSchedulePayload: {
                    type: "object",
                    required: ["trainingInfo", "schedule"],
                    properties: {
                        trainingInfo: {
                            type: "object",
                            properties: {
                                upcomingMajorCompetitions: { type: "string", nullable: true, maxLength: 4000 },
                                upcomingLocalCompetitions: { type: "string", nullable: true, maxLength: 4000 },
                                currentPerformance: { type: "string", nullable: true, maxLength: 4000 },
                                coachPerformanceGoals: { type: "string", nullable: true, maxLength: 4000 },
                                athletePerformanceGoals: { type: "string", nullable: true, maxLength: 4000 },
                                otherRemarks: { type: "string", nullable: true, maxLength: 4000 },
                                pal: {
                                    type: "number",
                                    format: "float",
                                    nullable: true,
                                    minimum: 0,
                                    maximum: 5,
                                    description: "Physical Activity Level",
                                },
                                rpeWeek: {
                                    type: "integer",
                                    nullable: true,
                                    minimum: 1,
                                    maximum: 10,
                                    description: "Overall weekly RPE (1–10)",
                                },
                            },
                        },
                        schedule: {
                            type: "array",
                            items: { $ref: "#/components/schemas/TrainingScheduleEntry" },
                            description: "List of individual training sessions for the week",
                        },
                    },
                },

                TrainingScheduleResponse: {
                    type: "object",
                    properties: {
                        trainingInfo: {
                            type: "object",
                            properties: {
                                upcomingMajorCompetitions: { type: "string", nullable: true },
                                upcomingLocalCompetitions: { type: "string", nullable: true },
                                currentPerformance: { type: "string", nullable: true },
                                coachPerformanceGoals: { type: "string", nullable: true },
                                athletePerformanceGoals: { type: "string", nullable: true },
                                otherRemarks: { type: "string", nullable: true },
                                pal: { type: "number", format: "float", nullable: true },
                                rpeWeek: { type: "integer", nullable: true },
                            },
                        },
                        schedule: {
                            type: "array",
                            items: { $ref: "#/components/schemas/TrainingScheduleEntry" },
                        },
                        lastUpdatedAt: { type: "string", format: "date-time", nullable: true },
                        lastUpdatedBy: { type: "string", nullable: true },
                    },
                },

                MealLogEntry: {
                    type: "object",
                    required: ["mealDescription"],
                    properties: {
                        foodTime: {
                            type: "string",
                            nullable: true,
                            pattern: "^\\d{2}:\\d{2}$",
                            description: "Meal time in HH:MM format",
                            example: "07:30",
                        },
                        mealDescription: { type: "string", maxLength: 4000, description: "Description of what was eaten" },
                        lowerCarbG: { type: "number", format: "float", nullable: true, minimum: 0 },
                        upperCarbG: { type: "number", format: "float", nullable: true, minimum: 0 },
                        lowerProteinG: { type: "number", format: "float", nullable: true, minimum: 0 },
                        upperProteinG: { type: "number", format: "float", nullable: true, minimum: 0 },
                        lowerFatG: { type: "number", format: "float", nullable: true, minimum: 0 },
                        upperFatG: { type: "number", format: "float", nullable: true, minimum: 0 },
                    },
                },
                MealLogSleep: {
                    type: "object",
                    nullable: true,
                    properties: {
                        sleepDurationH: { type: "number", format: "float", nullable: true, minimum: 0, maximum: 24, description: "Sleep duration in hours" },
                        sleepQuality: { type: "integer", nullable: true, minimum: 1, maximum: 10, description: "Sleep quality rating (1–10)" },
                        otherRemarks: { type: "string", nullable: true, maxLength: 4000 },
                    },
                },
                MealLogPayload: {
                    type: "object",
                    properties: {
                        entries: {
                            type: "array",
                            items: { $ref: "#/components/schemas/MealLogEntry" },
                            description: "List of meal entries for the day",
                        },
                        mealOtherRemarks: { type: "string", nullable: true, maxLength: 4000 },
                        sleep: { $ref: "#/components/schemas/MealLogSleep" },
                    },
                },
                MealLogResponse: {
                    allOf: [
                        { $ref: "#/components/schemas/MealLogPayload" },
                        {
                            type: "object",
                            properties: {
                                lastUpdatedAt: { type: "string", format: "date-time", nullable: true },
                                lastUpdatedBy: { type: "string", nullable: true },
                            },
                        },
                    ],
                },
                AnthropometryPatchRequest: {
                    type: "object",
                    properties: {
                        heightCm: { type: "number", format: "float", nullable: true },
                        weightKg: { type: "number", format: "float", nullable: true },
                        targetWeightKg: { type: "number", format: "float", nullable: true },
                        fatMassKg: { type: "number", format: "float", nullable: true },
                        skeletalMuscleMassKg: { type: "number", format: "float", nullable: true },

                        bmiCategory: { type: "string", nullable: true, enum: ["Normal", "Underweight", "Overweight", "Obese"] },
                        sumOf8Skinfold: { type: "number", format: "float", nullable: true },
                        motherHeightCm: { type: "number", format: "float", nullable: true },
                        fatherHeightCm: { type: "number", format: "float", nullable: true },
                        otherRemarks: { type: "string", nullable: true, maxLength: 4000 },
                        dateRecorded: { type: "string", format: "date", nullable: true, description: "Date measurements were taken (YYYY-MM-DD)" },
                        measuredBy: { type: "string", nullable: true, maxLength: 255, description: "Name of the person who took the measurements" },
                        athletePotentialAdultHeightCm: { type: "integer", nullable: true, minimum: 0, maximum: 300 },
                    },
                },

                AnthropometryResponse: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid", nullable: true },
                        sessionId: { type: "string", format: "uuid" },

                        heightCm: { type: "number", format: "float", nullable: true },
                        weightKg: { type: "number", format: "float", nullable: true },
                        bmi: { type: "number", format: "float", nullable: true },
                        bmiCategory: { type: "string", nullable: true },

                        fatMassKg: { type: "number", format: "float", nullable: true },
                        fatMassPct: { type: "number", format: "float", nullable: true },
                        skeletalMuscleMassKg: { type: "number", format: "float", nullable: true },
                        skeletalMuscleMassPct: { type: "number", format: "float", nullable: true },

                        sumOf8Skinfold: { type: "number", format: "float", nullable: true },
                        targetWeightKg: { type: "number", format: "float", nullable: true },
                        targetBmi: { type: "number", format: "float", nullable: true },

                        motherHeightCm: { type: "number", format: "float", nullable: true },
                        fatherHeightCm: { type: "number", format: "float", nullable: true },

                        athletePotentialAdultHeightCm: { type: "integer", nullable: true },
                        otherRemarks: { type: "string", nullable: true },
                        dateRecorded: { type: "string", format: "date", nullable: true },
                        measuredBy: { type: "string", nullable: true },
                        lastUpdatedAt: { type: "string", format: "date-time", nullable: true },
                        lastUpdatedBy: { type: "string", nullable: true },
                    },
                },

                NutritionRequirementsPatchRequest: {
                    type: "object",
                    properties: {
                        pal: { type: "number", format: "float", nullable: true },

                        minCarbGkg: { type: "number", format: "float", nullable: true },
                        maxCarbGkg: { type: "number", format: "float", nullable: true },
                        minProteinGkg: { type: "number", format: "float", nullable: true },
                        maxProteinGkg: { type: "number", format: "float", nullable: true },
                        minFatGkg: { type: "number", format: "float", nullable: true },
                        maxFatGkg: { type: "number", format: "float", nullable: true },

                        estimatedCarbG: { type: "number", format: "float", nullable: true },
                        estimatedProteinG: { type: "number", format: "float", nullable: true },
                        estimatedFatG: { type: "number", format: "float", nullable: true },

                        commentsWeekday: { type: "string", nullable: true, maxLength: 4000 },
                        commentsWeekend: { type: "string", nullable: true, maxLength: 4000 },
                        otherRemarks: { type: "string", nullable: true, maxLength: 4000 },
                    },
                },

                NutritionRequirementsResponse: {
                    type: "object",
                    properties: {
                        id: { type: "string", format: "uuid", nullable: true },
                        sessionId: { type: "string", format: "uuid" },

                        pal: { type: "number", format: "float", nullable: true },

                        minCarbGkg: { type: "number", format: "float", nullable: true },
                        maxCarbGkg: { type: "number", format: "float", nullable: true },
                        minProteinGkg: { type: "number", format: "float", nullable: true },
                        maxProteinGkg: { type: "number", format: "float", nullable: true },
                        minFatGkg: { type: "number", format: "float", nullable: true },
                        maxFatGkg: { type: "number", format: "float", nullable: true },

                        estimatedCarbG: { type: "number", format: "float", nullable: true },
                        estimatedProteinG: { type: "number", format: "float", nullable: true },
                        estimatedFatG: { type: "number", format: "float", nullable: true },

                        commentsWeekday: { type: "string", nullable: true },
                        commentsWeekend: { type: "string", nullable: true },
                        otherRemarks: { type: "string", nullable: true },

                        // computed outputs
                        minCarbG: { type: "number", format: "float", nullable: true },
                        maxCarbG: { type: "number", format: "float", nullable: true },
                        minProteinG: { type: "number", format: "float", nullable: true },
                        maxProteinG: { type: "number", format: "float", nullable: true },
                        minFatG: { type: "number", format: "float", nullable: true },
                        maxFatG: { type: "number", format: "float", nullable: true },

                        targetMinCarbG: { type: "number", format: "float", nullable: true },
                        targetMaxCarbG: { type: "number", format: "float", nullable: true },
                        targetMinProteinG: { type: "number", format: "float", nullable: true },
                        targetMaxProteinG: { type: "number", format: "float", nullable: true },
                        targetMinFatG: { type: "number", format: "float", nullable: true },
                        targetMaxFatG: { type: "number", format: "float", nullable: true },

                        pctMinCarb: { type: "number", format: "float", nullable: true },
                        pctMinProtein: { type: "number", format: "float", nullable: true },
                        pctMinFat: { type: "number", format: "float", nullable: true },

                        rmrMale: { type: "number", format: "float", nullable: true },
                        teeMale: { type: "number", format: "float", nullable: true },
                        targetRmrMale: { type: "number", format: "float", nullable: true },
                        targetTeeMale: { type: "number", format: "float", nullable: true },

                        rmrFemale: { type: "number", format: "float", nullable: true },
                        teeFemale: { type: "number", format: "float", nullable: true },
                        targetRmrFemale: { type: "number", format: "float", nullable: true },
                        targetTeeFemale: { type: "number", format: "float", nullable: true },
                    },
                },

                // ==================== SUPPLEMENT SCHEMAS ====================

                // Full Supplement Schema (for detailed view)
                SupplementDetail: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "Unique supplement identifier",
                            example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                        },
                        supplement_name: {
                            type: "string",
                            description: "Name of the supplement",
                            example: "Vitamin D3 2000 IU",
                        },
                        supplement_brand: {
                            type: "string",
                            description: "Brand/manufacturer name",
                            example: "Nature Made",
                        },
                        supplement_packaging_form_id: {
                            type: "string",
                            format: "uuid",
                            description: "Reference to packaging form lookup table",
                        },
                        supplement_packaging_form: {
                            type: "string",
                            description: "Physical packaging form",
                            example: "BOTTLE",
                        },
                        supplement_status_id: {
                            type: "string",
                            format: "uuid",
                            description: "Reference to status lookup table",
                        },
                        supplement_status: {
                            type: "string",
                            description: "Testing status of supplement",
                            enum: ["BATCH TESTED", "NOT BATCH TESTED", "DISCONTINUED"],
                            example: "BATCH TESTED",
                        },
                        batch_testing_org: {
                            type: "string",
                            nullable: true,
                            description: "Testing organization (e.g., NSF, USP) or 'NIL' if not tested",
                            example: "NSF Certified for Sport",
                        },
                        supplement_description: {
                            type: "string",
                            nullable: true,
                            description: "Detailed product description",
                        },
                        supplement_ingredient: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of ingredients",
                            example: ["Vitamin D3", "Gelatin", "Soybean Oil"],
                        },
                        nutritional_info_per_100g: {
                            type: "object",
                            nullable: true,
                            description: "Nutritional information per 100g",
                        },
                        nutritional_info_per_serving: {
                            type: "object",
                            nullable: true,
                            description: "Nutritional information per serving",
                        },
                        nutritional_info_per_serving_definition: {
                            type: "string",
                            nullable: true,
                            description: "Definition of serving size",
                            example: "1 softgel (0.5g)",
                        },
                        supplement_warning_label: {
                            type: "string",
                            nullable: true,
                            description: "Safety warnings and contraindications",
                        },
                        supplement_certifications: {
                            type: "string",
                            nullable: true,
                            description: "Quality certifications",
                            example: "NSF Certified for Sport, GMP Certified",
                        },
                        supplement_additional_information: {
                            type: "string",
                            nullable: true,
                            description: "Additional product notes",
                        },
                        product_source_url: {
                            type: "array",
                            items: {
                                type: "string",
                                format: "uri"
                            },
                            nullable: true,
                            description: "Array of URLs where product information can be found (product page, nutrition facts, reviews, etc.)",
                            example: [
                                "https://naturemade.com/products/vitamin-d3",
                                "https://naturemade.com/products/vitamin-d3/nutrition-facts"
                            ],
                        },
                        approved_by: {
                            type: "string",
                            format: "uuid",
                            description: "User ID who created/approved the supplement",
                        },
                    },
                    required: [
                        "id",
                        "supplement_name",
                        "supplement_packaging_form_id",
                        "supplement_status_id",
                        "approved_by",
                    ],
                },

                // Simplified Supplement Schema (for list views)
                Supplement: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "Unique supplement identifier",
                        },
                        supplement_name: {
                            type: "string",
                            description: "Name of the supplement",
                        },
                        supplement_brand: {
                            type: "string",
                            description: "Brand name",
                        },
                        supplement_packaging_form: {
                            type: "string",
                            description: "Packaging form (BOTTLE, TABLET, etc.)",
                        },
                        supplement_status: {
                            type: "string",
                            description: "Testing status",
                        },
                        batch_testing_org: {
                            type: "string",
                            nullable: true,
                            description: "Testing organization or 'NIL'",
                        },
                        product_source_url: {
                            type: "array",
                            items: {
                                type: "string",
                                format: "uri"
                            },
                            nullable: true,
                            description: "Product information URLs",
                            example: ["https://example.com/product"],
                        },
                    },
                },

                // Create Supplement Request Body
                CreateSupplementRequest: {
                    type: "object",
                    properties: {
                        supplement_name: {
                            type: "string",
                            minLength: 1,
                            maxLength: 255,
                            description: "Name of the supplement",
                            example: "Vitamin D3 2000 IU",
                        },
                        supplement_brand: {
                            type: "string",
                            maxLength: 255,
                            nullable: true,
                            description: "Brand/manufacturer name",
                            example: "Nature Made",
                        },
                        supplement_packaging_form_id: {
                            type: "string",
                            format: "uuid",
                            description: "Packaging form UUID from lookup table",
                        },
                        supplement_status_id: {
                            type: "string",
                            format: "uuid",
                            description: "Status UUID from lookup table",
                        },
                        batch_testing_org: {
                            type: "string",
                            maxLength: 255,
                            nullable: true,
                            description: "Testing organization (required if status is BATCH TESTED)",
                        },
                        supplement_description: {
                            type: "string",
                            nullable: true,
                            description: "Product description",
                        },
                        supplement_ingredient: {
                            type: "array",
                            items: { type: "string" },
                            nullable: true,
                            description: "List of ingredients",
                        },
                        nutritional_info_per_100g: {
                            type: "object",
                            nullable: true,
                            description: "Nutritional data per 100g",
                        },
                        nutritional_info_per_serving: {
                            type: "object",
                            nullable: true,
                            description: "Nutritional data per serving",
                        },
                        nutritional_info_per_serving_definition: {
                            type: "string",
                            nullable: true,
                            description: "Serving size definition",
                        },
                        supplement_warning_label: {
                            type: "string",
                            nullable: true,
                            description: "Safety warnings",
                        },
                        supplement_certifications: {
                            type: "string",
                            nullable: true,
                            description: "Certifications",
                        },
                        supplement_additional_information: {
                            type: "string",
                            nullable: true,
                            description: "Additional notes",
                        },
                        product_source_url: {
                            oneOf: [
                                {
                                    type: "string",
                                    format: "uri",
                                    description: "Single URL (will be converted to array)"
                                },
                                {
                                    type: "array",
                                    items: {
                                        type: "string",
                                        format: "uri"
                                    },
                                    description: "Array of URLs"
                                }
                            ],
                            nullable: true,
                            description: "Product website URL(s). Can provide a single URL string or an array of URLs. Single URLs are automatically converted to an array.",
                            example: ["https://example.com/product", "https://example.com/nutrition"],
                        },
                    },
                    required: [
                        "supplement_name",
                        "supplement_packaging_form_id",
                        "supplement_status_id",
                    ],
                },

                // Update Supplement Request Body (all fields optional)
                UpdateSupplementRequest: {
                    type: "object",
                    properties: {
                        supplement_name: { type: "string" },
                        supplement_brand: { type: "string", nullable: true },
                        supplement_packaging_form_id: { type: "string", format: "uuid" },
                        supplement_status_id: { type: "string", format: "uuid" },
                        batch_testing_org: { type: "string", nullable: true },
                        supplement_description: { type: "string", nullable: true },
                        supplement_ingredient: {
                            type: "array",
                            items: { type: "string" },
                            nullable: true,
                        },
                        nutritional_info_per_100g: { type: "object", nullable: true },
                        nutritional_info_per_serving: { type: "object", nullable: true },
                        nutritional_info_per_serving_definition: {
                            type: "string",
                            nullable: true,
                        },
                        supplement_warning_label: { type: "string", nullable: true },
                        supplement_certifications: { type: "string", nullable: true },
                        supplement_additional_information: { type: "string", nullable: true },
                        product_source_url: {
                            oneOf: [
                                {
                                    type: "string",
                                    format: "uri"
                                },
                                {
                                    type: "array",
                                    items: {
                                        type: "string",
                                        format: "uri"
                                    }
                                }
                            ],
                            nullable: true,
                            description: "Product URL(s) - string or array",
                        },
                    },
                },

                // ==================== ALTERNATIVE SUPPLEMENTS SCHEMAS (NEW) ====================

                AlternativeSupplementItem: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "Supplement UUID",
                        },
                        supplement_name: {
                            type: "string",
                            description: "Name of alternative supplement",
                        },
                        supplement_brand: {
                            type: "string",
                            nullable: true,
                            description: "Brand name",
                        },
                        similarity_score_100g: {
                            type: "string",
                            nullable: true,
                            description: "Similarity based on per-100g nutrition (e.g., '87%')",
                            example: "87%",
                        },
                        similarity_score_perserving: {
                            type: "string",
                            nullable: true,
                            description: "Similarity based on per-serving nutrition (e.g., '92%')",
                            example: "92%",
                        },
                        supplement_status: {
                            type: "string",
                            description: "Testing status",
                            example: "BATCH TESTED",
                        },
                        stock_status: {
                            type: "string",
                            enum: ["Available", "Low Stock", "Out of Stock"],
                            description: "Calculated stock availability",
                            example: "Available",
                        },
                    },
                    required: ["id", "supplement_name", "supplement_status", "stock_status"],
                },

                AlternativeSupplementsResponse: {
                    type: "object",
                    properties: {
                        currentSupplementId: {
                            type: "string",
                            format: "uuid",
                            description: "ID of the supplement being compared",
                        },
                        currentSupplementName: {
                            type: "string",
                            description: "Name of the supplement being compared",
                        },
                        alternatives: {
                            type: "array",
                            items: { $ref: "#/components/schemas/AlternativeSupplementItem" },
                            description: "List of alternative supplements",
                        },
                        currentPage: {
                            type: "integer",
                            description: "Current page number",
                        },
                        totalPages: {
                            type: "integer",
                            description: "Total number of pages",
                        },
                        totalCount: {
                            type: "integer",
                            description: "Total number of alternatives found",
                        },
                        threshold: {
                            type: "number",
                            description: "Minimum similarity threshold (0.6 = 60%)",
                            example: 0.6,
                        },
                        message: {
                            type: "string",
                            nullable: true,
                            description: "Optional message (e.g., when no results found)",
                        },
                    },
                    required: [
                        "currentSupplementId",
                        "currentSupplementName",
                        "alternatives",
                        "currentPage",
                        "totalPages",
                        "totalCount",
                        "threshold"
                    ],
                },

                // ==================== BATCH/INVENTORY SCHEMAS ====================

                Batch: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "Unique batch identifier",
                        },
                        batch_number: {
                            type: "string",
                            description: "Batch identification number",
                            example: "BATCH-001",
                        },
                        batch_initial_quantity: {
                            type: "integer",
                            description: "Initial quantity in the batch",
                            example: 100,
                        },
                        batch_expiration_date: {
                            type: "string",
                            format: "date",
                            description: "Expiration date",
                            example: "2026-12-31",
                        },
                        batch_price: {
                            type: "number",
                            format: "decimal",
                            description: "Price per unit",
                            example: 29.99,
                        },
                        supplement_name: {
                            type: "string",
                            description: "Associated supplement name",
                        },
                        supplement_brand: {
                            type: "string",
                            description: "Associated supplement brand",
                        },
                        booked: {
                            type: "integer",
                            description: "Quantity currently booked via tickets",
                            example: 35,
                        },
                        available: {
                            type: "integer",
                            description: "Available quantity (initial - booked)",
                            example: 65,
                        },
                        batch_status: {
                            type: "string",
                            description: "Current status from lookup table",
                            example: "Approved",
                        },
                    },
                },

                // ==================== STAGING SCHEMAS ====================

                StagingSupplement: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "Unique staging supplement identifier",
                        },
                        supplement_name: {
                            type: "string",
                            description: "Name of the supplement",
                        },
                        supplement_brand: {
                            type: "string",
                            description: "Brand name",
                        },
                        supplement_packaging_form: {
                            type: "string",
                            description: "Packaging form (BOTTLE, TABLET, etc.)",
                        },
                        supplement_status: {
                            type: "string",
                            description: "Testing status",
                        },
                        product_source_url: {
                            type: "array",
                            items: {
                                type: "string",
                                format: "uri"
                            },
                            nullable: true,
                            description: "Product information URLs",
                        },
                        is_reviewed: {
                            type: "boolean",
                            description: "Whether entry has been reviewed/approved",
                            example: false,
                        },
                    },
                },

                StagingSupplementDetail: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "Unique staging supplement identifier",
                        },
                        supplement_name: {
                            type: "string",
                            description: "Name of the supplement",
                        },
                        supplement_brand: {
                            type: "string",
                            nullable: true,
                            description: "Brand/manufacturer name",
                        },
                        supplement_description: {
                            type: "string",
                            nullable: true,
                            description: "Product description",
                        },
                        supplement_packaging_form: {
                            type: "string",
                            nullable: true,
                            description: "Physical packaging form",
                        },
                        supplement_packaging_form_id: {
                            type: "string",
                            format: "uuid",
                            nullable: true,
                            description: "Reference to packaging form lookup table",
                        },
                        supplement_status: {
                            type: "string",
                            nullable: true,
                            description: "Testing status",
                        },
                        supplement_status_id: {
                            type: "string",
                            format: "uuid",
                            nullable: true,
                            description: "Reference to status lookup table",
                        },
                        supplement_ingredient: {
                            type: "array",
                            items: { type: "string" },
                            description: "List of ingredients",
                        },
                        nutritional_info_per_100g: {
                            type: "object",
                            nullable: true,
                            description: "Nutritional information per 100g",
                        },
                        nutritional_info_per_serving: {
                            type: "object",
                            nullable: true,
                            description: "Nutritional information per serving",
                        },
                        nutritional_info_per_serving_definition: {
                            type: "string",
                            nullable: true,
                            description: "Serving size definition",
                        },
                        supplement_warning_label: {
                            type: "string",
                            nullable: true,
                            description: "Safety warnings",
                        },
                        supplement_certifications: {
                            type: "string",
                            nullable: true,
                            description: "Quality certifications",
                        },
                        supplement_additional_information: {
                            type: "string",
                            nullable: true,
                            description: "Additional notes",
                        },
                        batch_testing_org: {
                            type: "string",
                            nullable: true,
                            description: "Testing organization or 'NIL'",
                        },
                        product_source_url: {
                            type: "array",
                            items: {
                                type: "string",
                                format: "uri"
                            },
                            nullable: true,
                            description: "Product URLs",
                        },
                        scraper_version: {
                            type: "string",
                            nullable: true,
                            description: "Web scraper version used",
                        },
                        is_reviewed: {
                            type: "boolean",
                            description: "Review status",
                        },
                    },
                },

                UpdateStagingSupplementRequest: {
                    type: "object",
                    properties: {
                        supplement_name: { type: "string" },
                        supplement_brand: { type: "string", nullable: true },
                        supplement_packaging_form_id: { type: "string", format: "uuid", nullable: true },
                        supplement_status_id: { type: "string", format: "uuid", nullable: true },
                        batch_testing_org: { type: "string", nullable: true },
                        supplement_description: { type: "string", nullable: true },
                        supplement_ingredient: {
                            type: "array",
                            items: { type: "string" },
                            nullable: true,
                        },
                        nutritional_info_per_100g: { type: "object", nullable: true },
                        nutritional_info_per_serving: { type: "object", nullable: true },
                        nutritional_info_per_serving_definition: { type: "string", nullable: true },
                        supplement_warning_label: { type: "string", nullable: true },
                        supplement_certifications: { type: "string", nullable: true },
                        supplement_additional_information: { type: "string", nullable: true },
                        product_source_url: {
                            oneOf: [
                                { type: "string", format: "uri" },
                                {
                                    type: "array",
                                    items: { type: "string", format: "uri" }
                                }
                            ],
                            nullable: true,
                        },
                        scraper_version: { type: "string", nullable: true },
                    },
                },

                ApprovalResponse: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            example: "Processed 3 staging entries: 2 succeeded, 1 failed",
                        },
                        totalProcessed: {
                            type: "integer",
                            description: "Total number of entries processed",
                        },
                        succeeded: {
                            type: "integer",
                            description: "Number of entries successfully approved",
                        },
                        failed: {
                            type: "integer",
                            description: "Number of entries that failed",
                        },
                        results: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    staging_id: {
                                        type: "string",
                                        format: "uuid",
                                        description: "Staging entry UUID",
                                    },
                                    staging_name: {
                                        type: "string",
                                        description: "Supplement name from staging",
                                    },
                                    status: {
                                        type: "string",
                                        enum: ["success", "failed"],
                                        description: "Approval status",
                                    },
                                    supplement_id: {
                                        type: "string",
                                        format: "uuid",
                                        nullable: true,
                                        description: "Created supplement UUID (if successful)",
                                    },
                                    reason: {
                                        type: "string",
                                        description: "Failure reason (if failed)",
                                    },
                                    vectorization: {
                                        type: "object",
                                        properties: {
                                            vector_100g: {
                                                type: "string",
                                                description: "Vector generation status for per_100g",
                                            },
                                            vector_perserving: {
                                                type: "string",
                                                description: "Vector generation status for per_serving",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },

                // ==================== CATALOG URL SCHEMAS (NEW) ====================

                CatalogUrl: {
                    type: "object",
                    properties: {
                        id: {
                            type: "string",
                            format: "uuid",
                            description: "Unique catalog URL identifier",
                        },
                        product_catalog_website: {
                            type: "string",
                            format: "uri",
                            description: "Product catalog URL to scrape",
                            example: "https://iherb.com/vitamins",
                        },
                        is_active: {
                            type: "boolean",
                            description: "Whether catalog is active for scraping",
                            example: true,
                        },
                    },
                    required: ["id", "product_catalog_website", "is_active"],
                },

                CreateCatalogUrlRequest: {
                    type: "object",
                    properties: {
                        product_catalog_website: {
                            type: "string",
                            format: "uri",
                            description: "Product catalog URL (must be unique)",
                            example: "https://iherb.com/vitamins",
                        },
                        is_active: {
                            type: "boolean",
                            description: "Active status (default: true)",
                            default: true,
                            example: true,
                        },
                    },
                    required: ["product_catalog_website"],
                },

                UpdateCatalogUrlRequest: {
                    type: "object",
                    properties: {
                        product_catalog_website: {
                            type: "string",
                            format: "uri",
                            description: "Updated catalog URL",
                        },
                        is_active: {
                            type: "boolean",
                            description: "Active status",
                        },
                    },
                    description: "At least one field required",
                },

                // ==================== SCRAPING SCHEMAS (NEW) ====================

                ScrapingStartRequest: {
                    type: "object",
                    properties: {
                        catalog_url_ids: {
                            type: "array",
                            items: {
                                type: "string",
                                format: "uuid",
                            },
                            nullable: true,
                            description: "Optional: Specific catalog URL IDs to scrape. If not provided, scrapes all active catalogs.",
                            example: ["uuid-1", "uuid-2"],
                        },
                    },
                },

                ScrapingStartResponse: {
                    type: "object",
                    properties: {
                        message: {
                            type: "string",
                            example: "Scraping started successfully",
                        },
                        catalogs_to_scrape: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: {
                                        type: "string",
                                        format: "uuid",
                                    },
                                    url: {
                                        type: "string",
                                        format: "uri",
                                    },
                                },
                            },
                            description: "List of catalogs being scraped",
                        },
                        total_catalogs: {
                            type: "integer",
                            description: "Number of catalogs to scrape",
                        },
                        info: {
                            type: "string",
                            example: "Scraping is running in the background. Check 'Staging Supplements' page later to review results.",
                        },
                    },
                    required: ["message", "catalogs_to_scrape", "total_catalogs", "info"],
                },

                // ==================== PAGINATION SCHEMAS ====================

                PaginatedSupplementsResponse: {
                    type: "object",
                    properties: {
                        data: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Supplement" },
                        },
                        currentPage: {
                            type: "integer",
                            description: "Current page number",
                            example: 1,
                        },
                        totalPages: {
                            type: "integer",
                            description: "Total number of pages",
                            example: 15,
                        },
                        totalCount: {
                            type: "integer",
                            description: "Total number of items",
                            example: 147,
                        },
                        searchQuery: {
                            type: "string",
                            nullable: true,
                            description: "Search query used (if any)",
                            example: "vitamin",
                        },
                    },
                    required: ["data", "currentPage", "totalPages", "totalCount"],
                },

                PaginatedBatchesResponse: {
                    type: "object",
                    properties: {
                        data: {
                            type: "array",
                            items: { $ref: "#/components/schemas/Batch" },
                        },
                        currentPage: {
                            type: "integer",
                            description: "Current page number",
                        },
                        totalPages: {
                            type: "integer",
                            description: "Total number of pages",
                        },
                        totalCount: {
                            type: "integer",
                            description: "Total number of items",
                        },
                        searchQuery: {
                            type: "string",
                            nullable: true,
                            description: "Search query used (if any)",
                        },
                    },
                },

                PaginatedStagingSupplementsResponse: {
                    type: "object",
                    properties: {
                        data: {
                            type: "array",
                            items: { $ref: "#/components/schemas/StagingSupplement" },
                        },
                        currentPage: {
                            type: "integer",
                            description: "Current page number",
                        },
                        totalPages: {
                            type: "integer",
                            description: "Total number of pages",
                        },
                        totalCount: {
                            type: "integer",
                            description: "Total number of unreviewed staging entries",
                        },
                        searchQuery: {
                            type: "string",
                            nullable: true,
                            description: "Always null (no search for staging)",
                        },
                    },
                },

                PaginatedCatalogUrlsResponse: {
                    type: "object",
                    properties: {
                        data: {
                            type: "array",
                            items: { $ref: "#/components/schemas/CatalogUrl" },
                        },
                        currentPage: {
                            type: "integer",
                            description: "Current page number",
                        },
                        totalPages: {
                            type: "integer",
                            description: "Total number of pages",
                        },
                        totalCount: {
                            type: "integer",
                            description: "Total number of catalog URLs",
                        },
                    },
                },

                // ==================== ERROR SCHEMAS ====================

                Error: {
                    type: "object",
                    properties: {
                        error: {
                            type: "string",
                            description: "Error message",
                            example: "Resource not found",
                        },
                    },
                    required: ["error"],
                },

                ValidationError: {
                    type: "object",
                    properties: {
                        error: {
                            type: "string",
                            description: "Validation error message",
                            example: "Validation failed",
                        },
                        details: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    field: { type: "string" },
                                    message: { type: "string" },
                                },
                            },
                            description: "Detailed validation errors",
                        },
                    },
                },

            },
            // ==================== SECURITY SCHEMA ====================
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                    description: "Enter JWT token in the format: Bearer <token>",
                },
            },

            // ==================== REUSABLE PARAMETERS ====================

            parameters: {
                PageParam: {
                    name: "page",
                    in: "query",
                    description: "Page number for pagination",
                    required: false,
                    schema: {
                        type: "integer",
                        minimum: 1,
                        default: 1,
                    },
                    example: 1,
                },
                LimitParam: {
                    name: "limit",
                    in: "query",
                    description: "Number of items per page (not implemented yet, fixed at 10)",
                    required: false,
                    schema: {
                        type: "integer",
                        minimum: 1,
                        maximum: 100,
                        default: 10,
                    },
                },
                SearchParam: {
                    name: "search",
                    in: "query",
                    description:
                        "Search query string. Searches across name, brand, ingredients, packaging form, and status.",
                    required: false,
                    schema: {
                        type: "string",
                        minLength: 1,
                        maxLength: 100,
                    },
                    example: "vitamin",
                },
                SupplementIdParam: {
                    name: "id",
                    in: "path",
                    description: "Supplement UUID",
                    required: true,
                    schema: {
                        type: "string",
                        format: "uuid",
                    },
                    example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                },
            },

            // ==================== REUSABLE RESPONSES ====================

            responses: {
                NotFound: {
                    description: "Resource not found",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Error" },
                            example: {
                                error: "Supplement not found",
                            },
                        },
                    },
                },
                BadRequest: {
                    description: "Bad request - Invalid input",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/ValidationError" },
                            example: {
                                error: "Validation failed",
                                details: [
                                    {
                                        field: "supplement_name",
                                        message: "Supplement name is required",
                                    },
                                ],
                            },
                        },
                    },
                },
                InternalServerError: {
                    description: "Internal server error",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Error" },
                            example: {
                                error: "An unexpected error occurred",
                            },
                        },
                    },
                },
                Conflict: {
                    description: "Conflict - Resource already exists",
                    content: {
                        "application/json": {
                            schema: { $ref: "#/components/schemas/Error" },
                            example: {
                                error:
                                    "Supplement with this name and brand already exists",
                            },
                        },
                    },
                },
            },
        },
    },
    // Paths to files containing OpenAPI annotations
    apis: [
        "./modules/SSS/supplements/routes.js",
        "./modules/SSS/inventory/routes.js",
        "./modules/SSS/staging/routes.js",
        "./modules/AMS/athlete/routes.js",
        "./modules/AMS/sport/routes.js",
        "./modules/AMS/coach/routes.js",
        "./modules/AMS/nutritionist/routes.js",
        "./modules/Consultation/consultation-session/routes.js",
        "./modules/Consultation/actionables/routes.js",
        "./modules/Consultation/consultation-lookups/routes.js",
        "./modules/Consultation/nutrition-diagnosis-summary/routes.js",
        "./modules/Consultation/nutrition-requirements/routes.js",
        "./modules/Consultation/medical-history/routes.js",
        "./modules/Consultation/supplement-dispensing/routes.js",
        "./modules/OCR/routes.js",
        "./server.js",
        "./modules/Auth/routes.js",
        "./modules/Consultation/trainingSchedule/routes.js",
        "./modules/Consultation/mealLog/routes.js",
        "./modules/Consultation/anthropometry/routes.js",
        "./modules/Consultation/adherences/routes.js",
        "./modules/Admin/adminRoutes.js"
    ],
};

const specs = swaggerJsdoc(swaggerOptions);
export default specs;