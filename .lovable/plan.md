## API pública para que ChatGPT empuje datos a tu app

Construyo una **API REST** (sin UI nueva) que ChatGPT — o cualquier cliente externo — puede llamar para crear, modificar o eliminar clases y tareas. La interfaz visual de GatiSchool no cambia: los datos llegan al backend y aparecen automáticamente en tu calendario y dashboard cuando los abras.

---

### 1. Migrar datos de `localStorage` a la base de datos (requisito previo)

Hoy todo vive en `localStorage` del navegador, así que una API externa no puede tocarlo. Para que ChatGPT pueda escribir, necesito mover `classes` y `tasks` a la base de datos de Lovable Cloud:

- Tabla `classes` (id, user_id, subject, start_time, end_time, link, days, color, created_at)
- Tabla `tasks` (id, user_id, title, subject, due_date, completed, created_at)
- **RLS**: cada usuario sólo ve y modifica sus propias filas
- `AppContext` cargará/guardará desde Supabase con realtime, así si ChatGPT añade una clase, aparece en vivo en tu app

### 2. API pública (Edge Functions)

Cuatro endpoints REST, todos bajo `https://bmypgigmdhtawuokmlxj.supabase.co/functions/v1/api/...`:

```
POST   /api/classes          → crear clase(s)
GET    /api/classes          → listar clases del usuario
PATCH  /api/classes/:id      → modificar
DELETE /api/classes/:id      → borrar

POST   /api/tasks            → crear tarea/recordatorio
GET    /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
```

Ejemplo de payload para crear una clase:
```json
POST /api/classes
{
  "subject": "Matemáticas",
  "startTime": "10:00",
  "endTime": "11:30",
  "days": [1, 3],
  "link": "https://meet.google.com/abc-defg-hij"
}
```

### 3. Autenticación: API Key personal

Para que ChatGPT pueda llamarte sin hacer login OAuth, te genero una **API Key personal** ligada a tu cuenta:

- Tabla `api_keys` (id, user_id, key_hash, name, created_at, last_used_at, revoked)
- Nueva pantalla en **Ajustes → Integraciones**: botón "Generar API Key" — la muestra una sola vez para que la copies
- Cada request a `/api/*` debe incluir el header:
  ```
  Authorization: Bearer gati_sk_xxxxxxxxxxxx
  ```
- La edge function valida la key, identifica al usuario, y aplica los cambios con sus permisos

### 4. Cómo conectarlo a ChatGPT

Te entrego un **OpenAPI 3 schema** (`openapi.json`) que describe todos los endpoints. Con eso:

1. Vas a [chat.openai.com](https://chat.openai.com) → "My GPTs" → "Create a GPT"
2. En **Configure → Actions → Create new action**
3. Pegas el schema OpenAPI que te genero
4. En **Authentication** eliges "API Key" → "Bearer" → pegas tu `gati_sk_...`
5. Guardas

Listo. A partir de ahí le dices a tu GPT cosas como:
- *"Añádeme Física los martes y jueves de 9 a 10:30"* → llama `POST /api/classes`
- *"Recuérdame entregar el ensayo de Historia el viernes"* → llama `POST /api/tasks`
- *"Cambia mi clase de Inglés a las 16:00"* → llama `PATCH /api/classes/:id`
- *"¿Qué tengo el lunes?"* → llama `GET /api/classes`

Y los cambios aparecen en tu app GatiSchool en tiempo real.

### Entregables al final

- 2 tablas nuevas (`classes`, `tasks`, `api_keys`) con RLS
- Edge function `api` con todas las rutas REST
- Pantalla "Integraciones" en Ajustes para generar/revocar API keys
- Archivo `openapi.json` descargable con el schema para pegar en ChatGPT
- Documentación corta en pantalla con los pasos para conectar

### Notas importantes

- **Webhook entrante (push) vs API REST**: lo que pides es exactamente esto — una API que recibe llamadas. Webhooks "salientes" (la app notifica a ChatGPT) sería al revés y no aplica aquí.
- **Sin cambios visuales**: la UI actual queda intacta. Sólo añado una sección discreta en Ajustes para gestionar las API keys.
- **Alternativa con n8n/Zapier**: el mismo OpenAPI schema funciona en cualquier automatizador, no sólo ChatGPT.

¿Te lanzo con este plan? Si quieres puedo además añadir un endpoint genérico `POST /api/command` que acepte lenguaje natural (ej: *"crea Mate los lunes 10am"*) y lo parsee con Lovable AI antes de insertar — útil si prefieres mandar texto crudo desde ChatGPT en vez de JSON estructurado.
