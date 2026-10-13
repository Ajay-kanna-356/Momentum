import prisma from "../src/config/database.js";

function getUtcMidnight(date = new Date()) {
  const iso = date.toISOString().slice(0, 10);
  return new Date(`${iso}T00:00:00.000Z`);
}

function subDaysDate(baseDate, days) {
  const d = new Date(baseDate);
  d.setUTCDate(d.getUTCDate() - days);
  return getUtcMidnight(d);
}

function timeUtc(timeStr) {
  return new Date(`1970-01-01T${timeStr}:00.000Z`);
}

export async function seedData() {
  console.log("🌱 Starting seed process...");

  const users = await prisma.user.findMany();
  if (users.length === 0) {
    console.log("⚠️ No users found in database. Please log in via the UI or create a user first.");
    return;
  }

  const today = getUtcMidnight(new Date());
  console.log(`📅 Seeding reference today date: ${today.toISOString().slice(0, 10)}`);

  for (const user of users) {
    console.log(`\n👤 Seeding data for User ID ${user.id} (${user.name} - ${user.email})...`);

    // Clean existing entities for this user to avoid unique constraint collisions
    await prisma.activity.deleteMany({ where: { userId: user.id } });
    await prisma.journalEntry.deleteMany({ where: { userId: user.id } });
    
    // Habits cascade habitSchedules and habitLogs
    await prisma.habit.deleteMany({ where: { userId: user.id } });
    await prisma.goal.deleteMany({ where: { userId: user.id } });

    // 1. Create Goals
    console.log("  🎯 Creating goals...");
    const systemDesignGoal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: "Master System Design & Distributed Systems",
        description: "Study scalability, caching strategies, messaging queues, and database sharding patterns for senior engineering.",
        status: "active",
        targetDate: new Date("2027-01-15T00:00:00.000Z"),
      },
    });

    const momentumGoal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: "Build & Launch Momentum SaaS",
        description: "Develop fullstack productivity workspace, polish responsive UI, and onboard initial beta users.",
        status: "active",
        targetDate: new Date("2026-12-31T00:00:00.000Z"),
      },
    });

    const fitnessGoal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: "Physical Conditioning & Fitness",
        description: "Maintain 5x weekly strength training and 5km weekly running pace.",
        status: "active",
        targetDate: new Date("2026-12-15T00:00:00.000Z"),
      },
    });

    const readingGoal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: "Read 20 High-Impact Engineering Books",
        description: "Completed DDIA, Clean Architecture, Refactoring, and Atomic Habits.",
        status: "completed",
        targetDate: subDaysDate(today, 10),
      },
    });

    const rustGoal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: "Learn Rust Memory Model",
        description: "Explored borrow checker, lifetimes, and systems programming basics.",
        status: "archived",
        targetDate: subDaysDate(today, 60),
      },
    });

    // 2. Create Habits with schedules
    console.log("  🔁 Creating habits & schedules...");
    const habitWorkout = await prisma.habit.create({
      data: {
        userId: user.id,
        goalId: fitnessGoal.id,
        title: "Strength & Cardio Workout",
        description: "45-60 min progressive overload or tempo cardio run.",
        status: "active",
        schedules: {
          create: [
            { dayOfWeek: "MONDAY" },
            { dayOfWeek: "TUESDAY" },
            { dayOfWeek: "WEDNESDAY" },
            { dayOfWeek: "THURSDAY" },
            { dayOfWeek: "FRIDAY" },
            { dayOfWeek: "SATURDAY" },
          ],
        },
      },
    });

    const habitSystemDesign = await prisma.habit.create({
      data: {
        userId: user.id,
        goalId: systemDesignGoal.id,
        title: "System Design Problem Solving",
        description: "Deconstruct 1 large scale distributed system problem (Kafka, CDN, Rate Limiter).",
        status: "active",
        schedules: {
          create: [
            { dayOfWeek: "MONDAY" },
            { dayOfWeek: "TUESDAY" },
            { dayOfWeek: "WEDNESDAY" },
            { dayOfWeek: "THURSDAY" },
            { dayOfWeek: "FRIDAY" },
          ],
        },
      },
    });

    const habitMomentumDev = await prisma.habit.create({
      data: {
        userId: user.id,
        goalId: momentumGoal.id,
        title: "Momentum Core Feature Development",
        description: "Dedicated deep-work focus block on Momentum client and server features.",
        status: "active",
        schedules: {
          create: [
            { dayOfWeek: "MONDAY" },
            { dayOfWeek: "TUESDAY" },
            { dayOfWeek: "WEDNESDAY" },
            { dayOfWeek: "THURSDAY" },
            { dayOfWeek: "FRIDAY" },
            { dayOfWeek: "SATURDAY" },
            { dayOfWeek: "SUNDAY" },
          ],
        },
      },
    });

    const habitReading = await prisma.habit.create({
      data: {
        userId: user.id,
        goalId: null,
        title: "Read 30 Pages Tech & Mindset",
        description: "Consistent evening reading block before sleep.",
        status: "active",
        schedules: {
          create: [
            { dayOfWeek: "MONDAY" },
            { dayOfWeek: "TUESDAY" },
            { dayOfWeek: "WEDNESDAY" },
            { dayOfWeek: "THURSDAY" },
            { dayOfWeek: "FRIDAY" },
            { dayOfWeek: "SATURDAY" },
            { dayOfWeek: "SUNDAY" },
          ],
        },
      },
    });

    const habitJournal = await prisma.habit.create({
      data: {
        userId: user.id,
        goalId: null,
        title: "Daily Reflection & Journaling",
        description: "Reflect on accomplishments, blockers, and set tomorrow's top 3 priorities.",
        status: "active",
        schedules: {
          create: [
            { dayOfWeek: "MONDAY" },
            { dayOfWeek: "TUESDAY" },
            { dayOfWeek: "WEDNESDAY" },
            { dayOfWeek: "THURSDAY" },
            { dayOfWeek: "FRIDAY" },
            { dayOfWeek: "SATURDAY" },
            { dayOfWeek: "SUNDAY" },
          ],
        },
      },
    });

    const habitWeeklyReview = await prisma.habit.create({
      data: {
        userId: user.id,
        goalId: null,
        title: "Weekly Review & Retrospective",
        description: "Audit weekly analytics, adjust schedules, and plan key milestones.",
        status: "active",
        schedules: {
          create: [
            { dayOfWeek: "SUNDAY" },
          ],
        },
      },
    });

    // 3. Create Habit Logs
    console.log("  📝 Creating habit completion logs...");
    // Today's logs: mark 2 habits as completed, leave the others uncompleted so user can toggle them!
    await prisma.habitLog.createMany({
      data: [
        { habitId: habitWorkout.id, day: today, completed: true },
        { habitId: habitSystemDesign.id, day: today, completed: true },
        // habitMomentumDev, habitReading, habitJournal left pending/false for manual UI toggle testing!
      ],
    });

    // Past 90 days history logs for habits (100% dark green days, partial lesser green days, and blank days)
    for (let i = 1; i <= 90; i++) {
      const pastDay = subDaysDate(today, i);
      const dayOfWeekNum = pastDay.getUTCDay(); // 0 is Sun, 6 is Sat
      
      // Determine daily completion profile:
      // Type A (approx 35% of days): 100% completed -> Dark Green
      // Type B (approx 45% of days): Partial completed -> Lesser Green
      // Type C (approx 20% of days): 0 completed (rest/break days) -> Blank
      const pattern = (i * 7 + dayOfWeekNum) % 10;
      
      if (pattern >= 8) {
        // Type C: Blank day (0 completed)
        continue;
      }
      
      const isPerfectDay = pattern <= 3; // 100% completed
      
      if (isPerfectDay) {
        // 100% Completed on all scheduled habits
        await prisma.habitLog.createMany({
          data: [
            { habitId: habitWorkout.id, day: pastDay, completed: true },
            { habitId: habitSystemDesign.id, day: pastDay, completed: true },
            { habitId: habitMomentumDev.id, day: pastDay, completed: true },
            { habitId: habitReading.id, day: pastDay, completed: true },
            { habitId: habitJournal.id, day: pastDay, completed: true },
          ],
        });
      } else {
        // Partial day: Some completed, some not -> Lesser Green
        const isMed = pattern % 2 === 0;
        await prisma.habitLog.createMany({
          data: [
            { habitId: habitWorkout.id, day: pastDay, completed: isMed },
            { habitId: habitSystemDesign.id, day: pastDay, completed: !isMed },
            { habitId: habitMomentumDev.id, day: pastDay, completed: true },
            { habitId: habitReading.id, day: pastDay, completed: false },
            { habitId: habitJournal.id, day: pastDay, completed: isMed },
          ],
        });
      }
    }

    // 4. Create Activities (Today + Past 20 days for Analytics heatmap & Activities table)
    console.log("  ⏱️ Creating activities...");
    // Today's activities
    await prisma.activity.createMany({
      data: [
        {
          userId: user.id,
          habitId: habitSystemDesign.id,
          title: "System Design: Distributed Cache & CDN",
          description: "Designed multi-tier Redis caching layer with cache-aside and write-behind patterns.",
          day: today,
          startTime: timeUtc("09:00"),
          endTime: timeUtc("10:30"),
          duration: 90,
        },
        {
          userId: user.id,
          habitId: habitWorkout.id,
          title: "Morning Strength & Conditioning",
          description: "Heavy compound lifts (squats, overhead press) + 15 min core training.",
          day: today,
          startTime: timeUtc("07:15"),
          endTime: timeUtc("08:15"),
          duration: 60,
        },
        {
          userId: user.id,
          habitId: habitMomentumDev.id,
          title: "Momentum UI/UX & Responsive Layout",
          description: "Implemented table alignment, flexible headers, and modal accessible forms.",
          day: today,
          startTime: timeUtc("11:00"),
          endTime: timeUtc("12:15"),
          duration: 75,
        },
      ],
    });

    // Past days activities (for rich Analytics heatmap and Activities list)
    const samplePastActivities = [
      { daysAgo: 1, title: "Momentum Frontend Polish", duration: 120, start: "14:00", end: "16:00", habitId: habitMomentumDev.id, desc: "Refactored Dashboard metrics and Habit checkbox synchronization." },
      { daysAgo: 1, title: "System Design Mock Interview", duration: 60, start: "10:00", end: "11:00", habitId: habitSystemDesign.id, desc: "Designed Twitter news feed architecture with Fanout-on-write." },
      { daysAgo: 2, title: "Database Sharding & Partitioning", duration: 90, start: "09:30", end: "11:00", habitId: habitSystemDesign.id, desc: "Studied consistent hashing, virtual nodes, and cross-shard querying." },
      { daysAgo: 2, title: "5km Tempo Run", duration: 35, start: "06:30", end: "07:05", habitId: habitWorkout.id, desc: "Maintained 5:10 min/km pace outdoor run." },
      { daysAgo: 3, title: "Momentum API Integration", duration: 105, start: "15:00", end: "16:45", habitId: habitMomentumDev.id, desc: "Implemented activities and schedule endpoints with full test coverage." },
      { daysAgo: 4, title: "Clean Architecture Refactoring", duration: 80, start: "11:00", end: "12:20", habitId: habitMomentumDev.id, desc: "Decoupled route controllers from service layer and domain logic." },
      { daysAgo: 4, title: "Gym Leg Day Workout", duration: 55, start: "07:00", end: "07:55", habitId: habitWorkout.id, desc: "Barbell back squats, Romanian deadlifts, Bulgarian split squats." },
      { daysAgo: 5, title: "Distributed Consensus & Raft", duration: 90, start: "10:00", end: "11:30", habitId: habitSystemDesign.id, desc: "Read research paper on Raft leader election and log replication." },
      { daysAgo: 6, title: "Momentum Auth & JWT Security", duration: 90, start: "14:00", end: "15:30", habitId: habitMomentumDev.id, desc: "Audited token refresh mechanisms and CORS security headers." },
      { daysAgo: 7, title: "Weekly Review & Roadmap", duration: 45, start: "19:00", end: "19:45", habitId: habitWeeklyReview.id, desc: "Reviewed Q4 milestones and sprint backlog." },
      { daysAgo: 8, title: "Full Body Resistance Training", duration: 60, start: "07:00", end: "08:00", habitId: habitWorkout.id, desc: "Push-pull routine." },
      { daysAgo: 9, title: "Microservices Communication Patterns", duration: 75, start: "10:00", end: "11:15", habitId: habitSystemDesign.id, desc: "gRPC vs REST vs GraphQL comparison benchmarks." },
      { daysAgo: 10, title: "Reading: Designing Data-Intensive Apps", duration: 45, start: "21:30", end: "22:15", habitId: habitReading.id, desc: "Chapter on Partitioning and secondary indexes." },
      { daysAgo: 12, title: "Momentum Dashboard Prototype", duration: 120, start: "13:00", end: "15:00", habitId: habitMomentumDev.id, desc: "Initial layout inspired by modern productivity dashboards." },
      { daysAgo: 14, title: "Cardio & Interval Sprints", duration: 40, start: "06:45", end: "07:25", habitId: habitWorkout.id, desc: "Track interval sprints." },
      { daysAgo: 16, title: "Redis Cache Eviction Strategies", duration: 60, start: "11:00", end: "12:00", habitId: habitSystemDesign.id, desc: "LRU, LFU, and volatile-ttl eviction benchmarks." },
      { daysAgo: 18, title: "Deep Work Coding", duration: 110, start: "14:00", end: "15:50", habitId: habitMomentumDev.id, desc: "Prisma database schema definitions and indexing." },
      { daysAgo: 21, title: "Upper Body Hypertrophy", duration: 65, start: "07:00", end: "08:05", habitId: habitWorkout.id, desc: "Bench press, pull-ups, lateral raises." },
      { daysAgo: 25, title: "Event-Driven Architecture", duration: 80, start: "10:00", end: "11:20", habitId: habitSystemDesign.id, desc: "Event sourcing and CQRS design patterns." },
    ];

    for (const act of samplePastActivities) {
      await prisma.activity.create({
        data: {
          userId: user.id,
          habitId: act.habitId,
          title: act.title,
          description: act.desc,
          day: subDaysDate(today, act.daysAgo),
          startTime: timeUtc(act.start),
          endTime: timeUtc(act.end),
          duration: act.duration,
        },
      });
    }

    // 5. Create Journal Entries
    console.log("  📖 Creating journal entries...");
    await prisma.journalEntry.createMany({
      data: [
        {
          userId: user.id,
          day: today,
          content: "Very high energy and focus today! Finalized the distributed cache architecture notes and completed a strong morning workout. The Momentum UI looks crisp and responsive—ready for user testing.",
        },
        {
          userId: user.id,
          day: subDaysDate(today, 1),
          content: "Made great headway on Momentum frontend components. Polished table alignments and modal labels. Looking forward to testing habit logging on the live UI tomorrow.",
        },
        {
          userId: user.id,
          day: subDaysDate(today, 2),
          content: "Reviewed database sharding principles and consistent hashing algorithms. Great clarity on how partitioned databases handle rebalancing without downtime.",
        },
        {
          userId: user.id,
          day: subDaysDate(today, 3),
          content: "Solid coding sprint. Implemented unit tests for habit schedules and activities. Feeling disciplined and in the zone.",
        },
      ],
    });

    console.log(`  ✅ Finished seeding User ID ${user.id}!`);
  }

  console.log("\n✨ Database seeding completed successfully!");
}

// Run directly if invoked via node
if (process.argv[1]?.endsWith("seed.js")) {
  seedData()
    .catch((err) => {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
