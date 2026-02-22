

# Remaining Audit Remediation - Implementation Plan

## What's Already Done
- Route-level guards (SocietyAdminRoute, BuilderRoute, ManagementRoute)
- MaintenancePage and SocietyNoticesPage have FeatureGate
- platform_features display metadata and SocietyAdminPage uses DB labels
- visitor_types table and VisitorManagementPage integration
- Society Dashboard navigation links for all missing pages
- Guard bottom nav fixed
- DeliveryPartnerDashboardPage created
- PRODUCT_ACTION_TYPES deprecated

## What's Remaining (6 items)

### 1. Add FeatureGate to 6 ungated pages (Critical)

These pages can be accessed by direct URL even when the feature is disabled:

- `VisitorManagementPage` -- wrap with `<FeatureGate feature="visitor_management">`
- `VehicleParkingPage` -- wrap with `<FeatureGate feature="vehicle_parking">`
- `ParcelManagementPage` -- wrap with `<FeatureGate feature="parcel_management">`
- `InspectionChecklistPage` -- wrap with `<FeatureGate feature="inspection">`
- `PaymentMilestonesPage` -- wrap with `<FeatureGate feature="payment_milestones">`
- `AuthorizedPersonsPage` -- wrap with `<FeatureGate feature="visitor_management">`

Each page will import `FeatureGate` and wrap the main content inside the `AppLayout`.

### 2. Deprecate DomesticHelpPage (Critical)

Replace the entire `DomesticHelpPage` content with a redirect to `/workforce`. The page currently has 276 lines of hardcoded domestic help types while the DB-driven `WorkforceManagementPage` already handles this.

Change: Replace page body with `<Navigate to="/workforce" replace />`.

### 3. Add late fee visibility to MaintenancePage (Medium)

Add a "Late Fee" column to the maintenance dues table and a button for society admins to trigger `apply_maintenance_late_fees()` RPC.

### 4. Worker self-service tabs (Medium)

Update `WorkerAttendancePage`, `WorkerLeavePage`, and `WorkerSalaryPage` to detect if the current user is a worker (not admin) and show a filtered self-service view of their own records. This uses the existing `useWorkerRole` hook.

### 5. Move status display labels to system_settings (Low)

This is the lowest priority item. Create a `status_display_config` entry in `system_settings` as a JSON blob keyed by domain (order_status, payment_status, etc.). Frontend reads from this with the current hardcoded maps as fallback.

---

## Technical Details

### Files Modified

| File | Change |
|---|---|
| `src/pages/VisitorManagementPage.tsx` | Add FeatureGate wrapper |
| `src/pages/VehicleParkingPage.tsx` | Add FeatureGate wrapper |
| `src/pages/ParcelManagementPage.tsx` | Add FeatureGate wrapper |
| `src/pages/InspectionChecklistPage.tsx` | Add FeatureGate wrapper |
| `src/pages/PaymentMilestonesPage.tsx` | Add FeatureGate wrapper |
| `src/pages/AuthorizedPersonsPage.tsx` | Add FeatureGate wrapper |
| `src/pages/DomesticHelpPage.tsx` | Replace with redirect to /workforce |
| `src/pages/MaintenancePage.tsx` | Add late fee column + admin trigger button |
| `src/pages/WorkerAttendancePage.tsx` | Add worker self-service view |
| `src/pages/WorkerLeavePage.tsx` | Add worker self-service view |
| `src/pages/WorkerSalaryPage.tsx` | Add worker self-service view |

### Implementation Order

1. FeatureGate additions (6 files, quick changes)
2. DomesticHelpPage redirect (1 file)
3. Late fee visibility (1 file)
4. Worker self-service (3 files)
5. Status labels to DB (migration + frontend, low priority -- may defer)

