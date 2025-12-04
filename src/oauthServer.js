const http = require('http');
const url = require('url');

/**
 * OAuth Callback Server
 * Creates a temporary local HTTP server to handle OAuth redirects
 */
class OAuthServer {
  constructor(port = 53682) {
    this.port = port;
    this.server = null;
    this.resolveCallback = null;
    this.rejectCallback = null;
  }

  /**
   * Start the OAuth callback server
   * @returns {Promise<{code: string, state: string}>} - Authorization code and state
   */
  start() {
    return new Promise((resolve, reject) => {
      this.resolveCallback = resolve;
      this.rejectCallback = reject;

      this.server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url, true);

        if (parsedUrl.pathname === '/oauth/callback') {
          const { code, state, error, error_description } = parsedUrl.query;

          if (error) {
            // OAuth error
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Tasker - OAuth Error</title>
                  <style>
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      margin: 0;
                      background: #f5f5f5;
                    }
                    .container {
                      background: white;
                      padding: 2rem;
                      border-radius: 8px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                      text-align: center;
                      max-width: 400px;
                    }
                    h1 { color: #d32f2f; margin-top: 0; }
                    p { color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>❌ Authorization Failed</h1>
                    <p>${error_description || error}</p>
                    <p>You can close this window and return to Tasker.</p>
                  </div>
                </body>
              </html>
            `);

            this.stop();
            this.rejectCallback(new Error(error_description || error));
            return;
          }

          if (code) {
            // Success
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Tasker - OAuth Success</title>
                  <style>
                    body {
                      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      margin: 0;
                      background: #f5f5f5;
                    }
                    .container {
                      background: white;
                      padding: 2rem;
                      border-radius: 8px;
                      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                      text-align: center;
                      max-width: 400px;
                    }
                    h1 { color: #4caf50; margin-top: 0; }
                    p { color: #666; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>✓ Authorization Successful</h1>
                    <p>Tasker has been authorized to access your Dropbox.</p>
                    <p>You can close this window and return to Tasker.</p>
                  </div>
                  <script>
                    // Auto-close after 3 seconds
                    setTimeout(() => window.close(), 3000);
                  </script>
                </body>
              </html>
            `);

            this.stop();
            this.resolveCallback({ code, state });
            return;
          }

          // Invalid request
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid OAuth callback');
          this.stop();
          this.rejectCallback(new Error('Invalid OAuth callback'));
        } else {
          // 404
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      });

      this.server.on('error', (err) => {
        console.error('OAuth server error:', err);
        this.rejectCallback(err);
      });

      this.server.listen(this.port, () => {
        console.log(`OAuth callback server listening on port ${this.port}`);
      });
    });
  }

  /**
   * Stop the OAuth callback server
   */
  stop() {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('OAuth callback server stopped');
    }
  }

  /**
   * Get the redirect URI for this server
   */
  getRedirectUri() {
    return `http://localhost:${this.port}/oauth/callback`;
  }
}

module.exports = OAuthServer;
