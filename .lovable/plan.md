

# Admin UI Reorganization — Deep Audit & Plan

## Current Problems

1. **"Sellers & Products" tab is a dumping ground**: Seller application review (with license config buried inside it) AND product approvals are crammed into one tab. License configuration is a collapsible hidden inside the seller review component — it's a system config, not a per-application action.

2. **Navigation is hidden behind a Sheet**: The admin must tap to open a drawer every time they want to switch sections. On a 16-tab panel, this creates constant friction. The current sticky bar only shows a button — not the full nav.

3. **Settings tab is a vertical dump**: NotificationDiagnostics, PlatformSettings, OtpSettings, ApiKeySettings, PurgeData, ResetAndSeed — all stacked with no grouping or visual hierarchy.

4. **No urgency indicators in navigation**: Admin has no idea which sections need attention (pending users, pending sellers, pending products) without clicking into each one.

---

## Proposed Changes

### Change 1: Split "Sellers & Products" into separate nav items

**Current**: `sellers` tab → `<SellerApplicationReview />` + `<AdminProductApprovals />`
**Proposed**: 
- Rename `sellers` nav item to just **"Sellers"** — renders only `<SellerApplicationReview />`
- Move product approvals to a **separate "Products" nav item** under Commerce — renders only `<AdminProductApprovals />`

This is a nav reorganization, not new functionality. Both components already exist as independent, self-contained components.

**Nav update in AdminSidebarNav.tsx**:
```
Commerce:
  Sellers        (icon: Store)
  Products       (icon: Package)      ← NEW nav item, existing component
  Payments       (icon: CreditCard)
  Services       (icon: CalendarCheck)
  Catalog        (icon: LayoutGrid)
  Featured       (icon: Megaphone)
```

**AdminPage.tsx**: Change `admin.activeTab === 'sellers'` to render only `<SellerApplicationReview />`, add new `admin.activeTab === 'products'` rendering `<AdminProductApprovals />`.

### Change 2: Extract License Config from SellerApplicationReview

The "License Requirements Config" collapsible is buried inside the seller review component but it's a **system-level configuration** (which categories require licenses). It belongs in Settings, not in the approval workflow.

**Move**: Extract the license config `<Collapsible>` block from `SellerApplicationReview.tsx` into a standalone `<LicenseConfigSection />` and render it inside the `settings` tab in AdminPage.tsx, grouped with other platform configs.

The `SellerApplicationReview` component already exposes the license data via `useSellerApplicationReview` hook — we'll create a thin wrapper component that uses the same hook but only renders the license config UI.

### Change 3: Group Settings tab with sub-sections using Tabs

**Current**: 6 components stacked vertically with no grouping.
**Proposed**: Wrap settings content in inner tabs:

```
┌──────────┬──────────┬──────────┐
│ Platform │  Notif.  │  System  │
├──────────┴──────────┴──────────┤
│                                │
│  [Tab content]                 │
│                                │
└────────────────────────────────┘
```

- **Platform tab**: PlatformSettingsManager + LicenseConfigSection (moved from sellers)
- **Notifications tab**: NotificationDiagnostics + OtpSettings
- **System tab**: ApiKeySettings + PurgeDataButton + ResetAndSeedButton

### Change 4: Add pending count badges to navigation items

Surface urgency in the nav without clicking into each section. The `useAdminData` hook already fetches `pendingUsers` count and stats. We pass counts to `AdminSidebarNav` and show small badge dots on items that need attention.

**AdminSidebarNav.tsx**: Accept optional `badges` prop `Record<string, number>`, show a small count badge next to nav items with non-zero values.

**AdminPage.tsx**: Compute badges from existing `admin` data:
- `sellers`: `admin.stats.pendingSellers` (already available or derivable)
- `users`: `admin.pendingUsers.length`
- `products`: pending product count (from stats)

---

## Files Changed

| File | Change | Risk |
|------|--------|------|
| `AdminSidebarNav.tsx` | Split "Sellers & Products" → "Sellers" + "Products", add badge prop | **Very low** — nav config array change |
| `AdminPage.tsx` | Split sellers tab rendering, add products tab, restructure settings with inner Tabs | **Low** — moving existing components into different containers |
| `SellerApplicationReview.tsx` | Remove the License Config collapsible block (~40 lines) | **Low** — self-contained UI block removal |
| `LicenseConfigSection.tsx` (new) | Thin wrapper using same hook, rendering just the license config | **Very low** — extracted existing code |

## Safety Guarantees

- Every component continues to render with identical props
- No hooks, queries, or mutations are modified
- No routes change
- All dialogs/sheets in AdminPage remain untouched
- The license config uses the same `useSellerApplicationReview` hook — same data, same toggle functions

