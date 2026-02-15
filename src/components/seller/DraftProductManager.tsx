import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { VegBadge } from '@/components/ui/veg-badge';
import { ImageUpload } from '@/components/ui/image-upload';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Loader2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useCategoryConfigs } from '@/hooks/useCategoryBehavior';

interface DraftProduct {
  id?: string;
  name: string;
  price: number;
  description: string;
  category: string;
  is_veg: boolean;
  image_url: string;
  prep_time_minutes?: number | null;
}

interface DraftProductManagerProps {
  sellerId: string;
  categories: string[];
  products: DraftProduct[];
  onProductsChange: (products: DraftProduct[]) => void;
}

export function DraftProductManager({
  sellerId,
  categories,
  products,
  onProductsChange,
}: DraftProductManagerProps) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { configs } = useCategoryConfigs();
  const [newProduct, setNewProduct] = useState<DraftProduct>({
    name: '',
    price: 0,
    description: '',
    category: categories[0] || '',
    is_veg: true,
    image_url: '',
    prep_time_minutes: null,
  });

  // Get form hints for the selected category
  const activeConfig = useMemo(() => {
    return configs.find(c => c.category === newProduct.category) || null;
  }, [configs, newProduct.category]);

  const showVegToggle = activeConfig?.formHints.showVegToggle ?? false;
  const showDurationField = activeConfig?.formHints.showDurationField ?? false;

  // Check if this category requires a price (from category_config DB row)
  const requiresPrice = useMemo(() => {
    if (!activeConfig) return true;
    // Look up the raw config row to check requires_price
    // The behavior.enquiryOnly and supportsCart can inform this
    return activeConfig.behavior.supportsCart || !activeConfig.behavior.enquiryOnly;
  }, [activeConfig]);

  const handleAddProduct = async () => {
    if (!newProduct.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (requiresPrice && newProduct.price <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({
          seller_id: sellerId,
          name: newProduct.name.trim(),
          price: newProduct.price || 0,
          description: newProduct.description.trim() || null,
          category: newProduct.category,
          is_veg: newProduct.is_veg,
          image_url: newProduct.image_url.trim() || null,
          is_available: true,
          prep_time_minutes: newProduct.prep_time_minutes || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      onProductsChange([...products, { ...newProduct, id: data.id }]);
      setNewProduct({
        name: '',
        price: 0,
        description: '',
        category: categories[0] || '',
        is_veg: true,
        image_url: '',
        prep_time_minutes: null,
      });
      setIsAdding(false);
      toast.success('Product added');
    } catch (error: any) {
      console.error('Error adding product:', error);
      toast.error(error.message || 'Failed to add product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveProduct = async (index: number) => {
    const product = products[index];
    if (product.id) {
      try {
        await supabase.from('products').delete().eq('id', product.id);
      } catch (e) {
        console.error('Error deleting product:', e);
      }
    }
    const updated = products.filter((_, i) => i !== index);
    onProductsChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Your Products / Services</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add at least one item to continue
          </p>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {products.length} item{products.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Existing Products */}
      {products.map((product, index) => {
        const prodConfig = configs.find(c => c.category === product.category);
        const showVeg = prodConfig?.formHints.showVegToggle ?? false;
        return (
          <Card key={product.id || index} className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package size={20} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {showVeg && <VegBadge isVeg={product.is_veg} size="sm" />}
                    <span className="font-medium text-sm truncate">{product.name}</span>
                  </div>
                  <p className="text-sm font-bold text-primary mt-0.5">
                    {product.price > 0 ? `₹${product.price}` : 'Price on request'}
                  </p>
                  {product.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {product.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveProduct(index)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add New Product Form */}
      {isAdding ? (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <h4 className="font-medium text-sm">New Product / Service</h4>
            <div className="space-y-2">
              <Label htmlFor="prod-name" className="text-xs">Name *</Label>
              <Input
                id="prod-name"
                placeholder={activeConfig?.formHints.namePlaceholder || "e.g., Product Name"}
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="prod-price" className="text-xs">
                  {activeConfig?.formHints.priceLabel || 'Price'} (₹) {requiresPrice ? '*' : '(optional)'}
                </Label>
                <Input
                  id="prod-price"
                  type="number"
                  min={0}
                  placeholder={requiresPrice ? '150' : '0 = Price on request'}
                  value={newProduct.price || ''}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, price: Number(e.target.value) })
                  }
                />
              </div>
              {categories.length > 1 && (
                <div className="space-y-2">
                  <Label className="text-xs">Category</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, category: e.target.value })
                    }
                  >
                    {categories.map((c) => {
                      const catConfig = configs.find(cfg => cfg.category === c);
                      return (
                        <option key={c} value={c}>
                          {catConfig ? `${catConfig.icon} ${catConfig.displayName}` : c.replace(/_/g, ' ')}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="prod-desc" className="text-xs">Description</Label>
              <Textarea
                id="prod-desc"
                placeholder={activeConfig?.formHints.descriptionPlaceholder || "Short description..."}
                rows={2}
                value={newProduct.description}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, description: e.target.value })
                }
              />
            </div>
            
            {/* Image Upload */}
            <div className="space-y-2">
              <Label className="text-xs">Product Image</Label>
              {user ? (
                <ImageUpload
                  value={newProduct.image_url || null}
                  onChange={(url) => setNewProduct({ ...newProduct, image_url: url || '' })}
                  folder="products"
                  userId={user.id}
                  aspectRatio="square"
                  placeholder="Upload product image"
                />
              ) : (
                <p className="text-xs text-muted-foreground">Sign in to upload images</p>
              )}
            </div>

            {showVegToggle && (
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={newProduct.is_veg}
                  onCheckedChange={(checked) =>
                    setNewProduct({ ...newProduct, is_veg: checked as boolean })
                  }
                />
                <span className="text-sm">Vegetarian</span>
              </label>
            )}
            {showDurationField && (
              <div className="space-y-2">
                <Label htmlFor="prod-prep" className="text-xs">{activeConfig?.formHints.durationLabel || 'Duration (min)'}</Label>
                <Input
                  id="prod-prep"
                  type="number"
                  min={1}
                  placeholder="e.g., 30"
                  value={newProduct.prep_time_minutes || ''}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, prep_time_minutes: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleAddProduct}
                disabled={isSaving}
              >
                {isSaving && <Loader2 size={14} className="animate-spin mr-1" />}
                Save Product
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setIsAdding(true)}
        >
          <Plus size={16} className="mr-2" />
          Add Product / Service
        </Button>
      )}
    </div>
  );
}
