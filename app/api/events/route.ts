import { getSessionUserId } from '../../../lib/getSessionUserId';
import { addClient, removeClient } from '../../../lib/sse';

export const dynamic = 'force-dynamic';

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const enc = new TextEncoder();
  let ctrl: ReadableStreamDefaultController<Uint8Array>;
  let heartbeat: ReturnType<typeof setInterval>;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
      addClient(userId, ctrl);
      ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));
      // Keep-alive ping every 25 s (proxies close idle connections around 30 s)
      heartbeat = setInterval(() => {
        try { ctrl.enqueue(enc.encode(': ping\n\n')); }
        catch { clearInterval(heartbeat); }
      }, 25_000);
    },
    cancel() {
      clearInterval(heartbeat);
      removeClient(userId, ctrl);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    },
  });
}
