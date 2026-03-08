import { DocSection, DocHero, DocFlowStep, DocInfoCard, DocTable } from './DocPrimitives';

export function MarketplaceShoppingDocs() {
  return (
    <div className="space-y-2">
      <DocHero
        title="Marketplace & Shopping"
        description="This module covers the complete buying experience — from browsing a seller's store, adding items to cart, checking out with multiple payment options, tracking orders, managing subscriptions, to collective buying and the trust directory."
        badges={['Buyer', '8 Pages']}
      />

      {/* ─── SELLER DETAIL ─── */}
      <DocSection title="1. Seller Store Page (/seller/:id)">
        <p>The <strong>Seller Detail Page</strong> is the individual storefront for each seller. Buyers land here when tapping a seller name or "View Full Menu" from the home page.</p>

        <DocInfoCard title="Store Header" icon="🏪">
          <p>Displays the seller's <strong>cover image</strong> (or gradient fallback), <strong>business name</strong>, <strong>rating</strong> with star count, <strong>total reviews</strong>, and <strong>verification badge</strong>.</p>
          <p>A <strong>Favorite button</strong> (heart icon) allows buyers to save the store to their Favorites list.</p>
          <p>The <strong>store status</strong> is shown dynamically: "Open", "Closed" (with next open time), "Closed Today", or "Paused" — calculated in real-time from seller's availability schedule.</p>
        </DocInfoCard>

        <DocInfoCard title="Trust & Reputation" icon="🛡️">
          <p><strong>Seller Trust Badge</strong> — Shows the seller's trust tier (New, Rising, Trusted, Elite) based on completed orders and rating.</p>
          <p><strong>Seller Stats Card</strong> — Displays completed orders, unique customers, repeat customer percentage, and average response time.</p>
          <p><strong>Delivery Reliability Score</strong> — On-time delivery percentage, completion rate, and average delay.</p>
          <p><strong>Growth Tier</strong> — Visual badge showing seller progression with motivational labels.</p>
        </DocInfoCard>

        <DocInfoCard title="Product Listing" icon="📦">
          <p>Products are displayed in a scrollable grid. Each card shows the product image, name, price, veg/non-veg badge, and an action button.</p>
          <p>A <strong>search bar</strong> allows filtering products by name within the store.</p>
          <p>Products can be <strong>sorted</strong> by: Recommended, Price (Low to High), Price (High to Low), Newest.</p>
          <p>Tapping a product opens the <strong>Product Detail Sheet</strong> (bottom drawer) with full details, specifications, similar products, and action buttons.</p>
        </DocInfoCard>

        <DocInfoCard title="Tabs" icon="📑">
          <p><strong>Menu/Products Tab</strong> — The product grid described above.</p>
          <p><strong>Reviews Tab</strong> — Shows all buyer reviews with ratings, review text, and reviewer info. Reviews can be sorted by newest or highest rated.</p>
          <p><strong>Reputation Tab</strong> — Deep trust analytics including recommendation count, price stability history, and response time trends.</p>
        </DocInfoCard>

        <DocInfoCard title="Store Info Section" icon="ℹ️">
          <p>Shows operating hours, operating days, fulfillment mode (delivery/pickup/both), delivery note, FSSAI number (for food sellers), and the seller's society/location.</p>
          <p>A <strong>Report Seller</strong> option allows buyers to flag inappropriate content.</p>
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
          <p>• <strong>Book</strong> — Opens the Service Booking Flow.</p>
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
        <p>The <strong>Cart Page</strong> is the checkout hub where buyers review their selections, apply coupons, choose payment and fulfillment methods, and place orders.</p>

        <DocInfoCard title="Cart Items" icon="🛒">
          <p>Items are grouped by seller. Each group shows the seller's business name, trust badge, and delivery reliability score.</p>
          <p>Each item shows: product image, name, veg/non-veg badge, price, and quantity stepper (+/- buttons).</p>
          <p>A <strong>trash icon</strong> removes an item with a confirmation dialog.</p>
          <p><strong>First Order Badge</strong> — If this is the buyer's first order with a seller, a special badge is shown.</p>
        </DocInfoCard>

        <DocInfoCard title="Store Availability Check" icon="⏰">
          <p>The cart validates if each seller's store is currently open. If closed, a warning banner shows the next available time and items from that seller cannot be checked out.</p>
        </DocInfoCard>

        <DocInfoCard title="Coupon System" icon="🎫">
          <p>Buyers can enter a coupon code. The system validates: code existence, expiry, minimum order amount, per-user usage limit, and total usage limit. Valid coupons show the discount amount; invalid ones show specific error messages.</p>
        </DocInfoCard>

        <DocInfoCard title="Fulfillment Selection" icon="🚚">
          <p>Per seller group, buyers choose between: <strong>Self Pickup</strong> or <strong>Delivery</strong> (if seller supports it). Delivery options may include estimated delivery time.</p>
        </DocInfoCard>

        <DocInfoCard title="Payment Methods" icon="💳">
          <p>Buyers choose from available payment options:</p>
          <p>• <strong>Cash on Delivery (COD)</strong> — Always available if seller accepts it.</p>
          <p>• <strong>UPI</strong> — If seller has a UPI ID configured.</p>
          <p>• <strong>Online Payment (Razorpay)</strong> — If integrated; opens secure payment gateway.</p>
        </DocInfoCard>

        <DocInfoCard title="Order Notes" icon="📝">
          <p>A text area allows buyers to add special instructions per order (e.g., "Extra spicy", "Leave at door").</p>
        </DocInfoCard>

        <DocInfoCard title="Checkout Flow" icon="✅">
          <p>On "Place Order," the system creates multi-vendor orders atomically via a database function. Each seller gets a separate order with its own status tracking.</p>
          <p>An <strong>Order Progress Overlay</strong> shows real-time status: "Placing order…" → "Order placed!" with order IDs.</p>
          <p>Sellers receive instant push notifications for new orders.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── ORDERS ─── */}
      <DocSection title="5. Orders Page (/orders)">
        <p>The <strong>Orders Page</strong> shows the buyer's complete order history organized by status.</p>

        <DocInfoCard title="Tabs" icon="📊">
          <p><strong>Active Orders</strong> — Orders in non-terminal states (pending, accepted, preparing, ready, out_for_delivery, etc.).</p>
          <p><strong>Past Orders</strong> — Completed, delivered, or cancelled orders.</p>
          <p><strong>Appointments</strong> — Service bookings shown in a calendar view with upcoming appointment highlights.</p>
          <p><strong>Recurring</strong> — Active subscription-based recurring orders.</p>
        </DocInfoCard>

        <DocInfoCard title="Order Card" icon="📋">
          <p>Each order card shows: order date, seller name, item summary, total amount, and a colored status badge.</p>
          <p>For completed orders, a <strong>Reorder button</strong> allows one-tap re-ordering of the same items.</p>
          <p>Tapping an order navigates to the full Order Detail Page.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── ORDER DETAIL ─── */}
      <DocSection title="6. Order Detail Page (/orders/:id)">
        <p>The <strong>Order Detail Page</strong> provides complete information about a single order with real-time status updates.</p>

        <DocInfoCard title="Order Status Timeline" icon="📈">
          <p>A visual timeline showing every status change with timestamps. Status transitions follow category-specific flows defined in the database.</p>
        </DocInfoCard>

        <DocInfoCard title="Order Information" icon="📦">
          <p>Shows all order items with quantities and prices, payment method, fulfillment mode, order notes, coupon discount (if applied), and total amount.</p>
          <p>For delivery orders: rider name, phone, live tracking status, and delivery code (OTP for verification).</p>
        </DocInfoCard>

        <DocInfoCard title="Chat" icon="💬">
          <p>An in-order chat system allows buyer and seller to communicate about the specific order. Messages are stored in the <strong>chat_messages</strong> table with real-time delivery.</p>
        </DocInfoCard>

        <DocInfoCard title="Actions" icon="⚡">
          <p>Available actions depend on order status: Cancel Order (with refund tier info), Write Review (post-completion), Report Issue, and Reorder.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── SUBSCRIPTIONS ─── */}
      <DocSection title="7. My Subscriptions (/subscriptions)">
        <p>Manages recurring orders for products that support subscriptions (e.g., daily milk delivery).</p>
        <p>Shows active subscriptions with frequency, next delivery date, and pause/resume controls.</p>
        <p>Buyers can modify quantity, skip upcoming deliveries, or cancel the subscription entirely.</p>
      </DocSection>

      {/* ─── COLLECTIVE BUY ─── */}
      <DocSection title="8. Collective Buy (/collective-buy)">
        <p>The <strong>Collective Buy</strong> feature enables group purchasing within a society to achieve bulk pricing.</p>

        <DocInfoCard title="How It Works" icon="👥">
          <p>1. A resident creates a collective buy request specifying the product, minimum quantity, target price, and deadline.</p>
          <p>2. Other society members can join the request, committing their desired quantity.</p>
          <p>3. When the minimum quantity is reached, the request moves to "fulfilled" status.</p>
          <p>4. Progress is shown as a visual bar with current vs. target quantity.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── TRUST DIRECTORY ─── */}
      <DocSection title="9. Trust Directory (/trust-directory)">
        <p>A dedicated page showcasing all verified sellers ranked by trust metrics.</p>
        <p>Sellers are displayed with their trust tier badge, rating, completed orders, response time, and repeat customer percentage.</p>
        <p>Buyers can filter by category and sort by rating, trust score, or order count.</p>
        <p>Each seller card links to their full store page.</p>
      </DocSection>

      {/* ─── FAVORITES ─── */}
      <DocSection title="10. Favorites (/favorites)">
        <p>Shows all stores the buyer has saved by tapping the heart icon on seller pages.</p>
        <p>Each favorite card shows the seller's name, category, rating, and a quick link to their store.</p>
        <p>Buyers can remove favorites by tapping the heart icon again.</p>
      </DocSection>
    </div>
  );
}
