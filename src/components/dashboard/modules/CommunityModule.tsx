import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, 
  ThumbsUp, 
  MessageCircle, 
  Phone,
  RefreshCw,
  Loader2,
  Trash2,
  Send
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

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

export const CommunityModule = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("Anonymous");
  
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
        setUserName(user.email?.split('@')[0] || 'User');
      }

      await fetchPosts();
    };

    fetchData();

    // Subscribe to realtime updates
    const postsChannel = supabase
      .channel('community-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, () => {
        fetchPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
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
      // Check which posts current user has liked
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
        // Unlike
        await supabase
          .from('community_post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        // Update count
        const post = posts.find(p => p.id === postId);
        if (post) {
          await supabase
            .from('community_posts')
            .update({ likes_count: Math.max(0, post.likes_count - 1) })
            .eq('id', postId);
        }
      } else {
        // Like
        await supabase
          .from('community_post_likes')
          .insert({ post_id: postId, user_id: user.id });

        // Update count
        const post = posts.find(p => p.id === postId);
        if (post) {
          await supabase
            .from('community_posts')
            .update({ likes_count: post.likes_count + 1 })
            .eq('id', postId);
        }
      }

      // Update local state
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

      // Update comment count
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">LPG Community</h2>
          <p className="text-muted-foreground">Connect, share, and learn with other LPG professionals.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchPosts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Exchange
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Post</DialogTitle>
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
                    placeholder="Share your thoughts, questions, or tips with the community..."
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

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No posts yet</h3>
            <p className="text-sm text-muted-foreground">Be the first to start a discussion!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <Card key={post.id} className="border border-border hover:border-primary/30 transition-colors shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-muted">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {getInitials(post.author_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{post.author_name}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(post.created_at)}</p>
                  </div>
                  {post.user_id === currentUserId && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeletePost(post.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-4">{post.content}</p>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-4 pt-2 border-t border-border">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`gap-2 ${post.isLiked ? 'text-primary' : 'text-muted-foreground'}`}
                    onClick={() => handleLike(post.id, post.isLiked || false)}
                  >
                    <ThumbsUp className={`h-4 w-4 ${post.isLiked ? 'fill-current' : ''}`} />
                    {post.likes_count}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-2 text-muted-foreground"
                    onClick={() => handleExpandComments(post.id)}
                  >
                    <MessageCircle className="h-4 w-4" />
                    {post.comments_count}
                  </Button>
                  <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                  </Button>
                </div>

                {/* Comments Section */}
                {expandedPost === post.id && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    {loadingComments ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        {comments[post.id]?.map(comment => (
                          <div key={comment.id} className="flex gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs bg-muted">
                                {getInitials(comment.author_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                              <p className="text-xs font-medium">{comment.author_name}</p>
                              <p className="text-sm text-muted-foreground">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                            className="flex-1"
                          />
                          <Button size="icon" onClick={() => handleAddComment(post.id)}>
                            <Send className="h-4 w-4" />
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
  );
};
