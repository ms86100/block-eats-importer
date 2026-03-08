

# UI/UX Reorganization Plan — Seller, Buyer, and Admin Flows

## Problem Summary

The application has three major personas — **Seller**, **Buyer/Resident**, and **Admin** — but the navigation and information architecture treats them as afterthoughts to each other:

1. **Seller flow is buried**: Profile → Seller Dashboard → Products (separate page) → Settings (separate page) → Earnings (separate page). Five navigation hops to perform basic actions.
2. **Buyer home page lacks hierarchy**: The home page stacks 7+ sections vertically with no visual grouping, making it hard to scan.
3. **Admin panel is a single mega-page**: All 16+ tabs are behind a single Sheet nav on mobile, with no persistent structure.

## Guiding Principles

- **Zero functionality removed or added** — only visual/structural reorganization
- **Every existing route continues to work** — no route changes
- **All current data flows preserved** — hooks, queries, mutations untouched
- **Progressive enhancement** — improve layout/grouping without rewriting components

---

## Phase 1: Seller Dashboard Consolidation

**Current state**: SellerDashboardPage is a ~375-line vertical scroll with Store Status, Performance stats, Service Bookings, Slot Management, Tools & Promotions, Analytics, and Orders all stacked.

**Proposed change**: Introduce a **tabbed layout** inside SellerDashboardPage using existing Radix `Tabs` component, grouping the existing sections:

```text
┌────────────────────────────────────────┐
│  Store Status Card  (always visible)   │
│  Visibility Checklist (always visible) │
├────────┬──────────┬─────────┬──────────┤
│ Orders │ Schedule │  Tools  │  Stats   │
├────────┴──────────┴─────────┴──────────┤
│                                        │
│  [Tab content — existing components]   │
│                                        │
└────────────────────────────────────────┘
```

- **Orders tab**: OrderFilters + SellerOrderCard list (current bottom section)
- **Schedule tab**: SellerDayAgenda + ServiceBookingsCalendar + SlotCalendarManager (only if `hasServiceLayout`)
- **Tools tab**: QuickActions + CouponManager + DemandInsights
- **Stats tab**: Performance Card + EarningsSummary + DashboardStats + SellerAnalytics

**QuickActions enhancement**: Add **Earnings** and **Store Preview** as quick action cards alongside existing Manage Products / Store Settings / Add Business — all links already exist, just not surfaced prominently.

**Key safety guarantee**: Every component is simply moved into a TabsContent wrapper. No props change. No data flow changes. Components are rendered identically.

### Files changed:
- `src/pages/SellerDashboardPage.tsx` — Wrap existing sections in `<Tabs>` / `<TabsContent>`, keep StoreStatusCard and SellerVisibilityChecklist above tabs
- `src/components/seller/QuickActions.tsx` — Add Earnings link card and Preview link card (both routes already exist)

---

## Phase 2: Buyer Home Page — Visual Grouping

**Current state**: HomePage renders 7 components sequentially with inconsistent spacing and no section headers for some.

**Proposed change**: Group related sections with subtle section dividers and consistent spacing:

```text
┌────────────────────────────────┐
│ Incomplete Profile Banner      │
│ Society Trust Strip            │
├────────────────────────────────┤
│ 🔍 Search Suggestions         │
│ 📅 Upcoming Appointment       │
├────────────────────────────────┤
│ 🔄 Reorder / Buy Again        │  ← Group these two
├────────────────────────────────┤
│ 🏘️ Society Quick Links        │
├────────────────────────────────┤
│ 🛒 Marketplace                 │
│ 👥 Community Teaser            │
└────────────────────────────────┘
```

Changes:
- Wrap ReorderLastOrder + BuyAgainRow in a single `<section>` with a "Your Recent Orders" label (only renders if either has content — the components already handle empty state)
- Add consistent `<section>` wrappers with lightweight dividers between groups
- No component logic changes whatsoever — purely wrapper divs and spacing

### Files changed:
- `src/pages/HomePage.tsx` — Add section wrapper divs with consistent spacing classes

---

## Phase 3: Admin Panel — Sticky Section Header + Breadcrumb

**Current state**: AdminPage uses AdminSidebarNav (a Sheet on mobile) to switch between 16 tabs. Once you select a tab, there's no persistent indication of which section you're in — you have to re-open the Sheet.

**Proposed change**: 
- Add a **sticky breadcrumb bar** below the stats grid that shows the currently active section name with its icon, acting as both a label and a tap target to re-open the Sheet nav
- This replaces the current `AdminSidebarNav` trigger button that just says the section name — make it sticky so it persists while scrolling through long content sections

### Files changed:
- `src/pages/AdminPage.tsx` — Make the AdminSidebarNav wrapper div `sticky top-[var(--header-height)]` with `z-30`

---

## Phase 4: Profile Page — Cleaner Seller Access

**Current state**: Profile page has a single "Seller Dashboard" link buried in the menu list among 10+ other items.

**Proposed change**: For sellers, promote the Seller Dashboard link into the **quick actions grid** (the 3-column grid at top that currently has Orders, Favorites, Order Again). Add a 4th card "My Store" that links to `/seller`.

This is not a new feature — it's just moving an existing link to a more prominent position.

### Files changed:
- `src/pages/ProfilePage.tsx` — Conditionally add a 4th quick action card for sellers; change grid from `grid-cols-3` to `grid-cols-2 sm:grid-cols-4` when 4 items present

---

## Risk Assessment

| Change | Risk | Why Safe |
|--------|------|----------|
| Seller tabs | **Very low** | Components moved into TabsContent wrappers, zero prop/data changes |
| Home sections | **Zero** | Adding wrapper `<div>`s and CSS classes only |
| Admin sticky nav | **Zero** | Adding `sticky` class to existing div |
| Profile quick action | **Very low** | Adding one `<Link>` card using existing pattern |

**⚠️ Potential risk areas I will watch**:
- Seller Dashboard: The `hasServiceLayout` conditional sections must remain inside the correct tab — I'll ensure the flag check stays intact
- Seller Dashboard: Order infinite scroll (`fetchNextPage`) must work within a TabsContent — Radix Tabs uses display:none for inactive panels which preserves DOM state
- Profile grid: Moving from 3 to 4 columns on mobile could crowd — using `grid-cols-2` for 4 items ensures it wraps to 2 rows of 2

**What I will NOT change**:
- No route changes
- No hook/query changes  
- No database changes
- No new components (except wrapper divs)
- No removal of any existing UI element

