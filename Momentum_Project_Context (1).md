# Momentum — Project Context & Current Design

## 1. What is Momentum?

**Momentum** is a personal productivity and self-improvement application.

The core idea is not just to track whether a user completed habits. Momentum should help the user understand:

- What they want to achieve
- What they planned to do regularly
- What they actually did
- What they thought/felt about their day
- How their real behavior compares with their goals and plans
- What patterns can be identified over time

The long-term differentiator is the **AI feedback layer**, which can look at all of this information together and provide contextual feedback.

The overall idea is:

> **Plan → Do → Reflect → Understand → Improve**

---

# 2. The Four Core Concepts

The most important thing to remember is that **Goal, Habit, Activity, and Journal are deliberately different concepts**.

## Goal

A **Goal** is something the user wants to achieve.

Examples:

- Crack software engineering interviews
- Improve fitness
- Learn React
- Build Momentum
- Read 12 books this year

A Goal answers:

> **"What am I trying to achieve?"**

A Goal can have **zero, one, or many Habits**.

Example:

```text
Goal: Crack SDE Interviews
│
├── Habit: Solve DSA problems
├── Habit: Study system design
└── Habit: Practice SQL
```

But a Goal does not need to have a Habit.

---

# 3. Habit

A **Habit** is something the user intends to do repeatedly.

A Habit answers:

> **"What do I plan to repeatedly do?"**

Examples:

- Go to the gym
- Solve DSA problems
- Read
- Practice SQL
- Meditate

A Habit can be:

### Goal-linked

```text
Goal: Crack SDE Interviews
        │
        ├── Habit: Solve DSA
        └── Habit: Practice SQL
```

### Independent

```text
Habit: Drink 3L water
```

An independent Habit simply has no Goal attached to it.

Therefore:

```text
Goal → many Habits

Habit → zero or one Goal
```

This is represented by an optional `goalId` on Habit.

---

# 4. Habit Schedule

We decided that simply having a `frequency` field such as `daily` or `weekly` was too vague.

Instead, a Habit has a **specific weekly schedule**.

For example:

```text
Habit: Gym

Scheduled days:
Monday
Friday
Saturday
```

Another:

```text
Habit: DSA

Scheduled days:
Monday
Tuesday
Wednesday
Thursday
Friday
```

Another:

```text
Habit: Weekly Review

Scheduled:
Sunday
```

The schedule answers:

> **"On which days do I intend to do this Habit?"**

## Data model

Use a separate `HabitSchedule` model.

Conceptually:

```text
Habit
  │
  ├── Monday
  ├── Friday
  └── Saturday
```

`dayOfWeek` should be an enum rather than storing something like:

```text
"mon,fri,sat"
```

Suggested enum values:

```text
MONDAY
TUESDAY
WEDNESDAY
THURSDAY
FRIDAY
SATURDAY
SUNDAY
```

A unique constraint on:

```text
(habitId, dayOfWeek)
```

prevents accidentally scheduling the same day twice.

## Important

The schedule is a **plan**, NOT a restriction.

If a user schedules Gym for:

```text
Monday, Friday, Saturday
```

but goes to the gym on Tuesday, that Tuesday activity is still valid.

The system must never say:

> "Tuesday isn't scheduled, so you cannot record Gym."

---

# 5. Habit Log

A `HabitLog` records whether a scheduled Habit was completed on a particular day.

It answers:

> **"Did I complete this Habit on this particular day?"**

Example:

```text
Habit: Gym

Schedule:
Monday
Friday
Saturday

Habit Logs:

Monday    → completed
Friday    → completed
Saturday  → not completed
```

The model is conceptually:

```text
HabitLog
- habitId
- day
- completed
- createdAt
- updatedAt
```

A unique constraint should exist on:

```text
(habitId, day)
```

because a Habit should have at most one completion state for a particular day.

## Important distinction

Do not confuse:

**Habit**

with:

**HabitLog**

The Habit is the persistent recurring intention.

The HabitLog is what happened for that Habit on a particular day.

---

# 6. Activity

An **Activity** represents something the user actually did.

It answers:

> **"What did I actually do?"**

This is intentionally different from a Habit.

A user can perform an Activity without having planned it.

Example:

```text
Activity:
Played Chess
Duration: 2 hours
```

There does not need to be a Chess Habit.

Another example:

```text
Activity:
Watched a movie
Duration: 2 hours
```

Again, this does not need to become a Habit.

---

# 7. Activity Can Be Linked to a Habit

An Activity has an **optional `habitId`**.

This is an important part of the design.

Example:

```text
Habit:
Gym

Schedule:
Monday
Friday
Saturday
```

On Monday:

```text
Activity:
Gym
Duration: 1 hour
habitId = Gym Habit
```

On Tuesday, even though Tuesday is not scheduled:

```text
Activity:
Gym
Duration: 45 minutes
habitId = Gym Habit
```

This is completely valid.

The Activity records reality.

The HabitSchedule records the plan.

---

# 8. Activity Can Become a Habit Later

This was another important requirement.

Suppose the user initially does:

```text
Activity:
Played Chess
Duration: 2 hours
habitId = null
```

Later they realize:

> "I want to play chess regularly."

They can create:

```text
Habit:
Play Chess
```

and choose a schedule such as:

```text
Tuesday
Thursday
Saturday
```

Future Chess Activities can then reference that Habit.

The important point is:

> **Do not automatically create a Habit when an Activity is created.**

An Activity is simply something the user actually did.

The user can decide later that they want to turn that behavior into a Habit.

Historical Activities should remain preserved.

---

# 9. Multiple Activities Are Allowed

Multiple Activities can happen for the same Habit on the same day.

Example:

```text
Habit: Chess

Activity 1:
10:00–12:00 → Chess

Activity 2:
18:00–19:00 → Chess
```

These are two separate Activity records.

Therefore, we should NOT have a uniqueness constraint like:

```text
(userId, habitId, day)
```

on Activities.

---

# 10. Planned vs Actual

This distinction is central to Momentum.

## Planned

The dashboard can derive planned Habits from:

```text
Active Habits
+
HabitSchedule
+
Current day
```

For example:

```text
Monday

PLANNED
──────────────
☐ Gym
☐ DSA
☐ Reading
```

## Actual

The dashboard can derive actual behavior from:

```text
Activities
+
HabitLogs
```

For example:

```text
Monday

ACTUAL
──────────────
✓ Gym — 1 hour
✓ Chess — 2 hours
✓ YouTube — 30 minutes
```

Notice that Chess and YouTube can appear even though they were never planned Habits.

Likewise, an Activity can be associated with a Habit even if it happened outside that Habit's scheduled days.

---

# 11. Journal

The Journal is intentionally simple.

It is **not another productivity tracker**.

It is a place where the user can write about their day.

A JournalEntry currently contains only:

```text
id
userId
day
content
createdAt
updatedAt
```

There is intentionally **no mood field** right now.

Do not add:

- mood
- tags
- categories
- ratings
- sentiment
- goalId
- habitId
- activityId
- AI summary
- AI score
- AI feedback

The Journal answers:

> **"What did I write or reflect about my day?"**

---

# 12. Journal Is Optional

The user does NOT have to journal every day.

There can be:

```text
September 10 → journal entry
September 11 → no entry
September 12 → journal entry
```

Do not turn journaling into another mandatory habit.

The Journal should feel like a place the user can write when they have something to say.

---

# 13. One Journal Entry Per Day

For now, we decided to allow only one JournalEntry per user per day.

Therefore:

```text
(userId, day) UNIQUE
```

If the user wants to add more thoughts later that day, they edit the existing entry.

Example:

```text
September 12

"Today was productive. Finished the backend work..."
```

Later:

```text
"Today was productive. Finished the backend work.
Also went to the gym in the evening."
```

---

# 14. Why Journal Matters for AI

The Journal becomes particularly valuable when combined with actual activity.

Raw activity data might say:

```text
DSA planned: 1 hour
DSA actual: 20 minutes
Chess: 3 hours
```

But the Journal might say:

> "I couldn't focus today because I was mentally tired after college."

Now AI has context.

Instead of simply saying:

> "You failed to complete your DSA habit."

AI can potentially reason:

> "Your DSA time was lower than planned today, and your journal indicates that you were mentally tired. This may have contributed to the reduced study time."

The AI should distinguish between:

### Facts

Data directly recorded by the application:

```text
DSA planned: 1 hour
DSA actual: 20 minutes
Chess: 3 hours
```

### User statements

Things explicitly written in the Journal:

```text
"I was mentally tired."
```

### AI interpretation

An inference based on the above:

```text
"The tiredness may have contributed to the reduced DSA time."
```

AI should not make strong claims from weak evidence.

For example, if the user writes:

> "Today sucked."

AI should not automatically conclude:

> "You are experiencing burnout."

---

# 15. Future AI Architecture

The long-term AI context should combine:

```text
Goals
+
Habits
+
Habit Schedules
+
Habit Logs
+
Activities
+
Journal Entries
```

Conceptually:

```text
                 ┌─────────────┐
                 │    Goals    │
                 └──────┬──────┘
                        │
                        ▼
                 ┌─────────────┐
                 │   Habits    │
                 └──────┬──────┘
                        │
              ┌─────────┴─────────┐
              ▼                   ▼
      Habit Schedules        Habit Logs

                 Activities
                      │
                      │
                 Journal
                      │
                      ▼
                    AI
                      │
                      ▼
             Contextual Feedback
```

The AI should eventually answer questions such as:

- Am I actually progressing toward my goals?
- Which habits am I consistently missing?
- What activities consume most of my time?
- Am I spending time on things that weren't planned?
- Are there patterns between my journal reflections and my actual behavior?
- Am I consistently working toward my goals?
- Are my planned habits realistic?
- What patterns have appeared over several weeks?

---

# 16. Important Domain Separation

Never collapse the concepts.

| Concept | Meaning |
|---|---|
| **Goal** | What I want to achieve |
| **Habit** | What I intend to repeatedly do |
| **HabitSchedule** | Which days I intend to do it |
| **HabitLog** | Whether I completed it on a particular day |
| **Activity** | What I actually did |
| **JournalEntry** | What I wrote/reflected about that day |
| **AI** | What can be learned from all of the above |

A useful mental model is:

```text
GOAL
"What do I want?"

      ↓

HABIT
"What do I repeatedly plan to do?"

      ↓

SCHEDULE
"When do I plan to do it?"

      ↓

ACTUAL BEHAVIOR
"What did I really do?"

      ↓

JOURNAL
"How did I experience that day?"

      ↓

AI
"What can I learn from the pattern?"
```

---

# 17. Current Data Model

The planned Prisma/domain structure is:

```text
User
│
├── Goal
│    └── Habit (0..many)
│
├── Habit
│    ├── HabitSchedule (0..many)
│    └── HabitLog (0..many)
│
├── Activity
│    └── optional Habit
│
└── JournalEntry
```

More explicitly:

```text
Goal
- id
- userId
- title
- description?
- status
- targetDate?
- createdAt
- updatedAt

Habit
- id
- userId
- goalId?
- title
- description?
- status
- createdAt
- updatedAt

HabitSchedule
- id
- habitId
- dayOfWeek
- unique(habitId, dayOfWeek)

HabitLog
- id
- habitId
- day
- completed
- createdAt
- updatedAt
- unique(habitId, day)

Activity
- id
- userId
- habitId?
- title
- description?
- startTime?
- endTime?
- duration?
- day
- createdAt
- updatedAt

JournalEntry
- id
- userId
- day
- content
- createdAt
- updatedAt
- unique(userId, day)
```

---

# 18. Important Relationships

## Goal → Habit

One Goal can have many Habits.

One Habit can belong to zero or one Goal.

```text
Goal 1 ──────── * Habit
```

Example:

```text
Goal: Crack SDE Interviews
│
├── Solve DSA
├── Practice SQL
└── Study System Design
```

An independent Habit:

```text
Habit: Drink Water
Goal: null
```

---

## Habit → HabitSchedule

One Habit can have many scheduled days.

```text
Habit 1 ──────── * HabitSchedule
```

Example:

```text
Gym
├── Monday
├── Friday
└── Saturday
```

---

## Habit → HabitLog

One Habit can have many logs.

```text
Habit 1 ──────── * HabitLog
```

Example:

```text
Gym
│
├── Sep 1 → completed
├── Sep 2 → completed
└── Sep 3 → not completed
```

---

## Habit → Activity

An Activity may optionally belong to a Habit.

```text
Habit 1 ──────── * Activity
```

But Activity does NOT require a Habit.

```text
Activity
habitId = null
```

is valid.

---

## User → JournalEntry

A User can have many JournalEntries.

```text
User 1 ──────── * JournalEntry
```

But only one per calendar day.

---

# 19. Data Integrity Rules

If a Habit references a Goal:

```text
Habit.userId === Goal.userId
```

If an Activity references a Habit:

```text
Activity.userId === Habit.userId
```

This prevents cross-user relationships such as:

```text
User A's Activity
       ↓
User B's Habit
```

The application should validate these relationships.

---

# 20. Delete Behavior

Important intended behavior:

### Delete User

Delete the user's:

- Goals
- Habits
- HabitSchedules
- HabitLogs
- Activities
- JournalEntries

### Delete Habit

Remove:

- HabitSchedules
- HabitLogs

But preserve historical Activities.

If an Activity was linked to that Habit, its `habitId` should become `null` rather than deleting the Activity.

This is important because Activities represent actual historical behavior.

### Delete Goal

Do not accidentally destroy all Habits and their history unless that behavior is explicitly chosen later.

A safer approach is to handle the Goal-Habit relationship deliberately.

---

# 21. Current Tech Stack / Project Context

Momentum's backend architecture discussed so far uses:

- Node.js
- Express
- PostgreSQL
- Prisma

Authentication uses Google OAuth and JWT.

The existing authentication concept is:

```text
Google OAuth
    ↓
Google user identity
    ↓
User
    ↓
JWT
    ↓
Authenticated API requests
```

The backend uses the authenticated user's ID to determine ownership of Goals, Habits, Activities, and JournalEntries.

---

# 22. Google OAuth Development Note

For team development, the preferred approach discussed was:

- Use the same Google Cloud project for Momentum.
- Each developer should ideally have their own OAuth client credentials for local development.
- Do not casually share a Google OAuth Client Secret.
- Client IDs are not secrets, but Client Secrets should remain private.
- Production should use its own appropriate OAuth configuration.

Local environment variables should remain in `.env` and should not be committed to Git.

---

# 23. Current Implementation Direction

The last implementation task we were preparing was the **initial Prisma/domain schema**.

The intended models are:

```text
Goal
Habit
HabitSchedule
HabitLog
Activity
JournalEntry
```

with the existing User model connected to them.

The implementation should focus first on:

1. Prisma models
2. Relationships
3. Constraints
4. Indexes
5. Migration

Then later:

1. Backend APIs
2. Frontend pages/components
3. Dashboard
4. Activity logging
5. Journal UI
6. AI analysis/feedback

---

# 24. Things We Explicitly Decided NOT to Do Yet

Do not prematurely add:

- Mood field to Journal
- Journal tags
- Journal sentiment
- AI-generated journal summaries
- AI scores
- Automatic Habit creation from Activities
- Complex Habit frequency enums
- Overly complex recurrence rules
- Forced daily journaling
- Goal percentage fields unless needed later
- Automatic AI modification of goals/habits

Keep the initial domain model simple.

---

# 25. The Big Picture

Momentum should eventually feel like this:

```text
                    WHAT I WANT
                        │
                        ▼
                      GOAL
                        │
                        ▼
                     HABITS
                        │
                        ▼
                    SCHEDULE
                        │
                 "What I planned"
                        │
                        ▼
              ┌───────────────────┐
              │                   │
              ▼                   ▼
        HABIT LOGS            ACTIVITIES
        "Did I do it?"        "What did I do?"
              │                   │
              └─────────┬─────────┘
                        │
                        ▼
                    JOURNAL
               "How was my day?"
                        │
                        ▼
                       AI
                        │
                        ▼
              "What can I improve?"
```

The most important philosophy is:

> **Momentum should not judge the user only by whether they checked a habit box.**

It should understand the difference between:

- what the user planned,
- what the user actually did,
- what the user wanted to achieve,
- and what the user experienced.

That is what gives the eventual AI feedback meaningful context.

---

# 26. Current Mental Model — Short Version

If you forget everything else, remember this:

```text
GOAL
→ Destination

HABIT
→ Repeated behavior I want

SCHEDULE
→ When I intend to do the habit

HABIT LOG
→ Whether I completed the planned habit

ACTIVITY
→ Anything I actually did

JOURNAL
→ What I wrote about my day

AI
→ Connects all of this and gives useful feedback
```

**Momentum = Plan + Actual Behavior + Reflection + AI Insight**
