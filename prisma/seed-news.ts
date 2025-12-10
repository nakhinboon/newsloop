import prisma from '../lib/db/prisma';

// News templates for generating varied content
const newsTitles: Record<string, string[]> = {
  technology: [
    'New AI Model Breaks Performance Records',
    'Quantum Computing Reaches Major Milestone',
    'Cybersecurity Threats Rise in Digital Age',
    'Tech Startup Raises $500M in Funding',
    'Cloud Computing Market Expands Rapidly',
    'Blockchain Technology Transforms Finance',
    'Smart Home Devices See Surge in Adoption',
    '5G Networks Roll Out Across Major Cities',
    'Virtual Reality Gaming Hits Mainstream',
    'Autonomous Vehicles Pass Safety Tests',
    'New Smartphone Features Revolutionary Camera',
    'Tech Industry Faces Chip Shortage Crisis',
    'Social Media Platform Launches New Features',
    'Wearable Tech Market Grows Exponentially',
    'Data Privacy Laws Reshape Tech Landscape',
    'Robotics Industry Sees Unprecedented Growth',
    'New Programming Language Gains Popularity',
    'Tech Giants Invest in Green Energy',
    'Artificial Intelligence Transforms Education',
    'Metaverse Development Accelerates',
  ],
  business: [
    'Stock Market Hits All-Time High',
    'Major Merger Creates Industry Giant',
    'Startup Ecosystem Thrives Despite Challenges',
    'Global Trade Agreements Reshape Markets',
    'Inflation Concerns Impact Consumer Spending',
    'Real Estate Market Shows Mixed Signals',
    'Corporate Earnings Exceed Expectations',
    'Small Businesses Adapt to Digital Economy',
    'Investment Trends Shift Toward Sustainability',
    'Banking Sector Embraces Digital Transformation',
    'Supply Chain Disruptions Ease Gradually',
    'E-commerce Sales Continue Record Growth',
    'Venture Capital Funding Reaches New Heights',
    'Labor Market Shows Strong Recovery',
    'Cryptocurrency Adoption Grows Among Institutions',
    'Retail Industry Transforms Post-Pandemic',
    'Manufacturing Sector Reports Strong Output',
    'Global Economic Outlook Improves',
    'Corporate Governance Standards Evolve',
    'Fintech Innovation Disrupts Traditional Banking',
  ],
  world: [
    'International Summit Addresses Global Challenges',
    'Diplomatic Relations Strengthen Between Nations',
    'Humanitarian Aid Reaches Crisis Regions',
    'Global Health Initiative Launches New Program',
    'Peace Talks Progress in Conflict Zone',
    'International Trade Deal Signed by Leaders',
    'Migration Patterns Shift Across Continents',
    'Cultural Exchange Programs Expand Globally',
    'United Nations Announces New Initiative',
    'Regional Cooperation Strengthens in Asia',
    'European Union Proposes New Regulations',
    'African Nations Form Economic Alliance',
    'Latin America Sees Democratic Progress',
    'Middle East Peace Process Advances',
    'Global Education Standards Improve',
    'International Sports Event Unites Nations',
    'World Heritage Sites Receive Protection',
    'Global Food Security Efforts Intensify',
    'International Space Cooperation Expands',
    'Cross-Border Infrastructure Projects Launch',
  ],
  science: [
    'Scientists Discover New Species in Amazon',
    'Medical Breakthrough Offers Hope for Patients',
    'Climate Research Reveals Alarming Trends',
    'Space Mission Returns Valuable Samples',
    'Gene Therapy Shows Promising Results',
    'Ocean Exploration Uncovers Ancient Secrets',
    'Renewable Energy Research Advances',
    'Archaeological Discovery Rewrites History',
    'Brain Research Unlocks New Understanding',
    'Environmental Study Highlights Biodiversity',
    'Physics Experiment Confirms Theory',
    'Vaccine Development Accelerates',
    'Astronomy Team Detects Distant Galaxy',
    'Chemistry Innovation Creates New Materials',
    'Biology Research Reveals Cell Mechanisms',
    'Geology Study Maps Underground Resources',
    'Psychology Research Improves Mental Health',
    'Ecology Project Restores Damaged Ecosystem',
    'Mathematics Discovery Solves Ancient Problem',
    'Engineering Feat Achieves New Record',
  ],
  entertainment: [
    'Blockbuster Film Breaks Box Office Records',
    'Music Festival Attracts Record Attendance',
    'Streaming Service Announces Original Content',
    'Celebrity Launches New Fashion Line',
    'Award Show Celebrates Industry Excellence',
    'Video Game Release Generates Massive Sales',
    'Television Series Finale Draws Millions',
    'Concert Tour Sells Out in Minutes',
    'Book Adaptation Becomes Cultural Phenomenon',
    'Comedy Special Receives Critical Acclaim',
    'Documentary Film Sparks Important Conversation',
    'Theater Production Opens to Rave Reviews',
    'Podcast Network Expands Programming',
    'Animation Studio Announces New Project',
    'Music Album Tops Charts Worldwide',
    'Reality Show Format Goes Global',
    'Celebrity Interview Goes Viral',
    'Film Festival Showcases Diverse Voices',
    'Gaming Tournament Offers Record Prize',
    'Art Exhibition Draws International Attention',
  ],
};

const contentTemplates = [
  '<p>In a significant development that has captured global attention, experts are closely monitoring the situation as it unfolds. Industry analysts suggest this could have far-reaching implications for the sector.</p><p>According to recent reports, stakeholders are optimistic about the potential outcomes. "This represents a major step forward," said a leading expert in the field. The development comes amid growing interest in the area.</p><p>Looking ahead, observers expect continued progress as more resources are dedicated to this initiative. The impact on related industries is expected to be substantial.</p>',
  '<p>A groundbreaking announcement has sent ripples through the industry, with implications that extend far beyond initial expectations. Market observers are carefully analyzing the potential impact on various sectors.</p><p>The development marks a turning point in how the industry approaches key challenges. Experts believe this could set a new standard for future initiatives. "We are witnessing a transformative moment," noted a prominent analyst.</p><p>As the situation continues to evolve, stakeholders are positioning themselves to capitalize on emerging opportunities. The long-term effects are expected to reshape the landscape significantly.</p>',
  '<p>Recent developments have highlighted the rapid pace of change in the sector, with new innovations emerging at an unprecedented rate. Industry leaders are adapting their strategies to keep pace with evolving trends.</p><p>The latest findings suggest a shift in how key players approach fundamental challenges. This evolution reflects broader changes in consumer behavior and market dynamics. Analysts predict continued momentum in the coming months.</p><p>Stakeholders across the industry are closely watching these developments, recognizing their potential to influence future direction. The implications for related sectors are also being carefully considered.</p>',
  '<p>A major milestone has been reached, marking a significant achievement for all involved. The accomplishment represents years of dedicated effort and collaboration among diverse teams.</p><p>Industry experts have praised the achievement, noting its potential to inspire similar initiatives elsewhere. "This demonstrates what is possible when resources and expertise are properly aligned," commented a leading figure in the field.</p><p>The success is expected to generate increased interest and investment in related areas. Observers anticipate a ripple effect that could accelerate progress across multiple fronts.</p>',
  '<p>New research has shed light on important aspects of the topic, providing valuable insights for stakeholders and decision-makers. The findings challenge some conventional assumptions while confirming others.</p><p>Researchers involved in the study emphasized the significance of their discoveries. "Our work opens new avenues for exploration and application," explained the lead investigator. The methodology employed has been praised for its rigor and innovation.</p><p>The implications of these findings extend beyond the immediate field, potentially influencing approaches in related disciplines. Further research is planned to build on these initial results.</p>',
];

const locales = ['en', 'es', 'fr', 'th'];

function generateSlug(title: string, index: number): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) + `-${index}`;
}

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateExcerpt(title: string): string {
  return `${title}. Read more about the latest developments and their impact on the industry.`;
}

async function main() {
  console.log('🌱 Starting news seed (100 posts)...');

  // Get existing categories
  const categories = await prisma.category.findMany();
  if (categories.length === 0) {
    console.error('❌ No categories found. Please run the main seed first.');
    process.exit(1);
  }
  console.log(`✅ Found ${categories.length} categories`);

  // Get existing tags
  const tags = await prisma.tag.findMany();
  console.log(`✅ Found ${tags.length} tags`);

  // Get or create admin user
  let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) {
    adminUser = await prisma.user.upsert({
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
  }
  console.log(`✅ Using author: ${adminUser.email}`);



  let createdCount = 0;
  const postsToCreate = [];

  // Generate 100 posts (20 per category)
  for (const category of categories) {
    const categorySlug = category.slug as keyof typeof newsTitles;
    const titles = newsTitles[categorySlug] || newsTitles.technology;

    for (let i = 0; i < 20; i++) {
      const title = titles[i % titles.length];
      const locale = locales[i % locales.length];
      const slug = generateSlug(title, createdCount + 1);
      const content = getRandomElement(contentTemplates);
      const excerpt = generateExcerpt(title);
      const readingTime = Math.floor(Math.random() * 8) + 3;
      const featured = Math.random() < 0.1; // 10% chance of being featured
      const daysAgo = Math.floor(Math.random() * 30);
      const publishedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      postsToCreate.push({
        slug,
        locale,
        title: `${title} #${createdCount + 1}`,
        content,
        excerpt,
        categoryId: category.id,
        authorId: adminUser.id,
        status: 'PUBLISHED' as const,
        publishedAt,
        readingTime,
        featured,
      });

      createdCount++;
    }
  }

  console.log(`📝 Creating ${postsToCreate.length} posts...`);

  // Create posts in batches
  for (const postData of postsToCreate) {
    try {
      const post = await prisma.post.upsert({
        where: { slug_locale: { slug: postData.slug, locale: postData.locale } },
        update: {},
        create: postData,
      });

      // Add random tags (1-3 tags per post)
      if (tags.length > 0) {
        const numTags = Math.floor(Math.random() * 3) + 1;
        const shuffledTags = [...tags].sort(() => Math.random() - 0.5).slice(0, numTags);
        
        for (const tag of shuffledTags) {
          await prisma.postTag.upsert({
            where: { postId_tagId: { postId: post.id, tagId: tag.id } },
            update: {},
            create: { postId: post.id, tagId: tag.id },
          });
        }
      }

      if (createdCount % 10 === 0) {
        console.log(`  ✅ Created ${createdCount} posts...`);
      }
    } catch {
      console.log(`  ⚠️ Skipped duplicate: ${postData.slug}`);
    }
  }

  console.log(`🎉 News seed completed! Created ${postsToCreate.length} posts.`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
