import { useState, useEffect, useRef } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle } from 'lucide-react';
import { useSellerChat, ChatMessage } from '@/hooks/useSellerChat';
import { cn } from '@/lib/utils';

interface SellerChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sellerId: string;
  sellerName: string;
  productId: string | null;
  productName?: string;
  productImage?: string | null;
  productPrice?: string;
}

export function SellerChatSheet({
  open, onOpenChange, sellerId, sellerName,
  productId, productName, productImage, productPrice,
}: SellerChatSheetProps) {
  const { messages, loading, sending, buyerId, initConversation, sendMessage } = useSellerChat(sellerId, productId);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (open && !initialized.current) {
      initialized.current = true;
      initConversation();
    }
    if (!open) initialized.current = false;
  }, [open, initConversation]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const msg = text;
    setText('');
    await sendMessage(msg);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] outline-none">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2 text-base">
            <MessageCircle size={18} className="text-primary" />
            Chat with {sellerName}
          </DrawerTitle>
        </DrawerHeader>

        {/* Product context */}
        {productName && (
          <div className="mx-4 mb-2 flex items-center gap-3 p-2.5 bg-muted rounded-lg">
            {productImage && (
              <img src={productImage} alt="" className="w-10 h-10 rounded-md object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{productName}</p>
              {productPrice && <p className="text-xs text-muted-foreground">{productPrice}</p>}
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-2 min-h-[200px] max-h-[50vh]">
          {loading && <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Start the conversation by sending a message</p>
          )}
          {messages.map((msg: ChatMessage) => {
            const isMe = msg.sender_id === buyerId;
            return (
              <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
                  isMe
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                )}>
                  <p className="whitespace-pre-wrap break-words">{msg.message_text}</p>
                  <p className={cn(
                    'text-[10px] mt-0.5',
                    isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'
                  )}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-border flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <Button size="icon" onClick={handleSend} disabled={!text.trim() || sending}>
            <Send size={18} />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
