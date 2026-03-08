import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Edit2, Loader2, Users, Phone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface StaffMember {
  id: string;
  name: string;
  phone: string | null;
  photo_url: string | null;
  specializations: string[];
  is_active: boolean;
}

interface ServiceStaffManagerProps {
  sellerId: string;
}

export function ServiceStaffManager({ sellerId }: ServiceStaffManagerProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', specializations: '' });

  useEffect(() => { fetchStaff(); }, [sellerId]);

  const fetchStaff = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('service_staff')
      .select('*')
      .eq('seller_id', sellerId)
      .order('name');
    setStaff((data || []) as StaffMember[]);
    setIsLoading(false);
  };

  const openAdd = () => {
    setEditingStaff(null);
    setForm({ name: '', phone: '', specializations: '' });
    setIsDialogOpen(true);
  };

  const openEdit = (s: StaffMember) => {
    setEditingStaff(s);
    setForm({ name: s.name, phone: s.phone || '', specializations: s.specializations.join(', ') });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setIsSaving(true);
    const specs = form.specializations.split(',').map(s => s.trim()).filter(Boolean);
    try {
      if (editingStaff) {
        await supabase.from('service_staff').update({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          specializations: specs,
        }).eq('id', editingStaff.id);
        toast.success('Staff updated');
      } else {
        await supabase.from('service_staff').insert({
          seller_id: sellerId,
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          specializations: specs,
        });
        toast.success('Staff added');
      }
      setIsDialogOpen(false);
      fetchStaff();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (s: StaffMember) => {
    await supabase.from('service_staff').update({ is_active: !s.is_active }).eq('id', s.id);
    setStaff(staff.map(st => st.id === s.id ? { ...st, is_active: !st.is_active } : st));
  };

  const deleteStaff = async (s: StaffMember) => {
    // Check if staff has active bookings assigned
    const { count } = await supabase
      .from('service_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('staff_id', s.id)
      .not('status', 'in', '(cancelled,completed,no_show)');

    if (count && count > 0) {
      toast.error(`Cannot delete ${s.name} — they have ${count} active booking(s). Reassign or complete them first.`);
      return;
    }

    const { error } = await supabase.from('service_staff').delete().eq('id', s.id);
    if (error) {
      toast.error('Failed to delete staff member');
      return;
    }
    setStaff(staff.filter(st => st.id !== s.id));
    toast.success('Staff member deleted');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users size={16} className="text-primary" />
            Service Staff ({staff.length})
          </CardTitle>
          <Button size="sm" onClick={openAdd} className="gap-1.5">
            <Plus size={14} /> Add Staff
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
        ) : staff.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No staff members yet</p>
        ) : (
          staff.map((s) => (
            <div key={s.id} className={`flex items-center justify-between p-3 rounded-xl border transition-opacity ${!s.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={s.photo_url || undefined} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{s.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  {s.phone && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone size={8} />{s.phone}</p>}
                  {s.specializations.length > 0 && (
                    <div className="flex gap-1 mt-0.5 flex-wrap">
                      {s.specializations.map((sp) => (
                        <span key={sp} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{sp}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                  <Edit2 size={12} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                      <Trash2 size={12} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Staff Member?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete <strong>{s.name}</strong>? This will remove them from available staff for booking assignments.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteStaff(s)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Switch checked={s.is_active} onCheckedChange={() => toggleActive(s)} />
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff' : 'Add Staff Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Staff name" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Specializations (comma-separated)</Label>
              <Input value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} placeholder="e.g. Plumbing, Electrical" />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin mr-2" size={16} />}
              {editingStaff ? 'Save Changes' : 'Add Staff'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
