import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isToday, isTomorrow, differenceInHours } from 'date-fns';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpcomingBooking {
  id: string;
  order_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  product_name?: string;
  seller_name?: string;
}

export function UpcomingAppointmentBanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<UpcomingBooking | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('service_bookings')
        .select('id, order_id, booking_date, start_time, end_time, status, product_id')
        .eq('buyer_id', user.id)
        .gte('booking_date', today)
        .not('status', 'in', '("cancelled","completed","no_show")')
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!data) return;

      // Get product name
      const { data: product } = await supabase
        .from('products')
        .select('name, seller_id')
        .eq('id', data.product_id)
        .single();

      let sellerName = '';
      if (product?.seller_id) {
        const { data: seller } = await supabase
          .from('seller_profiles')
          .select('business_name')
          .eq('id', product.seller_id)
          .single();
        sellerName = seller?.business_name || '';
      }

      setBooking({
        ...data,
        product_name: product?.name || 'Service',
        seller_name: sellerName,
      } as UpcomingBooking);
    })();
  }, [user?.id]);

  if (!booking) return null;

  const appointmentDate = new Date(`${booking.booking_date}T${booking.start_time}`);
  const hoursAway = differenceInHours(appointmentDate, new Date());
  const dateLabel = isToday(new Date(booking.booking_date))
    ? 'Today'
    : isTomorrow(new Date(booking.booking_date))
    ? 'Tomorrow'
    : format(new Date(booking.booking_date + 'T00:00'), 'MMM d');

  const isUrgent = hoursAway <= 2 && hoursAway >= 0;

  return (
    <button
      onClick={() => navigate(`/orders/${booking.order_id}`)}
      className={`w-full p-3 rounded-xl border flex items-center gap-3 text-left transition-colors ${
        isUrgent
          ? 'bg-primary/10 border-primary/30 animate-pulse'
          : 'bg-accent/5 border-accent/20 hover:bg-accent/10'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
        isUrgent ? 'bg-primary/20' : 'bg-accent/10'
      }`}>
        <Calendar size={18} className={isUrgent ? 'text-primary' : 'text-accent'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{booking.product_name}</p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Clock size={10} />
          {dateLabel} at {booking.start_time?.slice(0, 5)}
          {booking.seller_name && <span> · {booking.seller_name}</span>}
        </p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </button>
  );
}
