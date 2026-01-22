import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { logger } from "@/lib/logger";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  ShoppingBag, 
  MessageSquare, 
  Store,
  Plus,
  Search,
  Package,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  Phone,
  MapPin,
  ExternalLink,
  ArrowRight,
  Send,
  Heart,
  Trash2,
  MessageCircle,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Filter,
  Settings
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";
import { PremiumStatCard } from "@/components/shared/PremiumStatCard";
import { EmptyStateCard } from "@/components/shared/EmptyStateCard";

// Types
interface CommunityOrder {
  id: string;
  order_number: string;
  shop_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  division: string;
  district: string;
  thana: string | null;
  order_notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'dispatched' | 'delivered' | 'cancelled' | 'rejected';
  payment_method: 'cod' | 'bkash' | 'nagad' | 'card';
  payment_status: 'pending' | 'paid';
  rejection_reason: string | null;
  confirmed_at: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  product_type: string;
  brand_name: string | null;
  weight: string | null;
  quantity: number;
  price: number;
  return_cylinder_qty: number;
}

interface Post {
  id: string;
  user_id: string;
  author_name: string;
  author_avatar?: string | null;
  title: string;
  content: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  created_at: string;
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  author_avatar?: string | null;
  content: string;
  created_at: string;
}

interface Exchange {
  id: string;
  from_brand_id: string;
  from_brand_name: string;
  to_brand_id: string;
  to_brand_name: string;
  quantity: number;
  weight: string;
  status: string;
  notes: string | null;
  created_by: string;
  created_at: string;
}

interface LPGBrand {
  id: string;
  name: string;
  size: string;
  weight: string;
}

interface ShopProfile {
  id: string;
  shop_name: string;
  is_open: boolean;
  total_orders: number;
  rating: number;
}

export const CommunityModule = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("orders");
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar: string | null } | null>(null);
  
  // Orders state
  const [orders, setOrders] = useState<CommunityOrder[]>([]);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [orderFilter, setOrderFilter] = useState("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  // Posts state
  const [posts, setPosts] = useState<Post[]>([]);
  const [postSearch, setPostSearch] = useState("");
  const [newPostTitle, setNewPostTitle] = useState("");
  const [newPostContent, setNewPostContent] = useState("");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  
  // Exchange state
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [brands, setBrands] = useState<LPGBrand[]>([]);
  const [exchangeFromBrand, setExchangeFromBrand] = useState("");
  const [exchangeToBrand, setExchangeToBrand] = useState("");
  const [exchangeWeight, setExchangeWeight] = useState("");
  const [exchangeQty, setExchangeQty] = useState("");
  const [exchangeNotes, setExchangeNotes] = useState("");

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      setCurrentUser({
        id: user.id,
        name: profile?.full_name || user.email || 'User',
        avatar: profile?.avatar_url
      });

      // Get user's shop
      const { data: shop } = await supabase
        .from('shop_profiles')
        .select('id, shop_name, is_open, total_orders, rating')
        .eq('owner_id', user.id)
        .single();

      if (shop) {
        setShopId(shop.id);
        setShopProfile(shop as ShopProfile);
        
        // Fetch orders for shop
        const { data: ordersData } = await supabase
          .from('community_orders')
          .select('*')
          .eq('shop_id', shop.id)
          .order('created_at', { ascending: false });

        setOrders((ordersData || []) as CommunityOrder[]);
        
        // Fetch order items
        if (ordersData && ordersData.length > 0) {
          const orderIds = ordersData.map(o => o.id);
          const { data: items } = await supabase
            .from('community_order_items')
            .select('*')
            .in('order_id', orderIds);
          
          const itemsByOrder: Record<string, OrderItem[]> = {};
          (items || []).forEach((item: any) => {
            if (!itemsByOrder[item.order_id]) {
              itemsByOrder[item.order_id] = [];
            }
            itemsByOrder[item.order_id].push(item as OrderItem);
          });
          setOrderItems(itemsByOrder);
        }
      }

      // Fetch posts
      const { data: postsData } = await supabase
        .from('community_posts')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (postsData) {
        // Get likes for current user
        const { data: likes } = await supabase
          .from('community_post_likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likedPostIds = new Set((likes || []).map(l => l.post_id));

        setPosts(postsData.map(post => ({
          ...post,
          is_liked: likedPostIds.has(post.id)
        })) as Post[]);
      }

      // Fetch exchanges - using correct column structure
      const { data: exchangesData } = await supabase
        .from('cylinder_exchanges')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (exchangesData) {
        setExchanges(exchangesData.map((e: any) => ({
          id: e.id,
          from_brand_id: e.id,
          from_brand_name: e.from_brand || 'Unknown',
          to_brand_id: e.id,
          to_brand_name: e.to_brand || 'Unknown',
          quantity: e.quantity || 0,
          weight: e.from_weight || '12kg',
          status: e.status || 'active',
          notes: null,
          created_by: e.user_id,
          created_at: e.created_at
        })));
      }

      // Fetch brands for exchange form
      const { data: brandsData } = await supabase
        .from('lpg_brands')
        .select('id, name, size, weight')
        .eq('is_active', true)
        .order('name');

      setBrands((brandsData || []) as LPGBrand[]);

    } catch (error) {
      logger.error('Error fetching community data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Real-time subscriptions
    const ordersChannel = supabase
      .channel('community_orders_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_orders' }, () => {
        fetchData();
      })
      .subscribe();

    const postsChannel = supabase
      .channel('community_posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        fetchData();
      })
      .subscribe();

    const exchangesChannel = supabase
      .channel('cylinder_exchanges_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cylinder_exchanges' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(exchangesChannel);
    };
  }, [fetchData]);

  // Order handlers
  const updateOrderStatus = useCallback(async (orderId: string, status: CommunityOrder['status'], reason?: string) => {
    try {
      const updateData: Record<string, any> = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (status === 'confirmed') updateData.confirmed_at = new Date().toISOString();
      if (status === 'dispatched') updateData.dispatched_at = new Date().toISOString();
      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
        updateData.payment_status = 'paid';
      }
      if (status === 'rejected' && reason) updateData.rejection_reason = reason;

      const { error } = await supabase
        .from('community_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
      
      toast.success(`Order ${status}`);
      setRejectDialogOpen(false);
      setRejectingOrderId(null);
      setRejectionReason("");
    } catch (error) {
      logger.error('Error updating order:', error);
      toast.error('Failed to update order');
    }
  }, []);

  const handleReject = useCallback(() => {
    if (!rejectingOrderId || !rejectionReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    updateOrderStatus(rejectingOrderId, 'rejected', rejectionReason);
  }, [rejectingOrderId, rejectionReason, updateOrderStatus]);

  // Post handlers
  const handleCreatePost = useCallback(async () => {
    if (!newPostTitle.trim() || !newPostContent.trim() || !currentUser) return;

    try {
      const { error } = await supabase.from('community_posts').insert({
        user_id: currentUser.id,
        author_name: currentUser.name,
        title: newPostTitle.trim(),
        content: newPostContent.trim(),
        is_active: true
      });

      if (error) throw error;

      toast.success('Post created');
      setNewPostTitle("");
      setNewPostContent("");
      setCreatePostOpen(false);
    } catch (error) {
      logger.error('Error creating post:', error);
      toast.error('Failed to create post');
    }
  }, [newPostTitle, newPostContent, currentUser]);

  const handleLike = useCallback(async (postId: string, isLiked: boolean) => {
    if (!currentUser) return;

    try {
      if (isLiked) {
        await supabase.from('community_post_likes').delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        await supabase.from('community_posts')
          .update({ likes_count: Math.max(0, (posts.find(p => p.id === postId)?.likes_count || 1) - 1) })
          .eq('id', postId);
      } else {
        await supabase.from('community_post_likes').insert({
          post_id: postId,
          user_id: currentUser.id
        });

        await supabase.from('community_posts')
          .update({ likes_count: (posts.find(p => p.id === postId)?.likes_count || 0) + 1 })
          .eq('id', postId);
      }

      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, is_liked: !isLiked, likes_count: isLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1 }
          : p
      ));
    } catch (error) {
      logger.error('Error toggling like:', error);
    }
  }, [currentUser, posts]);

  const fetchComments = useCallback(async (postId: string) => {
    const { data } = await supabase
      .from('community_post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    setComments(prev => ({ ...prev, [postId]: (data || []) as Comment[] }));
  }, []);

  const handleAddComment = useCallback(async (postId: string) => {
    const content = newComment[postId]?.trim();
    if (!content || !currentUser) return;

    try {
      await supabase.from('community_post_comments').insert({
        post_id: postId,
        user_id: currentUser.id,
        author_name: currentUser.name,
        content
      });

      await supabase.from('community_posts')
        .update({ comments_count: (posts.find(p => p.id === postId)?.comments_count || 0) + 1 })
        .eq('id', postId);

      setNewComment(prev => ({ ...prev, [postId]: '' }));
      fetchComments(postId);
      
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      ));
    } catch (error) {
      logger.error('Error adding comment:', error);
    }
  }, [newComment, currentUser, posts, fetchComments]);

  const handleDeletePost = useCallback(async (postId: string) => {
    try {
      await supabase.from('community_posts').delete().eq('id', postId);
      toast.success('Post deleted');
    } catch (error) {
      logger.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  }, []);

  // Exchange handlers
  const handleCreateExchange = useCallback(async () => {
    if (!exchangeFromBrand || !exchangeToBrand || !exchangeQty || !currentUser) {
      toast.error('Please fill all required fields');
      return;
    }

    if (exchangeFromBrand === exchangeToBrand) {
      toast.error('From and To brands must be different');
      return;
    }

    const qty = parseInt(exchangeQty);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Invalid quantity');
      return;
    }

    try {
      // Create exchange record using correct column names
      const { error } = await supabase.from('cylinder_exchanges').insert({
        from_brand: brands.find(b => b.id === exchangeFromBrand)?.name || exchangeFromBrand,
        to_brand: brands.find(b => b.id === exchangeToBrand)?.name || exchangeToBrand,
        from_weight: exchangeWeight || '12kg',
        to_weight: exchangeWeight || '12kg',
        quantity: qty,
        status: 'active',
        user_id: currentUser.id,
        author_name: currentUser.name
      });

      if (error) throw error;

      toast.success('Exchange recorded');
      setExchangeFromBrand("");
      setExchangeToBrand("");
      setExchangeWeight("");
      setExchangeQty("");
      setExchangeNotes("");
    } catch (error) {
      logger.error('Error creating exchange:', error);
      toast.error('Failed to record exchange');
    }
  }, [exchangeFromBrand, exchangeToBrand, exchangeWeight, exchangeQty, exchangeNotes, currentUser]);

  const handleDeleteExchange = useCallback(async (id: string) => {
    try {
      await supabase.from('cylinder_exchanges').delete().eq('id', id);
      toast.success('Exchange deleted');
    } catch (error) {
      logger.error('Error deleting exchange:', error);
      toast.error('Failed to delete exchange');
    }
  }, []);

  // Filtered data
  const filteredOrders = useMemo(() => {
    let result = orders;
    
    if (orderFilter !== 'all') {
      result = result.filter(o => o.status === orderFilter);
    }
    
    if (orderSearch.trim()) {
      const search = orderSearch.toLowerCase();
      result = result.filter(o => 
        o.order_number.toLowerCase().includes(search) ||
        o.customer_name.toLowerCase().includes(search) ||
        o.customer_phone.includes(search)
      );
    }
    
    return result;
  }, [orders, orderFilter, orderSearch]);

  const filteredPosts = useMemo(() => {
    if (!postSearch.trim()) return posts;
    const search = postSearch.toLowerCase();
    return posts.filter(p => 
      p.title.toLowerCase().includes(search) ||
      p.content.toLowerCase().includes(search) ||
      p.author_name.toLowerCase().includes(search)
    );
  }, [posts, postSearch]);

  // Stats
  const stats = useMemo(() => ({
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    confirmedOrders: orders.filter(o => o.status === 'confirmed').length,
    dispatchedOrders: orders.filter(o => o.status === 'dispatched').length,
    deliveredOrders: orders.filter(o => o.status === 'delivered').length,
    todayRevenue: orders
      .filter(o => o.status === 'delivered' && o.delivered_at && new Date(o.delivered_at).toDateString() === new Date().toDateString())
      .reduce((sum, o) => sum + o.total_amount, 0),
    totalPosts: posts.length,
    totalExchanges: exchanges.length
  }), [orders, posts, exchanges]);

  // Helper functions
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; icon: any; color: string }> = {
      pending: { label: 'Pending', icon: Clock, color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
      confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
      preparing: { label: 'Preparing', icon: Package, color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
      dispatched: { label: 'Dispatched', icon: Truck, color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30' },
      delivered: { label: 'Delivered', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
      cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-gray-500/10 text-gray-600 border-gray-500/30' },
      rejected: { label: 'Rejected', icon: XCircle, color: 'bg-rose-500/10 text-rose-600 border-rose-500/30' }
    };
    return configs[status] || configs.pending;
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20 md:pb-6">
      {/* Header */}
      <PremiumModuleHeader
        icon={<Store className="h-5 w-5 sm:h-6 sm:w-6 text-white" />}
        title={t('lpg_marketplace') || 'LPG Marketplace'}
        subtitle={t('lpg_marketplace_desc') || 'Manage orders, posts, and cylinder exchanges'}
        gradientFrom="from-violet-500/10"
        gradientTo="to-fuchsia-500/10"
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-1">
        <PremiumStatCard
          title="Pending"
          value={stats.pendingOrders}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          colorScheme="amber"
        />
        <PremiumStatCard
          title="In Transit"
          value={stats.dispatchedOrders}
          icon={<Truck className="h-5 w-5 text-primary" />}
          colorScheme="primary"
        />
        <PremiumStatCard
          title="Delivered"
          value={stats.deliveredOrders}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          colorScheme="emerald"
        />
        <PremiumStatCard
          title="Today's Revenue"
          value={`৳${stats.todayRevenue.toLocaleString()}`}
          icon={<ShoppingBag className="h-5 w-5 text-purple-600" />}
          colorScheme="purple"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="px-1">
          <ScrollArea className="w-full">
            <TabsList className="inline-flex h-12 w-full md:w-auto bg-muted/50 p-1 rounded-xl gap-1">
              <TabsTrigger 
                value="orders" 
                className="flex-1 md:flex-none min-w-[80px] h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Orders</span>
                {stats.pendingOrders > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs ml-1">
                    {stats.pendingOrders}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="posts" 
                className="flex-1 md:flex-none min-w-[80px] h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3"
              >
                <MessageSquare className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Posts</span>
              </TabsTrigger>
              <TabsTrigger 
                value="exchange" 
                className="flex-1 md:flex-none min-w-[80px] h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Exchange</span>
              </TabsTrigger>
              <TabsTrigger 
                value="shop" 
                className="flex-1 md:flex-none min-w-[80px] h-10 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 px-3"
              >
                <Store className="h-4 w-4" />
                <span className="text-xs sm:text-sm">My Shop</span>
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-4 space-y-4 px-1">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={orderFilter} onValueChange={setOrderFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-11">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="dispatched">Dispatched</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order List */}
          {filteredOrders.length === 0 ? (
            <EmptyStateCard
              icon={<ShoppingBag className="h-8 w-8" />}
              title="No Orders Found"
              subtitle={shopId ? "You'll see customer orders here when they place them." : "Create a shop profile to start receiving orders."}
              actionLabel={!shopId ? "Create Shop" : undefined}
              onAction={!shopId ? () => setActiveTab('shop') : undefined}
            />
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const statusConfig = getStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;
                const items = orderItems[order.id] || [];

                return (
                  <Card key={order.id} className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{order.order_number}</span>
                            <Badge className={cn("text-xs border", statusConfig.color)}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatTime(order.created_at)}</p>
                        </div>
                        <span className="font-bold text-lg tabular-nums shrink-0">৳{order.total_amount}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      {/* Customer Info */}
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(order.customer_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{order.customer_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span className="truncate">{order.customer_phone}</span>
                          </div>
                        </div>
                        <a href={`tel:${order.customer_phone}`} className="p-2 hover:bg-muted rounded-full shrink-0">
                          <Phone className="h-4 w-4 text-primary" />
                        </a>
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{order.delivery_address}, {order.district}</span>
                      </div>

                      {/* Items */}
                      {items.length > 0 && (
                        <div className="space-y-1 p-2 bg-muted/20 rounded-lg">
                          {items.slice(0, 2).map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="truncate mr-2">{item.quantity}x {item.product_name}</span>
                              <span className="tabular-nums shrink-0">৳{item.price * item.quantity}</span>
                            </div>
                          ))}
                          {items.length > 2 && (
                            <p className="text-xs text-muted-foreground">+{items.length - 2} more items</p>
                          )}
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {order.rejection_reason && (
                        <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 p-2 rounded">
                          Reason: {order.rejection_reason}
                        </p>
                      )}

                      {/* Actions */}
                      {order.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <Button 
                            size="sm" 
                            className="flex-1 h-11"
                            onClick={() => updateOrderStatus(order.id, 'confirmed')}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="flex-1 h-11 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            onClick={() => { setRejectingOrderId(order.id); setRejectDialogOpen(true); }}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                      {order.status === 'confirmed' && (
                        <Button 
                          size="sm" 
                          className="w-full h-11"
                          onClick={() => updateOrderStatus(order.id, 'dispatched')}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Mark as Dispatched
                        </Button>
                      )}
                      {order.status === 'dispatched' && (
                        <Button 
                          size="sm" 
                          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Mark as Delivered
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Posts Tab */}
        <TabsContent value="posts" className="mt-4 space-y-4 px-1">
          {/* Search & Create */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search posts..."
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Dialog open={createPostOpen} onOpenChange={setCreatePostOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 gap-2">
                  <Plus className="h-4 w-4" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg mx-4">
                <DialogHeader>
                  <DialogTitle>Create Post</DialogTitle>
                  <DialogDescription>Share updates with the LPG community</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Post title..."
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="h-11"
                  />
                  <Textarea
                    placeholder="What's on your mind?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={4}
                  />
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setCreatePostOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreatePost} disabled={!newPostTitle.trim() || !newPostContent.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Posts List */}
          {filteredPosts.length === 0 ? (
            <EmptyStateCard
              icon={<MessageSquare className="h-8 w-8" />}
              title="No Posts Yet"
              subtitle="Be the first to share something with the community!"
              actionLabel="Create Post"
              onAction={() => setCreatePostOpen(true)}
            />
          ) : (
            <div className="space-y-4">
              {filteredPosts.map(post => (
                <Card key={post.id}>
                  <CardContent className="p-4 space-y-3">
                    {/* Author */}
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage src={post.author_avatar || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(post.author_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{post.author_name}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(post.created_at)}</p>
                      </div>
                      {currentUser?.id === post.user_id && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-rose-600 shrink-0"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Content */}
                    <div>
                      <h3 className="font-semibold mb-1">{post.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{post.content}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 pt-2 border-t">
                      <button 
                        onClick={() => handleLike(post.id, post.is_liked)}
                        className={cn(
                          "flex items-center gap-1.5 text-sm transition-colors min-h-[44px] px-2",
                          post.is_liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-500"
                        )}
                      >
                        <Heart className={cn("h-4 w-4", post.is_liked && "fill-current")} />
                        <span>{post.likes_count}</span>
                      </button>
                      <button 
                        onClick={() => {
                          setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }));
                          if (!comments[post.id]) fetchComments(post.id);
                        }}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary min-h-[44px] px-2"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comments_count}</span>
                        {expandedComments[post.id] ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    </div>

                    {/* Comments Section */}
                    {expandedComments[post.id] && (
                      <div className="space-y-3 pt-2 border-t">
                        {(comments[post.id] || []).map(comment => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="h-7 w-7 shrink-0">
                              <AvatarImage src={comment.author_avatar || undefined} />
                              <AvatarFallback className="text-xs">{getInitials(comment.author_name)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 bg-muted/50 rounded-lg p-2">
                              <p className="text-xs font-medium truncate">{comment.author_name}</p>
                              <p className="text-sm break-words">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Write a comment..."
                            value={newComment[post.id] || ''}
                            onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                            className="h-11 flex-1"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                          />
                          <Button size="icon" className="h-11 w-11 shrink-0" onClick={() => handleAddComment(post.id)}>
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Exchange Tab */}
        <TabsContent value="exchange" className="mt-4 space-y-4 px-1">
          {/* New Exchange Form */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4" />
                New Cylinder Exchange
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={exchangeFromBrand} onValueChange={setExchangeFromBrand}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="From Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name} ({brand.weight})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={exchangeToBrand} onValueChange={setExchangeToBrand}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="To Brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.filter(b => b.id !== exchangeFromBrand).map(brand => (
                      <SelectItem key={brand.id} value={brand.id}>{brand.name} ({brand.weight})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={exchangeWeight} onValueChange={setExchangeWeight}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Weight" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5.5kg">5.5 kg</SelectItem>
                    <SelectItem value="12kg">12 kg</SelectItem>
                    <SelectItem value="25kg">25 kg</SelectItem>
                    <SelectItem value="45kg">45 kg</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="Quantity"
                  value={exchangeQty}
                  onChange={(e) => setExchangeQty(e.target.value)}
                  className="h-11"
                  min="1"
                />
              </div>
              <Input
                placeholder="Notes (optional)"
                value={exchangeNotes}
                onChange={(e) => setExchangeNotes(e.target.value)}
                className="h-11"
              />
              <Button 
                className="w-full h-11" 
                onClick={handleCreateExchange}
                disabled={!exchangeFromBrand || !exchangeToBrand || !exchangeQty}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Record Exchange
              </Button>
            </CardContent>
          </Card>

          {/* Exchange History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Exchange History</CardTitle>
            </CardHeader>
            <CardContent>
              {exchanges.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No exchanges recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {exchanges.slice(0, 10).map(exchange => (
                    <div key={exchange.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm font-medium flex-wrap">
                          <span className="truncate">{exchange.from_brand_name}</span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate">{exchange.to_brand_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{exchange.quantity}x {exchange.weight}</span>
                          <span>•</span>
                          <span>{formatTime(exchange.created_at)}</span>
                        </div>
                      </div>
                      {currentUser?.id === exchange.created_by && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-10 w-10 text-muted-foreground hover:text-rose-600 shrink-0"
                          onClick={() => handleDeleteExchange(exchange.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Shop Tab */}
        <TabsContent value="shop" className="mt-4 space-y-4 px-1">
          {shopProfile ? (
            <Card>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{shopProfile.shop_name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={shopProfile.is_open ? "default" : "secondary"}>
                        {shopProfile.is_open ? "Open" : "Closed"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        ⭐ {shopProfile.rating.toFixed(1)} • {shopProfile.total_orders} orders
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl">
                  <div className="text-center">
                    <p className="text-2xl font-bold tabular-nums">{stats.pendingOrders}</p>
                    <p className="text-xs text-muted-foreground">Pending Orders</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold tabular-nums">৳{stats.todayRevenue}</p>
                    <p className="text-xs text-muted-foreground">Today's Revenue</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full h-11 justify-between"
                    onClick={() => window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'settings' }))}
                  >
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Manage Shop Profile
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full h-11 justify-between"
                    onClick={() => window.open(`/shop/${shopProfile.id}`, '_blank')}
                  >
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      View Public Shop Page
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <EmptyStateCard
              icon={<Store className="h-8 w-8" />}
              title="No Shop Profile"
              subtitle="Create a shop profile to start selling on the LPG marketplace"
              actionLabel="Create Shop"
              onAction={() => window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'settings' }))}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>Reject Order</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this order</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>
              Reject Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
