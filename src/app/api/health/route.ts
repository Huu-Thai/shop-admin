/** Liveness of the admin app itself (the shop API has its own health checks). */
export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
}
