/**
 * Cloudflare Pages Function to proxy API requests to backend
 * This function runs on Cloudflare's edge and forwards requests to the Deno Deploy backend,
 * bypassing WiFi restrictions that block direct access to Deno Deploy URLs.
 */

export async function onRequest(context) {
  // 1. Get the backend URL from Cloudflare environment variables
  const backendOrigin = context.env.API_BASE_URL;
  
  // 2. Fail fast if API_BASE_URL is not configured
  if (!backendOrigin) {
    return new Response(
      JSON.stringify({ 
        error: 'API_BASE_URL environment variable is not configured in Cloudflare Pages' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // 3. Parse the incoming request URL
  const url = new URL(context.request.url);

  // 4. Strip the /api prefix from the path
  // Example: /api/MenuCollection/... -> /MenuCollection/...
  const targetPath = url.pathname.replace(/^\/api/, '');
  
  // 5. Construct the target URL
  const targetUrl = backendOrigin + targetPath + url.search;

  // 6. Create a new request to forward to the backend
  // Preserve the original request method, headers, and body
  const proxyRequest = new Request(targetUrl, {
    method: context.request.method,
    headers: context.request.headers,
    body: context.request.body,
  });

  // 7. Send the request to the backend and return the response
  return fetch(proxyRequest);
}

