import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { Phone, CheckCircle } from 'lucide-react';

const FEEDBACK_OPTIONS = [
  { value: 'connected_discussed', label: 'Call connected & discussion happened' },
  { value: 'connected_no_agreement', label: 'Call connected but no agreement' },
  { value: 'no_answer', label: 'Seller did not answer the call' },
  { value: 'unreachable', label: 'Number unreachable / incorrect' },
  { value: 'agreement_reached', label: 'Agreement reached / service confirmed' },
  { value: 'need_more_info', label: 'Need more info / seller will call back' },
] as const;

interface CallFeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  interactionId: string | null;
  buyerId: string;
  sellerId: string;
}

export function CallFeedbackModal({ open, onOpenChange, interactionId, buyerId, sellerId }: CallFeedbackModalProps) {
  const [selected, setSelected] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selected || !interactionId) return;
    setSubmitting(true);
    try {
      await supabase.from('call_feedback').insert({
        interaction_id: interactionId,
        buyer_id: buyerId,
        seller_id: sellerId,
        outcome: selected,
      });
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setSelected('');
      }, 1200);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!submitting) { onOpenChange(v); setSubmitted(false); setSelected(''); } }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Phone size={18} className="text-primary" />
            How was the call?
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <CheckCircle size={40} className="text-primary" />
            <p className="text-sm font-medium text-foreground">Thanks for your feedback!</p>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <RadioGroup value={selected} onValueChange={setSelected}>
              {FEEDBACK_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                >
                  <RadioGroupItem value={opt.value} className="mt-0.5" />
                  <span className="text-sm text-foreground leading-snug">{opt.label}</span>
                </label>
              ))}
            </RadioGroup>
            <Button
              onClick={handleSubmit}
              disabled={!selected || submitting}
              className="w-full"
            >
              {submitting ? 'Submitting…' : 'Submit Feedback'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
