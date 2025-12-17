// Helper for server-side API calls to backend with SSL support
import https from 'https';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "https://localhost:4000/api"
    : "https://api.reisfundacoes.com/api");

// Custom fetch that uses https module for self-signed certs in development
export async function backendFetch(
  endpoint: string,
  options?: RequestInit
): Promise<Response> {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // In development with localhost, use custom https agent that accepts self-signed certs
  if (process.env.NODE_ENV === "development" && url.includes("localhost")) {
    const urlObj = new URL(url);
    const postData = options?.body ? String(options.body) : undefined;
    
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options?.method || 'GET',
        headers: options?.headers as any,
        rejectUnauthorized: false // Accept self-signed certificates
      }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          // Create a Response-like object
          const response = new Response(data, {
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers as any
          });
          resolve(response);
        });
      });

      req.on('error', reject);
      
      if (postData) {
        req.write(postData);
      }
      req.end();
    });
  }

  // For production or non-localhost, use standard fetch
  return fetch(url, options);
}

export { API_BASE };

