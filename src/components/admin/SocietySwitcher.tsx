import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface SocietyOption {
  id: string;
  name: string;
}

export function SocietySwitcher() {
  const { isAdmin, isBuilderMember, managedBuilderIds, effectiveSocietyId, setViewAsSociety, profile } = useAuth();
  const [societies, setSocieties] = useState<SocietyOption[]>([]);

  useEffect(() => {
    fetchSocieties();
  }, [isAdmin, isBuilderMember, managedBuilderIds]);

  const fetchSocieties = async () => {
    if (isAdmin) {
      const { data } = await supabase
        .from('societies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      setSocieties((data as SocietyOption[]) || []);
    } else if (isBuilderMember && managedBuilderIds.length > 0) {
      const { data } = await supabase
        .from('builder_societies')
        .select('society:societies!builder_societies_society_id_fkey(id, name)')
        .in('builder_id', managedBuilderIds);
      const mapped = (data || [])
        .map((d: any) => d.society)
        .filter(Boolean) as SocietyOption[];
      setSocieties(mapped);
    }
  };

  if (!isAdmin && !isBuilderMember) return null;
  if (societies.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Building2 size={16} className="text-muted-foreground shrink-0" />
      <Select
        value={effectiveSocietyId || 'all'}
        onValueChange={(val) => {
          if (val === 'my' || val === 'all') {
            setViewAsSociety(null);
          } else {
            setViewAsSociety(val);
          }
        }}
      >
        <SelectTrigger className="h-8 text-xs w-[200px]">
          <SelectValue placeholder="Select society" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={profile?.society_id || 'my'} className="text-xs">
            My Society
          </SelectItem>
          {societies
            .filter(s => s.id !== profile?.society_id)
            .map(s => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
