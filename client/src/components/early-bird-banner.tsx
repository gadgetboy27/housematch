import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, Clock, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EarlyBirdStatus {
  active: boolean;
  remaining: number;
  total: number;
  used: number;
  promotion: {
    id: string;
    name: string;
    description: string;
  } | null;
}

export function EarlyBirdBanner() {
  const { data: status, isLoading } = useQuery<EarlyBirdStatus>({
    queryKey: ['/api/early-bird/status'],
    refetchInterval: 10000, // Refresh every 10 seconds to show real-time countdown
  });

  // Don't show banner if loading or not active
  if (isLoading || !status?.active) {
    return null;
  }

  const percentageUsed = (status.used / status.total) * 100;
  const urgencyLevel = percentageUsed > 80 ? 'critical' : percentageUsed > 50 ? 'high' : 'normal';

  return (
    <Card
      className="relative overflow-hidden border-2 border-yellow-400 dark:border-yellow-500 bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-950/30 dark:via-orange-950/30 dark:to-red-950/30 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500"
      data-testid="early-bird-banner"
    >
      {/* Animated sparkle background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.1),rgba(251,146,60,0))]" />
      
      {/* Urgency stripe */}
      {urgencyLevel === 'critical' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 animate-pulse" />
      )}

      <div className="relative p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-bounce">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                {status.promotion?.name || 'Launch Special: First 100 Listings FREE!'}
              </h3>
              <Badge 
                variant="destructive" 
                className="bg-red-500 hover:bg-red-600 text-white font-semibold animate-pulse"
                data-testid="badge-limited-time"
              >
                <Clock className="w-3 h-3 mr-1" />
                LIMITED TIME
              </Badge>
            </div>

            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-3">
              {status.promotion?.description || 'Be one of the first 100 property owners to list for FREE!'}
            </p>

            {/* Counter */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
                  <TrendingUp className="w-4 h-4 text-orange-500" />
                  <span className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400" data-testid="text-remaining-count">
                    {status.remaining}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                    / {status.total} left
                  </span>
                </div>

                {urgencyLevel === 'critical' && (
                  <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 animate-pulse">
                    <Zap className="w-3 h-3 mr-1" />
                    ALMOST GONE!
                  </Badge>
                )}
              </div>

              {/* Progress bar */}
              <div className="flex-1 min-w-[120px]">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      urgencyLevel === 'critical'
                        ? 'bg-gradient-to-r from-red-500 to-orange-500'
                        : urgencyLevel === 'high'
                        ? 'bg-gradient-to-r from-orange-500 to-yellow-500'
                        : 'bg-gradient-to-r from-yellow-500 to-green-500'
                    }`}
                    style={{ width: `${percentageUsed}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {status.used} claimed
                </p>
              </div>
            </div>

            {/* Urgency message */}
            {urgencyLevel === 'critical' && (
              <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
                <Zap className="w-4 h-4 animate-pulse" />
                Hurry! Only {status.remaining} spots remaining!
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
