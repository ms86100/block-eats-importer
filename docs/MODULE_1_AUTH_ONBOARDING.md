# Module 1: Authentication & Onboarding

> **Scope:** AuthPage, ResetPasswordPage, WelcomeCarousel, LandingPage, ProfilePage, OnboardingWalkthrough, VerificationPendingScreen

---

## 1. Landing Page (`/landing`)

### Purpose
Public marketing page shown to unauthenticated visitors. Introduces the platform value proposition and drives signups.

### Layout & Sections

| Section | Component | Description |
|---|---|---|
| Navigation Bar | `LandingNav` | Sticky top nav with Sign In button |
| Hero | `LandingHero` | Headline "Your Society. Your Marketplace." with Join Now / Sign In CTAs |
| Trust Bar | `LandingTrustBar` | Social proof strip (society count, seller count, category count) — fetched live from DB |
| Pain Points | `LandingPainPoints` | Problem statement cards explaining why the platform exists |
| Features | `LandingFeatures` | Feature grid showcasing key capabilities |
| How It Works | `LandingHowItWorks` | Step-by-step visual guide |
| Testimonials | `LandingTestimonials` | User testimonials / social proof |
| Pricing | `LandingPricing` | Pricing tiers overview |
| Final CTA | `LandingFinalCTA` | Bottom call-to-action with signup button |
| Footer | `LandingFooter` | Links to Privacy, Terms, Pricing |

### Data Sources
- **Live stats** fetched on mount: `societies` (active count), `seller_profiles` (approved count), `parent_groups` (active count)

---

## 2. Welcome Carousel (`/welcome`)

### Purpose
Full-screen onboarding carousel for first-time visitors or unauthenticated users. Alternative to the Landing Page, mobile-optimized.

### Features

| Feature | Details |
|---|---|
| Auto-play carousel | `embla-carousel-react` with 8-second interval, loops infinitely |
| CMS-driven slides | Reads `landingSlidesJson` from `system_settings`. If a valid JSON array is stored, it replaces default slides |
| Dot indicators | Fixed bottom navigation dots with active state animation |
| Sign In shortcut | Fixed top-right "Sign In" button linking to `/auth` |
| Legal footer | Fixed bottom links: Privacy, Terms, Pricing |

### Default Slides (5)

1. **Hero** — "Your Society. Your Marketplace." with Join Now / Sign In buttons
2. **Trust & Safety** — "Only Verified Residents" with GPS verification, invite code, and badge verification bullets
3. **Categories** — "Everything You Need" — dynamically renders parent groups from `parent_groups` table (max 6) with matching icons and colors
4. **For Sellers** — "Turn Your Passion Into Income" with seller benefits list
5. **Social Proof + CTA** — Star rating testimonial, live stats (societies/sellers/categories), Get Started CTA

### CMS Slide Schema
```json
{
  "key": "string",
  "heading": "string",
  "subheading": "string (optional)",
  "highlight": "string (optional)",
  "bullets": ["string array (optional)"],
  "cta": { "label": "string", "link": "/path" }
}
```

---

## 3. Auth Page (`/auth`)

### Purpose
Unified authentication page handling Login, Signup (multi-step), and Password Reset initiation.

### Modes

The page operates in three modes controlled by `authMode` state:

#### 3.1 Login Mode (`authMode = 'login'`)

| Element | Type | Behavior |
|---|---|---|
| Email field | Input | Validates email format, shows green checkmark on valid |
| Password field | Input | Toggle visibility (Eye/EyeOff icon) |
| Forgot password? | Text button | Switches to `reset` mode |
| Sign In button | Primary button | Calls `supabase.auth.signInWithPassword()` |
| Rate limiting | UI Lock | After too many failed attempts: "Too many attempts. Try again in Xs" with countdown |
| New here? | Text link | Switches to `signup` mode |

**Workflow:**
1. User enters email + password → clicks "Sign In"
2. On success → redirected to HomePage
3. On failure → toast error with friendly message
4. Rate limiting locks the form after excessive failures

#### 3.2 Password Reset Mode (`authMode = 'reset'`)

| Element | Type | Behavior |
|---|---|---|
| Email field | Input | Pre-filled if already entered |
| Send Reset Link | Primary button | Calls `supabase.auth.resetPasswordForEmail()` |
| Success state | Info panel | Shows "Check your email" with instructions (check inbox/spam, click link, expires in 1 hour) |
| Resend button | Text link | Re-triggers the reset email |
| Back to Sign In | Button/link | Returns to login mode |

#### 3.3 Signup Mode (`authMode = 'signup'`)

Multi-step wizard with a progress bar showing 4 steps: **Account → Society → Details → Verify**

##### Step 1: Credentials (`signupStep = 'credentials'`)

| Element | Type | Behavior |
|---|---|---|
| Email | Input | Email validation with green checkmark |
| Password | Input | Toggle visibility, min 6 chars |
| Password Strength | `PasswordStrengthIndicator` | Visual bar showing weak/fair/strong/very strong |
| Age confirmation | Checkbox | "I confirm that I am 18 years of age or older" — required |
| Terms agreement | Inline text | Links to Terms & Conditions and Privacy Policy |
| Continue button | Primary | Validates all fields, advances to Step 2 |
| Already have account? | Text link | Switches to login mode |

##### Step 2: Society Selection (`signupStep = 'society'`)

Has two sub-steps controlled by `societySubStep`:

**Sub-step: Search (`societySubStep = 'search'`)**

| Element | Type | Behavior |
|---|---|---|
| Search input | Input with Search icon | Auto-focuses, shows loading spinner during search |
| Google Maps loading | Info banner | Shows while Maps API loads |
| DB results | Button list | "Registered Societies" — matches from `societies` table by name/city/pincode |
| Google Maps results | Button list | "Google Maps Results" — autocomplete predictions for unregistered locations |
| Society selection | Card button | Highlights selected society with border + checkmark |
| Invite code | Conditional input | If selected society has `invite_code` set, user must enter it |
| No results | Empty state | "No results found for [query]" |
| Empty state | Icon + text | "Start typing to search for your society" |
| Back button | Outline button | Returns to Step 1 |
| Continue button | Primary | Validates selection + invite code, advances to Step 3 |

**Sub-step: Request New Society (`societySubStep = 'request-form'`)**

Triggered when user selects a Google Maps location not matching any registered society.

| Field | Type | Required | Validation |
|---|---|---|---|
| Society Name | Input | Yes | Non-empty |
| Full Address | Input | No | — |
| Landmark | Input | No | — |
| City | Input | Yes | Non-empty |
| Pincode | Input | Yes | Numeric, max 6 digits |
| Contact Number | Input (with country code prefix) | Yes | Exactly 10 digits |

**Workflow:** Submits to `society_requests` table → shows info message "Your request will be reviewed by our team."

##### Step 3: Profile Details (`signupStep = 'profile'`)

| Field | Type | Required | Validation |
|---|---|---|---|
| Selected society | Info banner | Display only | Shows selected society name with "Change" link |
| Full Name | Input | Yes | Non-empty |
| Phone Number | Input (with country code prefix) | Yes | 10 digits, auto-formatted |
| Phase / Wing | Input | No | — |
| Block/Tower | Input | Yes | Non-empty. Label configurable via `addressBlockLabel` system setting |
| Flat/Unit | Input | Yes | Non-empty. Label configurable via `addressFlatLabel` system setting |

**Workflow:**
1. Calls `supabase.auth.signUp()` with email/password and `user_metadata` (name, phone, society_id, flat_number, block, phase)
2. Database trigger `handle_new_user()` creates profile row + default `buyer` role
3. If society has `auto_approve_residents = true`, sets `verification_status = 'approved'` immediately
4. Advances to Step 4

##### Step 4: Email Verification (`signupStep = 'verification'`)

| Element | Description |
|---|---|
| Check inbox icon | Mail icon in gradient container |
| Email display | Shows the email address used |
| Instructions | Numbered steps: open email, click confirm link, come back to login |
| Warning | "You won't be able to log in until you verify your email" (red banner) |
| Go to Login button | Switches to login mode, resets signup state |
| Help link | Toast with troubleshooting advice |

### Security Features
- **Rate limiting**: Client-side lockout after repeated failed login attempts with countdown timer
- **Password validation**: Zod schema (`passwordSchema`) enforces minimum 6 characters
- **Invite codes**: Societies can require invite codes during registration
- **Age verification**: Mandatory checkbox for 18+ confirmation
- **Email verification**: Required before first login (not auto-confirmed)

### System Settings Dependencies
| Setting Key | Usage |
|---|---|
| `platformName` | Displayed in hero banner |
| `defaultCountryCode` | Phone number prefix (e.g., "+91") |
| `addressBlockLabel` | Label for block/tower field (e.g., "Block", "Tower") |
| `addressFlatLabel` | Label for flat/unit field (e.g., "Flat No.", "Unit") |

---

## 4. Reset Password Page (`/reset-password`)

### Purpose
Handles the password reset flow after user clicks the email link. Separate from AuthPage.

### States

| State | Trigger | UI |
|---|---|---|
| Checking session | Page load | "Verifying reset link..." pulse animation |
| Invalid/expired link | No recovery session detected after 3s timeout | Error icon + "Invalid Reset Link" + Go to Login button |
| Password entry | Valid `PASSWORD_RECOVERY` event or URL hash `type=recovery` | Password form |
| Success | Password updated | Green checkmark + "Password Updated!" + Go to Login button |

### Form Fields

| Field | Type | Validation |
|---|---|---|
| New Password | Input (toggle visibility) | Min 6 chars, Zod `passwordSchema` validation |
| Password Strength | `PasswordStrengthIndicator` | Visual strength bar |
| Confirm Password | Input | Must match new password |

### Workflow
1. Supabase redirects user to this page with recovery token in URL hash
2. Page listens for `PASSWORD_RECOVERY` auth state change event
3. Fallback: checks `getSession()` and URL hash for `type=recovery`
4. 3-second timeout prevents infinite loading if session detection fails
5. User enters new password → `supabase.auth.updateUser({ password })` → success screen

---

## 5. Onboarding Walkthrough (Post-Login)

### Purpose
First-time user tutorial shown once after initial login for approved users.

### Trigger
- Controlled by `useOnboarding(userId)` hook
- Checks `localStorage` for `onboarding_complete_{userId}` flag
- Shown only when `isApproved = true` and flag is not set
- On completion, sets the flag permanently

### Default Slides (4)

| # | Icon | Title | Description |
|---|---|---|---|
| 1 | Users | Community Marketplace | Buy and sell within verified residential community |
| 2 | ShoppingBag | Easy Ordering | Browse, cart, UPI/COD payment |
| 3 | MapPin | Pickup or Delivery | Pickup from seller or doorstep delivery with tracking |
| 4 | Shield | Trusted & Verified | All sellers verified, rate/review after orders |

### CMS Override
- Can be overridden via `onboarding_slides` system setting (JSON array in DB)
- Each slide: `{ icon: "IconName", title, description, color }`
- Icons mapped from a predefined `ICON_MAP`

### UI Controls
- Swipe/dot navigation (Embla carousel)
- Skip button (top-right X icon)
- "Get Started" button on last slide
- Progress dots at bottom

---

## 6. Verification Pending Screen

### Purpose
Shown to logged-in users whose `verification_status ≠ 'approved'`. Blocks access to the main app.

### Features

| Feature | Description |
|---|---|
| Auto-refresh | Polls `profiles.verification_status` every 60 seconds. If approved, shows toast and refreshes auth context |
| Manual refresh | "Refresh" button with loading state |
| Queue position | Calculates position: count of pending profiles in same society created before user |
| Avg approval time | Estimates from recently approved profiles in same society (average hours) |
| Society preview | Shows trust_score, member_count, recent activity count |
| FAQ collapsible | "How long does verification take?", "What happens after verification?", "Can I speed this up?" |
| Sign out | Button to log out and return to auth page |

### Data Displayed

| Metric | Source |
|---|---|
| Queue position | Count of `profiles` with `verification_status='pending'` in same society, created before user |
| Avg approval hours | Average time between `created_at` and `updated_at` for recently approved profiles |
| Society trust score | `societies.trust_score` |
| Member count | Count of approved profiles in society |
| Recent activity | Count of `society_activity` entries in last 7 days |

---

## 7. Profile Page (`/profile`)

### Purpose
User profile management, settings, navigation hub, and account actions.

### Layout Sections

#### 7.1 Profile Header
| Element | Description |
|---|---|
| Avatar | Circular photo with camera overlay on hover. Click to edit via `ImageUpload` component. Uploads to `profiles` storage bucket |
| Name | Bold display from `profiles.name` |
| Society name | Primary-colored text from `societies.name` |
| Address | Flat number, Block, Phase — comma-separated |
| Phone | Phone number display |
| Verified badge | "Verified Resident" with Shield icon (shown if `verification_status = 'approved'`) |
| Skill badges | From `skill_listings` table — shows top 5 by trust_score with endorsement count |

#### 7.2 Quick Actions Grid
| Action | Icon | Destination | Condition |
|---|---|---|---|
| Orders | Package | `/orders` | Always |
| Favorites | Heart | `/favorites` | Always |
| Order Again | Repeat | `/orders` | Always |
| My Store | Store | `/seller` | Only if `isSeller = true` |

#### 7.3 Quick Access Cards
| Card | Condition | Destination | Description |
|---|---|---|---|
| Gate Entry | `resident_identity_verification` feature enabled | `/gate-entry` | "Show QR code to security" |
| Start Selling | `isSeller = false` | `/become-seller` | Accent-colored CTA to become a seller |

#### 7.4 Accessibility Toggle
| Control | Type | Description |
|---|---|---|
| Larger Text | Switch toggle | Adds `large-font` class to `<html>`. Persisted via `persistent-kv` (localStorage) |

#### 7.5 Menu List — "Your Information"
| Item | Icon | Destination | Condition |
|---|---|---|---|
| Community Directory | Award | `/directory` | Always |
| Builder Dashboard | Building2 | `/builder` | `isBuilderMember = true` |
| Seller Dashboard | Store | `/seller` | `isSeller = true` |
| Notifications | Bell | `/notifications` | Always |
| Help & Guide | HelpCircle | `/help` | Always |
| Admin Panel | Shield | `/admin` | `isAdmin = true` |
| Platform Docs | FileText | `/docs` | `isAdmin = true` |
| Push Debug | Bug | `/push-debug` | Always |

#### 7.6 Menu List — "Legal & Support"
| Item | Destination |
|---|---|
| Privacy Policy | `/privacy-policy` |
| Terms & Conditions | `/terms` |
| Community Rules | `/community-rules` |

#### 7.7 Notification Health Check
- `NotificationHealthCheck` component — inline diagnostic for push notification status

#### 7.8 Feedback Sheet
- `FeedbackSheet` — auto-triggered after seller onboarding completion (checks `seller_onboarding_completed` flag in localStorage)

#### 7.9 Account Actions
| Action | Type | Description |
|---|---|---|
| Sign Out | Outline button | Calls `signOut()`, redirects to `/auth` |
| Delete Account | `DeleteAccountDialog` | Danger zone — confirmation dialog for permanent account deletion |

#### 7.10 Footer
- Displays platform name and app version from system settings

---

## Cross-Cutting Concerns

### Database Triggers
| Trigger | Table | Action |
|---|---|---|
| `handle_new_user()` | `auth.users` (ON INSERT) | Creates profile row, assigns `buyer` role, checks `auto_approve_residents` |
| `auto_approve_resident()` | `profiles` (BEFORE INSERT) | Sets `verification_status = 'approved'` if society has auto-approve enabled |

### Auth State Management
- `AuthProvider` → `useAuthState` hook → calls `get_user_auth_context` RPC on session change
- Returns: profile, society, roles, seller_profiles, society_admin_role, builder_ids, is_security_officer, is_worker
- Split into focused contexts: Identity, Role, Society, Seller

### Email Verification
- **Not auto-confirmed** — users must click email link before first login
- Configurable via `configure_auth` tool but currently requires manual verification

### Session Persistence
- Uses `capacitorStorage` adapter — delegates to localStorage on web, `@capacitor/preferences` on native
- Auto-refreshes tokens via Supabase client config

---

*Next module: Module 2 — Home & Discovery (HomePage, SearchPage, CategoriesPage, CategoryGroupPage, FavoritesPage)*
