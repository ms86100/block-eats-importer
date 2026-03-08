import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  BookOpen, ChevronDown, ChevronRight, Users, Store, Shield, Calendar,
  Clock, MapPin, Bell, RefreshCw, XCircle, CheckCircle, UserPlus,
  Settings, Repeat, Sparkles, AlertTriangle, FileText, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type SectionId =
  | 'overview'
  | 'buyer-guide'
  | 'seller-guide'
  | 'admin-guide'
  | 'booking-lifecycle'
  | 'slot-management'
  | 'cancellation-policy'
  | 'rescheduling'
  | 'recurring-bookings'
  | 'notifications'
  | 'staff-management'
  | 'addons'
  | 'troubleshooting'
  | 'faq';

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ElementType;
  stakeholder?: 'buyer' | 'seller' | 'admin' | 'all';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen, stakeholder: 'all' },
  { id: 'buyer-guide', label: 'Buyer Guide', icon: Users, stakeholder: 'buyer' },
  { id: 'seller-guide', label: 'Seller Guide', icon: Store, stakeholder: 'seller' },
  { id: 'admin-guide', label: 'Admin Guide', icon: Shield, stakeholder: 'admin' },
  { id: 'booking-lifecycle', label: 'Booking Lifecycle', icon: Calendar, stakeholder: 'all' },
  { id: 'slot-management', label: 'Slot Management', icon: Clock, stakeholder: 'seller' },
  { id: 'cancellation-policy', label: 'Cancellation Policy', icon: XCircle, stakeholder: 'all' },
  { id: 'rescheduling', label: 'Rescheduling', icon: RefreshCw, stakeholder: 'all' },
  { id: 'recurring-bookings', label: 'Recurring Bookings', icon: Repeat, stakeholder: 'buyer' },
  { id: 'notifications', label: 'Notifications', icon: Bell, stakeholder: 'all' },
  { id: 'staff-management', label: 'Staff Management', icon: UserPlus, stakeholder: 'seller' },
  { id: 'addons', label: 'Add-ons', icon: Sparkles, stakeholder: 'all' },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle, stakeholder: 'all' },
  { id: 'faq', label: 'FAQ', icon: FileText, stakeholder: 'all' },
];

const STAKEHOLDER_COLORS: Record<string, string> = {
  buyer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  seller: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  all: 'bg-muted text-muted-foreground',
};

function Badge({ type }: { type: string }) {
  return (
    <span className={cn('text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full', STAKEHOLDER_COLORS[type])}>
      {type}
    </span>
  );
}

function SectionHeader({ title, id, stakeholder }: { title: string; id: string; stakeholder?: string }) {
  return (
    <div id={id} className="scroll-mt-20 pt-6 pb-2 border-b border-border mb-4 flex items-center gap-2">
      <h2 className="text-lg font-bold text-foreground">{title}</h2>
      {stakeholder && <Badge type={stakeholder} />}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
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

function StatusBadge({ status, color }: { status: string; color: string }) {
  return <span className={cn('inline-block text-[11px] font-medium px-2 py-0.5 rounded-full', color)}>{status}</span>;
}

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');

  const scrollTo = (id: SectionId) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AppLayout headerTitle="Documentation">
      <div className="flex min-h-[calc(100dvh-3.5rem)]">
        {/* Sidebar Nav — hidden on mobile, visible md+ */}
        <aside className="hidden md:block w-56 shrink-0 border-r border-border bg-card">
          <ScrollArea className="h-[calc(100dvh-3.5rem)]">
            <div className="py-4 px-3 space-y-0.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-2">Contents</p>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                      activeSection === item.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Mobile TOC */}
        <div className="md:hidden sticky top-0 z-10 bg-card border-b border-border px-4 py-2 overflow-x-auto">
          <div className="flex gap-1.5">
            {NAV_ITEMS.map((item) => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? 'default' : 'outline'}
                size="sm"
                className="text-[11px] whitespace-nowrap h-7 px-2.5"
                onClick={() => scrollTo(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <ScrollArea className="h-[calc(100dvh-3.5rem)]">
            <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-2">

              {/* Hero */}
              <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <BookOpen className="text-primary-foreground" size={20} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground">Service Booking Module</h1>
                    <p className="text-xs text-muted-foreground">Complete User Manual · v2.0</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This documentation covers the end-to-end service booking system — from how buyers discover and book services,
                  to how sellers manage slots and appointments, to how admins oversee the entire ecosystem.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge type="buyer" />
                  <Badge type="seller" />
                  <Badge type="admin" />
                </div>
              </div>

              {/* ─── OVERVIEW ─── */}
              <SectionHeader title="Overview" id="overview" stakeholder="all" />
              <div className="text-sm text-muted-foreground space-y-3">
                <p>
                  The Service Booking Module enables community members to book appointments for services offered by local sellers.
                  It supports <strong>scheduled, on-demand, group, and recurring</strong> service types with configurable
                  time slots, staff assignments, add-ons, and automated notifications.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {[
                    { icon: Calendar, label: 'Slot-based booking', desc: '14-day rolling window' },
                    { icon: MapPin, label: '3 location types', desc: 'Home, at-seller, online' },
                    { icon: Bell, label: 'Auto reminders', desc: '24h & 1h before' },
                    { icon: Zap, label: 'Real-time updates', desc: 'Live status tracking' },
                  ].map(({ icon: I, label, desc }) => (
                    <div key={label} className="bg-card border border-border rounded-xl p-3 text-center">
                      <I size={20} className="mx-auto text-primary mb-1.5" />
                      <p className="text-xs font-semibold text-foreground">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ─── BUYER GUIDE ─── */}
              <SectionHeader title="Buyer Guide" id="buyer-guide" stakeholder="buyer" />
              <SubSection title="How to Book a Service">
                <p>1. Browse a seller's profile and tap on any service listing.</p>
                <p>2. Select your preferred <strong>date</strong> from the calendar (slots are generated 14 days in advance).</p>
                <p>3. Pick a <strong>time slot</strong> — only available (non-blocked, non-full) slots are shown.</p>
                <p>4. Choose <strong>location type</strong>: Home Visit, At Seller's Location, or Online.</p>
                <p>5. If Home Visit, enter your full address.</p>
                <p>6. Optionally add <strong>add-ons</strong> (e.g. premium products, extra time).</p>
                <p>7. Review the booking summary and confirm. An order is created and the slot is atomically reserved.</p>
              </SubSection>
              <SubSection title="Viewing Your Appointments">
                <p>Navigate to <strong>Orders</strong> from your profile. Service orders show the booking date, time, location, and current status.</p>
                <p>An <strong>Upcoming Appointment Banner</strong> appears on the home page for your next appointment within 48 hours.</p>
              </SubSection>
              <SubSection title="Self-Booking Protection">
                <p>The system prevents sellers from booking their own services. If you are the seller of a service, the booking button will be disabled with a clear message.</p>
              </SubSection>

              {/* ─── SELLER GUIDE ─── */}
              <SectionHeader title="Seller Guide" id="seller-guide" stakeholder="seller" />
              <SubSection title="Setting Up Your Service">
                <p>1. Create a product listing and select a <strong>service category</strong> (e.g. Beauty, Fitness, Tutoring).</p>
                <p>2. Configure service metadata: <strong>duration</strong>, <strong>buffer time</strong>, <strong>location type</strong>, and <strong>price model</strong> (fixed, hourly, or tiered).</p>
                <p>3. Set <strong>availability schedules</strong> — define which days and hours you operate.</p>
                <p>4. Optionally create <strong>add-ons</strong> to upsell premium features.</p>
              </SubSection>
              <SubSection title="Managing Slots">
                <p>Slots are auto-generated daily at <strong>2 AM</strong> for a 14-day window via the <code className="text-xs bg-muted px-1 rounded">generate-service-slots</code> edge function.</p>
                <p>Use the <strong>Slot Calendar Manager</strong> to:</p>
                <p>• <strong>Block</strong> specific slots (e.g. personal break).</p>
                <p>• <strong>Unblock</strong> previously blocked slots.</p>
                <p>• View booked vs. available capacity per slot.</p>
              </SubSection>
              <SubSection title="Managing Appointments">
                <p>The <strong>Service Bookings Calendar</strong> shows all your upcoming bookings (excluding cancelled and no-show).</p>
                <p>Actions available per booking:</p>
                <p>• <strong>Confirm</strong> — Accept a requested or rescheduled booking.</p>
                <p>• <strong>Start</strong> — Move from confirmed → in_progress.</p>
                <p>• <strong>Complete</strong> — Mark the session as done.</p>
                <p>• <strong>No-show</strong> — Mark buyer as absent.</p>
                <p>• <strong>Reject</strong> — Decline a rescheduled booking.</p>
                <p>• <strong>Assign Staff</strong> — Delegate the appointment to a team member.</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  All status updates are ownership-verified — you can only modify your own bookings.
                </p>
              </SubSection>

              {/* ─── ADMIN GUIDE ─── */}
              <SectionHeader title="Admin Guide" id="admin-guide" stakeholder="admin" />
              <SubSection title="System Oversight">
                <p>Admins have visibility into all service bookings across the platform. Key monitoring areas:</p>
                <p>• <strong>Booking volume</strong> per seller and service category.</p>
                <p>• <strong>Cancellation rates</strong> and reasons.</p>
                <p>• <strong>No-show rates</strong> per buyer and seller.</p>
                <p>• <strong>Edge function health</strong> — monitor slot generation and reminder delivery logs.</p>
              </SubSection>
              <SubSection title="Database & Security">
                <p>All tables use Row-Level Security (RLS) policies:</p>
                <p>• <code className="text-xs bg-muted px-1 rounded">service_bookings</code> — buyers see their own; sellers see bookings for their services.</p>
                <p>• <code className="text-xs bg-muted px-1 rounded">service_slots</code> — public read for available slots; write restricted to slot generation function.</p>
                <p>• <code className="text-xs bg-muted px-1 rounded">service_staff</code> — only the owning seller can manage staff.</p>
                <p>• Booking mutations use the <code className="text-xs bg-muted px-1 rounded">book_service_slot</code> RPC for atomic slot reservation.</p>
              </SubSection>
              <SubSection title="Edge Functions">
                <p>Two automated backend functions power the module:</p>
                <p><strong>1. generate-service-slots</strong> — Runs daily at 2 AM. Creates time slots for the next 14 days based on seller availability schedules. Idempotent — safe to re-run.</p>
                <p><strong>2. send-appointment-reminders</strong> — Runs hourly. Sends push notifications to buyers and sellers 24h and 1h before appointments. Batches metadata lookups to avoid N+1 queries.</p>
              </SubSection>

              {/* ─── BOOKING LIFECYCLE ─── */}
              <SectionHeader title="Booking Lifecycle" id="booking-lifecycle" stakeholder="all" />
              <div className="text-sm text-muted-foreground space-y-3">
                <p>Every service booking follows a defined status flow. The table below shows each status, who triggers it, and what happens next.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 font-semibold">Status</th>
                        <th className="text-left px-3 py-2 font-semibold">Triggered By</th>
                        <th className="text-left px-3 py-2 font-semibold">Description</th>
                        <th className="text-left px-3 py-2 font-semibold">Next Steps</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[
                        { status: 'Requested', color: 'bg-blue-100 text-blue-800', by: 'Buyer', desc: 'Booking placed, awaiting seller confirmation', next: 'Confirmed / Cancelled' },
                        { status: 'Confirmed', color: 'bg-emerald-100 text-emerald-800', by: 'Seller', desc: 'Seller accepted the booking', next: 'On The Way / In Progress' },
                        { status: 'Rescheduled', color: 'bg-purple-100 text-purple-800', by: 'Buyer', desc: 'Buyer requested a new time', next: 'Confirmed / Rejected' },
                        { status: 'Scheduled', color: 'bg-cyan-100 text-cyan-800', by: 'System', desc: 'Auto-created from recurring config', next: 'Confirmed' },
                        { status: 'On The Way', color: 'bg-orange-100 text-orange-800', by: 'Seller', desc: 'Seller en route for home visit', next: 'Arrived' },
                        { status: 'Arrived', color: 'bg-teal-100 text-teal-800', by: 'Seller', desc: 'Seller reached the location', next: 'In Progress' },
                        { status: 'In Progress', color: 'bg-amber-100 text-amber-800', by: 'Seller', desc: 'Session underway', next: 'Completed' },
                        { status: 'Completed', color: 'bg-green-100 text-green-800', by: 'Seller', desc: 'Session finished successfully', next: '— (Terminal)' },
                        { status: 'No Show', color: 'bg-red-100 text-red-800', by: 'Seller', desc: 'Buyer did not appear', next: '— (Terminal)' },
                        { status: 'Cancelled', color: 'bg-red-100 text-red-800', by: 'Buyer/Seller', desc: 'Booking cancelled', next: '— (Terminal)' },
                      ].map((row) => (
                        <tr key={row.status}>
                          <td className="px-3 py-2"><StatusBadge status={row.status} color={row.color} /></td>
                          <td className="px-3 py-2 text-foreground font-medium">{row.by}</td>
                          <td className="px-3 py-2">{row.desc}</td>
                          <td className="px-3 py-2">{row.next}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── SLOT MANAGEMENT ─── */}
              <SectionHeader title="Slot Management" id="slot-management" stakeholder="seller" />
              <SubSection title="How Slots Are Generated">
                <p>The system auto-generates slots every day at 2 AM based on your <strong>availability schedule</strong>. Each slot represents a bookable time window.</p>
                <p>• Slots cover a <strong>14-day rolling window</strong> — always looking 2 weeks ahead.</p>
                <p>• Each slot has a <strong>max capacity</strong> (configurable per service, default 1).</p>
                <p>• Buffer time between slots prevents back-to-back overbooking.</p>
              </SubSection>
              <SubSection title="Slot States">
                <p><strong>Available</strong> — Open for booking (booked_count &lt; max_capacity and not blocked).</p>
                <p><strong>Full</strong> — All capacity used (booked_count = max_capacity).</p>
                <p><strong>Blocked</strong> — Manually blocked by seller via the calendar manager.</p>
              </SubSection>

              {/* ─── CANCELLATION POLICY ─── */}
              <SectionHeader title="Cancellation Policy" id="cancellation-policy" stakeholder="all" />
              <SubSection title="Buyer Cancellation">
                <p>Buyers can cancel a booking if the appointment is more than the <strong>cancellation notice period</strong> away (set per service, default 24h).</p>
                <p>When a buyer cancels:</p>
                <p>1. The booking status changes to <code className="text-xs bg-muted px-1 rounded">cancelled</code>.</p>
                <p>2. The associated order status updates to <code className="text-xs bg-muted px-1 rounded">cancelled</code>.</p>
                <p>3. The slot's booked count is decremented, freeing capacity.</p>
                <p>4. The seller receives a notification about the cancellation.</p>
                <p>5. A <strong>cancellation fee</strong> may apply based on the service's configured percentage.</p>
              </SubSection>
              <SubSection title="Late Cancellation">
                <p>If the appointment is within the notice period, the cancel button is disabled. The buyer must contact the seller directly.</p>
              </SubSection>

              {/* ─── RESCHEDULING ─── */}
              <SectionHeader title="Rescheduling" id="rescheduling" stakeholder="all" />
              <SubSection title="How Rescheduling Works">
                <p>1. The buyer initiates a reschedule from the order detail page.</p>
                <p>2. They select a new date and time slot.</p>
                <p>3. The system atomically: releases the old slot, reserves the new slot, and creates a new booking record linked to the original.</p>
                <p>4. The booking status changes to <code className="text-xs bg-muted px-1 rounded">rescheduled</code>.</p>
                <p>5. The seller must <strong>Confirm</strong> or <strong>Reject</strong> the rescheduled appointment.</p>
              </SubSection>
              <SubSection title="Safeguards">
                <p>• Cannot reschedule to a <strong>past date/time</strong>.</p>
                <p>• Must be outside the <strong>rescheduling notice period</strong>.</p>
                <p>• Only active (non-terminal) bookings can be rescheduled.</p>
              </SubSection>

              {/* ─── RECURRING BOOKINGS ─── */}
              <SectionHeader title="Recurring Bookings" id="recurring-bookings" stakeholder="buyer" />
              <SubSection title="Setting Up Recurring Appointments">
                <p>For regular services (e.g. weekly tutoring, bi-weekly cleaning), buyers can set up a <strong>recurring config</strong>:</p>
                <p>• Choose frequency: <strong>weekly</strong>, <strong>bi-weekly</strong>, or <strong>monthly</strong>.</p>
                <p>• Select preferred day and time.</p>
                <p>• The system auto-creates bookings via the <code className="text-xs bg-muted px-1 rounded">process-recurring-bookings</code> edge function.</p>
              </SubSection>
              <SubSection title="Managing Recurring Configs">
                <p>Active recurring configs appear in your profile under <strong>Subscriptions</strong>. You can pause or cancel them at any time.</p>
              </SubSection>

              {/* ─── NOTIFICATIONS ─── */}
              <SectionHeader title="Notifications" id="notifications" stakeholder="all" />
              <SubSection title="Automated Notifications">
                <p>The system sends push notifications at key lifecycle events:</p>
                <div className="space-y-1.5">
                  {[
                    { event: 'Booking Created', to: 'Seller', desc: 'New booking request received' },
                    { event: '24h Reminder', to: 'Buyer + Seller', desc: 'Appointment tomorrow' },
                    { event: '1h Reminder', to: 'Buyer + Seller', desc: 'Appointment starting soon' },
                    { event: 'Status Change', to: 'Buyer', desc: 'Confirmed, started, completed, etc.' },
                    { event: 'Cancellation', to: 'Seller', desc: 'Buyer cancelled the booking' },
                    { event: 'Reschedule', to: 'Seller', desc: 'Buyer requested a new time' },
                    { event: 'Staff Assigned', to: 'Buyer', desc: 'A staff member was assigned' },
                  ].map((n) => (
                    <div key={n.event} className="flex items-start gap-2 text-xs">
                      <Bell size={11} className="text-primary mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-foreground">{n.event}</span>
                        <span className="text-muted-foreground"> → {n.to}: {n.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SubSection>

              {/* ─── STAFF MANAGEMENT ─── */}
              <SectionHeader title="Staff Management" id="staff-management" stakeholder="seller" />
              <SubSection title="Adding Staff Members">
                <p>Sellers can add team members via <strong>Seller Settings → Staff</strong>. Each staff member has a name and optional specialization.</p>
              </SubSection>
              <SubSection title="Assigning Staff to Bookings">
                <p>From the bookings calendar, use the <strong>Assign Staff</strong> action to delegate a specific appointment. The buyer is notified of who will be serving them.</p>
              </SubSection>

              {/* ─── ADD-ONS ─── */}
              <SectionHeader title="Add-ons" id="addons" stakeholder="all" />
              <SubSection title="What Are Add-ons?">
                <p>Add-ons are optional extras that buyers can include when booking a service (e.g. premium shampoo, extended session, special equipment).</p>
                <p>Sellers create add-ons from the product editor. Each add-on has a name, description, and price.</p>
                <p>Add-on prices at time of booking are locked — price changes after booking do not affect existing orders.</p>
              </SubSection>

              {/* ─── TROUBLESHOOTING ─── */}
              <SectionHeader title="Troubleshooting" id="troubleshooting" stakeholder="all" />
              <SubSection title="Common Issues">
                <div className="space-y-3">
                  <div className="bg-card border border-border rounded-lg p-3">
                    <p className="font-semibold text-foreground text-xs mb-1">❓ "No slots available"</p>
                    <p className="text-xs">The seller may not have set up availability schedules, or all slots for the next 14 days are booked/blocked. Slots regenerate daily at 2 AM.</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3">
                    <p className="font-semibold text-foreground text-xs mb-1">❓ "Can't cancel — too close to appointment"</p>
                    <p className="text-xs">The cancellation notice period has passed. Contact the seller directly to request cancellation.</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3">
                    <p className="font-semibold text-foreground text-xs mb-1">❓ "Booking failed — slot no longer available"</p>
                    <p className="text-xs">Another buyer booked the last slot between your selection and confirmation. The system validates freshness right before booking. Try another time.</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3">
                    <p className="font-semibold text-foreground text-xs mb-1">❓ "I'm a seller but can't book my own service"</p>
                    <p className="text-xs">This is by design — sellers cannot book their own services to prevent abuse and ensure accurate booking metrics.</p>
                  </div>
                  <div className="bg-card border border-border rounded-lg p-3">
                    <p className="font-semibold text-foreground text-xs mb-1">❓ "Notifications not arriving"</p>
                    <p className="text-xs">Check your push notification permissions in device settings. Visit Profile → Push Debug to verify your device token is registered.</p>
                  </div>
                </div>
              </SubSection>

              {/* ─── FAQ ─── */}
              <SectionHeader title="Frequently Asked Questions" id="faq" stakeholder="all" />
              <div className="space-y-3">
                {[
                  { q: 'Can I book multiple services in one order?', a: 'Currently, each service booking creates a separate order. Multi-service checkout is on the roadmap.' },
                  { q: 'What happens if the seller doesn\'t confirm my booking?', a: 'The booking remains in "Requested" status. If unconfirmed past the appointment time, it can be treated as a no-show or auto-cancelled.' },
                  { q: 'How far in advance can I book?', a: 'Up to 14 days in advance. Slots are regenerated daily.' },
                  { q: 'Can I tip the service provider?', a: 'Tipping is not yet built into the platform. You can arrange this directly with the seller.' },
                  { q: 'Is my address shared with the seller?', a: 'Only if you choose "Home Visit" as the location type. For other location types, your address is not shared.' },
                  { q: 'What is the cancellation fee?', a: 'This varies by service. Each seller configures their own cancellation fee percentage (0-100%). Check the service listing for details.' },
                  { q: 'Can I see the staff member before booking?', a: 'Staff assignment happens after booking. The seller assigns the best available team member and you are notified.' },
                ].map((faq) => (
                  <Collapsible key={faq.q}>
                    <CollapsibleTrigger className="w-full text-left flex items-start gap-2 bg-card border border-border rounded-lg px-3 py-2.5 group cursor-pointer hover:bg-muted/30 transition-colors">
                      <ChevronRight size={14} className="text-muted-foreground mt-0.5 shrink-0 group-data-[state=open]:rotate-90 transition-transform" />
                      <span className="text-xs font-medium text-foreground">{faq.q}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-3 pb-2 pt-1 ml-5">
                      <p className="text-xs text-muted-foreground">{faq.a}</p>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>

              {/* Footer */}
              <div className="pt-8 pb-12 border-t border-border mt-8 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Service Booking Module Documentation · Last updated March 2026
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  More sections will be added as new features are released.
                </p>
              </div>
            </div>
          </ScrollArea>
        </main>
      </div>
    </AppLayout>
  );
}
