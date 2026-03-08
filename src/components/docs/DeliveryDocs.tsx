import { DocSection, DocHero, DocInfoCard, DocFlowStep } from './DocPrimitives';

export function DeliveryDocs() {
  return (
    <div className="space-y-2">
      <DocHero
        title="Delivery & Logistics"
        description="This module covers society-level delivery management, delivery partner operations, and parcel tracking — ensuring smooth last-mile delivery within residential communities."
        badges={['Delivery', 'Admin', '3 Pages']}
      />

      {/* ─── SOCIETY DELIVERIES ─── */}
      <DocSection title="1. Society Deliveries (/society/deliveries)">
        <p>A society-level view of all ongoing and recent deliveries within the community.</p>

        <DocInfoCard title="Active Deliveries" icon="🚚">
          <p>Real-time list of all in-progress deliveries showing: order ID, buyer name, seller name, rider name, current status, and estimated time.</p>
          <p>Status badges: <strong>Assigned</strong> → <strong>Picked Up</strong> → <strong>At Gate</strong> → <strong>Delivered</strong>.</p>
        </DocInfoCard>

        <DocInfoCard title="Delivery Tracking" icon="📍">
          <p>Each delivery assignment tracks: rider location (lat/lng), last location update time, distance to destination, and ETA in minutes.</p>
          <p>Delivery codes (OTP) are generated for secure handoff verification at the society gate or door.</p>
        </DocInfoCard>

        <DocInfoCard title="Stalled Detection" icon="⚠️">
          <p>The system monitors delivery progress. If a delivery remains in the same status for too long, a stalled notification is triggered to alert society admins.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── DELIVERY PARTNER DASHBOARD ─── */}
      <DocSection title="2. Delivery Partner Dashboard (/delivery/dashboard)">
        <p>The operational hub for delivery riders/partners assigned to a society.</p>

        <DocInfoCard title="Assignment Queue" icon="📋">
          <p>Shows all pending delivery assignments with: pickup location (seller), drop location (buyer), order summary, and estimated distance.</p>
          <p>Riders can <strong>accept</strong> assignments from the queue.</p>
        </DocInfoCard>

        <DocInfoCard title="Active Delivery Flow" icon="🔄">
          <DocFlowStep number={1} title="Accept Assignment" desc="Rider accepts a delivery from the queue. Status changes to 'assigned'." />
          <DocFlowStep number={2} title="Pick Up" desc="Rider arrives at seller location and confirms pickup. Status: 'picked_up'." />
          <DocFlowStep number={3} title="At Gate" desc="Rider arrives at society gate. Gate entry is logged. Status: 'at_gate'." />
          <DocFlowStep number={4} title="Deliver" desc="Rider delivers to buyer. Delivery code (OTP) is verified. Status: 'delivered'." />
        </DocInfoCard>

        <DocInfoCard title="Earnings & Stats" icon="💰">
          <p>Delivery fee per order, total deliveries completed, rating, and payout summary.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── DELIVERY PARTNER MANAGEMENT ─── */}
      <DocSection title="3. Delivery Partner Management (/delivery/manage)">
        <p>Admin page for managing the society's delivery partner pool.</p>

        <DocInfoCard title="Partner Pool" icon="👥">
          <p>List of all registered delivery partners with: name, phone, vehicle type, vehicle number, availability status, rating, and total deliveries.</p>
          <p>Admins can <strong>add new partners</strong>, <strong>deactivate</strong> existing ones, and <strong>toggle availability</strong>.</p>
        </DocInfoCard>

        <DocInfoCard title="Partner Configuration" icon="⚙️">
          <p>Configure delivery partners with: delivery fee structure, payout rates, and platform margin per delivery.</p>
          <p>Support for both <strong>internal partners</strong> (society-managed) and <strong>external delivery services</strong> via API integration.</p>
        </DocInfoCard>
      </DocSection>

      {/* ─── PARCEL MANAGEMENT ─── */}
      <DocSection title="4. Parcel Management (/parcels)">
        <p>Tracks parcels and packages arriving at the society for residents.</p>

        <DocInfoCard title="Parcel Logging" icon="📦">
          <p>Security staff log incoming parcels with: recipient flat number, courier name, package description, and photo.</p>
          <p>Residents receive a <strong>notification</strong> when a parcel is logged for their flat.</p>
        </DocInfoCard>

        <DocInfoCard title="Collection Tracking" icon="✅">
          <p>When a resident collects their parcel, the security staff marks it as collected with timestamp.</p>
          <p>Uncollected parcels trigger reminder notifications after a configurable period.</p>
        </DocInfoCard>
      </DocSection>
    </div>
  );
}
