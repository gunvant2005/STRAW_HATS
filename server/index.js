import http from 'http';
import { handleApiRequest } from './routes/api.js';

/**
 * Product Intelligence Backend Server Entrypoint
 */

const PORT = process.env.PORT || 5000;

const server = http.createServer((req, res) => {
  let bodyChunks = [];
  req.on('data', (chunk) => bodyChunks.push(chunk));
  req.on('end', () => {
    let bodyData = null;
    const bodyString = Buffer.concat(bodyChunks).toString('utf-8');
    if (bodyString) {
      try {
        bodyData = JSON.parse(bodyString);
      } catch {
        bodyData = { raw: bodyString };
      }
    }
    handleApiRequest(req, res, bodyData);
  });
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`⚡ Product Intelligence Backend API server running on http://localhost:${PORT}`);
  });
}

export default server;
