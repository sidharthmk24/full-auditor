const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8090;
const html = fs.readFileSync(path.join(__dirname, 'controlled-site.html'), 'utf8');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (req.url === '/api/submit') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal test mock error' }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Test Server] Controlled benchmark site listening on http://127.0.0.1:${PORT}`);
});

