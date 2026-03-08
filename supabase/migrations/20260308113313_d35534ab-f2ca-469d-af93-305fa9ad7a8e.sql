-- Add missing service booking statuses to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'requested';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'rescheduled';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'no_show';