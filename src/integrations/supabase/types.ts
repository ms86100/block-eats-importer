export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          society_id: string | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          society_id?: string | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          society_id?: string | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_config: {
        Row: {
          badge_label: string
          color: string
          created_at: string
          id: string
          is_active: boolean
          layout_visibility: string[]
          priority: number
          tag_key: string
        }
        Insert: {
          badge_label: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          layout_visibility?: string[]
          priority?: number
          tag_key: string
        }
        Update: {
          badge_label?: string
          color?: string
          created_at?: string
          id?: string
          is_active?: boolean
          layout_visibility?: string[]
          priority?: number
          tag_key?: string
        }
        Relationships: []
      }
      builder_announcements: {
        Row: {
          body: string
          builder_id: string
          category: string
          created_at: string
          id: string
          posted_by: string
          society_id: string
          title: string
        }
        Insert: {
          body: string
          builder_id: string
          category?: string
          created_at?: string
          id?: string
          posted_by: string
          society_id: string
          title: string
        }
        Update: {
          body?: string
          builder_id?: string
          category?: string
          created_at?: string
          id?: string
          posted_by?: string
          society_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_announcements_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_announcements_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_announcements_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_feature_packages: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          builder_id: string
          expires_at: string | null
          id: string
          package_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          builder_id: string
          expires_at?: string | null
          id?: string
          package_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          builder_id?: string
          expires_at?: string | null
          id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_feature_packages_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_feature_packages_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_feature_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "feature_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_members: {
        Row: {
          builder_id: string
          created_at: string
          deactivated_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          builder_id: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          builder_id?: string
          created_at?: string
          deactivated_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_members_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      builder_societies: {
        Row: {
          builder_id: string
          created_at: string
          id: string
          society_id: string
        }
        Insert: {
          builder_id: string
          created_at?: string
          id?: string
          society_id: string
        }
        Update: {
          builder_id?: string
          created_at?: string
          id?: string
          society_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "builder_societies_builder_id_fkey"
            columns: ["builder_id"]
            isOneToOne: false
            referencedRelation: "builders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "builder_societies_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      builders: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulletin_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "bulletin_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletin_posts: {
        Row: {
          ai_summary: string | null
          attachment_urls: string[] | null
          author_id: string
          body: string | null
          category: string
          comment_count: number
          created_at: string
          event_date: string | null
          event_location: string | null
          id: string
          is_archived: boolean
          is_pinned: boolean
          poll_deadline: string | null
          poll_options: Json | null
          rsvp_enabled: boolean
          society_id: string
          title: string
          updated_at: string
          vote_count: number
        }
        Insert: {
          ai_summary?: string | null
          attachment_urls?: string[] | null
          author_id: string
          body?: string | null
          category?: string
          comment_count?: number
          created_at?: string
          event_date?: string | null
          event_location?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          poll_deadline?: string | null
          poll_options?: Json | null
          rsvp_enabled?: boolean
          society_id: string
          title: string
          updated_at?: string
          vote_count?: number
        }
        Update: {
          ai_summary?: string | null
          attachment_urls?: string[] | null
          author_id?: string
          body?: string | null
          category?: string
          comment_count?: number
          created_at?: string
          event_date?: string | null
          event_location?: string | null
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          poll_deadline?: string | null
          poll_options?: Json | null
          rsvp_enabled?: boolean
          society_id?: string
          title?: string
          updated_at?: string
          vote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulletin_posts_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletin_rsvps: {
        Row: {
          created_at: string
          id: string
          post_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_rsvps_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "bulletin_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      bulletin_votes: {
        Row: {
          created_at: string
          id: string
          poll_option_id: string | null
          post_id: string
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          poll_option_id?: string | null
          post_id: string
          user_id: string
          vote_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          poll_option_id?: string | null
          post_id?: string
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulletin_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "bulletin_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      category_config: {
        Row: {
          category: Database["public"]["Enums"]["service_category"]
          color: string
          created_at: string | null
          display_name: string
          display_order: number | null
          enquiry_only: boolean | null
          has_date_range: boolean | null
          has_duration: boolean | null
          has_quantity: boolean | null
          icon: string
          id: string
          is_active: boolean | null
          is_negotiable: boolean | null
          is_physical_product: boolean | null
          layout_type: string
          parent_group: string
          requires_delivery: boolean | null
          requires_preparation: boolean | null
          requires_time_slot: boolean | null
          supports_cart: boolean | null
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["service_category"]
          color: string
          created_at?: string | null
          display_name: string
          display_order?: number | null
          enquiry_only?: boolean | null
          has_date_range?: boolean | null
          has_duration?: boolean | null
          has_quantity?: boolean | null
          icon: string
          id?: string
          is_active?: boolean | null
          is_negotiable?: boolean | null
          is_physical_product?: boolean | null
          layout_type?: string
          parent_group: string
          requires_delivery?: boolean | null
          requires_preparation?: boolean | null
          requires_time_slot?: boolean | null
          supports_cart?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"]
          color?: string
          created_at?: string | null
          display_name?: string
          display_order?: number | null
          enquiry_only?: boolean | null
          has_date_range?: boolean | null
          has_duration?: boolean | null
          has_quantity?: boolean | null
          icon?: string
          id?: string
          is_active?: boolean | null
          is_negotiable?: boolean | null
          is_physical_product?: boolean | null
          layout_type?: string
          parent_group?: string
          requires_delivery?: boolean | null
          requires_preparation?: boolean | null
          requires_time_slot?: boolean | null
          supports_cart?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "category_config_parent_group_fkey"
            columns: ["parent_group"]
            isOneToOne: false
            referencedRelation: "parent_groups"
            referencedColumns: ["slug"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string | null
          id: string
          message_text: string
          order_id: string
          read_status: boolean | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message_text: string
          order_id: string
          read_status?: boolean | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message_text?: string
          order_id?: string
          read_status?: boolean | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_milestones: {
        Row: {
          completion_percentage: number
          created_at: string
          description: string | null
          id: string
          photos: string[] | null
          posted_by: string
          society_id: string
          stage: string
          title: string
          tower_id: string | null
        }
        Insert: {
          completion_percentage?: number
          created_at?: string
          description?: string | null
          id?: string
          photos?: string[] | null
          posted_by: string
          society_id: string
          stage?: string
          title: string
          tower_id?: string | null
        }
        Update: {
          completion_percentage?: number
          created_at?: string
          description?: string | null
          id?: string
          photos?: string[] | null
          posted_by?: string
          society_id?: string
          stage?: string
          title?: string
          tower_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_milestones_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_milestones_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          coupon_id: string
          created_at: string
          discount_applied: number
          id: string
          order_id: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_applied?: number
          id?: string
          order_id: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_applied?: number
          id?: string
          order_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount_amount: number | null
          min_order_amount: number | null
          per_user_limit: number
          seller_id: string
          show_to_buyers: boolean
          society_id: string
          starts_at: string
          times_used: number
          updated_at: string
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          per_user_limit?: number
          seller_id: string
          show_to_buyers?: boolean
          society_id: string
          starts_at?: string
          times_used?: number
          updated_at?: string
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount_amount?: number | null
          min_order_amount?: number | null
          per_user_limit?: number
          seller_id?: string
          show_to_buyers?: boolean
          society_id?: string
          starts_at?: string
          times_used?: number
          updated_at?: string
          usage_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          token: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_committee_note: boolean
          ticket_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_committee_note?: boolean
          ticket_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_committee_note?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "dispute_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_tickets: {
        Row: {
          acknowledged_at: string | null
          category: string
          created_at: string
          description: string
          id: string
          is_anonymous: boolean
          photo_urls: string[] | null
          resolution_note: string | null
          resolved_at: string | null
          sla_deadline: string
          society_id: string
          status: string
          submitted_by: string
        }
        Insert: {
          acknowledged_at?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          is_anonymous?: boolean
          photo_urls?: string[] | null
          resolution_note?: string | null
          resolved_at?: string | null
          sla_deadline?: string
          society_id: string
          status?: string
          submitted_by: string
        }
        Update: {
          acknowledged_at?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_anonymous?: boolean
          photo_urls?: string[] | null
          resolution_note?: string | null
          resolved_at?: string | null
          sla_deadline?: string
          society_id?: string
          status?: string
          submitted_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_tickets_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispute_tickets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_broadcasts: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          sent_by: string
          society_id: string
          title: string
        }
        Insert: {
          body: string
          category?: string
          created_at?: string
          id?: string
          sent_by: string
          society_id: string
          title: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          sent_by?: string
          society_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_broadcasts_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_broadcasts_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_flags: {
        Row: {
          admin_response: string | null
          created_at: string
          expense_id: string
          flagged_by: string
          id: string
          reason: string
          status: string
        }
        Insert: {
          admin_response?: string | null
          created_at?: string
          expense_id: string
          flagged_by: string
          id?: string
          reason: string
          status?: string
        }
        Update: {
          admin_response?: string | null
          created_at?: string
          expense_id?: string
          flagged_by?: string
          id?: string
          reason?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_flags_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "society_expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_flags_flagged_by_fkey"
            columns: ["flagged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_views: {
        Row: {
          expense_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          expense_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          expense_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_views_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "society_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          id: string
          seller_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          seller_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          seller_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_package_items: {
        Row: {
          enabled: boolean
          feature_id: string
          id: string
          package_id: string
        }
        Insert: {
          enabled?: boolean
          feature_id: string
          id?: string
          package_id: string
        }
        Update: {
          enabled?: boolean
          feature_id?: string
          id?: string
          package_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_package_items_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "platform_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "feature_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_packages: {
        Row: {
          created_at: string
          description: string | null
          id: string
          package_name: string
          price_tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          package_name: string
          price_tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          package_name?: string
          price_tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      featured_items: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          link_url: string | null
          reference_id: string
          society_id: string | null
          title: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          reference_id: string
          society_id?: string | null
          title?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          link_url?: string | null
          reference_id?: string
          society_id?: string | null
          title?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "featured_items_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      gate_entries: {
        Row: {
          confirmation_status: string | null
          created_at: string
          entry_time: string
          entry_type: string
          flat_number: string | null
          id: string
          notes: string | null
          resident_name: string | null
          society_id: string
          user_id: string | null
          verified_by: string | null
        }
        Insert: {
          confirmation_status?: string | null
          created_at?: string
          entry_time?: string
          entry_type?: string
          flat_number?: string | null
          id?: string
          notes?: string | null
          resident_name?: string | null
          society_id: string
          user_id?: string | null
          verified_by?: string | null
        }
        Update: {
          confirmation_status?: string | null
          created_at?: string
          entry_time?: string
          entry_type?: string
          flat_number?: string | null
          id?: string
          notes?: string | null
          resident_name?: string | null
          society_id?: string
          user_id?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gate_entries_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gate_entries_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_requests: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          expires_at: string
          id: string
          response_count: number
          society_id: string
          status: string
          tag: string
          title: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          expires_at?: string
          id?: string
          response_count?: number
          society_id: string
          status?: string
          tag?: string
          title: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          expires_at?: string
          id?: string
          response_count?: number
          society_id?: string
          status?: string
          tag?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_requests_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_requests_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      help_responses: {
        Row: {
          created_at: string
          id: string
          message: string
          request_id: string
          responder_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          request_id: string
          responder_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          request_id?: string
          responder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "help_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_responses_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_dues: {
        Row: {
          amount: number
          created_at: string
          flat_identifier: string
          id: string
          month: string
          paid_date: string | null
          receipt_url: string | null
          resident_id: string | null
          society_id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          flat_identifier: string
          id?: string
          month: string
          paid_date?: string | null
          receipt_url?: string | null
          resident_id?: string | null
          society_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          flat_identifier?: string
          id?: string
          month?: string
          paid_date?: string | null
          receipt_url?: string | null
          resident_id?: string | null
          society_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_dues_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_dues_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_entry_requests: {
        Row: {
          claimed_name: string
          created_at: string
          expires_at: string
          flat_number: string
          id: string
          requested_by: string | null
          resident_id: string | null
          responded_at: string | null
          society_id: string
          status: string
        }
        Insert: {
          claimed_name: string
          created_at?: string
          expires_at?: string
          flat_number: string
          id?: string
          requested_by?: string | null
          resident_id?: string | null
          responded_at?: string | null
          society_id: string
          status?: string
        }
        Update: {
          claimed_name?: string
          created_at?: string
          expires_at?: string
          flat_number?: string
          id?: string
          requested_by?: string | null
          resident_id?: string | null
          responded_at?: string | null
          society_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_entry_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_entry_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_entry_requests_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_events: {
        Row: {
          category: string | null
          created_at: string
          event_type: string
          id: string
          layout_type: string | null
          metadata: Json | null
          product_id: string | null
          seller_id: string | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          event_type: string
          id?: string
          layout_type?: string | null
          metadata?: Json | null
          product_id?: string | null
          seller_id?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          event_type?: string
          id?: string
          layout_type?: string | null
          metadata?: Json | null
          product_id?: string | null
          seller_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      milestone_reactions: {
        Row: {
          created_at: string
          id: string
          milestone_id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          milestone_id: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          milestone_id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestone_reactions_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "construction_milestones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestone_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          body: string
          created_at: string
          id: string
          payload: Json | null
          processed_at: string | null
          reference_path: string | null
          status: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          reference_path?: string | null
          status?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          reference_path?: string | null
          status?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          status: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          status?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          status?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          auto_cancel_at: string | null
          buyer_id: string | null
          coupon_id: string | null
          created_at: string | null
          delivery_address: string | null
          delivery_fee: number
          deposit_paid: boolean | null
          deposit_refunded: boolean | null
          discount_amount: number | null
          fulfillment_type: string
          id: string
          idempotency_key: string | null
          notes: string | null
          order_type: string | null
          payment_status: string | null
          payment_type: string | null
          rejection_reason: string | null
          rental_end_date: string | null
          rental_start_date: string | null
          scheduled_date: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          seller_id: string | null
          society_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          auto_cancel_at?: string | null
          buyer_id?: string | null
          coupon_id?: string | null
          created_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          deposit_paid?: boolean | null
          deposit_refunded?: boolean | null
          discount_amount?: number | null
          fulfillment_type?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_type?: string | null
          payment_status?: string | null
          payment_type?: string | null
          rejection_reason?: string | null
          rental_end_date?: string | null
          rental_start_date?: string | null
          scheduled_date?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          seller_id?: string | null
          society_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          auto_cancel_at?: string | null
          buyer_id?: string | null
          coupon_id?: string | null
          created_at?: string | null
          delivery_address?: string | null
          delivery_fee?: number
          deposit_paid?: boolean | null
          deposit_refunded?: boolean | null
          discount_amount?: number | null
          fulfillment_type?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_type?: string | null
          payment_status?: string | null
          payment_type?: string | null
          rejection_reason?: string | null
          rental_end_date?: string | null
          rental_start_date?: string | null
          scheduled_date?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          seller_id?: string | null
          society_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_groups: {
        Row: {
          color: string
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          layout_type: string | null
          license_description: string | null
          license_mandatory: boolean
          license_type_name: string | null
          name: string
          requires_license: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          layout_type?: string | null
          license_description?: string | null
          license_mandatory?: boolean
          license_type_name?: string | null
          name: string
          requires_license?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          layout_type?: string | null
          license_description?: string | null
          license_mandatory?: boolean
          license_type_name?: string | null
          name?: string
          requires_license?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          amount: number
          buyer_id: string
          created_at: string | null
          id: string
          idempotency_key: string | null
          net_amount: number | null
          order_id: string
          payment_method: string
          payment_status: string
          platform_fee: number | null
          seller_id: string | null
          transaction_reference: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          buyer_id: string
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          net_amount?: number | null
          order_id: string
          payment_method?: string
          payment_status?: string
          platform_fee?: number | null
          seller_id?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          buyer_id?: string
          created_at?: string | null
          id?: string
          idempotency_key?: string | null
          net_amount?: number | null
          order_id?: string
          payment_method?: string
          payment_status?: string
          platform_fee?: number | null
          seller_id?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_features: {
        Row: {
          category: string
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_core: boolean
          is_experimental: boolean
          society_configurable: boolean
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_core?: boolean
          is_experimental?: boolean
          society_configurable?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_core?: boolean
          is_experimental?: boolean
          society_configurable?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          approval_status: string
          available_slots: Json | null
          category: string
          condition: string | null
          created_at: string | null
          deposit_amount: number | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_bestseller: boolean | null
          is_negotiable: boolean | null
          is_recommended: boolean | null
          is_urgent: boolean | null
          is_veg: boolean | null
          listing_type: string | null
          location_required: boolean | null
          max_rental_duration: number | null
          min_rental_duration: number | null
          name: string
          price: number
          rental_period_type: string | null
          seller_id: string
          service_duration_minutes: number | null
          society_id: string | null
          specifications: Json | null
          stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          approval_status?: string
          available_slots?: Json | null
          category: string
          condition?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_bestseller?: boolean | null
          is_negotiable?: boolean | null
          is_recommended?: boolean | null
          is_urgent?: boolean | null
          is_veg?: boolean | null
          listing_type?: string | null
          location_required?: boolean | null
          max_rental_duration?: number | null
          min_rental_duration?: number | null
          name: string
          price: number
          rental_period_type?: string | null
          seller_id: string
          service_duration_minutes?: number | null
          society_id?: string | null
          specifications?: Json | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          approval_status?: string
          available_slots?: Json | null
          category?: string
          condition?: string | null
          created_at?: string | null
          deposit_amount?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_bestseller?: boolean | null
          is_negotiable?: boolean | null
          is_recommended?: boolean | null
          is_urgent?: boolean | null
          is_veg?: boolean | null
          listing_type?: string | null
          location_required?: boolean | null
          max_rental_duration?: number | null
          min_rental_duration?: number | null
          name?: string
          price?: number
          rental_period_type?: string | null
          seller_id?: string
          service_duration_minutes?: number | null
          society_id?: string | null
          specifications?: Json | null
          stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          block: string
          created_at: string | null
          email: string | null
          flat_number: string
          id: string
          name: string
          phase: string | null
          phone: string
          society_id: string | null
          updated_at: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          avatar_url?: string | null
          block: string
          created_at?: string | null
          email?: string | null
          flat_number: string
          id: string
          name: string
          phase?: string | null
          phone: string
          society_id?: string | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          avatar_url?: string | null
          block?: string
          created_at?: string | null
          email?: string | null
          flat_number?: string
          id?: string
          name?: string
          phase?: string | null
          phone?: string
          society_id?: string | null
          updated_at?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      project_towers: {
        Row: {
          created_at: string
          current_percentage: number
          current_stage: string
          delay_category: string | null
          delay_reason: string | null
          expected_completion: string | null
          id: string
          name: string
          revised_completion: string | null
          society_id: string
          total_floors: number
        }
        Insert: {
          created_at?: string
          current_percentage?: number
          current_stage?: string
          delay_category?: string | null
          delay_reason?: string | null
          expected_completion?: string | null
          id?: string
          name: string
          revised_completion?: string | null
          society_id: string
          total_floors?: number
        }
        Update: {
          created_at?: string
          current_percentage?: number
          current_stage?: string
          delay_category?: string | null
          delay_reason?: string | null
          expected_completion?: string | null
          id?: string
          name?: string
          revised_completion?: string | null
          society_id?: string
          total_floors?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_towers_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          buyer_id: string | null
          comment: string | null
          created_at: string | null
          hidden_reason: string | null
          id: string
          is_hidden: boolean | null
          order_id: string
          rating: number
          seller_id: string
        }
        Insert: {
          buyer_id?: string | null
          comment?: string | null
          created_at?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean | null
          order_id: string
          rating: number
          seller_id: string
        }
        Update: {
          buyer_id?: string | null
          comment?: string | null
          created_at?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean | null
          order_id?: string
          rating?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_staff: {
        Row: {
          created_at: string
          deactivated_at: string | null
          id: string
          is_active: boolean | null
          role: string
          society_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          society_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          society_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_staff_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_licenses: {
        Row: {
          admin_notes: string | null
          document_url: string
          group_id: string
          id: string
          license_number: string | null
          license_type: string
          reviewed_at: string | null
          seller_id: string
          status: string
          submitted_at: string
        }
        Insert: {
          admin_notes?: string | null
          document_url: string
          group_id: string
          id?: string
          license_number?: string | null
          license_type: string
          reviewed_at?: string | null
          seller_id: string
          status?: string
          submitted_at?: string
        }
        Update: {
          admin_notes?: string | null
          document_url?: string
          group_id?: string
          id?: string
          license_number?: string | null
          license_type?: string
          reviewed_at?: string | null
          seller_id?: string
          status?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_licenses_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "parent_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_licenses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          accepts_cod: boolean | null
          accepts_upi: boolean | null
          availability_end: string | null
          availability_start: string | null
          business_name: string
          categories: string[]
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          fssai_number: string | null
          id: string
          is_available: boolean | null
          is_featured: boolean | null
          operating_days: string[] | null
          primary_group: string | null
          profile_image_url: string | null
          rating: number | null
          society_id: string | null
          total_reviews: number | null
          updated_at: string | null
          upi_id: string | null
          user_id: string
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          accepts_cod?: boolean | null
          accepts_upi?: boolean | null
          availability_end?: string | null
          availability_start?: string | null
          business_name: string
          categories?: string[]
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          fssai_number?: string | null
          id?: string
          is_available?: boolean | null
          is_featured?: boolean | null
          operating_days?: string[] | null
          primary_group?: string | null
          profile_image_url?: string | null
          rating?: number | null
          society_id?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          upi_id?: string | null
          user_id: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          accepts_cod?: boolean | null
          accepts_upi?: boolean | null
          availability_end?: string | null
          availability_start?: string | null
          business_name?: string
          categories?: string[]
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          fssai_number?: string | null
          id?: string
          is_available?: boolean | null
          is_featured?: boolean | null
          operating_days?: string[] | null
          primary_group?: string | null
          profile_image_url?: string | null
          rating?: number | null
          society_id?: string | null
          total_reviews?: number | null
          updated_at?: string | null
          upi_id?: string | null
          user_id?: string
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_endorsements: {
        Row: {
          comment: string | null
          created_at: string
          endorser_id: string
          id: string
          skill_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          endorser_id: string
          id?: string
          skill_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          endorser_id?: string
          id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_endorser_id_fkey"
            columns: ["endorser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_endorsements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_listings: {
        Row: {
          availability: string | null
          created_at: string
          description: string | null
          endorsement_count: number
          id: string
          skill_name: string
          society_id: string
          trust_score: number
          user_id: string
        }
        Insert: {
          availability?: string | null
          created_at?: string
          description?: string | null
          endorsement_count?: number
          id?: string
          skill_name: string
          society_id: string
          trust_score?: number
          user_id: string
        }
        Update: {
          availability?: string | null
          created_at?: string
          description?: string | null
          endorsement_count?: number
          id?: string
          skill_name?: string
          society_id?: string
          trust_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_listings_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      snag_tickets: {
        Row: {
          acknowledged_at: string | null
          assigned_to_name: string | null
          category: string
          created_at: string
          description: string
          fixed_at: string | null
          flat_number: string
          id: string
          photo_urls: string[] | null
          reported_by: string
          sla_deadline: string
          society_id: string
          status: string
          title: string | null
          tower_id: string | null
          verified_at: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          assigned_to_name?: string | null
          category?: string
          created_at?: string
          description: string
          fixed_at?: string | null
          flat_number: string
          id?: string
          photo_urls?: string[] | null
          reported_by: string
          sla_deadline?: string
          society_id: string
          status?: string
          title?: string | null
          tower_id?: string | null
          verified_at?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          assigned_to_name?: string | null
          category?: string
          created_at?: string
          description?: string
          fixed_at?: string | null
          flat_number?: string
          id?: string
          photo_urls?: string[] | null
          reported_by?: string
          sla_deadline?: string
          society_id?: string
          status?: string
          title?: string | null
          tower_id?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "snag_tickets_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snag_tickets_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snag_tickets_tower_id_fkey"
            columns: ["tower_id"]
            isOneToOne: false
            referencedRelation: "project_towers"
            referencedColumns: ["id"]
          },
        ]
      }
      societies: {
        Row: {
          address: string | null
          admin_user_id: string | null
          approval_method: string | null
          auto_approve_residents: boolean | null
          builder_id: string | null
          city: string | null
          created_at: string
          geofence_radius_meters: number | null
          id: string
          invite_code: string | null
          is_active: boolean | null
          is_under_construction: boolean
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          max_society_admins: number | null
          member_count: number | null
          name: string
          pincode: string | null
          rules_text: string | null
          slug: string
          state: string | null
          trust_score: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          admin_user_id?: string | null
          approval_method?: string | null
          auto_approve_residents?: boolean | null
          builder_id?: string | null
          city?: string | null
          created_at?: string
          geofence_radius_meters?: number | null
          id?: string
          invite_code?: string | null
          is_active?: boolean | null
          is_under_construction?: boolean
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          max_society_admins?: number | null
          member_count?: number | null
          name: string
          pincode?: string | null
          rules_text?: string | null
          slug: string
          state?: string | null
          trust_score?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          admin_user_id?: string | null
          approval_method?: string | null
          auto_approve_residents?: boolean | null
          builder_id?: string | null
          city?: string | null
          created_at?: string
          geofence_radius_meters?: number | null
          id?: string
          invite_code?: string | null
          is_active?: boolean | null
          is_under_construction?: boolean
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          max_society_admins?: number | null
          member_count?: number | null
          name?: string
          pincode?: string | null
          rules_text?: string | null
          slug?: string
          state?: string | null
          trust_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "societies_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      society_activity: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          reference_id: string | null
          reference_type: string | null
          society_id: string
          title: string
          tower_id: string | null
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          reference_id?: string | null
          reference_type?: string | null
          society_id: string
          title: string
          tower_id?: string | null
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          reference_id?: string | null
          reference_type?: string | null
          society_id?: string
          title?: string
          tower_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "society_activity_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_activity_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      society_admins: {
        Row: {
          appointed_by: string | null
          created_at: string
          deactivated_at: string | null
          id: string
          role: string
          society_id: string
          user_id: string
        }
        Insert: {
          appointed_by?: string | null
          created_at?: string
          deactivated_at?: string | null
          id?: string
          role?: string
          society_id: string
          user_id: string
        }
        Update: {
          appointed_by?: string | null
          created_at?: string
          deactivated_at?: string | null
          id?: string
          role?: string
          society_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "society_admins_appointed_by_fkey"
            columns: ["appointed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_admins_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      society_expenses: {
        Row: {
          added_by: string
          amount: number
          category: string
          created_at: string
          expense_date: string
          id: string
          invoice_url: string | null
          society_id: string
          title: string
          vendor_name: string | null
        }
        Insert: {
          added_by: string
          amount: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          invoice_url?: string | null
          society_id: string
          title: string
          vendor_name?: string | null
        }
        Update: {
          added_by?: string
          amount?: number
          category?: string
          created_at?: string
          expense_date?: string
          id?: string
          invoice_url?: string | null
          society_id?: string
          title?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "society_expenses_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_expenses_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      society_feature_overrides: {
        Row: {
          feature_id: string
          id: string
          is_enabled: boolean
          overridden_at: string
          overridden_by: string | null
          society_id: string
        }
        Insert: {
          feature_id: string
          id?: string
          is_enabled: boolean
          overridden_at?: string
          overridden_by?: string | null
          society_id: string
        }
        Update: {
          feature_id?: string
          id?: string
          is_enabled?: boolean
          overridden_at?: string
          overridden_by?: string | null
          society_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "society_feature_overrides_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "platform_features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_feature_overrides_overridden_by_fkey"
            columns: ["overridden_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_feature_overrides_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      society_income: {
        Row: {
          added_by: string
          amount: number
          created_at: string
          description: string | null
          id: string
          income_date: string
          society_id: string
          source: string
        }
        Insert: {
          added_by: string
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string
          society_id: string
          source?: string
        }
        Update: {
          added_by?: string
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          income_date?: string
          society_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "society_income_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "society_income_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_deliveries: {
        Row: {
          created_at: string
          id: string
          order_id: string | null
          scheduled_date: string
          status: string
          subscription_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id?: string | null
          scheduled_date: string
          status?: string
          subscription_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string | null
          scheduled_date?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          buyer_id: string
          created_at: string
          delivery_days: string[] | null
          frequency: string
          id: string
          next_delivery_date: string
          pause_until: string | null
          product_id: string
          quantity: number
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          delivery_days?: string[] | null
          frequency?: string
          id?: string
          next_delivery_date?: string
          pause_until?: string | null
          product_id: string
          quantity?: number
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          delivery_days?: string[] | null
          frequency?: string
          id?: string
          next_delivery_date?: string
          pause_until?: string | null
          product_id?: string
          quantity?: number
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      trigger_errors: {
        Row: {
          created_at: string
          error_detail: string | null
          error_message: string
          id: string
          table_name: string
          trigger_name: string
        }
        Insert: {
          created_at?: string
          error_detail?: string | null
          error_message: string
          id?: string
          table_name: string
          trigger_name: string
        }
        Update: {
          created_at?: string
          error_detail?: string | null
          error_message?: string
          id?: string
          table_name?: string
          trigger_name?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          reference_id: string | null
          reference_path: string | null
          society_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_path?: string | null
          society_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          reference_id?: string | null
          reference_path?: string | null
          society_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_society_id_fkey"
            columns: ["society_id"]
            isOneToOne: false
            referencedRelation: "societies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_society: {
        Args: { _society_id: string; _user_id: string }
        Returns: boolean
      }
      can_write_to_society: {
        Args: { _society_id: string; _user_id: string }
        Returns: boolean
      }
      get_effective_society_features: {
        Args: { _society_id: string }
        Returns: {
          feature_key: string
          is_enabled: boolean
          society_configurable: boolean
          source: string
        }[]
      }
      get_user_auth_context: { Args: { _user_id: string }; Returns: Json }
      get_user_society_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_builder_for_society: {
        Args: { _society_id: string; _user_id: string }
        Returns: boolean
      }
      is_builder_member: {
        Args: { _builder_id: string; _user_id: string }
        Returns: boolean
      }
      is_feature_enabled_for_society: {
        Args: { _feature_key: string; _society_id: string }
        Returns: boolean
      }
      is_security_officer: {
        Args: { _society_id: string; _user_id: string }
        Returns: boolean
      }
      is_society_admin: {
        Args: { _society_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      order_status:
        | "placed"
        | "accepted"
        | "preparing"
        | "ready"
        | "picked_up"
        | "delivered"
        | "completed"
        | "cancelled"
        | "enquired"
        | "quoted"
        | "scheduled"
        | "in_progress"
        | "returned"
      service_category:
        | "home_food"
        | "bakery"
        | "snacks"
        | "groceries"
        | "beverages"
        | "tuition"
        | "daycare"
        | "coaching"
        | "yoga"
        | "dance"
        | "music"
        | "art_craft"
        | "language"
        | "fitness"
        | "electrician"
        | "plumber"
        | "carpenter"
        | "ac_service"
        | "pest_control"
        | "appliance_repair"
        | "maid"
        | "cook"
        | "driver"
        | "nanny"
        | "tailoring"
        | "laundry"
        | "beauty"
        | "mehendi"
        | "salon"
        | "tax_consultant"
        | "it_support"
        | "tutoring"
        | "resume_writing"
        | "equipment_rental"
        | "vehicle_rental"
        | "party_supplies"
        | "baby_gear"
        | "furniture"
        | "electronics"
        | "books"
        | "toys"
        | "kitchen"
        | "clothing"
        | "catering"
        | "decoration"
        | "photography"
        | "dj_music"
        | "pet_food"
        | "pet_grooming"
        | "pet_sitting"
        | "dog_walking"
        | "flat_rent"
        | "roommate"
        | "parking"
      user_role: "buyer" | "seller" | "admin" | "security_officer"
      verification_status: "pending" | "approved" | "rejected" | "suspended"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      order_status: [
        "placed",
        "accepted",
        "preparing",
        "ready",
        "picked_up",
        "delivered",
        "completed",
        "cancelled",
        "enquired",
        "quoted",
        "scheduled",
        "in_progress",
        "returned",
      ],
      service_category: [
        "home_food",
        "bakery",
        "snacks",
        "groceries",
        "beverages",
        "tuition",
        "daycare",
        "coaching",
        "yoga",
        "dance",
        "music",
        "art_craft",
        "language",
        "fitness",
        "electrician",
        "plumber",
        "carpenter",
        "ac_service",
        "pest_control",
        "appliance_repair",
        "maid",
        "cook",
        "driver",
        "nanny",
        "tailoring",
        "laundry",
        "beauty",
        "mehendi",
        "salon",
        "tax_consultant",
        "it_support",
        "tutoring",
        "resume_writing",
        "equipment_rental",
        "vehicle_rental",
        "party_supplies",
        "baby_gear",
        "furniture",
        "electronics",
        "books",
        "toys",
        "kitchen",
        "clothing",
        "catering",
        "decoration",
        "photography",
        "dj_music",
        "pet_food",
        "pet_grooming",
        "pet_sitting",
        "dog_walking",
        "flat_rent",
        "roommate",
        "parking",
      ],
      user_role: ["buyer", "seller", "admin", "security_officer"],
      verification_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
