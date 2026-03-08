
-- 1. seller_contact_interactions
CREATE TABLE public.seller_contact_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  interaction_type text NOT NULL DEFAULT 'call',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_contact_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can insert their own interactions"
  ON public.seller_contact_interactions FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Users can read their own interactions"
  ON public.seller_contact_interactions FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

-- 2. call_feedback
CREATE TABLE public.call_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES public.seller_contact_interactions(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  outcome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can insert their own feedback"
  ON public.call_feedback FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Users can read their own feedback"
  ON public.call_feedback FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

-- 3. seller_conversations
CREATE TABLE public.seller_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, seller_id, product_id)
);

ALTER TABLE public.seller_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read their conversations"
  ON public.seller_conversations FOR SELECT TO authenticated
  USING (buyer_id = auth.uid() OR seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Buyers can create conversations"
  ON public.seller_conversations FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

CREATE POLICY "Participants can update their conversations"
  ON public.seller_conversations FOR UPDATE TO authenticated
  USING (buyer_id = auth.uid() OR seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = auth.uid()));

-- 4. seller_conversation_messages
CREATE TABLE public.seller_conversation_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.seller_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_text text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can read messages"
  ON public.seller_conversation_messages FOR SELECT TO authenticated
  USING (conversation_id IN (
    SELECT id FROM public.seller_conversations
    WHERE buyer_id = auth.uid() OR seller_id IN (SELECT sp.id FROM public.seller_profiles sp WHERE sp.user_id = auth.uid())
  ));

CREATE POLICY "Conversation participants can send messages"
  ON public.seller_conversation_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT id FROM public.seller_conversations
      WHERE buyer_id = auth.uid() OR seller_id IN (SELECT sp.id FROM public.seller_profiles sp WHERE sp.user_id = auth.uid())
    )
  );

CREATE POLICY "Recipients can mark messages as read"
  ON public.seller_conversation_messages FOR UPDATE TO authenticated
  USING (conversation_id IN (
    SELECT id FROM public.seller_conversations
    WHERE buyer_id = auth.uid() OR seller_id IN (SELECT sp.id FROM public.seller_profiles sp WHERE sp.user_id = auth.uid())
  ));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_conversation_messages;

-- Trigger: auto-update last_message_at on new message
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.seller_conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_last_message
  AFTER INSERT ON public.seller_conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_last_message();

-- Indexes for performance
CREATE INDEX idx_sci_buyer_id ON public.seller_contact_interactions(buyer_id);
CREATE INDEX idx_sci_seller_id ON public.seller_contact_interactions(seller_id);
CREATE INDEX idx_call_feedback_interaction ON public.call_feedback(interaction_id);
CREATE INDEX idx_sc_buyer_seller ON public.seller_conversations(buyer_id, seller_id);
CREATE INDEX idx_scm_conversation ON public.seller_conversation_messages(conversation_id, created_at);
