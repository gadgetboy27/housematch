import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/bottom-navigation";
import PurchaseModal from "@/components/modals/purchase-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const reportTypes = [
  {
    id: "lim",
    title: "LIM Report",
    description: "Complete land information memorandum",
    price: 349,
    processingDays: 10,
    features: [
      "Building consents & permits",
      "Zoning & natural hazards",
      "Council services & rates",
      "Underground services map"
    ],
    color: "bg-gradient-to-r from-blue-500 to-purple-600",
  },
  {
    id: "fast_lim",
    title: "Fast-track LIM",
    description: "Priority processing",
    price: 549,
    processingDays: 3,
    features: [
      "All standard LIM features",
      "Priority processing",
      "2-3 working day delivery",
      "Email & SMS updates"
    ],
    color: "bg-gradient-to-r from-green-500 to-blue-500",
  },
  {
    id: "building_inspection",
    title: "Building Inspection",
    description: "Professional building assessment",
    price: 450,
    processingDays: 5,
    features: [
      "Structural assessment",
      "Electrical & plumbing check",
      "Weatherproofing review",
      "Detailed report with photos"
    ],
    color: "bg-gradient-to-r from-orange-500 to-red-500",
  },
  {
    id: "insurance_quote",
    title: "Insurance Quote",
    description: "Property & contents insurance",
    price: 0,
    processingDays: 0,
    features: [
      "Instant online quote",
      "Multiple provider comparison",
      "House & contents options",
      "No obligation"
    ],
    color: "bg-gradient-to-r from-green-400 to-blue-500",
  },
];

export default function Reports() {
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const { toast } = useToast();

  // Mock user ID for demo
  const userId = "demo-user";

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["/api/purchase-orders", userId],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/purchase-orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order Placed",
        description: "Your report order has been successfully placed!",
      });
      setShowPurchaseModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    },
  });

  const handlePurchase = (reportType: any) => {
    setSelectedReport(reportType);
    setShowPurchaseModal(true);
  };

  const confirmPurchase = (propertyId: string) => {
    if (!selectedReport) return;

    createOrderMutation.mutate({
      userId,
      propertyId,
      reportType: selectedReport.id,
      price: selectedReport.price.toString(),
      processingDays: selectedReport.processingDays,
    });
  };

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-white relative">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-file-alt text-white text-sm"></i>
          </div>
          <h1 className="text-lg font-bold text-secondary">Property Reports</h1>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-20 space-y-6">
        
        {/* Available Reports */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-secondary">Available Reports</h2>
          
          {reportTypes.map((report) => (
            <Card key={report.id} className="overflow-hidden" data-testid={`card-report-${report.id}`}>
              <div className={`${report.color} text-white p-4`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold" data-testid="text-report-title">
                      {report.title}
                    </h3>
                    <p className="text-white/80 text-sm" data-testid="text-report-description">
                      {report.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" data-testid="text-report-price">
                      {report.price === 0 ? "FREE" : `$${report.price}`}
                    </div>
                    {report.processingDays > 0 && (
                      <div className="text-white/70 text-xs" data-testid="text-processing-days">
                        {report.processingDays} working days
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <CardContent className="p-4">
                <ul className="space-y-1 mb-4">
                  {report.features.map((feature, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-center">
                      <i className="fas fa-check text-green-500 mr-2 text-xs"></i>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                <Button 
                  onClick={() => handlePurchase(report)}
                  className="w-full"
                  variant={report.price === 0 ? "default" : "outline"}
                  data-testid={`button-order-${report.id}`}
                >
                  {report.price === 0 ? "Get Free Quote" : `Order ${report.title}`}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order History */}
        {purchaseOrders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-secondary">Your Orders</h2>
            
            {purchaseOrders.map((order: any) => (
              <Card key={order.id} data-testid={`card-order-${order.id}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-secondary" data-testid="text-order-type">
                        {order.reportType.replace('_', ' ').toUpperCase()}
                      </h4>
                      <p className="text-sm text-muted-foreground" data-testid="text-order-date">
                        Ordered: {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-order-price">
                        Price: ${order.price}
                      </p>
                    </div>
                    <div className="text-right">
                      <span 
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : order.status === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                        data-testid="status-order"
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Section */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <h3 className="font-medium text-secondary mb-2">Need Help?</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Our property reports are sourced directly from local councils and certified professionals.
            </p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <i className="fas fa-shield-alt text-green-500"></i>
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center space-x-1">
                <i className="fas fa-clock text-blue-500"></i>
                <span>Fast Processing</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedReport && (
        <PurchaseModal
          isOpen={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          reportType={selectedReport}
          onConfirm={confirmPurchase}
          isLoading={createOrderMutation.isPending}
        />
      )}

      <BottomNavigation />
    </div>
  );
}
