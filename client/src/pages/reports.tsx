import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePageTracking, trackReportPurchase } from "@/components/Analytics";
import BottomNavigation from "@/components/bottom-navigation";
import { PaymentConfirmationAlert } from "@/components/payment-confirmation-alert";
import { useStripePayment } from "@/hooks/use-stripe-payment";
import { ServiceOrderModal } from "@/components/service-order-modal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, Shield, TrendingUp, FileText, Building, BarChart3, Package, MapPin, X } from "lucide-react";
import { reportTypes, reportBundles, formatPrice, getAvailableReportsForCity, getAvailableBundlesForCity, type ReportType, type ReportBundle } from "@shared/reportConfig";
import { ReportsSEO } from "@/components/SEO";

export default function Reports() {
  // Track page view with metadata
  usePageTracking('Property Reports', { 
    page_category: 'reports',
    user_type: 'property_buyer'
  });

  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("individual");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { initiatePayment, processPayment, cancelPayment, showConfirmation, currentItem, isProcessing} = useStripePayment();
  
  // Service order modal state
  const [showServiceOrderModal, setShowServiceOrderModal] = useState(false);
  const [currentServiceInfo, setCurrentServiceInfo] = useState<any>(null);
  
  // Service inquiry state
  const [showServiceInquiry, setShowServiceInquiry] = useState(false);
  const [selectedService, setSelectedService] = useState<{type: string, name: string, price: string} | null>(null);
  const [inquiryForm, setInquiryForm] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    message: ''
  });

  // Service inquiry mutation
  const serviceInquiryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/service-inquiries', data);
    },
    onSuccess: () => {
      toast({
        title: "Inquiry Submitted",
        description: "We'll contact you within 24 hours. Check your email for confirmation.",
      });
      setShowServiceInquiry(false);
      setInquiryForm({ customerName: '', customerEmail: '', customerPhone: '', message: '' });
      setSelectedService(null);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again or email admin@swiperight.nz",
        variant: "destructive",
      });
    }
  });

  // Handle service card click
  const handleServiceClick = (type: string, name: string, price: string) => {
    setSelectedService({ type, name, price });
    setInquiryForm({
      customerName: user?.name || '',
      customerEmail: user?.email || '',
      customerPhone: '',
      message: ''
    });
    setShowServiceInquiry(true);
  };

  // Submit inquiry
  const handleSubmitInquiry = () => {
    if (!selectedService) return;
    
    serviceInquiryMutation.mutate({
      serviceType: selectedService.type,
      serviceName: selectedService.name,
      customerName: inquiryForm.customerName,
      customerEmail: inquiryForm.customerEmail,
      customerPhone: inquiryForm.customerPhone,
      propertyAddress: selectedProperty ? likedProperties.find((p: any) => p.id === selectedProperty)?.address : null,
      message: inquiryForm.message
    });
  };

  // Get current user
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/auth/user", {
          credentials: 'include',
        });
        if (!response.ok) return null;
        return response.json();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch liked properties if user is logged in
  const { 
    data: likedProperties = [], 
    isLoading: likedLoading 
  } = useQuery({
    queryKey: user?.id ? [`/api/users/${user.id}/liked-properties`] : [],
    queryFn: async () => {
      const response = await fetch(`/api/users/${user.id}/liked-properties`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch saved properties if user is logged in
  const { 
    data: savedProperties = [], 
    isLoading: savedLoading 
  } = useQuery({
    queryKey: user?.id ? [`/api/users/${user.id}/saved-properties`] : [],
    queryFn: async () => {
      const response = await fetch(`/api/users/${user.id}/saved-properties`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Combine liked and saved properties, removing duplicates
  const properties = user?.id 
    ? Array.from(
        new Map(
          [...likedProperties, ...savedProperties].map((p: any) => [p.id, p])
        ).values()
      )
    : [];

  const propertiesLoading = likedLoading || savedLoading;
  const propertiesError = null;

  // Combined loading state
  const isLoading = userLoading || propertiesLoading;

  // Debug logging
  console.log("📋 Reports Page - Query State:", {
    userLoading,
    userId: user?.id,
    likedCount: likedProperties.length,
    savedCount: savedProperties.length,
    totalPropertiesCount: properties.length,
    propertiesLoading,
  });

  // Fetch user's purchase orders/reports
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["/api/purchase-orders"],
  });

  // Get selected property details for location-based filtering
  const selectedPropertyDetails = properties.find((p: any) => p.id === selectedProperty);
  const selectedPropertyCity = selectedPropertyDetails?.city;

  // Filter reports based on property location
  // If no city is set, show only non-location-specific reports (no LIM/PIM)
  const individualReports = selectedPropertyCity 
    ? getAvailableReportsForCity(selectedPropertyCity)
    : getAvailableReportsForCity(null); // Safe fallback: shows non-location reports only
  
  const bundles = selectedPropertyCity
    ? getAvailableBundlesForCity(selectedPropertyCity)
    : Object.values(reportBundles);

  // Group reports by category
  const reportsByCategory = individualReports.reduce((acc, report) => {
    if (!acc[report.category]) acc[report.category] = [];
    acc[report.category].push(report);
    return acc;
  }, {} as Record<string, ReportType[]>);

  // Category icons and labels
  const categoryInfo: Record<string, { icon: any; label: string; color: string }> = {
    legal: { icon: FileText, label: "Legal & Ownership", color: "text-blue-600" },
    structural: { icon: Building, label: "Structural & Safety", color: "text-orange-600" },
    market: { icon: BarChart3, label: "Market Analysis", color: "text-green-600" },
    financial: { icon: TrendingUp, label: "Financial", color: "text-purple-600" },
  };

  const handlePurchaseReport = (report: ReportType) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase reports.",
        variant: "destructive",
      });
      setLocation("/profile");
      return;
    }

    // For building inspection and meth testing, show service order modal instead of payment
    if (report.id === 'building_inspection' || report.id === 'meth_testing') {
      const serviceInfo = {
        title: report.name,
        serviceType: report.id as 'building_inspection' | 'meth_testing',
        description: report.detailedDescription || report.description,
        price: formatPrice(report.ourPriceCents),
        turnaround: `${report.estimatedDays} days`,
        icon: <span className="text-2xl">{report.icon}</span>,
        includes: report.includes || [],
        provider: report.provider.name,
        compliance: report.id === 'building_inspection' ? ['NZS 4306:2005', 'LBP Certified'] : ['NZS8510', 'NIOSH 9111'],
      };
      
      setCurrentServiceInfo(serviceInfo);
      setShowServiceOrderModal(true);
      return;
    }

    if (!selectedProperty) {
      toast({
        title: "Select a Property",
        description: "Please select a property before ordering a report.",
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
        propertyId: selectedProperty,
        provider: report.provider.id,
        estimatedDays: report.estimatedDays,
      },
    });
  };

  const handlePurchaseBundle = (bundle: ReportBundle) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to purchase report bundles.",
        variant: "destructive",
      });
      setLocation("/profile");
      return;
    }

    if (!selectedProperty) {
      toast({
        title: "Select a Property",
        description: "Please select a property before ordering a bundle.",
        variant: "destructive",
      });
      return;
    }

    initiatePayment({
      name: bundle.name,
      description: bundle.description,
      price: bundle.bundlePriceCents,
      planId: bundle.id,
      planType: 'report',
      metadata: {
        price: bundle.bundlePriceCents,
        name: bundle.name,
        description: bundle.description,
        propertyId: selectedProperty,
        reportIds: bundle.reportIds,
      },
    });
  };

  const handleConfirmPayment = async () => {
    await processPayment();
  };

  const toggleReportSelection = (reportId: string) => {
    const newSelection = new Set(selectedReports);
    if (newSelection.has(reportId)) {
      newSelection.delete(reportId);
    } else {
      newSelection.add(reportId);
    }
    setSelectedReports(newSelection);
  };

  const getSelectedProperty = () => {
    return (properties as any[]).find((p: any) => p.id === selectedProperty);
  };

  const selectedPropertyData = getSelectedProperty();

  return (
    <>
      <ReportsSEO />
      <div className="max-w-sm mx-auto min-h-screen bg-gradient-to-b from-white to-gray-50 relative">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FileText className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-secondary">Property Reports</h1>
              <p className="text-xs text-muted-foreground">Your one-stop shop</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            <Shield size={12} className="mr-1" /> Secure
          </Badge>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 pb-24 space-y-6">
        
        {/* Property Selection */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center">
              <Building size={18} className="mr-2" />
              Select Property
            </CardTitle>
            <CardDescription className="text-xs">
              Choose which property you need reports for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedProperty || undefined} onValueChange={setSelectedProperty}>
              <SelectTrigger data-testid="select-property">
                <SelectValue placeholder="Choose a property..." />
              </SelectTrigger>
              <SelectContent>
                {(properties as any[]).length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {user ? (
                      <>
                        <p>No liked or saved properties yet</p>
                        <p className="text-xs mt-1">Like or save properties to see them here</p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => setLocation("/")}
                          className="mt-2"
                          data-testid="button-browse-properties"
                        >
                          Browse properties →
                        </Button>
                      </>
                    ) : (
                      <>
                        <p>Please log in to see your properties</p>
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => setLocation("/profile")}
                          className="mt-2"
                          data-testid="button-login"
                        >
                          Log in →
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  (properties as any[]).map((property: any) => (
                    <SelectItem key={property.id} value={property.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{property.title}</span>
                        <span className="text-xs text-muted-foreground">{property.address}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {selectedPropertyData && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium text-secondary">{selectedPropertyData.address}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPropertyData.bedrooms} bed · {selectedPropertyData.bathrooms} bath · {selectedPropertyData.suburb}
                </p>
                {selectedPropertyCity && (
                  <div className="flex items-center mt-2 text-xs text-blue-600">
                    <MapPin size={12} className="mr-1" />
                    <span>Showing {selectedPropertyCity.charAt(0).toUpperCase() + selectedPropertyCity.slice(1)}-compatible reports only</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="individual" data-testid="tab-individual">
              <FileText size={14} className="mr-1" />
              Individual Reports
            </TabsTrigger>
            <TabsTrigger value="bundles" data-testid="tab-bundles">
              <Package size={14} className="mr-1" />
              Bundles
            </TabsTrigger>
          </TabsList>

          {/* Individual Reports Tab */}
          <TabsContent value="individual" className="space-y-6 mt-4">
            {Object.entries(reportsByCategory).map(([category, reports]) => {
              const info = categoryInfo[category as keyof typeof categoryInfo];
              const Icon = info?.icon;

              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center space-x-2">
                    {Icon && <Icon size={18} className={info.color} />}
                    <h2 className="text-base font-semibold text-secondary">{info?.label || category}</h2>
                  </div>

                  {reports.sort((a, b) => a.displayOrder - b.displayOrder).map((report) => (
                    <Card 
                      key={report.id} 
                      className={`overflow-hidden transition-all ${
                        selectedReports.has(report.id) ? 'ring-2 ring-primary' : ''
                      }`}
                      data-testid={`card-report-${report.id}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl">{report.icon}</span>
                              <div>
                                <CardTitle className="text-base">{report.name}</CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                  {report.description}
                                </CardDescription>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">
                              {formatPrice(report.ourPriceCents)}
                            </div>
                            {report.savingsCents > 0 && (
                              <div className="text-xs text-green-600 font-medium">
                                Save {formatPrice(report.savingsCents)}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                        {/* Provider Info */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Provider: <span className="font-medium text-secondary">{report.provider.name}</span>
                          </span>
                          {report.estimatedDays > 0 && (
                            <div className="flex items-center text-muted-foreground">
                              <Clock size={12} className="mr-1" />
                              {report.estimatedDays} {report.estimatedDays === 1 ? 'day' : 'days'}
                            </div>
                          )}
                        </div>

                        <Separator />

                        {/* What's Included */}
                        <div className="space-y-1.5">
                          {report.includes.slice(0, 3).map((item, index) => (
                            <div key={index} className="flex items-start text-xs">
                              <CheckCircle2 size={12} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground">{item}</span>
                            </div>
                          ))}
                          {report.includes.length > 3 && (
                            <p className="text-xs text-muted-foreground pl-5">
                              +{report.includes.length - 3} more features
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {report.isPopular && (
                            <Badge variant="secondary" className="text-xs">
                              ⭐ Popular Choice
                            </Badge>
                          )}
                          {report.availability === 'available' ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                              Available Now
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 text-xs">
                              Coming Soon
                            </Badge>
                          )}
                        </div>

                        <Button 
                          onClick={() => handlePurchaseReport(report)}
                          className="w-full"
                          disabled={!selectedProperty || report.availability === 'coming_soon'}
                          data-testid={`button-order-${report.id}`}
                        >
                          {report.availability === 'coming_soon' 
                            ? 'Coming Soon' 
                            : !selectedProperty 
                              ? 'Select Property First' 
                              : `Order ${report.name}`
                          }
                        </Button>

                        {report.fastTrackAvailable && (
                          <Button 
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            disabled={!selectedProperty}
                          >
                            <Clock size={12} className="mr-1" />
                            Fast-track ({report.fastTrackDays} days) - {formatPrice(report.fastTrackPriceCents!)}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })}
          </TabsContent>

          {/* Bundles Tab */}
          <TabsContent value="bundles" className="space-y-4 mt-4">
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm text-secondary mb-1 flex items-center">
                <Package size={16} className="mr-2" />
                Save More with Bundles
              </h3>
              <p className="text-xs text-muted-foreground">
                Get multiple reports together and save big! All reports are white-labeled with housematch.nz branding.
              </p>
            </div>

            {bundles.sort((a, b) => a.displayOrder - b.displayOrder).map((bundle) => (
              <Card 
                key={bundle.id} 
                className={`overflow-hidden ${bundle.isPopular ? 'border-2 border-primary' : ''}`}
                data-testid={`card-bundle-${bundle.id}`}
              >
                <CardHeader className={`${
                  bundle.isPopular 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                    : 'bg-gradient-to-r from-gray-100 to-gray-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{bundle.icon}</span>
                      <div>
                        <CardTitle className={`text-lg ${bundle.isPopular ? 'text-white' : 'text-secondary'}`}>
                          {bundle.name}
                        </CardTitle>
                        <CardDescription className={bundle.isPopular ? 'text-white/80' : ''}>
                          {bundle.description}
                        </CardDescription>
                      </div>
                    </div>
                    {bundle.badge && (
                      <Badge variant={bundle.isPopular ? "secondary" : "outline"} className="text-xs">
                        {bundle.badge}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-3 flex items-baseline space-x-2">
                    <span className={`text-3xl font-bold ${bundle.isPopular ? 'text-white' : 'text-primary'}`}>
                      {formatPrice(bundle.bundlePriceCents)}
                    </span>
                    <span className={`text-sm line-through ${bundle.isPopular ? 'text-white/60' : 'text-muted-foreground'}`}>
                      {formatPrice(bundle.regularPriceCents)}
                    </span>
                    <span className={`text-sm font-semibold ${bundle.isPopular ? 'text-green-200' : 'text-green-600'}`}>
                      Save {formatPrice(bundle.savingsCents)}!
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-secondary">Includes:</p>
                    {bundle.reportIds.map((reportId) => {
                      const report = individualReports.find(r => r.id === reportId);
                      if (!report) return null;
                      
                      return (
                        <div key={reportId} className="flex items-center justify-between text-xs">
                          <div className="flex items-center">
                            <CheckCircle2 size={12} className="text-green-500 mr-2" />
                            <span className="text-muted-foreground">{report.icon} {report.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatPrice(report.ourPriceCents)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  {bundle.availability === 'available' ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs mb-2">
                      Available Now
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500 text-xs mb-2">
                      Coming Soon
                    </Badge>
                  )}

                  <Button 
                    onClick={() => handlePurchaseBundle(bundle)}
                    className={`w-full ${
                      bundle.isPopular 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
                        : ''
                    }`}
                    disabled={!selectedProperty || bundle.availability === 'coming_soon'}
                    data-testid={`button-order-bundle-${bundle.id}`}
                  >
                    {bundle.availability === 'coming_soon' 
                      ? 'Coming Soon' 
                      : !selectedProperty 
                        ? 'Select Property First' 
                        : `Order ${bundle.name}`
                    }
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Additional Services */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-secondary mb-3">Additional Services</h2>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Home Staging */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all" 
              onClick={() => handleServiceClick('home_staging', 'Home Staging', 'From $1,500')}
              data-testid="card-service-home-staging"
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">🏡</div>
                <p className="font-medium text-sm mb-1">Home Staging</p>
                <p className="text-xs text-primary font-semibold">From $1,500</p>
                <p className="text-xs text-muted-foreground mt-1">Professional styling</p>
              </CardContent>
            </Card>

            {/* Hosting Service */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all" 
              onClick={() => handleServiceClick('hosting', 'Hosting & Key Holding', 'Get Quote')}
              data-testid="card-service-hosting"
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">🔑</div>
                <p className="font-medium text-sm mb-1">Hosting Service</p>
                <p className="text-xs text-primary font-semibold">Get Quote</p>
                <p className="text-xs text-muted-foreground mt-1">Showings for owners</p>
              </CardContent>
            </Card>

            {/* Cleaning Service */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all" 
              onClick={() => handleServiceClick('cleaning', 'End of Tenancy Cleaning', 'From $250')}
              data-testid="card-service-cleaning"
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">🧹</div>
                <p className="font-medium text-sm mb-1">Move-Out Cleaning</p>
                <p className="text-xs text-primary font-semibold">From $250</p>
                <p className="text-xs text-muted-foreground mt-1">Urban Care partner</p>
              </CardContent>
            </Card>

            {/* Moving Service */}
            <Card 
              className="cursor-pointer hover:shadow-md transition-all" 
              onClick={() => handleServiceClick('moving', 'Moving Services', 'From $2,500')}
              data-testid="card-service-moving"
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl mb-2">🚚</div>
                <p className="font-medium text-sm mb-1">Moving Services</p>
                <p className="text-xs text-primary font-semibold">From $2,500</p>
                <p className="text-xs text-muted-foreground mt-1">NZ Van Lines partner</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Professional Services CTA */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-sm mb-1">Are you a service provider?</h3>
              <p className="text-xs text-purple-100">
                Join our network of trusted professionals
              </p>
            </div>
            <div className="text-3xl">🏆</div>
          </div>
          
          <Button
            onClick={() => setLocation("/partner/signup")}
            className="w-full bg-white text-purple-600 hover:bg-purple-50"
            size="sm"
            data-testid="button-submit-new-service"
          >
            Join Our Network
          </Button>
        </div>
      </div>

      {/* Payment Confirmation Alert */}
      {currentItem && (
        <PaymentConfirmationAlert
          isOpen={showConfirmation}
          onClose={cancelPayment}
          onConfirm={handleConfirmPayment}
          itemName={currentItem.name}
          itemPrice={currentItem.price}
          itemDescription={currentItem.description}
          isProcessing={isProcessing}
        />
      )}

      {/* Service Order Modal (Building Inspection & Meth Testing) */}
      {currentServiceInfo && (
        <ServiceOrderModal
          isOpen={showServiceOrderModal}
          onClose={() => {
            setShowServiceOrderModal(false);
            setCurrentServiceInfo(null);
          }}
          serviceInfo={currentServiceInfo}
        />
      )}

      {/* Service Inquiry Dialog */}
      <Dialog open={showServiceInquiry} onOpenChange={setShowServiceInquiry}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedService?.name}</span>
              <Badge variant="secondary">{selectedService?.price}</Badge>
            </DialogTitle>
            <DialogDescription>
              Fill out your details and we'll contact you within 24 hours with a quote
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="inquiry-name">Your Name *</Label>
              <Input
                id="inquiry-name"
                value={inquiryForm.customerName}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customerName: e.target.value })}
                placeholder="John Smith"
                data-testid="input-inquiry-name"
              />
            </div>

            <div>
              <Label htmlFor="inquiry-email">Email *</Label>
              <Input
                id="inquiry-email"
                type="email"
                value={inquiryForm.customerEmail}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customerEmail: e.target.value })}
                placeholder="john@example.com"
                data-testid="input-inquiry-email"
              />
            </div>

            <div>
              <Label htmlFor="inquiry-phone">Phone Number</Label>
              <Input
                id="inquiry-phone"
                type="tel"
                value={inquiryForm.customerPhone}
                onChange={(e) => setInquiryForm({ ...inquiryForm, customerPhone: e.target.value })}
                placeholder="+64 21 123 4567"
                data-testid="input-inquiry-phone"
              />
            </div>

            <div>
              <Label htmlFor="inquiry-message">Additional Details</Label>
              <Textarea
                id="inquiry-message"
                value={inquiryForm.message}
                onChange={(e) => setInquiryForm({ ...inquiryForm, message: e.target.value })}
                placeholder="Tell us about your requirements..."
                rows={3}
                data-testid="textarea-inquiry-message"
              />
            </div>

            {selectedProperty && (
              <div className="bg-blue-50 p-3 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  📍 Property: {likedProperties.find((p: any) => p.id === selectedProperty)?.address || 'Selected property'}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowServiceInquiry(false);
                setSelectedService(null);
              }}
              className="flex-1"
              data-testid="button-inquiry-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitInquiry}
              disabled={!inquiryForm.customerName || !inquiryForm.customerEmail || serviceInquiryMutation.isPending}
              className="flex-1"
              data-testid="button-inquiry-submit"
            >
              {serviceInquiryMutation.isPending ? 'Submitting...' : 'Submit Inquiry'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
      </div>
    </>
  );
}
