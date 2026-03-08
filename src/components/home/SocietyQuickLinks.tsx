import { Link } from 'react-router-dom';
import { useEffectiveFeatures, type FeatureKey } from '@/hooks/useEffectiveFeatures';
import { useAuth } from '@/contexts/AuthContext';
import {
  Users, Car, IndianRupee, MessageCircle, Wrench, ShieldAlert, ChevronRight, Building2,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickLink {
  icon: typeof Users;
  label: string;
  to: string;
  featureKey?: FeatureKey;
}

const quickLinks: QuickLink[] = [
  { icon: Users, label: 'Visitors', to: '/visitors', featureKey: 'visitor_management' },
  { icon: Car, label: 'Parking', to: '/parking', featureKey: 'vehicle_parking' },
  { icon: IndianRupee, label: 'Finances', to: '/society/finances', featureKey: 'finances' },
  { icon: MessageCircle, label: 'Bulletin', to: '/community', featureKey: 'bulletin' },
  { icon: Wrench, label: 'Maintenance', to: '/maintenance', featureKey: 'maintenance' },
  { icon: ShieldAlert, label: 'Disputes', to: '/disputes', featureKey: 'disputes' },
];

export function SocietyQuickLinks() {
  const { effectiveSociety } = useAuth();
  const { isFeatureEnabled } = useEffectiveFeatures();

  if (!effectiveSociety) return null;

  const visibleLinks = quickLinks.filter(l => !l.featureKey || isFeatureEnabled(l.featureKey));
  if (visibleLinks.length === 0) return null;

  return (
    <div className="mt-4 mb-2">
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-[14px] text-foreground tracking-tight flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 size={13} className="text-primary" />
            </div>
            Your Society
          </h3>
          <Link to="/society" className="text-[11px] font-bold text-primary flex items-center gap-0.5 ml-4">
            View all <ChevronRight size={12} />
          </Link>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 px-4 snap-x snap-mandatory">
        {visibleLinks.slice(0, 6).map(({ icon: Icon, label, to }, i) => (
          <motion.div
            key={to}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={to} className="shrink-0 snap-start block">
              <div className="bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 active:scale-[0.97] transition-all duration-200 hover:border-primary/30 hover:shadow-md min-w-[125px] group">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <Icon size={18} className="text-primary" />
                </div>
                <span className="text-[12px] font-semibold text-foreground whitespace-nowrap">{label}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
