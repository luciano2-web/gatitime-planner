import { useRef, useState } from "react";
import { Upload, Sparkles, Loader2, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApp } from "@/contexts/AppContext";
import { CLASS_COLORS, DAYS_OF_WEEK } from "@/types/schedule";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ParsedClass {
  subject: string;
  startTime: string;
  endTime: string;
  days: number[];
  link?: string;
}

interface Props {
  onClose?: () => void;
  onImported?: (count: number) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const ScheduleImporter = ({ onClose, onImported }: Props) => {
  const { addClass } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<ParsedClass[] | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Archivo demasiado grande (máx 8 MB)");
      return;
    }
    setFileName(file.name);
    setLoading(true);
    setParsed(null);
    try {
      const isSpreadsheet =
        /\.(xlsx|xls|csv)$/i.test(file.name) ||
        /sheet|excel|csv/i.test(file.type);

      let body: Record<string, unknown>;
      if (isSpreadsheet) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheetText = wb.SheetNames.map(
          name => `--- Hoja: ${name} ---\n${XLSX.utils.sheet_to_csv(wb.Sheets[name])}`
        ).join("\n\n");
        if (!sheetText.replace(/[,\s-]/g, "")) {
          toast.error("El archivo Excel está vacío");
          setLoading(false);
          return;
        }
        body = { sheetText };
      } else {
        body = { fileBase64: await fileToBase64(file), mimeType: file.type || "image/jpeg" };
      }

      const { data, error } = await supabase.functions.invoke("import-schedule", { body });
      if (error) throw error;
      const classes = (data?.classes ?? []) as ParsedClass[];
      if (classes.length === 0) {
        toast.warning("No se detectaron clases en el archivo. Prueba con una imagen más nítida.");
      } else {
        toast.success(`${classes.length} clases detectadas. Revísalas antes de importar.`);
      }
      setParsed(classes);
    } catch (e: any) {
      console.error("Import error:", e);
      const msg = e?.context?.error || e?.message || "Error al analizar el horario";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (idx: number, patch: Partial<ParsedClass>) => {
    setParsed(p => p?.map((c, i) => (i === idx ? { ...c, ...patch } : c)) ?? null);
  };

  const toggleDay = (idx: number, day: number) => {
    setParsed(p => p?.map((c, i) => {
      if (i !== idx) return c;
      const days = c.days.includes(day) ? c.days.filter(d => d !== day) : [...c.days, day];
      return { ...c, days };
    }) ?? null);
  };

  const removeRow = (idx: number) => setParsed(p => p?.filter((_, i) => i !== idx) ?? null);

  const handleConfirm = async () => {
    if (!parsed) return;
    const valid = parsed.filter(c => c.subject.trim() && c.days.length > 0);
    if (valid.length === 0) {
      toast.error("Ninguna clase válida para importar");
      return;
    }
    setLoading(true);
    try {
      for (let i = 0; i < valid.length; i++) {
        await addClass({
          subject: valid[i].subject.trim(),
          startTime: valid[i].startTime,
          endTime: valid[i].endTime,
          link: valid[i].link?.trim() ?? "",
          days: valid[i].days,
          color: CLASS_COLORS[i % CLASS_COLORS.length],
        });
      }
      toast.success(`${valid.length} clases importadas 🎉`);
      onImported?.(valid.length);
      onClose?.();
    } catch (e: any) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4 glow-primary-sm animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">Importar desde foto o PDF</h3>
            <p className="text-xs text-muted-foreground">
              La IA detectará tus clases automáticamente. Podrás revisarlas antes de guardar.
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!parsed && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="w-full glow-primary-sm gap-2"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analizando {fileName}…</>
            ) : (
              <><Upload className="h-4 w-4" /> Subir imagen o PDF del horario</>
            )}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Formatos: JPG, PNG, PDF. Máx 8 MB.
          </p>
        </>
      )}

      {parsed && (
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            {parsed.length} clases detectadas — edítalas si hace falta:
          </div>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {parsed.map((row, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={row.subject}
                    onChange={e => updateRow(idx, { subject: e.target.value })}
                    placeholder="Materia"
                    className="bg-input border-border h-8 text-sm flex-1"
                  />
                  <button onClick={() => removeRow(idx)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="time"
                    value={row.startTime}
                    onChange={e => updateRow(idx, { startTime: e.target.value })}
                    className="bg-input border-border h-8 text-xs"
                  />
                  <Input
                    type="time"
                    value={row.endTime}
                    onChange={e => updateRow(idx, { endTime: e.target.value })}
                    className="bg-input border-border h-8 text-xs"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {DAYS_OF_WEEK.map((d, di) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(idx, di)}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium transition-all ${
                        row.days.includes(di)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setParsed(null)} disabled={loading} className="flex-1">
              Volver a subir
            </Button>
            <Button onClick={handleConfirm} disabled={loading} className="flex-1 glow-primary-sm gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Importar {parsed.length}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
