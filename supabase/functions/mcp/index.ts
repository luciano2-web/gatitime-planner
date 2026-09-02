// GatiSchool MCP Server (Open Access — no auth)
// Endpoint: https://bmypgigmdhtawuokmlxj.supabase.co/functions/v1/mcp
//
// Implements the Model Context Protocol over Streamable HTTP using mcp-lite.
// All operations target a single "demo" user (DEMO_USER_ID env var, or the
// first user found in the profiles table). Do NOT use in production as-is.

import { Hono } from "npm:hono@4.6.14";
import { McpServer, StreamableHttpTransport } from "npm:mcp-lite@^0.10.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DEMO_USER_ID_ENV = Deno.env.get("DEMO_USER_ID") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

let cachedUserId: string | null = null;
async function getDemoUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;
  if (DEMO_USER_ID_ENV) {
    cachedUserId = DEMO_USER_ID_ENV;
    return cachedUserId;
  }
  const { data, error } = await admin
    .from("profiles")
    .select("user_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data?.user_id) {
    throw new Error(
      "No demo user found. Create an account in the app first, or set the DEMO_USER_ID secret to a specific user_id."
    );
  }
  cachedUserId = data.user_id;
  return cachedUserId;
}

const mcp = new McpServer({
  name: "gatischool-mcp",
  version: "1.0.0",
});

// ---------- CLASSES ----------

mcp.tool("list_classes", {
  description: "List all class schedule entries for the user.",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    const userId = await getDemoUserId();
    const { data, error } = await admin
      .from("classes")
      .select("*")
      .eq("user_id", userId)
      .order("start_time");
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
  },
});

mcp.tool("create_class", {
  description:
    "Create a new recurring class. days = array of weekday numbers (0=Sun..6=Sat). Times in HH:MM 24h.",
  inputSchema: {
    type: "object",
    properties: {
      subject: { type: "string" },
      startTime: { type: "string", description: "HH:MM" },
      endTime: { type: "string", description: "HH:MM" },
      days: { type: "array", items: { type: "number" } },
      link: { type: "string" },
      color: { type: "string", description: "HSL string e.g. '185 75% 48%'" },
    },
    required: ["subject", "startTime", "endTime", "days"],
  },
  handler: async (args: any) => {
    const userId = await getDemoUserId();
    const row = {
      user_id: userId,
      subject: String(args.subject),
      start_time: String(args.startTime),
      end_time: String(args.endTime),
      days: (args.days as number[]).filter((n) => n >= 0 && n <= 6),
      link: args.link ? String(args.link) : "",
      color: args.color ? String(args.color) : "185 75% 48%",
    };
    const { data, error } = await admin.from("classes").insert(row).select().single();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcp.tool("update_class", {
  description: "Update fields of an existing class by id.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string" },
      subject: { type: "string" },
      startTime: { type: "string" },
      endTime: { type: "string" },
      days: { type: "array", items: { type: "number" } },
      link: { type: "string" },
      color: { type: "string" },
    },
    required: ["id"],
  },
  handler: async (args: any) => {
    const userId = await getDemoUserId();
    const patch: any = {};
    if (args.subject !== undefined) patch.subject = String(args.subject);
    if (args.startTime !== undefined) patch.start_time = String(args.startTime);
    if (args.endTime !== undefined) patch.end_time = String(args.endTime);
    if (args.days !== undefined) patch.days = args.days;
    if (args.link !== undefined) patch.link = String(args.link);
    if (args.color !== undefined) patch.color = String(args.color);
    const { data, error } = await admin
      .from("classes")
      .update(patch)
      .eq("id", args.id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Class not found");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcp.tool("delete_class", {
  description: "Delete a class by id.",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  handler: async (args: any) => {
    const userId = await getDemoUserId();
    const { error } = await admin
      .from("classes")
      .delete()
      .eq("id", args.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: `Deleted class ${args.id}` }] };
  },
});

// ---------- TASKS ----------

mcp.tool("list_tasks", {
  description: "List all homework tasks / reminders for the user.",
  inputSchema: { type: "object", properties: {} },
  handler: async () => {
    const userId = await getDemoUserId();
    const { data, error } = await admin
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("due_date");
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }] };
  },
});

mcp.tool("create_task", {
  description: "Create a homework task or reminder. dueDate is ISO 8601.",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      subject: { type: "string" },
      dueDate: { type: "string", description: "ISO 8601 datetime" },
      completed: { type: "boolean" },
    },
    required: ["title"],
  },
  handler: async (args: any) => {
    const userId = await getDemoUserId();
    const row = {
      user_id: userId,
      title: String(args.title),
      subject: args.subject ? String(args.subject) : "",
      due_date: args.dueDate ?? null,
      completed: Boolean(args.completed ?? false),
    };
    const { data, error } = await admin.from("tasks").insert(row).select().single();
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcp.tool("update_task", {
  description: "Update a task by id.",
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string" },
      title: { type: "string" },
      subject: { type: "string" },
      dueDate: { type: "string" },
      completed: { type: "boolean" },
    },
    required: ["id"],
  },
  handler: async (args: any) => {
    const userId = await getDemoUserId();
    const patch: any = {};
    if (args.title !== undefined) patch.title = String(args.title);
    if (args.subject !== undefined) patch.subject = String(args.subject);
    if (args.dueDate !== undefined) patch.due_date = args.dueDate;
    if (args.completed !== undefined) patch.completed = Boolean(args.completed);
    const { data, error } = await admin
      .from("tasks")
      .update(patch)
      .eq("id", args.id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Task not found");
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  },
});

mcp.tool("delete_task", {
  description: "Delete a task by id.",
  inputSchema: {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
  },
  handler: async (args: any) => {
    const userId = await getDemoUserId();
    const { error } = await admin
      .from("tasks")
      .delete()
      .eq("id", args.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { content: [{ type: "text", text: `Deleted task ${args.id}` }] };
  },
});

// ---------- HTTP transport ----------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, mcp-session-id, accept",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Expose-Headers": "mcp-session-id",
};

const transport = new StreamableHttpTransport();
const handler = transport.bind(mcp);

const app = new Hono();

app.options("/*", () => new Response(null, { headers: corsHeaders }));

app.all("/*", async (c) => {
  const res = await handler(c.req.raw);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
});

Deno.serve(app.fetch);
