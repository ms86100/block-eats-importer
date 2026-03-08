import { DocSection, DocHero, DocInfoCard, DocTable, DocFlowStep } from './DocPrimitives';

export function AdminCommunityDocs() {
  return (
    <div className="space-y-2">
      <DocHero
        title="Administration & Community"
        description="This module covers the Admin Panel for platform management, Society Admin tools for community oversight, and all community features including bulletin board, disputes, help requests, visitor management, and gate security."
        badges={['Admin', 'Society Admin', '10+ Pages']}
      />

      {/* ─── ADMIN PANEL ─── */}
      <DocSection title="1. Admin Panel (/admin)">
        <p>The <strong>Admin Panel</strong> is the central management hub for platform administrators. It provides full control over users, sellers, products, categories, and system settings.</p>

        <DocInfoCard title="Navigation Structure" icon="🧭">
          <p>The admin panel uses a sticky top navigation bar with tabs:</p>
          <p>• <strong>Dashboard</strong> — Overview statistics and pending action items with urgency badges.</p>
          <p>• <strong>Users</strong> — User management with verification workflow.</p>
          <p>• <strong>Sellers</strong> — Seller approval, profile management, and license review.</p>
          <p>• <strong>Products</strong> — Product approval queue and catalog oversight.</p>
          <p>• <strong>Catalog</strong> — Category management, attribute blocks, and license configuration.</p>
          <p>• <strong>Settings</strong> — Partitioned into Platform, Notifications, and System.</p>
        </DocInfoCard>

        <DocInfoCard title="User Management" icon="👥">
          <p>View all registered users with: name, email, society, verification status, and roles.</p>
          <p><strong>Approval workflow:</strong> Pending users can be approved or rejected. Approved users gain access to the platform.</p>
          <p><strong>Role management:</strong> Assign roles (buyer, seller, admin, security_officer) to users. Roles are stored in a separate user_roles table for security.</p>
        </DocInfoCard>

        <DocInfoCard title="Seller Management" icon="🏪">
          <p>Review seller applications with full profile details, category selections, and product previews.</p>
          <p><strong>Verification workflow:</strong> Approve, reject, or request changes. Approved sellers become visible in the marketplace.</p>
          <p><strong>Food license review:</strong> Dedicated section for reviewing FSSAI documentation with approve/reject actions.</p>
        </DocInfoCard>

        <DocInfoCard title="Product Approval" icon="📦">
          <p>Queue of products awaiting approval with: product details, images, pricing, and seller info.</p>
          <p>Admins can approve, reject (with reason), or flag products for review.</p>
        </DocInfoCard>

        <DocInfoCard title="Catalog Manager" icon="📚">
          <p>The most powerful admin tool — controls how every category behaves across the entire platform.</p>
          <p>For each category, admins configure: <strong>transaction type</strong> (cart purchase, contact only, book slot, etc.), <strong>layout type</strong> (food, ecommerce, service), <strong>feature toggles</strong> (add-ons, veg toggle, duration field, staff management), and <strong>UI labels</strong>.</p>
          <p>Changes to transaction type automatically update all products in that category via database triggers.</p>
        </DocInfoCard>

        <DocInfoCard title="System Settings" icon="⚙️">
          <p><strong>Platform Settings:</strong> Platform name, default country code, address field labels, currency, and branding.</p>
          <p><strong>Notification Settings:</strong> Push notification templates, delivery notification preferences, and in-app alert configuration.</p>
          <p><strong>System Settings:</strong> Platform fee percentage, auto-approval toggles, maintenance mode, and feature flags.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── SOCIETY ADMIN ─── */}
      <DocSection title="2. Society Admin (/society/admin)">
        <p>The <strong>Society Admin Page</strong> provides community-level management for society administrators.</p>

        <DocInfoCard title="Resident Management" icon="🏠">
          <p>View and manage all residents: approve pending registrations, update flat/block assignments, and deactivate accounts.</p>
        </DocInfoCard>

        <DocInfoCard title="Society Settings" icon="⚙️">
          <p>Configure: auto-approve residents toggle, invite code requirement, maximum admins allowed, society location (lat/lng), and feature toggles for the community.</p>
        </DocInfoCard>

        <DocInfoCard title="Admin Team" icon="👤">
          <p>Manage society admin team: add/remove admins, assign roles (chairman, secretary, treasurer, committee member). Admin limit is configurable and enforced by a database trigger.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── BULLETIN BOARD ─── */}
      <DocSection title="3. Bulletin Board (/bulletin)">
        <p>A society-wide communication platform for announcements, polls, events, and discussions.</p>

        <DocInfoCard title="Post Types" icon="📣">
          <p>• <strong>Announcement</strong> — General notices from admins or residents.</p>
          <p>• <strong>Poll</strong> — Multiple choice voting with configurable deadline.</p>
          <p>• <strong>Event</strong> — With date, location, and RSVP functionality.</p>
          <p>• <strong>Discussion</strong> — Open forum threads.</p>
        </DocInfoCard>

        <DocInfoCard title="Interactions" icon="💬">
          <p>Posts support: upvoting/downvoting, comments, pinning (by admins), archiving, and attachment uploads.</p>
          <p>AI-generated summaries can be auto-generated for long posts.</p>
          <p>Activity is logged for society analytics.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── DISPUTES ─── */}
      <DocSection title="4. Disputes (/disputes)">
        <p>A formal grievance resolution system for residents to raise issues within the community.</p>

        <DocInfoCard title="Submission" icon="📝">
          <p>Residents submit dispute tickets with: category (maintenance, noise, parking, etc.), description, photo evidence, and anonymous submission option.</p>
          <p>An SLA deadline is automatically set based on the category.</p>
        </DocInfoCard>

        <DocInfoCard title="Resolution Workflow" icon="🔄">
          <DocFlowStep number={1} title="Submitted" desc="Ticket created and visible to society admins." />
          <DocFlowStep number={2} title="Acknowledged" desc="Admin acknowledges receipt within SLA." />
          <DocFlowStep number={3} title="In Progress" desc="Committee discusses via internal notes." />
          <DocFlowStep number={4} title="Resolved" desc="Resolution note added; resident notified." />
        </DocInfoCard>
      </DocSection>

      {/* ─── VISITOR MANAGEMENT ─── */}
      <DocSection title="5. Visitor Management (/visitors)">
        <p>Digital gate entry system for managing visitor access to the society.</p>

        <DocInfoCard title="Pre-Registration" icon="🎫">
          <p>Residents can pre-register expected visitors with: name, phone, purpose, and expected arrival time.</p>
          <p>A unique entry QR code or OTP is generated for the visitor.</p>
        </DocInfoCard>

        <DocInfoCard title="Gate Entry" icon="🚪">
          <p>Security staff verify visitors via QR scan or OTP. Entries are timestamped and logged.</p>
          <p>Visitor types are configurable per society (guest, delivery, cab, etc.).</p>
          <p>Residents receive real-time notifications when their visitors check in.</p>
        </DocInfoCard>

        <DocInfoCard title="Gate Entry Log" icon="📋">
          <p>Complete audit trail of all entries with: visitor name, flat visited, entry/exit times, and verification method.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── GUARD KIOSK ─── */}
      <DocSection title="6. Guard Kiosk (/guard)">
        <p>A simplified, kiosk-mode interface for security staff at the gate.</p>
        <p>Features: QR scanner, manual visitor entry form, worker attendance check-in, domestic help verification, and parcel logging.</p>
        <p>The interface is optimized for quick, one-tap operations with large touch targets.</p>
      </DocSection>

      {/* ─── DOMESTIC HELP ─── */}
      <DocSection title="7. Domestic Help & Workers">
        <p>Management system for domestic workers (maids, cooks, drivers) in the society.</p>

        <DocInfoCard title="Worker Registry" icon="👷">
          <p>Residents register their domestic help with: name, phone, photo, type (maid, cook, driver, etc.), and flat assignment.</p>
          <p>Workers can be shared between multiple flats.</p>
        </DocInfoCard>

        <DocInfoCard title="Attendance Tracking" icon="📅">
          <p>Daily check-in/check-out tracking via the guard kiosk or resident app.</p>
          <p>Monthly attendance reports with leave tracking and salary management tools.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── HELP REQUESTS ─── */}
      <DocSection title="8. Help Requests (/help)">
        <p>A community help board where residents can post requests and offer assistance.</p>
        <p>Requests are tagged (lending, carpooling, emergency, general) and visible to all society members.</p>
        <p>Other residents can respond to help requests, with response count tracked and displayed.</p>
      </DocSection>

      {/* ─── SOCIETY REPORTS ─── */}
      <DocSection title="9. Society Reports & Analytics">
        <p>Comprehensive analytics dashboards for society administrators.</p>

        <DocInfoCard title="Available Reports" icon="📊">
          <p>• <strong>Society Dashboard</strong> — Member count, active sellers, order volume, and revenue metrics.</p>
          <p>• <strong>Society Finances</strong> — Platform fee collection, settlement summaries, and financial health.</p>
          <p>• <strong>Activity Feed</strong> — Chronological log of all society activity (orders, bulletins, disputes, entries).</p>
          <p>• <strong>Top Products</strong> — Most ordered products within the society.</p>
          <p>• <strong>Search Demand</strong> — What residents are searching for, helping identify unmet needs.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── NOTIFICATIONS ─── */}
      <DocSection title="10. Notification System">
        <p>The platform uses a multi-channel notification system to keep all stakeholders informed.</p>

        <DocInfoCard title="Notification Types" icon="🔔">
          <p>• <strong>Push Notifications</strong> — Delivered via FCM (Android) and APNs (iOS) for order updates, new messages, visitor alerts, and delivery status.</p>
          <p>• <strong>In-App Notifications</strong> — Stored in notification_queue and displayed in the Notification Inbox with read/unread status.</p>
          <p>• <strong>Seller Alerts</strong> — New order buzzer with persistent audio alert and full-screen overlay.</p>
        </DocInfoCard>

        <DocInfoCard title="Delivery Pipeline" icon="⚡">
          <p>Notifications follow a database-driven queue system:</p>
          <p>1. Events (new order, status change, message) insert into <strong>notification_queue</strong>.</p>
          <p>2. Edge Functions claim batches and deliver via FCM/APNs.</p>
          <p>3. Failed deliveries trigger retries; stale tokens are automatically cleaned.</p>
        </DocInfoCard>
      </DocSection>
    </div>
  );
}
