// src/components/property-card.tsx
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Property } from "@shared/schema";
import PropertyMetrics from "./property-metrics";
import PropertyTypeDropdown from "./property-type-dropdown";
import ImageSwipeTutorial from "./image-swipe-tutorial";
import { motion } from "framer-motion";

interface PropertyCardProps {
  property: Property;
  isBackground?: boolean;
  onPropertyTypeFilter?: (type: string) => void;
  selectedPropertyType?: string;
}

const propertyTypeColors = {
  residential: "border-blue-500 bg-blue-50 text-blue-700",
  rental: "border-green-500 bg-green-50 text-green-700",
  commercial: "border-orange-500 bg-orange-50 text-orange-700",
  lease: "border-purple-500 bg-purple-50 text-purple-700",
};

export default function PropertyCard({ property, isBackground = false, onPropertyTypeFilter, selectedPropertyType }: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [, setLocation] = useLocation();
  
  const typeColor =
    propertyTypeColors[property.propertyType as keyof typeof propertyTypeColors] || propertyTypeColors.residential;

  // Combine main image and additional images into one array
  const allImages = [
    property.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
    ...(property.additionalImages || [])
  ];

  const hasMultipleImages = allImages.length > 1;
  const currentImage = allImages[currentImageIndex];

  // Tutorial logic - show once when user first encounters multiple images
  useEffect(() => {
    if (!hasMultipleImages || isBackground) return;
    
    const hasSeenTutorial = localStorage.getItem('image-swipe-tutorial-seen');
    if (!hasSeenTutorial) {
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 1000); // Delay to let user see the property first
      
      return () => clearTimeout(timer);
    }
  }, [hasMultipleImages, isBackground]);

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem('image-swipe-tutorial-seen', 'true');
  };

  const handlePreviousImage = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (hasMultipleImages) {
      // Add small delay to prevent accidental rapid triggers
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
      }, 50);
    }
  };

  const handleNextImage = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (hasMultipleImages) {
      // Add small delay to prevent accidental rapid triggers
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
      }, 50);
    }
  };

  const handleCardDoubleTap = (e: React.MouseEvent | React.TouchEvent) => {
    // Only flip if not double-tapping on image navigation zones or other interactive elements
    const target = e.target as HTMLElement;
    if (!target.closest('[data-testid^="tap-zone-"]') && !target.closest('.z-50')) {
      setIsFlipped(!isFlipped);
    }
  };

  return (
    <div 
      className="w-full h-full relative select-none cursor-pointer"
      style={{ perspective: "1000px" }}
      onDoubleClick={handleCardDoubleTap}
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
          <img
            src={currentImage}
            alt={`${property.title} - Image ${currentImageIndex + 1}`}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Image Navigation Tap Zones - Only show if multiple images */}
          {hasMultipleImages && (
        <>
          {/* Left tap zone */}
          <div 
            className="absolute top-0 left-0 w-[20%] h-full z-10 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handlePreviousImage(e);
            }}
            data-testid="tap-zone-previous-image"
          />
          
          {/* Right tap zone */}
          <div 
            className="absolute top-0 right-0 w-[20%] h-full z-10 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              handleNextImage(e);
            }}
            data-testid="tap-zone-next-image"
          />
          
          {/* Image indicator dots */}
          <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
            {allImages.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === currentImageIndex 
                    ? 'bg-white shadow-lg scale-110' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}
                data-testid={`image-dot-${index}`}
              />
            ))}
          </div>
            </>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

          {!isBackground && (
            <>
              {/* metrics only */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <PropertyMetrics views={property.views || 0} likes={property.likes || 0} saves={property.saves || 0} />
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
          <div className="absolute bottom-5 left-0 right-0 p-6 text-white">
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
              <span className="text-xl font-bold">{property.price}</span>
              <div className="flex items-center space-x-4 text-sm">
                {property.bedrooms ? (
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-bed text-blue-200" />
                    <span>{property.bedrooms}</span>
                  </span>
                ) : null}
                {property.bathrooms ? (
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-shower text-cyan-200" />
                    <span>{property.bathrooms}</span>
                  </span>
                ) : null}
                {property.carSpaces ? (
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-car text-green-200" />
                    <span>{property.carSpaces}</span>
                  </span>
                ) : null}
                {property.floorArea ? (
                  <span className="flex items-center space-x-1">
                    <i className="fas fa-home text-yellow-200" />
                    <span>{property.floorArea}m²</span>
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-white/70 mt-2">
              <span>{property.suburb}</span>
              {property.lotNumber && <span>{property.lotNumber}</span>}
            </div>
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
                <div className="text-2xl font-bold text-green-400">{property.price}</div>
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
    </div>
  );
}
