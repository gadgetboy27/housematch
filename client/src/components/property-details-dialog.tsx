import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Mail, FileText, MapPin, Home, Maximize2, Calendar, DollarSign, TrendingUp, TrendingDown, Minus, FileCheck } from "lucide-react";
import OfferModal from "@/components/offer-modal";
import { OfferWizard } from "@/components/OfferWizard";
import { useQuery } from "@tanstack/react-query";
import { Property } from "@shared/schema";
import { useStripePayment } from "@/hooks/use-stripe-payment";
import { PaymentConfirmationAlert } from "@/components/payment-confirmation-alert";
import { reportTypes, getLimReportForCity, hasLimReportForCity } from "@shared/reportConfig";
import { useToast } from "@/hooks/use-toast";
import { formatNZD } from "@/lib/format";

interface PropertyDetailsDialogProps {
  property: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLoggedIn?: boolean;
  onOpenOfferWizard?: (propertyId: string) => void;
}

export function PropertyDetailsDialog({ 
  property, 
  open, 
  onOpenChange,
  isLoggedIn = false,
  onOpenOfferWizard
}: PropertyDetailsDialogProps) {
  const [showExpressInterest, setShowExpressInterest] = useState(false);
  const [showOfferWizard, setShowOfferWizard] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { toast } = useToast();

  // Stripe payment hook
  const { initiatePayment, processPayment, cancelPayment, showConfirmation, currentItem, isProcessing } = useStripePayment();

  // Fetch area properties for price comparison - MUST be before early return to follow Rules of Hooks
  const { data: areaProperties } = useQuery({
    queryKey: ["/api/properties", property?.suburb],
    queryFn: async () => {
      if (!property?.suburb) return [];
      const response = await fetch(`/api/properties?suburb=${encodeURIComponent(property.suburb)}`, {
        credentials: "include"
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: open && !!property?.suburb
  });

  if (!property) return null;

  // Get all images for the property
  const allImages = [
    property.imageUrl,
    ...(property.additionalImages || [])
  ].filter(Boolean);

  const hasMultipleImages = allImages.length > 1;
  const currentImage = allImages[currentImageIndex] || property.imageUrl;

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

  // Purchase handlers for each report type
  const handlePurchaseTitleSearch = () => {
    if (!isLoggedIn) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase reports.",
        variant: "destructive",
      });
      return;
    }

    const report = reportTypes.titleSearch;
    initiatePayment({
      name: report.name,
      description: report.description,
      price: report.ourPriceCents,
      planId: report.id,
      planType: 'report',
      metadata: {
        price: report.ourPriceCents,
        name: report.name,
        description: report.description,
        propertyId: property.id,
        propertyAddress: `${property.address}, ${property.suburb}`,
        propertyTitle: property.title,
        provider: report.provider.name,
        estimatedDays: report.estimatedDays,
      },
    });
  };

  const handlePurchaseLIM = () => {
    if (!isLoggedIn) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase reports.",
        variant: "destructive",
      });
      return;
    }

    // Get LIM report for property's city using configuration
    const report = getLimReportForCity(property.city);
    
    if (!report) {
      toast({
        title: "Report Not Available",
        description: `LIM reports are not available for ${property.city || 'this location'} yet.`,
        variant: "destructive",
      });
      return;
    }
    
    initiatePayment({
      name: report.name,
      description: report.description,
      price: report.ourPriceCents,
      planId: report.id,
      planType: 'report',
      metadata: {
        price: report.ourPriceCents,
        name: report.name,
        description: report.description,
        propertyId: property.id,
        propertyAddress: `${property.address}, ${property.suburb}`,
        propertyTitle: property.title,
        provider: report.provider.name,
        estimatedDays: report.estimatedDays,
      },
    });
  };

  const handlePurchaseBuildingInspection = () => {
    if (!isLoggedIn) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase reports.",
        variant: "destructive",
      });
      return;
    }

    const report = reportTypes.buildingInspection;
    initiatePayment({
      name: report.name,
      description: report.description,
      price: report.ourPriceCents,
      planId: report.id,
      planType: 'report',
      metadata: {
        price: report.ourPriceCents,
        name: report.name,
        description: report.description,
        propertyId: property.id,
        propertyAddress: `${property.address}, ${property.suburb}`,
        propertyTitle: property.title,
        provider: report.provider.name,
        estimatedDays: report.estimatedDays,
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0" data-testid="dialog-property-details">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              <DialogHeader className="mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold mb-2" data-testid="text-property-title">
                      {property.title}
                    </DialogTitle>
                    <DialogDescription className="flex items-start text-base" data-testid="text-property-address">
                      <MapPin className="w-4 h-4 mr-1 mt-1 flex-shrink-0" />
                      <span>{property.address}, {property.suburb}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Main Image */}
              <div className="space-y-3 mb-6">
                <img
                  src={currentImage}
                  alt={`${property.title} - Main view`}
                  className="w-full h-64 object-cover rounded-lg"
                  data-testid="img-property-main"
                />
                
                {/* Thumbnail Images */}
                {hasMultipleImages && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {allImages.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`${property.title} - View ${index + 1}`}
                        className={`w-20 h-20 object-cover rounded cursor-pointer flex-shrink-0 border-2 transition-all ${
                          index === currentImageIndex ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                        data-testid={`img-thumbnail-${index}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 text-green-600 mr-2" />
                    <span className="text-sm text-gray-600">Price</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600" data-testid="text-property-price">
                    {formatNZD(property.price)}
                  </span>
                </div>

                {/* Price Comparison */}
                {priceComparison && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    {Math.abs(priceComparison.percentageDiff) < 5 ? (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Minus className="h-4 w-4" />
                        <span className="text-sm">
                          In line with area average ({priceComparison.sampleSize} properties)
                        </span>
                      </div>
                    ) : priceComparison.percentageDiff > 0 ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {Math.round(priceComparison.percentageDiff)}% above area average
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-700">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {Math.round(Math.abs(priceComparison.percentageDiff))}% below area average
                        </span>
                      </div>
                    )}
                    <p className="text-xs text-green-700 mt-1">
                      Area average: ${priceComparison.averagePrice.toLocaleString()} (based on {priceComparison.sampleSize} {property.propertyType} properties in {property.suburb})
                    </p>
                  </div>
                )}
              </div>

              {/* Key Features Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {property.bedrooms > 0 && (
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-600" data-testid="text-bedrooms">{property.bedrooms}</div>
                    <div className="text-xs text-blue-700">Bedrooms</div>
                  </div>
                )}
                {property.bathrooms > 0 && (
                  <div className="bg-cyan-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-cyan-600" data-testid="text-bathrooms">{property.bathrooms}</div>
                    <div className="text-xs text-cyan-700">Bathrooms</div>
                  </div>
                )}
                {property.carSpaces > 0 && (
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-600" data-testid="text-car-spaces">{property.carSpaces}</div>
                    <div className="text-xs text-green-700">Parking</div>
                  </div>
                )}
                {property.floorArea > 0 && (
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-600" data-testid="text-floor-area">{property.floorArea}m²</div>
                    <div className="text-xs text-purple-700">Floor Area</div>
                  </div>
                )}
              </div>

              {/* Property Details */}
              <div className="space-y-4 mb-6">
                {property.description && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <Home className="w-4 h-4 mr-2" />
                      Description
                    </h3>
                    <p className="text-sm text-gray-600" data-testid="text-description">{property.description}</p>
                  </div>
                )}

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-3">
                  {property.propertyType && (
                    <div>
                      <div className="text-xs text-gray-500">Property Type</div>
                      <Badge variant="secondary" data-testid="badge-property-type">{property.propertyType}</Badge>
                    </div>
                  )}
                  {property.landArea && (
                    <div>
                      <div className="text-xs text-gray-500">Land Area</div>
                      <div className="font-medium" data-testid="text-land-area">{property.landArea}m²</div>
                    </div>
                  )}
                  {property.yearBuilt && (
                    <div>
                      <div className="text-xs text-gray-500">Year Built</div>
                      <div className="font-medium flex items-center" data-testid="text-year-built">
                        <Calendar className="w-3 h-3 mr-1" />
                        {property.yearBuilt}
                      </div>
                    </div>
                  )}
                  {property.zoning && (
                    <div>
                      <div className="text-xs text-gray-500">Zoning</div>
                      <div className="font-medium" data-testid="text-zoning">{property.zoning}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Available Reports */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center mb-3">
                  <FileCheck className="w-5 h-5 text-blue-600 mr-2" />
                  <h4 className="font-semibold text-blue-900">Available Reports</h4>
                </div>
                <div className="space-y-2 text-sm">
                  {/* Title Search - Available everywhere */}
                  <div className="flex justify-between items-center bg-white rounded p-2">
                    <div className="flex flex-col">
                      <span className="text-gray-700">{reportTypes.titleSearch.name}</span>
                      <span className="text-xs text-green-600 font-medium">Available Now</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      onClick={handlePurchaseTitleSearch}
                      disabled={!isLoggedIn}
                      data-testid="button-order-title"
                    >
                      ${(reportTypes.titleSearch.ourPriceCents / 100).toFixed(0)}
                    </Button>
                  </div>
                  
                  {/* LIM Report - Location-specific (configuration-driven) */}
                  {(() => {
                    const limReport = getLimReportForCity(property.city);
                    const hasLim = hasLimReportForCity(property.city);
                    
                    if (limReport) {
                      // LIM report available for this city
                      return (
                        <div className="flex justify-between items-center bg-white rounded p-2">
                          <div className="flex flex-col">
                            <span className="text-gray-700">{limReport.name}</span>
                            <span className="text-xs text-green-600 font-medium">Available Now</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-blue-600 border-blue-600 hover:bg-blue-50"
                            onClick={handlePurchaseLIM}
                            disabled={!isLoggedIn}
                            data-testid="button-order-lim"
                          >
                            ${(limReport.ourPriceCents / 100).toFixed(0)}
                          </Button>
                        </div>
                      );
                    } else if (property.city) {
                      // City specified but no LIM available
                      return (
                        <div className="flex justify-between items-center bg-gray-100 rounded p-2">
                          <div className="flex flex-col">
                            <span className="text-gray-500">LIM Report ({property.city})</span>
                            <span className="text-xs text-gray-500 font-medium">Coming Soon</span>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-gray-400 border-gray-300"
                            disabled
                            data-testid="button-order-lim"
                          >
                            N/A
                          </Button>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Building Inspection - Coming Soon */}
                  <div className="flex justify-between items-center bg-gray-100 rounded p-2">
                    <div className="flex flex-col">
                      <span className="text-gray-500">Building Inspection</span>
                      <span className="text-xs text-gray-500 font-medium">Coming Soon</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-gray-400 border-gray-300"
                      disabled
                      data-testid="button-order-inspection"
                    >
                      $699
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-4 border-t">
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  size="lg"
                  onClick={() => {
                    if (isLoggedIn) {
                      setShowExpressInterest(true);
                    }
                  }}
                  disabled={!isLoggedIn}
                  data-testid="button-express-interest"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isLoggedIn ? 'Express Interest' : 'Login to Express Interest'}
                </Button>

                <Button
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  size="lg"
                  onClick={() => {
                    console.log('🔘 Make Official Offer button clicked');
                    console.log('📍 Property ID:', property?.id);
                    console.log('👤 Is logged in:', isLoggedIn);
                    console.log('📞 Has callback:', !!onOpenOfferWizard);
                    
                    if (isLoggedIn) {
                      if (onOpenOfferWizard) {
                        console.log('✅ Using parent callback (profile page)');
                        onOpenOfferWizard(property.id);
                      } else {
                        console.log('✅ Using internal state (other pages)');
                        setShowOfferWizard(true);
                        onOpenChange(false);
                      }
                    } else {
                      console.log('❌ Not logged in - button should be disabled');
                    }
                  }}
                  disabled={!isLoggedIn}
                  data-testid="button-official-offer"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {isLoggedIn ? 'Make Official Offer (ADLS)' : 'Login to Make Offer'}
                </Button>

                {!isLoggedIn && (
                  <p className="text-xs text-center text-muted-foreground">
                    Please log in to make an offer or express interest
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Express Interest Modal */}
      {showExpressInterest && property && (
        <OfferModal
          property={property}
          isOpen={showExpressInterest}
          onClose={() => setShowExpressInterest(false)}
        />
      )}

      {/* Official Offer Wizard */}
      {showOfferWizard && (
        <OfferWizard
          propertyId={property.id}
          onClose={() => setShowOfferWizard(false)}
        />
      )}

      {/* Payment Confirmation Modal */}
      {showConfirmation && currentItem && (
        <PaymentConfirmationAlert
          isOpen={showConfirmation}
          onClose={cancelPayment}
          onConfirm={processPayment}
          itemName={currentItem.name}
          itemPrice={currentItem.price}
          itemDescription={currentItem.description}
          isProcessing={isProcessing}
        />
      )}
    </>
  );
}
