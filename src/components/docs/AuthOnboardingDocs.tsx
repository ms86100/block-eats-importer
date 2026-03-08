import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, CheckCircle, AlertTriangle, Sparkles, Shield, Mail, Key, Eye, EyeOff, UserPlus, MapPin, Building2, Camera, Bell, FileText, Trash2 } from 'lucide-react';

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex items-center gap-1.5 group cursor-pointer mb-2">
        <ChevronDown size={14} className="text-muted-foreground group-data-[state=closed]:rotate-[-90deg] transition-transform" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-5 pb-4 text-sm text-muted-foreground leading-relaxed space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}


function FlowStep({ number, title, desc }: { number: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{number}</div>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function TableRow({ cells }: { cells: string[] }) {
  return (
    <tr className="border-b border-border last:border-0">
      {cells.map((cell, i) => (
        <td key={i} className="px-3 py-2 text-xs">{cell}</td>
      ))}
    </tr>
  );
}

export function AuthOnboardingDocs() {
  return (
    <div className="space-y-2">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-5 mb-4">
        <h2 className="text-lg font-bold text-foreground mb-1">Module 1 — Authentication & Onboarding</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This module covers everything about how users discover the platform, create their accounts, verify their identity,
          and set up their profiles. It includes the public landing page, the signup wizard, email verification,
          the resident approval process, and the profile management system.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">7 pages</span>
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">All Users</span>
        </div>
      </div>

      {/* ─── LANDING PAGE ─── */}
      <Sub title="1. Landing Page (/landing)">
        <p>The <strong>Landing Page</strong> is the first thing unauthenticated visitors see. It's a public marketing page designed to communicate the platform's value proposition and drive signups.</p>
        
        <p><strong>What's on the page:</strong></p>
        <p>At the top, there's a <strong>sticky navigation bar</strong> with a Sign In button. Below that, the <strong>Hero section</strong> presents the headline "Your Society. Your Marketplace." with two call-to-action buttons — "Join Now" and "Sign In."</p>
        
        <p>A <strong>Trust Bar</strong> immediately follows, displaying live statistics pulled from the database: the number of active societies, approved sellers, and available categories. These numbers update dynamically because they're fetched on every page load.</p>
        
        <p>The page continues with a <strong>Pain Points</strong> section explaining why the platform exists, a <strong>Features grid</strong> showcasing key capabilities, a <strong>How It Works</strong> step-by-step guide, <strong>Testimonials</strong> for social proof, a <strong>Pricing</strong> overview, and a final <strong>Call to Action</strong> at the bottom.</p>
        
        <p>The footer includes links to Privacy Policy, Terms of Service, and Pricing.</p>
      </Sub>

      {/* ─── WELCOME CAROUSEL ─── */}
      <Sub title="2. Welcome Carousel (/welcome)">
        <p>The <strong>Welcome Carousel</strong> is a full-screen, mobile-optimized alternative to the Landing Page. It's designed for first-time visitors who arrive on a mobile device.</p>
        
        <p><strong>How it works:</strong> The carousel automatically advances every 8 seconds, looping infinitely. Users can also swipe manually or tap the dot indicators at the bottom to navigate between slides.</p>
        
        <p><strong>Default slides include:</strong></p>
        <p>• <strong>Slide 1 (Hero):</strong> "Your Society. Your Marketplace." — the core value proposition with Join Now and Sign In buttons.</p>
        <p>• <strong>Slide 2 (Trust & Safety):</strong> "Only Verified Residents" — emphasizing GPS verification, invite codes, and badge verification.</p>
        <p>• <strong>Slide 3 (Categories):</strong> "Everything You Need" — dynamically renders up to 6 category groups from the database with matching icons and colors.</p>
        <p>• <strong>Slide 4 (For Sellers):</strong> "Turn Your Passion Into Income" — highlighting seller benefits.</p>
        <p>• <strong>Slide 5 (Social Proof):</strong> A testimonial, live stats, and a "Get Started" call to action.</p>
        
        <p><strong>CMS-driven slides:</strong> Admins can completely replace the default slides by storing a JSON array in the <code className="text-[10px] bg-muted px-1 rounded">landingSlidesJson</code> system setting. Each custom slide can define a heading, subheading, highlight text, bullet points, and a call-to-action button with a link.</p>
        
        <p>A "Sign In" shortcut is always visible at the top-right corner, and legal links (Privacy, Terms, Pricing) are fixed at the bottom.</p>
      </Sub>

      {/* ─── AUTH PAGE ─── */}
      <Sub title="3. Authentication Page (/auth)">
        <p>The <strong>Auth Page</strong> is the unified gateway for all authentication activities. It handles three distinct modes: <strong>Login</strong>, <strong>Signup</strong>, and <strong>Password Reset</strong>.</p>
        
        <div className="mt-3 mb-3 p-3 bg-card border border-border rounded-xl">
          <p className="text-xs font-semibold text-foreground mb-2">🔐 Login Mode</p>
          <p>Users enter their email and password. The email field shows a green checkmark when the format is valid. The password field has a visibility toggle (eye icon). A "Forgot password?" link switches to reset mode.</p>
          <p className="mt-2">After clicking "Sign In," the system calls the authentication service. On success, users are redirected to the homepage. On failure, a friendly error message appears as a toast notification.</p>
          <p className="mt-2"><strong>Rate limiting:</strong> After too many failed attempts, the form locks temporarily with a countdown timer showing "Too many attempts. Try again in Xs."</p>
        </div>

        <div className="mt-3 mb-3 p-3 bg-card border border-border rounded-xl">
          <p className="text-xs font-semibold text-foreground mb-2">🔑 Password Reset Mode</p>
          <p>The user enters their email (pre-filled if already typed). Clicking "Send Reset Link" sends a password recovery email. The page then shows an informational panel with instructions: check inbox and spam folder, click the reset link, and note that the link expires in 1 hour. A "Resend" button allows re-triggering the email.</p>
        </div>
        
        <div className="mt-3 mb-3 p-3 bg-card border border-border rounded-xl">
          <p className="text-xs font-semibold text-foreground mb-2">📝 Signup Mode (4-Step Wizard)</p>
          <p>The signup process is a multi-step wizard with a visual progress bar showing four stages:</p>
          
          <div className="space-y-3 mt-3">
            <div className="pl-3 border-l-2 border-primary/30">
              <p className="text-xs font-semibold text-foreground">Step 1: Account Credentials</p>
              <p>Email, password (with strength indicator showing weak/fair/strong/very strong), an age confirmation checkbox ("I am 18+"), and implicit agreement to Terms & Privacy Policy.</p>
            </div>
            
            <div className="pl-3 border-l-2 border-primary/30">
              <p className="text-xs font-semibold text-foreground">Step 2: Society Selection</p>
              <p>A search field that queries both the <strong>registered societies database</strong> and <strong>Google Maps autocomplete</strong>. Users can select an existing society or request a new one to be added.</p>
              <p className="mt-1">If the selected society has an <strong>invite code</strong> enabled, the user must enter it before proceeding.</p>
              <p className="mt-1">If the user selects a Google Maps location that doesn't match any registered society, they're shown a <strong>New Society Request Form</strong> with fields for society name, address, landmark, city, pincode, and contact number. This submits a request for admin review.</p>
            </div>
            
            <div className="pl-3 border-l-2 border-primary/30">
              <p className="text-xs font-semibold text-foreground">Step 3: Profile Details</p>
              <p>The user provides their full name, phone number, phase/wing, block/tower, and flat/unit number. The labels for block and flat fields are configurable by admins through system settings.</p>
              <p className="mt-1">When the user submits, the system creates their account, profile, and assigns the "buyer" role. If the society has auto-approval enabled, the user is immediately approved.</p>
            </div>
            
            <div className="pl-3 border-l-2 border-primary/30">
              <p className="text-xs font-semibold text-foreground">Step 4: Email Verification</p>
              <p>A confirmation screen showing the user's email with numbered instructions: open the email, click the confirm link, and return to login. A prominent warning states that login is not possible until email verification is complete.</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-primary flex items-center gap-1 mt-2">
          <Shield size={12} />
          <strong>Security features:</strong> Rate limiting, password strength validation (min 6 chars), invite code protection, age verification, and mandatory email confirmation.
        </p>
      </Sub>

      {/* ─── RESET PASSWORD PAGE ─── */}
      <Sub title="4. Reset Password Page (/reset-password)">
        <p>This page handles the second half of the password reset flow — when the user clicks the link from their email and lands back in the application.</p>
        
        <p><strong>How it works:</strong></p>
        <p>1. The user arrives at this page via a special link from their email that contains a recovery token.</p>
        <p>2. The page first shows a "Verifying reset link..." loading state while it checks for a valid recovery session.</p>
        <p>3. If the session is valid, a password form appears with fields for "New Password" (with strength indicator) and "Confirm Password."</p>
        <p>4. If the link is invalid or expired (detected after a 3-second timeout), an error screen appears with a "Go to Login" button.</p>
        <p>5. On successful password update, a green checkmark confirms "Password Updated!" with a button to proceed to login.</p>
      </Sub>

      {/* ─── ONBOARDING WALKTHROUGH ─── */}
      <Sub title="5. Onboarding Walkthrough (First Login)">
        <p>After a user logs in for the first time and has been approved, they see a guided onboarding tour before accessing the main application.</p>
        
        <p><strong>When it appears:</strong> Only on the first login after approval. The system checks a local flag to ensure it only shows once per user. Once the user completes or skips the walkthrough, the flag is set permanently.</p>
        
        <p><strong>Default walkthrough slides:</strong></p>
        <p>• <strong>Community Marketplace</strong> — "Buy and sell within your verified residential community."</p>
        <p>• <strong>Easy Ordering</strong> — "Browse products, add to cart, and pay via UPI or Cash on Delivery."</p>
        <p>• <strong>Pickup or Delivery</strong> — "Pick up from the seller or get doorstep delivery with tracking."</p>
        <p>• <strong>Trusted & Verified</strong> — "All sellers are verified residents. Rate and review after every order."</p>
        
        <p><strong>CMS Override:</strong> Admins can replace the default slides by storing custom JSON in the <code className="text-[10px] bg-muted px-1 rounded">onboarding_slides</code> system setting, specifying icon, title, description, and color for each slide.</p>
        
        <p><strong>Controls:</strong> Users can swipe through slides, use dot indicators, tap the X button to skip, or tap "Get Started" on the last slide.</p>
      </Sub>

      {/* ─── VERIFICATION PENDING ─── */}
      <Sub title="6. Verification Pending Screen">
        <p>If a user has registered but hasn't been approved yet, they see this screen instead of the main application. It provides transparency about where they are in the approval process.</p>
        
        <p><strong>What the user sees:</strong></p>
        <p>• Their <strong>queue position</strong> — how many people submitted before them in the same society and are still pending.</p>
        <p>• An <strong>estimated approval time</strong> — calculated from the average time it took to approve recent residents in the same society.</p>
        <p>• A <strong>society preview</strong> showing the society's trust score, total member count, and recent activity.</p>
        <p>• An <strong>FAQ section</strong> answering common questions about the verification process.</p>
        
        <p><strong>Automatic polling:</strong> Every 60 seconds, the system silently checks if the user's status has changed to "approved." When approval happens, a success notification appears and the user is automatically redirected to the homepage.</p>
        
        <p>Users can also manually tap a "Refresh" button or sign out to return to the login screen.</p>
      </Sub>

      {/* ─── PROFILE PAGE ─── */}
      <Sub title="7. Profile Page (/profile)">
        <p>The Profile Page serves as both a personal information manager and a navigation hub. It's where users update their details, access key features, and manage their account.</p>
        
        <p><strong>Profile Header:</strong></p>
        <p>At the top, users see their circular avatar (tappable to upload a new photo), full name, society name, address (flat, block, phase), phone number, and a "Verified Resident" badge if they're approved. If the user has skill listings, their top 5 skill badges are displayed with endorsement counts.</p>
        
        <p><strong>Quick Actions (Grid):</strong></p>
        <p>Four quick-access tiles: <strong>Orders</strong> (order history), <strong>Favorites</strong> (saved stores), <strong>Order Again</strong> (quick reorder), and <strong>My Store</strong> (seller dashboard — only shown for registered sellers).</p>
        
        <p><strong>Quick Access Cards:</strong></p>
        <p>• <strong>Gate Entry</strong> — Shows a QR code for security verification (only if visitor management is enabled for the society).</p>
        <p>• <strong>Start Selling</strong> — A highlighted call-to-action card inviting non-sellers to register as sellers.</p>
        
        <p><strong>Accessibility:</strong> A "Larger Text" toggle that increases font sizes across the app, persisted in local storage.</p>
        
        <p><strong>Navigation Menu — "Your Information":</strong></p>
        <p>Links to Community Directory, Notifications, Help & Guide, and conditionally: Builder Dashboard (for builder members), Seller Dashboard (for sellers), Admin Panel (for admins), and Platform Docs (for admins).</p>
        
        <p><strong>Navigation Menu — "Legal & Support":</strong></p>
        <p>Links to Privacy Policy, Terms & Conditions, and Community Rules.</p>
        
        <p><strong>Notification Health Check:</strong> An inline diagnostic component that checks push notification status and alerts users if there are issues.</p>
        
        <p><strong>Account Actions:</strong></p>
        <p>• <strong>Sign Out</strong> — Logs the user out and redirects to the login page.</p>
        <p>• <strong>Delete Account</strong> — Opens a confirmation dialog for permanent account deletion (danger zone).</p>
        
        <p className="text-[11px] text-muted-foreground mt-2">The footer shows the platform name and current app version from system settings.</p>
      </Sub>

      {/* ─── CROSS-CUTTING ─── */}
      <Sub title="System Architecture Notes">
        <p><strong>Auth State Management:</strong> The entire authentication state is managed centrally through an Auth Provider that calls a database function on every session change. This returns the user's profile, society, roles, seller profiles, admin status, builder memberships, and other contextual data — all in a single optimized call.</p>
        
        <p><strong>Session Persistence:</strong> On web browsers, sessions are stored in localStorage. On native mobile apps (via Capacitor), sessions are stored in secure device preferences. Tokens auto-refresh in the background.</p>
        
        <p><strong>Email Verification:</strong> Email verification is required before first login. Users must click a confirmation link sent to their email. This is not auto-confirmed — it's a deliberate security measure.</p>
        
        <p><strong>Profile Auto-Recovery:</strong> If a user's profile is somehow missing (edge case), the system attempts to reconstruct it from the user's session metadata. This self-healing mechanism prevents users from being locked out.</p>
        
        <p><strong>Admin-Configurable Settings:</strong></p>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
            <thead><tr className="bg-muted/50">
              <th className="text-left px-3 py-2 font-semibold">Setting</th>
              <th className="text-left px-3 py-2 font-semibold">Purpose</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              <tr><td className="px-3 py-2"><code className="text-[10px] bg-muted px-1 rounded">platformName</code></td><td className="px-3 py-2">Displayed in the hero banner and footer</td></tr>
              <tr><td className="px-3 py-2"><code className="text-[10px] bg-muted px-1 rounded">defaultCountryCode</code></td><td className="px-3 py-2">Phone number prefix (e.g., "+91")</td></tr>
              <tr><td className="px-3 py-2"><code className="text-[10px] bg-muted px-1 rounded">addressBlockLabel</code></td><td className="px-3 py-2">Label for block/tower field (e.g., "Block", "Tower")</td></tr>
              <tr><td className="px-3 py-2"><code className="text-[10px] bg-muted px-1 rounded">addressFlatLabel</code></td><td className="px-3 py-2">Label for flat/unit field (e.g., "Flat No.", "Unit")</td></tr>
              <tr><td className="px-3 py-2"><code className="text-[10px] bg-muted px-1 rounded">landingSlidesJson</code></td><td className="px-3 py-2">CMS-driven welcome carousel slides</td></tr>
              <tr><td className="px-3 py-2"><code className="text-[10px] bg-muted px-1 rounded">onboarding_slides</code></td><td className="px-3 py-2">CMS-driven onboarding walkthrough slides</td></tr>
            </tbody>
          </table>
        </div>
      </Sub>
    </div>
  );
}
