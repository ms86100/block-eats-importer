import { DocSection, DocHero, DocInfoCard, DocTable, DocFlowStep } from './DocPrimitives';

export function SellerToolsDocs() {
  return (
    <div className="space-y-2">
      <DocHero
        title="Seller Tools"
        description="This module covers everything a seller needs to manage their business — from onboarding and product management to order fulfillment, earnings tracking, and store configuration."
        badges={['Seller', '5 Pages']}
      />

      {/* ─── BECOME SELLER ─── */}
      <DocSection title="1. Become a Seller (/become-seller)">
        <p>The <strong>Become a Seller</strong> page is a unified 6-step onboarding wizard that guides residents through setting up their store and adding their first product.</p>

        <DocInfoCard title="Step-by-Step Flow" icon="📝">
          <DocFlowStep number={1} title="Category Selection" desc="Choose your primary category group (Food, Services, Goods, etc.) and specific categories. This determines which features and fields are available." />
          <DocFlowStep number={2} title="Store Setup" desc="Enter business name, description, profile image, and cover image. Set your UPI ID and COD preference." />
          <DocFlowStep number={3} title="Availability Schedule" desc="Define operating days (checkboxes for each day) and operating hours (start/end time). This controls when your store appears as 'Open' to buyers." />
          <DocFlowStep number={4} title="Fulfillment Settings" desc="Choose fulfillment mode: Self Pickup, Delivery, or Both. Set delivery radius, minimum order amount, and delivery notes." />
          <DocFlowStep number={5} title="First Product" desc="Add your first product/service listing. Fields adapt based on your category — food sellers see veg/non-veg toggle, service sellers see duration and location type." />
          <DocFlowStep number={6} title="Submit for Review" desc="Review all details and submit. Store status is set to 'pending' for admin approval. The seller can add more products while waiting for approval." />
        </DocInfoCard>

        <p className="text-xs text-primary font-medium mt-2">🔑 Key: Draft sellers can create products during onboarding, enabling a complete application in one flow.</p>
      </DocSection>

      {/* ─── SELLER DASHBOARD ─── */}
      <DocSection title="2. Seller Dashboard (/seller/dashboard)">
        <p>The <strong>Seller Dashboard</strong> is the command center for sellers, organized into four functional tabs: <strong>Orders</strong>, <strong>Schedule</strong>, <strong>Tools</strong>, and <strong>Stats</strong>.</p>

        <DocInfoCard title="Store Status Card" icon="🏪">
          <p>Shows current store status (Open/Closed/Paused) with a toggle to instantly pause or resume the store.</p>
          <p>Displays operating hours and next state change time.</p>
        </DocInfoCard>

        <DocInfoCard title="Visibility Checklist" icon="✅">
          <p>A guided checklist showing what's needed for the store to appear in search results: approved status, at least one active product, operating hours set, and payment method configured.</p>
        </DocInfoCard>

        <DocInfoCard title="Orders Tab" icon="📦">
          <p><strong>Dashboard Stats</strong> — Four metric cards: Today's Orders, Pending, Revenue Today, and Total Products.</p>
          <p><strong>Earnings Summary</strong> — Shows today's earnings, this week, this month, and pending settlements.</p>
          <p><strong>Quick Actions</strong> — Buttons for: Add Product, View Earnings, Store Settings, and Manage Coupons.</p>
          <p><strong>Order Filters</strong> — Filter orders by status with count badges (Pending, Accepted, Preparing, Ready, Completed, Cancelled).</p>
          <p><strong>Order Cards</strong> — Each order shows buyer info, items, total, time elapsed, and action buttons (Accept, Reject, Mark Ready, etc.). Status transitions follow the category-specific flow.</p>
          <p><strong>New Order Alert</strong> — When a new order arrives, a full-screen overlay with sound alert appears until the seller acknowledges it.</p>
        </DocInfoCard>

        <DocInfoCard title="Schedule Tab" icon="📅">
          <p><strong>Service Bookings Calendar</strong> — A calendar view showing all upcoming service appointments.</p>
          <p><strong>Booking Stats</strong> — Today's appointments, this week, completion rate.</p>
          <p><strong>Slot Calendar Manager</strong> — Visual slot management where sellers can block/unblock specific time slots.</p>
          <p><strong>Day Agenda</strong> — Detailed view of a selected day's appointments with times, buyer info, and status.</p>
        </DocInfoCard>

        <DocInfoCard title="Tools Tab" icon="🔧">
          <p><strong>Coupon Manager</strong> — Create, edit, and deactivate promotional coupons with discount type (percentage/flat), min order amount, usage limits, and validity period.</p>
          <p><strong>Demand Insights</strong> — Shows unmet demand in the society: what buyers are searching for but not finding, helping sellers identify new product opportunities.</p>
        </DocInfoCard>

        <DocInfoCard title="Stats Tab" icon="📊">
          <p><strong>Seller Analytics</strong> — Visual charts showing order trends, revenue over time, top products, peak hours, and customer demographics.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── SELLER PRODUCTS ─── */}
      <DocSection title="3. Product Management (/seller/products)">
        <p>The <strong>Seller Products Page</strong> is where sellers manage their entire product catalog.</p>

        <DocInfoCard title="Product List" icon="📋">
          <p>Shows all products with: image thumbnail, name, price, category, availability toggle, and approval status badge.</p>
          <p>Products can be filtered by: All, Active, Inactive, Pending Approval, Rejected.</p>
        </DocInfoCard>

        <DocInfoCard title="Add/Edit Product" icon="➕">
          <p>A comprehensive form with fields that adapt based on the product's category:</p>
          <p>• <strong>Common fields:</strong> Name, description, price, image upload, category selection.</p>
          <p>• <strong>Food categories:</strong> Veg/non-veg toggle, prep time, serving size.</p>
          <p>• <strong>Service categories:</strong> Duration, buffer time, location type, cancellation policy.</p>
          <p>• <strong>Physical products:</strong> Brand, unit type, stock quantity, MRP, discount.</p>
          <p>• <strong>Contact-only:</strong> Contact phone number field.</p>
          <p><strong>Specification Blocks</strong> — Dynamic attribute blocks (from attribute_block_library) that sellers can fill in for rich product details.</p>
        </DocInfoCard>

        <DocInfoCard title="Bulk Actions" icon="⚡">
          <p>Toggle availability for multiple products at once. Sellers can also duplicate existing products as templates.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── SELLER EARNINGS ─── */}
      <DocSection title="4. Earnings & Payouts (/seller/earnings)">
        <p>Detailed financial tracking for sellers with settlement management.</p>

        <DocInfoCard title="Earnings Overview" icon="💰">
          <p>Summary cards showing: Total Earnings, Pending Settlements, Platform Fees deducted, and Net Payout amount.</p>
          <p>Time period filters: Today, This Week, This Month, All Time.</p>
        </DocInfoCard>

        <DocInfoCard title="Settlement History" icon="📊">
          <p>Table of all settlements with: order reference, gross amount, platform fee percentage, net amount, and settlement status (pending/processed/paid).</p>
          <p>Settlements are automatically created when orders are marked as delivered, via a database trigger.</p>
        </DocInfoCard>

        <DocInfoCard title="Platform Fee" icon="💳">
          <p>The platform fee percentage is configured in system settings (platform_fee_percent). It's applied automatically on each delivered order.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── SELLER SETTINGS ─── */}
      <DocSection title="5. Store Settings (/seller/settings)">
        <p>Comprehensive store configuration for sellers.</p>

        <DocInfoCard title="Store Information" icon="🏪">
          <p>Edit business name, description, profile/cover images.</p>
        </DocInfoCard>

        <DocInfoCard title="Operating Hours" icon="⏰">
          <p>Set daily availability start/end times and select operating days. Changes take effect immediately and update the store's open/closed status for buyers.</p>
        </DocInfoCard>

        <DocInfoCard title="Fulfillment Configuration" icon="🚚">
          <p>Fulfillment mode (pickup/delivery/both), delivery radius, minimum order amount, delivery note displayed to buyers, and daily order limit.</p>
        </DocInfoCard>

        <DocInfoCard title="Payment Settings" icon="💳">
          <p>UPI ID, COD acceptance toggle, bank account details (for settlements), and Razorpay integration status.</p>
        </DocInfoCard>

        <DocInfoCard title="Food Compliance" icon="📄">
          <p>FSSAI number and license upload for food sellers. License status tracking (pending/approved/rejected) with admin review workflow.</p>
        </DocInfoCard>
      </DocSection>
    </div>
  );
}
