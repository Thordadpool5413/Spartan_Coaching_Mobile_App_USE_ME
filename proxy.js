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

function forward(req, res, targetPort) {
  const options = {
    hostname: 'localhost',
    port: targetPort,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${targetPort}` },
  };
  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxy.on('error', (err) => {
    console.error(`Proxy error forwarding to :${targetPort}:`, err.message);
    if (!res.headersSent) res.writeHead(502);
    res.end(`Bad gateway: ${err.message}`);
  });
  req.pipe(proxy, { end: true });
}

const server = http.createServer((req, res) => {
  const isApi = req.url.startsWith('/api/') || req.url.startsWith('/webhook/');
  forward(req, res, isApi ? BACKEND_PORT : METRO_PORT);
});

// WebSocket upgrade (for Metro HMR)
server.on('upgrade', (req, socket, head) => {
  const targetPort = METRO_PORT;
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
  target.on('error', (err) => { console.error('WS proxy error:', err.message); socket.destroy(); });
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`Dev proxy listening on :${PROXY_PORT}  (API→:${BACKEND_PORT}, Metro→:${METRO_PORT})`);
});
