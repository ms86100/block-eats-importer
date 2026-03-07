

# Haptic Feedback Standardization Plan

## Current State
The haptic infrastructure is solid — `lib/haptics.ts` provides centralized utilities, `GlobalHapticListener` fires `hapticSelection()` on all interactive element clicks, and `preloadHaptics()` runs at startup. However, there are **inconsistencies** causing the "partially working" feel:

### Issues Found

1. **Inconsistent intensity on quantity changes**: `ProductListingCard` uses `selectionChanged()` (light tick) for increment/decrement, while `ProductGridCard`, `ProductCard`, and `CartPage` use `hapticImpact('medium')` — users feel different feedback for the same action depending on which card variant they're viewing.

2. **Missing haptic on "Add to cart" in ProductDetailSheet**: The main "Add to cart" CTA (line 202) calls `d.handleAdd` which triggers `addItem` but has no explicit `hapticImpact('medium')` — it only gets the generic light `hapticSelection()` from `GlobalHapticListener`.

3. **No success haptic on checkout button press**: The "Proceed to Checkout" / "Place Order" button click has no immediate haptic. The `hapticNotification('success')` only fires *after* the async order creation succeeds — users get no tactile confirmation when they tap the button.

4. **Double haptic on BottomNav**: `BottomNav` explicitly calls `hapticSelection()` AND `GlobalHapticListener` also fires `hapticSelection()` on `<a>` clicks — users get two ticks per nav tap.

## Changes

### 1. `ProductListingCard.tsx` — Standardize increment/decrement to medium impact
Change `handleIncrement` and `handleDecrement` from `selectionChanged()` to `impact('medium')` to match all other card variants.

### 2. `ProductDetailSheet.tsx` — Add haptic to "Add to cart" CTA
Add `hapticImpact('medium')` before `d.handleAdd()` on the Add to cart button (line 202), and on the non-cart action button (line 214).

### 3. `CartPage.tsx` — Add haptic to "Place Order" / checkout button
Add `hapticImpact('heavy')` on the checkout/place-order button press for immediate tactile confirmation (the success notification haptic will follow after completion).

### 4. `BottomNav.tsx` — Remove duplicate haptic
Remove the explicit `onClick={() => hapticSelection()}` from NavLink since `GlobalHapticListener` already handles it — this eliminates double-tick.

### 5. `GlobalHapticListener.tsx` — Add `data-haptic-none` exclusion
Add support for `[data-haptic-none]` attribute to let specific elements opt out of the global listener (prevents double-fire in edge cases without removing the global coverage).

**Files changed**: 5 files, all small targeted edits. No new dependencies.

