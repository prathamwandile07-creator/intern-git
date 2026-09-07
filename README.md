# InternTrack — Smart Internship Monitoring Platform

A full-stack internship monitoring platform that tracks attendance, punctuality, task progress, and mentor evaluations to generate actionable performance insights.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Icons:** Lucide React
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Routing:** React Router v7

## Demo Accounts

All accounts use password: `demo1234`

| Role   | Email                              |
|--------|------------------------------------|
| Intern | `arjun.sharma@interntrack.com`    |
| Mentor | `mentor.suresh@interntrack.com`   |
| Admin  | `admin@interntrack.com`           |

## Getting Started

```bash
npm install
npm run dev
```

Open the browser to the dev server URL. Click any demo account button on the login page.

## Project Structure

```
src/
├── App.tsx                          # Main router with role-based routes
├── main.tsx                         # App entry point with providers
├── index.css                        # Tailwind + custom animations
├── types/index.ts                   # All TypeScript interfaces
│
├── lib/
│   ├── supabase.ts                  # Supabase client init
│   ├── auth.tsx                     # Auth context (login, logout, session)
│   ├── performance.ts               # Punctuality + performance calculation engine
│   ├── insights.ts                  # Rule-based smart insight engine
│   ├── hooks.ts                     # Data fetching hooks
│   ├── navigation.ts                # Sidebar nav config per role
│   ├── toast.tsx                    # Toast notification system
│   └── database.types.ts            # Supabase database types
│
├── components/
│   ├── ProtectedRoute.tsx           # Auth guard
│   ├── RoleRoute.tsx                # Role guard
│   ├── layouts/AppShell.tsx        # Sidebar + topbar shell
│   └── ui/
│       ├── Button.tsx               # Reusable button (6 variants)
│       ├── Card.tsx                 # Card + CardHeader + CardBody
│       ├── Badge.tsx                # Status badges (7 colors)
│       ├── Input.tsx               # Input + Select + Textarea
│       ├── Modal.tsx               # Dialog modal
│       ├── ProgressBar.tsx          # Progress bars
│       ├── KPICard.tsx              # KPI metric cards
│       └── Skeleton.tsx             # Loading + empty states
│
├── pages/
│   ├── LoginPage.tsx               # Login with 3 demo account buttons
│   │
│   ├── intern/
│   │   ├── InternDashboard.tsx     # KPIs, check-in, charts, insights
│   │   ├── AttendancePage.tsx      # Check-in/out + history table
│   │   └── PunctualityPage.tsx     # Arrival bar chart + details
│   │
│   ├── mentor/
│   │   ├── MentorDashboard.tsx     # Intern performance table + risk
│   │   ├── MyInternsPage.tsx       # Searchable intern cards
│   │   └── InternProfile360.tsx    # Full 360-degree intern profile
│   │
│   ├── admin/
│   │   ├── AdminDashboard.tsx      # Org metrics + distribution pie
│   │   ├── AdminInternsPage.tsx    # All interns table with filters
│   │   ├── AdminMentorsPage.tsx    # All mentors grid
│   │   ├── AnalyticsPage.tsx       # 5 charts + department comparison
│   │   ├── DemoModePage.tsx        # Hackathon demo simulation controls
│   │   └── SettingsPage.tsx        # System info + performance weights
│   │
│   └── shared/
│       ├── TasksPage.tsx           # Task list with filters + progress update
│       ├── PerformancePage.tsx     # Score breakdown + radar + trend
│       ├── FeedbackPage.tsx        # Mentor feedback form / intern view
│       ├── AlertsPage.tsx          # Alert center with mark-as-read
│       └── ProfilePage.tsx         # Editable user profile
│
supabase/
├── config.toml                      # Edge function config
├── migrations/
│   └── 20260906141135_create_interntrack_schema.sql  # Full DB schema + RLS
└── functions/
    └── seed-demo-data/index.ts     # Seeds demo users + data
```

## Database Schema (8 tables)

| Table            | Purpose                                          |
|------------------|--------------------------------------------------|
| `departments`    | Organization departments                         |
| `profiles`        | Users (intern, mentor, admin roles)              |
| `internships`     | Internship assignments with mentor + department |
| `attendance`     | Daily check-in/check-out records                 |
| `tasks`          | Assigned tasks with priority, status, progress   |
| `feedback`       | Mentor evaluations (6 metrics + written)         |
| `performance`    | Periodic performance snapshots                   |
| `alerts`         | Smart alerts generated from insights             |

All tables have Row Level Security (RLS) with role-based policies.

## Performance Formula

```
Overall = Attendance x 0.25 + Punctuality x 0.25 + TaskCompletion x 0.25 + MentorEval x 0.25
```

| Score Range | Level              |
|-------------|--------------------|
| 90-100      | Excellent          |
| 75-89       | Good               |
| 60-74       | Needs Improvement  |
| Below 60    | At Risk            |

## Punctuality Rules

| Arrival Time                    | Status   |
|---------------------------------|----------|
| At or before expected time      | Early    |
| 1-10 minutes after expected     | On Time  |
| More than 10 minutes late        | Late     |

## Smart Insights Engine

The insights engine (`src/lib/insights.ts`) automatically detects:
- Low attendance (below 75%)
- Repeated late arrivals (3+ times)
- Overdue tasks
- Approaching deadlines (within 3 days, below 50% progress)
- Declining performance (5+ point drop)
- Low task completion (below 60%)
- Below-target punctuality
- Missing mentor feedback
- Strong performance (85%+ with no issues)

## Demo Data

The database is seeded with:
- 14 demo users (1 admin, 3 mentors, 10 interns)
- 4 departments
- 10 internships
- 200 attendance records
- 59 tasks
- 10 feedback records
- 40 performance snapshots
- 24 alerts

## Available Scripts

| Command            | Description                  |
|--------------------|------------------------------|
| `npm run dev`      | Start dev server             |
| `npm run build`    | Build for production         |
| `npm run preview`  | Preview production build     |
| `npm run typecheck`| Type-check the project       |
| `npm run lint`     | Run ESLint                   |
