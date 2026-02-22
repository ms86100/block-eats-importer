
# Society Layer Feature Enforcement Audit

## Executive Summary

The system is approximately **90% correctly gated** after the recent fixes. However, several critical gaps remain that violate the "nothing more, nothing less" principle. This plan identifies every weakness and provides the exact fix for each.

---

## Phase 1: Hardcoded and Fallback Logic Findings

### FINDING 1 -- CRITICAL: `isFeatureEnabled` returns `true` when no society context

**File:** `src/hooks/useEffectiveFeatures.ts`, line 70

```
if (!effectiveSocietyId) return true;
```

**Risk:** When a user has no society assigned (e.g., profile.society_id is null but they are authenticated), ALL features appear enabled. This is a fail-open condition.

**Verdict:** Medium risk. In practice, authenticated users always have a society_id set during registration. However, edge cases (broken profile, admin without society) could trigger this. The system should fail closed.

**Fix:** Change to return `false` when `effectiveSocietyId` is missing but the user IS authenticated. Only return `true` for truly public/unauthenticated contexts (handled separately by route guards).

---

### FINDING 2 -- CRITICAL: RPC error silently returns empty array, treated as "all disabled"

**File:** `src/hooks/useEffectiveFeatures.ts`, lines 56-58

```
if (error) {
  console.error('Error fetching effective features:', error);
  return [];
}
```

**Risk:** If the RPC fails (network error, timeout, DB issue), `features = []` and `featureMap` is empty, so `isFeatureEnabled()` returns `false` for everything. The entire Society page goes blank.

**Verdict:** This fails closed (good), but provides no user feedback. A society with a valid package would see zero features during a temporary outage.

**Fix:** Add an `isError` state to the hook. In `FeatureGate` and `SocietyDashboardPage`, show a "Could not load features -- please retry" message instead of silently hiding everything.

---

### FINDING 3 -- HIGH: `is_feature_enabled_for_society` RPC fallback defaults to `true`

**File:** Database function `is_feature_enabled_for_society`

```sql
SELECT COALESCE(
  (SELECT ef.is_enabled FROM get_effective_society_features(_society_id) ef
   WHERE ef.feature_key = _feature_key LIMIT 1),
  true  -- DEFAULTS TO TRUE if not found
)
```

**Risk:** This server-side function is used in RLS write-gate policies. If a feature key is not in the package, the `COALESCE` falls back to `true`, meaning the RLS gate is OPEN. This is a **server-side fail-open** condition that completely bypasses the UI enforcement.

**Verdict:** CRITICAL. Even if the UI hides a feature, a crafted API call can write data because the RLS policy defaults to allowing it.

**Fix:** Change `COALESCE(..., true)` to `COALESCE(..., false)`.

---

## Phase 2: Pages Missing FeatureGate

### Pages with FeatureGate (CORRECTLY GATED -- 23 pages):
AuthorizedPersonsPage, BulletinPage, DeliveryPartnerDashboardPage, DeliveryPartnerManagementPage, DisputesPage, GateEntryPage, InspectionChecklistPage, MaintenancePage, MyWorkersPage (partial), ParcelManagementPage, PaymentMilestonesPage, SecurityAuditPage, SnagListPage, SocietyDeliveriesPage, SocietyFinancesPage, SocietyNoticesPage, SocietyProgressPage, VehicleParkingPage, VisitorManagementPage, WorkerAttendancePage, WorkerHirePage, WorkerLeavePage, WorkerSalaryPage, WorkforceManagementPage

### FINDING 4 -- HIGH: Pages missing FeatureGate entirely

| Page | Route | Expected Feature Key | Risk |
|---|---|---|---|
| `GuardKioskPage` | `/guard-kiosk` | `guard_kiosk` | No FeatureGate wrapper. Route has SecurityRoute but no feature gate. Accessible even if `guard_kiosk` feature is disabled in package. |
| `WorkerJobsPage` | `/worker/jobs` | `worker_marketplace` | No FeatureGate. Workers can browse jobs even if feature disabled. |
| `WorkerMyJobsPage` | `/worker/my-jobs` | `worker_marketplace` | No FeatureGate. Workers can see accepted jobs even if feature disabled. |
| `CreateJobRequestPage` | `/worker-hire/create` | `worker_marketplace` | No FeatureGate. Residents can create job requests even if feature disabled. |
| `MyWorkersPage` | `/my-workers` | `workforce_management` | No FeatureGate. Shows worker list without checking package. |

---

## Phase 3: UI vs DB Cross-Reference

### All 26 `platform_features` keys in database:
`bulletin`, `construction_progress`, `delivery_management`, `disputes`, `domestic_help`, `finances`, `gate_entry`, `guard_kiosk`, `help_requests`, `inspection`, `maintenance`, `marketplace`, `parcel_management`, `payment_milestones`, `resident_identity_verification`, `security_audit`, `seller_tools`, `snag_management`, `society_notices`, `vehicle_parking`, `visitor_management`, `worker_attendance`, `worker_leave`, `worker_marketplace`, `worker_salary`, `workforce_management`

### All 27 `FeatureKey` values in TypeScript union:
Same 26 + all match. No mismatch.

### FINDING 5 -- MEDIUM: SocietyDashboardPage ungated items

| Dashboard Item | Has featureKey? | Status |
|---|---|---|
| Society Admin | No | Correct -- role-gated, not package-gated |
| Platform Admin | No | Correct -- role-gated, not package-gated |

These two are intentionally ungated (role-based admin tools, not purchasable features). **No issue.**

### FINDING 6 -- MEDIUM: SocietyQuickLinks has ungated item

**File:** `src/components/home/SocietyQuickLinks.tsx`, line for "Bulletin":
```
{ icon: MessageCircle, label: 'Bulletin', to: '/community', color: '...' },
// No featureKey!
```

**Risk:** Bulletin link always shows in quick links regardless of package. Dashboard correctly gates it, but quick links bypass.

**Fix:** Add `featureKey: 'bulletin'` to the Bulletin quick link.

---

## Phase 4: RLS Write-Gate Coverage

### Tables with feature-gated RLS policies (CORRECTLY GATED):
`authorized_persons`, `bulletin_comments`, `bulletin_posts`, `bulletin_rsvps`, `bulletin_votes`, `construction_milestones`, `dispute_comments`, `dispute_tickets`, `help_requests`, `help_responses`, `maintenance_dues`, `snag_tickets`, `society_expenses`, `society_workers`, `visitor_entries`, `worker_flat_assignments`, `worker_job_requests`

### FINDING 7 -- HIGH: Tables missing feature-gated RLS

| Table | Expected Feature Gate | Current RLS |
|---|---|---|
| `gate_entries` | `gate_entry` | Has security officer check but no feature gate |
| `manual_entry_requests` | `gate_entry` | Has security officer check but no feature gate |
| `worker_attendance_logs` | `worker_attendance` | No feature gate |
| `worker_leave_records` | `worker_leave` | No feature gate |
| `worker_salary_records` | `worker_salary` | No feature gate |
| `worker_ratings` | `workforce_management` | No feature gate |
| `society_notices` | `society_notices` | No feature gate |
| `delivery_assignments` | `delivery_management` | No feature gate |
| `vehicle_registrations` | `vehicle_parking` | No feature gate |
| `parcel_logs` | `parcel_management` | No feature gate |
| `inspection_items` | `inspection` | No feature gate |
| `payment_milestones` | `payment_milestones` | No feature gate |

**Risk:** Even with UI gates, direct API calls can read/write these tables regardless of feature package. The UI gate is necessary but not sufficient.

---

## Risk Classification Summary

| # | Finding | Severity | Impact |
|---|---|---|---|
| 3 | `is_feature_enabled_for_society` COALESCE defaults to `true` | CRITICAL | Server-side fail-open on ALL feature-gated RLS policies |
| 1 | `isFeatureEnabled` returns `true` with no society context | MEDIUM | Edge case for users without society |
| 4 | 5 pages missing FeatureGate | HIGH | Routes accessible without package |
| 6 | SocietyQuickLinks Bulletin ungated | MEDIUM | Bulletin visible in quick links |
| 7 | 12+ tables missing RLS feature gates | HIGH | Direct API bypass of feature control |
| 2 | RPC error shows blank page (no user feedback) | LOW | UX issue, but fails closed |

---

## Fix Plan

### Fix A -- CRITICAL (Database)
Change `is_feature_enabled_for_society` to default `false`:
```sql
CREATE OR REPLACE FUNCTION is_feature_enabled_for_society(...)
  SELECT COALESCE(..., false)  -- was: true
```

### Fix B -- HIGH (5 Pages)
Add `<FeatureGate>` wrapper to:
- `GuardKioskPage` with `guard_kiosk`
- `WorkerJobsPage` with `worker_marketplace`
- `WorkerMyJobsPage` with `worker_marketplace`
- `CreateJobRequestPage` with `worker_marketplace`
- `MyWorkersPage` with `workforce_management`

### Fix C -- MEDIUM (SocietyQuickLinks)
Add `featureKey: 'bulletin'` to the Bulletin entry.

### Fix D -- MEDIUM (useEffectiveFeatures error handling)
Add `isError` state to the hook. Show retry UI in `FeatureGate` and `SocietyDashboardPage` when features fail to load, instead of silently hiding everything.

### Fix E -- HIGH (RLS feature gates on remaining tables)
Add `can_access_feature('feature_key')` write-gate policies to the 12 tables listed in Finding 7. This is a single migration with ~36 policies (INSERT/UPDATE/DELETE for each table).

### Fix F -- MEDIUM (isFeatureEnabled no-society fallback)
For authenticated users with no `effectiveSocietyId`, return `false` instead of `true`. The `true` return should only apply for unauthenticated/public page contexts (which are already handled by route guards redirecting to `/auth`).

---

## Post-Fix Guarantees

After implementing all fixes:

1. **Builder sees exactly purchased features** -- enforced by `get_effective_society_features` RPC with no client-side fallback
2. **Society sees nothing extra** -- all dashboard items, quick links, pages, and routes are feature-gated
3. **No feature breaks** -- Society Admin and Platform Admin remain role-gated (not package-gated), which is correct for admin tools
4. **No silent enablement** -- RPC errors show retry UI; missing features default to `false` at both client and server
5. **Server-side enforcement** -- `is_feature_enabled_for_society` defaults to `false`, meaning even direct API calls respect package boundaries
