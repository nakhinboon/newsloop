
import { prisma } from '../lib/db/prisma';

async function main() {
  const posts = await prisma.post.findMany({
    select: {
      slug: true,
      title: true,
      locale: true
    }
  });
  console.log('Posts:', JSON.stringify(posts, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
