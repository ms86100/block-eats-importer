import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
}

export function useSellerChat(sellerId: string | null, productId: string | null) {
  const { session } = useAuth();
  const buyerId = session?.user?.id ?? null;
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Get or create conversation
  const initConversation = useCallback(async () => {
    if (!buyerId || !sellerId) return null;
    setLoading(true);
    try {
      // Try to find existing
      const { data: existing } = await supabase
        .from('seller_conversations')
        .select('id')
        .eq('buyer_id', buyerId)
        .eq('seller_id', sellerId)
        .eq('product_id', productId ?? '')
        .maybeSingle();

      if (existing) {
        setConversationId(existing.id);
        return existing.id;
      }

      // Create new
      const { data: created, error } = await supabase
        .from('seller_conversations')
        .insert({ buyer_id: buyerId, seller_id: sellerId, product_id: productId })
        .select('id')
        .single();

      if (error) throw error;
      setConversationId(created.id);
      return created.id;
    } catch (err) {
      console.error('Failed to init conversation:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [buyerId, sellerId, productId]);

  // Fetch messages when conversationId changes
  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('seller_conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(200);
      setMessages((data as ChatMessage[]) || []);
    };
    fetchMessages();

    // Realtime subscription
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seller_conversation_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId]);

  // Send message
  const sendMessage = useCallback(
    async (text: string) => {
      if (!conversationId || !buyerId || !text.trim()) return;
      setSending(true);
      try {
        await supabase.from('seller_conversation_messages').insert({
          conversation_id: conversationId,
          sender_id: buyerId,
          message_text: text.trim(),
        });

        // Enqueue push notification for seller
        if (sellerId) {
          // Get seller user_id from seller_profiles
          const { data: sp } = await supabase
            .from('seller_profiles')
            .select('user_id, business_name')
            .eq('id', sellerId)
            .maybeSingle();

          if (sp?.user_id) {
            await supabase.from('notification_queue').insert({
              user_id: sp.user_id,
              type: 'message',
              title: '💬 New Message',
              body: `You have a new message from a buyer`,
              reference_path: `/seller/messages/${conversationId}`,
              payload: { conversationId, type: 'seller_chat' },
            });
          }
        }
      } catch (err) {
        console.error('Failed to send message:', err);
      } finally {
        setSending(false);
      }
    },
    [conversationId, buyerId, sellerId]
  );

  return {
    conversationId,
    messages,
    loading,
    sending,
    buyerId,
    initConversation,
    sendMessage,
  };
}
