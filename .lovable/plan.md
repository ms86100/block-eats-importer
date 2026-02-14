

# Strategic Upgrade: From Utility App to Trust Infrastructure

## Problem Statement

The app currently functions as a collection of independent utilities buried behind a food marketplace. There is no central nervous system, no daily trigger, and no reason for a resident to open this app instead of WhatsApp. Society features (the actual differentiators) are hidden 2-3 taps deep inside the Profile page.

## What Changes

### 1. Society Activity Feed (New Component on Home Page)

Create a `society_activity` table that serves as the central event log. Every significant action across the app writes a row here. The home page gets a "Recent in your society" section above the marketplace content.

**Database:**
```text
society_activity (
  id uuid PK,
  society_id uuid FK,
  actor_id uuid FK (nullable for system events),
  activity_type text (milestone_posted, expense_added, dispute_created, 
                      snag_reported, snag_fixed, document_uploaded, 
                      broadcast_sent, question_answered, etc.),
  title text,
  description text (nullable),
  reference_id uuid (nullable - links to the source record),
  reference_type text (nullable - table name),
  is_system boolean default false,
  created_at timestamptz
)
```

RLS: Society members can SELECT their society's activity. INSERT via service role or database trigger.

**UI:** A compact feed section on HomePage showing the 5 most recent events with icon, title, relative timestamp, and a "See all" link to a full activity log page.

**Triggers:** Database triggers on `construction_milestones`, `society_expenses`, `dispute_tickets`, `snag_tickets`, `project_documents`, `emergency_broadcasts`, `project_questions` (when answered) to auto-insert activity rows.

### 2. In-App Notification Inbox

Create a `user_notifications` table. Every push notification also writes a persistent record here. The header gets an unread badge. Tapping opens a notification list with deep links.

**Database:**
```text
user_notifications (
  id uuid PK,
  user_id uuid FK,
  title text,
  body text,
  type text (order, dispute, snag, milestone, broadcast, digest, etc.),
  reference_id text (nullable),
  reference_path text (nullable - e.g. "/society/snags"),
  is_read boolean default false,
  created_at timestamptz
)
```

RLS: Users can only SELECT/UPDATE their own notifications.

**UI:** 
- Bell icon in Header with unread count badge
- New `/notifications/inbox` page showing chronological list
- Each notification card is tappable, navigates to reference_path
- Swipe or tap to mark as read

**Integration:** Update `society-notifications.ts` helper and `send-push-notification` edge function to also insert into `user_notifications` when sending pushes.

### 3. Restructured Bottom Navigation

Change bottom nav from:
```
Home | Search | Community | Orders | Profile
```
To:
```
Home | Marketplace | Community | Society | Profile
```

- **Home** becomes the activity feed + trust score + quick actions
- **Marketplace** absorbs current Home's seller browsing + Search
- **Society** is a new dashboard page with card links to: Finances, Construction Progress, Snag Reports, Disputes, Documents, Q&A
- Orders move into Profile menu (used less frequently than society features)

### 4. Society Dashboard Page (New)

A single page at `/society` showing:
- Society name and trust score badge at top
- Grid of action cards: Finances, Construction, Snag Reports, Disputes, Emergency Broadcasts (admin only), Documents, Q&A
- Each card shows a mini stat (e.g., "2 open snags", "3 updates this week")
- Quick access replaces the buried Profile menu links

### 5. "Seen by Committee" Indicators

Add `acknowledged_at` timestamp display to:
- Dispute tickets (already has the column -- just surface it prominently in the UI)
- Snag tickets (already has the column -- surface it)
- Expense flags (add column if missing)

Show as: "Seen by committee -- Feb 14, 2:15 PM" with a green checkmark. If not yet acknowledged after 48h, show amber warning: "Awaiting review -- submitted 3 days ago"

### 6. Maintenance Payment Tracker (New Feature)

Simple tracking of monthly society maintenance fees per flat.

**Database:**
```text
maintenance_dues (
  id uuid PK,
  society_id uuid FK,
  flat_identifier text (e.g., "A-301"),
  resident_id uuid FK (nullable),
  month text (e.g., "2026-02"),
  amount numeric,
  status text (pending, paid, overdue),
  paid_date date (nullable),
  receipt_url text (nullable),
  created_at timestamptz
)
```

RLS: Residents see only their own flat's records. Admins see all in society.

**UI:** 
- Card on Society Dashboard: "Maintenance: Paid through Feb 2026" or "1 month overdue"
- Full page shows month-by-month history
- Admin can bulk-generate monthly dues and mark payments

This creates **monthly lock-in** -- every resident checks this every month.

---

## Implementation Sequence

1. **Society Activity Feed** -- database table + triggers + HomePage section (highest impact, creates the "check daily" habit)
2. **Notification Inbox** -- table + header badge + inbox page (makes push notifications persistent and discoverable)
3. **Bottom Nav Restructure + Society Dashboard** -- navigation change + new dashboard page (surfaces society features)
4. **"Seen by Committee" indicators** -- UI-only changes to existing dispute/snag cards (instant trust boost, minimal code)
5. **Maintenance Payment Tracker** -- new table + pages (monthly lock-in feature)

## Files to Create

```text
src/pages/SocietyDashboardPage.tsx
src/pages/NotificationInboxPage.tsx
src/components/activity/ActivityFeed.tsx
src/components/activity/ActivityItem.tsx
src/components/notifications/NotificationInbox.tsx
src/components/maintenance/MaintenanceCard.tsx
src/pages/MaintenancePage.tsx
```

## Files to Modify

```text
src/components/layout/BottomNav.tsx (restructure tabs)
src/components/layout/Header.tsx (notification bell badge)
src/pages/HomePage.tsx (add activity feed section, restructure layout)
src/lib/society-notifications.ts (write to user_notifications table)
src/components/snags/SnagDetailSheet.tsx (show acknowledged_at prominently)
src/components/disputes/DisputeDetailSheet.tsx (show acknowledged_at prominently)
src/App.tsx (new routes: /society, /notifications/inbox, /maintenance)
src/pages/ProfilePage.tsx (remove society links now in dashboard, add Orders link)
```

## What This Achieves

- **Daily trigger**: Activity feed gives residents a reason to open the app every day
- **Persistent notifications**: Push notifications become discoverable history, not ephemeral
- **Society features visible**: One tap from bottom nav instead of buried in Profile
- **Trust through acknowledgment**: "Seen by committee" removes the "am I being ignored?" anxiety
- **Monthly lock-in**: Maintenance tracking creates recurring dependency that no WhatsApp group provides
- **Competitor defense**: Activity feed + notification inbox + maintenance tracking together create switching cost that MyGate-style apps struggle to replicate because they lack the transparency layer

