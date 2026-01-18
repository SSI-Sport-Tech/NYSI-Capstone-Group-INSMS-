import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NYSI Backend API",
      version: "2.0.0",
      description:
        "New York Sports Institute - Supplement Management System API",
      contact: {
        name: "NYSI Development Team",
        email: "dev@nysi.com",
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
    components: {
      schemas: {
        // Supplement Schema
        Supplement: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Unique supplement ID",
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
              description: "Form of packaging (capsule, tablet, powder, etc.)",
            },
            supplement_status: {
              type: "string",
              description: "Status of the supplement",
            },
            batch_testing_org: {
              type: "string",
              nullable: true,
              description: "Testing organization",
            },
            supplement_website: {
              type: "string",
              format: "uri",
              nullable: true,
              description: "Official website URL",
            },
          },
        },

        // Batch Schema
        Batch: {
          type: "object",
          properties: {
            id: {
              type: "string",
              format: "uuid",
              description: "Unique batch ID",
            },
            batch_number: {
              type: "string",
              description: "Batch identification number",
            },
            batch_initial_quantity: {
              type: "integer",
              description: "Initial quantity in the batch",
            },
            batch_expiration_date: {
              type: "string",
              format: "date",
              description: "Expiration date",
            },
            batch_price: {
              type: "number",
              format: "decimal",
              description: "Price per unit",
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
              description: "Quantity currently booked",
            },
            available: {
              type: "integer",
              description: "Available quantity",
            },
            batch_status: {
              type: "string",
              description: "Current status of the batch",
            },
          },
        },

        // Pagination Response
        PaginatedResponse: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: {
                oneOf: [
                  { $ref: "#/components/schemas/Supplement" },
                  { $ref: "#/components/schemas/Batch" },
                ],
              },
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

        // Error Response
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
            code: {
              type: "integer",
              description: "Error code",
            },
          },
        },
      },

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
        },
        LimitParam: {
          name: "limit",
          in: "query",
          description: "Number of items per page",
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
          description: "Search query string",
          required: false,
          schema: {
            type: "string",
            minLength: 1,
            maxLength: 100,
          },
        },
      },

      responses: {
        NotFound: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        BadRequest: {
          description: "Bad request",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        InternalServerError: {
          description: "Internal server error",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
      },
    },
  },
  apis: ["./modules/*/routes.js", "./server.js"], // Paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(swaggerOptions);
export default specs;
