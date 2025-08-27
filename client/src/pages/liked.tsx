import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocalStorageService, LikedProperty } from "@/lib/local-storage";

export default function Liked() {
  const [likedProperties, setLikedProperties] = useState<LikedProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Load liked properties from local storage
    const loadLikedProperties = () => {
      try {
        const properties = LocalStorageService.getLikedProperties();
        // Sort by action priority (super_like first), then by date within each group
        const sortedProperties = properties.sort((a, b) => {
          // Super likes come first
          if (a.action === 'super_like' && b.action !== 'super_like') return -1;
          if (a.action !== 'super_like' && b.action === 'super_like') return 1;
          // Within same action type, sort by newest first
          return b.likedAt.getTime() - a.likedAt.getTime();
        });
        setLikedProperties(sortedProperties);
      } catch (error) {
        console.error("Error loading liked properties:", error);
        toast({
          title: "Error",
          description: "Failed to load liked properties",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadLikedProperties();
  }, [toast]);

  const handleRemoveProperty = (propertyId: string) => {
    try {
      LocalStorageService.removeLikedProperty(propertyId);
      setLikedProperties(prev => prev.filter(item => item.property.id !== propertyId));
      toast({
        title: "Removed",
        description: "Property removed from liked list",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove property",
        variant: "destructive",
      });
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-white relative">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-lg flex items-center justify-center">
              <i className="fas fa-heart text-white text-sm"></i>
            </div>
            <h1 className="text-lg font-bold text-secondary">Liked Properties</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {likedProperties.length} saved
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-20">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading liked properties...</p>
          </div>
        ) : likedProperties.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-heart text-pink-500 text-2xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-secondary mb-2">No Liked Properties Yet</h3>
            <p className="text-muted-foreground text-sm px-4">
              Start swiping right on properties you love to build your favorites list. 
              Your likes are saved locally and will sync when you log in.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Render properties with section headers */}
            {(() => {
              const superLiked = likedProperties.filter(item => item.action === 'super_like');
              const regularLiked = likedProperties.filter(item => item.action === 'like');
              
              return (
                <>
                  {/* Super Liked Section */}
                  {superLiked.length > 0 && (
                    <div>
                      <div className="flex items-center mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                            <i className="fas fa-star text-white text-xs"></i>
                          </div>
                          <h3 className="font-semibold text-secondary">Super Liked</h3>
                          <span className="text-sm text-muted-foreground">({superLiked.length})</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {superLiked.map((likedItem) => {
                          const { property, likedAt, action } = likedItem;
                          return (
                            <PropertyCard key={property.id} property={property} likedAt={likedAt} action={action} onRemove={handleRemoveProperty} />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Regular Liked Section */}
                  {regularLiked.length > 0 && (
                    <div>
                      {superLiked.length > 0 && (
                        <div className="flex items-center mb-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                              <i className="fas fa-heart text-white text-xs"></i>
                            </div>
                            <h3 className="font-semibold text-secondary">Liked</h3>
                            <span className="text-sm text-muted-foreground">({regularLiked.length})</span>
                          </div>
                        </div>
                      )}
                      <div className="space-y-3">
                        {regularLiked.map((likedItem) => {
                          const { property, likedAt, action } = likedItem;
                          return (
                            <PropertyCard key={property.id} property={property} likedAt={likedAt} action={action} onRemove={handleRemoveProperty} />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            
            {/* Info about local storage */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                  <i className="fas fa-info text-white text-xs"></i>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    Your likes are saved locally
                  </p>
                  <p className="text-xs text-blue-700">
                    Sign in from your profile to save your likes permanently and sync across devices.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}

// Property Card Component
interface PropertyCardProps {
  property: any;
  likedAt: Date;
  action: string;
  onRemove: (propertyId: string) => void;
}

function PropertyCard({ property, likedAt, action, onRemove }: PropertyCardProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 ${action === 'super_like' ? 'ring-2 ring-yellow-200 bg-gradient-to-r from-yellow-50 to-orange-50' : 'hover:shadow-lg'}`} data-testid={`card-liked-${property.id}`}>
      <CardContent className="p-0">
        <div className="flex">
          {/* Property Image */}
          <div className="w-24 h-24 relative overflow-hidden">
            <img
              src={property.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200"}
              alt={property.title}
              className="w-full h-full object-cover"
              data-testid="img-liked-property"
            />
            <div className="absolute top-1 right-1">
              {action === 'super_like' ? (
                <div className="w-6 h-6 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <i className="fas fa-star text-white text-xs"></i>
                </div>
              ) : (
                <div className="w-5 h-5 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                  <i className="fas fa-heart text-white text-xs"></i>
                </div>
              )}
            </div>
          </div>
          
          {/* Property Details */}
          <div className="flex-1 p-3 flex flex-col justify-between">
            <div>
              <h4 className="font-semibold text-secondary text-sm leading-tight mb-1" data-testid="text-property-title">
                {property.title}
              </h4>
              <p className="text-xs text-muted-foreground mb-1" data-testid="text-property-address">
                {property.address}
              </p>
              <p className="text-sm font-bold text-primary" data-testid="text-property-price">
                {property.price}
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                {(property.bedrooms || 0) > 0 && (
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-bed text-blue-400"></i>
                    <span>{property.bedrooms}</span>
                  </span>
                )}
                {(property.bathrooms || 0) > 0 && (
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-shower text-cyan-400"></i>
                    <span>{property.bathrooms}</span>
                  </span>
                )}
                {(property.carSpaces || 0) > 0 && (
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-car text-green-400"></i>
                    <span>{property.carSpaces}</span>
                  </span>
                )}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onRemove(property.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                data-testid={`button-remove-${property.id}`}
              >
                <i className="fas fa-trash text-xs"></i>
              </Button>
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs font-medium" data-testid="text-swipe-action">
                {action === 'super_like' ? (
                  <span className="text-orange-600 flex items-center space-x-1">
                    <i className="fas fa-star text-xs"></i>
                    <span>Super Liked</span>
                  </span>
                ) : (
                  <span className="text-pink-600 flex items-center space-x-1">
                    <i className="fas fa-heart text-xs"></i>
                    <span>Liked</span>
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground" data-testid="text-swipe-date">
                {formatDate(likedAt)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}