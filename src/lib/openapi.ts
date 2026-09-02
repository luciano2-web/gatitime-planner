// OpenAPI 3.1 schema generator for the public GatiSchool API.
// Used in the Integrations page to download a .json the user can paste into ChatGPT Actions.

const FUNCTIONS_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/api`;

export const buildOpenApiSchema = () => ({
  openapi: "3.1.0",
  info: {
    title: "GatiSchool API",
    version: "1.0.0",
    description:
      "Public API to add, modify, and remove classes and tasks for the authenticated user. Authenticate with a Bearer API key generated in GatiSchool → Settings → Integrations.",
  },
  servers: [{ url: FUNCTIONS_BASE }],
  components: {
    securitySchemes: {
      ApiKeyAuth: { type: "http", scheme: "bearer", bearerFormat: "gati_sk_*" },
    },
    schemas: {
      Class: {
        type: "object",
        required: ["subject", "startTime", "endTime", "days"],
        properties: {
          subject: { type: "string", example: "Mathematics" },
          startTime: { type: "string", description: "HH:mm 24h", example: "10:00" },
          endTime: { type: "string", description: "HH:mm 24h", example: "11:30" },
          link: { type: "string", description: "Join link (Zoom/Meet)", example: "https://meet.google.com/abc-defg-hij" },
          days: {
            type: "array",
            items: { type: "integer", minimum: 0, maximum: 6 },
            description: "0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat",
            example: [1, 3],
          },
          color: { type: "string", description: "HSL color string", example: "185 75% 48%" },
        },
      },
      Task: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", example: "History essay" },
          subject: { type: "string", example: "History" },
          dueDate: { type: "string", format: "date-time", example: "2026-05-10T18:00:00Z" },
          completed: { type: "boolean", default: false },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    "/classes": {
      get: {
        operationId: "listClasses",
        summary: "List all classes for the authenticated user",
        responses: { "200": { description: "OK" } },
      },
      post: {
        operationId: "createClasses",
        summary: "Create one or more classes",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/Class" },
                  {
                    type: "object",
                    properties: { classes: { type: "array", items: { $ref: "#/components/schemas/Class" } } },
                  },
                ],
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/classes/{id}": {
      patch: {
        operationId: "updateClass",
        summary: "Modify a class",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Class" } } } },
        responses: { "200": { description: "OK" } },
      },
      delete: {
        operationId: "deleteClass",
        summary: "Delete a class",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },
    "/tasks": {
      get: {
        operationId: "listTasks",
        summary: "List tasks/reminders for the authenticated user",
        responses: { "200": { description: "OK" } },
      },
      post: {
        operationId: "createTasks",
        summary: "Create one or more tasks/reminders",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/Task" },
                  { type: "object", properties: { tasks: { type: "array", items: { $ref: "#/components/schemas/Task" } } } },
                ],
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/tasks/{id}": {
      patch: {
        operationId: "updateTask",
        summary: "Modify a task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Task" } } } },
        responses: { "200": { description: "OK" } },
      },
      delete: {
        operationId: "deleteTask",
        summary: "Delete a task",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "OK" } },
      },
    },
  },
});

export const API_BASE_URL = FUNCTIONS_BASE;

export const MCP_SERVER_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

export const MCP_TOOLS = [
  "list_classes",
  "create_class",
  "update_class",
  "delete_class",
  "list_tasks",
  "create_task",
  "update_task",
  "delete_task",
];
