// server.js
// Minimal static server for local usage.
// Browsers block loading sibling JS files when opening index.html via file://,
// so a local HTTP server is required.
//
// Usage:
//   PORT=8080 node server.js
//
// Notes:
// - No external network calls are performed.
// - Serves files from the repository root.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8080;
const ROOT_DIR = path.resolve(__dirname);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8'
};

function safeResolvePath(urlPathname) {
  const decoded = decodeURIComponent(urlPathname);
  const withoutQuery = decoded.split('?')[0].split('#')[0];
  const normalized = path.posix.normalize(withoutQuery);
  const trimmed = normalized.replace(/^\/+/g, '');
  const abs = path.resolve(ROOT_DIR, trimmed);
  if (!abs.startsWith(ROOT_DIR + path.sep) && abs !== ROOT_DIR) {
    return null;
  }
  return abs;
}

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'X-Content-Type-Options': 'nosniff',
    ...headers
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    const method = req.method || 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      return send(res, 405, 'Method Not Allowed', { 'Content-Type': MIME_TYPES['.txt'] });
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // Default entrypoint.
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;

    const absPath = safeResolvePath(pathname);
    if (!absPath) {
      return send(res, 400, 'Bad Request', { 'Content-Type': MIME_TYPES['.txt'] });
    }

    let filePath = absPath;

    // If a directory is requested, serve index.html inside it.
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return send(res, 404, 'Not Found', { 'Content-Type': MIME_TYPES['.txt'] });
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Disable caching during local development.
    const headers = {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    };

    if (method === 'HEAD') {
      return send(res, 200, '', headers);
    }

    const stream = fs.createReadStream(filePath);
    res.writeHead(200, {
      'X-Content-Type-Options': 'nosniff',
      ...headers
    });
    stream.pipe(res);
    stream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        send(res, 500, 'Internal Server Error', { 'Content-Type': MIME_TYPES['.txt'] });
      } else {
        res.end();
      }
    });
  } catch (err) {
    console.error('Server error:', err);
    return send(res, 500, 'Internal Server Error', { 'Content-Type': MIME_TYPES['.txt'] });
  }
});

server.listen(PORT, () => {
  console.log(`Mortgage calculator server running on http://localhost:${PORT}`);
});

