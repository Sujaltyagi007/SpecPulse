import 'dotenv/config';
import { prisma } from '@/lib/db';
import { runDailyArticle } from '@/lib/articles/auto';

const result = await runDailyArticle();
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
if (result.started && result.status === 'failed') process.exitCode = 1;
