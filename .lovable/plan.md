

# Fix: Product Filtering Should Use Category → Parent Group Mapping, Not Seller Primary Group

## Problem

Products are incorrectly filtered by **seller's `primary_group`** instead of the **product's category → parent_group mapping**.

**Evidence:**
- Guitar product: `category: tutoring` → `parent_group: professional` (from `category_config`)
- Seller's `primary_group: education_learning` (self-declared when creating seller profile)
- Query filters: `.eq('seller.primary_group', 'professional')` → product excluded

**Root cause:** Sellers can sell products across multiple categories, but the query assumes all products match the seller's primary group.

---

## Affected Queries

| Location | Issue |
|----------|-------|
| `usePopularProducts.ts` line 81 | `.eq('seller.primary_group', parentGroup!)` |
| `CategoryGroupPage.tsx` line 94 | Top sellers: `.eq('primary_group', category!)` |

---

## Fix Strategy

**Replace seller-based filtering with product category-based filtering:**

1. First fetch categories for the target parent group from `category_config`
2. Filter products using `.in('category', categoryList)`

---

## Implementation

### File: `src/hooks/queries/usePopularProducts.ts`

**Change `useCategoryProducts` query:**

```typescript
export function useCategoryProducts(parentGroup: string | null, societyId: string | null) {
  const { data: nearbyProducts } = useNearbyProducts();

  const localQuery = useQuery({
    queryKey: ['category-products', parentGroup, societyId],
    queryFn: async (): Promise<ProductWithSeller[]> => {
      // 1. Get all categories for this parent group
      const { data: cats } = await supabase
        .from('category_config')
        .select('category')
        .eq('parent_group', parentGroup!);
      
      const categoryList = (cats || []).map(c => c.category);
      if (categoryList.length === 0) return [];

      // 2. Query products by category (not seller.primary_group)
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:seller_profiles!products_seller_id_fkey(
            id, business_name, rating, society_id, verification_status, 
            fulfillment_mode, delivery_note, availability_start, 
            availability_end, operating_days, is_available
          )
        `)
        .eq('is_available', true)
        .eq('approval_status', 'approved')
        .in('category', categoryList)  // ← Filter by product category
        .order('is_bestseller', { ascending: false })
        .order('created_at', { ascending: false });

      if (societyId) {
        query = query.eq('seller.society_id', societyId);
      }

      // ... rest of mapping unchanged
    },
    enabled: !!parentGroup,
    staleTime: 3 * 60 * 1000,
  });

  // ... merge with nearby products
}
```

### File: `src/pages/CategoryGroupPage.tsx`

**Fix top sellers query (line ~90):**

The top sellers query should also be based on categories, not `seller.primary_group`:

```typescript
const { data: topSellers = [] } = useQuery({
  queryKey: ['category-sellers', category, effectiveSocietyId],
  queryFn: async () => {
    // Get categories for this parent group
    const { data: cats } = await supabase
      .from('category_config')
      .select('category')
      .eq('parent_group', category!);
    
    const categoryList = (cats || []).map((c: any) => c.category);
    if (categoryList.length === 0) return [];

    // Get sellers who have products in these categories
    const { data: sellers, error } = await supabase
      .from('seller_profiles')
      .select(`
        *,
        profile:profiles!seller_profiles_user_id_fkey(name, block),
        products!products_seller_id_fkey(category)
      `)
      .eq('verification_status', 'approved')
      .order('rating', { ascending: false })
      .limit(20);

    if (error) throw error;
    
    // Filter to sellers with at least one product in target categories
    const filtered = (sellers || []).filter((s: any) => 
      s.products?.some((p: any) => categoryList.includes(p.category))
    );
    
    // Apply society filter
    return societyId 
      ? filtered.filter((s: any) => s.society_id === societyId).slice(0, 10)
      : filtered.slice(0, 10);
  },
  enabled: !!category && !!effectiveSocietyId,
});
```

---

## Expected Outcome

| Scenario | Before | After |
|----------|--------|-------|
| Guitar (tutoring → professional) with seller primary_group = education_learning | Not shown on Professional Services | Shown correctly |
| Seller with products in multiple categories | Products only show in seller's primary_group page | Products show in correct category pages |
| Top sellers list | Based on seller's self-declared group | Based on actual products in that category |

