import { DocSection, DocHero, DocInfoCard, DocTable, DocFlowStep } from './DocPrimitives';

export function SellerToolsDocs() {
  return (
    <div className="space-y-2">
      <DocHero
        title="Seller Tools"
        description="This module covers everything a seller needs to manage their business — from the 6-step onboarding wizard through product management, order fulfillment, earnings tracking, coupon management, analytics, and store configuration."
        badges={['Seller', '5 Pages']}
      />

      {/* ─── BECOME SELLER ─── */}
      <DocSection title="1. Become a Seller (/become-seller)">
        <p>The <strong>Become a Seller</strong> page is a 6-step onboarding wizard that guides residents through setting up their store. It adapts dynamically based on the selected category group.</p>

        <DocInfoCard title="Pre-Flight Checks" icon="🔒">
          <p>Before showing the wizard, the system checks if the user already has a seller profile. If an existing profile exists (approved, pending, or draft), the user is shown appropriate messaging rather than the wizard.</p>
          <p>Parent groups and category configurations are loaded from the database to drive the entire wizard experience.</p>
        </DocInfoCard>

        <DocInfoCard title="Step 1: Category Group Selection" icon="📂">
          <p>Users choose their primary category group (e.g., Food & Kitchen, Home Services, Retail, etc.). Each group shows its icon, name, and description from the <code className="text-[10px] bg-muted px-1 rounded">parent_groups</code> table.</p>
          <p>The selected group determines which sub-categories, features, and UI elements appear in subsequent steps.</p>
        </DocInfoCard>

        <DocInfoCard title="Step 2: Sub-Category Specialization" icon="🏷️">
          <p>A 2-column grid of sub-categories within the selected group. Each category shows its icon and display name.</p>
          <p>Users select one or more specific categories they'll serve (e.g., under "Food & Kitchen" → Home Cooking, Bakery, Tiffin Service).</p>
          <p>Categories can be toggled on/off and the selection is validated before proceeding.</p>
        </DocInfoCard>

        <DocInfoCard title="Step 3: Store Details" icon="📝">
          <p>Fields include:</p>
          <p>• <strong>Business Name</strong> (required)</p>
          <p>• <strong>Description</strong> (textarea for store bio)</p>
          <p>• <strong>Profile Image</strong> — Croppable image upload for the store avatar</p>
          <p>• <strong>Cover Image</strong> — Croppable image upload for the store banner</p>
          <p>• <strong>FSSAI Number</strong> — Required for food categories only</p>
          <p>If the selected group requires a license, a <strong>License Upload</strong> component appears.</p>
        </DocInfoCard>

        <DocInfoCard title="Step 4: Store Configuration" icon="⚙️">
          <p>Operating schedule, payment, and delivery settings:</p>
          <p>• <strong>Operating Days</strong> — 7-day checkbox row (Mon–Sun)</p>
          <p>• <strong>Operating Hours</strong> — Start time and end time inputs</p>
          <p>• <strong>Fulfillment Mode</strong> — Radio group with 5 options: Self Pickup Only, I Deliver, Delivery Partner, Pickup + I Deliver, Pickup + Delivery Partner</p>
          <p>• <strong>UPI ID</strong> — For accepting UPI payments</p>
          <p>• <strong>Accept COD</strong> — Toggle for cash-on-delivery</p>
          <p>• <strong>Sell Beyond Community</strong> — Toggle to make products visible to nearby societies, with radius slider (1-15 km)</p>
        </DocInfoCard>

        <DocInfoCard title="Step 5: First Products" icon="📦">
          <p>Sellers add their first products/services using the <strong>DraftProductManager</strong>. Fields adapt based on the selected category — food sellers see veg/non-veg toggle, service sellers see duration and location type.</p>
          <p>A draft seller profile is created in the database at this step, allowing product images to be uploaded to the correct storage path.</p>
          <p>The <strong>DraftProductForm</strong> is also accessible, letting sellers add multiple items during onboarding.</p>
        </DocInfoCard>

        <DocInfoCard title="Step 6: Review & Submit" icon="✅">
          <p>A summary of all entered information: store name, categories, operating schedule, fulfillment mode, payment methods, and product count.</p>
          <p>A mandatory <strong>Declaration checkbox</strong>: "I confirm all information is accurate and I will operate according to community guidelines."</p>
          <p>Two options: <strong>Save Draft & Exit</strong> (saves without submitting) or <strong>Submit for Approval</strong> (submits for admin review).</p>
          <p>On submission, a success screen with animated checkmark shows "Application Submitted!" with a note about the review timeline and links to the profile page.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── SELLER DASHBOARD ─── */}
      <DocSection title="2. Seller Dashboard (/seller)">
        <p>The <strong>Seller Dashboard</strong> is the command center for sellers, organized into four functional tabs: <strong>Orders</strong>, <strong>Schedule</strong>, <strong>Tools</strong>, and <strong>Stats</strong>.</p>

        <DocInfoCard title="Store Status Card" icon="🏪">
          <p>Shows the current store name, verification status badge, and an availability toggle to instantly open or close the store.</p>
          <p>Multi-profile sellers see a <strong>Seller Switcher</strong> if they manage more than one store.</p>
          <p>Toggling availability logs to the audit trail for accountability.</p>
        </DocInfoCard>

        <DocInfoCard title="Visibility Checklist" icon="✅">
          <p>A guided checklist showing what's needed for the store to appear in search results: approved status, at least one active product, operating hours set, and payment method configured.</p>
        </DocInfoCard>

        <DocInfoCard title="Service Schedule Warning" icon="⚠️">
          <p>For sellers with service-type categories: if no availability schedule has been configured, a warning alert appears: "You haven't configured your availability schedule. Buyers can't book your services until you set your working hours." with a link to configure.</p>
        </DocInfoCard>

        <DocInfoCard title="New Order Alert Overlay" icon="🔔">
          <p>When a new order arrives, a full-screen overlay with sound alert appears. The seller can dismiss or snooze the alert. This ensures no orders are missed.</p>
        </DocInfoCard>

        <DocInfoCard title="Orders Tab" icon="📦">
          <p><strong>Order Filters</strong> — Horizontal filter chips with live count badges: All, Today, Enquiries, Pending, Preparing, Ready, Completed. Uses infinite scroll pagination.</p>
          <p><strong>Order Cards</strong> (<code className="text-[10px] bg-muted px-1 rounded">SellerOrderCard</code>) — Each order shows buyer info, items, total, time elapsed, and action buttons. Status transitions follow category-specific flows from the database.</p>
          <p>Empty state guides: "Share your store link with neighbors to get your first order."</p>
        </DocInfoCard>

        <DocInfoCard title="Schedule Tab" icon="📅">
          <p>Only appears if the seller has service-type categories (dynamically detected via <code className="text-[10px] bg-muted px-1 rounded">useSellerCategoryFlags</code>).</p>
          <p>• <strong>Day Agenda</strong> (<code className="text-[10px] bg-muted px-1 rounded">SellerDayAgenda</code>) — Today's appointments in chronological order.</p>
          <p>• <strong>Booking Stats</strong> (<code className="text-[10px] bg-muted px-1 rounded">ServiceBookingStats</code>) — Today's count, this week, completion rate.</p>
          <p>• <strong>Bookings Calendar</strong> (<code className="text-[10px] bg-muted px-1 rounded">ServiceBookingsCalendar</code>) — Monthly calendar with booking dots and detail view.</p>
          <p>• <strong>Slot Calendar Manager</strong> (<code className="text-[10px] bg-muted px-1 rounded">SlotCalendarManager</code>) — Block/unblock specific time slots.</p>
        </DocInfoCard>

        <DocInfoCard title="Tools Tab" icon="🔧">
          <p>• <strong>Quick Actions</strong> — Buttons for: Add Product, View Earnings, Store Settings, Manage Coupons.</p>
          <p>• <strong>Coupon Manager</strong> (<code className="text-[10px] bg-muted px-1 rounded">CouponManager</code>) — Create, edit, and deactivate promotional coupons with discount type (percentage/flat), min order amount, usage limits, per-user limits, validity period, and buyer visibility toggle.</p>
        </DocInfoCard>

        <DocInfoCard title="Stats Tab" icon="📊">
          <p><strong>Performance Card</strong> — "How buyers see your store" with: rating, average response time, completed orders, cancellation rate, and trust badges. Includes a "Preview" link to view the store as buyers see it.</p>
          <p><strong>Earnings Summary</strong> — Today's earnings, this week, total, repeat buyer percentage, and unique customer count.</p>
          <p><strong>Dashboard Stats</strong> — Total orders, pending, today's orders, completed orders.</p>
          <p><strong>Seller Analytics</strong> (<code className="text-[10px] bg-muted px-1 rounded">SellerAnalytics</code>) — Visual charts for order trends, revenue, top products, peak hours.</p>
          <p><strong>Demand Insights</strong> (<code className="text-[10px] bg-muted px-1 rounded">DemandInsights</code>) — Unmet demand in the society: what buyers search for but can't find, helping sellers identify product opportunities.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── SELLER PRODUCTS ─── */}
      <DocSection title="3. Product Management (/seller/products)">
        <p>The <strong>Seller Products Page</strong> is where sellers manage their entire product catalog.</p>

        <DocInfoCard title="Product List" icon="📋">
          <p>Shows all products with: image thumbnail, name, price, category, veg/non-veg badge, availability toggle, and approval status badge (pending/approved/rejected).</p>
          <p>A <strong>Seller Switcher</strong> appears for multi-profile sellers.</p>
        </DocInfoCard>

        <DocInfoCard title="Add/Edit Product Dialog" icon="➕">
          <p>A comprehensive modal form with fields that adapt based on the product's category configuration:</p>
          <p>• <strong>Product Image</strong> — AI-assisted image upload via <code className="text-[10px] bg-muted px-1 rounded">ProductImageUpload</code> that can generate product images.</p>
          <p>• <strong>Name & Description</strong> — With category-specific placeholders from admin config.</p>
          <p>• <strong>Price & MRP</strong> — With auto-calculated discount percentage display.</p>
          <p>• <strong>Category Selection</strong> — Dropdown of the seller's allowed categories.</p>
          <p>• <strong>Subcategory</strong> — Optional second-level categorization.</p>
          <p>• <strong>Lead Time (hours)</strong> — How far in advance orders are needed.</p>
          <p>• <strong>Accept Pre-orders</strong> — Toggle for future-date ordering.</p>
          <p>• <strong>Veg/Non-Veg Toggle</strong> — Shown only if the category has <code className="text-[10px] bg-muted px-1 rounded">show_veg_toggle</code> enabled.</p>
          <p>• <strong>Duration Field</strong> — Shown only if the category has <code className="text-[10px] bg-muted px-1 rounded">show_duration_field</code> enabled.</p>
          <p>• <strong>Bestseller / Recommended</strong> — Toggle badges for product discovery priority.</p>
          <p>• <strong>Urgent Order Alert</strong> — Enables 3-minute response timer with auto-cancel.</p>
          <p>• <strong>Stock Tracking</strong> — Toggle with current stock quantity and low-stock alert threshold.</p>
          <p>• <strong>Attribute Blocks</strong> — Dynamic specification fields from the <code className="text-[10px] bg-muted px-1 rounded">attribute_block_library</code>.</p>
          <p>• <strong>Service Fields</strong> — Duration, buffer time, location type, price model (shown for service categories).</p>
          <p>• <strong>Service Add-ons Manager</strong> — Upsell items (shown if category supports add-ons).</p>
        </DocInfoCard>

        <DocInfoCard title="Bulk Product Upload" icon="📤">
          <p>A <code className="text-[10px] bg-muted px-1 rounded">BulkProductUpload</code> component allows adding multiple products at once, useful for sellers with large catalogs.</p>
        </DocInfoCard>

        <DocInfoCard title="Product Approval Workflow" icon="🔄">
          <p>Newly created products start with "pending" approval status. Once an admin approves them, they become visible in the marketplace.</p>
          <p>Rejected products show the rejection reason and can be edited and re-submitted.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── SELLER EARNINGS ─── */}
      <DocSection title="4. Earnings & Payouts (/seller/earnings)">
        <p>Detailed financial tracking for sellers with settlement management.</p>

        <DocInfoCard title="Earnings Overview Cards" icon="💰">
          <p>Four summary cards showing: <strong>Today's Earnings</strong>, <strong>This Week</strong>, <strong>This Month</strong>, and <strong>All Time</strong> net amounts.</p>
          <p>An additional <strong>Pending Payout</strong> card shows the total amount awaiting settlement.</p>
          <p>All amounts are net of platform fees.</p>
        </DocInfoCard>

        <DocInfoCard title="Settlement History" icon="📊">
          <p>A chronological list of all settlements from the <code className="text-[10px] bg-muted px-1 rounded">payment_settlements</code> table, each showing:</p>
          <p>• Order reference ID</p>
          <p>• Gross amount (what the buyer paid)</p>
          <p>• Platform fee deducted</p>
          <p>• Net amount (what the seller receives)</p>
          <p>• Settlement status badge: <strong>Pending</strong> (yellow) or <strong>Settled</strong> (green)</p>
          <p>• Date and time</p>
        </DocInfoCard>

        <DocInfoCard title="Platform Fee" icon="💳">
          <p>The platform fee percentage is configured in system settings (<code className="text-[10px] bg-muted px-1 rounded">platform_fee_percent</code>). It's applied automatically on each delivered order via a database trigger that creates settlement records.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── SELLER SETTINGS ─── */}
      <DocSection title="5. Store Settings (/seller/settings)">
        <p>Comprehensive store configuration for sellers. The page adapts based on the seller's categories — service-type sellers see additional configuration sections.</p>

        <DocInfoCard title="Store Pause/Resume" icon="⏸️">
          <p>A prominent card at the top with green (open) or yellow (paused) styling. One-tap button to pause or resume the store. Pausing immediately hides the store from buyers.</p>
        </DocInfoCard>

        <DocInfoCard title="Store Images" icon="🖼️">
          <p>• <strong>Profile Image</strong> — Croppable square image for the store avatar.</p>
          <p>• <strong>Cover Image</strong> — Croppable wide image for the store banner.</p>
          <p>Both use the <code className="text-[10px] bg-muted px-1 rounded">CroppableImageUpload</code> component with guided cropping.</p>
        </DocInfoCard>

        <DocInfoCard title="Store Information" icon="🏪">
          <p>Editable fields: business name, description, UPI ID, COD acceptance toggle.</p>
        </DocInfoCard>

        <DocInfoCard title="Operating Hours" icon="⏰">
          <p>Start time and end time inputs, plus a 7-day checkbox row for operating days. Changes take effect immediately.</p>
        </DocInfoCard>

        <DocInfoCard title="Fulfillment Configuration" icon="🚚">
          <p>Radio group for fulfillment mode with the same 5 options as onboarding.</p>
          <p>Minimum order amount input.</p>
          <p>Daily order limit input to cap order volume.</p>
          <p>Delivery note text area displayed to buyers.</p>
        </DocInfoCard>

        <DocInfoCard title="Category Management" icon="🏷️">
          <p>Sellers can add or remove sub-categories from their store. The UI shows all available categories within the seller's primary group with toggle buttons.</p>
        </DocInfoCard>

        <DocInfoCard title="Cross-Community Sales" icon="🌐">
          <p><strong>Sell Beyond Community</strong> toggle — Makes the store visible to nearby societies.</p>
          <p><strong>Search Radius</strong> slider (1-15 km) — Controls how far the store is discoverable.</p>
        </DocInfoCard>

        <DocInfoCard title="Service Availability (Conditional)" icon="📅">
          <p>Only shown if the seller has service-type categories. The <code className="text-[10px] bg-muted px-1 rounded">ServiceAvailabilityConfig</code> component allows defining weekly schedules with day-of-week, start/end times, and break periods.</p>
        </DocInfoCard>

        <DocInfoCard title="Staff Management (Conditional)" icon="👥">
          <p>Only shown if any of the seller's categories have <code className="text-[10px] bg-muted px-1 rounded">supports_staff_assignment</code> enabled. The <code className="text-[10px] bg-muted px-1 rounded">ServiceStaffManager</code> component allows adding team members who can be assigned to appointments.</p>
        </DocInfoCard>

        <DocInfoCard title="License Upload (Conditional)" icon="📄">
          <p>Shown for category groups that require licensing (e.g., food requires FSSAI). The <code className="text-[10px] bg-muted px-1 rounded">LicenseUpload</code> component handles document upload with approval status tracking.</p>
        </DocInfoCard>

        <DocInfoCard title="Store Preview" icon="👁️">
          <p>A "Preview Store" link opens the seller's public storefront as buyers would see it.</p>
        </DocInfoCard>
      </DocSection>
    </div>
  );
}
