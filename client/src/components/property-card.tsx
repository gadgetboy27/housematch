// src/components/property-card.tsx
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
  const typeColor =
    propertyTypeColors[property.propertyType as keyof typeof propertyTypeColors] || propertyTypeColors.residential;

  return (
    <div className="w-full h-full relative select-none">
      <img
        src={
          property.imageUrl ||
          "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
        }
        alt={property.title}
        className="w-full h-full object-cover"
        draggable={false}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />

      {!isBackground && (
        <>
          {/* metrics */}
          <div className="absolute top-4 right-4">
            <PropertyMetrics views={property.views || 0} likes={property.likes || 0} saves={property.saves || 0} />
          </div>

          {/* type filter */}
          {onPropertyTypeFilter && (
            <div
              className="absolute top-4 left-4 z-50"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <PropertyTypeDropdown currentType={property.propertyType} onTypeChange={onPropertyTypeFilter} />
            </div>
          )}
        </>
      )}

      {/* info */}
      <div className="absolute bottom-5 left-0 right-0 p-6 text-white">
        <h2 className="text-2xl font-bold leading-tight">{property.title}</h2>
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
    </div>
  );
}
