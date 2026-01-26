import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Database, 
  Download, 
  Upload, 
  FileJson, 
  Clock, 
  User, 
  AlertTriangle,
  Check,
  Loader2,
  HardDrive,
  Cloud
} from "lucide-react";
import { useBackupRestore, BackupData } from "@/hooks/useBackupRestore";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { bn, enUS } from "date-fns/locale";

export const BackupRestoreCard = () => {
  const { t, language } = useLanguage();
  const { loading, progress, status, downloadBackup, restoreBackup, getBackupInfo } = useBackupRestore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [backupInfo, setBackupInfo] = useState<Partial<BackupData> | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      return;
    }

    setSelectedFile(file);
    const info = await getBackupInfo(file);
    setBackupInfo(info);
    setShowRestoreDialog(true);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedFile) return;
    
    setShowRestoreDialog(false);
    setShowConfirmDialog(false);
    
    const success = await restoreBackup(selectedFile);
    if (success) {
      // Refresh page to show restored data
      setTimeout(() => window.location.reload(), 1500);
    }
    
    setSelectedFile(null);
    setBackupInfo(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "PPpp", { 
        locale: language === "bn" ? bn : enUS 
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className="space-y-4">
        {/* Progress indicator */}
        {loading && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{status}</span>
              <span className="font-medium tabular-nums">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Download Backup */}
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all"
            onClick={downloadBackup}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Download className="h-5 w-5 text-primary" />
            )}
            <div className="text-center">
              <p className="font-medium text-sm">
                {language === "bn" ? "ব্যাকআপ ডাউনলোড" : "Download Backup"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "bn" ? "JSON ফাইল হিসাবে" : "As JSON file"}
              </p>
            </div>
          </Button>

          {/* Restore Backup */}
          <Button
            variant="outline"
            className="h-20 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5 transition-all"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <Upload className="h-5 w-5 text-primary" />
            )}
            <div className="text-center">
              <p className="font-medium text-sm">
                {language === "bn" ? "ব্যাকআপ রিস্টোর" : "Restore Backup"}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === "bn" ? "ফাইল থেকে" : "From file"}
              </p>
            </div>
          </Button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
          <Cloud className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-muted-foreground">
            {language === "bn"
              ? "ব্যাকআপ ফাইলে সমস্ত ইনভেন্টরি, গ্রাহক, অর্ডার, খরচ এবং সেটিংস ডেটা থাকে। নিয়মিত ব্যাকআপ নিতে ভুলবেন না!"
              : "Backup includes all inventory, customers, orders, expenses, and settings data. Remember to backup regularly!"}
          </p>
        </div>
      </div>

      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-primary" />
              {language === "bn" ? "ব্যাকআপ তথ্য" : "Backup Information"}
            </DialogTitle>
            <DialogDescription>
              {language === "bn" 
                ? "এই ব্যাকআপ রিস্টোর করার আগে তথ্য পর্যালোচনা করুন"
                : "Review the backup details before restoring"}
            </DialogDescription>
          </DialogHeader>

          {backupInfo ? (
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileJson className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{selectedFile?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {((selectedFile?.size || 0) / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "bn" ? "তৈরির তারিখ" : "Created"}
                    </p>
                    <p className="text-sm font-medium">
                      {backupInfo.createdAt ? formatDate(backupInfo.createdAt) : "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {language === "bn" ? "তৈরি করেছে" : "Created by"}
                    </p>
                    <p className="text-sm font-medium">
                      {backupInfo.createdBy || "Unknown"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline">v{backupInfo.version}</Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <p className="font-medium text-destructive">
                {language === "bn" ? "অবৈধ ব্যাকআপ ফাইল" : "Invalid backup file"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {language === "bn" 
                  ? "এই ফাইলটি একটি বৈধ Stock-X ব্যাকআপ নয়"
                  : "This file is not a valid Stock-X backup"}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              {language === "bn" ? "বাতিল" : "Cancel"}
            </Button>
            {backupInfo && (
              <Button onClick={() => setShowConfirmDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                {language === "bn" ? "রিস্টোর করুন" : "Restore"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Restore Alert */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {language === "bn" ? "সতর্কতা" : "Warning"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "bn"
                ? "এই অপারেশন বিদ্যমান ডেটা ওভাররাইট করবে। আপনি কি নিশ্চিত যে আপনি এগিয়ে যেতে চান? এই ক্রিয়াটি পূর্বাবস্থায় ফিরিয়ে আনা যাবে না।"
                : "This operation will overwrite existing data. Are you sure you want to proceed? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {language === "bn" ? "বাতিল" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {language === "bn" ? "হ্যাঁ, রিস্টোর করুন" : "Yes, Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
