import { useSellerServiceBookings } from '@/hooks/useServiceBookings';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

interface ServiceBookingStatsProps {
  sellerId: string;
}

export function ServiceBookingStats({ sellerId }: ServiceBookingStatsProps) {
  const { data: bookings = [] } = useSellerServiceBookings(sellerId);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysBookings = bookings.filter(b => b.booking_date === todayStr);
  const pendingRequests = bookings.filter(b => b.status === 'requested');
  const upcomingConfirmed = bookings.filter(b => ['confirmed', 'scheduled'].includes(b.status));
  const completedThisWeek = bookings.filter(b => b.status === 'completed');

  if (bookings.length === 0) return null;

  const stats = [
    {
      icon: Calendar,
      label: "Today",
      value: todaysBookings.length,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: AlertCircle,
      label: "Pending",
      value: pendingRequests.length,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      pulse: pendingRequests.length > 0,
    },
    {
      icon: Clock,
      label: "Upcoming",
      value: upcomingConfirmed.length,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      icon: CheckCircle2,
      label: "Done",
      value: completedThisWeek.length,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <Card key={stat.label} className={`${stat.pulse ? 'ring-1 ring-orange-300 animate-pulse' : ''}`}>
          <CardContent className="p-2.5 flex flex-col items-center text-center">
            <div className={`w-8 h-8 rounded-full ${stat.bgColor} flex items-center justify-center mb-1`}>
              <stat.icon size={14} className={stat.color} />
            </div>
            <span className="text-lg font-bold tabular-nums">{stat.value}</span>
            <span className="text-[9px] text-muted-foreground">{stat.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
