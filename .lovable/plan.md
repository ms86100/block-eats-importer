

# iOS App Store Compliance & Pre-Release Cleanup Plan

## Part 1: Apple App Review Requirements Audit

### 1.1 Requirements Already Met

| Requirement | Status | Evidence |
|---|---|---|
| Privacy Policy accessible before/after login | Done | `/privacy-policy` route, public, no auth required |
| Terms of Service | Done | `/terms` route, public |
| Account Deletion | Done | `DeleteAccountDialog` in ProfilePage, `delete-user-account` edge function |
| Age Gate (18+) | Done | Checkbox on signup with explicit confirmation |
| UGC Reporting | Done | `ReportSheet` component on products/posts |
| Content Moderation | Done | Admin approval flow for sellers and products |
| Error Boundaries | Done | `ErrorBoundary` + `RouteErrorBoundary` |
| Offline Handling | Done | `OfflineBanner` component |
| Push Notification Permissions | Done | Capacitor `PushNotifications` with `presentationOptions` |
| iOS Safe Area | Done | `env(safe-area-inset-*)` throughout, `contentInset: 'never'` |
| Non-Exempt Encryption Declaration | Done | `ITSAppUsesNonExemptEncryption: false` in `capacitor.config.ts` |
| Camera/Photo/Location Permission Strings | Done | `plistOverrides` in `capacitor.config.ts` |

### 1.2 Issues That WILL Cause Rejection

| # | Issue | Severity | Detail |
|---|---|---|---|
| R1 | **Demo account outdated in DEPLOYMENT.md** | High | `DEPLOYMENT.md` line 194 references `demo@blockeats.app` (old branding). `STORE_METADATA.md` and `SCREENSHOTS_GUIDE.md` correctly use `demo@sociva.app`. The demo account must actually exist and work in production. |
| R2 | **Pricing page "Contact Us" opens `mailto:` link** | High | Apple rejects apps that use `mailto:` or `window.open` for core purchasing flows. The Pricing page's "Contact Us" button calls `window.open(mailto:...)`. This must either open an in-app contact form or be removed since the app is currently free. |
| R3 | **No EULA / License Agreement** | Medium | Apple requires a EULA for apps with in-app purchases or subscriptions. The app has pricing plans visible. Either remove the pricing page from the iOS build or add a EULA. |
| R4 | **`block-eats.lovable.app` reference in production Capacitor config** | High | `capacitor.config.ts` line 46 still has `block-eats.lovable.app` in `allowNavigation`. This is the old domain. |
| R5 | **CategoryPage.tsx orphaned — no route** | Medium | The file exists but is not imported or routed in `App.tsx`. Dead code in the bundle. |

### 1.3 Best-Practice Compliance (Not Rejection-Causing But Recommended)

| # | Item | Detail |
|---|---|---|
| B1 | Console logging in production | 15+ pages have `console.error/warn/log` calls. These should be stripped or guarded behind `import.meta.env.DEV`. Vite's `esbuild.drop` in production build handles `console.log` but not `console.error`. |
| B2 | HashRouter | Apple doesn't reject this, but Universal Links work better with BrowserRouter. Low priority for now. |
| B3 | `test-results` route exposed to admin | Internal dev tooling. Not a rejection risk but should not appear in production builds. |

---

## Part 2: Cleanup — Dead Code, Broken Links, Unused Files

### 2.1 Dead / Orphaned Files

| File | Issue | Action |
|---|---|---|
| `src/pages/CategoryPage.tsx` | Not imported anywhere, not in App.tsx routes. Orphaned after category redesign. | **Delete** |
| `src/pages/SecurityVerifyPage.tsx` | Deprecated redirect to `/guard-kiosk`. Route exists but is redundant. | **Delete file + remove route** |
| `src/pages/DomesticHelpPage.tsx` | Deprecated redirect to `/workforce`. Route exists but is redundant. | **Delete file + remove route** |

### 2.2 Stale Documentation

| File | Issue | Action |
|---|---|---|
| `DEPLOYMENT.md` | References old branding "Greenfield Community", `demo@blockeats.app`, old bundle ID mentions. Mixed with current Sociva branding. | **Update** all references to Sociva branding, correct demo email |
| `STORE_METADATA.md` | Privacy/Terms URLs point to `block-eats.lovable.app`. Should use the actual published domain. | **Update** URLs |
| `PRE_SUBMISSION_CHECKLIST.md` | Generally correct but should be verified for consistency. | **Review** |

### 2.3 Capacitor Config Fixes

| Item | Current | Fix |
|---|---|---|
| Production `allowNavigation` | `block-eats.lovable.app` | Should be the actual production domain or removed if not needed |

### 2.4 Console Logging Cleanup

Production builds should not emit error logs to the console. While Vite strips `console.log` via esbuild, `console.error` and `console.warn` survive. These are in catch blocks across 15+ page files. The fix is to wrap them in `import.meta.env.DEV` guards or leave them (they are not a rejection risk, just best practice).

**Decision**: Leave `console.error` in catch blocks — they help debug production issues. Only strip `console.log` (already handled by Vite config).

---

## Part 3: Functional Validation — UI Elements

### 3.1 Verified Working Flows

| Flow | Status |
|---|---|
| Auth (login, signup, reset password) | Working — multi-step with age gate, society search, GPS verification |
| Home → Categories → Products → Cart → Checkout | Working — feature-gated, DB-backed |
| Seller Dashboard → Products → Orders | Working — route-guarded |
| Profile → Account Deletion | Working — edge function handles full data scrub |
| Push Notifications | Working — Capacitor integration + FCM backend |
| Society Dashboard → all sub-pages | Working — feature-gated per society |
| Landing Page (unauthenticated) | Working — CMS-driven slides with fallback |

### 3.2 Items Requiring Attention

| Item | Issue | Fix |
|---|---|---|
| Pricing Page `mailto:` button | Opens external email client, may not work on iOS | Replace with in-app feedback form or remove |
| `tel:` links in OrderDetailPage, MyWorkersPage, DeliveryStatusCard | These are fine on iOS — Capacitor handles them correctly | No action needed |
| TestResultsPage in profile menu | Visible only to admins — acceptable for internal use | No action needed |

---

## Part 4: Implementation Plan

### Batch 1: Critical Fixes (Must-Do Before Submission)

1. **Fix `capacitor.config.ts`** — Replace `block-eats.lovable.app` with correct production domain in `allowNavigation`
2. **Fix Pricing Page** — Replace `mailto:` button with a toast or in-app contact sheet, or hide the pricing page from the iOS navigation entirely since the app is free
3. **Delete orphaned files** — `CategoryPage.tsx`, `SecurityVerifyPage.tsx`, `DomesticHelpPage.tsx`
4. **Remove orphaned routes** — `/domestic-help`, `/security/verify` from `App.tsx`

### Batch 2: Documentation Cleanup

5. **Update `DEPLOYMENT.md`** — Replace all "Greenfield Community" with "Sociva", fix `demo@blockeats.app` to `demo@sociva.app`, update bundle ID references
6. **Update `STORE_METADATA.md`** — Fix Privacy/Terms URLs from `block-eats.lovable.app` to actual domain

### Files to Create / Modify

| File | Action |
|---|---|
| `capacitor.config.ts` | Fix `allowNavigation` domain |
| `src/pages/PricingPage.tsx` | Replace `mailto:` with in-app action |
| `src/App.tsx` | Remove 3 orphaned routes + lazy imports |
| `src/pages/CategoryPage.tsx` | **Delete** |
| `src/pages/SecurityVerifyPage.tsx` | **Delete** |
| `src/pages/DomesticHelpPage.tsx` | **Delete** |
| `DEPLOYMENT.md` | Update branding references |
| `STORE_METADATA.md` | Update URLs |

### Files NOT Modified (Core Features Preserved)

All admin configuration, seller dashboards, buyer flows, society management, guard kiosk, workforce management, notification systems, trust features, and the entire `useMarketplaceLabels` / `PlatformSettingsManager` infrastructure remain untouched.

