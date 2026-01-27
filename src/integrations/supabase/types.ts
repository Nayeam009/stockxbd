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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      community_order_items: {
        Row: {
          brand_name: string | null
          created_at: string | null
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          product_type: string
          quantity: number
          return_cylinder_brand: string | null
          return_cylinder_qty: number | null
          return_cylinder_type: string | null
          weight: string | null
        }
        Insert: {
          brand_name?: string | null
          created_at?: string | null
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          product_name: string
          product_type: string
          quantity?: number
          return_cylinder_brand?: string | null
          return_cylinder_qty?: number | null
          return_cylinder_type?: string | null
          weight?: string | null
        }
        Update: {
          brand_name?: string | null
          created_at?: string | null
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          product_type?: string
          quantity?: number
          return_cylinder_brand?: string | null
          return_cylinder_qty?: number | null
          return_cylinder_type?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "community_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      community_orders: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          customer_id: string
          customer_name: string
          customer_phone: string
          customer_type: string | null
          delivered_at: string | null
          delivery_address: string
          delivery_fee: number | null
          dispatched_at: string | null
          district: string
          division: string
          id: string
          is_self_order: boolean | null
          order_notes: string | null
          order_number: string
          payment_method: string | null
          payment_status: string | null
          payment_trx_id: string | null
          rejection_reason: string | null
          reserved_at: string | null
          return_cylinder_verified: boolean | null
          shop_id: string
          status: string | null
          subtotal: number
          thana: string | null
          total_amount: number
          updated_at: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          customer_id: string
          customer_name: string
          customer_phone: string
          customer_type?: string | null
          delivered_at?: string | null
          delivery_address: string
          delivery_fee?: number | null
          dispatched_at?: string | null
          district: string
          division: string
          id?: string
          is_self_order?: boolean | null
          order_notes?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string | null
          payment_trx_id?: string | null
          rejection_reason?: string | null
          reserved_at?: string | null
          return_cylinder_verified?: boolean | null
          shop_id: string
          status?: string | null
          subtotal: number
          thana?: string | null
          total_amount: number
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string
          customer_type?: string | null
          delivered_at?: string | null
          delivery_address?: string
          delivery_fee?: number | null
          dispatched_at?: string | null
          district?: string
          division?: string
          id?: string
          is_self_order?: boolean | null
          order_notes?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string | null
          payment_trx_id?: string | null
          rejection_reason?: string | null
          reserved_at?: string | null
          return_cylinder_verified?: boolean | null
          shop_id?: string
          status?: string | null
          subtotal?: number
          thana?: string | null
          total_amount?: number
          updated_at?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_comments: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          author_name: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          author_name: string
          comments_count: number
          content: string
          created_at: string
          id: string
          is_active: boolean
          likes_count: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          comments_count?: number
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          likes_count?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          comments_count?: number
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          likes_count?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_cylinder_profiles: {
        Row: {
          brand_name: string
          created_at: string | null
          cylinder_photo_url: string | null
          id: string
          is_verified: boolean | null
          updated_at: string | null
          user_id: string
          valve_size: string
          weight: string
        }
        Insert: {
          brand_name: string
          created_at?: string | null
          cylinder_photo_url?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string | null
          user_id: string
          valve_size?: string
          weight?: string
        }
        Update: {
          brand_name?: string
          created_at?: string | null
          cylinder_photo_url?: string | null
          id?: string
          is_verified?: boolean | null
          updated_at?: string | null
          user_id?: string
          valve_size?: string
          weight?: string
        }
        Relationships: []
      }
      customer_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          cylinders_collected: number | null
          id: string
          notes: string | null
          payment_date: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          cylinders_collected?: number | null
          id?: string
          notes?: string | null
          payment_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          cylinders_collected?: number | null
          id?: string
          notes?: string | null
          payment_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          billing_status: string | null
          created_at: string
          created_by: string | null
          credit_limit: number | null
          cylinders_due: number | null
          email: string | null
          id: string
          is_demo: boolean | null
          last_order_date: string | null
          name: string
          owner_id: string | null
          phone: string | null
          total_due: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          billing_status?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          cylinders_due?: number | null
          email?: string | null
          id?: string
          is_demo?: boolean | null
          last_order_date?: string | null
          name: string
          owner_id?: string | null
          phone?: string | null
          total_due?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          billing_status?: string | null
          created_at?: string
          created_by?: string | null
          credit_limit?: number | null
          cylinders_due?: number | null
          email?: string | null
          id?: string
          is_demo?: boolean | null
          last_order_date?: string | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          total_due?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cylinder_exchange_requests: {
        Row: {
          brand_name: string
          completed_at: string | null
          created_at: string | null
          id: string
          notes: string | null
          quantity: number
          requester_id: string
          requester_shop_id: string
          responded_at: string | null
          response_notes: string | null
          status: string | null
          target_shop_id: string
          weight: string
        }
        Insert: {
          brand_name: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          quantity: number
          requester_id: string
          requester_shop_id: string
          responded_at?: string | null
          response_notes?: string | null
          status?: string | null
          target_shop_id: string
          weight: string
        }
        Update: {
          brand_name?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          quantity?: number
          requester_id?: string
          requester_shop_id?: string
          responded_at?: string | null
          response_notes?: string | null
          status?: string | null
          target_shop_id?: string
          weight?: string
        }
        Relationships: [
          {
            foreignKeyName: "cylinder_exchange_requests_requester_shop_id_fkey"
            columns: ["requester_shop_id"]
            isOneToOne: false
            referencedRelation: "shop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_exchange_requests_requester_shop_id_fkey"
            columns: ["requester_shop_id"]
            isOneToOne: false
            referencedRelation: "shop_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_exchange_requests_target_shop_id_fkey"
            columns: ["target_shop_id"]
            isOneToOne: false
            referencedRelation: "shop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cylinder_exchange_requests_target_shop_id_fkey"
            columns: ["target_shop_id"]
            isOneToOne: false
            referencedRelation: "shop_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      cylinder_exchanges: {
        Row: {
          author_name: string
          created_at: string
          from_brand: string
          from_weight: string
          id: string
          quantity: number
          status: string
          to_brand: string
          to_weight: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name: string
          created_at?: string
          from_brand: string
          from_weight: string
          id?: string
          quantity?: number
          status?: string
          to_brand: string
          to_weight: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string
          created_at?: string
          from_brand?: string
          from_weight?: string
          id?: string
          quantity?: number
          status?: string
          to_brand?: string
          to_weight?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
          is_demo: boolean | null
          owner_id: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_demo?: boolean | null
          owner_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
          is_demo?: boolean | null
          owner_id?: string | null
        }
        Relationships: []
      }
      inventory_summary: {
        Row: {
          brand_name: string
          count_empty: number
          count_package: number
          count_problem: number
          count_refill: number
          id: string
          last_updated_at: string
          owner_id: string
          total_full: number | null
          valve_size: string
          weight: string
        }
        Insert: {
          brand_name: string
          count_empty?: number
          count_package?: number
          count_problem?: number
          count_refill?: number
          id?: string
          last_updated_at?: string
          owner_id: string
          total_full?: number | null
          valve_size?: string
          weight?: string
        }
        Update: {
          brand_name?: string
          count_empty?: number
          count_package?: number
          count_problem?: number
          count_refill?: number
          id?: string
          last_updated_at?: string
          owner_id?: string
          total_full?: number | null
          valve_size?: string
          weight?: string
        }
        Relationships: []
      }
      invite_validation_attempts: {
        Row: {
          attempted_at: string | null
          code_prefix: string | null
          id: string
          ip_hash: string
          user_id: string | null
        }
        Insert: {
          attempted_at?: string | null
          code_prefix?: string | null
          id?: string
          ip_hash: string
          user_id?: string | null
        }
        Update: {
          attempted_at?: string | null
          code_prefix?: string | null
          id?: string
          ip_hash?: string
          user_id?: string | null
        }
        Relationships: []
      }
      lpg_brands: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          empty_cylinder: number
          id: string
          in_transit_cylinder: number | null
          is_active: boolean
          is_demo: boolean | null
          name: string
          owner_id: string | null
          package_cylinder: number
          problem_cylinder: number
          refill_cylinder: number
          size: string
          updated_at: string
          weight: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          empty_cylinder?: number
          id?: string
          in_transit_cylinder?: number | null
          is_active?: boolean
          is_demo?: boolean | null
          name: string
          owner_id?: string | null
          package_cylinder?: number
          problem_cylinder?: number
          refill_cylinder?: number
          size?: string
          updated_at?: string
          weight?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          empty_cylinder?: number
          id?: string
          in_transit_cylinder?: number | null
          is_active?: boolean
          is_demo?: boolean | null
          name?: string
          owner_id?: string | null
          package_cylinder?: number
          problem_cylinder?: number
          refill_cylinder?: number
          size?: string
          updated_at?: string
          weight?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price: number
          product_id: string | null
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price?: number
          product_id?: string | null
          product_name: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
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
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_name: string
          delivery_address: string
          delivery_date: string | null
          driver_id: string | null
          id: string
          is_demo: boolean | null
          notes: string | null
          order_date: string
          order_number: string
          owner_id: string | null
          payment_status: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name: string
          delivery_address: string
          delivery_date?: string | null
          driver_id?: string | null
          id?: string
          is_demo?: boolean | null
          notes?: string | null
          order_date?: string
          order_number: string
          owner_id?: string | null
          payment_status?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_name?: string
          delivery_address?: string
          delivery_date?: string | null
          driver_id?: string | null
          id?: string
          is_demo?: boolean | null
          notes?: string | null
          order_date?: string
          order_number?: string
          owner_id?: string | null
          payment_status?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pob_transaction_items: {
        Row: {
          brand_id: string | null
          created_at: string
          created_by: string | null
          cylinder_type: string | null
          id: string
          product_name: string
          product_type: string
          quantity: number
          size: string | null
          total_price: number
          transaction_id: string
          unit_price: number
          weight: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          cylinder_type?: string | null
          id?: string
          product_name: string
          product_type: string
          quantity?: number
          size?: string | null
          total_price?: number
          transaction_id: string
          unit_price?: number
          weight?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          created_by?: string | null
          cylinder_type?: string | null
          id?: string
          product_name?: string
          product_type?: string
          quantity?: number
          size?: string | null
          total_price?: number
          transaction_id?: string
          unit_price?: number
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pob_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pob_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      pob_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          discount: number
          id: string
          is_demo: boolean | null
          is_voided: boolean | null
          notes: string | null
          owner_id: string | null
          payment_method: string
          payment_status: string
          subtotal: number
          supplier_name: string
          total: number
          transaction_number: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          is_demo?: boolean | null
          is_voided?: boolean | null
          notes?: string | null
          owner_id?: string | null
          payment_method?: string
          payment_status?: string
          subtotal?: number
          supplier_name?: string
          total?: number
          transaction_number: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          discount?: number
          id?: string
          is_demo?: boolean | null
          is_voided?: boolean | null
          notes?: string | null
          owner_id?: string | null
          payment_method?: string
          payment_status?: string
          subtotal?: number
          supplier_name?: string
          total?: number
          transaction_number?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: []
      }
      pos_transaction_items: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          transaction_id: string
          unit_price: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          transaction_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_transaction_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "pos_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_transactions: {
        Row: {
          community_order_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount: number
          driver_id: string | null
          id: string
          is_demo: boolean | null
          is_online_order: boolean | null
          is_voided: boolean | null
          notes: string | null
          owner_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: string
          subtotal: number
          total: number
          transaction_number: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          community_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          driver_id?: string | null
          id?: string
          is_demo?: boolean | null
          is_online_order?: boolean | null
          is_voided?: boolean | null
          notes?: string | null
          owner_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: string
          subtotal: number
          total: number
          transaction_number: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          community_order_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount?: number
          driver_id?: string | null
          id?: string
          is_demo?: boolean | null
          is_online_order?: boolean | null
          is_voided?: boolean | null
          notes?: string | null
          owner_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: string
          subtotal?: number
          total?: number
          transaction_number?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_transactions_community_order_id_fkey"
            columns: ["community_order_id"]
            isOneToOne: false
            referencedRelation: "community_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          brand_id: string | null
          company_price: number
          created_at: string
          created_by: string | null
          distributor_price: number
          id: string
          is_active: boolean
          is_demo: boolean | null
          owner_id: string | null
          package_price: number
          product_name: string
          product_type: string
          retail_price: number
          size: string | null
          updated_at: string
          variant: string | null
        }
        Insert: {
          brand_id?: string | null
          company_price?: number
          created_at?: string
          created_by?: string | null
          distributor_price?: number
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          owner_id?: string | null
          package_price?: number
          product_name: string
          product_type: string
          retail_price?: number
          size?: string | null
          updated_at?: string
          variant?: string | null
        }
        Update: {
          brand_id?: string | null
          company_price?: number
          created_at?: string
          created_by?: string | null
          distributor_price?: number
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          owner_id?: string | null
          package_price?: number
          product_name?: string
          product_type?: string
          retail_price?: number
          size?: string | null
          updated_at?: string
          variant?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_demo: boolean | null
          name: string
          owner_id: string | null
          price: number
          sku: string | null
          stock_quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["product_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          name: string
          owner_id?: string | null
          price: number
          sku?: string | null
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          name?: string
          owner_id?: string | null
          price?: number
          sku?: string | null
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limit_attempts: {
        Row: {
          action: string
          attempted_at: string
          email: string | null
          id: string
          ip_address: string
          success: boolean | null
        }
        Insert: {
          action: string
          attempted_at?: string
          email?: string | null
          id?: string
          ip_address: string
          success?: boolean | null
        }
        Update: {
          action?: string
          attempted_at?: string
          email?: string | null
          id?: string
          ip_address?: string
          success?: boolean | null
        }
        Relationships: []
      }
      regulators: {
        Row: {
          brand: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_defective: boolean | null
          is_demo: boolean | null
          owner_id: string | null
          price: number | null
          quantity: number
          type: string
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_defective?: boolean | null
          is_demo?: boolean | null
          owner_id?: string | null
          price?: number | null
          quantity?: number
          type?: string
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_defective?: boolean | null
          is_demo?: boolean | null
          owner_id?: string | null
          price?: number | null
          quantity?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_products: {
        Row: {
          brand_name: string
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          price: number
          product_type: string
          reserved_stock: number | null
          shop_id: string
          updated_at: string | null
          valve_size: string | null
          weight: string | null
        }
        Insert: {
          brand_name: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          price: number
          product_type: string
          reserved_stock?: number | null
          shop_id: string
          updated_at?: string | null
          valve_size?: string | null
          weight?: string | null
        }
        Update: {
          brand_name?: string
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          price?: number
          product_type?: string
          reserved_stock?: number | null
          shop_id?: string
          updated_at?: string | null
          valve_size?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_profiles: {
        Row: {
          address: string
          bkash_number: string | null
          cover_image_url: string | null
          created_at: string | null
          delivery_fee: number | null
          description: string | null
          district: string
          division: string
          id: string
          is_open: boolean | null
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          nagad_number: string | null
          online_payment_only: boolean | null
          owner_id: string
          phone: string
          rating: number | null
          rocket_number: string | null
          shop_name: string
          thana: string | null
          total_orders: number | null
          total_reviews: number | null
          updated_at: string | null
          whatsapp: string | null
        }
        Insert: {
          address: string
          bkash_number?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          description?: string | null
          district: string
          division: string
          id?: string
          is_open?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          nagad_number?: string | null
          online_payment_only?: boolean | null
          owner_id: string
          phone: string
          rating?: number | null
          rocket_number?: string | null
          shop_name: string
          thana?: string | null
          total_orders?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string
          bkash_number?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          description?: string | null
          district?: string
          division?: string
          id?: string
          is_open?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          nagad_number?: string | null
          online_payment_only?: boolean | null
          owner_id?: string
          phone?: string
          rating?: number | null
          rocket_number?: string | null
          shop_name?: string
          thana?: string | null
          total_orders?: number | null
          total_reviews?: number | null
          updated_at?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      shop_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string
          id: string
          order_id: string | null
          rating: number
          shop_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          order_id?: string | null
          rating: number
          shop_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          order_id?: string | null
          rating?: number
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "community_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shop_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_demo: boolean | null
          name: string
          owner_id: string | null
          phone: string | null
          role: string
          salary: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          name: string
          owner_id?: string | null
          phone?: string | null
          role?: string
          salary?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          name?: string
          owner_id?: string | null
          phone?: string | null
          role?: string
          salary?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          is_demo: boolean | null
          notes: string | null
          owner_id: string | null
          payment_date: string
          staff_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean | null
          notes?: string | null
          owner_id?: string | null
          payment_date?: string
          staff_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_demo?: boolean | null
          notes?: string | null
          owner_id?: string | null
          payment_date?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          brand_id: string | null
          created_at: string | null
          created_by: string | null
          from_status: string | null
          id: string
          movement_type: string
          notes: string | null
          owner_id: string | null
          quantity: number
          reference_id: string | null
          to_status: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          created_by?: string | null
          from_status?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          owner_id?: string | null
          quantity?: number
          reference_id?: string | null
          to_status?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          created_by?: string | null
          from_status?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          owner_id?: string | null
          quantity?: number
          reference_id?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "lpg_brands"
            referencedColumns: ["id"]
          },
        ]
      }
      stoves: {
        Row: {
          brand: string
          burners: number
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_damaged: boolean | null
          is_demo: boolean | null
          model: string
          owner_id: string | null
          price: number
          quantity: number
          updated_at: string
          warranty_months: number | null
        }
        Insert: {
          brand: string
          burners?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_damaged?: boolean | null
          is_demo?: boolean | null
          model: string
          owner_id?: string | null
          price?: number
          quantity?: number
          updated_at?: string
          warranty_months?: number | null
        }
        Update: {
          brand?: string
          burners?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_damaged?: boolean | null
          is_demo?: boolean | null
          model?: string
          owner_id?: string | null
          price?: number
          quantity?: number
          updated_at?: string
          warranty_months?: number | null
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          invite_id: string | null
          member_email: string
          member_user_id: string
          owner_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          invite_id?: string | null
          member_email: string
          member_user_id: string
          owner_id: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          invite_id?: string | null
          member_email?: string
          member_user_id?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "team_members_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "team_invites"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          block_reason: string | null
          blocked_at: string | null
          blocked_by: string | null
          created_at: string | null
          id: string
          is_blocked: boolean | null
          user_id: string
        }
        Insert: {
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          user_id: string
        }
        Update: {
          block_reason?: string | null
          blocked_at?: string | null
          blocked_by?: string | null
          created_at?: string | null
          id?: string
          is_blocked?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      vehicle_costs: {
        Row: {
          amount: number
          cost_date: string
          cost_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_demo: boolean | null
          liters_filled: number | null
          odometer_reading: number | null
          owner_id: string | null
          vehicle_id: string
        }
        Insert: {
          amount?: number
          cost_date?: string
          cost_type: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean | null
          liters_filled?: number | null
          odometer_reading?: number | null
          owner_id?: string | null
          vehicle_id: string
        }
        Update: {
          amount?: number
          cost_date?: string
          cost_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean | null
          liters_filled?: number | null
          odometer_reading?: number | null
          owner_id?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_costs_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_demo: boolean | null
          last_odometer: number | null
          license_plate: string | null
          name: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          last_odometer?: number | null
          license_plate?: string | null
          name: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          last_odometer?: number | null
          license_plate?: string | null
          name?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      shop_profiles_public: {
        Row: {
          address: string | null
          cover_image_url: string | null
          created_at: string | null
          delivery_fee: number | null
          description: string | null
          district: string | null
          division: string | null
          id: string | null
          is_open: boolean | null
          is_verified: boolean | null
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          rating: number | null
          shop_name: string | null
          thana: string | null
          total_orders: number | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          description?: string | null
          district?: string | null
          division?: string | null
          id?: string | null
          is_open?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          rating?: number | null
          shop_name?: string | null
          thana?: string | null
          total_orders?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          delivery_fee?: number | null
          description?: string | null
          district?: string | null
          division?: string | null
          id?: string | null
          is_open?: boolean | null
          is_verified?: boolean | null
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          rating?: number | null
          shop_name?: string | null
          thana?: string | null
          total_orders?: number | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _action: string
          _ip_address: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: boolean
      }
      count_demo_data: { Args: never; Returns: number }
      delete_demo_data: { Args: never; Returns: undefined }
      generate_order_number: { Args: never; Returns: string }
      generate_pob_number: { Args: never; Returns: string }
      generate_transaction_number: { Args: never; Returns: string }
      get_active_orders_count: {
        Args: never
        Returns: {
          dispatched_count: number
          pending_count: number
          total_active: number
        }[]
      }
      get_customer_stats: {
        Args: never
        Returns: {
          customers_with_due: number
          total_customers: number
          total_due_amount: number
        }[]
      }
      get_inventory_totals: {
        Args: never
        Returns: {
          total_empty: number
          total_full: number
          total_package: number
          total_problem: number
          total_refill: number
        }[]
      }
      get_monthly_revenue_stats: {
        Args: never
        Returns: {
          current_month: number
          growth_percent: number
          last_month: number
        }[]
      }
      get_owner_id: { Args: never; Returns: string }
      get_today_expenses_total: { Args: never; Returns: number }
      get_today_sales_total: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_same_team: { Args: { _owner_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      mark_invite_used: {
        Args: { _code: string; _email: string; _user_id: string }
        Returns: string
      }
      owners_exist: { Args: never; Returns: boolean }
      record_rate_limit_attempt: {
        Args: {
          _action: string
          _email?: string
          _ip_address: string
          _success?: boolean
        }
        Returns: undefined
      }
      remove_team_member: {
        Args: { _member_id: string; _owner_id: string }
        Returns: boolean
      }
      seed_demo_data: { Args: { _owner_id: string }; Returns: undefined }
      update_team_member_role: {
        Args: {
          _member_id: string
          _new_role: Database["public"]["Enums"]["app_role"]
          _owner_id: string
        }
        Returns: boolean
      }
      validate_invite: {
        Args: { _code: string }
        Returns: {
          created_by: string
          expires_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      validate_invite_secure: { Args: { _code: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "manager" | "customer" | "admin" | "super_admin"
      payment_method: "cash" | "bkash" | "nagad" | "rocket" | "card"
      product_category: "lpg_cylinder" | "stove" | "regulator" | "accessory"
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
      app_role: ["owner", "manager", "customer", "admin", "super_admin"],
      payment_method: ["cash", "bkash", "nagad", "rocket", "card"],
      product_category: ["lpg_cylinder", "stove", "regulator", "accessory"],
    },
  },
} as const
