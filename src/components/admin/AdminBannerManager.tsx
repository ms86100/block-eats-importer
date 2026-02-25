import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, GripVertical, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type BannerTemplate = 'image_only' | 'text_overlay' | 'split_left' | 'gradient_cta' | 'minimal_text';

const TEMPLATES: { value: BannerTemplate; label: string; description: string }[] = [
  { value: 'image_only', label: 'Image Only', description: 'Full-width image banner' },
  { value: 'text_overlay', label: 'Text Overlay', description: 'Image with text overlay & CTA' },
  { value: 'split_left', label: 'Split Layout', description: 'Text left, image right' },
  { value: 'gradient_cta', label: 'Gradient CTA', description: 'Gradient background with bold CTA' },
  { value: 'minimal_text', label: 'Minimal Text', description: 'Clean text-only announcement' },
];

const DEFAULT_COLORS = [
  '#16a34a', '#2563eb', '#dc2626', '#9333ea', '#ea580c',
  '#0d9488', '#4f46e5', '#be185d', '#1e293b', '#854d0e',
];

interface BannerForm {
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  button_text: string;
  bg_color: string;
  template: BannerTemplate;
  is_active: boolean;
  display_order: number;
}

const emptyForm: BannerForm = {
  title: '', subtitle: '', image_url: '', link_url: '', button_text: '',
  bg_color: '#16a34a', template: 'image_only', is_active: true, display_order: 0,
};

export function AdminBannerManager() {
  const { effectiveSocietyId } = useAuth();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [previewTemplate, setPreviewTemplate] = useState<BannerTemplate>('image_only');

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['admin-banners', effectiveSocietyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_items')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: BannerForm) => {
      const payload = {
        title: f.title || null,
        subtitle: f.subtitle || null,
        image_url: f.image_url || null,
        link_url: f.link_url || null,
        button_text: f.button_text || null,
        bg_color: f.bg_color,
        template: f.template,
        is_active: f.is_active,
        display_order: f.display_order,
        type: 'banner',
        reference_id: 'banner',
        society_id: effectiveSocietyId || null,
      };

      if (editingId) {
        const { error } = await supabase.from('featured_items').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('featured_items').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['featured-banners'] });
      toast.success(editingId ? 'Banner updated' : 'Banner created');
      closeSheet();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('featured_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-banners'] });
      qc.invalidateQueries({ queryKey: ['featured-banners'] });
      toast.success('Banner deleted');
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, display_order: banners.length });
    setPreviewTemplate('image_only');
    setSheetOpen(true);
  };

  const openEdit = (banner: any) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      image_url: banner.image_url || '',
      link_url: banner.link_url || '',
      button_text: banner.button_text || '',
      bg_color: banner.bg_color || '#16a34a',
      template: banner.template || 'image_only',
      is_active: banner.is_active ?? true,
      display_order: banner.display_order ?? 0,
    });
    setPreviewTemplate(banner.template || 'image_only');
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const updateField = <K extends keyof BannerForm>(key: K, value: BannerForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === 'template') setPreviewTemplate(value as BannerTemplate);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Featured Banners ({banners.length})
        </h3>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus size={14} /> Add Banner
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : banners.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No banners yet. Create one to feature on the home page.</CardContent></Card>
      ) : (
        banners.map((b: any) => (
          <Card key={b.id} className={cn(!b.is_active && 'opacity-50')}>
            <CardContent className="p-3 flex items-center gap-3">
              <GripVertical size={14} className="text-muted-foreground shrink-0" />
              {b.image_url ? (
                <img src={b.image_url} alt="" className="w-16 h-10 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-16 h-10 rounded-lg shrink-0 flex items-center justify-center text-[10px] text-white font-bold" style={{ backgroundColor: b.bg_color || '#16a34a' }}>
                  {(b.template || 'text').toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{b.title || 'Untitled'}</p>
                <p className="text-[10px] text-muted-foreground">
                  {TEMPLATES.find(t => t.value === b.template)?.label || 'Image Only'} • Order: {b.display_order}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Switch
                  checked={b.is_active}
                  onCheckedChange={async (checked) => {
                    await supabase.from('featured_items').update({ is_active: checked }).eq('id', b.id);
                    qc.invalidateQueries({ queryKey: ['admin-banners'] });
                    qc.invalidateQueries({ queryKey: ['featured-banners'] });
                  }}
                />
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(b)}>
                  <Pencil size={12} />
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteMutation.mutate(b.id)}>
                  <Trash2 size={12} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Edit Banner' : 'Create Banner'}</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Template Selection */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">Template</Label>
              <div className="grid grid-cols-2 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.value}
                    onClick={() => updateField('template', t.value)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all',
                      form.template === t.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <p className="text-xs font-semibold">{t.label}</p>
                    <p className="text-[10px] text-muted-foreground">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Preview */}
            <div>
              <Label className="text-xs font-semibold mb-2 flex items-center gap-1"><Eye size={12} /> Preview</Label>
              <div className="rounded-2xl overflow-hidden border">
                <BannerPreview form={form} />
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Banner headline" />
              </div>

              {form.template !== 'image_only' && (
                <div>
                  <Label className="text-xs">Subtitle</Label>
                  <Textarea value={form.subtitle} onChange={e => updateField('subtitle', e.target.value)} placeholder="Supporting text" rows={2} />
                </div>
              )}

              {['image_only', 'text_overlay', 'split_left'].includes(form.template) && (
                <div>
                  <Label className="text-xs">Image URL</Label>
                  <Input value={form.image_url} onChange={e => updateField('image_url', e.target.value)} placeholder="https://..." />
                </div>
              )}

              <div>
                <Label className="text-xs">Link URL (route)</Label>
                <Input value={form.link_url} onChange={e => updateField('link_url', e.target.value)} placeholder="/search or /bulletin" />
              </div>

              {form.template !== 'image_only' && (
                <div>
                  <Label className="text-xs">Button Text</Label>
                  <Input value={form.button_text} onChange={e => updateField('button_text', e.target.value)} placeholder="Shop Now" />
                </div>
              )}

              {form.template !== 'image_only' && (
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Background Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {DEFAULT_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => updateField('bg_color', c)}
                        className={cn(
                          'w-8 h-8 rounded-full border-2 transition-all',
                          form.bg_color === c ? 'border-foreground scale-110' : 'border-transparent'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div>
                  <Label className="text-xs">Display Order</Label>
                  <Input type="number" value={form.display_order} onChange={e => updateField('display_order', parseInt(e.target.value) || 0)} className="w-20" />
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Switch checked={form.is_active} onCheckedChange={v => updateField('is_active', v)} />
                  <Label className="text-xs">Active</Label>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={closeSheet}>Cancel</Button>
              <Button className="flex-1" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ── Banner Preview ── */
function BannerPreview({ form }: { form: BannerForm }) {
  const { title, subtitle, image_url, button_text, bg_color, template } = form;

  if (template === 'image_only') {
    return image_url ? (
      <img src={image_url} alt={title} className="w-full h-36 object-cover" />
    ) : (
      <div className="w-full h-36 bg-muted flex items-center justify-center text-sm text-muted-foreground">
        Add an image URL
      </div>
    );
  }

  if (template === 'text_overlay') {
    return (
      <div className="relative w-full h-36">
        {image_url ? (
          <img src={image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: bg_color }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-4">
          <h3 className="text-white font-bold text-base">{title || 'Headline'}</h3>
          {subtitle && <p className="text-white/80 text-xs mt-0.5">{subtitle}</p>}
          {button_text && (
            <span className="mt-2 inline-block bg-white text-black text-xs font-bold px-3 py-1 rounded-full w-fit">
              {button_text}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (template === 'split_left') {
    return (
      <div className="flex h-36" style={{ backgroundColor: bg_color }}>
        <div className="flex-1 flex flex-col justify-center p-4">
          <h3 className="text-white font-bold text-sm leading-tight">{title || 'Headline'}</h3>
          {subtitle && <p className="text-white/80 text-[10px] mt-1">{subtitle}</p>}
          {button_text && (
            <span className="mt-2 inline-block bg-white text-xs font-bold px-3 py-1 rounded-full w-fit" style={{ color: bg_color }}>
              {button_text}
            </span>
          )}
        </div>
        {image_url && (
          <div className="w-2/5 shrink-0">
            <img src={image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    );
  }

  if (template === 'gradient_cta') {
    return (
      <div
        className="w-full h-36 flex flex-col items-center justify-center text-center p-4"
        style={{ background: `linear-gradient(135deg, ${bg_color}, ${bg_color}cc)` }}
      >
        <h3 className="text-white font-extrabold text-lg">{title || 'Big Announcement'}</h3>
        {subtitle && <p className="text-white/85 text-xs mt-1 max-w-[80%]">{subtitle}</p>}
        {button_text && (
          <span className="mt-3 bg-white text-xs font-bold px-4 py-1.5 rounded-full" style={{ color: bg_color }}>
            {button_text}
          </span>
        )}
      </div>
    );
  }

  // minimal_text
  return (
    <div className="w-full h-36 flex flex-col items-center justify-center p-6 border-l-4" style={{ borderColor: bg_color }}>
      <h3 className="font-bold text-base text-foreground">{title || 'Notice'}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-1 text-center">{subtitle}</p>}
      {button_text && (
        <span className="mt-3 text-xs font-bold px-4 py-1.5 rounded-full border" style={{ color: bg_color, borderColor: bg_color }}>
          {button_text}
        </span>
      )}
    </div>
  );
}
