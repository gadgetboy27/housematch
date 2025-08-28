import { Card, CardContent } from "@/components/ui/card";
import { Property } from "@shared/schema";
import { MapPin, Bed, Bath, Car, Ruler } from "lucide-react";

interface PropertyCardProps {
  property: Property;
  isBackground?: boolean;
  onPropertyTypeFilter?: (type: string) => void;
}

export default function PropertyCard({ property, isBackground, onPropertyTypeFilter }: PropertyCardProps) {
  return (
    <Card className={`w-full max-w-md rounded-2xl shadow-lg overflow-hidden ${isBackground ? 'opacity-80' : ''}`}>
      <CardContent className="p-0">
        <div className="relative w-full h-80">
          <img
            src={property.imageUrl || "https://picsum.photos/600/400"}
            alt={property.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4 space-y-2">
          <h2 className="text-lg font-semibold">{property.title}</h2>
          <div className="flex items-center text-sm text-gray-500">
            <MapPin className="w-4 h-4 mr-1" />
            {property.suburb}
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span className="flex items-center">
              <Bed className="w-4 h-4 mr-1" /> {property.bedrooms}
            </span>
            <span className="flex items-center">
              <Bath className="w-4 h-4 mr-1" /> {property.bathrooms}
            </span>
            <span className="flex items-center">
              <Car className="w-4 h-4 mr-1" /> {property.carSpaces || 0}
            </span>
            <span className="flex items-center">
              <Ruler className="w-4 h-4 mr-1" /> {property.floorArea || 0} m²
            </span>
          </div>
          <div className="text-lg font-bold text-primary">
            {property.price}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
