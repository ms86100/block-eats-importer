import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Edit2, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCurrency } from '@/hooks/useCurrency';

export interface ServiceAddon {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  display_order: number;
}

interface ServiceAddonsManagerProps {
  productId: string;
}

export function ServiceAddonsManager({ productId }: ServiceAddonsManagerProps) {
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ServiceAddon | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '' });
  const { formatPrice } = useCurrency();

  useEffect(() => { fetchAddons(); }, [productId]);

  const fetchAddons = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('service_addons')
      .select('*')
      .eq('product_id', productId)
      .order('display_order');
    setAddons((data || []) as ServiceAddon[]);
    setIsLoading(false);
  };

  const openAdd = () => {
    setEditingAddon(null);
    setForm({ name: '', description: '', price: '' });
    setIsDialogOpen(true);
  };

  const openEdit = (a: ServiceAddon) => {
    setEditingAddon(a);
    setForm({ name: a.name, description: a.description || '', price: String(a.price) });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const parsedPrice = parseFloat(form.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error('Price must be 0 or greater');
      return;
    }
    setIsSaving(true);
    try {
      if (editingAddon) {
        const { error } = await supabase.from('service_addons').update({
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: parsedPrice,
        }).eq('id', editingAddon.id);
        if (error) throw error;
        toast.success('Add-on updated');
      } else {
        const { error } = await supabase.from('service_addons').insert({
          product_id: productId,
          name: form.name.trim(),
          description: form.description.trim() || null,
          price: parsedPrice,
          display_order: addons.length,
        });
        if (error) throw error;
        toast.success('Add-on created');
      }
      setIsDialogOpen(false);
      fetchAddons();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save add-on');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (a: ServiceAddon) => {
    await supabase.from('service_addons').update({ is_active: !a.is_active }).eq('id', a.id);
    setAddons(addons.map(ad => ad.id === a.id ? { ...ad, is_active: !ad.is_active } : ad));
  };

  const deleteAddon = async (a: ServiceAddon) => {
    const { error } = await supabase.from('service_addons').delete().eq('id', a.id);
    if (error) {
      toast.error('Failed to delete add-on');
      return;
    }
    setAddons(addons.filter(ad => ad.id !== a.id));
    toast.success('Add-on deleted');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
          <Sparkles size={12} /> Service Add-ons ({addons.length})
        </p>
        <Button size="sm" variant="outline" onClick={openAdd} className="h-7 text-xs gap-1">
          <Plus size={12} /> Add
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : addons.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No add-ons yet. Add optional extras for buyers.</p>
      ) : (
        <div className="space-y-1.5">
          {addons.map((a) => (
            <div key={a.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs ${!a.is_active ? 'opacity-50' : ''}`}>
              <div>
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground ml-2">+{formatPrice(a.price)}</span>
                {a.description && <p className="text-[10px] text-muted-foreground">{a.description}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(a)}>
                  <Edit2 size={10} />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                      <Trash2 size={10} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Add-on?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "<strong>{a.name}</strong>"? This cannot be undone. Existing bookings with this add-on won't be affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAddon(a)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a)} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddon ? 'Edit Add-on' : 'Add Service Add-on'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Deep Clean" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price</Label>
              <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" />
            </div>
            <Button className="w-full" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="animate-spin mr-2" size={16} />}
              {editingAddon ? 'Save Changes' : 'Add Add-on'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
