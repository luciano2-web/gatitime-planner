# Plan: Importar horario desde foto/PDF + Widget + Modo offline

## 1. Importar horario desde imagen o PDF (IA)

**Flujo del usuario:**
1. Botón "Importar horario" en Onboarding y en la página de Calendario.
2. Sube una foto (JPG/PNG) o un PDF del horario.
3. La IA analiza la imagen y devuelve una lista estructurada de clases (materia, días, hora inicio/fin, color sugerido).
4. Pantalla de revisión: el usuario puede editar/borrar antes de confirmar.
5. Al confirmar → se insertan en la tabla `classes`.

**Implementación técnica:**
- Nueva edge function `import-schedule` (verify_jwt en código con `getClaims`).
- Recibe la imagen/PDF en base64 y la envía al modelo `google/gemini-2.5-pro` vía Lovable AI Gateway (multimodal, sin API key extra).
- Si es PDF: convertir la primera página a imagen en el cliente con `pdfjs-dist` antes de enviar (más fiable que enviar el PDF crudo).
- Prompt estructurado + `tool_use` con JSON Schema para garantizar salida válida:
  ```
  { classes: [{ subject, startTime "HH:MM", endTime "HH:MM",
                days: [0-6], color }] }
  ```
- Componente nuevo `ScheduleImporter.tsx` con: dropzone, preview, loading state, tabla de revisión editable, botón "Confirmar e importar".
- Integrado en `Onboarding.tsx` (paso opcional "¿Tienes ya un horario? Súbelo") y como botón en `Calendar.tsx`.

## 2. Widget de "Próxima clase"

- Componente `NextClassWidget.tsx` reutilizable, con:
  - Materia, hora restante (countdown vivo cada segundo), aula/enlace.
  - Botón "Unirse" si hay link.
  - Estado vacío elegante cuando no hay clases hoy.
- Se muestra en el Dashboard (Index) en la parte superior, destacado con glow cyan.
- Versión compacta para el sidebar en desktop.
- **PWA**: añadir `shortcuts` en `manifest.json` para acceso rápido a "Próxima clase" desde el icono de la app en móvil (lo más cercano a un widget nativo sin app store).

## 3. Modo Online/Offline aprobado

- Service Worker (`public/sw.js`) ya existe; ampliarlo para cachear:
  - Shell de la app (HTML/JS/CSS con Workbox-style cache-first).
  - Última respuesta de `classes` y `tasks` en IndexedDB.
- Hook `useOnlineStatus` que muestre un badge discreto "Sin conexión — viendo datos guardados" en el header.
- Las mutaciones offline se encolan en IndexedDB y se reenvían al recuperar conexión (cola simple en `AppContext`).

## Archivos afectados

**Nuevos:**
- `supabase/functions/import-schedule/index.ts`
- `src/components/ScheduleImporter.tsx`
- `src/components/NextClassWidget.tsx`
- `src/hooks/useOnlineStatus.ts`
- `src/lib/offlineQueue.ts`

**Editados:**
- `src/pages/Onboarding.tsx` — añadir paso de importación opcional
- `src/pages/Calendar.tsx` — botón "Importar"
- `src/pages/Index.tsx` — montar `NextClassWidget`
- `public/sw.js` — caché ampliado
- `public/manifest.json` (o `index.html`) — `shortcuts` PWA
- `src/contexts/AppContext.tsx` — cola offline

## Notas

- No requiere claves nuevas: usa `LOVABLE_API_KEY` ya disponible.
- Sin cambios de schema en la base de datos.
- La función de import valida el JWT del usuario y escribe con su `user_id` (respeta RLS).
