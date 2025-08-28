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
        <div className="relative w-full h-[580px]">
          <img
            src={property.imageUrl || "https://picsum.photos/600/400"}
            alt={property.title}
            className="w-full h-full object-cover"
          />
          
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          
          {/* Overlayed content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <div className="space-y-3">
              <div className="text-2xl font-bold text-primary bg-white/90 text-black px-3 py-1 rounded-lg inline-block">
                {property.price}
              </div>
              
              <h2 className="text-xl font-bold drop-shadow-lg">{property.title}</h2>
              
              <div className="flex items-center text-sm text-white/90 drop-shadow-md">
                <MapPin className="w-4 h-4 mr-1" />
                {property.suburb}
              </div>
              
              <div className="flex justify-between text-sm text-white/90 bg-black/30 backdrop-blur-sm rounded-lg p-3">
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
