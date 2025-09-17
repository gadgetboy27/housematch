import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Car, Home, MapPin, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PropertyDetailsModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export default function PropertyDetailsModal({ property, isOpen, onClose }: PropertyDetailsModalProps) {
  const propertyTypeColors = {
    residential: "bg-blue-100 text-blue-800 border-blue-200",
    rental: "bg-green-100 text-green-800 border-green-200",
    commercial: "bg-orange-100 text-orange-800 border-orange-200",
    lease: "bg-purple-100 text-purple-800 border-purple-200",
  };

  const typeColor = propertyTypeColors[property.propertyType as keyof typeof propertyTypeColors] || propertyTypeColors.residential;

  // Fetch area properties for price comparison
  const { data: areaProperties } = useQuery({
    queryKey: ["/api/properties", property.suburb],
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
    if (!areaProperties || areaProperties.length < 3) return null;

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto max-h-[80vh] overflow-y-auto" data-testid="modal-property-details">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Property Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Main Image */}
          <div className="space-y-3">
            <img
              src={property.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=400"}
              alt={property.title}
              className="w-full h-48 object-cover rounded-lg"
              data-testid="img-property-detail"
            />
            
            {/* Additional Images Gallery */}
            <div className="grid grid-cols-3 gap-2">
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
                alt="Kitchen"
                className="w-full h-20 object-cover rounded"
                data-testid="img-gallery-1"
              />
              <img
                src="https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
                alt="Living Room"
                className="w-full h-20 object-cover rounded"
                data-testid="img-gallery-2"
              />
              <img
                src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"
                alt="Bedroom"
                className="w-full h-20 object-cover rounded"
                data-testid="img-gallery-3"
              />
            </div>
          </div>

          {/* Property Info */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-secondary" data-testid="text-detail-title">
                  {property.title}
                </h2>
                <Badge className={typeColor} data-testid="badge-property-type">
                  {property.propertyType}
                </Badge>
              </div>
              <p className="text-muted-foreground" data-testid="text-detail-address">
                {property.address}
              </p>
              <div className="mt-2">
                <p className="text-2xl font-bold text-primary" data-testid="text-detail-price">
                  {property.price}
                </p>
                {/* Price Comparison */}
                {priceComparison && (
                  <div className="mt-2 flex items-center gap-2" data-testid="price-comparison">
                    {Math.abs(priceComparison.percentageDiff) < 5 ? (
                      <div className="flex items-center gap-1 text-gray-500">
                        <Minus className="h-4 w-4" />
                        <span className="text-sm">
                          In line with area average ({priceComparison.sampleSize} properties)
                        </span>
                      </div>
                    ) : priceComparison.percentageDiff > 0 ? (
                      <div className="flex items-center gap-1 text-red-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {Math.round(priceComparison.percentageDiff)}% above area average
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {Math.round(Math.abs(priceComparison.percentageDiff))}% below area average
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {priceComparison && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Area average: ${priceComparison.averagePrice.toLocaleString()} (based on {priceComparison.sampleSize} {property.propertyType} properties in {property.suburb})
                  </p>
                )}
              </div>
            </div>

            {/* Basic Details with Icons */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-border">
              {property.bedrooms && property.bedrooms > 0 && (
                <div className="text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Bed className="h-5 w-5 text-blue-500" />
                    <div className="text-2xl font-bold text-secondary" data-testid="text-detail-bedrooms">
                      {property.bedrooms}
                    </div>
                    <div className="text-sm text-muted-foreground">Bedrooms</div>
                  </div>
                </div>
              )}
              {property.bathrooms && property.bathrooms > 0 && (
                <div className="text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Bath className="h-5 w-5 text-cyan-500" />
                    <div className="text-2xl font-bold text-secondary" data-testid="text-detail-bathrooms">
                      {property.bathrooms}
                    </div>
                    <div className="text-sm text-muted-foreground">Bathrooms</div>
                  </div>
                </div>
              )}
              {property.carSpaces && property.carSpaces > 0 && (
                <div className="text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Car className="h-5 w-5 text-green-500" />
                    <div className="text-2xl font-bold text-secondary" data-testid="text-detail-car-spaces">
                      {property.carSpaces}
                    </div>
                    <div className="text-sm text-muted-foreground">Parking</div>
                  </div>
                </div>
              )}
              {property.floorArea && property.floorArea > 0 && (
                <div className="text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Home className="h-5 w-5 text-orange-500" />
                    <div className="text-2xl font-bold text-secondary" data-testid="text-detail-floor-area">
                      {property.floorArea}m²
                    </div>
                    <div className="text-sm text-muted-foreground">Floor Area</div>
                  </div>
                </div>
              )}
              {property.landArea && property.landArea > 0 && (
                <div className="text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <MapPin className="h-5 w-5 text-purple-500" />
                    <div className="text-2xl font-bold text-secondary" data-testid="text-detail-land-area">
                      {property.landArea}m²
                    </div>
                    <div className="text-sm text-muted-foreground">Land Area</div>
                  </div>
                </div>
              )}
            </div>

            {/* NZ Property Details */}
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h3 className="font-semibold text-secondary">Property Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {property.lotNumber && (
                  <div>
                    <span className="text-muted-foreground">Council Lot:</span>
                    <div className="font-medium" data-testid="text-detail-lot-number">
                      {property.lotNumber}
                    </div>
                  </div>
                )}
                {property.zoning && (
                  <div>
                    <span className="text-muted-foreground">Zone:</span>
                    <div className="font-medium" data-testid="text-detail-zoning">
                      {property.zoning}
                    </div>
                  </div>
                )}
                {property.certificateOfTitle && !property.hideCertificateOfTitle && (
                  <div>
                    <span className="text-muted-foreground">Title:</span>
                    <div className="font-medium" data-testid="text-detail-certificate">
                      {property.certificateOfTitle}
                    </div>
                  </div>
                )}
                {property.certificateOfTitle && property.hideCertificateOfTitle && (
                  <div>
                    <span className="text-muted-foreground">Title:</span>
                    <div className="font-medium text-gray-500" data-testid="text-detail-certificate-hidden">
                      🔒 Hidden for privacy
                    </div>
                  </div>
                )}
                {property.yearBuilt && (
                  <div>
                    <span className="text-muted-foreground">Year Built:</span>
                    <div className="font-medium" data-testid="text-detail-year-built">
                      {property.yearBuilt}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {property.description && (
              <div>
                <h3 className="font-semibold text-secondary mb-2">Description</h3>
                <p className="text-muted-foreground text-sm" data-testid="text-detail-description">
                  {property.description}
                </p>
              </div>
            )}

            {/* Available Reports */}
            <div className="bg-accent/10 p-4 rounded-lg">
              <h4 className="font-semibold text-accent mb-3">Available Reports</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span>LIM Report</span>
                  <Button variant="outline" size="sm" data-testid="button-order-lim">
                    $349
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <span>Building Inspection</span>
                  <Button variant="outline" size="sm" data-testid="button-order-inspection">
                    $450
                  </Button>
                </div>
                <div className="flex justify-between items-center">
                  <span>Property History</span>
                  <Button variant="outline" size="sm" data-testid="button-order-history">
                    $89
                  </Button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button variant="outline" className="flex-1" data-testid="button-save-property">
                <i className="fas fa-bookmark mr-2"></i>
                Save
              </Button>
              <Button className="flex-1" data-testid="button-contact-agent">
                <i className="fas fa-phone mr-2"></i>
                Contact
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
