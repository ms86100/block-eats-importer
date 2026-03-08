import { useState, useCallback } from 'react';
import { Phone, MessageCircle, User, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CallFeedbackModal } from './CallFeedbackModal';
import { SellerChatSheet } from './SellerChatSheet';

interface ContactSellerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerName: string;
  phone: string;
  sellerId: string;
  productId?: string | null;
  productName?: string;
  productImage?: string | null;
  productPrice?: string;
}

export function ContactSellerModal({
  open, onOpenChange, sellerName, phone,
  sellerId, productId, productName, productImage, productPrice,
}: ContactSellerModalProps) {
  const { session } = useAuth();
  const buyerId = session?.user?.id ?? '';
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [interactionId, setInteractionId] = useState<string | null>(null);

  const logInteraction = useCallback(async (type: string) => {
    if (!buyerId || !sellerId) return null;
    try {
      const { data } = await supabase
        .from('seller_contact_interactions')
        .insert({
          buyer_id: buyerId,
          seller_id: sellerId,
          product_id: productId || null,
          interaction_type: type,
        })
        .select('id')
        .single();
      return data?.id ?? null;
    } catch {
      return null;
    }
  }, [buyerId, sellerId, productId]);

  const handleCall = useCallback(async () => {
    const id = await logInteraction('call');
    setInteractionId(id);
    window.location.href = `tel:${phone}`;
    // Show feedback after a short delay (user returns from call)
    setTimeout(() => setFeedbackOpen(true), 5000);
  }, [logInteraction, phone]);

  const handleMessage = useCallback(async () => {
    await logInteraction('message');
    onOpenChange(false);
    setChatOpen(true);
  }, [logInteraction, onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Store size={18} className="text-primary" />
              Contact Seller
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Seller info */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User size={18} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">{sellerName}</p>
                {phone && <p className="text-sm text-muted-foreground">{phone}</p>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2.5">
              {phone && (
                <Button onClick={handleCall} className="w-full gap-2" variant="default">
                  <Phone size={16} />
                  Call Now
                </Button>
              )}
              <Button onClick={handleMessage} className="w-full gap-2" variant="outline">
                <MessageCircle size={16} />
                Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Post-call feedback */}
      <CallFeedbackModal
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        interactionId={interactionId}
        buyerId={buyerId}
        sellerId={sellerId}
      />

      {/* Chat sheet */}
      <SellerChatSheet
        open={chatOpen}
        onOpenChange={setChatOpen}
        sellerId={sellerId}
        sellerName={sellerName}
        productId={productId ?? null}
        productName={productName}
        productImage={productImage}
        productPrice={productPrice}
      />
    </>
  );
}
