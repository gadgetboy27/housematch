// src/components/property-card.tsx
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import PropertyTypeDropdown from "./property-type-dropdown";
import ImageSwipeTutorial from "./image-swipe-tutorial";
import OfferModal from "./offer-modal";
import ShareModal from "./modals/share-modal";
import { PropertyDetailsDialog } from "./property-details-dialog";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { TrendingUp, TrendingDown, Minus, Eye, Heart, Bookmark, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatNZD, formatLocation } from "@/lib/format";

interface PropertyCardProps {
  property: Property;
  isBackground?: boolean;
  onPropertyTypeFilter?: (type: string) => void;
  selectedPropertyType?: string;
  user?: { id: string; name: string; email: string } | null;
  onOpenAuth?: () => void;
}

const propertyTypeColors = {
  residential: "border-blue-500 bg-blue-50 text-blue-700",
  rental: "border-green-500 bg-green-50 text-green-700",
  commercial: "border-orange-500 bg-orange-50 text-orange-700",
  lease: "border-purple-500 bg-purple-50 text-purple-700",
};

export default function PropertyCard({ property, isBackground = false, onPropertyTypeFilter, selectedPropertyType, user: userProp, onOpenAuth }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current user
  const { data: user } = useQuery<{ id: string; name: string; email: string } | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Check if property is saved by current user
  const { data: savedStatus } = useQuery<{ isSaved: boolean }>({
    queryKey: [`/api/properties/${property.id}/is-saved`],
    enabled: !!user, // Only check if user is logged in
    retry: false,
  });

  // Update isSaved state when savedStatus changes
  useEffect(() => {
    if (savedStatus?.isSaved !== undefined) {
      setIsSaved(savedStatus.isSaved);
    } else if (!user) {
      // Reset saved state when user logs out
      setIsSaved(false);
    }
  }, [savedStatus, user]);

  // Track view when property card becomes visible (only for main cards, not background cards)
  const viewMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      return await apiRequest("POST", `/api/properties/${propertyId}/view`);
    },
  });

  // Like property mutation
  const [isLiked, setIsLiked] = useState(false);
  const likeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/properties/${property.id}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: user?.id ? [`/api/users/${user.id}/liked-properties`] : [] });
      setIsLiked(!isLiked);
      toast({
        title: "Property liked!",
        description: "Added to your liked properties",
      });
    },
    onError: (error: Error) => {
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        toast({
          title: "Login required",
          description: "Please login to like properties",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to like",
          description: "Please try again",
          variant: "destructive",
        });
      }
    },
  });

  // Save property mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/properties/${property.id}/save`);
      return response.json();
    },
    onSuccess: (data: { success: boolean; isSaved: boolean }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      queryClient.invalidateQueries({ queryKey: [`/api/properties/${property.id}/is-saved`] });
      setIsSaved(data.isSaved);
      toast({
        title: data.isSaved ? "Saved to favorites" : "Removed from favorites",
        description: data.isSaved ? "Property added to your saved list" : "Property removed from your saved list",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSaveClick = () => {
    if (!user && !userProp) {
      // Not logged in: open auth modal instead of showing error
      onOpenAuth?.();
    } else {
      // Logged in: save the property
      saveMutation.mutate();
    }
  };

  // Track view on mount (only once per property card instance)
  useEffect(() => {
    if (!isBackground) {
      viewMutation.mutate(property.id);
    }
  }, [property.id, isBackground]);
  
  const typeColor =
    propertyTypeColors[property.propertyType as keyof typeof propertyTypeColors] || propertyTypeColors.residential;

  // Fetch area properties for price comparison (only for main cards, not background)
  const { data: areaProperties } = useQuery({
    queryKey: ["/api/properties", property.suburb],
    enabled: !isBackground, // Only fetch for main cards to improve performance
    queryFn: async () => {
      const response = await fetch(`/api/properties?suburb=${encodeURIComponent(property.suburb)}`, {
        credentials: "include"
      });
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Calculate price comparison
  const getPriceComparison = () => {
    if (isBackground || !areaProperties || areaProperties.length < 3) return null;

    // Parse current property price (remove $ and , characters)
    const currentPrice = parseFloat(property.price.replace(/[\$,]/g, ''));
    if (isNaN(currentPrice)) return null;

    // Filter properties with valid prices and similar type
    const validProperties = areaProperties.filter((p: Property) => {
      const price = parseFloat(p.price.replace(/[\$,]/g, ''));
      return !isNaN(price) && p.propertyType === property.propertyType && p.id !== property.id;
    });

    if (validProperties.length < 2) return null;

    // Calculate average price
    const averagePrice = validProperties.reduce((sum: number, p: Property) => {
      return sum + parseFloat(p.price.replace(/[\$,]/g, ''));
    }, 0) / validProperties.length;

    const percentageDiff = ((currentPrice - averagePrice) / averagePrice) * 100;
    
    return {
      averagePrice,
      currentPrice,
      percentageDiff,
      sampleSize: validProperties.length
    };
  };

  const priceComparison = getPriceComparison();

  // Combine main image and additional images into one array
  const allImages = [
    property.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    ...(property.additionalImages || [])
  ];

  // Create media array combining images, video, and audio
  const allMedia = [
    ...allImages.map(url => ({ type: 'image', url })),
    ...(property.videoUrl ? [{ type: 'video', url: property.videoUrl }] : []),
    ...(property.audioUrl ? [{ type: 'audio', url: property.audioUrl }] : []),
  ];

  const hasMultipleMedia = allMedia.length > 1;
  const currentMedia = allMedia[currentImageIndex] || { type: 'image', url: allImages[0] };
  
  // Legacy support
  const hasMultipleImages = allImages.length > 1;
  const currentImage = allImages[currentImageIndex];

  // Tutorial logic - show once when user first encounters multiple media
  useEffect(() => {
    if (!hasMultipleMedia || isBackground) return;
    
    const hasSeenTutorial = localStorage.getItem('image-swipe-tutorial-seen');
    if (!hasSeenTutorial) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000); // Delay to let user see the property first
      
      return () => clearTimeout(timer);
    }
  }, [hasMultipleMedia, isBackground]);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem('image-swipe-tutorial-seen', 'true');
  };

  const handlePreviousImage = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (hasMultipleMedia) {
      // Add small delay to prevent accidental rapid triggers
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1));
      }, 50);
    }
  };

  const handleNextImage = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (hasMultipleMedia) {
      // Add small delay to prevent accidental rapid triggers
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1));
      }, 50);
    }
  };

  // Handle double-tap for both mouse and touch - Opens PropertyDetailsDialog
  let tapCount = 0;
  let tapTimer: NodeJS.Timeout;

  const handleCardDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-testid^="tap-zone-"]') && !target.closest('.z-50')) {
      // Open PropertyDetailsDialog instead of flipping the card
      setShowDetailsDialog(true);
    }
  };

  const handleCardTap = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[data-testid^="tap-zone-"]') && !target.closest('.z-50')) {
      tapCount++;
      if (tapCount === 1) {
        tapTimer = setTimeout(() => {
          tapCount = 0;
        }, 300);
      } else if (tapCount === 2) {
        clearTimeout(tapTimer);
        tapCount = 0;
        // Open PropertyDetailsDialog instead of flipping the card
        setShowDetailsDialog(true);
      }
    }
  };

  return (
    <div 
      className="w-full h-full relative select-none cursor-pointer"
      style={{ perspective: "1000px" }}
      onDoubleClick={handleCardDoubleTap}
      onTouchEnd={handleCardTap}
      onClick={handleCardTap}
    >
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.320, 1] }}
      >
        {/* Front Side - Original Card */}
        <motion.div
          className="absolute inset-0 w-full h-full"
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Render based on media type */}
          {currentMedia.type === 'image' && (
            <img
              src={currentMedia.url}
              alt={`${property.title} - Image ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          )}
          
          {currentMedia.type === 'video' && (
            <div className="relative w-full h-full">
              <video
                src={currentMedia.url}
                className="w-full h-full object-cover"
                controls
                poster={property.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"}
                preload="metadata"
              />
              <div className="absolute top-4 left-4 bg-black/80 text-white px-2 py-1 rounded-md text-xs font-medium">
                <i className="fas fa-video mr-1"></i>
                Video Tour
              </div>
            </div>
          )}
          
          {currentMedia.type === 'audio' && (
            <div className="relative w-full h-full bg-gradient-to-br from-orange-100 to-orange-200">
              {/* Background image for audio */}
              <img
                src={property.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"}
                alt={property.title}
                className="w-full h-full object-cover opacity-60"
                draggable={false}
              />
              
              {/* Audio player overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
                <div className="bg-white rounded-full p-4 mb-4">
                  <i className="fas fa-microphone text-orange-600 text-2xl"></i>
                </div>
                <audio
                  src={currentMedia.url}
                  controls
                  className="w-[90%] max-w-xs"
                  preload="metadata"
                />
                <div className="text-white text-sm font-medium mt-2">
                  Audio Description
                </div>
              </div>
            </div>
          )}

          {/* Media Navigation Tap Zones - Only show if multiple media */}
          {hasMultipleMedia && (
        <>
          {/* Left tap zone */}
          <div 
            className="absolute top-0 left-0 w-[20%] h-full z-40 cursor-pointer"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handlePreviousImage(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handlePreviousImage(e);
            }}
            data-testid="tap-zone-previous-image"
          />
          
          {/* Right tap zone */}
          <div 
            className="absolute top-0 right-0 w-[20%] h-full z-40 cursor-pointer"
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              handleNextImage(e);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              e.stopPropagation();
              handleNextImage(e);
            }}
            data-testid="tap-zone-next-image"
          />
          
          {/* Media indicator dots */}
          <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
            {allMedia.map((media, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-200 relative ${
                  index === currentImageIndex 
                    ? 'bg-white shadow-lg scale-110' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                data-testid={`media-dot-${index}`}
              >
                {/* Add small indicator for media type */}
                {media.type === 'video' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-play text-[6px] text-white"></i>
                  </div>
                )}
                {media.type === 'audio' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full flex items-center justify-center">
                    <i className="fas fa-volume-up text-[6px] text-white"></i>
                  </div>
                )}
              </div>
            ))}
          </div>
            </>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

          {!isBackground && (
            <>
              {/* All Buttons Inline - Top Right (TikTok Style) */}
              <div className="absolute top-4 right-4 z-50 flex flex-col gap-4 items-center">
                
                {/* Likes */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    likeMutation.mutate();
                  }}
                  className="flex flex-col items-center gap-0.5 transition-transform active:scale-95"
                  data-testid="button-like-property"
                >
                  <Heart 
                    className={`h-7 w-7 drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] transition-all ${
                      isLiked 
                        ? 'text-red-500 fill-red-500 animate-pulse' 
                        : 'text-white'
                    }`} 
                  />
                  <span className="text-white text-xs font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" data-testid="text-metric-likes">
                    {property.likes || 0}
                  </span>
                </button>
                
                {/* Saves */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSaveClick();
                  }}
                  className="flex flex-col items-center gap-0.5 transition-transform active:scale-95"
                  data-testid="button-save-property"
                >
                  <Bookmark 
                    className={`h-7 w-7 drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] transition-all ${
                      isSaved 
                        ? 'text-amber-400 fill-amber-400 animate-pulse' 
                        : 'text-white'
                    }`} 
                  />
                  <span className="text-white text-xs font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]" data-testid="text-metric-saves">
                    {property.saves || 0}
                  </span>
                </button>
                
                {/* Share */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowShareModal(true);
                  }}
                  className="flex flex-col items-center gap-0.5 transition-transform active:scale-95"
                  data-testid="button-share-property"
                >
                  <Share2 className="h-7 w-7 text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]" />
                </button>
                
              </div>

            {/* type filter */}
            {onPropertyTypeFilter && (
              <div
                className="absolute top-4 left-4 z-50"
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              >
                <PropertyTypeDropdown currentType={selectedPropertyType || property.propertyType} onTypeChange={onPropertyTypeFilter} />
              </div>
            )}
            </>
          )}

          {/* info */}
          <div className="absolute bottom-24 left-0 right-0 p-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold leading-tight">{property.title}</h2>
              {/* Verification Badge next to title */}
              {property.isLinzValidated && (
                <div className="bg-blue-600 px-2 py-1 rounded-full flex items-center gap-1 backdrop-blur-sm border border-blue-500 shadow-lg">
                  <svg 
                    className="w-3 h-3 text-white flex-shrink-0" 
                    fill="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="text-white text-xs font-medium hidden sm:inline">Verified</span>
                </div>
              )}
            </div>
            <p className="text-white/80 text-sm">{property.address}</p>

            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-col">
                <span className="text-2xl font-bold">{formatNZD(property.price)}</span>
                
                {/* ⭐ AUTOMATIC STAR RATINGS - Based on Like Count (10 likes per star) */}
                {property.averageRating && property.totalRatings && property.totalRatings > 0 ? (
                  <div
                    className="flex items-center gap-1 mt-1"
                    data-testid="property-rating-display"
                  >
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-3 h-3 ${
                            star <= Math.round(parseFloat(property.averageRating || '0'))
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-400 fill-gray-400'
                          }`}
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs text-white/70 ml-1">
                      {parseFloat(property.averageRating).toFixed(0)} ⭐ ({property.likes} likes)
                    </span>
                  </div>
                ) : null}
                
                {/* Price Comparison Indicator */}
                {priceComparison && (
                  <div className="flex items-center gap-1 mt-1">
                    {Math.abs(priceComparison.percentageDiff) < 5 ? (
                      <div className="flex items-center gap-1 text-white/70">
                        <Minus className="h-3 w-3" />
                        <span className="text-xs">Market rate</span>
                      </div>
                    ) : priceComparison.percentageDiff > 0 ? (
                      <div className="flex items-center gap-1 text-red-300">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          {Math.round(priceComparison.percentageDiff)}% above avg
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-green-300">
                        <TrendingDown className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          {Math.round(Math.abs(priceComparison.percentageDiff))}% below avg
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-5 text-sm">
                {property.bedrooms ? (
                  <span className="flex items-center gap-1.5">
                    <i className="fas fa-bed text-blue-200" />
                    <span>{property.bedrooms}</span>
                  </span>
                ) : null}
                {property.bathrooms ? (
                  <span className="flex items-center gap-1.5">
                    <i className="fas fa-shower text-cyan-200" />
                    <span>{property.bathrooms}</span>
                  </span>
                ) : null}
                {property.carSpaces ? (
                  <span className="flex items-center gap-1.5">
                    <i className="fas fa-car text-green-200" />
                    <span>{property.carSpaces}</span>
                  </span>
                ) : null}
                {property.floorArea ? (
                  <span className="flex items-center gap-1.5">
                    <i className="fas fa-home text-yellow-200" />
                    <span>{property.floorArea}m²</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center text-xs text-white/70 mt-2">
              <span>{formatLocation(property.suburb, property.city)}</span>
            </div>

            {/* Express Interest - only for logged-in users */}
            {(userProp || user) && (
              <button
                className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Express Interest clicked for property:', property.id);
                  setShowOfferModal(true);
                }}
                data-testid="button-express-interest"
              >
                <i className="fas fa-envelope text-lg"></i>
                <span>Express Interest</span>
              </button>
            )}
          </div>

          {/* Image Swipe Tutorial */}
          {hasMultipleImages && (
            <ImageSwipeTutorial
              isVisible={showTutorial}
              onComplete={handleTutorialComplete}
              imageCount={allImages.length}
            />
          )}
        </motion.div>

        {/* Back Side - Property Details */}
        <motion.div
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 text-white"
          style={{ 
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)"
          }}
        >
          <div className="h-full overflow-y-auto p-6 space-y-4">
              {/* Main Image */}
              <div className="space-y-3">
                <img
                  src={currentImage}
                  alt={`${property.title} - Main view`}
                  className="w-full h-48 object-cover rounded-lg"
                />
                
                {/* Thumbnail Images */}
                {hasMultipleImages && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {allImages.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${property.title} - View ${index + 1}`}
                        className={`w-16 h-16 object-cover rounded cursor-pointer flex-shrink-0 border-2 transition-all ${
                          index === currentImageIndex ? 'border-white' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Title and Address */}
              <div className="border-b border-gray-700 pb-4">
                <h2 className="text-xl font-bold mb-1">{property.title}</h2>
                <p className="text-gray-300 text-sm">{property.address}</p>
                <p className="text-gray-400 text-sm">{property.suburb}</p>
              </div>

              {/* Property Details */}
              <div className="space-y-4">
              {/* Price */}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">Price</div>
                <div className="text-2xl font-bold text-green-400">{formatNZD(property.price)}</div>
              </div>

              {/* Key Features */}
              <div className="bg-gray-800/50 rounded-lg p-3">
                <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Features</div>
                <div className="grid grid-cols-2 gap-3">
                  {property.bedrooms && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-bed text-blue-400 w-4"></i>
                      <span className="text-sm">{property.bedrooms} bed{property.bedrooms > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-shower text-cyan-400 w-4"></i>
                      <span className="text-sm">{property.bathrooms} bath{property.bathrooms > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {property.carSpaces && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-car text-green-400 w-4"></i>
                      <span className="text-sm">{property.carSpaces} park{property.carSpaces > 1 ? 'ing' : ''}</span>
                    </div>
                  )}
                  {property.floorArea && (
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-home text-yellow-400 w-4"></i>
                      <span className="text-sm">{property.floorArea}m² floor</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-3">
                {property.landArea && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="text-gray-400 text-sm">Land Area</span>
                    <span className="font-medium">{property.landArea}m²</span>
                  </div>
                )}
                {property.yearBuilt && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="text-gray-400 text-sm">Year Built</span>
                    <span className="font-medium">{property.yearBuilt}</span>
                  </div>
                )}
                {property.zoning && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="text-gray-400 text-sm">Zoning</span>
                    <span className="font-medium">{property.zoning}</span>
                  </div>
                )}
                {property.lotNumber && (
                  <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="text-gray-400 text-sm">Lot Number</span>
                    <span className="font-medium text-xs">{property.lotNumber}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              {property.description && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="text-gray-400 text-xs uppercase tracking-wide mb-2">Description</div>
                  <p className="text-sm leading-relaxed text-gray-300">{property.description}</p>
                </div>
              )}

              {/* Verification Status */}
              {property.isLinzValidated && (
                <div className="flex items-center justify-center mt-4 p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
                  <svg className="w-4 h-4 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <span className="text-xs text-blue-400 font-medium">Property Details Verified</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Express Interest Modal - Simple Offer Form */}
      {showOfferModal && (
        <OfferModal
          isOpen={showOfferModal}
          onClose={() => setShowOfferModal(false)}
          property={property}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        property={property}
      />

      {/* Property Details Dialog - Unified across home and liked pages */}
      <PropertyDetailsDialog
        property={property}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        isLoggedIn={!!user}
      />
    </div>
  );
}
