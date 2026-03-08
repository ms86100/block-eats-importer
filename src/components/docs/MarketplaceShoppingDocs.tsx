import { DocSection, DocHero, DocFlowStep, DocInfoCard, DocTable } from './DocPrimitives';

export function MarketplaceShoppingDocs() {
  return (
    <div className="space-y-2">
      <DocHero
        title="Marketplace & Shopping"
        description="This module covers the complete buying experience — from browsing a seller's store, adding items to cart, checking out with multiple payment options, tracking orders, managing subscriptions, to collective buying and the community trust directory."
        badges={['Buyer', '10 Pages']}
      />

      {/* ─── SELLER DETAIL ─── */}
      <DocSection title="1. Seller Store Page (/seller/:id)">
        <p>The <strong>Seller Detail Page</strong> is the individual storefront for each seller. Buyers land here when tapping a seller name or "View Full Menu" from the home page.</p>

        <DocInfoCard title="Store Header" icon="🏪">
          <p>Displays the seller's <strong>cover image</strong> (or gradient fallback), <strong>business name</strong>, <strong>rating</strong> with star count, <strong>total reviews</strong>, and <strong>verification badge</strong>.</p>
          <p>A <strong>Favorite button</strong> (heart icon) allows buyers to save the store to their Favorites list.</p>
          <p>A <strong>Report button</strong> (flag icon) opens a report dialog with options: Spam/Misleading, Suspected Fraud, Harassment, Inappropriate Content, or Other — with an optional description field.</p>
          <p>The <strong>store status</strong> is shown dynamically: "Open", "Closed" (with next open time), "Closed Today", or "Paused" — calculated in real-time from the seller's availability schedule using <code className="text-[10px] bg-muted px-1 rounded">computeStoreStatus()</code>.</p>
        </DocInfoCard>

        <DocInfoCard title="Trust & Reputation Signals" icon="🛡️">
          <p><strong>Seller Trust Badge</strong> — Shows the seller's trust tier (New, Rising, Trusted, Elite) based on completed orders and rating.</p>
          <p><strong>Activity Badge</strong> — "Active today" green dot if the seller was active within the last 24 hours.</p>
          <p><strong>Fulfillment Mode Badge</strong> — Shows 🏪 Self Pickup, 🚚 Delivery, or both depending on the seller's configuration.</p>
          <p><strong>Minimum Order Amount</strong> — Displayed if set by the seller.</p>
          <p><strong>Completed Orders Count</strong> — Shows total fulfilled orders.</p>
          <p><strong>Response Time</strong> — Average response time in minutes with a ⚡ badge.</p>
          <p><strong>Zero Cancellation Badge</strong> — Shown if the seller has completed more than 2 orders with 0% cancellation rate.</p>
          <p><strong>Delivery Reliability Score</strong> — On-time delivery percentage shown via a dedicated component.</p>
          <p><strong>Growth Tier</strong> — Visual badge showing seller progression.</p>
          <p><strong>Recommend Button</strong> — Buyers can recommend the seller to their community.</p>
        </DocInfoCard>

        <DocInfoCard title="Location & Distance" icon="📍">
          <p>Shows the seller's society name and, for cross-society sellers, the calculated distance in kilometers from the buyer's society using the Haversine formula.</p>
          <p>Operating hours are displayed with start/end times.</p>
          <p>Delivery notes are shown if configured by the seller.</p>
        </DocInfoCard>

        <DocInfoCard title="Product Listing (Menu Tab)" icon="📦">
          <p>Products are displayed in a scrollable grid. Each card shows the product image, name, price, veg/non-veg badge, and an action button.</p>
          <p>A <strong>search bar</strong> allows filtering products by name or description within the store.</p>
          <p><strong>Category pills</strong> allow filtering by product category (an "all" pill plus one per unique category).</p>
          <p>Tapping a product opens the <strong>Product Detail Sheet</strong> (bottom drawer) with full details, specifications, similar products, and action buttons.</p>
        </DocInfoCard>

        <DocInfoCard title="Reviews Tab" icon="⭐">
          <p>Shows all buyer reviews with ratings, review text, and reviewer info. Reviews are loaded via the <code className="text-[10px] bg-muted px-1 rounded">ReviewList</code> component.</p>
        </DocInfoCard>

        <DocInfoCard title="Reputation Tab" icon="📊">
          <p>Deep trust analytics via the <code className="text-[10px] bg-muted px-1 rounded">SellerReputationTab</code> component, showing recommendation count, price stability history, delivery reliability, and response time trends.</p>
        </DocInfoCard>

        <DocInfoCard title="Store Info Section" icon="ℹ️">
          <p>Shows operating hours, operating days, fulfillment mode, delivery note, FSSAI number (for food sellers), and the seller's society/location.</p>
          <p>A <strong>Report Seller</strong> dialog allows buyers to flag inappropriate content with categorized report types (spam, fraud, harassment, inappropriate, other).</p>
        </DocInfoCard>

        <DocInfoCard title="Floating Cart Bar" icon="🛒">
          <p>When items from this seller are in the cart, a floating bar appears at the bottom showing the count and total amount from this specific seller, with a "View Cart" button.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── PRODUCT DETAIL ─── */}
      <DocSection title="2. Product Detail Sheet">
        <p>The <strong>Product Detail Sheet</strong> is a bottom drawer that opens when any product card is tapped anywhere in the app.</p>

        <DocInfoCard title="Product Information" icon="🔍">
          <p>Full-width product image with close button overlay. Below: veg/non-veg badge, product name, category label, price (or "Contact for price" for contact-only items).</p>
          <p><strong>Price Stability Badge</strong> — Shows how long the price has been stable (e.g., "Price stable for 14 days").</p>
          <p><strong>Refund Tier Badge</strong> — Indicates the refund policy tier based on price (Instant, 24h Review, or Dispute Mediation).</p>
        </DocInfoCard>

        <DocInfoCard title="Collapsible Details" icon="📋">
          <p>Expandable section showing: fulfillment mode, delivery note, prep time, product description, and <strong>specification blocks</strong> (dynamic attribute blocks like dimensions, materials, warranty info).</p>
        </DocInfoCard>

        <DocInfoCard title="Seller Info" icon="👤">
          <p>Seller name, rating, review count, society name or distance, and a link to the full store page.</p>
          <p><strong>Trust Snapshot</strong> — Quick trust metrics: completed orders, repeat customer rate, response time.</p>
        </DocInfoCard>

        <DocInfoCard title="Similar Products" icon="🔄">
          <p>A horizontal scrollable row of up to 6 similar products from the same category. Tapping one replaces the current sheet content.</p>
        </DocInfoCard>

        <DocInfoCard title="Action Buttons (Dynamic)" icon="⚡">
          <p>The primary action button changes based on the product's <strong>action_type</strong> (derived from category configuration):</p>
          <p>• <strong>Add to Cart</strong> — Adds item; shows quantity stepper for adjustments.</p>
          <p>• <strong>Buy Now</strong> — Adds to cart and navigates directly to the cart page.</p>
          <p>• <strong>Book</strong> — Opens the Service Booking Flow (see Service Booking module).</p>
          <p>• <strong>Contact Seller</strong> — Opens the Contact Seller Hub with Call, Message, and Feedback options.</p>
          <p>• <strong>Request Quote / Request Service</strong> — Opens an enquiry form.</p>
          <p>When the store is closed, the action button is replaced with a "Store Closed" indicator showing when it reopens.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── CONTACT SELLER ─── */}
      <DocSection title="3. Contact Seller Hub">
        <p>When a product's action type is "Contact Seller," tapping the action button opens a multi-option interaction modal.</p>

        <DocInfoCard title="Seller Info Card" icon="📇">
          <p>Shows seller name, avatar placeholder, and phone number (if available).</p>
        </DocInfoCard>

        <DocInfoCard title="Call Now" icon="📞">
          <p>Initiates a phone call to the seller. The interaction is <strong>logged to the database</strong> (seller_contact_interactions table) for analytics.</p>
          <p>If no phone number is available, the button is disabled with "Phone not available" text.</p>
          <p>After the call, a <strong>Post-Call Feedback Modal</strong> appears after 5 seconds, prompting the buyer to rate the call outcome.</p>
        </DocInfoCard>

        <DocInfoCard title="Message" icon="💬">
          <p>Opens a <strong>real-time chat drawer</strong> between buyer and seller. Messages are stored in the database and delivered via push notifications.</p>
          <p>The chat shows product context (image, name, price) at the top, message bubbles with timestamps, and a text input for composing messages.</p>
          <p>When a buyer sends a message, the seller receives both an <strong>in-app notification</strong> and a <strong>push notification</strong>.</p>
        </DocInfoCard>

        <DocInfoCard title="Post-Call Feedback" icon="📝">
          <p>A quick feedback modal with radio button options:</p>
          <p>• Call connected and discussion happened</p>
          <p>• Call connected but no agreement</p>
          <p>• Seller did not answer the call</p>
          <p>• Number unreachable / incorrect</p>
          <p>• Agreement reached / service confirmed</p>
          <p>• Need more info / seller will call back</p>
          <p>Feedback is stored in the <strong>call_feedback</strong> table and contributes to seller quality metrics and trust scores.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── CART ─── */}
      <DocSection title="4. Cart Page (/cart)">
        <p>The <strong>Cart Page</strong> (titled "Checkout" in the UI) is where buyers review their selections, apply coupons, choose payment and fulfillment methods, and place orders.</p>

        <DocInfoCard title="Cart Items — Grouped by Seller" icon="🛒">
          <p>Items are grouped by seller. Each group header shows: a numbered circle, seller business name, item count, and trust signals row (Seller Trust Badge + Delivery Reliability Score).</p>
          <p>Each item shows: product image, veg/non-veg badge, name, unit price × quantity, total, and quantity stepper (+/- buttons).</p>
          <p>A <strong>trash icon</strong> removes an item with an undo toast (4-second window to undo).</p>
          <p><strong>First Order Badge</strong> — If this is the buyer's first order with a seller, a "First Order Protected" badge appears with instant refund guarantee messaging.</p>
          <p><strong>Cross-Society Indicator</strong> — If a seller is from a different community, a "Seller from another community" label appears.</p>
        </DocInfoCard>

        <DocInfoCard title="Preparation Time & Delivery Window" icon="⏰">
          <p>If items have preparation time, a banner shows "Ready in ~X minutes" and an estimated delivery window (e.g., "Today, 2:30 PM – 3:00 PM").</p>
        </DocInfoCard>

        <DocInfoCard title="Store Availability Check" icon="🔒">
          <p>The cart validates if each seller's store is currently open. Items from closed stores show availability warnings.</p>
          <p>Minimum order amount is enforced per seller — a warning shows how much more is needed.</p>
        </DocInfoCard>

        <DocInfoCard title="Multi-Seller Cart Handling" icon="🏪">
          <p>When items are from multiple sellers, an info banner explains that the order will be split into separate deliveries — one per seller.</p>
          <p>Coupons are disabled for multi-seller carts (only available for single-seller orders).</p>
        </DocInfoCard>

        <DocInfoCard title="Urgent Order Warning" icon="⚡">
          <p>If any item is marked as urgent by the seller, a warning shows: "Time-sensitive order — Seller must respond within X min or auto-cancelled."</p>
        </DocInfoCard>

        <DocInfoCard title="Coupon System" icon="🎫">
          <p>Buyers can enter a coupon code (single-seller carts only). The system validates: code existence, active status, expiry date, minimum order amount, per-user usage limit, and total usage limit. Valid coupons show the discount amount; invalid ones show specific error messages.</p>
        </DocInfoCard>

        <DocInfoCard title="Fulfillment Selection" icon="🚚">
          <p>Buyers choose between: <strong>Self Pickup</strong> or <strong>Delivery</strong>. The selector is constrained by the seller's fulfillment mode — if a seller only supports pickup, delivery is disabled.</p>
          <p>Delivery fee and free delivery threshold are displayed. If the order meets the free delivery threshold, delivery is shown as "FREE".</p>
          <p>Fulfillment conflict warnings appear if some sellers don't support the chosen mode.</p>
        </DocInfoCard>

        <DocInfoCard title="Payment Methods" icon="💳">
          <p>Buyers choose from available payment options:</p>
          <p>• <strong>Cash on Delivery (COD)</strong> — Available if any seller accepts COD.</p>
          <p>• <strong>UPI</strong> — Available if any seller has a UPI ID configured.</p>
          <p>• <strong>Online Payment (Razorpay)</strong> — If integrated; opens secure payment gateway.</p>
        </DocInfoCard>

        <DocInfoCard title="Order Notes" icon="📝">
          <p>A text area labeled "Instructions" allows buyers to add special requests (e.g., "Less spicy", "No onions").</p>
        </DocInfoCard>

        <DocInfoCard title="Price Breakdown" icon="💰">
          <p>A detailed bill showing: per-seller subtotals, coupon discount (if applied), delivery fee (or "FREE"/"Self Pickup"), platform fee (percentage or ₹0), and the final "To Pay" total.</p>
          <p>A <strong>Refund Tier Badge</strong> shows the applicable refund policy based on the total amount.</p>
          <p><strong>Value reinforcement:</strong> Total savings from coupons and free delivery are highlighted.</p>
        </DocInfoCard>

        <DocInfoCard title="Checkout Flow" icon="✅">
          <p>On "Place Order," the system creates multi-vendor orders atomically via a database function. Each seller gets a separate order with its own status tracking.</p>
          <p>An <strong>Order Progress Overlay</strong> shows real-time status: "Placing order…" → "Order placed!" with order IDs and links to view each order.</p>
          <p>Sellers receive instant push notifications for new orders.</p>
          <p>A <strong>Clear All</strong> button with confirmation dialog allows removing all items from the cart.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── ORDERS ─── */}
      <DocSection title="5. Orders Page (/orders)">
        <p>The <strong>Orders Page</strong> shows the buyer's complete order history. For users who are also sellers, it shows received orders too.</p>

        <DocInfoCard title="Buyer/Seller Tabs" icon="📊">
          <p>If the user is a seller, two tabs appear: <strong>My Orders</strong> (buying) and <strong>Received</strong> (selling). Non-sellers see a single view.</p>
          <p>The selling tab includes a <strong>Seller Switcher</strong> for users with multiple seller profiles.</p>
        </DocInfoCard>

        <DocInfoCard title="Buyer View Features" icon="📋">
          <p><strong>Buyer Bookings Calendar</strong> — A calendar view of upcoming service appointments at the top.</p>
          <p><strong>Recurring Bookings List</strong> — Active recurring/subscription-based bookings.</p>
          <p><strong>Order List</strong> — Paginated (20 per page) list of all orders with infinite scroll "Load More".</p>
        </DocInfoCard>

        <DocInfoCard title="Order Card" icon="📄">
          <p>Each order card shows: seller thumbnail, seller/buyer name, status badge (colored), delivery badge (if delivery order), date, item count, total amount, and a chevron for navigation.</p>
          <p>Completed/delivered orders show a green checkmark and a <strong>Reorder button</strong> that re-adds all items to cart with one tap.</p>
          <p>Seller view additionally shows buyer's block and flat number for delivery context.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── ORDER DETAIL ─── */}
      <DocSection title="6. Order Detail Page (/orders/:id)">
        <p>The <strong>Order Detail Page</strong> provides complete information about a single order with real-time status updates.</p>

        <DocInfoCard title="Header" icon="📎">
          <p>Shows "Order Summary" title with a copyable short order ID (first 8 characters). A chat button appears with unread message count badge if messaging is available.</p>
        </DocInfoCard>

        <DocInfoCard title="Order Status Timeline" icon="📈">
          <p>A visual timeline showing every status change with timestamps. Status transitions follow category-specific flows defined in the <code className="text-[10px] bg-muted px-1 rounded">category_status_flows</code> table.</p>
          <p>For urgent orders, a countdown timer is displayed showing remaining response time.</p>
        </DocInfoCard>

        <DocInfoCard title="Service Booking Details" icon="📅">
          <p>For service orders: booking date, time slot, location type, preparation instructions, add-on summary, and session feedback prompt.</p>
          <p>Calendar export button allows adding the appointment to the device calendar.</p>
          <p>Buyer can cancel bookings if permitted by the service's cancellation policy.</p>
        </DocInfoCard>

        <DocInfoCard title="Delivery Tracking" icon="🚚">
          <p>For delivery orders: <strong>Delivery Status Card</strong> showing rider name, phone, and current delivery status.</p>
          <p><strong>Live Delivery Tracker</strong> — Real-time map tracking of the delivery rider's location.</p>
          <p>Delivery code (OTP) for verification at handoff.</p>
        </DocInfoCard>

        <DocInfoCard title="Order Items" icon="📦">
          <p>Each item displayed via <code className="text-[10px] bg-muted px-1 rounded">OrderItemCard</code> with image, name, quantity, price, and per-item status (if applicable).</p>
          <p>Payment method badge and total amount breakdown.</p>
        </DocInfoCard>

        <DocInfoCard title="Chat" icon="💬">
          <p>An in-order chat system (<code className="text-[10px] bg-muted px-1 rounded">OrderChat</code>) allows buyer and seller to communicate about the specific order. Messages are stored in the <strong>chat_messages</strong> table with real-time delivery via database subscriptions.</p>
        </DocInfoCard>

        <DocInfoCard title="Actions" icon="⚡">
          <p>Available actions depend on order status and user role:</p>
          <p>• <strong>Cancel Order</strong> — With refund tier information and cancellation dialog.</p>
          <p>• <strong>Write Review</strong> — Post-completion review form with rating and text.</p>
          <p>• <strong>Reorder</strong> — Re-add all items to cart.</p>
          <p>• <strong>Seller actions</strong> — Accept, Reject (with reason dialog), Mark Preparing, Mark Ready, Mark Completed, based on status flow.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── SUBSCRIPTIONS ─── */}
      <DocSection title="7. My Subscriptions (/subscriptions)">
        <p>Manages recurring orders for products that support subscriptions (e.g., daily milk delivery).</p>

        <DocInfoCard title="Subscription Card" icon="🔄">
          <p>Each subscription shows: product image, product name, seller name, status badge (active/paused/cancelled), quantity, frequency (daily/weekly/monthly), calculated cost per period, and next delivery date.</p>
        </DocInfoCard>

        <DocInfoCard title="Controls" icon="⚙️">
          <p>• <strong>Pause</strong> — Temporarily suspend an active subscription.</p>
          <p>• <strong>Resume</strong> — Reactivate a paused subscription.</p>
          <p>• <strong>Cancel</strong> — Permanently cancel with a confirmation dialog ("Cancel Subscription?" with "Keep Subscription" / "Yes, Cancel" options).</p>
        </DocInfoCard>

        <DocInfoCard title="Empty State" icon="📭">
          <p>Shows a refresh icon with "No active subscriptions" and a note to subscribe from favorite sellers.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── COLLECTIVE BUY ─── */}
      <DocSection title="8. Collective Buy (/collective-buy)">
        <p>The <strong>Collective Buy</strong> feature enables group purchasing within a society to achieve bulk pricing.</p>

        <DocInfoCard title="How It Works" icon="👥">
          <DocFlowStep number={1} title="Create Request" desc="A resident creates a group buy request specifying the product name, description, minimum quantity, target price, unit, optional image, and deadline. Uses the CreateGroupBuySheet bottom drawer." />
          <DocFlowStep number={2} title="Join" desc="Other society members browse active requests and join by committing their desired quantity. The system checks for duplicate participation." />
          <DocFlowStep number={3} title="Progress Tracking" desc="A visual progress bar shows current vs. target quantity with percentage. Status badges show 'active' or 'fulfilled'." />
          <DocFlowStep number={4} title="Leave" desc="Participants can leave a group buy before it's fulfilled." />
        </DocInfoCard>

        <DocInfoCard title="Request Card" icon="📦">
          <p>Each card shows: product image (if uploaded), product name, creator's name, current/minimum quantity progress bar, target price, time remaining (using formatDistanceToNowStrict), and Join/Leave button.</p>
          <p>Fulfilled requests show a "Fulfilled" badge and are read-only.</p>
        </DocInfoCard>

        <DocInfoCard title="Labels" icon="🏷️">
          <p>The page title and section headers use marketplace labels from the admin-configured <code className="text-[10px] bg-muted px-1 rounded">marketplace_labels</code> system, making text customizable without code changes.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── TRUST DIRECTORY ─── */}
      <DocSection title="9. Community Trust Directory (/trust-directory)">
        <p>The <strong>Trust Directory</strong> is a community skill-sharing and endorsement system — not a seller directory. It showcases residents' skills and enables peer endorsement.</p>

        <DocInfoCard title="Skill Listings" icon="🏆">
          <p>Residents list their skills (e.g., plumbing, tutoring, photography) with a description and availability note.</p>
          <p>Each listing shows: skill name, resident's name, block and flat, avatar, trust score, and endorsement count.</p>
          <p>A <strong>search bar</strong> allows filtering skills by name.</p>
        </DocInfoCard>

        <DocInfoCard title="Endorsement System" icon="👍">
          <p>Any resident can endorse another's skill. Endorsements increment the trust score and endorsement count.</p>
          <p>Users can toggle endorsement on/off (endorse/un-endorse). You cannot endorse your own skills.</p>
        </DocInfoCard>

        <DocInfoCard title="Add Your Skill" icon="➕">
          <p>A bottom sheet form with fields: Skill Name (required), Description (optional), and Availability (optional).</p>
          <p>Skills are scoped to the user's society and appear in the directory immediately after creation.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── FAVORITES ─── */}
      <DocSection title="10. Favorites (/favorites)">
        <p>Shows all stores the buyer has saved by tapping the heart icon on seller pages.</p>

        <DocInfoCard title="Favorites Grid" icon="❤️">
          <p>A 3-column grid of seller cards, each showing: seller profile image (or Store icon placeholder), a heart button overlay for un-favoriting, the business name, and the owner's name.</p>
          <p>Header shows "Favourites" with a count of saved stores.</p>
          <p>Only approved and available sellers are displayed.</p>
        </DocInfoCard>

        <DocInfoCard title="Interactions" icon="🔄">
          <p>Tapping a card navigates to the seller's full store page.</p>
          <p>Tapping the heart icon removes the seller from favorites instantly (optimistic UI update).</p>
          <p>Empty state shows a heart icon with "No favourites yet" and a link to browse stores.</p>
        </DocInfoCard>
      </DocSection>
    </div>
  );
}
