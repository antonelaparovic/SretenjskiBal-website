import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');
const apiOrigin = (process.env['API_INTERNAL_URL'] ?? 'http://localhost:3000').replace(/\/$/, '');

const app = express();
app.disable('x-powered-by');
const angularApp = new AngularNodeAppEngine();

/**
 * /api → NestJS backend. Browser tako koristi isti domen (bez CORS-a),
 * a SSR poziva backend direktno preko API_INTERNAL_URL.
 */
app.use('/api', express.raw({ type: '*/*', limit: '1mb' }), async (req, res, next) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value || ['host', 'connection', 'content-length'].includes(key)) continue;
      headers.set(key, Array.isArray(value) ? value.join(',') : value);
    }
    headers.set('x-forwarded-for', req.ip ?? '');
    const upstream = await fetch(`${apiOrigin}/api${req.url}`, {
      method: req.method,
      headers,
      body:
        !['GET', 'HEAD'].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length
          ? new Uint8Array(req.body)
          : undefined,
    });
    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key)) res.setHeader(key, value);
    });
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    next(err);
  }
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => (response ? writeResponseToNodeResponse(response, res) : next()))
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }
    console.log(`Sretenjski bal SSR server: http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
