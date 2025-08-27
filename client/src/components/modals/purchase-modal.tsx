import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface PurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: {
    id: string;
    title: string;
    price: number;
    processingDays: number;
    features: string[];
  };
  onConfirm: (propertyId: string) => void;
  isLoading: boolean;
}

export default function PurchaseModal({ 
  isOpen, 
  onClose, 
  reportType, 
  onConfirm, 
  isLoading 
}: PurchaseModalProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("card");

  const { data: properties = [] } = useQuery({
    queryKey: ["/api/properties"],
    enabled: isOpen,
  });

  const handleConfirmPurchase = () => {
    if (selectedPropertyId) {
      onConfirm(selectedPropertyId);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto max-h-[80vh] overflow-y-auto" data-testid="modal-purchase">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Order {reportType.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Report Summary */}
          <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold" data-testid="text-report-title">
                    {reportType.title}
                  </h3>
                  <ul className="text-white/80 text-sm mt-2 space-y-1">
                    {reportType.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <i className="fas fa-check mr-2 text-xs"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" data-testid="text-report-price">
                    {reportType.price === 0 ? "FREE" : `$${reportType.price}`}
                  </div>
                  {reportType.processingDays > 0 && (
                    <div className="text-white/70 text-xs">
                      {reportType.processingDays} working days
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Selection */}
          <div className="space-y-3">
            <Label htmlFor="property-select">Select Property</Label>
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger data-testid="select-property">
                <SelectValue placeholder="Choose a property..." />
              </SelectTrigger>
              <SelectContent>
                {properties.slice(0, 10).map((property: any) => (
                  <SelectItem key={property.id} value={property.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{property.title}</span>
                      <span className="text-xs text-muted-foreground">{property.address}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Property Preview */}
          {selectedPropertyId && (
            <Card className="border-primary/20">
              <CardContent className="p-4">
                {(() => {
                  const selectedProperty = properties.find((p: any) => p.id === selectedPropertyId);
                  if (!selectedProperty) return null;
                  
                  return (
                    <div className="flex space-x-3">
                      <img
                        src={selectedProperty.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=80&h=80"}
                        alt={selectedProperty.title}
                        className="w-16 h-16 object-cover rounded-lg"
                        data-testid="img-selected-property"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-secondary" data-testid="text-selected-property-title">
                          {selectedProperty.title}
                        </h4>
                        <p className="text-sm text-muted-foreground" data-testid="text-selected-property-address">
                          {selectedProperty.address}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm font-semibold text-primary">
                            {selectedProperty.price}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {selectedProperty.propertyType}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Payment Method */}
          {reportType.price > 0 && (
            <div className="space-y-3">
              <Label>Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("card")}
                  className="h-12"
                  data-testid="button-payment-card"
                >
                  <i className="fas fa-credit-card mr-2"></i>
                  Card
                </Button>
                <Button
                  variant={paymentMethod === "paypal" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("paypal")}
                  className="h-12"
                  data-testid="button-payment-paypal"
                >
                  <i className="fab fa-paypal mr-2"></i>
                  PayPal
                </Button>
              </div>

              {paymentMethod === "card" && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input 
                      id="card-number"
                      placeholder="1234 5678 9012 3456"
                      data-testid="input-card-number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="expiry">Expiry</Label>
                      <Input 
                        id="expiry"
                        placeholder="MM/YY"
                        data-testid="input-card-expiry"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV</Label>
                      <Input 
                        id="cvv"
                        placeholder="123"
                        data-testid="input-card-cvv"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Order Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Order Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Report Type:</span>
                  <span className="font-medium">{reportType.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing Time:</span>
                  <span className="font-medium">
                    {reportType.processingDays === 0 ? "Instant" : `${reportType.processingDays} working days`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>GST (15%):</span>
                  <span className="font-medium">
                    {reportType.price === 0 ? "$0.00" : `$${(reportType.price * 0.15).toFixed(2)}`}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Total:</span>
                  <span data-testid="text-order-total">
                    {reportType.price === 0 ? "FREE" : `$${(reportType.price * 1.15).toFixed(2)}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p>
              By proceeding, you agree to our Terms of Service and Privacy Policy. 
              Reports are sourced from official council records and certified professionals.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onClose}
              disabled={isLoading}
              data-testid="button-cancel-purchase"
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-primary"
              onClick={handleConfirmPurchase}
              disabled={!selectedPropertyId || isLoading}
              data-testid="button-confirm-purchase"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  {reportType.price === 0 ? "Get Report" : "Complete Order"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
