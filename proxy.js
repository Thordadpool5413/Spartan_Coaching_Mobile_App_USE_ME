/**
 * Dev proxy — runs on port 5000 (Replit webview port)
 * Routes /api/* and /webhook/* to the FastAPI backend on port 8000
 * Routes everything else to the Expo Metro bundler on port 3000
 */
const http = require('http');
const net = require('net');

const BACKEND_PORT = 8000;
const METRO_PORT = 3000;
const PROXY_PORT = 5000;

process.on('uncaughtException', (err) => {
  console.error('Proxy uncaughtException (continuing):', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Proxy unhandledRejection (continuing):', reason);
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Try forwarding once. Returns true on success, false on ECONNREFUSED
 * (so the caller can retry), throws on any other error.
 */
function tryForward(req, res, targetPort, bodyBuffer) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${targetPort}` },
    };
    const proxy = http.request(options, (proxyRes) => {
      if (!res.headersSent) {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
      }
      proxyRes.pipe(res, { end: true });
      resolve(true);
    });
    proxy.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        resolve(false);
      } else {
        reject(err);
      }
    });
    if (bodyBuffer) {
      proxy.end(bodyBuffer);
    } else {
      proxy.end();
    }
  });
}

async function forward(req, res, targetPort) {
  // Buffer the request body so we can replay on retry
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('error', () => {});
  await new Promise((r) => req.on('end', r));
  const bodyBuffer = chunks.length ? Buffer.concat(chunks) : null;

  const maxAttempts = targetPort === METRO_PORT ? 20 : 3;
  const retryDelay = 500; // ms between retries

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const ok = await tryForward(req, res, targetPort, bodyBuffer);
      if (ok) return;
      // ECONNREFUSED — target not ready yet
      if (attempt === maxAttempts) break;
      if (attempt === 1) console.log(`Metro not ready, waiting...`);
      await sleep(retryDelay);
    } catch (err) {
      console.error(`Proxy error forwarding to :${targetPort}:`, err.message);
      if (!res.headersSent) res.writeHead(502);
      res.end(`Bad gateway: ${err.message}`);
      return;
    }
  }

  // All retries exhausted
  if (!res.headersSent) {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '2' });
  }
  res.end(`<!doctype html><html><head><meta http-equiv="refresh" content="2"><style>
    body{margin:0;background:#09090b;color:#ef4444;font-family:system-ui;display:flex;
    align-items:center;justify-content:center;height:100vh;flex-direction:column;gap:16px}
    p{color:#a1a1aa;font-size:14px;margin:0}
  </style></head><body>
    <div style="font-size:24px;font-weight:800">Starting up…</div>
    <p>Expo Metro bundler is loading. This page will refresh automatically.</p>
  </body></html>`);
}

const server = http.createServer((req, res) => {
  const isApi = req.url.startsWith('/api/') || req.url.startsWith('/webhook/');
  forward(req, res, isApi ? BACKEND_PORT : METRO_PORT);
});

server.on('error', (err) => {
  console.error('Server error (continuing):', err.message);
});

// WebSocket upgrade (for Metro HMR)
server.on('upgrade', (req, socket, head) => {
  const targetPort = METRO_PORT;
  socket.on('error', (err) => {
    console.error('WS client socket error:', err.message);
    target && target.destroy();
  });
  const target = net.createConnection(targetPort, 'localhost', () => {
    target.write(
      `${req.method} ${req.url} HTTP/1.1\r\nHost: localhost:${targetPort}\r\n` +
      Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
      `\r\n\r\n`
    );
    target.write(head);
    socket.pipe(target);
    target.pipe(socket);
  });
  target.on('error', (err) => {
    console.error('WS proxy error:', err.message);
    socket.destroy();
  });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Dev proxy listening on :${PROXY_PORT}  (API→:${BACKEND_PORT}, Metro→:${METRO_PORT})`);
});
