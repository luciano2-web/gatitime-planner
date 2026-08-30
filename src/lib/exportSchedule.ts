import * as XLSX from "xlsx";
import { ClassSchedule, DAYS_FULL } from "@/types/schedule";

export const exportScheduleToExcel = (classes: ClassSchedule[]) => {
  const wb = XLSX.utils.book_new();

  // Hoja 1: listado de clases
  const rows = [...classes]
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map(c => ({
      Materia: c.subject,
      Inicio: c.startTime,
      Fin: c.endTime,
      Días: c.days.map(d => DAYS_FULL[d]).join(", "),
      Enlace: c.link || "",
    }));

  const wsList = XLSX.utils.json_to_sheet(
    rows.length ? rows : [{ Materia: "", Inicio: "", Fin: "", Días: "", Enlace: "" }]
  );
  wsList["!cols"] = [{ wch: 26 }, { wch: 10 }, { wch: 10 }, { wch: 34 }, { wch: 46 }];
  XLSX.utils.book_append_sheet(wb, wsList, "Clases");

  // Hoja 2: cuadrícula semanal por hora
  const hours = Array.from({ length: 16 }, (_, i) => i + 6);
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const grid = hours.map(h => {
    const row: Record<string, string> = { Hora: `${String(h).padStart(2, "0")}:00` };
    DAYS_FULL.forEach((name, day) => {
      const hit = classes.filter(
        c => c.days.includes(day) && toMin(c.startTime) < (h + 1) * 60 && toMin(c.endTime) > h * 60
      );
      row[name] = hit.map(c => `${c.subject} (${c.startTime}–${c.endTime})`).join(" / ");
    });
    return row;
  });
  const wsGrid = XLSX.utils.json_to_sheet(grid, { header: ["Hora", ...DAYS_FULL] });
  wsGrid["!cols"] = [{ wch: 8 }, ...DAYS_FULL.map(() => ({ wch: 28 }))];
  XLSX.utils.book_append_sheet(wb, wsGrid, "Semana");

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `GatiSchool-horario-${stamp}.xlsx`);
};
