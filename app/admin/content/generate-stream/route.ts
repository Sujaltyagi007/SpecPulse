import { type PageType } from '@/lib/content/facts';
import { generatePageContent } from '@/lib/content/generate';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pageType = body.pageType as PageType;
    const pageKey = String(body.pageKey || '').trim();

    if (!pageType || !pageKey) {
      return new Response(JSON.stringify({ error: 'Missing pageType or pageKey' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const send = async (data: Record<string, unknown>) => {
      try {
        await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch {
        // Stream may have closed
      }
    };

    // Execute generation in background while streaming
    (async () => {
      try {
        const result = await generatePageContent(pageType, pageKey, async (step, detail) => {
          await send({ step, detail, timestamp: Date.now() });
        });

        revalidatePath('/admin/content');
        revalidatePath(`/admin/content/${result.id}`);

        await send({
          step: 'done',
          id: result.id,
          status: result.status,
          errors: result.errors,
          generator: result.generator,
          url: `/admin/content/${result.id}`,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await send({ step: 'error', error: message });
      } finally {
        try {
          await writer.close();
        } catch {
          // ignore
        }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
