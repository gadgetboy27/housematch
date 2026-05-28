import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import BottomNavigation from "@/components/bottom-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { AuthModal } from "@/components/auth-modal";
import { ProfilePictureSelector } from "@/components/profile-picture-selector";
import DraftViewerModal from "@/components/draft-viewer-modal";
import { ShareReportDialog } from "@/components/share-report-dialog";
import { formatPrice } from "@shared/reportConfig";
import { format } from "date-fns";
import type { Property } from "@shared/schema";
import { LocalStorageService } from "@/lib/local-storage";
import { PropertyDetailsDialog } from "@/components/property-details-dialog";
import { OfferWizard } from "@/components/OfferWizard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Home, Clock, CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react";

export default function Profile() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('signup');
  const [showDraftViewer, setShowDraftViewer] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string>("");
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showOfferWizard, setShowOfferWizard] = useState(false);
  const [offerWizardPropertyId, setOfferWizardPropertyId] = useState<string>("");
  const [shareReportDialogOpen, setShareReportDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [resumePropertyId, setResumePropertyId] = useState<string | null>(null);
  const [viewingPdf, setViewingPdf] = useState<{ url: string; type: string; property: string; price: string } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Render profile picture function
  const renderProfilePicture = (picture: string) => {
    // Check if it's an emoji (contains Unicode emoji characters)
    const isEmoji = /[\u2600-\u27BF]|[\uD83C][\uDF00-\uDFFF]|[\uD83D][\uDC00-\uDE4F]|[\uD83D][\uDE80-\uDEFF]/.test(picture);
    
    if (isEmoji) {
      return (
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="text-4xl">{picture}</span>
        </div>
      );
    }

    // Standard avatar - show colored circle with gradient
    const STANDARD_PICTURES = [
      { id: "avatar1", colors: "from-blue-500 to-blue-600", emoji: "🔵" },
      { id: "avatar2", colors: "from-green-500 to-green-600", emoji: "🟢" },
      { id: "avatar3", colors: "from-purple-500 to-purple-600", emoji: "🟣" },
      { id: "avatar4", colors: "from-orange-500 to-orange-600", emoji: "🟠" },
      { id: "avatar5", colors: "from-red-500 to-red-600", emoji: "🔴" },
      { id: "avatar6", colors: "from-sky-400 to-blue-500", emoji: "🌅" },
      { id: "avatar7", colors: "from-blue-400 to-teal-500", emoji: "🌊" },
      { id: "avatar8", colors: "from-green-400 to-emerald-500", emoji: "🌲" },
    ];

    const standardAvatar = STANDARD_PICTURES.find(p => p.id === picture);
    if (standardAvatar) {
      return (
        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${standardAvatar.colors} flex items-center justify-center`}>
          <span className="text-2xl text-white">{standardAvatar.emoji}</span>
        </div>
      );
    }

    // Default fallback
    return (
      <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
        <i className="fas fa-user text-white text-2xl"></i>
      </div>
    );
  };

  // Check if user is authenticated using real auth system
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/auth/user");
        return response.json();
      } catch (error) {
        return null; // User not authenticated
      }
    },
    retry: false,
  });

  // Fetch liked properties from database
  const { data: likedProperties = [], isLoading: likedLoading } = useQuery<Property[]>({
    queryKey: user?.id ? [`/api/users/${user.id}/liked-properties`] : [],
    enabled: !!user?.id,
    retry: false,
  });

  // Fetch transaction history
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: user?.id ? [`/api/transactions`, user.id] : [],
    queryFn: async () => {
      if (!user?.id) return { data: [], pagination: {} };
      const response = await fetch(`/api/transactions/${user.id}?page=1&pageSize=10`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
    enabled: !!user?.id,
    retry: false,
  });

  // Fetch purchase orders
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: user?.id ? [`/api/purchase-orders/${user.id}`] : [],
    enabled: !!user?.id,
    retry: false,
  });
  

  // Fetch user's property offers (scoped by user ID to prevent cache leaks)
  const { data: offers = [], isLoading: offersLoading } = useQuery({
    queryKey: ['/api/offer-wizard/offers/my-offers', user?.id],
    enabled: !!user?.id,
    retry: false,
  });

  // Filter incomplete offers
  const incompleteOffers = Array.isArray(offers) ? offers.filter((offer: any) => !offer.wizardCompleted) : [];

  // Offer history query - moved after user query to avoid ReferenceError
  const { data: offerHistoryData, isLoading: isOfferHistoryLoading } = useQuery<{
    success: boolean;
    offers: any[];
    summary?: {
      total: number;
      expressInterest: number;
      makeOffer: number;
    };
  }>({
    queryKey: ['/api/user/offers'],
    enabled: !!user,
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      setShowAuthModal(true);
    }
  }, [user, isLoading]);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      // Clear cached user data
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // 🔥 CRITICAL: Clear localStorage to prevent data persistence across sessions
      LocalStorageService.clearLikedProperties();
      LocalStorageService.clearUserSession();
      
      toast({
        title: "Logged out",
        description: "See you next time!",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Fetch user's properties using real authenticated user ID
  const { data: userProperties = [] } = useQuery({
    queryKey: ["/api/users", user?.id, "properties"],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await apiRequest("GET", `/api/users/${user.id}/properties`);
      return response.json();
    },
    enabled: !!user?.id,
  });

  // Delete property mutation
  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const response = await apiRequest("DELETE", `/api/properties/${propertyId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", user?.id, "properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({
        title: "Property Removed",
        description: "Your property has been removed from listings",
      });
      setShowDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete property",
        variant: "destructive",
      });
    }
  });

  // Process pending reports mutation (admin only)
  const processReportsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/report-delivery/process");
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/purchase-orders/${user?.id}`] });
      toast({
        title: "Reports Processed",
        description: `Successfully processed ${data.summary?.successful || 0} reports${data.summary?.failed ? `, ${data.summary.failed} failed` : ''}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process reports",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-sm mx-auto min-h-screen bg-background pb-20">
        <div className="px-4 py-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <i className="fas fa-spinner fa-spin text-3xl text-muted-foreground mb-4"></i>
              <p className="text-muted-foreground">Loading your profile...</p>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto min-h-screen bg-background pb-20">
      <div className="px-4 py-6 space-y-6">
        {/* Admin Dashboard Button - Only visible to admins */}
        {user?.isAdmin && (
          <Card className="bg-gradient-to-r from-red-600 to-red-700 border-red-800 shadow-lg">
            <CardContent className="p-4">
              <Button
                onClick={() => window.location.href = '/admin'}
                className="w-full bg-white text-red-700 hover:bg-gray-100 font-bold text-lg py-6 shadow-lg"
                data-testid="button-admin-dashboard"
              >
                <i className="fas fa-shield-alt mr-3 text-xl"></i>
                Admin Dashboard
                <i className="fas fa-arrow-right ml-3"></i>
              </Button>
              <p className="text-white text-xs text-center mt-2 opacity-90">
                <i className="fas fa-crown mr-1"></i>
                You have administrator access
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-secondary">My Profile</h1>
          <p className="text-muted-foreground text-sm">Manage your account and properties</p>
        </div>

        {!user ? (
          /* Not Authenticated */
          <Card>
            <CardContent className="p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-user text-white text-2xl"></i>
              </div>
              <h2 className="text-xl font-bold text-secondary mb-2">Welcome to PropertySwipe</h2>
              <p className="text-muted-foreground mb-6">
                Sign in to manage your properties, view your listings, and access saved properties.
              </p>
              <div className="space-y-4">
                <Button 
                  onClick={() => window.location.href = '/add-property'}
                  className="w-full"
                  data-testid="button-get-started"
                >
                  Get Started - Add Property
                </Button>
                <p className="text-xs text-muted-foreground">
                  You can start adding properties immediately. We'll ask you to sign up when you submit.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Authenticated User */}
            <Card>
              <CardContent className="p-6 text-center">
                {/* Subscription Tier Badge */}
                {user.subscriptionTier && user.subscriptionStatus === 'active' && (
                  <div className="mb-3">
                    <Badge 
                      className={`
                        ${user.subscriptionTier === 'premium' 
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0' 
                          : 'bg-gray-200 text-gray-700'
                        } 
                        px-4 py-1 text-sm font-semibold
                      `}
                      data-testid="badge-subscription-tier"
                    >
                      {user.subscriptionTier === 'premium' ? (
                        <>
                          <i className="fas fa-crown mr-1"></i>
                          Premium Member
                        </>
                      ) : (
                        <>
                          <i className="fas fa-star mr-1"></i>
                          {user.subscriptionTier.charAt(0).toUpperCase() + user.subscriptionTier.slice(1)} Member
                        </>
                      )}
                    </Badge>
                  </div>
                )}
                
                <div className="flex items-center justify-center mb-4 relative">
                  {renderProfilePicture(user.profilePicture || "👤")}
                  <div className="absolute -bottom-1 -right-1">
                    <ProfilePictureSelector 
                      currentProfilePicture={user.profilePicture || "👤"}
                      userId={user.id}
                    />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-secondary mb-1" data-testid="text-user-name">
                  {user.name}
                </h2>
                <p className="text-muted-foreground text-sm mb-4" data-testid="text-user-email">
                  {user.email}
                </p>
                <Button 
                  variant="outline" 
                  onClick={handleLogout}
                  className="w-full" 
                  data-testid="button-logout"
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Logout
                </Button>
              </CardContent>
            </Card>

            {/* AI Scout Banner */}
            <Card className="border-0 bg-gradient-to-r from-purple-600 to-pink-600 cursor-pointer" onClick={() => window.location.href = '/scout'}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                  <i className="fas fa-search-location text-white text-lg"></i>
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Lifestyle Scout</p>
                  <p className="text-white/70 text-xs">Find your perfect swap — sell & buy simultaneously</p>
                </div>
                <i className="fas fa-chevron-right text-white/50 text-sm"></i>
              </CardContent>
            </Card>

            {/* My Liked Properties */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">Liked Properties</CardTitle>
                <Badge variant="secondary" data-testid="badge-liked-count">
                  {likedLoading ? '...' : likedProperties.length}
                </Badge>
              </CardHeader>
              <CardContent>
                {likedLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm">Loading properties...</span>
                  </div>
                ) : likedProperties.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <i className="fas fa-heart text-3xl mb-3 block opacity-20"></i>
                    <p className="text-sm">You haven't liked any properties yet</p>
                    <p className="text-xs mt-1">Browse properties and swipe right to save your favorites!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {likedProperties.slice(0, 5).map((property: Property) => (
                      <div 
                        key={property.id} 
                        className="border rounded-lg p-3 bg-white cursor-pointer hover:shadow-md transition-all"
                        onClick={() => setSelectedProperty(property)}
                      >
                        <div className="flex gap-3">
                          <img 
                            src={property.imageUrl || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=80"}
                            alt={property.title}
                            className="w-20 h-16 rounded object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate" data-testid={`property-title-${property.id}`}>
                              {property.title}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">
                              {property.address}
                            </p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs font-semibold text-green-600">
                                {property.price}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span><i className="fas fa-bed"></i> {property.bedrooms || 0}</span>
                                <span><i className="fas fa-shower"></i> {property.bathrooms || 0}</span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              <i className="fas fa-hand-pointer text-xs mr-1"></i>
                              Tap to view & make offers
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Offers - Comprehensive View */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  My Property Offers
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  View and manage all your property purchase offers
                </p>
              </CardHeader>
              <CardContent>
                <MyOffersAndDocuments 
                  onViewDocument={(draftId) => {
                    setSelectedDraftId(draftId);
                    setShowDraftViewer(true);
                  }}
                  onResumeOffer={(propertyId) => {
                    setResumePropertyId(propertyId);
                  }}
                  onViewPdf={(pdf) => {
                    setViewingPdf(pdf);
                  }}
                />
              </CardContent>
            </Card>

            {/* My Reports */}
            {ordersData && (Array.isArray(ordersData) ? ordersData.length > 0 : ((ordersData as any)?.data?.length > 0)) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <i className="fas fa-file-alt text-blue-600"></i>
                    My Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Important Notice */}
                  <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800 flex items-start gap-2">
                      <i className="fas fa-exclamation-triangle text-amber-600 mt-0.5"></i>
                      <span>
                        <strong>Important:</strong> Please ensure your contact information is correct. 
                        Incorrect details may cause delivery delays. Reports will be sent to your email inbox.
                      </span>
                    </p>
                  </div>

                  {/* Admin Controls - Process Pending Reports */}
                  {user?.isAdmin && (
                    <div className="mb-3">
                      <Button
                        onClick={() => processReportsMutation.mutate()}
                        disabled={processReportsMutation.isPending}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="sm"
                        data-testid="button-process-reports-admin"
                      >
                        {processReportsMutation.isPending ? (
                          <>
                            <i className="fas fa-spinner fa-spin mr-2"></i>
                            Processing Reports...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-cog mr-2"></i>
                            Process Pending Reports (Admin)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                    
                    <div className="space-y-3">
                      {(Array.isArray(ordersData) ? ordersData : (ordersData as any).data).map((order: any) => {
                        // Determine delivery timeline based on report type
                        const getDeliveryInfo = (reportType: string) => {
                          if (reportType?.toLowerCase().includes('title')) {
                            return { days: '2-3 days', icon: '📄', color: 'text-green-600' };
                          } else if (reportType?.toLowerCase().includes('lim')) {
                            return { days: '10-12 days', icon: '🏛️', color: 'text-blue-600' };
                          }
                          return { days: '5-7 days', icon: '📋', color: 'text-purple-600' };
                        };
                        
                        const deliveryInfo = getDeliveryInfo(order.reportType);
                        const isDelivered = order.status === 'delivered' || order.reportUrl;
                        
                        return (
                          <div 
                            key={order.id}
                            className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                            data-testid={`report-card-${order.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg">{deliveryInfo.icon}</span>
                                  <p className="text-sm font-medium truncate">
                                    {order.reportType?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                  </p>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mb-2">
                                  {order.propertyAddress || 'Property Report'}
                                </p>
                                
                                {isDelivered ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="default" className="bg-green-500 text-xs">
                                      ✓ Delivered
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 text-xs"
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = `/api/download-report/${order.id}`;
                                        link.download = `${order.reportType}-${order.propertyAddress}.pdf`;
                                        link.click();
                                      }}
                                      data-testid={`button-download-${order.id}`}
                                    >
                                      <i className="fas fa-download mr-1"></i>
                                      Download
                                    </Button>
                                  </div>
                                ) : (
                                  <div>
                                    <Badge variant="secondary" className="text-xs mb-1">
                                      <i className="fas fa-clock mr-1"></i>
                                      Processing
                                    </Badge>
                                    <p className={`text-xs ${deliveryInfo.color} font-medium`}>
                                      Check your inbox in {deliveryInfo.days}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </CardContent>
              </Card>
            )}

            {/* My Properties */}
            {userProperties.length > 0 && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">My Properties</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => window.location.href = '/add-property'}
                    data-testid="button-add-property"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    Add New
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userProperties.map((property: Property) => (
                      <div
                        key={property.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        {/* Property Image */}
                        <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden bg-gray-200">
                          {property.imageUrl ? (
                            <img
                              src={property.imageUrl}
                              alt={property.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <i className="fas fa-home text-gray-400"></i>
                            </div>
                          )}
                        </div>

                        {/* Property Info */}
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm truncate">{property.title}</h5>
                          <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={property.isActive ? "default" : "secondary"} className="text-xs">
                              {property.isActive ? "Live" : "Draft"}
                            </Badge>
                            {property.price && (
                              <span className="text-xs font-semibold">${parseInt(property.price).toLocaleString()}</span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/edit-property/${property.id}`}
                            data-testid={`button-edit-${property.id}`}
                          >
                            <i className="fas fa-edit"></i>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => setShowDeleteConfirm(property.id)}
                            data-testid={`button-delete-${property.id}`}
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle className="text-lg text-center">Delete Property?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  This will remove your property from listings. This action cannot be undone.
                </p>
                <div className="flex space-x-2">
                  <Button 
                    variant="destructive"
                    onClick={() => deletePropertyMutation.mutate(showDeleteConfirm)}
                    disabled={deletePropertyMutation.isPending}
                    className="flex-1"
                    data-testid="button-confirm-delete"
                  >
                    {deletePropertyMutation.isPending ? "Deleting..." : "Delete"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={(user) => {
          setShowAuthModal(false);
          queryClient.setQueryData(["/api/auth/user"], user);
          toast({
            title: "Welcome!",
            description: `Logged in as ${user.name}`,
          });
        }}
        mode={authMode}
        onToggleMode={() => {
          if (authMode === 'login') {
            setAuthMode('signup');
          } else if (authMode === 'signup') {
            setAuthMode('login');
          } else if (authMode === 'forgot-password') {
            setAuthMode('login');
          }
        }}
        onForgotPassword={() => setAuthMode('forgot-password')}
      />

      {/* Draft Viewer Modal */}
      <DraftViewerModal 
        isOpen={showDraftViewer}
        onClose={() => setShowDraftViewer(false)}
        draftId={selectedDraftId}
      />

      {/* Property Details Dialog */}
      <PropertyDetailsDialog
        property={selectedProperty}
        open={!!selectedProperty}
        onOpenChange={(open) => !open && setSelectedProperty(null)}
        isLoggedIn={!!user}
        onOpenOfferWizard={(propertyId) => {
          console.log('🎯 Profile: onOpenOfferWizard callback called');
          console.log('📍 Property ID received:', propertyId);
          setOfferWizardPropertyId(propertyId);
          setShowOfferWizard(true);
          console.log('✅ State updated - wizard should open');
          console.log('📊 showOfferWizard:', true, 'offerWizardPropertyId:', propertyId);
          setSelectedProperty(null); // Close the dialog
        }}
      />

      {/* Official Offer Wizard (ADLS) */}
      {showOfferWizard && offerWizardPropertyId && (
        <>
          {console.log('🎨 Rendering OfferWizard component')}
          {console.log('📊 State check - showOfferWizard:', showOfferWizard, 'propertyId:', offerWizardPropertyId)}
          <OfferWizard
            propertyId={offerWizardPropertyId}
            onClose={() => {
              console.log('🚪 Wizard closed');
              setShowOfferWizard(false);
              setOfferWizardPropertyId("");
            }}
          />
        </>
      )}

      {/* Share Report Dialog */}
      {selectedOrder && (
        <ShareReportDialog
          open={shareReportDialogOpen}
          onOpenChange={setShareReportDialogOpen}
          orderId={selectedOrder.id}
          reportType={selectedOrder.reportType}
          propertyAddress={selectedOrder.propertyAddress || 'Property'}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
          }}
        />
      )}

      {/* Resume Offer Wizard */}
      {resumePropertyId && (
        <OfferWizard
          propertyId={resumePropertyId}
          onClose={() => {
            setResumePropertyId(null);
            queryClient.invalidateQueries({ queryKey: ['/api/user/offers'] });
          }}
        />
      )}

      {/* PDF Viewer Modal */}
      {viewingPdf && (
        <Dialog open={!!viewingPdf} onOpenChange={() => setViewingPdf(null)}>
          <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 overflow-hidden" data-testid="modal-pdf-viewer">
            <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    {viewingPdf.type} Form
                  </DialogTitle>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Property:</strong> {viewingPdf.property}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Offer Price:</strong> {viewingPdf.price}
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                      📧 This PDF was emailed to both buyer and seller upon submission
                    </p>
                  </div>
                </div>
              </div>
            </DialogHeader>
            
            <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
              <iframe
                src={viewingPdf.url}
                className="w-full h-full border-0"
                title="Offer PDF Document"
                data-testid="iframe-pdf-viewer"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <BottomNavigation />
    </div>
  );
}

// Component to show user's offers and documents
function MyOffersAndDocuments({ 
  onViewDocument, 
  onResumeOffer,
  onViewPdf 
}: { 
  onViewDocument: (draftId: string) => void;
  onResumeOffer: (propertyId: string) => void;
  onViewPdf: (pdf: { url: string; type: string; property: string; price: string }) => void;
}) {
  const { data: userOffers, isLoading: offersLoading } = useQuery({
    queryKey: ['/api/user/offers'],
    retry: false,
  });

  const { data: properties = [] } = useQuery<any[]>({
    queryKey: ['/api/properties'],
  });

  const getPropertyForOffer = (propertyId: string) => {
    return properties.find((p: any) => p.id === propertyId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: any; className: string; label: string }> = {
      draft: { icon: Clock, className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Draft' },
      pending: { icon: AlertCircle, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Pending' },
      submitted: { icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Submitted' },
      accepted: { icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Accepted' },
      rejected: { icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Rejected' },
      conditional: { icon: FileText, className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Conditional' },
      unconditional: { icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Unconditional' },
      withdrawn: { icon: XCircle, className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: 'Withdrawn' },
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  if (offersLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm">Loading your offers...</span>
      </div>
    );
  }

  const combinedOffersData = userOffers as any;
  const offers = combinedOffersData?.offers || [];

  if (offers.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-3 opacity-20" />
        <p className="text-sm">You haven't made any offers yet</p>
        <p className="text-xs mt-1">Browse properties and make an offer to get started!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {combinedOffersData?.summary && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{combinedOffersData.summary.total}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Total</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{combinedOffersData.summary.expressInterest}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Express</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{combinedOffersData.summary.makeOffer}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Official</div>
          </div>
        </div>
      )}

      {/* Offers List */}
      <div className="space-y-3">
        {offers.map((offer: any) => {
          const property = getPropertyForOffer(offer.propertyId);
          const isExpressInterest = offer.type === 'express_interest';

          return (
            <Card key={offer.id} className="hover:shadow-md transition-shadow" data-testid={`offer-card-${offer.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex items-center gap-2 flex-wrap text-sm">
                      <Home className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{property?.address || offer.propertyAddress || 'Property'}</span>
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      {property?.suburb && `${property.suburb} • `}
                      <Badge className={isExpressInterest 
                        ? "bg-purple-100 border border-purple-400 text-purple-800 text-xs ml-1"
                        : "bg-green-100 border border-green-400 text-green-800 text-xs ml-1"
                      }>
                        {isExpressInterest ? 'Express' : 'Official'}
                      </Badge>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(offer.status)}
                    <span className="text-xs text-gray-500">
                      {offer.submittedAt || offer.createdAt
                        ? format(new Date(offer.submittedAt || offer.createdAt), 'dd MMM')
                        : 'Draft'}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {isExpressInterest ? (
                  <>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded p-3 mb-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Price:</span>
                        <span className="font-semibold">{offer.offerPrice}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-gray-600 dark:text-gray-400">Settlement:</span>
                        <span className="font-semibold">{offer.settlementPeriod || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {offer.pdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewPdf({
                            url: offer.pdfUrl,
                            type: 'Express Interest',
                            property: property?.address || offer.propertyAddress || 'Property',
                            price: offer.offerPrice
                          })}
                          data-testid={`button-view-pdf-${offer.id}`}
                          className="text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Price</p>
                        <p className="font-semibold">{offer.offerPrice}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Deposit</p>
                        <p className="font-semibold">{offer.depositAmount}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Settlement</p>
                        <p className="font-semibold">
                          {offer.settlementDate ? format(new Date(offer.settlementDate), 'dd MMM yyyy') : 'TBD'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Step</p>
                        <p className="font-semibold">
                          {offer.wizardCompleted ? '✓' : `${offer.wizardStep}/5`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!offer.wizardCompleted && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => onResumeOffer(offer.propertyId)}
                          data-testid={`button-continue-offer-${offer.id}`}
                          className="text-xs"
                        >
                          Resume ({offer.wizardStep}/5)
                        </Button>
                      )}
                      {offer.pdfUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewPdf({
                            url: offer.pdfUrl,
                            type: 'Official Offer',
                            property: property?.address || offer.propertyAddress || 'Property',
                            price: offer.offerPrice
                          })}
                          data-testid={`button-view-pdf-${offer.id}`}
                          className="text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Component to show offers received by seller
function ReceivedOffers() {
  const { data: sellerOffers, isLoading } = useQuery({
    queryKey: ['/api/seller/offers'],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm">Loading received offers...</span>
      </div>
    );
  }

  const offers = (sellerOffers as any)?.offers || [];

  if (offers.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <i className="fas fa-inbox text-3xl mb-3 block opacity-20"></i>
        <p className="text-sm">No offers received yet</p>
        <p className="text-xs mt-1">Offers on your properties will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
        <i className="fas fa-envelope text-green-600"></i>
        Received Offers ({offers.length})
      </h4>
      
      <div className="space-y-2">
        {offers.slice(0, 5).map((offer: any) => (
          <div key={offer.id} className="border rounded-lg p-3 bg-white">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">${parseInt(offer.offerPrice).toLocaleString()}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    offer.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    offer.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                    offer.status === 'approved' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {offer.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Property:</strong> {offer.propertyAddress}
                </p>
                <p className="text-xs text-gray-600 mb-1">
                  <strong>Buyer:</strong> {offer.buyerName} • {offer.buyerEmail}
                </p>
                <p className="text-xs text-gray-500">
                  Settlement: {offer.settlementPeriod} • {new Date(offer.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span className={offer.financeCondition ? 'text-orange-600' : 'text-green-600'}>
                    {offer.financeCondition ? '⚠️ Finance' : '✅ Cash'}
                  </span>
                  <span className={offer.buildingInspectionCondition ? 'text-orange-600' : 'text-green-600'}>
                    {offer.buildingInspectionCondition ? '🔍 Inspection' : '✅ As-is'}
                  </span>
                  <span className={offer.limCondition ? 'text-orange-600' : 'text-green-600'}>
                    {offer.limCondition ? '📋 LIM' : '✅ No LIM'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1 ml-3">
                <Button 
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => window.open(`mailto:${offer.buyerEmail}?subject=Re: Property Offer ${offer.id}`)}
                >
                  Reply
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => window.open(`tel:${offer.buyerPhone}`)}
                >
                  Call
                </Button>
              </div>
            </div>
            
            {offer.additionalComments && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-xs text-gray-600">
                  <strong>Comments:</strong> {offer.additionalComments}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}