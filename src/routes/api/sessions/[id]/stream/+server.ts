import type { RequestHandler } from './$types';
import { createAnthropicClient } from '$lib/server/anthropic';

export const GET: RequestHandler = async ({ params, locals }) => {
  const client = await createAnthropicClient(locals.userId!);
  const stream = await client.beta.sessions.events.stream(params.id);

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const event of stream) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
          if (event.type === 'session.status_idle' || event.type === 'session.status_terminated') {
            break;
          }
        }
      } catch (e) {
        const errorData = `data: ${JSON.stringify({ type: 'error', message: String(e) })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
};
