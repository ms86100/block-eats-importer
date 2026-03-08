import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Settings, PlusCircle, DollarSign, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function QuickActions() {
  const { sellerProfiles = [], currentSellerId } = useAuth();
  const activeSellerId = currentSellerId || (sellerProfiles.length > 0 ? sellerProfiles[0].id : null);

  const items = [
    { to: '/seller/products', icon: Plus, iconBg: 'bg-primary/10', iconClass: 'text-primary', label: 'Manage Products', sub: 'Add or edit' },
    { to: '/seller/settings', icon: Settings, iconBg: 'bg-secondary', iconClass: 'text-secondary-foreground', label: 'Store Settings', sub: 'Payment & hours' },
    { to: '/seller/earnings', icon: DollarSign, iconBg: 'bg-success/10', iconClass: 'text-success', label: 'Earnings', sub: 'View payouts' },
    ...(activeSellerId ? [{ to: `/seller/${activeSellerId}`, icon: Eye, iconBg: 'bg-primary/10', iconClass: 'text-primary', label: 'Store Preview', sub: 'Buyer view' }] : []),
    { to: '/become-seller', icon: PlusCircle, iconBg: 'bg-accent/10', iconClass: 'text-accent', label: 'Add Business', sub: 'New store', dashed: true },
  ];

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {items.map((item) => (
        <Link key={item.to + item.label} to={item.to}>
          <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${(item as any).dashed ? 'border-dashed' : ''}`}>
            <CardContent className="p-3 flex flex-col items-center gap-2 text-center">
              <div className={`w-10 h-10 rounded-full ${item.iconBg} flex items-center justify-center`}>
                <item.icon className={item.iconClass} size={20} />
              </div>
              <div>
                <p className="font-medium text-xs">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.sub}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
