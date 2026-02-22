
# Investor-Grade Product Cohesion Audit: Sociva

## Why I Would Sponsor This Product

**1. The core commerce loop is tight and complete.**
Home (browse) -> Category/Search (discover) -> Seller Detail (evaluate) -> Add to Cart -> Checkout -> Order Detail -> Review/Reorder. Every step links naturally to the next. The FloatingCartBar provides persistent awareness of cart state across all pages. The Reorder button on completed orders closes the repeat-purchase loop. This is the mark of a product that understands user retention.

**2. Role-based navigation is genuinely adaptive.**
The BottomNav dynamically switches between resident (5 tabs), security guard (3 tabs), and worker (3 tabs) based on DB-driven role detection. This is not a toggle -- it is structural role awareness. Guards see Kiosk/History/Profile. Workers see Jobs/My Jobs/Profile. Residents see the full marketplace. Admins and builders always get the full view regardless of secondary roles. This shows mature multi-stakeholder thinking.

**3. Society Dashboard is a well-structured feature hub.**
18+ feature cards, all feature-gated via `useEffectiveFeatures`, with live stat counters (open snags, pending disputes, recent expenses). It functions as the operational nerve center for residents, with admin-only cards conditionally shown. The committee response time metric is a particularly strong trust signal.

**4. Seller lifecycle is end-to-end.**
Onboarding (multi-step wizard with license upload) -> Dashboard (stats, analytics, store preview, visibility checklist) -> Product management -> Order management with item-level status -> Earnings tracking. The "How buyers see your store" preview card on the seller dashboard is a thoughtful touch that reduces seller anxiety.

**5. Notification system closes feedback loops.**
Notifications are deep-linked via `reference_path` -- tapping a notification navigates directly to the relevant order, dispute, or community post. The header bell badge shows unread count with realtime updates. This prevents notifications from being a dead-end.

**6. Cross-society commerce is architected, not bolted on.**
The browse-beyond toggle with configurable radius, distance badges on product cards, and society-name labels on cross-community items show this was designed as a multi-community platform from inception.

---

## Why I Would Hesitate to Sponsor

**1. The Society Dashboard has no entry point from the main navigation.**

This is the single largest structural disconnect in the product.

The bottom nav shows: Home | Orders | Categories | Cart | Profile. There is no "Society" tab. The Society Dashboard (`/society`) -- which contains 18+ critical feature cards (visitors, parking, finances, disputes, maintenance, workforce, parcels) -- is only accessible from:
- The Profile page menu (buried under "Your Information")
- Direct URL
- Admin navigator (admin-only tool)

A resident who wants to check their visitor log, file a maintenance complaint, or view society finances must: tap Profile -> scroll down -> tap the correct menu item. There is no dedicated path.

For a platform that positions itself as a "society management + marketplace" hybrid, hiding the entire society management layer behind the profile page is a critical navigation gap.

**2. Search results do not clearly lead to next actions.**

The session replay confirms this: users search repeatedly for "Bakery," "Snacks," "Home Food" without progressing. The search page returns product cards that navigate to seller detail pages -- but there is no visual grouping by seller, no "View Store" CTA on the results grid, and no category suggestion when zero results are found. The search is functional but does not guide the user forward.

**3. The "Order Again" bottom nav tab is mislabeled and confusing.**

The second tab in the bottom nav is labeled "Order Again" with a RotateCcw icon, but it navigates to `/orders` -- the full order history page. "Order Again" implies a quick reorder action, not a history browser. The actual reorder functionality exists as a button within completed order detail cards. This creates a false expectation.

**4. Favorites page is seller-only, not product-aware.**

Users favorite sellers, not products. When a user wants to buy a specific item they liked, they must remember which seller had it, go to Favorites, open the seller, search within the seller's menu, and re-add. There is no "Save for later" or product-level wishlist. This breaks the expected e-commerce pattern.

**5. Community Bulletin has no entry from the main home page.**

The Bulletin/Community board (`/community`) is a full feature with posts, polls, help requests, and discussions. But it has zero presence on the home page. There is no "Community" section, no recent posts widget, no "trending discussion" teaser. Users must navigate to the Society Dashboard to find it. For a community-first platform, this is an odd omission.

**6. Profile page is overloaded as a navigation hub.**

The Profile page serves as: personal info display, avatar editor, accessibility toggle, seller dashboard link, builder dashboard link, admin panel link, notification settings link, help link, community rules link, privacy/terms links, feedback trigger, sign out, and delete account. It is functioning as a secondary navigation menu rather than a profile page.

---

## Disconnected Workflows and Weak Integrations

| Gap | Severity | Description |
|---|---|---|
| Society Dashboard not in bottom nav | High | 18+ society features hidden behind Profile -> menu |
| Community Bulletin not surfaced on Home | High | No teaser, no recent posts, no "trending" on the main feed |
| Search -> action gap | Medium | Search results don't group by seller or offer clear "next step" guidance |
| Trust Directory isolated | Medium | `/directory` (skill listings/endorsements) has no connection to marketplace or community bulletin |
| Subscriptions page orphaned | Medium | `/subscriptions` exists but no path to create subscriptions from product or seller pages |
| Notices page not linked from bulletin | Low | Society Notices (`/society/notices`) and Community Bulletin (`/community`) are separate modules with no cross-linking |
| Gate Entry not on society dashboard mobile | Low | Gate Entry QR code is only in Profile -> Quick Access, not in the society dashboard cards |
| Help page not contextual | Low | Help page is a static FAQ; no contextual help links from feature pages |

---

## Specific Areas for Better Linking

**1. Home page needs a Society section.**
Below the marketplace content, add a compact card row: "Your Society" with 4-6 quick links (Visitors, Parking, Finances, Bulletin, Maintenance, Disputes). This gives residents one-tap access to their most-used society features without leaving the home experience.

**2. Search needs zero-result guidance.**
When search returns empty, show: "No results for 'X'. Try browsing [Category A] [Category B]" with tappable category pills. Currently it just shows an empty state.

**3. Product cards should show seller context.**
On the home page product listings, each product card navigates to the seller detail page. But the card itself shows no seller name or store context. Adding a small "by [Store Name]" line would help users understand what they are clicking into.

**4. Community Bulletin should have a teaser on Home.**
A compact "Community" section showing 1-2 recent posts or "3 neighbors need help" would drive engagement and make the bulletin feel like a living feature, not a buried module.

**5. Seller Detail page back button goes to Home, not previous page.**
The back arrow on SellerDetailPage is hardcoded to `Link to="/"`. If a user arrived from Search, Favorites, or a notification deep link, they lose their context. This should use `navigate(-1)` with a fallback.

**6. "Order Again" should be renamed to "My Orders."**
The bottom nav label "Order Again" with a RotateCcw icon sets incorrect expectations. "My Orders" or just "Orders" is clearer and honest about what the tab does.

---

## Navigation and Transition Gaps

1. **No breadcrumb or context indicator on sub-pages.** When deep in `/society/progress` or `/society/finances`, there is no visual indicator of where you are in the hierarchy. The header shows a title and back button, but no path context.

2. **Society feature pages all back-navigate to different places.** Some go to `/society`, some go to `/`, some use `navigate(-1)`. There is no consistent "return to society dashboard" pattern.

3. **Seller dashboard has no link back to the marketplace.** A seller managing their store has no quick way to see how their store appears in the marketplace feed or search results, except the "Preview" button which goes to their own seller detail page.

4. **Notifications Settings vs Notifications Inbox are separate pages** (`/notifications` vs `/notifications/inbox`) with no cross-link between them.

5. **The FloatingCartBar disappears on the cart page** (correct) but also on the seller detail page when cart has items from that seller (the seller page has its own cart bar). This dual-bar pattern could confuse users if they have items from multiple sellers.

---

## Final Verdict

**Product maturity: 8/10.** The technical architecture is strong. The commerce loop is complete. The role-based system is genuinely adaptive. The feature depth across marketplace, society, security, construction, and workforce is remarkable for any stage.

**Experience cohesion: 6/10.** The main weakness is not missing features -- it is that existing features are not surfaced where users expect them. The society management layer (half the product) is buried. The community bulletin (a social engagement driver) is invisible from the main screen. The profile page is doing double duty as a navigation hub.

**Sponsorship decision: Conditional yes.** The platform has the depth. It needs better wayfinding. The gap between "feature exists" and "user can find it" is the single biggest risk to user activation and retention. Fixing the navigation hierarchy -- specifically giving Society features a primary entry point and surfacing Community on the home screen -- would move this from 6/10 to 8/10 on experience cohesion.
