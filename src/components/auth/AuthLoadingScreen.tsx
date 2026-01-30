import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import stockXLogo from "@/assets/stock-x-logo.png";

interface AuthLoadingScreenProps {
  error?: string | null;
  onRetry?: () => void;
}

export const AuthLoadingScreen = ({ error, onRetry }: AuthLoadingScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse" />
          <img
            src={stockXLogo}
            alt="Stock-X"
            className="relative h-16 w-16 mx-auto rounded-xl shadow-lg"
          />
        </div>
        <div>
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-white" />
          <p className="mt-3 text-white/90 font-medium">Loading Stock-X...</p>
          <p className="mt-1 text-white/60 text-sm">Please wait while we set things up</p>
        </div>
        {error && (
          <div className="mt-6 p-4 bg-white/10 rounded-xl border border-white/20">
            <p className="text-white/90 text-sm mb-3">{error}</p>
            {onRetry && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onRetry}
                className="h-10 px-6"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
