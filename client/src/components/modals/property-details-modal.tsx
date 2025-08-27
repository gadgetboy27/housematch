import { Property } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
              <p className="text-2xl font-bold text-primary mt-2" data-testid="text-detail-price">
                {property.price}
              </p>
            </div>

            {/* Basic Details */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-border">
              {property.bedrooms > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary" data-testid="text-detail-bedrooms">
                    {property.bedrooms}
                  </div>
                  <div className="text-sm text-muted-foreground">Bedrooms</div>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary" data-testid="text-detail-bathrooms">
                    {property.bathrooms}
                  </div>
                  <div className="text-sm text-muted-foreground">Bathrooms</div>
                </div>
              )}
              {property.floorArea > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary" data-testid="text-detail-floor-area">
                    {property.floorArea}m²
                  </div>
                  <div className="text-sm text-muted-foreground">Floor Area</div>
                </div>
              )}
              {property.landArea > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary" data-testid="text-detail-land-area">
                    {property.landArea}m²
                  </div>
                  <div className="text-sm text-muted-foreground">Land Area</div>
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
                {property.certificateOfTitle && (
                  <div>
                    <span className="text-muted-foreground">Title:</span>
                    <div className="font-medium" data-testid="text-detail-certificate">
                      {property.certificateOfTitle}
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
