import { Property } from "@shared/schema";
import PropertyMetrics from "./property-metrics";
import PropertyTypeDropdown from "./property-type-dropdown";

interface PropertyCardProps {
  property: Property;
  isBackground?: boolean;
  onPropertyTypeFilter?: (type: string) => void;
}

const propertyTypeColors = {
  residential: "border-blue-500 bg-blue-50 text-blue-700",
  rental: "border-green-500 bg-green-50 text-green-700",
  commercial: "border-orange-500 bg-orange-50 text-orange-700",
  lease: "border-purple-500 bg-purple-50 text-purple-700",
};

export default function PropertyCard({ property, isBackground = false, onPropertyTypeFilter }: PropertyCardProps) {
  const typeColor = propertyTypeColors[property.propertyType as keyof typeof propertyTypeColors] || propertyTypeColors.residential;

  return (
    <div className="w-full h-full relative">
      {/* Property Image */}
      <img
        src={property.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"}
        alt={property.title}
        className="w-full h-full object-cover"
        data-testid="img-property"
      />
      
      {/* Enhanced Gradient Overlay with Softer Blending */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 via-black/20 to-transparent backdrop-blur-[1px]"></div>
      
      {!isBackground && (
        <>
          {/* TikTok-style Metrics */}
          <div className="absolute top-4 right-4">
            <PropertyMetrics 
              views={property.views || 0}
              likes={property.likes || 0}
              saves={property.saves || 0}
            />
          </div>
          
          {/* Property Type Dropdown */}
          <div className="absolute top-4 left-4 z-[100]">
            {onPropertyTypeFilter && (
              <div 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                }}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                style={{ touchAction: 'none' }}
              >
                <PropertyTypeDropdown 
                  currentType={property.propertyType}
                  onTypeChange={onPropertyTypeFilter}
                />
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Property Info */}
      <div className="absolute bottom-5 left-0 right-0 p-6 text-white">
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold leading-tight" data-testid="text-property-title">
              {property.title}
            </h2>
            <p className="text-white/80 text-sm" data-testid="text-property-address">
              {property.address}
            </p>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold" data-testid="text-property-price">
              {property.price}
            </div>
            <div className="flex items-center space-x-4 text-sm">
              {(property.bedrooms || 0) > 0 && (
                <span className="flex items-center space-x-1" data-testid="text-bedrooms">
                  <i className="fas fa-bed text-blue-200"></i>
                  <span>{property.bedrooms}</span>
                </span>
              )}
              {(property.bathrooms || 0) > 0 && (
                <span className="flex items-center space-x-1" data-testid="text-bathrooms">
                  <i className="fas fa-shower text-cyan-200"></i>
                  <span>{property.bathrooms}</span>
                </span>
              )}
              {(property.carSpaces || 0) > 0 && (
                <span className="flex items-center space-x-1" data-testid="text-car-spaces">
                  <i className="fas fa-car text-green-200"></i>
                  <span>{property.carSpaces}</span>
                </span>
              )}
              {(property.floorArea || 0) > 0 && (
                <span className="flex items-center space-x-1" data-testid="text-floor-area">
                  <i className="fas fa-home text-yellow-200"></i>
                  <span>{property.floorArea}m²</span>
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-white/70">
            <span data-testid="text-suburb">{property.suburb}</span>
            {property.lotNumber && (
              <span data-testid="text-lot-number">{property.lotNumber}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
