import { useQuery } from "@tanstack/react-query";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";

export default function Liked() {
  // Mock user ID for demo - in real app this would come from auth
  const userId = "demo-user";

  const { data: swipes = [], isLoading } = useQuery({
    queryKey: ["/api/swipes", userId],
  });

  const likedSwipes = swipes.filter((swipe: any) => 
    swipe.action === 'like' || swipe.action === 'super_like'
  );

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-white relative">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-heart text-white text-sm"></i>
          </div>
          <h1 className="text-lg font-bold text-secondary">Liked Properties</h1>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-20">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading liked properties...</p>
          </div>
        ) : likedSwipes.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-heart text-muted-foreground text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-secondary mb-2">No Liked Properties</h3>
            <p className="text-muted-foreground text-sm">
              Start swiping to build your favorites list
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {likedSwipes.map((swipe: any) => (
              <Card key={swipe.id} className="overflow-hidden" data-testid={`card-liked-${swipe.id}`}>
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-20 h-20 bg-muted"></div>
                    <div className="flex-1 p-3">
                      <h4 className="font-semibold text-secondary" data-testid="text-property-title">
                        Property #{swipe.propertyId?.slice(-6)}
                      </h4>
                      <p className="text-sm text-muted-foreground" data-testid="text-swipe-action">
                        {swipe.action === 'super_like' ? '⭐ Super Liked' : '❤️ Liked'}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid="text-swipe-date">
                        {new Date(swipe.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
