import 'dotenv/config';
import { prisma } from '@/lib/db';
import { refreshPrices } from '@/lib/ingest/refresh-prices';

try {
  const r = await refreshPrices(console.log);
  console.log(`\nRun #${r.runId}: ${r.itemsOk} ok, ${r.itemsFailed} failed, ${r.apiCalls} API calls.`);
} finally { await prisma.$disconnect() }
