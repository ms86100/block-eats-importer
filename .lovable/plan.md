

# Buyer Journey Regression & Readiness Audit — Round 7

Post Rounds 1-6 fixes. This audit focuses on residual issues, new regressions introduced by prior fix rounds, and previously unexamined edge cases.

---

## Issue #1 — CouponInput `onApply` Does Not Pass `discount_type` / `discount_value` / `max_discount_amount`

**Scenario:** Buyer applies a percentage coupon from the available coupons list.
**Expected:** `useCartPage.ts` receives full coupon metadata to reactively recalculate discount.
**Actual:** `CouponInput.tsx` line 116: `onApply({ id: coupon.id, code: coupon.code, discountAmount })`. Only `id`, `code`, and `discountAmount` are passed. The `useCartPage.ts` reactive recalculation (line 32-40) checks `appliedCoupon.discount_type` and `appliedCoupon.discount_value`, but these fields are never set by `CouponInput`. The `effectiveCouponDiscount` falls through to `return appliedCoupon.discountAmount` (the static value), defeating the R6 fix.
**Failure Type:** Functional — coupon discount not recalculated despite fix
**Root Cause:** `CouponInput`'s `onApply` callback signature only sends `{ id, code, discountAmount }`. The `CouponInputProps` interface (line 30) confirms this. The `appliedCoupon` type in `useCartPage` expects `discount_type`, `discount_value`, `max_discount_amount` but these are never populated.
**Proposed Fix:** Update `CouponInput`'s `onApply` call and its `CouponInputProps` interface to also pass `discount_type`, `discount_value`, and `max_discount_amount` from the coupon data.

---

## Issue #2 — Cart Undo Still Shows "Added to cart" Toast Despite `silent` Parameter

**Scenario:** Buyer removes item from cart → taps "Undo" on toast.
**Expected:** Item silently restored.
**Actual:** `CartPage.tsx` line 122: `c.addItem(item.product as any, item.quantity)`. The `addItem` signature is `(product, quantity?, silent?)`. The call passes `quantity` but not `silent=true`. The third parameter defaults to `false`, so the success toast fires.
**Failure Type:** UX — duplicate toast on undo
**Root Cause:** The `silent` parameter was added to `addItem` in R6 but the call site in `CartPage.tsx` was not updated to use it.
**Proposed Fix:** Change to `c.addItem(item.product as any, item.quantity, true)`.

---

## Issue #3 — `NavigatorBackButton` Cannot Accept Refs — Console Warning

**Scenario:** Any page load with `AppLayout`.
**Expected:** No console warnings.
**Actual:** Console logs show: `Warning: Function components cannot be given refs. Attempts to access this ref will fail. Did you mean to use React.forwardRef()? Check the render method of AppLayout. at NavigatorBackButton`. The `NavigatorBackButton` is a plain function component but `AppLayout` apparently passes a ref to it.
**Failure Type:** Regression — console warning on every page
**Root Cause:** `NavigatorBackButton` is not wrapped in `forwardRef`. While `AppLayout` doesn't explicitly pass a ref, React may be attempting to attach one based on render position or memo.
**Proposed Fix:** Wrap `NavigatorBackButton` in `React.forwardRef` or wrap its export in `memo` (which handles refs).

---

## Issue #4 — `BottomNavInner` Also Triggers forwardRef Warning

**Scenario:** Any page load.
**Expected:** No warnings.
**Actual:** Console: `Warning: Function components cannot be given refs... at BottomNavInner`. `BottomNav.tsx` line 101: `export const BottomNav = memo(BottomNavInner)`. `memo` does NOT forward refs automatically. If `AppLayout` tries to ref-attach to `<BottomNav />`, the warning fires.
**Failure Type:** Regression — console warning on every page
**Root Cause:** `BottomNavInner` is wrapped in `memo` but not `forwardRef`.
**Proposed Fix:** Wrap `BottomNavInner` in `forwardRef` before `memo`, or ensure `AppLayout` does not pass refs to `BottomNav`.

---

## Issue #5 — Seller Congrats Banner Uses `localStorage` on Native iOS

**Scenario:** Seller logs in, store gets approved, sees congrats banner → dismisses it → reopens app.
**Expected:** Banner stays dismissed.
**Actual:** `HomePage.tsx` line 23: `localStorage.getItem(key)` and line 31: `localStorage.setItem(...)`. On iOS native (WKWebView), `localStorage` is non-persistent. The congrats banner will reappear after every app restart until the user taps dismiss again.
**Failure Type:** UX — dismissed banner reappears on iOS native
**Root Cause:** Uses `localStorage` instead of the persistent `capacitorStorage` adapter.
**Proposed Fix:** Replace `localStorage.getItem/setItem` with `capacitorStorage.getItem/setItem` for this key, or accept this as a minor cosmetic issue since it's a one-time banner.

---

## Issue #6 — ProfilePage Uses `localStorage` for Large Font and Feedback Prompts on Native

**Scenario:** Buyer enables large font → restarts app on iOS.
**Expected:** Large font preference persists.
**Actual:** `ProfilePage.tsx` line 41: `localStorage.getItem('app_large_font')` and line 73: `localStorage.setItem(...)`. Same iOS `localStorage` non-persistence issue. Font preference resets after app restart.
**Failure Type:** UX — preference loss on iOS restart
**Root Cause:** Uses `localStorage` on native platform.
**Proposed Fix:** Use `capacitorStorage` for user preferences on native, or use the React Query cache backed by Preferences.

---

## Issue #7 — OrderDetailPage `localStorage` for Feedback Prompt Dedup

**Scenario:** Buyer completes order → sees feedback prompt → submits → restarts app on iOS.
**Expected:** Feedback prompt hidden.
**Actual:** `OrderDetailPage.tsx` line 114: `localStorage.getItem(`feedback_prompted_${order.id}`)` and line 117: `localStorage.setItem(...)`. On iOS, this resets, causing the feedback prompt to reappear for every completed order.
**Failure Type:** UX — repeated feedback prompts on iOS
**Root Cause:** `localStorage` non-persistence on native iOS.
**Proposed Fix:** Use `capacitorStorage` or track feedback submission server-side.

---

## Issue #8 — Onboarding Walkthrough Completion Uses `localStorage`

**Scenario:** New buyer completes onboarding → restarts app on iOS.
**Expected:** Onboarding doesn't show again.
**Actual:** `OnboardingWalkthrough.tsx` (via `useOnboarding`) likely stores completion flag in `localStorage`. This resets on iOS, forcing the buyer through onboarding on every cold start.
**Failure Type:** Functional — repeated onboarding on iOS
**Root Cause:** `localStorage` non-persistence on native.
**Proposed Fix:** Store onboarding completion in `capacitorStorage` or in the database `profiles` table.

---

## Issue #9 — Auth Storage Patch May Not Propagate to GoTrueClient Internals

**Scenario:** User logs in on iOS → closes app → reopens.
**Expected:** Session persists via `capacitorStorage`.
**Actual:** `capacitor.ts` line 15: `(supabase.auth as any).storage = capacitorStorage`. In Supabase JS v2, `GoTrueClient` captures the `storage` reference during construction in a private `storageKey` and internal lock manager. Simply reassigning `.storage` post-construction may not affect `_getSession()` which uses the internal reference. The patched `.storage` may only affect new `setItem/getItem` calls made directly, not the internal session recovery flow.
**Failure Type:** Functional — login persistence may still fail despite fix
**Root Cause:** Supabase JS v2 GoTrueClient stores the storage adapter internally during construction; post-construction patching may not propagate.
**Proposed Fix:** Verify against the specific Supabase JS v2 version used (^2.93.3) whether `.storage` reassignment works. If not, create a wrapper around `createClient` that accepts the storage at construction time — this would require a separate client instance (not the auto-generated one). Alternatively, use `supabase.auth.setSession()` after reading the token from Preferences on startup.

---

## Issue #10 — `CategoryGroupPage` Accesses `parentGroup.icon` Before Null Check

**Scenario:** Buyer navigates to `/category/food` → parent group loads.
**Expected:** Page renders normally.
**Actual:** `CategoryGroupPage.tsx` line 156: `if (!parentGroup && !groupsLoading && effectiveSocietyId !== undefined)` is the null check. But line 180: `<span>{parentGroup.icon}</span>` and line 181: `<span className="truncate">{parentGroup.label}</span>` are outside this guard — they're in the render block at line 169 which is reached when `parentGroup` might still be `undefined` during the brief window after loading completes but before the guard fires. TypeScript doesn't enforce this since `parentGroup` is `undefined | object`.
**Failure Type:** Potential runtime error — accessing property of undefined
**Root Cause:** No type narrowing between the guard check and the render block.
**Proposed Fix:** Add `if (!parentGroup) return null;` immediately before the main render return at line 169.

---

## Issue #11 — Search Page `showCart` Not Set — FloatingCartBar Hidden by Default

**Scenario:** Buyer searches for products with items in cart.
**Expected:** FloatingCartBar visible for quick cart access.
**Actual:** `SearchPage.tsx` line 67: `<AppLayout showHeader={false}>`. No `showCart` prop is passed, so it defaults to `true` (per `AppLayout` defaults). The `FloatingCartBar` IS shown. However, the R6 audit (Issue #20) noted `showCart={false}` was present. Looking at the current code, it's actually `showHeader={false}` with no `showCart` override — this means the FloatingCartBar IS correctly shown. **No issue here — confirmed correct.**

---

## Issue #12 — Razorpay Checkout: `onSuccess` Receives 2 Args But Caller Passes 1

**Scenario:** Buyer pays via UPI → payment succeeds.
**Expected:** Payment success callback fires correctly.
**Actual:** `useRazorpay.ts` `RazorpayOptions` interface line 13: `onSuccess: (paymentId: string, orderId: string) => void` — expects 2 parameters. But in `RazorpayCheckout.tsx` line 56: `onSuccess: (paymentId) => { setStatus('success'); setTimeout(() => onPaymentSuccess(paymentId), 1500); }` — only captures `paymentId`. This is not a bug per se (second arg is ignored), but the `razorpay.handler` at `useRazorpay.ts` line 88 passes both: `options.onSuccess(response.razorpay_payment_id, response.razorpay_order_id)`. In `CartPage.tsx` line 250+, `handleRazorpaySuccess` only receives `_paymentId` — the Razorpay `order_id` (which differs from the app's `order_id`) is silently discarded.
**Failure Type:** Data loss — Razorpay order_id not captured for reconciliation
**Root Cause:** Inconsistent callback signatures between hook, component, and page.
**Proposed Fix:** Either capture the Razorpay order_id for payment reconciliation logging, or simplify the interface to match actual usage.

---

## Issue #13 — Orders Page `fetchOrders` Reference in Dependencies Causes Duplicate Fetches

**Scenario:** Buyer is on Orders page → switches between "My Orders" and "Received" tabs.
**Expected:** Single fetch per navigation.
**Actual:** `OrdersPage.tsx` line 163: `useEffect` depends on `[type, userId, sellerId, location.key]`. Both `type` and `sellerId` change simultaneously when switching tabs with SellerSwitcher, causing the effect to fire twice in rapid succession. Additionally, `fetchOrders` is defined with `useCallback` depending on `[type, userId, sellerId]` — these same values in the effect deps mean the effect fires when `fetchOrders` identity changes AND when the deps change directly — potential double execution.
**Failure Type:** Performance — duplicate API calls
**Root Cause:** Overlapping dependency tracking between `useCallback` deps and `useEffect` deps.
**Proposed Fix:** Remove `type`, `userId`, `sellerId` from the effect deps and rely only on `location.key` for back-navigation refresh, with a separate effect for tab/seller changes.

---

## Issue #14 — `FavoritesPage` Back Button Uses `window.history.back()`

**Scenario:** Buyer opens FavoritesPage directly via deep link (no history).
**Expected:** Back button navigates to a sensible default.
**Actual:** `FavoritesPage.tsx` line 60: `onClick={() => window.history.back()}`. If there's no history (direct URL entry), this is a no-op or navigates away from the app entirely.
**Failure Type:** UX — dead back button on direct navigation
**Root Cause:** `window.history.back()` without fallback.
**Proposed Fix:** Use `navigate(-1)` with a fallback: `if (window.history.length > 1) navigate(-1); else navigate('/');`

---

## Issue #15 — `OrderDetailPage` Back Button Same Issue

**Scenario:** Buyer opens order detail via push notification deep link.
**Expected:** Back button navigates to orders list.
**Actual:** `OrderDetailPage.tsx` line 40: `onClick={() => window.history.back()}`. Same issue as #14.
**Failure Type:** UX — dead back button on deep link
**Root Cause:** No fallback navigation.
**Proposed Fix:** `onClick={() => window.history.length > 1 ? window.history.back() : navigate('/orders')}`

---

## Issue #16 — SellerDetailPage Cover Image Missing `safe-top` Guard

**Scenario:** Buyer visits seller page on iOS with notch.
**Expected:** Back button is below the status bar / notch area.
**Actual:** `SellerDetailPage.tsx` line 234: `className="absolute top-[max(1rem,env(safe-area-inset-top))]"` — this correctly handles the back button. However, the cover image itself at line 222 `className="relative h-56"` extends behind the status bar with `StatusBar.setOverlaysWebView({ overlay: true })`. The gradient overlay at line 232 covers it. This is actually intentional (edge-to-edge design). **Confirmed acceptable.**

---

## Issue #17 — No Loading Indicator When Reorder is Checking Cart

**Scenario:** Buyer taps "Reorder" on home page → system checks if cart has items.
**Expected:** Immediate visual feedback (spinner/disabled state).
**Actual:** `ReorderLastOrder.tsx` line 65-82: `handleReorder` first queries existing cart items (line 69-73), which is an async operation. During this query, the button has no loading indicator — `isLoading` is only set to `true` in `executeReorder` (line 88). The buyer sees no feedback between tap and the confirm dialog appearing.
**Failure Type:** UX — no feedback during async check
**Root Cause:** `isLoading` state not set during the pre-check phase.
**Proposed Fix:** Set `setIsLoading(true)` at the start of `handleReorder` and `setIsLoading(false)` if showing the confirm dialog.

---

## Issue #18 — `ReorderButton` in `OrderDetailPage` Missing Confirmation Dialog

**Scenario:** Buyer views a completed order → taps "Order again?" → ReorderButton.
**Expected:** Confirmation dialog before replacing cart (matching ReorderLastOrder behavior).
**Actual:** Need to check `ReorderButton.tsx` — the R6 fix added AlertDialog to `ReorderButton`. However, `OrderDetailPage.tsx` line 110: `<ReorderButton orderItems={items} sellerId={order.seller_id} size="sm" />` — the ReorderButton renders inline without wrapping in a stopPropagation div. This is inside a `<div onClick={(e) => ...}>` at line 83 (OrdersPage). In OrderDetailPage, it's NOT inside a Link, so no issue with navigation conflicts. **Confirmed acceptable for OrderDetailPage context.**

---

## Issue #19 — Cart Count and Cart Items Queries Not Coordinated

**Scenario:** Buyer adds item to cart → BottomNav badge updates → opens cart page.
**Expected:** Badge count matches cart page items.
**Actual:** `useCartCount.ts` uses query key `['cart-count', userId]` with 30s staleTime. `useCart.tsx` uses `['cart-items', userId]` with 10min staleTime. When `addItem` invalidates both (via `invalidate()`), the cart-count query may refetch before cart-items, causing a brief mismatch where the badge shows N+1 but the cart page still shows N items.
**Failure Type:** Data inconsistency — transient badge/page mismatch
**Root Cause:** Two separate queries with different stale times for the same logical data.
**Proposed Fix:** In `addItem`'s optimistic update, also update the `cart-count` query data directly: `queryClient.setQueryData(['cart-count', user?.id], (old: number) => (old || 0) + quantity)`.

---

## Issue #20 — Notification Inbox: No Pull-to-Refresh or Refresh Mechanism

**Scenario:** Buyer receives a notification while viewing the inbox.
**Expected:** New notification appears or a refresh mechanism is available.
**Actual:** `NotificationInboxPage.tsx` uses `useNotifications` (React Query) which has its own staleTime. There's no manual refresh button, no pull-to-refresh, and no realtime subscription. The 30s `refetchInterval` on `useUnreadNotificationCount` only refreshes the badge count, not the full notification list.
**Failure Type:** UX — stale notification list
**Root Cause:** No refresh mechanism on the inbox page.
**Proposed Fix:** Add `refetchInterval` or a manual refresh button to the notifications query, or add a realtime subscription to `user_notifications`.

---

## Issue #21 — Society Dashboard Shows Empty Stats for Features That Are All Disabled

**Scenario:** Buyer navigates to Society tab → sees dashboard with all features disabled.
**Expected:** Helpful empty state or message about no features being enabled.
**Actual:** `SocietyDashboardPage.tsx` filters items by `isFeatureEnabled`. If all features are disabled (as seen in the network response — all features have `is_enabled: false`), the dashboard shows section headers with empty content. The Society tab itself is hidden by BottomNav when `!hasAnyFeature` (line 50), so this is only visible to admins.
**Failure Type:** Minor UX — empty dashboard sections for admin users
**Root Cause:** No aggregate empty state when all features are disabled.
**Proposed Fix:** Add an aggregate empty state at the top of the dashboard when no features are enabled, suggesting the admin enable features.

---

## Issue #22 — `useCartPage` Initializes `paymentMethod` to `'cod'` Before Auto-Selection Effect

**Scenario:** Buyer with a UPI-only seller in cart opens cart page.
**Expected:** UPI is pre-selected immediately.
**Actual:** `useCartPage.ts` line 19: `const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod')`. The auto-select effect at line 67-70 runs after first render. For one render cycle, `paymentMethod` is `'cod'` even though COD isn't available. If the confirm dialog is opened during this frame (extremely unlikely but possible), it would show "Cash on Delivery".
**Failure Type:** UX — flash of incorrect payment method (edge case)
**Root Cause:** Static initial state doesn't account for seller capabilities.
**Proposed Fix:** Use a lazy initializer: `useState(() => acceptsCod ? 'cod' : 'upi')` — but `acceptsCod` depends on `sellerGroups` which isn't available at initialization. Better: ensure the confirm dialog checks `acceptsCod`/`acceptsUpi` before displaying payment method text.

---

## Issue #23 — `FloatingCartBar` Uses Both `pathname` and `hash` for Cart Page Detection

**Scenario:** Buyer navigates to cart on HashRouter.
**Expected:** FloatingCartBar hidden.
**Actual:** `FloatingCartBar.tsx` line 18: `location.pathname === '/cart' || location.hash === '#/cart'`. With HashRouter, `location.pathname` is always `/` and the actual path is in `location.hash`. So `location.pathname === '/cart'` is never true. The `location.hash === '#/cart'` check works. However, the route is just `/cart` inside HashRouter — `useLocation()` from `react-router-dom` inside a `<HashRouter>` returns `{ pathname: '/cart', hash: '' }`, NOT `{ pathname: '/', hash: '#/cart' }`. So the `location.hash` check is dead code, and the `pathname` check is correct.
**Failure Type:** No issue — code is correct but contains dead code
**Root Cause:** Misunderstanding of HashRouter's `useLocation` behavior.
**Proposed Fix:** Remove the dead `location.hash === '#/cart'` check for code cleanliness.

---

## Issue #24 — `Header.tsx` Search Bar Always Visible Including on Non-Home Pages

**Scenario:** Buyer is on the Society Dashboard page (which uses `headerTitle="..."`).
**Expected:** Search bar hidden, breadcrumb shown.
**Actual:** `Header.tsx` line 133: `{!title && (...)}` — the search bar only shows when `title` is NOT set. When `headerTitle` is passed from `AppLayout` → `Header`, the search bar is hidden and the breadcrumb is shown. This is correct. **However**, `HomePage.tsx` line 65: `<AppLayout>` — no `headerTitle` is passed, so the search bar shows. On `CartPage.tsx` line 45: `showHeader={false}` — header is hidden entirely. **Confirmed correct behavior.**

---

## Issue #25 — `useProductDetail` Similar Products Query Has No Society Scoping

**Scenario:** Buyer opens product detail → scrolls to "Similar Products".
**Expected:** Similar products from same society.
**Actual:** `useProductDetail.ts` lines 42-55: The similar products query filters by `category`, `is_available`, `approval_status`, and excludes current product. The client-side filter at line 52-55 is convoluted and doesn't effectively filter by society:
```typescript
const filtered = (res.data || []).filter((p: any) =>
  product.is_same_society === false || !p.seller?.society_id || 
  p.seller.society_id === (product as any)._societyId || product.is_same_society
);
```
When `product.is_same_society` is `true`, the first condition `=== false` is false, so it falls to `!p.seller?.society_id` (includes products with no society) OR `p.seller.society_id === (product as any)._societyId` (but `_societyId` is never set on the product object from any call site) OR `product.is_same_society` (which is `true`, making the entire filter always pass). The filter is effectively a no-op.
**Failure Type:** Data inconsistency — cross-society products shown in similar section
**Root Cause:** The filter logic short-circuits because the last condition `product.is_same_society` is always truthy when the product is from the same society.
**Proposed Fix:** Pass `effectiveSocietyId` to `useProductDetail` and add `.eq('seller:seller_profiles.society_id', effectiveSocietyId)` to the database query, or fix the client-side filter to properly compare `p.seller.society_id` against the buyer's society ID.

---

## Priority Matrix

| Priority | Issues |
|----------|--------|
| **P0 — Blocks functionality** | #1 (coupon discount not recalculated), #9 (auth storage patch may not work) |
| **P1 — Functional gaps** | #5/#6/#7/#8 (localStorage on native iOS — multiple features), #25 (similar products no society filter) |
| **P2 — UX issues** | #2 (duplicate toast on undo), #3/#4 (forwardRef warnings), #10 (potential crash on category page), #14/#15 (dead back buttons), #17 (no loading on reorder check), #20 (stale notification inbox), #22 (flash of wrong payment method) |
| **P3 — Minor / Cleanup** | #12 (Razorpay order_id not captured), #13 (duplicate fetches), #19 (transient badge mismatch), #21 (empty society dashboard), #23 (dead code in FloatingCartBar) |

