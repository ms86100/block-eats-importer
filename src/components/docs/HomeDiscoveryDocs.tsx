import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Search, Home, Heart, ShoppingBag, Sparkles, TrendingUp, RefreshCw, Calendar, Clock, MessageCircle, Trophy, Store, MapPin, Globe, Flame, Building2, SlidersHorizontal, Leaf, Star, Users } from 'lucide-react';

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

export function HomeDiscoveryDocs() {
  return (
    <div className="space-y-2">
      {/* Hero */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-primary/10 rounded-2xl p-5 mb-4">
        <h2 className="text-lg font-bold text-foreground mb-1">Module 2 — Home & Discovery</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          This module covers the main dashboard that users see after logging in, the product search system,
          category browsing, filtered category views, and the favorites/saved stores feature.
          Together, these pages form the primary discovery and navigation experience of the platform.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">5 pages</span>
          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">All Users</span>
        </div>
      </div>

      {/* ─── APP LAYOUT ─── */}
      <Sub title="Application Shell (AppLayout)">
        <p>Every page in this module is wrapped in a common application shell that provides consistent navigation and functionality:</p>
        <p>• <strong>Header Bar</strong> — Shows the society/location selector, a cart icon with item count, and an optional back button. The header can be hidden on pages that provide their own (like Search).</p>
        <p>• <strong>Notification Banner</strong> — A persistent prompt asking users to enable push notifications if they haven't already.</p>
        <p>• <strong>Floating Cart Bar</strong> — A bottom floating bar that appears when there are items in the cart, showing the total and a quick link to the cart page.</p>
        <p>• <strong>Bottom Navigation</strong> — The main navigation with tabs for Home, Categories, Search, Orders, and Profile.</p>
      </Sub>

      {/* ─── HOMEPAGE ─── */}
      <Sub title="1. Home Page (/)">
        <p>The <strong>Home Page</strong> is the central dashboard of the application. It's the first screen users see after logging in and being approved. It brings together marketplace discovery, quick actions, community activity, and society management into one scrollable view.</p>
        
        <p><strong>Adaptive behavior:</strong> The page content changes based on the user's status:</p>
        <p>• If it's the user's <strong>first login</strong>, they see the Onboarding Walkthrough (covered in Module 1).</p>
        <p>• If they're <strong>not yet approved</strong>, they see the Verification Pending screen (Module 1).</p>
        <p>• If their <strong>profile is still loading</strong>, animated skeleton placeholders are shown.</p>
        <p>• Once fully loaded and approved, the complete homepage renders with all sections below.</p>

        <div className="mt-4 space-y-4">
          <div className="p-3 bg-card border border-border rounded-xl">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">⚠️ Incomplete Profile Banner</p>
            <p>If the user hasn't filled in their flat/unit number, a warning banner appears at the top: "Complete your profile to enable delivery orders." Tapping "Update" takes them to the Profile page. This ensures delivery-dependent features work correctly.</p>
          </div>

          <div className="p-3 bg-card border border-border rounded-xl">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Sparkles size={12} className="text-primary" /> Popular Search Suggestions
            </p>
            <p>A row of horizontal pills showing what other people in the user's society are searching for. Each pill displays the search term and how many times it was searched (e.g., "Biryani 12×"). Tapping any pill opens the Search page with that term pre-filled. This helps users discover popular items quickly.</p>
          </div>

          <div className="p-3 bg-card border border-border rounded-xl">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Calendar size={12} className="text-primary" /> Upcoming Appointment Banner
            </p>
            <p>If the user has an upcoming service booking (appointment), a card appears showing the service name, date, time, and seller. When the appointment is less than 2 hours away, the card gets a highlighted urgent styling. Tapping it opens the order detail page. The banner auto-refreshes when booking changes occur.</p>
          </div>

          <div className="p-3 bg-card border border-border rounded-xl">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <RefreshCw size={12} className="text-primary" /> Quick Reorder
            </p>
            <p>Shows the user's most recent completed order with the seller name, item count, total amount, and how long ago it was placed. One tap re-adds all items to the cart.</p>
            <p className="mt-1"><strong>Smart handling:</strong> If the cart already has items, a confirmation dialog asks whether to replace the cart. The system also checks if each product is still available — unavailable items are skipped with an informational message.</p>
          </div>

          <div className="p-3 bg-card border border-border rounded-xl">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <ShoppingBag size={12} className="text-primary" /> Buy Again Row
            </p>
            <p>A horizontal scrollable row of products the user has purchased before, sorted by frequency. Each compact card shows the product image, name, price, and how many times it's been ordered. A single tap adds it to the cart with haptic feedback. Products already in the cart show a checkmark instead of the plus icon.</p>
          </div>

          <div className="p-3 bg-card border border-border rounded-xl">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
              <Building2 size={12} className="text-primary" /> Society Quick Links
            </p>
            <p>A horizontal row of cards providing quick access to society management features: Visitors, Parking, Finances, Bulletin, Maintenance, and Disputes. Each link is <strong>feature-gated</strong> — it only appears if the corresponding feature is enabled for the user's society. A "View all" link opens the full society dashboard.</p>
          </div>
        </div>
      </Sub>

      {/* ─── MARKETPLACE SECTION ─── */}
      <Sub title="1.1 Marketplace Discovery (on Home Page)">
        <p>The largest section of the homepage is dedicated to marketplace discovery. It's designed to help users find products and services through multiple pathways:</p>
        
        <p><strong>Category Group Tabs:</strong> At the top of the marketplace section, horizontal tabs let users filter by broad category groups (e.g., "Food & Drinks", "Services", "Home & Living"). An "All" tab shows everything. These tabs only display groups that actually have products — empty groups are hidden.</p>
        
        <p><strong>Category Image Grid:</strong> Below the tabs, each active category group is displayed as a grid of visual cards. Each card shows a collage of up to 4 product images from that category, the category name overlaid on a gradient, an item count badge, a bestseller star (if applicable), and metadata showing seller count and starting price. Tapping a card navigates to the filtered category view.</p>
        
        <p><strong>Featured Banners:</strong> A promotional banner carousel that auto-rotates. Banners are admin-managed and can be society-specific or global. The system supports 5 visual templates: image-only, text overlay, split layout, gradient CTA, and minimal text. New banners appear in real-time without page refresh thanks to a live database subscription. The carousel pauses when the user is interacting with it and resumes after 8 seconds of inactivity.</p>
        
        <p><strong>Trending Products:</strong> A "Trending in your society" row showing products with high recent order velocity. This helps surface what's popular right now. Only appears when at least 3 products qualify.</p>
        
        <p><strong>Popular Near You:</strong> Products sorted by total completed orders. The number of items shown and the minimum threshold are configurable through marketplace labels in the admin panel.</p>
        
        <p><strong>New This Week:</strong> Recently added products (within the last 7 days by default, configurable). These are deduplicated against the "Popular" section so users don't see the same products twice.</p>
        
        <p><strong>Category Product Listings:</strong> All products grouped by their category, each displayed as a horizontal scroll row. Each category section has a header with the category icon, name, and a "see all" link. Up to 8 products are shown per category.</p>
        
        <p><strong>Shop by Store:</strong> A seller-centric discovery section. It first shows sellers "In Your Society" organized by category groups, with activity indicators (green = active now, yellow = recently active). If the user has "Browse Beyond" enabled, a "Nearby Societies" section appears showing sellers from neighboring communities, organized by distance bands that are collapsible.</p>
        
        <p><strong>Society Leaderboard:</strong> A gamified section at the bottom showing the top 5 sellers (by completed orders) with medal emojis and the top 5 most-ordered products with rank badges. This creates healthy competition and helps buyers find proven sellers.</p>
        
        <p><strong>Empty state:</strong> When no products are available yet, an animated illustration appears with the message "Your marketplace is getting ready!" and a note that new listings appear automatically.</p>
      </Sub>

      {/* ─── COMMUNITY TEASER ─── */}
      <Sub title="1.2 Community Teaser (on Home Page)">
        <p>At the bottom of the homepage, a <strong>Community section</strong> provides a preview of what's happening in the society's bulletin board.</p>
        
        <p><strong>Help Requests:</strong> If there are open help requests from neighbors, a highlighted warning card shows the count (e.g., "3 neighbors need help") with a prompt to assist.</p>
        
        <p><strong>Recent Posts:</strong> The two most recent bulletin posts are shown as compact cards with the post title, comment count, and vote count.</p>
        
        <p><strong>Empty state:</strong> If there are no posts or help requests yet, a friendly card invites the user to "Be the first to post!" and links to the community page.</p>
      </Sub>

      {/* ─── SEARCH PAGE ─── */}
      <Sub title="2. Search Page (/search)">
        <p>The <strong>Search Page</strong> provides comprehensive product search with real-time filtering, sorting, and cross-society discovery.</p>
        
        <p><strong>Search Input:</strong> An auto-focused search bar at the top with animated placeholder text that cycles through example searches. As the user types, results update in real-time. A clear button (X) appears when text is entered.</p>
        
        <p><strong>Filter Bar:</strong> A horizontal scrollable row below the search with quick-access filter buttons:</p>
        <p>• <strong>Filters</strong> — Opens a bottom sheet with advanced options (see below). Shows a badge with active filter count.</p>
        <p>• <strong>Veg / Non-Veg</strong> — Toggle buttons with color-coded indicators (green for veg, red for non-veg).</p>
        <p>• <strong>Sort buttons</strong> — Top Rated, Price Low to High, Price High to Low.</p>
        
        <p><strong>Advanced Filters (Bottom Sheet):</strong> Opens from the Filters button and includes:</p>
        <p>• <strong>Sort By</strong> — Top Rated, Newest, Price Low to High, Price High to Low.</p>
        <p>• <strong>Dietary Preference</strong> — Veg Only or Non-Veg toggle.</p>
        <p>• <strong>Minimum Rating</strong> — Any, 3+, 3.5+, 4+, 4.5+ toggle buttons.</p>
        <p>• <strong>Price Range</strong> — Dual-handle slider from ₹0 to the maximum configured price, with ₹50 steps.</p>
        <p>A "Reset all" button clears everything, and "Apply Filters" confirms the selection.</p>
        
        <p><strong>Filter Presets:</strong> Quick-apply preset pills: "Veg Only", "Under budget" (configurable threshold), "Top Rated", and "Featured".</p>
        
        <p><strong>Browse Beyond Society:</strong> A toggle that expands search to include products from nearby societies. When enabled, a radius slider appears (1–10 km) to control how far to search.</p>
        
        <p><strong>Community Suggestions:</strong> When no search is active, the page shows popular search terms from the user's society as clickable pills. Tapping one fills the search bar.</p>
        
        <p><strong>Category Bubbles:</strong> A horizontal scroll of category filter bubbles showing only categories present in the results. Tapping one filters to just that category.</p>
        
        <p><strong>Results:</strong> Products are displayed in a grid grouped by category, each with a header showing the category icon, name, item count, and starting price. Tapping any product opens a detail sheet with full information, add-to-cart, and related products from the same seller.</p>
        
        <p><strong>Empty states:</strong> If no results are found, users see a suggestion to try different keywords or enable the "Browse Beyond" toggle to search nearby societies. If no products exist at all, a friendly marketplace-coming-soon message is shown.</p>
      </Sub>

      {/* ─── CATEGORIES PAGE ─── */}
      <Sub title="3. Categories Page (/categories)">
        <p>The <strong>Categories Page</strong> lets users browse all available product and service categories in an organized, visual layout.</p>
        
        <p><strong>Header:</strong> A title "Explore Categories" with a subtitle "Find what you love" and a decorative gradient line. Below that, a search bar (non-functional — it links to the Search page) with a rotating placeholder text showing example searches.</p>
        
        <p><strong>Parent Group Filter:</strong> A horizontal row of filter pills at the top. "All" is selected by default. Tapping a group name filters the page and smooth-scrolls to that section. Active groups show a highlighted primary-colored style.</p>
        
        <p><strong>Category Grid:</strong> Categories are organized under their parent groups. Each group section has a badge-style header with the group icon, name, and category count. Categories are displayed as visual cards in a 2-column grid (3 on larger screens) with the same image collage treatment as the homepage — showing product images, item counts, bestseller indicators, seller counts, and starting prices. Each card links to the filtered category view.</p>
        
        <p><strong>Data enrichment:</strong> If the user has "Browse Beyond Community" enabled in their profile, categories from nearby societies are also included in the active category set, expanding the visible options.</p>
        
        <p><strong>Empty state:</strong> An animated illustration with "Stay tuned — we're growing!" and a note that new sellers are joining.</p>
      </Sub>

      {/* ─── CATEGORY GROUP PAGE ─── */}
      <Sub title="4. Category Group Page (/category/:category)">
        <p>When users tap "See all" on a category group or navigate from the categories page, they reach this filtered view showing all products within a specific parent group.</p>
        
        <p><strong>Header:</strong> A back button, the group title with its icon, a search bar for filtering within the group, and sub-category pills for further refinement. The URL updates with a <code className="text-[10px] bg-muted px-1 rounded">?sub=</code> query parameter as users switch sub-categories.</p>
        
        <p><strong>Sort Bar:</strong> Below the header, a horizontal row of sort options: Relevance, Price Low to High, Price High to Low, and Popular.</p>
        
        <p><strong>Product Grid:</strong> A 2-column grid showing all products in the group (or filtered sub-category), with an item count displayed above. Tapping any product opens the detail sheet.</p>
        
        <p><strong>Top Sellers Section:</strong> When products exist and no search query is active, a "Top Sellers" section appears at the bottom showing up to 5 relevant sellers with their ratings and details. These are sellers who have products in the current category group, filtered to the user's society.</p>
        
        <p><strong>Not found:</strong> If the category group doesn't exist, a simple "Category not found" message with a "Go Home" button is shown.</p>
      </Sub>

      {/* ─── FAVORITES PAGE ─── */}
      <Sub title="5. Favorites Page (/favorites)">
        <p>The <strong>Favorites Page</strong> shows all sellers (stores) that the user has saved by tapping the heart icon.</p>
        
        <p><strong>Header:</strong> A back button, "Favourites" title, and a count of saved stores.</p>
        
        <p><strong>Grid Layout:</strong> A 3-column grid of seller cards, each showing the seller's profile image (or a Store icon placeholder), a heart button overlay in the top-right corner, the business name, and the owner's name.</p>
        
        <p><strong>Unfavoriting:</strong> Tapping the heart icon on any card immediately removes it from the favorites list with a smooth transition. The change is persisted to the database.</p>
        
        <p><strong>Navigation:</strong> Tapping a seller card navigates to the seller's detail page.</p>
        
        <p><strong>Data filtering:</strong> Only sellers who are still approved and available are shown. If a seller gets suspended or deactivated, they're automatically hidden from favorites.</p>
        
        <p><strong>Empty state:</strong> A heart icon illustration with "No favourites yet" and guidance to "Tap the heart icon on any store to save it here" with a link to browse stores.</p>
      </Sub>

      {/* ─── CROSS-CUTTING ─── */}
      <Sub title="Configuration & System Behavior">
        <p>Many labels, thresholds, and behaviors across this module are driven by admin-configurable settings:</p>
        
        <p><strong>Marketplace Labels:</strong> Labels like "Reorder from," discovery section titles, and thresholds for "new this week" days and minimum product counts are stored in the marketplace labels table and managed from the Admin panel.</p>
        
        <p><strong>System Settings:</strong> Currency symbol, maximum price filter, and budget filter threshold are global system settings that affect search and display across all pages.</p>
        
        <p><strong>Social Proof:</strong> Product cards can display order count badges showing how many times a product has been ordered, creating trust signals for buyers.</p>
        
        <p><strong>Badge Configuration:</strong> Configurable badge definitions (like "Bestseller", "New", "Trending") with custom colors, labels, and visibility rules are managed through the badge config table.</p>
        
        <p><strong>Currency Formatting:</strong> All prices are formatted using the society's configured currency symbol and locale settings.</p>
        
        <p><strong>Haptic Feedback:</strong> On native mobile apps, actions like adding to cart provide haptic feedback for a more tactile experience.</p>
      </Sub>
    </div>
  );
}
