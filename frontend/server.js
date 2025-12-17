const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Certificate paths
const certsPath = path.join(__dirname, '..', 'certs');
const keyPath = path.join(certsPath, 'localhost-key.pem');
const certPath = path.join(certsPath, 'localhost.pem');

app.prepare().then(() => {
  // Check if certificates exist
  if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    console.error('❌ HTTPS certificates not found!');
    console.error(`   Expected location: ${certsPath}`);
    console.error('   Run: node generate-certs.js');
    process.exit(1);
  }

  const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };

  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  })
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🔒 Frontend HTTPS server ready on https://${hostname}:${port}`);
      console.log(`   Environment: ${dev ? 'development' : 'production'}`);
    });
});

