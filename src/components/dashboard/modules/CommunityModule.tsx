import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  ThumbsUp, 
  MessageCircle, 
  Phone,
  RefreshCcw,
  Loader2,
  Trash2,
  Send,
  ArrowRightLeft,
  Users,
  TrendingUp,
  Clock,
  Search,
  Filter
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ExchangeModule } from "./ExchangeModule";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Post {
  id: string;
  user_id: string;
  author_name: string;
  title: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  isLiked?: boolean;
}

interface Comment {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface Exchange {
  id: string;
  user_id: string;
  author_name: string;
  from_brand: string;
  from_weight: string;
  to_brand: string;
  to_weight: string;
  quantity: number;
  created_at: string;
}

export const CommunityModule = () => {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Anonymous");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Comments state
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        // Try to get profile name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        
        setUserName(profile?.full_name || user.email?.split('@')[0] || 'User');
      }

      await Promise.all([fetchPosts(), fetchExchanges()]);
    };

    fetchData();

    // Subscribe to realtime updates
    const postsChannel = supabase
      .channel('community-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    const exchangesChannel = supabase
      .channel('community-exchanges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cylinder_exchanges' }, () => {
        fetchExchanges();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(exchangesChannel);
    };
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    
    const { data: postsData, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error loading posts", description: error.message, variant: "destructive" });
    } else if (postsData) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: likes } = await supabase
          .from('community_post_likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        
        setPosts(postsData.map(post => ({
          ...post,
          isLiked: likedPostIds.has(post.id)
        })));
      } else {
        setPosts(postsData);
      }
    }
    
    setLoading(false);
  };

  const fetchExchanges = async () => {
    const { data, error } = await supabase
      .from('cylinder_exchanges')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setExchanges(data);
    }
  };

  const handleCreatePost = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setCreating(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in to post", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('community_posts').insert({
        user_id: user.id,
        author_name: userName,
        title: newTitle.trim(),
        content: newContent.trim()
      });

      if (error) throw error;

      setNewTitle("");
      setNewContent("");
      setShowCreateDialog(false);
      toast({ title: "Post created successfully!" });
      
      await fetchPosts();
    } catch (error: any) {
      toast({ title: "Error creating post", description: error.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in to like posts", variant: "destructive" });
        return;
      }

      if (isLiked) {
        await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        const post = posts.find(p => p.id === postId);
        if (post) {
          await supabase
            .from('community_posts')
            .update({ likes_count: Math.max(0, post.likes_count - 1) })
            .eq('id', postId);
        }
      } else {
        await supabase
          .from('community_post_likes')
          .insert({ post_id: postId, user_id: user.id });

        const post = posts.find(p => p.id === postId);
        if (post) {
          await supabase
            .from('community_posts')
            .update({ likes_count: post.likes_count + 1 })
            .eq('id', postId);
        }
      }

      setPosts(posts.map(p => 
        p.id === postId 
          ? { ...p, isLiked: !isLiked, likes_count: isLiked ? p.likes_count - 1 : p.likes_count + 1 }
          : p
      ));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchComments = async (postId: string) => {
    setLoadingComments(true);
    
    const { data, error } = await supabase
      .from('community_post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setComments(prev => ({ ...prev, [postId]: data }));
    }
    
    setLoadingComments(false);
  };

  const handleExpandComments = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      if (!comments[postId]) {
        await fetchComments(postId);
      }
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!newComment.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in to comment", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from('community_post_comments').insert({
        post_id: postId,
        user_id: user.id,
        author_name: userName,
        content: newComment.trim()
      });

      if (error) throw error;

      const post = posts.find(p => p.id === postId);
      if (post) {
        await supabase
          .from('community_posts')
          .update({ comments_count: post.comments_count + 1 })
          .eq('id', postId);
          
        setPosts(posts.map(p => 
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        ));
      }

      setNewComment("");
      await fetchComments(postId);
      toast({ title: "Comment added!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('community_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
      
      setPosts(posts.filter(p => p.id !== postId));
      toast({ title: "Post deleted" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  // Filter posts based on search
  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.author_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show Exchange Module
  if (showExchange) {
    return <ExchangeModule onBack={() => setShowExchange(false)} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading community...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">LPG Community</h2>
          <p className="text-muted-foreground">Connect, share, and learn with other LPG professionals</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setShowExchange(true)} className="flex-1 sm:flex-none">
              <RefreshCcw className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Exchange</span>
            </Button>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 flex-1 sm:flex-none">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden xs:inline">Create Post</span>
                  <span className="xs:hidden">Post</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg mx-4 sm:mx-auto">
                <DialogHeader>
                  <DialogTitle>Create New Post</DialogTitle>
                  <DialogDescription>Share your thoughts with the LPG community.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Post title..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Share your thoughts, questions, or tips..."
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      rows={5}
                    />
                  </div>
                  <Button onClick={handleCreatePost} className="w-full" disabled={creating}>
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Publish Post
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts, topics, or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{posts.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Posts</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{exchanges.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Exchanges</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{posts.reduce((acc, p) => acc + p.likes_count, 0)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Likes</p>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Exchange Posts Section */}
      {exchanges.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Recent Exchange Offers</h3>
          </div>
          <ScrollArea className="w-full">
            <div className="flex gap-3 pb-2 min-w-max sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:min-w-0">
              {exchanges.slice(0, 6).map(exchange => (
                <Card key={exchange.id} className="w-72 sm:w-auto border border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors shrink-0">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-center gap-2 sm:gap-3 mb-3">
                      <Avatar className="h-7 w-7 sm:h-8 sm:w-8 bg-primary/10">
                        <AvatarFallback className="text-primary text-xs">
                          {getInitials(exchange.author_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm text-foreground truncate">{exchange.author_name}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{formatTime(exchange.created_at)}</p>
                      </div>
                      <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] sm:text-xs">
                        Exchange
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                      <div className="text-center flex-1">
                        <p className="font-medium text-foreground">{exchange.from_brand}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{exchange.from_weight}</p>
                      </div>
                      <ArrowRightLeft className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                      <div className="text-center flex-1">
                        <p className="font-medium text-foreground">{exchange.to_brand}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{exchange.to_weight}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-muted-foreground">Qty: <span className="font-medium text-foreground">{exchange.quantity}</span></span>
                      <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 text-muted-foreground h-7 sm:h-8 text-xs">
                        <Phone className="h-3 w-3 sm:h-4 sm:w-4" />
                        Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Posts Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-foreground">Community Posts</h3>
          <Badge variant="outline" className="text-xs">
            {filteredPosts.length} posts
          </Badge>
        </div>
        {filteredPosts.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
              <MessageCircle className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-muted-foreground">
                {searchQuery ? 'No posts found' : 'No posts yet'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Be the first to start a discussion!'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredPosts.map(post => (
              <Card key={post.id} className="border border-border hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl group">
                <CardHeader className="pb-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 bg-muted ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm font-medium">
                        {getInitials(post.author_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base text-foreground truncate">{post.author_name}</p>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <p className="text-[10px] sm:text-xs">{formatTime(post.created_at)}</p>
                      </div>
                    </div>
                    {post.user_id === currentUserId && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4 pt-0">
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{post.content}</p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:gap-4 pt-2 border-t border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className={`gap-1 sm:gap-2 h-8 text-xs sm:text-sm ${post.isLiked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-primary/5'}`}
                      onClick={() => handleLike(post.id, post.isLiked || false)}
                    >
                      <ThumbsUp className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                      {post.likes_count}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 sm:gap-2 h-8 text-xs sm:text-sm text-muted-foreground hover:text-primary hover:bg-primary/5"
                      onClick={() => handleExpandComments(post.id)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      {post.comments_count}
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 h-8 text-xs sm:text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 ml-auto">
                      <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>

                  {/* Comments Section */}
                  {expandedPost === post.id && (
                    <div className="space-y-3 pt-3 border-t border-border animate-in slide-in-from-top-2 duration-200">
                      {loadingComments ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <ScrollArea className="max-h-40">
                            <div className="space-y-2 pr-2">
                              {comments[post.id]?.map(comment => (
                                <div key={comment.id} className="flex gap-2">
                                  <Avatar className="h-6 w-6 sm:h-7 sm:w-7 shrink-0">
                                    <AvatarFallback className="text-[10px] sm:text-xs bg-muted">
                                      {getInitials(comment.author_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 bg-muted/50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                                    <p className="text-[10px] sm:text-xs font-medium">{comment.author_name}</p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Write a comment..."
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                              className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                            />
                            <Button size="icon" onClick={() => handleAddComment(post.id)} className="h-8 w-8 sm:h-9 sm:w-9">
                              <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
