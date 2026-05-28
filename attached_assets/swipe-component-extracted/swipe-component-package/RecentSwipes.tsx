import { Card, SwipeResult } from './SwipeCard';

// ============================================================================
// RECENT SWIPES COMPONENT
// ============================================================================
// Shows a history of recent swipes with visual indicators

interface RecentSwipesProps {
  swipeHistory: SwipeResult[];
  cards: Card[];
  maxVisible?: number;
  className?: string;
}

export function RecentSwipes({ 
  swipeHistory, 
  cards, 
  maxVisible = 5,
  className = ""
}: RecentSwipesProps) {
  if (swipeHistory.length === 0) {
    return null;
  }

  const recentSwipes = swipeHistory.slice(-maxVisible).reverse();

  return (
    <div className={`p-4 border-t bg-muted/30 ${className}`}>
      <div className="max-w-md mx-auto">
        <p className="text-sm text-muted-foreground mb-2">Recent swipes:</p>
        <div className="flex gap-2 flex-wrap" data-testid="swipe-history">
          {recentSwipes.map((result, index) => {
            const card = cards.find((c) => c.id === result.cardId);
            const isLike = result.direction === "right";
            
            return (
              <div
                key={`${result.cardId}-${index}`}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isLike
                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
                    : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                }`}
                data-testid={`swipe-indicator-${result.direction}`}
              >
                {card?.name} - {isLike ? "❤️" : "✕"}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ALTERNATIVE: Compact Recent Swipes (No border/padding)
// ============================================================================

export function RecentSwipesCompact({ 
  swipeHistory, 
  cards, 
  maxVisible = 5,
  className = ""
}: RecentSwipesProps) {
  if (swipeHistory.length === 0) {
    return null;
  }

  const recentSwipes = swipeHistory.slice(-maxVisible).reverse();

  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground mb-2">Recent:</p>
      <div className="flex gap-1.5 flex-wrap">
        {recentSwipes.map((result, index) => {
          const card = cards.find((c) => c.id === result.cardId);
          const isLike = result.direction === "right";
          
          return (
            <div
              key={`${result.cardId}-${index}`}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                isLike
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {card?.name} {isLike ? "❤️" : "✕"}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// ALTERNATIVE: Recent Swipes List (Vertical layout)
// ============================================================================

export function RecentSwipesList({ 
  swipeHistory, 
  cards, 
  maxVisible = 10,
  className = ""
}: RecentSwipesProps) {
  if (swipeHistory.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-sm text-muted-foreground">No swipes yet</p>
      </div>
    );
  }

  const recentSwipes = swipeHistory.slice(-maxVisible).reverse();

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
      <div className="space-y-2">
        {recentSwipes.map((result, index) => {
          const card = cards.find((c) => c.id === result.cardId);
          const isLike = result.direction === "right";
          
          return (
            <div
              key={`${result.cardId}-${index}`}
              className="flex items-center gap-3 p-2 rounded-lg bg-card/50 border border-border/50"
            >
              {card?.imageUrl && (
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{card?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isLike ? "Liked" : "Passed"}
                </p>
              </div>
              <div className={`text-2xl ${isLike ? "" : "opacity-50"}`}>
                {isLike ? "❤️" : "✕"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// ALTERNATIVE: Recent Swipes Stats
// ============================================================================

interface SwipeStatsProps {
  swipeHistory: SwipeResult[];
  className?: string;
}

export function SwipeStats({ swipeHistory, className = "" }: SwipeStatsProps) {
  const likes = swipeHistory.filter(s => s.direction === "right").length;
  const passes = swipeHistory.filter(s => s.direction === "left").length;
  const total = swipeHistory.length;
  const likeRate = total > 0 ? Math.round((likes / total) * 100) : 0;

  if (total === 0) {
    return null;
  }

  return (
    <div className={`flex items-center justify-center gap-6 p-4 ${className}`}>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {likes}
        </div>
        <div className="text-xs text-muted-foreground">Likes</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-red-600 dark:text-red-400">
          {passes}
        </div>
        <div className="text-xs text-muted-foreground">Passes</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-primary">
          {likeRate}%
        </div>
        <div className="text-xs text-muted-foreground">Like Rate</div>
      </div>
    </div>
  );
}
