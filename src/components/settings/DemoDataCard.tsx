import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const DemoDataCard = () => {
  const { t } = useLanguage();
  const [demoCount, setDemoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (roleData?.role) {
          setUserRole(roleData.role);
        }

        // Count demo data using the database function
        const { data: count, error } = await supabase.rpc('count_demo_data');
        
        if (error) {
          console.error('Error counting demo data:', error);
          setDemoCount(0);
        } else {
          setDemoCount(count || 0);
        }
      } catch (error) {
        console.error('Error fetching demo data count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDeleteDemoData = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase.rpc('delete_demo_data');
      
      if (error) throw error;
      
      setDemoCount(0);
      toast({ 
        title: "Demo Data Deleted", 
        description: "All sample data has been removed from your account." 
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete demo data", 
        variant: "destructive" 
      });
    } finally {
      setDeleting(false);
    }
  };

  // Only show for owners
  if (userRole !== 'owner') {
    return null;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Demo Data</CardTitle>
          </div>
          {demoCount > 0 && (
            <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 border-amber-200">
              {demoCount} items
            </Badge>
          )}
        </div>
        <CardDescription>
          Sample data to help you understand how the system works
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : demoCount > 0 ? (
          <>
            <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Demo data is active
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    You have {demoCount} sample items (LPG brands, stoves, regulators, customers, etc.) 
                    that were created when you signed up. Delete them once you've added your own data.
                  </p>
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete All Demo Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Demo Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {demoCount} demo items including sample LPG brands, 
                    stoves, regulators, customers, staff, vehicles, and product prices. 
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDeleteDemoData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Demo Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <div className="p-4 border rounded-lg bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">
              No demo data found. You're using real data!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
