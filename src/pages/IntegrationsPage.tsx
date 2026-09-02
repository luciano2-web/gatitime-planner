import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Copy, Download, Check, AlertTriangle, Plug, Bot } from "lucide-react";
import { toast } from "sonner";
import { buildOpenApiSchema, API_BASE_URL, MCP_SERVER_URL, MCP_TOOLS } from "@/lib/openapi";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked: boolean;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function generateKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return `gati_sk_${body}`;
}

const IntegrationsPage = () => {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, created_at, revoked")
      .order("created_at", { ascending: false });
    setKeys(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }
      const key = generateKey();
      const hash = await sha256Hex(key);
      const prefix = key.slice(0, 16); // gati_sk_ + 8 chars
      const { error } = await supabase.from("api_keys").insert({
        user_id: user.id,
        name: newName.trim() || "My API Key",
        key_hash: hash,
        key_prefix: prefix,
      });
      if (error) throw error;
      setGeneratedKey(key);
      setNewName("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.from("api_keys").update({ revoked: true }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Key revoked"); load(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("api_keys").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Key deleted"); load(); }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const downloadOpenApi = () => {
    const schema = buildOpenApiSchema();
    const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gatischool-openapi.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Plug className="w-7 h-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Integraciones</h1>
          <p className="text-sm text-muted-foreground">
            Conecta servicios externos (ChatGPT, n8n, Zapier…) que pueden añadir y modificar tus clases y tareas.
          </p>
        </div>
      </div>

      {/* MCP server */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" />
          <div className="text-sm font-semibold">Servidor MCP (Model Context Protocol)</div>
          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-primary/15 text-primary">
            Acceso abierto
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Pega esta URL en los conectores de ChatGPT, Claude o Cursor para que lean y escriban tus clases y tareas.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">{MCP_SERVER_URL}</code>
          <Button size="icon" variant="ghost" onClick={() => copy(MCP_SERVER_URL)}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {MCP_TOOLS.map(t => (
            <span key={t} className="text-xs font-mono px-2 py-1 rounded bg-muted/60 text-muted-foreground">{t}</span>
          ))}
        </div>
        <div className="flex items-start gap-2 text-xs text-amber-500">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>Sin autenticación: cualquiera con esta URL puede leer y modificar los datos. Úsala solo para pruebas.</span>
        </div>
      </Card>

      {/* API base */}
      <Card className="p-5 space-y-3">
        <div className="text-sm font-semibold">Endpoint base</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">{API_BASE_URL}</code>
          <Button size="icon" variant="ghost" onClick={() => copy(API_BASE_URL)}><Copy className="w-4 h-4" /></Button>
        </div>
        <Button variant="outline" size="sm" onClick={downloadOpenApi}>
          <Download className="w-4 h-4 mr-2" /> Descargar esquema OpenAPI (.json)
        </Button>
      </Card>

      {/* Create key */}
      <Card className="p-5 space-y-4">
        <div className="text-sm font-semibold">Generar nueva API Key</div>
        <div className="flex gap-2">
          <Input
            placeholder="Nombre (ej: ChatGPT personal)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button onClick={handleCreate} disabled={creating}>
            <Plus className="w-4 h-4 mr-2" /> Generar
          </Button>
        </div>

        {generatedKey && (
          <div className="border border-primary/40 bg-primary/5 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-500 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4" /> Cópiala ahora — no volverás a verla
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background px-3 py-2 rounded font-mono break-all">{generatedKey}</code>
              <Button size="icon" variant="ghost" onClick={() => copy(generatedKey)}><Copy className="w-4 h-4" /></Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setGeneratedKey(null)}>
              <Check className="w-4 h-4 mr-2" /> Ya la copié
            </Button>
          </div>
        )}
      </Card>

      {/* List */}
      <Card className="p-5">
        <div className="text-sm font-semibold mb-3">Tus claves</div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no tienes claves.</p>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div key={k.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40">
                <div className="min-w-0">
                  <div className="font-medium truncate">{k.name} {k.revoked && <span className="text-xs text-destructive ml-2">revocada</span>}</div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{k.key_prefix}…</div>
                  <div className="text-xs text-muted-foreground">
                    Último uso: {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "nunca"}
                  </div>
                </div>
                <div className="flex gap-1">
                  {!k.revoked && (
                    <Button size="sm" variant="ghost" onClick={() => handleRevoke(k.id)}>Revocar</Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(k.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Instructions */}
      <Card className="p-5 space-y-3 text-sm">
        <div className="font-semibold">Cómo conectarlo a ChatGPT</div>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li>Ve a <a className="text-primary underline" href="https://chat.openai.com/gpts/editor" target="_blank" rel="noreferrer">chat.openai.com → My GPTs → Create</a>.</li>
          <li>En <b>Configure → Actions → Create new action</b>, pega el contenido del archivo <code>gatischool-openapi.json</code> (botón arriba).</li>
          <li>En <b>Authentication</b> elige <b>API Key → Bearer</b> y pega tu clave <code>gati_sk_…</code>.</li>
          <li>Guarda. Ahora puedes pedirle: <i>"añade Matemáticas los lunes y miércoles de 10 a 11:30"</i> y aparecerá en tu calendario.</li>
        </ol>
        <div className="text-xs text-muted-foreground pt-2">
          También funciona con cualquier cliente que envíe <code>Authorization: Bearer gati_sk_…</code> a <code>{API_BASE_URL}</code>.
        </div>
      </Card>
    </div>
  );
};

export default IntegrationsPage;
