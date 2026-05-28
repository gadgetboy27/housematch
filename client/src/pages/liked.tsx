import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LocalStorageService, LikedProperty } from "@/lib/local-storage";
import { OfferWizard } from "@/components/OfferWizard";
import { PropertyDetailsDialog } from "@/components/property-details-dialog";
import { formatNZD } from "@/lib/format";

export default function Liked() {
  const [likedProperties, setLikedProperties] = useState<LikedProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offerPropertyId, setOfferPropertyId] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<any | null>(null);
  const { toast } = useToast();

  // Get current user for auth check
  const { data: user } = useQuery<{ id: string; name: string; email: string } | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  useEffect(() => {
    // Load liked properties from local storage
    const loadLikedProperties = () => {
      try {
        const properties = LocalStorageService.getLikedProperties();
        // Remove duplicates based on property.id (keep only the most recent)
        const uniqueProperties = properties.reduce((acc, current) => {
          const existingIndex = acc.findIndex(item => item.property.id === current.property.id);
          if (existingIndex === -1) {
            acc.push(current);
          } else if (current.likedAt > acc[existingIndex].likedAt) {
            acc[existingIndex] = current;
          }
          return acc;
        }, [] as LikedProperty[]);
        // Sort by date, newest first
        const sortedProperties = uniqueProperties.sort((a, b) => {
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
      {/* Gradient transition overlay for smooth blending */}
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 max-w-sm w-full h-32 bg-gradient-to-t from-white/95 via-white/60 to-transparent pointer-events-none z-40"></div>
      
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
            {/* Liked Properties */}
            <div className="space-y-3">
              {likedProperties.map((likedItem) => {
                const { property, likedAt, action } = likedItem;
                return (
                  <PropertyCard 
                    key={property.id} 
                    property={property} 
                    likedAt={likedAt} 
                    action={action} 
                    onRemove={handleRemoveProperty}
                    isLoggedIn={!!user}
                    onMakeOffer={(propertyId) => setOfferPropertyId(propertyId)}
                    onViewDetails={(property) => setSelectedProperty(property)}
                  />
                );
              })}
            </div>
            
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

      {/* Property Details Dialog */}
      <PropertyDetailsDialog
        property={selectedProperty}
        open={!!selectedProperty}
        onOpenChange={(open) => !open && setSelectedProperty(null)}
        isLoggedIn={!!user}
        onOpenOfferWizard={(propertyId) => {
          console.log('🎯 Liked: onOpenOfferWizard callback called');
          console.log('📍 Property ID received:', propertyId);
          setOfferPropertyId(propertyId);
          console.log('✅ State updated - wizard should open');
          setSelectedProperty(null); // Close the dialog
        }}
      />

      {/* Offer Wizard */}
      {offerPropertyId && (
        <>
          {console.log('🎨 Rendering OfferWizard on Liked page')}
          <OfferWizard
            propertyId={offerPropertyId}
            onClose={() => {
              console.log('🚪 Wizard closed');
              setOfferPropertyId(null);
            }}
          />
        </>
      )}
    </div>
  );
}

// Property Card Component
interface PropertyCardProps {
  property: any;
  likedAt: Date;
  action: string;
  onRemove: (propertyId: string) => void;
  isLoggedIn: boolean;
  onMakeOffer: (propertyId: string) => void;
  onViewDetails: (property: any) => void;
}

function PropertyCard({ property, likedAt, action, onRemove, isLoggedIn, onMakeOffer, onViewDetails }: PropertyCardProps) {
  const { toast } = useToast();
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return "Yesterday";
    return date.toLocaleDateString();
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer" 
      data-testid={`card-liked-${property.id}`}
      onClick={() => onViewDetails(property)}
    >
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
              <div className="w-5 h-5 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                <i className="fas fa-heart text-white text-xs"></i>
              </div>
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
                {formatNZD(property.price)}
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
                onClick={(e) => {
                  e.stopPropagation(); // Prevent opening details dialog
                  onRemove(property.id);
                }}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                data-testid={`button-remove-${property.id}`}
              >
                <i className="fas fa-trash text-xs"></i>
              </Button>
            </div>
            
            {/* Tap to View Details Hint */}
            <div className="mt-2 text-center">
              <p className="text-xs text-muted-foreground">
                <i className="fas fa-hand-pointer text-xs mr-1"></i>
                Tap to view full details &amp; make offers
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs font-medium" data-testid="text-swipe-action">
                <span className="text-pink-600 flex items-center space-x-1">
                  <i className="fas fa-heart text-xs"></i>
                  <span>Liked</span>
                </span>
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