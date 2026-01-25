import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Cylinder, 
  Edit2, 
  CheckCircle2, 
  AlertTriangle,
  ImageIcon
} from "lucide-react";
import { getLpgColorByValveSize } from "@/lib/brandConstants";
import { cn } from "@/lib/utils";

export interface CylinderProfile {
  id?: string;
  brand_name: string;
  weight: string;
  valve_size: '22mm' | '20mm';
  cylinder_photo_url: string | null;
  is_verified: boolean;
}

interface MyCylinderCardProps {
  profile: CylinderProfile | null;
  onEdit?: () => void;
  showEditButton?: boolean;
  compact?: boolean;
  className?: string;
}

export const MyCylinderCard = ({ 
  profile, 
  onEdit,
  showEditButton = true,
  compact = false,
  className
}: MyCylinderCardProps) => {
  if (!profile) {
    return (
      <Card className={cn(
        "border-2 border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20",
        className
      )}>
        <CardContent className={cn("flex flex-col items-center justify-center text-center", compact ? "py-4" : "py-8")}>
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-3">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
            Cylinder Profile Required
          </h3>
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
            Set up your cylinder profile to order refills
          </p>
          {showEditButton && onEdit && (
            <Button onClick={onEdit} variant="default" className="bg-amber-600 hover:bg-amber-700">
              <Edit2 className="h-4 w-4 mr-2" />
              Set Up Profile
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const brandColor = getLpgColorByValveSize(profile.brand_name, profile.valve_size);

  return (
    <Card className={cn(
      "overflow-hidden border-l-4",
      className
    )} style={{ borderLeftColor: brandColor }}>
      <CardHeader className={cn("pb-2", compact && "py-3")}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Cylinder className="h-5 w-5" style={{ color: brandColor }} />
            My Cylinder
          </CardTitle>
          <div className="flex items-center gap-2">
            {profile.is_verified ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Pending
              </Badge>
            )}
            {showEditButton && onEdit && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn(compact && "pb-3")}>
        <div className="flex gap-4">
          {/* Photo */}
          <div className="flex-shrink-0">
            {profile.cylinder_photo_url ? (
              <div className="w-20 h-20 rounded-lg overflow-hidden border bg-muted">
                <img 
                  src={profile.cylinder_photo_url} 
                  alt="My Cylinder" 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
                <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 space-y-2">
            <div>
              <div 
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {profile.brand_name}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-medium">
                {profile.weight}
              </Badge>
              <Badge variant="outline" className="font-medium">
                {profile.valve_size}
              </Badge>
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-muted">
          <p className="text-xs text-muted-foreground">
            <strong>💡 Tip:</strong> This profile auto-fills your return cylinder for all refill orders.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
