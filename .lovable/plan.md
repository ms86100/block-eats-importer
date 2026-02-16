

## Replace Delivery Timer with Sociva Brand Identity

### What Changes

The header's top-left section currently shows "Delivery in 16 minutes" and "HOME -- A, A-001". This will be replaced with:

1. **Sociva brand text** with colorful letter styling
2. **A community tagline** beneath it
3. **Society name** (the user's apartment/community name) replacing "HOME -- block, flat"

### Visual Design

```text
+----------------------------------------------+
|  Sociva          [theme] [bell] [avatar]      |
|  Your Society, Your Store                     |
|  [building-icon] Greenfield Residences  v     |
|  [--- search bar ---]                         |
+----------------------------------------------+
```

**Brand text "Sociva":**
- "S" in primary green (hsl var --primary)
- "o", "c", "i", "a" in foreground (neutral)
- "v" in a warm amber/orange accent (hsl 38 95% 52% -- the existing --warning color)
- Font: Plus Jakarta Sans (already loaded), 24px, font-extrabold, with slight letter-spacing

**Tagline:** "Your Society, Your Store" in muted-foreground, 10px uppercase tracking-widest -- same style as the current "Delivery in" label.

**Society name row:** Shows the actual society name from the database (e.g., "Greenfield Residences") with a small Building icon, replacing the old "HOME -- A, A-001" text. The chevron-down is kept for visual consistency.

### Technical Details

**Single file change:** `src/components/layout/Header.tsx`

- Lines 78-97 (the `showLocation && profile` block): Replace "Delivery in / 16 minutes" with styled "Sociva" brand text + tagline
- Replace "HOME -- block, flat_number" with `displaySociety?.name` (already computed on line 61)
- Lines 100-104 (the fallback when no profile): Same brand text without society name
- Import `Building` icon from lucide-react

No database changes, no new files, no new dependencies.

