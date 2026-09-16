import { env } from 'cloudflare:workers';
export async function GET(request: Request) {
  const host = new URL(request.url).hostname;
  const configured = (env as unknown as { PVP_SERVER_URL?: string })
    .PVP_SERVER_URL;
  const endpoint =
    configured ||
    (['localhost', '127.0.0.1'].includes(host) ? 'http://localhost:8788' : '');
  return Response.json(
    { endpoint },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
