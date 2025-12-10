import prisma from '../lib/db/prisma';

async function main() {
  console.log('🌱 Starting seed...');

  // Create or get admin user (you need to have a Clerk user first)
  // Using a placeholder ID - replace with your actual Clerk user ID
  const adminUser = await prisma.user.upsert({
    where: { id: 'user_seed_admin' },
    update: {},
    create: {
      id: 'user_seed_admin',
      email: 'admin@newsloop.dev',
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Admin user created:', adminUser.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'technology' },
      update: {},
      create: { name: 'Technology', slug: 'technology', description: 'Tech news and updates' },
    }),
    prisma.category.upsert({
      where: { slug: 'business' },
      update: {},
      create: { name: 'Business', slug: 'business', description: 'Business and finance news' },
    }),
    prisma.category.upsert({
      where: { slug: 'world' },
      update: {},
      create: { name: 'World', slug: 'world', description: 'International news' },
    }),
    prisma.category.upsert({
      where: { slug: 'science' },
      update: {},
      create: { name: 'Science', slug: 'science', description: 'Science and research' },
    }),
    prisma.category.upsert({
      where: { slug: 'entertainment' },
      update: {},
      create: { name: 'Entertainment', slug: 'entertainment', description: 'Entertainment news' },
    }),
  ]);

  console.log('✅ Categories created:', categories.length);

  // Create tags
  const tags = await Promise.all([
    prisma.tag.upsert({ where: { slug: 'ai' }, update: {}, create: { name: 'AI', slug: 'ai' } }),
    prisma.tag.upsert({ where: { slug: 'startup' }, update: {}, create: { name: 'Startup', slug: 'startup' } }),
    prisma.tag.upsert({ where: { slug: 'climate' }, update: {}, create: { name: 'Climate', slug: 'climate' } }),
    prisma.tag.upsert({ where: { slug: 'innovation' }, update: {}, create: { name: 'Innovation', slug: 'innovation' } }),
    prisma.tag.upsert({ where: { slug: 'economy' }, update: {}, create: { name: 'Economy', slug: 'economy' } }),
  ]);

  console.log('✅ Tags created:', tags.length);

  // Sample posts data
  const postsData = [
    {
      slug: 'ai-revolution-transforms-healthcare',
      locale: 'en',
      title: 'AI Revolution Transforms Healthcare Industry',
      content: '<p>Artificial intelligence is revolutionizing the healthcare industry with breakthrough applications in diagnosis, treatment planning, and drug discovery. Major hospitals worldwide are adopting AI-powered tools to improve patient outcomes.</p><p>Recent studies show that AI diagnostic systems can detect certain cancers with 95% accuracy, surpassing human radiologists in some cases. This technology is expected to save millions of lives in the coming decade.</p>',
      excerpt: 'AI is revolutionizing healthcare with breakthrough applications in diagnosis and treatment.',
      categoryId: categories[0].id, // Technology
      featured: true,
      readingTime: 5,
    },
    {
      slug: 'global-markets-reach-new-highs',
      locale: 'en',
      title: 'Global Markets Reach Record Highs Amid Economic Recovery',
      content: '<p>Stock markets around the world have reached unprecedented levels as economies continue their recovery. Investors remain optimistic about growth prospects despite ongoing challenges.</p><p>The S&P 500 and major European indices have posted gains of over 20% this year, driven by strong corporate earnings and accommodative monetary policies.</p>',
      excerpt: 'Stock markets worldwide reach record levels as economic recovery continues.',
      categoryId: categories[1].id, // Business
      featured: true,
      readingTime: 4,
    },
    {
      slug: 'climate-summit-breakthrough-agreement',
      locale: 'en',
      title: 'World Leaders Reach Breakthrough Climate Agreement',
      content: '<p>In a historic moment, world leaders have agreed to ambitious new climate targets at the global summit. The agreement commits nations to reducing carbon emissions by 50% by 2030.</p><p>Environmental groups have cautiously welcomed the deal, while calling for immediate action to implement the pledges.</p>',
      excerpt: 'Historic climate agreement commits nations to 50% emission reduction by 2030.',
      categoryId: categories[2].id, // World
      featured: true,
      readingTime: 6,
    },
    {
      slug: 'space-telescope-discovers-earth-like-planets',
      locale: 'en',
      title: 'Space Telescope Discovers New Earth-Like Planets',
      content: '<p>NASA\'s latest space telescope has identified several potentially habitable planets in nearby star systems. Scientists are excited about the possibility of finding signs of life.</p><p>The discovery marks a significant milestone in the search for extraterrestrial life and could reshape our understanding of the universe.</p>',
      excerpt: 'NASA telescope identifies potentially habitable planets in nearby star systems.',
      categoryId: categories[3].id, // Science
      featured: false,
      readingTime: 5,
    },
    {
      slug: 'streaming-wars-intensify',
      locale: 'en',
      title: 'Streaming Wars Intensify as New Platforms Launch',
      content: '<p>The competition in the streaming industry has reached new heights with the launch of several new platforms. Traditional media companies are investing billions to compete with established players.</p><p>Consumers now have more choices than ever, but subscription fatigue is becoming a growing concern.</p>',
      excerpt: 'New streaming platforms launch as competition in the industry intensifies.',
      categoryId: categories[4].id, // Entertainment
      featured: false,
      readingTime: 4,
    },
    {
      slug: 'electric-vehicles-sales-surge',
      locale: 'en',
      title: 'Electric Vehicle Sales Surge to Record Levels',
      content: '<p>Electric vehicle sales have surged to record levels globally, with major automakers reporting unprecedented demand. The shift to EVs is accelerating faster than industry predictions.</p><p>Government incentives and improving charging infrastructure are driving adoption, while battery costs continue to decline.</p>',
      excerpt: 'EV sales reach record levels as the shift to electric accelerates globally.',
      categoryId: categories[0].id, // Technology
      featured: false,
      readingTime: 5,
    },
    {
      slug: 'central-banks-policy-shift',
      locale: 'en',
      title: 'Central Banks Signal Major Policy Shift',
      content: '<p>Major central banks are signaling a shift in monetary policy as inflation concerns grow. Interest rate hikes are expected in the coming months.</p><p>Economists are debating the timing and pace of policy normalization, with implications for global markets and economic growth.</p>',
      excerpt: 'Central banks prepare for policy shift as inflation concerns mount.',
      categoryId: categories[1].id, // Business
      featured: false,
      readingTime: 4,
    },
    {
      slug: 'renewable-energy-milestone',
      locale: 'en',
      title: 'Renewable Energy Reaches Historic Milestone',
      content: '<p>Renewable energy sources have reached a historic milestone, now accounting for 30% of global electricity generation. Solar and wind power lead the transition.</p><p>Experts predict renewables will become the dominant source of electricity within the next decade.</p>',
      excerpt: 'Renewables now account for 30% of global electricity generation.',
      categoryId: categories[3].id, // Science
      featured: false,
      readingTime: 5,
    },
    {
      slug: 'tech-giants-antitrust-scrutiny',
      locale: 'en',
      title: 'Tech Giants Face Increased Antitrust Scrutiny',
      content: '<p>Major technology companies are facing increased regulatory scrutiny over their market dominance. Lawmakers are considering new legislation to address competition concerns.</p><p>The outcome could reshape the tech industry and have far-reaching implications for innovation and consumer choice.</p>',
      excerpt: 'Regulators intensify scrutiny of tech giants over market dominance.',
      categoryId: categories[0].id, // Technology
      featured: false,
      readingTime: 6,
    },
    {
      slug: 'global-tourism-recovery',
      locale: 'en',
      title: 'Global Tourism Industry Shows Strong Recovery Signs',
      content: '<p>The global tourism industry is showing strong signs of recovery as travel restrictions ease. Popular destinations are reporting a surge in bookings.</p><p>Industry experts predict tourism could return to pre-pandemic levels by next year, boosting economies worldwide.</p>',
      excerpt: 'Tourism industry rebounds as travel restrictions ease globally.',
      categoryId: categories[2].id, // World
      featured: false,
      readingTime: 4,
    },
  ];

  // Create posts
  for (const postData of postsData) {
    const post = await prisma.post.upsert({
      where: { slug_locale: { slug: postData.slug, locale: postData.locale } },
      update: {},
      create: {
        ...postData,
        authorId: adminUser.id,
        status: 'PUBLISHED',
        publishedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
      },
    });

    // Add random tags
    const randomTags = tags.slice(0, Math.floor(Math.random() * 3) + 1);
    for (const tag of randomTags) {
      await prisma.postTag.upsert({
        where: { postId_tagId: { postId: post.id, tagId: tag.id } },
        update: {},
        create: { postId: post.id, tagId: tag.id },
      });
    }

    console.log(`✅ Post created: ${post.title}`);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
