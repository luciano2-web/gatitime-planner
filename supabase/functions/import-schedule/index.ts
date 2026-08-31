// Importa un horario desde una imagen o PDF usando Lovable AI Gateway (Gemini multimodal).
// Devuelve clases estructuradas. NO inserta en la BD: el cliente revisa primero.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Eres un experto extrayendo horarios escolares/universitarios de imágenes y PDFs.
Analiza el documento y devuelve TODAS las clases recurrentes que veas.
Reglas estrictas:
- "days" usa números: 0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado.
- "startTime" y "endTime" en formato 24h "HH:MM".
- Si la misma materia se repite varios días, agrúpala en una sola entrada con varios días.
- "subject" debe ser el nombre de la materia/asignatura sin códigos largos.
- Ignora recreos/descansos/almuerzos.
- Si no detectas ninguna clase, devuelve un array vacío.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => null);
    const fileBase64 = body?.fileBase64 as string | undefined;
    const sheetText = body?.sheetText as string | undefined;
    const mimeType = (body?.mimeType as string | undefined) ?? "image/jpeg";
    if (!fileBase64 && !sheetText) {
      return new Response(JSON.stringify({ error: "fileBase64 or sheetText is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userContent = sheetText
      ? [{
          type: "text",
          text: `Extrae todas las clases del siguiente horario en formato tabla (exportado de Excel/CSV):\n\n${sheetText.slice(0, 20000)}`,
        }]
      : [
          { type: "text", text: "Extrae todas las clases del siguiente horario." },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
        ];


    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrae todas las clases del siguiente horario." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "register_classes",
            description: "Registra las clases extraídas del horario.",
            parameters: {
              type: "object",
              properties: {
                classes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      subject: { type: "string" },
                      startTime: { type: "string", description: "HH:MM 24h" },
                      endTime: { type: "string", description: "HH:MM 24h" },
                      days: {
                        type: "array",
                        items: { type: "number", minimum: 0, maximum: 6 },
                      },
                      link: { type: "string" },
                    },
                    required: ["subject", "startTime", "endTime", "days"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["classes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "register_classes" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit excedido. Intenta de nuevo en un momento." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "Sin créditos en Lovable AI. Añade fondos en Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI error", detail: errText }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ classes: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let parsed: { classes?: unknown };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(JSON.stringify({ error: "AI devolvió formato inválido" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ classes: parsed.classes ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("import-schedule error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
