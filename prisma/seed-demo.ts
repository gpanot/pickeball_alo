/**
 * Seed 10 demo players and 10 demo coaches with realistic avatars.
 *
 * Avatars use randomuser.me portrait URLs (stable, freely available).
 * All accounts use password "demo1234".
 *
 * Run:  npx tsx prisma/seed-demo.ts
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'demo1234';
const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

const players = [
  {
    name: 'Nguyen Minh Tuan',
    phone: '0901000001',
    photo: 'https://randomuser.me/api/portraits/men/32.jpg',
  },
  {
    name: 'Tran Thi Mai',
    phone: '0901000002',
    photo: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    name: 'Le Hoang Nam',
    phone: '0901000003',
    photo: 'https://randomuser.me/api/portraits/men/75.jpg',
  },
  {
    name: 'Pham Thi Linh',
    phone: '0901000004',
    photo: 'https://randomuser.me/api/portraits/women/68.jpg',
  },
  {
    name: 'Vo Quoc Dat',
    phone: '0901000005',
    photo: 'https://randomuser.me/api/portraits/men/22.jpg',
  },
  {
    name: 'Bui Ngoc Anh',
    phone: '0901000006',
    photo: 'https://randomuser.me/api/portraits/women/29.jpg',
  },
  {
    name: 'Do Thanh Hung',
    phone: '0901000007',
    photo: 'https://randomuser.me/api/portraits/men/45.jpg',
  },
  {
    name: 'Hoang Thi Hanh',
    phone: '0901000008',
    photo: 'https://randomuser.me/api/portraits/women/55.jpg',
  },
  {
    name: 'Dang Van Khoa',
    phone: '0901000009',
    photo: 'https://randomuser.me/api/portraits/men/11.jpg',
  },
  {
    name: 'Ly Thi Thu',
    phone: '0901000010',
    photo: 'https://randomuser.me/api/portraits/women/17.jpg',
  },
];

const coaches = [
  {
    name: 'Coach Duc Nguyen',
    phone: '0902000001',
    email: 'duc.nguyen@demo.com',
    photo: 'https://randomuser.me/api/portraits/men/52.jpg',
    bio: 'Former national-level player with 8 years of coaching experience. I focus on building strong fundamentals and competitive mindset for all levels.',
    certifications: ['PPR Certified', 'IPTPA Level II'],
    specialties: ['Dinking', 'Third-Shot Drop', 'Singles Strategy'],
    languages: ['Vietnamese', 'English'],
    focusLevels: ['Beginner', 'Intermediate', 'Advanced'],
    groupSizes: ['1-on-1', '2-4 players'],
    experienceBand: '5-10',
    yearsExperience: 8,
    hourlyRate1on1: 350000,
    hourlyRateGroup: 200000,
    maxGroupSize: 4,
    ratingOverall: 4.8,
    ratingOnTime: 4.9,
    ratingFriendly: 4.7,
    ratingProfessional: 4.8,
    ratingRecommend: 4.9,
    reviewCount: 42,
    responseHint: 'Usually responds within 1 hour',
  },
  {
    name: 'Coach Huong Tran',
    phone: '0902000002',
    email: 'huong.tran@demo.com',
    photo: 'https://randomuser.me/api/portraits/women/65.jpg',
    bio: 'Passionate about introducing newcomers to pickleball. Patient teaching style with a fun, encouraging atmosphere.',
    certifications: ['PPR Certified'],
    specialties: ['Beginner Fundamentals', 'Serve & Return', 'Court Positioning'],
    languages: ['Vietnamese', 'English', 'French'],
    focusLevels: ['Beginner', 'Intermediate'],
    groupSizes: ['1-on-1', '2-4 players', '5-8 players'],
    experienceBand: '3-5',
    yearsExperience: 4,
    hourlyRate1on1: 280000,
    hourlyRateGroup: 150000,
    maxGroupSize: 8,
    ratingOverall: 4.9,
    ratingOnTime: 5.0,
    ratingFriendly: 5.0,
    ratingProfessional: 4.8,
    ratingRecommend: 4.9,
    reviewCount: 67,
    responseHint: 'Usually responds within 30 minutes',
  },
  {
    name: 'Coach Huy Le',
    phone: '0902000003',
    email: 'huy.le@demo.com',
    photo: 'https://randomuser.me/api/portraits/men/36.jpg',
    bio: 'Tournament player and tactician. I specialize in advanced strategy, pattern play, and competitive preparation.',
    certifications: ['IPTPA Level III', 'CPR/First Aid'],
    specialties: ['Tournament Prep', 'Advanced Strategy', 'Pattern Play', 'Ernie & ATP'],
    languages: ['Vietnamese', 'English'],
    focusLevels: ['Intermediate', 'Advanced', 'Pro'],
    groupSizes: ['1-on-1', '2-4 players'],
    experienceBand: '5-10',
    yearsExperience: 6,
    hourlyRate1on1: 450000,
    hourlyRateGroup: 250000,
    maxGroupSize: 4,
    ratingOverall: 4.7,
    ratingOnTime: 4.6,
    ratingFriendly: 4.5,
    ratingProfessional: 4.9,
    ratingRecommend: 4.8,
    reviewCount: 31,
    responseHint: 'Usually responds within 2 hours',
  },
  {
    name: 'Coach Ngoc Pham',
    phone: '0902000004',
    email: 'ngoc.pham@demo.com',
    photo: 'https://randomuser.me/api/portraits/women/33.jpg',
    bio: 'Youth and family specialist. I make pickleball fun and accessible for kids and parents alike.',
    certifications: ['PPR Certified', 'Youth Sports Coaching Certificate'],
    specialties: ['Youth Training', 'Family Sessions', 'Hand-Eye Coordination'],
    languages: ['Vietnamese'],
    focusLevels: ['Beginner', 'Intermediate'],
    groupSizes: ['1-on-1', '2-4 players', '5-8 players'],
    experienceBand: '3-5',
    yearsExperience: 3,
    hourlyRate1on1: 250000,
    hourlyRateGroup: 120000,
    maxGroupSize: 8,
    ratingOverall: 4.6,
    ratingOnTime: 4.7,
    ratingFriendly: 4.9,
    ratingProfessional: 4.4,
    ratingRecommend: 4.5,
    reviewCount: 23,
    responseHint: 'Usually responds within 1 hour',
  },
  {
    name: 'Coach Tri Vo',
    phone: '0902000005',
    email: 'tri.vo@demo.com',
    photo: 'https://randomuser.me/api/portraits/men/85.jpg',
    bio: 'Fitness-focused coach combining pickleball training with athletic conditioning. Get stronger while getting better.',
    certifications: ['NASM Personal Trainer', 'PPR Certified'],
    specialties: ['Fitness & Conditioning', 'Power Shots', 'Footwork Drills'],
    languages: ['Vietnamese', 'English'],
    focusLevels: ['Intermediate', 'Advanced'],
    groupSizes: ['1-on-1', '2-4 players'],
    experienceBand: '3-5',
    yearsExperience: 5,
    hourlyRate1on1: 400000,
    hourlyRateGroup: 220000,
    maxGroupSize: 4,
    ratingOverall: 4.5,
    ratingOnTime: 4.3,
    ratingFriendly: 4.6,
    ratingProfessional: 4.7,
    ratingRecommend: 4.4,
    reviewCount: 18,
    responseHint: 'Usually responds within 3 hours',
  },
  {
    name: 'Coach Lan Bui',
    phone: '0902000006',
    email: 'lan.bui@demo.com',
    photo: 'https://randomuser.me/api/portraits/women/42.jpg',
    bio: 'Doubles specialist with a calm, analytical approach. I help pairs communicate better and dominate the net.',
    certifications: ['IPTPA Level II'],
    specialties: ['Doubles Strategy', 'Net Play', 'Communication & Teamwork'],
    languages: ['Vietnamese', 'English', 'Japanese'],
    focusLevels: ['Intermediate', 'Advanced'],
    groupSizes: ['2-4 players'],
    experienceBand: '5-10',
    yearsExperience: 7,
    hourlyRate1on1: 380000,
    hourlyRateGroup: 200000,
    maxGroupSize: 4,
    ratingOverall: 4.8,
    ratingOnTime: 4.9,
    ratingFriendly: 4.8,
    ratingProfessional: 4.8,
    ratingRecommend: 4.9,
    reviewCount: 55,
    responseHint: 'Usually responds within 1 hour',
  },
  {
    name: 'Coach Tuan Do',
    phone: '0902000007',
    email: 'tuan.do@demo.com',
    photo: 'https://randomuser.me/api/portraits/men/67.jpg',
    bio: 'Video analysis expert. I film your matches and break down every shot to accelerate improvement.',
    certifications: ['PPR Certified', 'Sports Analytics Certificate'],
    specialties: ['Video Analysis', 'Shot Selection', 'Match Strategy'],
    languages: ['Vietnamese', 'English'],
    focusLevels: ['Intermediate', 'Advanced', 'Pro'],
    groupSizes: ['1-on-1'],
    experienceBand: '3-5',
    yearsExperience: 4,
    hourlyRate1on1: 500000,
    hourlyRateGroup: null,
    maxGroupSize: 1,
    ratingOverall: 4.9,
    ratingOnTime: 4.8,
    ratingFriendly: 4.7,
    ratingProfessional: 5.0,
    ratingRecommend: 5.0,
    reviewCount: 29,
    responseHint: 'Usually responds within 30 minutes',
  },
  {
    name: 'Coach Thao Hoang',
    phone: '0902000008',
    email: 'thao.hoang@demo.com',
    photo: 'https://randomuser.me/api/portraits/women/22.jpg',
    bio: 'Social pickleball organizer and coach. I run community clinics and love bringing people together through the sport.',
    certifications: ['PPR Certified', 'Community Sports Leader'],
    specialties: ['Community Clinics', 'Social Play', 'Beginner Workshops'],
    languages: ['Vietnamese', 'English', 'Korean'],
    focusLevels: ['Beginner', 'Intermediate'],
    groupSizes: ['2-4 players', '5-8 players'],
    experienceBand: '1-3',
    yearsExperience: 2,
    hourlyRate1on1: 200000,
    hourlyRateGroup: 100000,
    maxGroupSize: 8,
    ratingOverall: 4.7,
    ratingOnTime: 4.8,
    ratingFriendly: 5.0,
    ratingProfessional: 4.5,
    ratingRecommend: 4.6,
    reviewCount: 38,
    responseHint: 'Usually responds within 1 hour',
  },
  {
    name: 'Coach Bao Dang',
    phone: '0902000009',
    email: 'bao.dang@demo.com',
    photo: 'https://randomuser.me/api/portraits/men/15.jpg',
    bio: 'Former tennis pro who transitioned to pickleball. I bring a technical, high-performance approach to every session.',
    certifications: ['IPTPA Level III', 'ATP Coaching Certificate'],
    specialties: ['Transition from Tennis', 'Spin Shots', 'Power Serve', 'High-Performance Training'],
    languages: ['Vietnamese', 'English'],
    focusLevels: ['Advanced', 'Pro'],
    groupSizes: ['1-on-1', '2-4 players'],
    experienceBand: '10+',
    yearsExperience: 12,
    hourlyRate1on1: 600000,
    hourlyRateGroup: 350000,
    maxGroupSize: 4,
    ratingOverall: 4.6,
    ratingOnTime: 4.4,
    ratingFriendly: 4.3,
    ratingProfessional: 4.9,
    ratingRecommend: 4.7,
    reviewCount: 15,
    responseHint: 'Usually responds within 4 hours',
  },
  {
    name: 'Coach My Ly',
    phone: '0902000010',
    email: 'my.ly@demo.com',
    photo: 'https://randomuser.me/api/portraits/women/90.jpg',
    bio: 'Mindfulness meets pickleball. I help players overcome mental blocks, stay calm under pressure, and enjoy every point.',
    certifications: ['PPR Certified', 'Sports Psychology Certificate'],
    specialties: ['Mental Game', 'Pressure Situations', 'Mindful Play', 'Reset Routine'],
    languages: ['Vietnamese', 'English', 'Chinese'],
    focusLevels: ['Beginner', 'Intermediate', 'Advanced'],
    groupSizes: ['1-on-1', '2-4 players'],
    experienceBand: '3-5',
    yearsExperience: 5,
    hourlyRate1on1: 320000,
    hourlyRateGroup: 180000,
    maxGroupSize: 4,
    ratingOverall: 4.8,
    ratingOnTime: 4.9,
    ratingFriendly: 5.0,
    ratingProfessional: 4.7,
    ratingRecommend: 4.8,
    reviewCount: 44,
    responseHint: 'Usually responds within 1 hour',
  },
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function main() {
  console.log('--- Demo Seed: 10 Players + 10 Coaches ---\n');

  // ── Players ──
  console.log('Creating 10 demo players...');
  for (const p of players) {
    await prisma.userProfile.upsert({
      where: { phone: p.phone },
      update: { name: p.name, photo: p.photo, passwordHash },
      create: { name: p.name, phone: p.phone, photo: p.photo, passwordHash, savedVenues: [] },
    });
    console.log(`  ✓ ${p.name} (${p.phone})`);
  }

  // ── Coaches ──
  console.log('\nCreating 10 demo coaches...');
  for (const c of coaches) {
    const coach = await prisma.coach.upsert({
      where: { phone: c.phone },
      update: {
        name: c.name,
        email: c.email,
        photo: c.photo,
        bio: c.bio,
        phoneVerified: true,
        certifications: c.certifications,
        specialties: c.specialties,
        languages: c.languages,
        focusLevels: c.focusLevels,
        groupSizes: c.groupSizes,
        experienceBand: c.experienceBand,
        yearsExperience: c.yearsExperience,
        hourlyRate1on1: c.hourlyRate1on1,
        hourlyRateGroup: c.hourlyRateGroup,
        maxGroupSize: c.maxGroupSize,
        ratingOverall: c.ratingOverall,
        ratingOnTime: c.ratingOnTime,
        ratingFriendly: c.ratingFriendly,
        ratingProfessional: c.ratingProfessional,
        ratingRecommend: c.ratingRecommend,
        reviewCount: c.reviewCount,
        responseHint: c.responseHint,
        passwordHash,
      },
      create: {
        name: c.name,
        phone: c.phone,
        email: c.email,
        passwordHash,
        phoneVerified: true,
        photo: c.photo,
        bio: c.bio,
        certifications: c.certifications,
        specialties: c.specialties,
        languages: c.languages,
        focusLevels: c.focusLevels,
        groupSizes: c.groupSizes,
        experienceBand: c.experienceBand,
        yearsExperience: c.yearsExperience,
        hourlyRate1on1: c.hourlyRate1on1,
        hourlyRateGroup: c.hourlyRateGroup,
        maxGroupSize: c.maxGroupSize,
        ratingOverall: c.ratingOverall,
        ratingOnTime: c.ratingOnTime,
        ratingFriendly: c.ratingFriendly,
        ratingProfessional: c.ratingProfessional,
        ratingRecommend: c.ratingRecommend,
        reviewCount: c.reviewCount,
        responseHint: c.responseHint,
      },
    });

    // Add weekly recurring availability (3-5 days per coach)
    const existingAvail = await prisma.coachAvailability.count({ where: { coachId: coach.id } });
    if (existingAvail === 0) {
      const slots: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];
      const dayCount = 3 + Math.floor(Math.random() * 3); // 3-5 days
      const usedDays = new Set<number>();
      while (usedDays.size < dayCount) {
        usedDays.add(1 + Math.floor(Math.random() * 6)); // Mon-Sat
      }
      for (const dow of usedDays) {
        const morningStart = 7 + Math.floor(Math.random() * 2); // 7-8
        slots.push({ dayOfWeek: dow, startTime: `${String(morningStart).padStart(2, '0')}:00`, endTime: `${String(morningStart + 2).padStart(2, '0')}:00` });
        const afternoonStart = 15 + Math.floor(Math.random() * 3); // 15-17
        slots.push({ dayOfWeek: dow, startTime: `${String(afternoonStart).padStart(2, '0')}:00`, endTime: `${String(afternoonStart + 2).padStart(2, '0')}:00` });
      }
      await prisma.coachAvailability.createMany({
        data: slots.map((s) => ({
          coachId: coach.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      });
      const dayLabels = [...usedDays].sort().map((d) => DAY_NAMES[d]).join(', ');
      console.log(`  ✓ ${c.name} (${c.phone}) — availability: ${dayLabels}`);
    } else {
      console.log(`  ✓ ${c.name} (${c.phone}) — availability already exists`);
    }
  }

  // ── Credit packs for a few coaches ──
  console.log('\nCreating demo credit packs...');
  const allCoaches = await prisma.coach.findMany({
    where: { phone: { in: coaches.map((c) => c.phone) } },
    select: { id: true, phone: true, hourlyRate1on1: true },
  });

  for (const coach of allCoaches.slice(0, 5)) {
    const existing = await prisma.creditPack.count({ where: { coachId: coach.id } });
    if (existing > 0) continue;
    await prisma.creditPack.createMany({
      data: [
        {
          coachId: coach.id,
          name: '5-Session Pack',
          creditCount: 5,
          price: Math.round(coach.hourlyRate1on1 * 5 * 0.9),
          discountPercent: 10,
        },
        {
          coachId: coach.id,
          name: '10-Session Pack',
          creditCount: 10,
          price: Math.round(coach.hourlyRate1on1 * 10 * 0.8),
          discountPercent: 20,
        },
      ],
    });
  }

  console.log('\n✅ Demo seed complete!');
  console.log(`   Players: ${players.length}`);
  console.log(`   Coaches: ${coaches.length}`);
  console.log(`   Password for all accounts: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
