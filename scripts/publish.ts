import 'dotenv/config';
import { prisma } from '@/lib/db';
import { publishBatch } from '@/lib/publish';

try {
  await publishBatch(console.log);
} finally {
  await prisma.$disconnect();
}
