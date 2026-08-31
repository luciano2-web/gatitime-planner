// GatiSchool Service Worker — solo notificaciones (no cachea nada).
// Funciona en cualquier dominio: preview, gatitime-planner.lovable.app o dominio propio.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // URL de la clase si existe; si no, el origen real donde está instalada la app.
  const appOrigin = new URL(self.registration.scope).origin + '/';
  const target = event.notification.data?.url || appOrigin;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      let isExternal = true;
      try {
        isExternal = new URL(target, appOrigin).origin !== appOrigin.replace(/\/$/, '');
      } catch (_) {
        isExternal = false;
      }

      // Si el destino es de la propia app, reutiliza una ventana ya abierta.
      if (!isExternal) {
        for (const client of clientList) {
          if ('focus' in client) {
            await client.focus();
            if ('navigate' in client && client.url !== target) {
              try { await client.navigate(target); } catch (_) { /* noop */ }
            }
            return;
          }
        }
      }

      if (self.clients.openWindow) await self.clients.openWindow(target);
    })()
  );
});
