

# Contact Seller: Multi-Action Hub with Chat & Post-Call Feedback

## Overview

Transform the current single-action "Call Now" modal into a full buyer–seller interaction hub with three options: **Call Now** (with post-call feedback), **Message** (real-time chat), and a database-driven architecture for tracking all interactions.

---

## Database Changes (3 new tables, 1 altered table)

### 1. `seller_contact_interactions` — Tracks every contact event
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| buyer_id | uuid FK profiles | |
| seller_id | uuid FK seller_profiles | |
| product_id | uuid FK products (nullable) | Context of the contact |
| interaction_type | text | `call`, `message`, `enquiry` |
| created_at | timestamptz | |

### 2. `call_feedback` — Post-call feedback (radio options)
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| interaction_id | uuid FK seller_contact_interactions | |
| buyer_id | uuid FK profiles | |
| seller_id | uuid FK seller_profiles | |
| outcome | text | One of the 6 predefined options |
| created_at | timestamptz | |

### 3. `seller_conversations` — Pre-order direct messaging threads
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| buyer_id | uuid FK auth.users | |
| seller_id | uuid FK seller_profiles | |
| product_id | uuid FK products (nullable) | |
| last_message_at | timestamptz | For sorting |
| created_at | timestamptz | |
| UNIQUE(buyer_id, seller_id, product_id) | | One thread per buyer-seller-product |

### 4. `seller_conversation_messages` — Messages within a conversation
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| conversation_id | uuid FK seller_conversations | |
| sender_id | uuid FK auth.users | |
| message_text | text | |
| is_read | boolean default false | |
| created_at | timestamptz | |

Enable realtime on `seller_conversation_messages` for live chat.

RLS: Authenticated users can only read/write their own conversations (buyer_id or seller user_id matches auth.uid()).

---

## Component Changes

### 1. Rewrite `ContactSellerModal.tsx`
Replace the single "Call Now" button with a multi-option hub:
- **Seller info card** (name, phone — same as current)
- **Call Now** button → triggers `tel:` link, logs interaction, then after 5 seconds shows post-call feedback modal
- **Message** button → opens `SellerChatSheet` (new component)
- **Post-Call Feedback** handled via `CallFeedbackModal` (new component)

### 2. New: `CallFeedbackModal.tsx`
A small dialog with radio buttons:
- "Call connected and discussion happened"
- "Call connected but no agreement"
- "Seller did not answer"
- "Number unreachable / incorrect"
- "Agreement reached / service confirmed"
- "Need more info / seller will call back"

Submit stores to `call_feedback` table. Quick one-tap flow.

### 3. New: `SellerChatSheet.tsx`
A bottom drawer with:
- Message list (scrollable, realtime subscription on `seller_conversation_messages`)
- Text input + send button
- On send: insert message, update `last_message_at`, enqueue push notification to seller via `notification_queue`
- Product context shown at the top (name, price, image thumbnail)

### 4. New: `useSellerChat.ts` hook
- `getOrCreateConversation(buyerId, sellerId, productId)` — upserts into `seller_conversations`
- `useMessages(conversationId)` — query + realtime subscription
- `sendMessage(conversationId, text)` — insert message + enqueue notification

### 5. Update `useProductDetail.ts`
- Add `seller_id` to the product detail for passing to chat/interaction tracking
- No major logic changes needed

### 6. Update `ProductDetailSheet.tsx`
- Pass `product.seller_id` and `product.product_id` to the updated `ContactSellerModal`

---

## Notification Integration

When a buyer sends a message:
1. Insert into `seller_conversation_messages`
2. Insert into `notification_queue` with type `'message'`, referencing a path like `/seller/messages/{conversationId}`
3. Seller receives push + in-app notification (existing pipeline handles delivery)

---

## Files to Create
- `src/components/product/CallFeedbackModal.tsx`
- `src/components/product/SellerChatSheet.tsx`
- `src/hooks/useSellerChat.ts`

## Files to Edit
- `src/components/product/ContactSellerModal.tsx` — full rewrite to multi-option hub
- `src/components/product/ProductDetailSheet.tsx` — pass additional props (productId, sellerId, buyerId)
- `src/hooks/useProductDetail.ts` — minor: expose buyerId from auth context

## Database Migration
- Create 4 tables with RLS policies
- Add realtime publication for `seller_conversation_messages`
- Create trigger to update `seller_conversations.last_message_at` on new message

