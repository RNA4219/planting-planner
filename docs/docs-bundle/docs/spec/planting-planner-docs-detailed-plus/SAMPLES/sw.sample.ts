import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, NetworkFirst, NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
registerRoute(({request}) => ['style','script','image','font'].includes(request.destination),
  new StaleWhileRevalidate({ cacheName: 'static' }));
registerRoute(({url, request}) => url.pathname.startsWith('/api/') && request.method === 'GET',
  new NetworkFirst({ cacheName: 'api', networkTimeoutSeconds: 4 }));
const bgSync = new BackgroundSyncPlugin('refresh-queue', { maxRetentionTime: 24*60 });
registerRoute(({url, request}) => url.pathname === '/api/refresh' && request.method === 'POST',
  new NetworkOnly({ plugins: [bgSync] }), 'POST');
